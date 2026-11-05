import { Server } from "socket.io";
import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { Visitor } from "../models/Visitor.js";
import { Website } from "../models/Website.js";
import { findAvailableAgent } from "../services/assignmentService.js";
import { addMessage } from "../services/chatService.js";
import { Notification } from "../models/Notification.js";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";
import { createNotification } from "../services/notificationService.js";
import { logger } from "../utils/logger.js";
import { logAuditEvent } from "../services/auditService.js";
import { dispatchWebsiteWebhook } from "../services/webhookService.js";
import { getUserFromToken } from "../middleware/auth.js";
import { processChatIntelligence } from "../services/intelligenceService.js";
import { env } from "../config/env.js";
import { CallLog } from "../models/CallLog.js";
import { Ticket } from "../models/Ticket.js";
import { buildTicketId } from "../utils/ticketUtils.js";
import { getStrictLanguageInstruction } from "../utils/languageDetector.js";

let ioInstance = null;
const activeVoiceCalls = new Map(); // Global in-memory call routing registry (callId -> callData)
const isValidObjectId = (val) => Boolean(val && typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val));

function getSessionWebsiteId(session) {
  return session?.websiteId?._id || session?.websiteId || null;
}

function getSessionManagerId(session) {
  return session?.websiteId?.managerId || null;
}

async function hasReachedActiveChatLimit(userId) {
  const maxAllowed = 5;
  const activeCount = await ChatSession.countDocuments({ assignedAgent: userId, status: "active" });
  return activeCount >= maxAllowed;
}

const broadcastStatsUpdate = (io, websiteId, managerId) => {
  if (websiteId) io.to(`ws_${websiteId}`).emit("stats:update");
  if (managerId) io.to(`us_${managerId}`).emit("stats:update");
  io.to("us_admin").emit("stats:update");
};

const emitToWebsiteStaff = (io, { websiteId, managerId } = {}, event, payload) => {
  let broadcaster = io.to("us_admin");
  if (websiteId) broadcaster = broadcaster.to(`ws_${websiteId}`);
  if (managerId) broadcaster = broadcaster.to(`us_${managerId}`).to(`manager_${managerId}`);
  broadcaster.emit(event, payload);
};

export function emitSessionUpdate(session) {
  if (!ioInstance || !session) return;
  const websiteId = getSessionWebsiteId(session);
  ioInstance.to(session.sessionId).emit("chat:session-updated", session);
  if (websiteId) {
    ioInstance.to(`ws_${websiteId}`).emit("chat:session-updated", session);
  }
  if (getSessionManagerId(session)) {
    ioInstance.to(`us_${getSessionManagerId(session)}`).emit("chat:session-updated", session);
  }
  if (session.assignedAgent) {
    ioInstance.to(`us_${session.assignedAgent._id || session.assignedAgent}`).emit("chat:session-updated", session);
  }
  ioInstance.to("us_admin").emit("chat:session-updated", session);
}

export function getSocketServer() {
  return ioInstance;
}

// Global utility for creating and emitting notifications
async function createAndEmitNotification(io, { recipient, type, title, message, link }) {
  try {
    const notification = await createNotification({ recipient, type, title, message, link });
    if (!notification) return null;
    io.to(`us_${recipient}`).emit("notification:new", notification);
    return notification;
  } catch (error) {
    console.error("Notification Error:", error);
  }
}

// ── 4-Tier Automated Missed Call Handling Pipeline ──
async function handleMissedCall(io, { callId, callInfo, reason }) {
  if (!callInfo || callInfo._missedLogged) return;
  callInfo._missedLogged = true;

  try {
    const callerName = callInfo.visitorName || "Website Visitor";
    const callerPhone = callInfo.callerPhone || "Web Direct Voice Call";
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // ── 1. Resolve Website & Manager ──
    let targetWebsite = null;
    let resolvedWebsiteId = null;
    if (callInfo.websiteId) {
      if (isValidObjectId(callInfo.websiteId)) {
        targetWebsite = await Website.findById(callInfo.websiteId).catch(() => null);
      }
      if (!targetWebsite) {
        targetWebsite = await Website.findOne({
          $or: [{ apiKey: callInfo.websiteId }, { domain: callInfo.websiteId }]
        }).catch(() => null);
      }
    }
    if (targetWebsite) {
      resolvedWebsiteId = targetWebsite._id;
    }

    // ── 2. Resolve ChatSession ──
    let sessionDoc = null;
    if (callInfo.sessionId) {
      sessionDoc = await ChatSession.findOne({
        $or: [
          { sessionId: callInfo.sessionId },
          ...(isValidObjectId(callInfo.sessionId) ? [{ _id: callInfo.sessionId }] : [])
        ]
      }).populate("websiteId").populate("visitorId").populate("customerId").populate("assignedAgent");
    }

    if (!sessionDoc && resolvedWebsiteId && callInfo.visitorId) {
      sessionDoc = await ChatSession.findOne({
        websiteId: resolvedWebsiteId,
        $or: [
          { visitorId: callInfo.visitorId },
          ...(isValidObjectId(callInfo.visitorId) ? [{ _id: callInfo.visitorId }] : [])
        ]
      }).sort({ updatedAt: -1 }).populate("websiteId").populate("visitorId").populate("customerId").populate("assignedAgent");
    }

    if (!sessionDoc && resolvedWebsiteId) {
      try {
        let visDoc = null;
        if (callInfo.visitorId) {
          visDoc = await Visitor.findOne({
            $or: [
              { visitorId: callInfo.visitorId },
              ...(isValidObjectId(callInfo.visitorId) ? [{ _id: callInfo.visitorId }] : [])
            ]
          });
        }
        const newSessionId = callInfo.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        sessionDoc = await ChatSession.create({
          sessionId: newSessionId,
          websiteId: resolvedWebsiteId,
          visitorId: visDoc?._id || null,
          customerId: visDoc?.customerId || null,
          status: "queued"
        });
      } catch (createErr) {
        console.warn("[Sockets] Could not auto-create session for missed call:", createErr.message);
      }
    }

    if (sessionDoc && !resolvedWebsiteId && sessionDoc.websiteId) {
      resolvedWebsiteId = sessionDoc.websiteId._id || sessionDoc.websiteId;
      if (!targetWebsite) targetWebsite = sessionDoc.websiteId;
    }

    const isOutbound = callInfo.direction === "outbound";
    // ── 3. Tier 1: Insert System Message into Chat Timeline ──
    let missedCallMessage;
    if (isOutbound) {
      if (reason && (reason.toLowerCase().includes("cancel") || reason.toLowerCase().includes("ended before"))) {
        missedCallMessage = `📞 Outbound call cancelled by ${callInfo.agentName || 'Agent'} at ${timeStr}`;
      } else {
        missedCallMessage = `📞 Outbound call by ${callInfo.agentName || 'Agent'} unanswered at ${timeStr}`;
      }
    } else {
      missedCallMessage = `📞 Missed voice call from ${callerName} at ${timeStr}`;
    }
    if (sessionDoc) {
      const savedMsg = await addMessage({
        chatSession: sessionDoc,
        sender: "system",
        message: missedCallMessage
      }).catch(err => {
        console.error("[Sockets] Error adding missed call message to chat session:", err.message);
        return null;
      });

      if (savedMsg) {
        const msgPayload = {
          _id: savedMsg._id,
          sessionId: sessionDoc.sessionId,
          message: missedCallMessage,
          sender: "system",
          senderName: "Voice System",
          channel: "voice",
          createdAt: savedMsg.createdAt
        };

        io.to(sessionDoc.sessionId).emit("chat:message", msgPayload);
        if (resolvedWebsiteId) {
          io.to(`ws_${resolvedWebsiteId}`).emit("chat:new-message", msgPayload);
        }
        if (sessionDoc.assignedAgent) {
          const aId = sessionDoc.assignedAgent._id || sessionDoc.assignedAgent;
          io.to(`us_${aId}`).emit("chat:message", msgPayload);
        }

        sessionDoc.lastMessageAt = new Date();
        sessionDoc.lastMessagePreview = missedCallMessage;
        await sessionDoc.save().catch(() => {});
        emitSessionUpdate(sessionDoc);
      }
    }

    // ── 4. Missed Call Policy: No Auto-Ticket Generation ──
    // Missed calls are recorded in CallLog and notified to staff, but do NOT create support tickets
    // unless the customer explicitly asked for a ticket or callback.
    let callbackTicket = null;
    const isExplicitlyRequested = Boolean(callInfo?.isTicketRequested || callInfo?.customerRequestedTicket);

    if (resolvedWebsiteId && !isOutbound && isExplicitlyRequested) {
      const ticketId = buildTicketId();
      const rawVisId = sessionDoc?.visitorId?._id || sessionDoc?.visitorId || callInfo.visitorId;
      const visitorObjId = isValidObjectId(String(rawVisId)) ? rawVisId : null;
      const customerObjId = sessionDoc?.customerId?._id || (isValidObjectId(String(sessionDoc?.customerId)) ? sessionDoc.customerId : null);

      try {
        callbackTicket = await Ticket.create({
          ticketId,
          websiteId: resolvedWebsiteId,
          visitorId: visitorObjId,
          customerId: customerObjId,
          crn: sessionDoc?.crn || null,
          assignedAgent: sessionDoc?.assignedAgent?._id || sessionDoc?.assignedAgent || null,
          subject: `📞 Missed Call Callback: ${callerName}`,
          priority: "high",
          status: "open",
          channel: "phone",
          department: "support",
          lastMessagePreview: `Missed call from ${callerName} at ${timeStr}. Customer explicitly requested callback.`,
          notes: [{
            content: `Callback ticket for missed voice call at ${new Date().toLocaleString()}. Caller: ${callerName}, Phone: ${callerPhone}, Session: ${sessionDoc?.sessionId || callInfo.sessionId || 'N/A'}. Reason: ${reason || 'Unanswered'}.`,
            isPublic: false
          }]
        });

        emitToWebsiteStaff(io, { websiteId: resolvedWebsiteId, managerId: targetWebsite?.managerId }, "ticket:created", {
          ticket: callbackTicket,
          message: `Callback ticket ${ticketId} created for ${callerName}`,
          user: callerName,
          websiteId: resolvedWebsiteId
        });
      } catch (ticketErr) {
        console.error("[Sockets] Error creating callback ticket for missed call:", ticketErr.message);
      }
    }

    // ── 5. Tier 3: Record Voice Call Logs (CallLog) ──
    let callLog = null;
    try {
      callLog = await CallLog.create({
        websiteId: resolvedWebsiteId,
        customerId: customerObjId,
        direction: isOutbound ? "outbound" : "incoming",
        status: "missed",
        duration: 0,
        callerPhone: callerPhone,
        transcript: callInfo.transcript || (isOutbound 
          ? `Outbound call by ${callInfo.agentName || 'Agent'} to ${callerName} was unanswered (${reason || 'Visitor unavailable'}).`
          : `Incoming voice call from ${callerName} was missed (${reason || 'Agent unavailable / Unanswered'}).`),
        outcome: reason || (isOutbound ? "Outbound Call - Unanswered" : "Missed call - Unanswered"),
        aiSummary: callInfo.aiSummary || (isOutbound
          ? `Outbound call to ${callerName} was unanswered at ${timeStr}.`
          : `Missed call from ${callerName} at ${timeStr}.`),
        ticketId: callbackTicket?._id || null,
        autoTicketCreated: Boolean(callbackTicket)
      });

      emitToWebsiteStaff(io, { websiteId: resolvedWebsiteId, managerId: targetWebsite?.managerId }, "call:log-updated", { callId, logId: callLog?._id });
    } catch (logErr) {
      console.error("[Sockets] Error creating CallLog for missed call:", logErr.message);
    }

    if (isOutbound) {
      // Outbound calls don't notify agents of a missed inbound call
      return;
    }

    // ── 6. Tier 2: Dashboard Notification Bell ──
    const recipients = new Set();
    if (sessionDoc?.assignedAgent) {
      recipients.add(String(sessionDoc.assignedAgent._id || sessionDoc.assignedAgent));
    }
    if (targetWebsite?.managerId) {
      recipients.add(String(targetWebsite.managerId));
    }

    // Always include all support agents under this manager or assigned to this website
    try {
      const agentConditions = [];
      if (targetWebsite?.managerId) {
        agentConditions.push({ managerId: targetWebsite.managerId });
      }
      if (resolvedWebsiteId) {
        agentConditions.push({ websiteIds: resolvedWebsiteId });
      }
      if (agentConditions.length > 0) {
        const teamAgents = await User.find({
          role: "agent",
          $or: agentConditions
        }, "_id").lean();
        for (const ag of teamAgents) {
          recipients.add(String(ag._id));
        }
      }
    } catch (agentLookupErr) {
      console.warn("[Sockets] Could not query team agents for missed call notification:", agentLookupErr.message);
    }

    // Also include any online agents or managers connected right now
    for (const [sId, s] of io.sockets.sockets) {
      if (s.data?.user) {
        const u = s.data.user;
        const uRole = normalizeRole(u.role);
        if (uRole === "agent" || uRole === "manager" || uRole === "admin" || uRole === "client") {
          if (
            uRole === "admin" ||
            String(u._id) === String(targetWebsite?.managerId) ||
            String(u.managerId) === String(targetWebsite?.managerId) ||
            (s.data.websiteIds && s.data.websiteIds.includes(String(resolvedWebsiteId)))
          ) {
            recipients.add(String(u._id));
          }
        }
      }
    }

    const notifLink = sessionDoc?.sessionId 
      ? `/agent?tab=chats&sessionId=${sessionDoc.sessionId}` 
      : (callbackTicket ? `/agent?tab=tickets&search=${callbackTicket.ticketId}` : `/client?tab=voice-logs`);

    for (const recipientId of recipients) {
      await createAndEmitNotification(io, {
        recipient: recipientId,
        type: "missed_call",
        title: "📞 Missed Call Alert",
        message: `Missed call from ${callerName} (${callerPhone}). Immediate callback required.`,
        link: notifLink
      }).catch(() => {});
    }

    // General broadcast to all admin dashboards
    io.to("us_admin").emit("notification:new", {
      _id: `temp_${Date.now()}`,
      type: "missed_call",
      title: "📞 Missed Call Alert",
      message: `Missed call from ${callerName} (${callerPhone}) on ${targetWebsite?.websiteName || 'Website'}.`,
      link: notifLink,
      createdAt: new Date(),
      isRead: false
    });

    emitToWebsiteStaff(io, { websiteId: resolvedWebsiteId, managerId: targetWebsite?.managerId }, "call:missed", {
      callId,
      sessionId: sessionDoc?.sessionId,
      visitorName: callerName,
      websiteId: resolvedWebsiteId,
      message: `Missed call from ${callerName}`
    });

    if (resolvedWebsiteId) {
      broadcastStatsUpdate(io, resolvedWebsiteId, targetWebsite?.managerId);
    }

    console.log(`[Sockets] Missed call successfully processed for callId: ${callId}, visitor: ${callerName}, ticket: ${callbackTicket?.ticketId || 'none'}`);
  } catch (err) {
    console.error(`[Sockets] Error handling missed call for callId: ${callId}:`, err);
  }
}

// ── Automated Completed Call Logging ──
async function handleCompletedCall(io, { callId, callInfo, duration }) {
  if (!callInfo || callInfo._completedLogged) return;
  callInfo._completedLogged = true;

  try {
    let resolvedWebsiteId = null;
    let targetWebsite = null;
    if (isValidObjectId(callInfo.websiteId)) {
      resolvedWebsiteId = callInfo.websiteId;
      targetWebsite = await Website.findById(callInfo.websiteId).catch(() => null);
    } else if (callInfo.websiteId) {
      const wDoc = await Website.findOne({ apiKey: callInfo.websiteId }).catch(() => null);
      if (wDoc) {
        resolvedWebsiteId = wDoc._id;
        targetWebsite = wDoc;
      }
    }

    const callDuration = duration || Math.max(1, Math.round((Date.now() - (callInfo.connectedAt ? new Date(callInfo.connectedAt).getTime() : Date.now())) / 1000));

    await CallLog.create({
      websiteId: resolvedWebsiteId,
      customerId: callInfo.customerId || null,
      agentId: isValidObjectId(callInfo.agentId) ? callInfo.agentId : null,
      agentName: callInfo.agentName || "Agent",
      sessionId: callInfo.sessionId || "",
      visitorName: callInfo.visitorName || "Visitor",
      direction: callInfo.direction || "incoming",
      status: "completed",
      duration: callDuration,
      callerPhone: callInfo.callerPhone || "Web Voice Call",
      transcript: callInfo.transcript || `Live voice call completed with agent ${callInfo.agentName || 'Agent'}. Duration: ${callDuration}s.`,
      outcome: `Completed call handled by ${callInfo.agentName || 'Agent'} (${callDuration}s)`,
      aiSummary: callInfo.aiSummary || `Direct voice call completed with ${callInfo.agentName || 'Agent'} (Duration: ${callDuration}s).`,
      ticketId: null,
      autoTicketCreated: false
    });

    // ── Insert Completed Call Record into Chat Session Timeline ──
    let sessionDoc = null;
    if (callInfo.sessionId) {
      sessionDoc = await ChatSession.findOne({
        $or: [
          { sessionId: callInfo.sessionId },
          ...(isValidObjectId(callInfo.sessionId) ? [{ _id: callInfo.sessionId }] : [])
        ]
      });
    }

    const mins = Math.floor(callDuration / 60).toString().padStart(2, "0");
    const secs = (callDuration % 60).toString().padStart(2, "0");
    const formattedDuration = `${mins}:${secs}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const completedMsg = `📞 Voice call completed • Duration: ${formattedDuration} • Agent: ${callInfo.agentName || 'Agent'} at ${timeStr}`;

    if (sessionDoc) {
      const savedMsg = await addMessage({
        chatSession: sessionDoc,
        sender: "system",
        message: completedMsg
      }).catch(err => {
        console.error("[Sockets] Error adding completed call message to chat session:", err.message);
        return null;
      });

      if (savedMsg) {
        const msgPayload = {
          _id: savedMsg._id,
          sessionId: sessionDoc.sessionId,
          message: completedMsg,
          sender: "system",
          senderName: "Voice System",
          channel: "voice",
          createdAt: savedMsg.createdAt
        };
        io.to(sessionDoc.sessionId).emit("chat:message", msgPayload);
        if (resolvedWebsiteId) {
          io.to(`ws_${resolvedWebsiteId}`).emit("chat:new-message", msgPayload);
        }
        if (sessionDoc.assignedAgent) {
          const aId = sessionDoc.assignedAgent._id || sessionDoc.assignedAgent;
          io.to(`us_${aId}`).emit("chat:message", msgPayload);
        }
        sessionDoc.lastMessageAt = new Date();
        sessionDoc.lastMessagePreview = completedMsg;
        await sessionDoc.save().catch(() => {});
        emitSessionUpdate(sessionDoc);
      }
    }

    emitToWebsiteStaff(io, { websiteId: resolvedWebsiteId, managerId: targetWebsite?.managerId }, "call:log-updated", { callId });
    console.log(`[Sockets] Completed call logged for callId: ${callId}, duration: ${formattedDuration} (${callDuration}s)`);
  } catch (err) {
    console.error(`[Sockets] Error logging completed call:`, err);
  }
}

// Automated Queue Processor
async function processQueue(io) {
  try {
    const queuedSessions = await ChatSession.find({ status: "queued" }).sort({ createdAt: 1 });
    for (const session of queuedSessions) {
      const website = await Website.findById(session.websiteId);
      if (!website) continue;

      const agent = await findAvailableAgent({ managerId: website.managerId, websiteId: website._id });
      if (agent) {
        session.assignedAgent = agent._id;
        session.status = "active";
        session.acceptedAt = new Date();
        await session.save();
        emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email isOnline").populate("assignedAgent", "name email role isOnline"));

        io.to(session.sessionId).emit("chat:assigned", {
          sessionId: session.sessionId,
          agentName: agent.name
        });
        io.to(`us_${agent._id}`).emit("chat:assigned", { sessionId: session.sessionId });
        
        try {
          emitToWebsiteStaff(io, { websiteId: website._id, managerId: website.managerId }, "chat:assigned", {
            sessionId: session.sessionId,
            agentName: agent.name,
            message: `Agent ${agent.name} assigned to chat session`,
            user: agent.name
          });
        } catch (err) {}

        await createAndEmitNotification(io, {
          recipient: agent._id,
          type: "new_chat",
          title: "New Assigned Chat",
          message: "A queued visitor has been automatically assigned to you.",
          link: `/client?tab=chats&sessionId=${session.sessionId}`
        });
        await dispatchWebsiteWebhook(session.websiteId._id || session.websiteId, "chat.assigned", {
          sessionId: session.sessionId,
          assignedAgentId: agent._id,
          assignedAgentName: agent.name
        });
      }
    }
  } catch (err) {
    console.error("Queue Processing Error:", err);
  }
}

async function broadcastSessionPresence(io, sessionId) {
  try {
    const sockets = await io.in(sessionId).fetchSockets();
    const viewers = [];
    const seen = new Set();
    for (const s of sockets) {
      if ((s.data.type === "agent" || s.data.type === "owner") && s.data.user) {
        const userId = s.data.user._id.toString();
        if (!seen.has(userId)) {
          seen.add(userId);
          viewers.push({
            _id: s.data.user._id,
            name: s.data.user.name,
            role: s.data.user.role,
            viewingTimeSec: Math.floor((Date.now() - (s.data.joinTime || Date.now())) / 1000)
          });
        }
      }
    }
    io.to(sessionId).emit("presence:viewers", { sessionId, viewers });
  } catch (err) {
    console.error("Error broadcasting presence:", err);
  }
}

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // In production, you might want to be stricter, but allow widget origins too
          callback(null, true); 
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    pingInterval: 10000,
    pingTimeout: 5000,
    allowEIO3: true
  });
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth || {};

      if (auth.type === "visitor") {
        const website = await Website.findOne({ apiKey: auth.apiKey });
        if (!website) return next(new Error("Invalid API key"));

        socket.data.type = "visitor";
        socket.data.website = website;
        socket.data.visitorId = auth.visitorId;
        socket.data.sessionId = auth.sessionId;

        if (auth.sessionId) {
          const session = await ChatSession.findOne({ sessionId: auth.sessionId });
          if (session && session.crn) {
            socket.data.crn = session.crn;
          }
        }

        if (auth.visitorId) {
          socket.join(`visitor_${auth.visitorId}`);
        }
        return next();
      }

      if (auth.type === "agent" && auth.token) {
        const rawToken = String(auth.token).replace(/^Bearer\s+/i, "");
        const user = await getUserFromToken(rawToken);
        if (!user) return next(new Error("User not found"));

        const role = normalizeRole(user.role);
        socket.data.type = role === "agent" ? "agent" : "owner";
        socket.data.user = user;
        const websiteIds = await getOwnedWebsiteIds(user);
        socket.data.websiteIds = websiteIds.map((id) => id.toString());

        if (["admin", "client"].includes(role)) {
          const websiteFilter = role === "admin" ? {} : { managerId: user._id };
          const websites = await Website.find(websiteFilter).select("_id");
          socket.data.websiteIds = websites.map(w => w._id.toString());
        }
        return next();
      }

      // Allow public ticket tracking portal subscribers to listen to real-time status and notes updates
      if (auth.type === "ticket_viewer" || auth.type === "public") {
        socket.data.type = "public";
        if (auth.ticketId) {
          socket.data.ticketId = auth.ticketId;
          socket.join(`ticket:${auth.ticketId}`);
        }
        return next();
      }

      return next(new Error("Unauthorized socket connection"));
    } catch (error) {
      return next(error);
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Sockets] Connection established: sid=${socket.id}, type=${socket.data?.type || 'unknown'}`);

    // ── Live AI-to-Human Voice Call Handoff & WebRTC Signaling (Registered First) ──
    socket.on("call:request-human", async (payload) => {
      try {
        const { sessionId, websiteId, visitorName, visitorId, callerPhone, transcript, aiSummary, telemetry } = payload || {};
        const callId = payload?.callId || `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        // ── Resolve Visitor's Real Name from Payload, ChatSession, or Visitor Model ──
        let resolvedVisitorName = (visitorName && visitorName !== "Website Visitor" && visitorName !== "Visitor" && String(visitorName).trim()) 
          ? String(visitorName).trim() 
          : "";

        if (!resolvedVisitorName && (sessionId || visitorId)) {
          try {
            if (sessionId) {
              const sessionDoc = await ChatSession.findOne({
                $or: [{ sessionId }, ...(isValidObjectId(sessionId) ? [{ _id: sessionId }] : [])]
              }).populate("visitorId").populate("customerId");
              
              if (sessionDoc?.visitorId?.name && sessionDoc.visitorId.name.trim()) {
                resolvedVisitorName = sessionDoc.visitorId.name.trim();
              } else if (sessionDoc?.customerId?.name && sessionDoc.customerId.name.trim()) {
                resolvedVisitorName = sessionDoc.customerId.name.trim();
              }
            }
            if (!resolvedVisitorName && visitorId) {
              const visitorDoc = await Visitor.findOne({
                $or: [{ visitorId }, ...(isValidObjectId(visitorId) ? [{ _id: visitorId }] : [])]
              });
              if (visitorDoc?.name && visitorDoc.name.trim()) {
                resolvedVisitorName = visitorDoc.name.trim();
              }
            }
          } catch (lookupErr) {
            console.warn("[Sockets] Could not resolve visitor real name from DB:", lookupErr.message);
          }
        }

        if (!resolvedVisitorName) {
          const loc = telemetry?.city || (telemetry?.country && telemetry.country !== "Unknown" ? telemetry.country : null);
          if (loc) {
            resolvedVisitorName = `Visitor (${loc})`;
          } else if (visitorId && visitorId.length >= 4) {
            resolvedVisitorName = `Visitor #${visitorId.slice(-4).toUpperCase()}`;
          } else {
            resolvedVisitorName = "Visitor";
          }
        }

        console.log(`[Sockets] >>> call:request-human received for callId: ${callId} from socket: ${socket.id}, visitor: ${resolvedVisitorName}`);
        
        socket.join(`call_${callId}`);
        if (sessionId) socket.join(sessionId);
        if (visitorId) socket.join(`visitor_${visitorId}`);

        const callData = {
          callId,
          sessionId,
          visitorSocketId: socket.id,
          visitorId,
          visitorName: resolvedVisitorName,
          callerPhone: callerPhone || "Web Direct Voice Call",
          websiteId: websiteId || socket.data?.website?._id?.toString() || "",
          transcript: transcript || "",
          aiSummary: aiSummary || "Visitor requested live human agent voice assistance.",
          telemetry: telemetry || {},
          status: "ringing",
          requestedAt: new Date()
        };

        activeVoiceCalls.set(callId, {
          ...callData,
          visitorSocket: socket
        });

        let targetWebsite = socket.data?.website;
        if (!targetWebsite && websiteId) {
          const isObjId = isValidObjectId(websiteId);
          targetWebsite = await Website.findOne({
            $or: [
              { apiKey: websiteId },
              ...(isObjId ? [{ _id: websiteId }] : [])
            ]
          }).catch(() => null);
        }

        if (targetWebsite) {
          callData.websiteId = targetWebsite._id.toString();
          callData.websiteName = targetWebsite.websiteName || targetWebsite.domain || "";
          callData.managerId = targetWebsite.managerId ? targetWebsite.managerId.toString() : "";
          const stored = activeVoiceCalls.get(callId);
          if (stored) {
            stored.websiteId = callData.websiteId;
            stored.websiteName = callData.websiteName;
            stored.managerId = callData.managerId;
          }
        }

        // Scoped broadcast to connected agent/manager/admin dashboards for this website
        emitToWebsiteStaff(io, { websiteId: callData.websiteId, managerId: targetWebsite?.managerId }, "call:incoming", callData);
        console.log(`[Sockets] >>> call:incoming broadcasted for callId: ${callId} (website: ${callData.websiteId || 'global'}).`);

        const queuedPayload = { message: "Connecting to an available support agent...", callId };
        io.to(`call_${callId}`).emit("call:queued", queuedPayload);
        if (sessionId) io.to(sessionId).emit("call:queued", queuedPayload);
        socket.emit("call:queued", queuedPayload);
      } catch (err) {
        console.error(`[Sockets] ERROR handling call:request-human:`, err);
      }
    });

    socket.on("call:accept", async (payload) => {
      const { callId, sessionId, visitorSocketId, visitorId, isTransferred, transferredBySocketId } = payload || {};
      const agentUser = socket.data.user;
      console.log(`[Sockets] >>> call:accept received for callId: ${callId} by agent: ${agentUser?.name || 'Agent'} (sid: ${socket.id})`);

      if (callId) {
        socket.join(`call_${callId}`);
      }

      const activeRecord = callId ? activeVoiceCalls.get(callId) : null;
      if (activeRecord) {
        activeRecord.agentSocketId = socket.id;
        activeRecord.agentId = agentUser?._id?.toString() || null;
        activeRecord.agentName = agentUser?.name || "Support Specialist";
        activeRecord.status = "connected";
        activeRecord.connectedAt = new Date();
      }

      const acceptPayload = {
        callId,
        sessionId: sessionId || activeRecord?.sessionId,
        agentSocketId: socket.id,
        agentName: agentUser?.name || "Support Specialist",
        agentRole: agentUser?.role || "Senior Specialist"
      };

      if (callId) {
        io.to(`call_${callId}`).emit("call:accepted", acceptPayload);
      }
      const targetVisitorSid = visitorSocketId || activeRecord?.visitorSocketId;
      if (targetVisitorSid) {
        io.to(targetVisitorSid).emit("call:accepted", acceptPayload);
      }
      const targetSessionId = sessionId || activeRecord?.sessionId;
      if (targetSessionId) {
        io.to(targetSessionId).emit("call:accepted", acceptPayload);
      }
      const targetVisitorId = visitorId || activeRecord?.visitorId;
      if (targetVisitorId) {
        io.to(`visitor_${targetVisitorId}`).emit("call:accepted", acceptPayload);
      }

      if (transferredBySocketId) {
        io.to(transferredBySocketId).emit("call:transferred-success", {
          callId,
          newAgentName: agentUser?.name || "Senior Specialist"
        });
      }

      emitToWebsiteStaff(
        io,
        { websiteId: activeRecord?.websiteId, managerId: activeRecord?.managerId },
        "call:answered",
        { callId, answeredBy: agentUser?.name }
      );
    });

    socket.on("call:transfer", async (payload) => {
      const { callId, sessionId, visitorSocketId, targetAgentId, transferNote, callerDetails } = payload || {};
      const agentUser = socket.data.user;
      console.log(`[Sockets] Call ${callId} transferred by ${agentUser?.name} to targetAgent ${targetAgentId}`);

      let transferVisitorName = (callerDetails?.visitorName && callerDetails.visitorName !== "Website Visitor" && callerDetails.visitorName !== "Visitor" && callerDetails.visitorName.trim())
        ? callerDetails.visitorName.trim()
        : "";

      if (!transferVisitorName && (sessionId || callerDetails?.visitorId)) {
        try {
          const sDoc = await ChatSession.findOne({ 
            $or: [{ sessionId }, ...(isValidObjectId(sessionId) ? [{ _id: sessionId }] : [])]
          }).populate("visitorId");
          if (sDoc?.visitorId?.name && sDoc.visitorId.name.trim()) {
            transferVisitorName = sDoc.visitorId.name.trim();
          }
        } catch {}
      }

      const existingCall = callId ? activeVoiceCalls.get(callId) : null;
      const resolvedCallId = callId || `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const transferCallData = {
        callId: resolvedCallId,
        sessionId: sessionId || existingCall?.sessionId,
        visitorSocketId: visitorSocketId || existingCall?.visitorSocketId,
        visitorId: callerDetails?.visitorId || existingCall?.visitorId,
        websiteId: callerDetails?.websiteId || existingCall?.websiteId || "",
        managerId: existingCall?.managerId || "",
        visitorName: transferVisitorName || existingCall?.visitorName || "Visitor",
        callerPhone: callerDetails?.callerPhone || existingCall?.callerPhone || "Web Voice",
        telemetry: callerDetails?.telemetry || existingCall?.telemetry || {},
        aiSummary: transferNote 
          ? `[Handover from ${agentUser?.name || 'Agent'}]: "${transferNote}"`
          : `Live call transferred from ${agentUser?.name || 'Agent'}`,
        isTransferred: true,
        transferredBy: agentUser?.name || "Agent",
        transferredBySocketId: socket.id,
        targetAgentId: targetAgentId ? String(targetAgentId) : "",
        transferNote: transferNote || "",
        requestedAt: new Date()
      };

      activeVoiceCalls.set(resolvedCallId, {
        ...(existingCall || {}),
        ...transferCallData,
        status: "ringing",
        declinedBySockets: new Set()
      });

      if (resolvedCallId) io.to(`call_${resolvedCallId}`).emit("call:transfer-in-progress", { callId: resolvedCallId, message: "Transferring your call..." });
      if (transferCallData.visitorSocketId) io.to(transferCallData.visitorSocketId).emit("call:transfer-in-progress", { callId: resolvedCallId, message: "Transferring your call..." });

      let delivered = false;
      for (const [id, s] of io.sockets.sockets) {
        if (s.data?.user) {
          const uId = String(s.data.user._id || s.data.user.id || "");
          if (uId === String(targetAgentId)) {
            s.emit("call:incoming", transferCallData);
            delivered = true;
          }
        }
      }

      if (!delivered) {
        emitToWebsiteStaff(io, { websiteId: transferCallData.websiteId, managerId: transferCallData.managerId }, "call:incoming", transferCallData);
      }

      socket.emit("call:transfer-initiated", { callId: resolvedCallId, success: true });
    });

    socket.on("call:reject", async (payload) => {
      const { callId, visitorSocketId, sessionId } = payload || {};
      const callInfo = callId ? activeVoiceCalls.get(callId) : null;
      if (callInfo) {
        if (!callInfo.declinedBySockets) callInfo.declinedBySockets = new Set();
        callInfo.declinedBySockets.add(socket.id);

        // Check if any other online eligible agent socket is still ringing before terminating the call for everyone
        let otherEligibleAgents = 0;
        if (!callInfo.isTransferred) {
          for (const [sId, s] of io.sockets.sockets) {
            if (callInfo.declinedBySockets.has(sId)) continue;
            if (!s.data?.user) continue;
            const role = normalizeRole(s.data.user.role);
            if (!["agent", "client", "manager", "admin"].includes(role)) continue;
            const belongsToWebsite =
              role === "admin" ||
              !callInfo.websiteId ||
              (Array.isArray(s.data.websiteIds) && s.data.websiteIds.includes(String(callInfo.websiteId))) ||
              (callInfo.managerId && String(s.data.user._id) === String(callInfo.managerId));
            if (belongsToWebsite) {
              otherEligibleAgents++;
            }
          }
        }

        if (otherEligibleAgents > 0) {
          console.log(`[Sockets] Agent ${socket.id} declined call ${callId}; ${otherEligibleAgents} other agent socket(s) still eligible.`);
          return;
        }

        if (callInfo.status === "ringing") {
          await handleMissedCall(io, { callId, callInfo, reason: "Agent declined / Line busy" });
        }
      }
      const busyMsg = { callId, message: "Agent is currently busy." };
      if (callId) {
        io.to(`call_${callId}`).emit("call:busy", busyMsg);
        activeVoiceCalls.delete(callId);
      }
      if (visitorSocketId) io.to(visitorSocketId).emit("call:busy", busyMsg);
      if (sessionId) io.to(sessionId).emit("call:busy", busyMsg);
    });

    // ── Agent-to-Visitor Outbound Web Voice Call (Call Back) ──
    socket.on("call:agent-outbound", async (payload) => {
      try {
        const { callId, sessionId, visitorId, visitorName, agentName, agentId, websiteId } = payload || {};
        console.log(`[Sockets] Agent ${agentName || socket.id} calling visitor for session ${sessionId}, callId: ${callId}`);

        if (callId) socket.join(`call_${callId}`);
        if (sessionId) socket.join(sessionId);

        const callData = {
          callId,
          sessionId,
          agentSocketId: socket.id,
          agentId,
          agentName: agentName || socket.data?.user?.name || "Support Specialist",
          visitorId,
          visitorName: visitorName || "Visitor",
          websiteId,
          direction: "outbound",
          status: "ringing",
          requestedAt: new Date()
        };

        activeVoiceCalls.set(callId, {
          ...callData,
          agentSocket: socket
        });
        socket.join(`call_${callId}`);

        const incomingFromAgentPayload = {
          callId,
          sessionId,
          agentName: callData.agentName,
          agentSocketId: socket.id,
          requestedAt: new Date()
        };

        const recipientSockets = new Set();
        const candidateSessionIds = new Set();
        if (sessionId) candidateSessionIds.add(sessionId);

        const candidateVisitorIds = new Set();
        if (visitorId) candidateVisitorIds.add(String(visitorId));

        let targetCrn = payload?.crn || null;

        // 1. Look up ChatSession and Visitor records
        try {
          const sDoc = await ChatSession.findOne({
            $or: [{ sessionId }, ...(isValidObjectId(sessionId) ? [{ _id: sessionId }] : [])]
          }).populate("visitorId");

          if (sDoc) {
            if (sDoc.sessionId) candidateSessionIds.add(sDoc.sessionId);
            if (sDoc._id) candidateSessionIds.add(sDoc._id.toString());
            if (sDoc.crn) targetCrn = sDoc.crn;

            if (sDoc.visitorId) {
              if (sDoc.visitorId._id) candidateVisitorIds.add(sDoc.visitorId._id.toString());
              if (sDoc.visitorId.visitorId) candidateVisitorIds.add(String(sDoc.visitorId.visitorId));
            }
          }

          // If we have any visitor identifier, find the Visitor document to get both _id and visitorId string
          const vQuery = [];
          for (const vId of candidateVisitorIds) {
            vQuery.push({ visitorId: vId });
            if (isValidObjectId(vId)) vQuery.push({ _id: vId });
          }
          if (vQuery.length > 0) {
            const vDoc = await Visitor.findOne({ $or: vQuery });
            if (vDoc) {
              if (vDoc._id) candidateVisitorIds.add(vDoc._id.toString());
              if (vDoc.visitorId) candidateVisitorIds.add(String(vDoc.visitorId));
              // Also find any active sessions for this visitor or CRN
              const allVisitorSessions = await ChatSession.find({
                $or: [
                  { visitorId: vDoc._id },
                  ...(vDoc.visitorId ? [{ visitorId: vDoc.visitorId }] : []),
                  ...(targetCrn ? [{ crn: targetCrn }] : [])
                ]
              }).select("sessionId _id crn");

              for (const vs of allVisitorSessions) {
                if (vs.sessionId) candidateSessionIds.add(vs.sessionId);
                if (vs._id) candidateSessionIds.add(vs._id.toString());
                if (vs.crn && !targetCrn) targetCrn = vs.crn;
              }
            }
          }
        } catch (lookupErr) {
          console.warn("[Sockets] Error resolving session & visitor candidates:", lookupErr.message);
        }

        console.log(`[Sockets] Call ${callId} candidates -> Sessions:`, Array.from(candidateSessionIds), "VisitorIds:", Array.from(candidateVisitorIds), "CRN:", targetCrn);

        // 2. Scan all connected sockets
        for (const [sId, s] of io.sockets.sockets) {
          if (s.id !== socket.id && s.data?.type === "visitor") {
            const sSession = s.data?.sessionId;
            const sVisitor = s.data?.visitorId ? String(s.data.visitorId) : null;
            const sCrn = s.data?.crn;

            let isMatch = false;
            if (targetCrn && sCrn && sCrn === targetCrn) isMatch = true;
            if (!isMatch && sSession && candidateSessionIds.has(sSession)) isMatch = true;
            if (!isMatch && sVisitor && candidateVisitorIds.has(sVisitor)) isMatch = true;
            if (!isMatch) {
              for (const cSess of candidateSessionIds) {
                if (s.rooms.has(cSess) || s.rooms.has(`session_${cSess}`)) {
                  isMatch = true;
                  break;
                }
              }
            }
            if (isMatch) {
              recipientSockets.add(s);
            }
          }
        }

        // 3. Also check room members for candidate rooms
        const candidateRoomNames = [];
        for (const cSess of candidateSessionIds) {
          candidateRoomNames.push(cSess);
          if (!cSess.startsWith("session_")) candidateRoomNames.push(`session_${cSess}`);
        }
        for (const cVis of candidateVisitorIds) {
          candidateRoomNames.push(`visitor_${cVis}`);
          if (cVis.startsWith("visitor_")) candidateRoomNames.push(cVis);
        }

        for (const rName of candidateRoomNames) {
          const room = io.sockets.adapter.rooms.get(rName);
          if (room) {
            for (const sId of room) {
              const s = io.sockets.sockets.get(sId);
              if (s && s.id !== socket.id && s.data?.type !== "agent") {
                recipientSockets.add(s);
              }
            }
          }
        }

        console.log(`[Sockets] Outbound call ${callId} target resolved to ${recipientSockets.size} active visitor sockets.`);

        if (recipientSockets.size === 0) {
          console.warn(`[Sockets] No active visitor socket found for outbound call ${callId}. Emitting fallback to candidate rooms.`);
          for (const rName of candidateRoomNames) {
            io.to(rName).emit("call:incoming-from-agent", incomingFromAgentPayload);
          }
        } else {
          for (const s of recipientSockets) {
            s.join(`call_${callId}`);
            s.emit("call:incoming-from-agent", incomingFromAgentPayload);
          }
        }
      } catch (err) {
        console.error("[Sockets] Error handling call:agent-outbound:", err);
      }
    });

    socket.on("call:visitor-accept", async (payload) => {
      const { callId, sessionId, targetSocketId } = payload || {};
      console.log(`[Sockets] Visitor accepted call ${callId} from socket ${socket.id}`);
      const callRecord = callId ? activeVoiceCalls.get(callId) : null;
      if (callRecord) {
        callRecord.status = "connected";
        callRecord.visitorSocketId = socket.id;
        callRecord.connectedAt = new Date();
      }
      if (callId) socket.join(`call_${callId}`);

      const agentSockId = callRecord?.agentSocketId || targetSocketId;
      const acceptPayload = {
        callId,
        sessionId: sessionId || callRecord?.sessionId,
        visitorSocketId: socket.id,
        agentSocketId: agentSockId
      };

      // Emit strictly ONCE to the agent
      if (agentSockId) {
        io.to(agentSockId).emit("call:visitor-accepted", acceptPayload);
      } else if (callId) {
        socket.to(`call_${callId}`).emit("call:visitor-accepted", acceptPayload);
      }
    });

    socket.on("call:visitor-decline", async (payload) => {
      const { callId, sessionId, targetSocketId, reason } = payload || {};
      console.log(`[Sockets] Visitor declined call ${callId}:`, reason || "");
      const callRecord = callId ? activeVoiceCalls.get(callId) : null;
      if (callRecord && callRecord.status === "ringing") {
        await handleMissedCall(io, {
          callId,
          callInfo: callRecord,
          reason: reason === "timeout" ? "Visitor unanswered (timeout)" : "Visitor declined call"
        });
      }
      const agentSockId = callRecord?.agentSocketId || targetSocketId;
      const declinePayload = { callId, sessionId, reason, message: "Visitor declined the call." };

      if (agentSockId) {
        io.to(agentSockId).emit("call:visitor-declined", declinePayload);
      } else if (callId) {
        socket.to(`call_${callId}`).emit("call:visitor-declined", declinePayload);
      }

      if (callId) {
        activeVoiceCalls.delete(callId);
      }
    });

    socket.on("call:webrtc-signal", (payload) => {
      const { callId, targetSocketId, signalData } = payload || {};
      if (!signalData) return;
      const signalPayload = {
        senderSocketId: socket.id,
        callId,
        signalData
      };
      // Send directly to targetSocketId to avoid duplicate delivery
      if (targetSocketId && targetSocketId !== socket.id) {
        io.to(targetSocketId).emit("call:webrtc-signal", signalPayload);
      } else if (callId) {
        socket.to(`call_${callId}`).emit("call:webrtc-signal", signalPayload);
      }
    });

    socket.on("call:cancel", async (payload) => {
      const { callId, sessionId, targetSocketId } = payload || {};
      console.log(`[Sockets] Call ${callId} cancelled by caller on socket ${socket.id}`);
      const callInfo = callId ? activeVoiceCalls.get(callId) : null;
      if (callInfo && callInfo.status === "ringing") {
        await handleMissedCall(io, { 
          callId, 
          callInfo, 
          reason: callInfo.direction === "outbound" ? "Outbound call cancelled by agent" : "Caller cancelled while ringing" 
        });
      }
      if (callId) activeVoiceCalls.delete(callId);

      const cancelPayload = { callId, sessionId: sessionId || callInfo?.sessionId, cancelled: true };
      const rooms = new Set(["us_admin"]);
      if (callId) rooms.add(`call_${callId}`);
      if (callInfo?.websiteId) rooms.add(`ws_${callInfo.websiteId}`);
      if (callInfo?.managerId) rooms.add(`us_${callInfo.managerId}`);
      if (callInfo?.agentSocketId) rooms.add(callInfo.agentSocketId);
      if (callInfo?.visitorSocketId) rooms.add(callInfo.visitorSocketId);
      if (callInfo?.agentId) rooms.add(`us_${callInfo.agentId}`);
      if (callInfo?.visitorId) rooms.add(`visitor_${callInfo.visitorId}`);
      const effSessionId = sessionId || callInfo?.sessionId;
      if (effSessionId) {
        rooms.add(effSessionId);
        if (!effSessionId.startsWith("session_")) rooms.add(`session_${effSessionId}`);
      }
      if (targetSocketId) rooms.add(targetSocketId);

      // Chaining .to(r) deduplicates all sockets across rooms so each socket receives it strictly ONCE
      let broadcaster = io;
      for (const r of rooms) {
        broadcaster = broadcaster.to(r);
      }
      broadcaster.emit("call:cancelled", cancelPayload);
      broadcaster.emit("call:ended", cancelPayload);
    });

    socket.on("call:end", async (payload) => {
      const { callId, targetSocketId, duration, sessionId } = payload || {};
      console.log(`[Sockets] Call ${callId} ended by socket ${socket.id}`);
      const callInfo = callId ? activeVoiceCalls.get(callId) : null;
      if (callInfo) {
        if (callInfo.status === "ringing") {
          await handleMissedCall(io, { 
            callId, 
            callInfo, 
            reason: callInfo.direction === "outbound" ? "Outbound call cancelled by agent" : "Call ended before agent answered" 
          });
        } else if (callInfo.status === "connected") {
          await handleCompletedCall(io, { callId, callInfo, duration });
        }
      }
      if (callId) activeVoiceCalls.delete(callId);

      const endPayload = { callId, duration, sessionId: sessionId || callInfo?.sessionId };
      const rooms = new Set(["us_admin"]);
      if (callId) rooms.add(`call_${callId}`);
      if (sessionId) {
        rooms.add(sessionId);
        if (!sessionId.startsWith("session_")) rooms.add(`session_${sessionId}`);
      }
      if (callInfo?.sessionId && callInfo.sessionId !== sessionId) {
        rooms.add(callInfo.sessionId);
        if (!callInfo.sessionId.startsWith("session_")) rooms.add(`session_${callInfo.sessionId}`);
      }
      if (targetSocketId) rooms.add(targetSocketId);
      if (callInfo) {
        if (callInfo.agentSocketId) rooms.add(callInfo.agentSocketId);
        if (callInfo.visitorSocketId) rooms.add(callInfo.visitorSocketId);
        if (callInfo.agentId) rooms.add(`us_${callInfo.agentId}`);
        if (callInfo.visitorId) rooms.add(`visitor_${callInfo.visitorId}`);
        if (callInfo.websiteId) rooms.add(`ws_${callInfo.websiteId}`);
        if (callInfo.managerId) rooms.add(`us_${callInfo.managerId}`);
      }

      // Chaining .to(r) deduplicates all sockets across rooms so each socket receives it strictly ONCE
      let broadcaster = io;
      for (const r of rooms) {
        broadcaster = broadcaster.to(r);
      }
      broadcaster.emit("call:ended", endPayload);
    });

    socket.on("call:feedback", async (payload) => {
      const { callId, sessionId, websiteId, rating, sentiment, tags, comment, agentName, duration } = payload || {};
      console.log(`[Sockets] Call ${callId} rated ${rating} stars by visitor. Agent: ${agentName}, feedback: ${comment}`);
      let resolvedWebsiteId = null;
      let managerId = null;
      try {
        if (websiteId) {
          const wDoc = isValidObjectId(websiteId)
            ? await Website.findById(websiteId).catch(() => null)
            : await Website.findOne({ apiKey: websiteId }).catch(() => null);
          if (wDoc) {
            resolvedWebsiteId = wDoc._id;
            managerId = wDoc.managerId;
          }
        }
        const logFilter = sessionId
          ? { sessionId }
          : (resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : null);
        if (logFilter) {
          await CallLog.findOneAndUpdate(
            logFilter,
            {
              $set: {
                rating: Number(rating) || null,
                sentiment: sentiment || "",
                feedbackTags: Array.isArray(tags) ? tags : [],
                feedbackComment: comment || ""
              }
            },
            { sort: { createdAt: -1 } }
          ).catch(() => {});
        }
      } catch (fbErr) {
        console.warn("[Sockets] Error saving call feedback:", fbErr.message);
      }
      emitToWebsiteStaff(io, { websiteId: resolvedWebsiteId, managerId }, "call:feedback-received", payload);
    });

    // ── Regular Presence & Room Setup (Non-blocking) ──
    if (socket.data.type === "visitor") {
      const { website, sessionId, visitorId } = socket.data;
      if (website?._id) {
        socket.join(`ws_${website._id}`);
      }
      if (visitorId) {
        socket.join(`visitor_${visitorId}`);
        if (website?._id) {
          Visitor.updateOne({ visitorId, websiteId: website._id }, { $set: { isOnline: true, lastVisitTime: new Date() } }).catch(() => {});
        }
      }
      if (sessionId) {
        socket.join(sessionId);
      }
      const statusPayload = {
        sessionId,
        visitorId,
        isOnline: true,
        lastActiveAt: new Date()
      };
      if (sessionId) io.to(sessionId).emit("visitor:status", statusPayload);
      if (sessionId) io.to(sessionId).emit("visitor:online", statusPayload);
      if (website?._id) {
        io.to(`ws_${website._id}`).emit("visitor:status", statusPayload);
        io.to(`ws_${website._id}`).emit("visitor:online", statusPayload);
      }
      if (website?.managerId) {
        io.to(`us_${website.managerId}`).emit("visitor:status", statusPayload);
        io.to(`us_${website.managerId}`).emit("visitor:online", statusPayload);
      }
      io.to("us_admin").emit("visitor:status", statusPayload);
      io.to("us_admin").emit("visitor:online", statusPayload);
    }

    if (socket.data.type === "agent" || socket.data.type === "owner") {
      const user = socket.data.user;
      socket.join(`us_${user._id}`);
      for (const websiteId of socket.data.websiteIds || []) {
        socket.join(`ws_${websiteId}`);
      }
      if (socket.data.type === "owner") {
        const role = normalizeRole(user.role);
        socket.join(role === "admin" ? "us_admin" : `us_${user._id}`);
      }
      user.isOnline = true;
      user.lastActiveAt = new Date();
      user.save().catch(() => {});
      processQueue(io);
    }

    socket.on("agent:join-session", async ({ sessionId }) => {
      const NON_SESSION_PREFIXES = ["ws_", "us_", "visitor_", "lead_", "call_"];
      const leftRooms = [];
      for (const room of socket.rooms) {
        if (room === socket.id) continue;
        if (room === sessionId) continue;
        if (NON_SESSION_PREFIXES.some(p => room.startsWith(p))) continue;
        socket.leave(room);
        leftRooms.push(room);
      }
      
      socket.data.joinTime = Date.now();
      socket.join(sessionId);
      
      await broadcastSessionPresence(io, sessionId);
      for (const room of leftRooms) {
        await broadcastSessionPresence(io, room);
      }
    });

    socket.on("agent:take-over-chat", async ({ sessionId, force = false }) => {
      try {
        const { user } = socket.data;
        if (!user) return;
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;

        // Prevent accidental collision if another agent is already handling this active chat
        const isAssignedToOther = session.assignedAgent && String(session.assignedAgent) !== String(user._id);
        const canOverride = ["admin", "manager"].includes(normalizeRole(user.role)) || force;

        if (isAssignedToOther && !canOverride) {
          socket.emit("chat:takeover-conflict", {
            sessionId,
            message: "This chat is already assigned to another active agent."
          });
          return;
        }

        session.assignedAgent = user._id;
        session.status = "active";
        session.acceptedAt = new Date();
        await session.save();

        const populated = await ChatSession.findById(session._id)
          .populate("websiteId", "websiteName domain managerId")
          .populate("visitorId", "visitorId name email isOnline")
          .populate("assignedAgent", "name email role isOnline");

        emitSessionUpdate(populated);
        io.to(sessionId).emit("chat:assigned", { sessionId, agentName: user.name });
        
        await logAuditEvent({
          actor: user,
          action: "chat.taken_over",
          entityType: "chat_session",
          entityId: session._id,
          websiteId: session.websiteId,
          metadata: { sessionId, previousAgent: isAssignedToOther ? session.assignedAgent : null }
        });
      } catch (err) {
        console.error("Takeover error:", err);
      }
    });

    socket.on("agent:release-chat", async ({ sessionId }) => {
      try {
        const { user } = socket.data;
        if (!user) return;
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;

        session.assignedAgent = null;
        await session.save();

        const populated = await ChatSession.findById(session._id)
          .populate("websiteId", "websiteName domain managerId")
          .populate("visitorId", "visitorId name email isOnline")
          .populate("assignedAgent", "name email role isOnline");

        emitSessionUpdate(populated);
        io.to(sessionId).emit("chat:assigned", { sessionId, agentName: null });

        await logAuditEvent({
          actor: user,
          action: "chat.released",
          entityType: "chat_session",
          entityId: session._id,
          websiteId: session.websiteId,
          metadata: { sessionId }
        });
      } catch (err) {
        console.error("Release error:", err);
      }
    });

    socket.on("agent:request-control", async ({ sessionId }) => {
      try {
        const { user } = socket.data;
        if (!user) return;
        const session = await ChatSession.findOne({ sessionId }).populate("assignedAgent");
        if (!session || !session.assignedAgent) return;

        const currentAgentId = session.assignedAgent._id.toString();
        io.to(`us_${currentAgentId}`).emit("chat:control-requested", {
          sessionId,
          requestedBy: {
            _id: user._id,
            name: user.name,
            role: user.role
          }
        });
      } catch (err) {
        console.error("Request control error:", err);
      }
    });

    socket.on("disconnecting", async () => {
      const NON_SESSION_PREFIXES = ["ws_", "us_", "visitor_", "lead_", "call_"];
      for (const room of socket.rooms) {
        if (room === socket.id) continue;
        if (NON_SESSION_PREFIXES.some(p => room.startsWith(p))) continue;
        try {
          const sockets = await io.in(room).fetchSockets();
          const viewers = [];
          const seen = new Set();
          for (const s of sockets) {
            if (s.id === socket.id) continue;
            if ((s.data.type === "agent" || s.data.type === "owner") && s.data.user) {
              const userId = s.data.user._id.toString();
              if (!seen.has(userId)) {
                seen.add(userId);
                viewers.push({
                  _id: s.data.user._id,
                  name: s.data.user.name,
                  role: s.data.user.role
                });
              }
            }
          }
          socket.to(room).emit("presence:viewers", { sessionId: room, viewers });
        } catch (err) {
          console.error("Error broadcasting disconnecting presence:", err);
        }
      }
    });

    socket.on("ticket:subscribe", ({ ticketId }) => {
      if (ticketId) {
        socket.join(`ticket:${ticketId}`);
      }
    });

    socket.on("ticket:unsubscribe", ({ ticketId }) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
      }
    });

    socket.on("visitor:join-room", async ({ sessionId }) => {
      if (sessionId) {
        socket.join(sessionId);
        socket.data.sessionId = sessionId;
        const statusPayload = {
          sessionId,
          visitorId: socket.data.visitorId,
          isOnline: true,
          lastActiveAt: new Date()
        };
        io.to(sessionId).emit("visitor:status", statusPayload);
        io.to(sessionId).emit("visitor:online", statusPayload);
        if (socket.data.website?._id) {
          io.to(`ws_${socket.data.website._id}`).emit("visitor:status", statusPayload);
          io.to(`ws_${socket.data.website._id}`).emit("visitor:online", statusPayload);
        }
        if (socket.data.website?.managerId) {
          io.to(`us_${socket.data.website.managerId}`).emit("visitor:status", statusPayload);
          io.to(`us_${socket.data.website.managerId}`).emit("visitor:online", statusPayload);
        }
        io.to("us_admin").emit("visitor:status", statusPayload);
      }
    });

    socket.on("crm:viewing-lead", ({ leadId, isViewing }) => {
      if (!leadId || !socket.data.user) return;
      const room = `lead_${leadId}`;
      if (isViewing) {
        socket.join(room);
        socket.to(room).emit("crm:lead-presence", {
          leadId,
          user: { _id: socket.data.user._id, name: socket.data.user.name, role: socket.data.user.role },
          isViewing: true
        });
      } else {
        socket.leave(room);
        socket.to(room).emit("crm:lead-presence", {
          leadId,
          user: { _id: socket.data.user._id, name: socket.data.user.name },
          isViewing: false
        });
      }
    });

    socket.on("visitor:typing", ({ sessionId, isTyping } = {}) => {
      if (!sessionId) return;
      const typingPayload = { isTyping: Boolean(isTyping), sender: "visitor", sessionId };
      socket.to(sessionId).emit("chat:typing", typingPayload);
      socket.to(sessionId).emit("visitor:typing", typingPayload);
    });

    socket.on("agent:typing", ({ sessionId, isTyping } = {}) => {
      if (!sessionId) return;
      const typingPayload = { 
        isTyping: Boolean(isTyping), 
        sender: "agent",
        sessionId,
        agentId: socket.data.user?._id,
        agentName: socket.data.user?.name || "Support"
      };
      socket.to(sessionId).emit("chat:typing", typingPayload);
      socket.to(sessionId).emit("agent:typing", typingPayload);
    });

    const handleDeliveredAck = async ({ messageId, sessionId } = {}) => {
      try {
        if (!messageId || !isValidObjectId(String(messageId))) return;
        const now = new Date();
        await Message.findByIdAndUpdate(messageId, { $set: { deliveredAt: now, status: "delivered" } }).catch(() => {});
        const statusPayload = { messageId, sessionId, status: "delivered", deliveredAt: now };
        if (sessionId) {
          io.to(sessionId).emit("chat:status:update", statusPayload);
          io.to(sessionId).emit("chat:delivered", statusPayload);
        }
      } catch {}
    };
    socket.on("chat:ack:delivered", handleDeliveredAck);
    socket.on("chat:delivered:ack", handleDeliveredAck);

    socket.on("agent:read-session", async ({ sessionId } = {}) => {
      try {
        if (!sessionId) return;
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;
        const now = new Date();
        const unreadMsgs = await Message.find({ sessionId: session._id, sender: "visitor", readAt: null }).select("_id");
        if (unreadMsgs.length > 0) {
          await Message.updateMany({ _id: { $in: unreadMsgs.map((m) => m._id) } }, { $set: { readAt: now, deliveredAt: now, status: "read" } });
          for (const m of unreadMsgs) {
            const readPayload = { messageId: m._id, sessionId, status: "read", readAt: now };
            io.to(sessionId).emit("chat:status:update", readPayload);
            io.to(sessionId).emit("chat:read", readPayload);
          }
        }
        if (session.unreadCount) {
          session.unreadCount = 0;
          await session.save().catch(() => {});
        }
      } catch (err) {
        console.warn("agent:read-session error:", err.message);
      }
    });

    socket.on("agent:transfer-chat", async ({ sessionId, targetAgentId, department } = {}) => {
      try {
        const { user } = socket.data;
        if (!user || !sessionId) return;
        const session = await ChatSession.findOne({ sessionId }).populate("websiteId");
        if (!session) return;

        let targetAgent = null;
        if (targetAgentId && isValidObjectId(String(targetAgentId))) {
          targetAgent = await User.findById(targetAgentId).select("_id name email role");
          if (targetAgent) session.assignedAgent = targetAgent._id;
        } else if (department) {
          session.assignedAgent = null;
        }
        if (department) session.department = String(department).toLowerCase();
        session.status = "active";
        await session.save();

        const transferText = targetAgent
          ? `Chat transferred to ${targetAgent.name}${department ? ` (${department})` : ""} by ${user.name || "Agent"}`
          : `Chat transferred to ${department || "Support"} department by ${user.name || "Agent"}`;

        const sysSaved = await addMessage({
          chatSession: session,
          sender: "system",
          message: transferText
        }).catch(() => null);

        if (sysSaved) {
          const sysPayload = {
            _id: sysSaved._id,
            sessionId: session.sessionId,
            message: transferText,
            sender: "system",
            senderName: "System",
            createdAt: sysSaved.createdAt
          };
          io.to(session.sessionId).emit("chat:message", sysPayload);
          const wsId = getSessionWebsiteId(session);
          if (wsId) io.to(`ws_${wsId}`).emit("chat:new-message", sysPayload);
        }

        const populated = await ChatSession.findById(session._id)
          .populate("websiteId", "websiteName domain managerId")
          .populate("visitorId", "visitorId name email isOnline")
          .populate("assignedAgent", "name email role isOnline");
        emitSessionUpdate(populated);

        if (targetAgent) {
          io.to(`us_${targetAgent._id}`).emit("chat:assigned", { sessionId: session.sessionId, agentName: targetAgent.name });
          io.to(session.sessionId).emit("chat:assigned", { sessionId: session.sessionId, agentName: targetAgent.name });
          await createAndEmitNotification(io, {
            recipient: targetAgent._id,
            type: "new_chat",
            title: "Chat Transferred to You",
            message: `${user.name || "An agent"} transferred a conversation to you.`,
            link: `/agent?tab=chats&sessionId=${session.sessionId}`
          });
        }
      } catch (err) {
        console.error("agent:transfer-chat error:", err);
      }
    });

    
    socket.on("visitor:bot-prompt", async ({ sessionId, message, nodeKey, tempId = null }) => {
      try {
        const { website } = socket.data;
        if (!website || !message?.trim()) return;

        const session = await ChatSession.findOne({ sessionId }).populate("websiteId");
        if (!session) return;

        // Check if the immediately preceding message was already this exact prompt to avoid consecutive duplicates
        const lastMsg = await Message.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
        if (lastMsg && lastMsg.sender === "agent" && lastMsg.message === message.trim()) {
          return;
        }

        const botSaved = await addMessage({
          chatSession: session,
          sender: "agent",
          message: message.trim(),
          isAi: true
        });

        const botPayload = {
          _id: botSaved._id,
          sessionId: session.sessionId,
          message: botSaved.message,
          sender: "agent",
          senderName: session.websiteId?.websiteName ? `${session.websiteId.websiteName} AI` : "AI Assistant",
          isAi: true,
          tempId,
          createdAt: botSaved.createdAt
        };

        io.to(session.sessionId).emit("chat:message", botPayload);
        io.to(`ws_${session.websiteId._id || session.websiteId}`).emit("chat:new-message", botPayload);
        if (session.assignedAgent) {
          io.to(`us_${session.assignedAgent._id || session.assignedAgent}`).emit("chat:message", botPayload);
        }
      } catch (err) {
        console.error("visitor:bot-prompt error:", err);
      }
    });

    socket.on("visitor:message", async ({ sessionId, message, attachmentUrl = null, attachmentType = null, tempId = null }) => {
      try {
        const { website, visitorId } = socket.data;
        if (!website || !visitorId) return;

        const session = await ChatSession.findOne({ sessionId }).populate("assignedAgent").populate("websiteId");
        if (!session || (!message?.trim() && !attachmentUrl)) return;

        if (session.status === "closed") {
          session.status = "active";
          session.closedAt = null;
          await session.save();
        }

        const wsId = getSessionWebsiteId(session);
        const mgrId = getSessionManagerId(session);

        const lowerMsg = (message || "").toLowerCase();
        const wantsAgentOrEscalation = 
          lowerMsg.includes("agent") || 
          lowerMsg.includes("human") || 
          lowerMsg.includes("representative") || 
          lowerMsg.includes("customer care") || 
          lowerMsg.includes("support team") || 
          lowerMsg.includes("talk to someone") || 
          lowerMsg.includes("baat karni") || 
          lowerMsg.includes("human support");

        if (wantsAgentOrEscalation) {
          session.botStatus = "escalated";
        }

        if (!session.assignedAgent && wsId && (session.botStatus === "escalated" || !session.websiteId?.botEnabled)) {
          const agent = await findAvailableAgent({ managerId: mgrId, websiteId: wsId });
          if (agent && !await hasReachedActiveChatLimit(agent._id)) {
            session.assignedAgent = agent._id;
            session.status = "active";
            session.acceptedAt = new Date();
            await session.save();
            emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email isOnline").populate("assignedAgent", "name email role isOnline"));
            io.to(`us_${agent._id}`).emit("chat:assigned", { sessionId: session.sessionId });
            io.to(session.sessionId).emit("chat:assigned", { sessionId: session.sessionId, agentName: agent.name });
            
            try {
              emitToWebsiteStaff(io, { websiteId: wsId, managerId: mgrId }, "chat:assigned", {
                sessionId: session.sessionId,
                agentName: agent.name,
                message: `Agent ${agent.name} assigned to chat session`,
                user: agent.name
              });
            } catch (err) {}
            await createAndEmitNotification(io, {
              recipient: agent._id,
              type: "new_chat",
              title: "New chat assigned",
              message: `Visitor ${session.visitorId?.name || session.sessionId} has been assigned to you.`,
              link: `/client?tab=chats&sessionId=${session.sessionId}`
            });
          } else {
            // In case of no agent available to take chat, create an offline support ticket
            try {
              const visitorRawId = session.visitorId?._id || session.visitorId;
              const customerRawId = session.customerId?._id || session.customerId;
              const visitorObjId = isValidObjectId(String(visitorRawId)) ? visitorRawId : null;
              const customerObjId = isValidObjectId(String(customerRawId)) ? customerRawId : null;

              const existingTicket = await Ticket.findOne({
                websiteId: wsId,
                $or: [
                  ...(visitorObjId ? [{ visitorId: visitorObjId }] : []),
                  ...(customerObjId ? [{ customerId: customerObjId }] : [])
                ],
                status: { $in: ["open", "in_progress", "waiting", "pending"] },
                channel: "chat"
              });

              if (!existingTicket) {
                const rawVisName = session.visitorId?.name || "Visitor";
                const offlineTicket = await Ticket.create({
                  ticketId: buildTicketId(),
                  websiteId: wsId,
                  visitorId: visitorObjId,
                  customerId: customerObjId,
                  crn: session.crn || null,
                  subject: `Offline Chat Support Request: ${rawVisName}`,
                  priority: "high",
                  status: "open",
                  channel: "chat",
                  department: "support",
                  lastMessagePreview: `Visitor requested agent assistance, but all support agents are currently offline or busy.`,
                  notes: [{
                    content: `[No Agent Available]: Visitor requested live agent assistance in session ${session.sessionId}, but no human agent was online or available. Inquiry: "${message || ''}"`,
                    isPublic: false
                  }]
                });

                emitToWebsiteStaff(io, { websiteId: wsId, managerId: mgrId }, "ticket:created", {
                  ticket: offlineTicket,
                  message: `Offline ticket ${offlineTicket.ticketId} created for ${rawVisName}`,
                  user: rawVisName,
                  websiteId: wsId
                });
              }
            } catch (ticketErr) {
              console.error("[Sockets] Error creating offline chat fallback ticket:", ticketErr.message);
            }
          }
        }

        const saved = await addMessage({
          chatSession: session,
          sender: "visitor",
          message: message || "",
          attachmentUrl,
          attachmentType
        });

        const payload = {
          _id: saved._id,
          sessionId: session.sessionId,
          message: saved.message,
          attachmentUrl: saved.attachmentUrl,
          attachmentType: saved.attachmentType,
          sender: "visitor",
          senderName: "Visitor",
          createdAt: saved.createdAt,
          tempId
        };

        io.to(session.sessionId).emit("chat:message", payload);
        if (wsId) io.to(`ws_${wsId}`).emit("chat:new-message", payload);
        broadcastStatsUpdate(io, wsId, mgrId);

        if (session.assignedAgent) {
          io.to(`us_${session.assignedAgent._id || session.assignedAgent}`).emit("chat:message", payload);
        }

        // If no human live agent is assigned and AI bot is enabled, generate real-time AI response using Google Gemini
        if (!session.assignedAgent && message?.trim()) {
          try {
            const websiteObj = wsId ? await Website.findById(wsId) : null;
            if (websiteObj && websiteObj.botEnabled !== false) {
              const { AiProviderManager } = await import("../services/aiProviderManager.js");
              const aiProvider = AiProviderManager.getProvider("gemini");
              const langInstruction = getStrictLanguageInstruction(message);

              const aiResult = await aiProvider.generateCompletion({
                prompt: `You are a helpful AI customer support assistant for ${websiteObj?.websiteName || "our company"}.
${langInstruction.directive}

Visitor message: "${message}".
Reply concisely and politely in 1 to 2 sentences:`,
                temperature: 0.7,
                maxTokens: 300
              });

              let outputMsg = aiResult?.text || "";
              if (outputMsg && langInstruction.lang.code === "en") {
                const hasHindiWords = /\b(aapke|aapka|aapki|aapko|naam|par|aur|ek|jinhe|hai|hain|kya|nahi|nhi|hoga|karein|kijiye|baare|mein|se|liye|kaam)\b/i.test(outputMsg);
                if (hasHindiWords) {
                  const fixRes = await aiProvider.generateCompletion({
                    prompt: `Translate this support reply into natural English:\n"${outputMsg}"\nOutput ONLY the English text.`,
                    temperature: 0.1,
                    maxTokens: 300
                  });
                  if (fixRes?.text && !fixRes.text.includes("[Google Gemini Response]")) {
                    outputMsg = fixRes.text.replace(/```/g, "").replace(/^["']|["']$/g, "").trim();
                  }
                }
              }

              if (outputMsg) {
                const aiSaved = await addMessage({
                  chatSession: session,
                  sender: "agent",
                  message: outputMsg,
                  isAi: true
                });

                const aiPayload = {
                  _id: aiSaved._id,
                  sessionId: session.sessionId,
                  message: aiSaved.message,
                  sender: "agent",
                  senderName: "Gemini AI Assistant 🤖",
                  isAi: true,
                  createdAt: aiSaved.createdAt
                };

                io.to(session.sessionId).emit("chat:message", aiPayload);
                if (wsId) io.to(`ws_${wsId}`).emit("chat:new-message", aiPayload);
              }
            }
          } catch (aiErr) {
            console.error("Gemini AI auto-response error:", aiErr);
          }
        }

        // Run intelligence processing in real-time
        try {
          const intel = await processChatIntelligence(sessionId);
          if (intel) {
            const intelPayload = {
              sessionId,
              sentimentScore: intel.sentimentScore,
              sentimentLabel: intel.sentimentLabel,
              aiSummary: intel.aiSummary
            };
            io.to(session.sessionId).emit("chat:intelligence-updated", intelPayload);
            io.to(`ws_${session.websiteId._id}`).emit("chat:intelligence-updated", intelPayload);
            if (session.assignedAgent) {
              io.to(`us_${session.assignedAgent._id || session.assignedAgent}`).emit("chat:intelligence-updated", intelPayload);
            }
          }
        } catch (intelErr) {
          console.error("Error processing real-time chat intelligence (visitor):", intelErr);
        }
      } catch (err) {
        console.error("[VISITOR_FATAL]:", err);
      }
    });

    socket.on("agent:message", async ({ sessionId, message, attachmentUrl = null, attachmentType = null, tempId = null }) => {
      try {
        const { user } = socket.data;
        if (!user) return;

        const session = await ChatSession.findOne({ sessionId }).populate("websiteId");
        if (!session || (!message?.trim() && !attachmentUrl)) return;

        if (session.status === "closed") {
          session.status = "active";
          session.closedAt = null;
        }

        const senderRole = normalizeRole(user.role);
        const isActualAgent = senderRole === "agent";

        if (!session.assignedAgent) {
          if (isActualAgent) {
            // Agent sending a message — self-assign (no limit block: agent should always be able to reply)
            session.assignedAgent = user._id;
            session.status = "active";
            session.acceptedAt = new Date();
          } else {
            // Admin/Client/Manager sending — find a real available agent first
            const realAgent = await findAvailableAgent({
              managerId: session.websiteId.managerId,
              websiteId: session.websiteId._id
            });
            if (realAgent) {
              session.assignedAgent = realAgent._id;
              session.status = "active";
              session.acceptedAt = new Date();
              io.to(`us_${realAgent._id}`).emit("chat:assigned", { sessionId: session.sessionId });
              io.to(session.sessionId).emit("chat:assigned", { sessionId: session.sessionId, agentName: realAgent.name });
              await createAndEmitNotification(io, {
                recipient: realAgent._id,
                type: "new_chat",
                title: "New chat assigned",
                message: `A visitor has been assigned to you.`,
                link: `/agent?tab=chats&sessionId=${session.sessionId}`
              });
            }
            // If no agent available, do NOT self-assign admin/client — leave unassigned (queued)
          }
        }
        await session.save();
        emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email isOnline").populate("assignedAgent", "name email role isOnline"));

        const saved = await addMessage({
          chatSession: session,
          sender: "agent",
          message: message || "",
          attachmentUrl,
          attachmentType,
          agentId: user._id
        });

        const payload = {
          _id: saved._id,
          sessionId: session.sessionId,
          message: saved.message,
          attachmentUrl: saved.attachmentUrl,
          attachmentType: saved.attachmentType,
          sender: "agent",
          senderName: user.name || "Support",
          createdAt: saved.createdAt,
          agentId: user._id,
          tempId
        };

        io.to(session.sessionId).emit("chat:message", payload);
        io.to(`ws_${session.websiteId._id}`).emit("chat:new-message", payload);
        broadcastStatsUpdate(io, session.websiteId._id, session.websiteId.managerId);

        // 2-Way Omnichannel Bridge: Sync agent reply to the customer's open Ticket Status Portal in real-time
        try {
          if (message?.trim()) {
            let linkedTicket = null;

            // Priority 1: Direct link on session (explicit session.ticketId)
            if (session.ticketId) {
              linkedTicket = await Ticket.findOne({
                _id: session.ticketId,
                status: { $in: ["open", "in_progress", "waiting", "pending"] }
              });
            }

            // Priority 2: Scan recent chat messages in this session for [Ticket #<ID>] pattern
            if (!linkedTicket) {
              const ticketTagMsg = await Message.findOne({
                sessionId: session._id,
                message: { $regex: /\[Ticket\s*#([a-zA-Z0-9_-]+)/i }
              }).sort({ createdAt: -1 });

              if (ticketTagMsg) {
                const match = ticketTagMsg.message.match(/\[Ticket\s*#([a-zA-Z0-9_-]+)/i);
                if (match && match[1]) {
                  linkedTicket = await Ticket.findOne({
                    ticketId: match[1],
                    status: { $in: ["open", "in_progress", "waiting", "pending"] }
                  });
                }
              }
            }

            // Priority 3: Scan session.lastMessagePreview for [Ticket #<ID>]
            if (!linkedTicket && session.lastMessagePreview) {
              const match = session.lastMessagePreview.match(/\[Ticket\s*#([a-zA-Z0-9_-]+)/i);
              if (match && match[1]) {
                linkedTicket = await Ticket.findOne({
                  ticketId: match[1],
                  status: { $in: ["open", "in_progress", "waiting", "pending"] }
                });
              }
            }

            // Priority 4: Fallback to customer's open ticket on this website, prioritized by customer's latest note activity
            if (!linkedTicket) {
              const rawVis = session.visitorId?._id || session.visitorId;
              const rawCust = session.customerId?._id || session.customerId;
              const openTickets = await Ticket.find({
                websiteId: session.websiteId._id || session.websiteId,
                $or: [
                  ...(rawVis ? [{ visitorId: rawVis }] : []),
                  ...(rawCust ? [{ customerId: rawCust }] : [])
                ],
                status: { $in: ["open", "in_progress", "waiting", "pending"] }
              }).limit(15);

              if (openTickets.length > 0) {
                linkedTicket = openTickets.sort((a, b) => {
                  const getLatestTime = (t) => {
                    if (t.notes && t.notes.length > 0) {
                      return new Date(t.notes[t.notes.length - 1].createdAt).getTime();
                    }
                    return new Date(t.createdAt).getTime();
                  };
                  return getLatestTime(b) - getLatestTime(a);
                })[0];
              }
            }

            if (linkedTicket) {
              if (!linkedTicket.notes) linkedTicket.notes = [];
              const agentNoteEntry = {
                content: message.trim(),
                authorName: user.name || "Support Specialist",
                isPublic: true,
                createdAt: new Date()
              };
              linkedTicket.notes.push(agentNoteEntry);
              linkedTicket.lastMessagePreview = message.trim().slice(0, 200);
              if (linkedTicket.status === "open") {
                linkedTicket.status = "in_progress";
              }
              await linkedTicket.save();

              // Link this ticket to the session so subsequent messages route to the exact same ticket
              if (!session.ticketId || String(session.ticketId) !== String(linkedTicket._id)) {
                session.ticketId = linkedTicket._id;
                await session.save();
              }

              // Broadcast real-time update to customer's live Ticket Status Portal room
              io.to(`ticket:${linkedTicket.ticketId}`).emit("ticket:updated", {
                ticketId: linkedTicket.ticketId,
                status: linkedTicket.status,
                priority: linkedTicket.priority,
                updatedAt: linkedTicket.updatedAt,
                newNote: agentNoteEntry
              });

              // Broadcast global updates for agent dashboards
              io.emit("ticket:updated", {
                ticketId: linkedTicket.ticketId,
                status: linkedTicket.status,
                priority: linkedTicket.priority,
                websiteId: linkedTicket.websiteId,
                lastMessagePreview: linkedTicket.lastMessagePreview,
                newNote: agentNoteEntry
              });
            }
          }
        } catch (tktSyncErr) {
          console.error("[AgentMessage] Ticket sync error:", tktSyncErr.message);
        }

        // Run intelligence processing in real-time
        try {
          const intel = await processChatIntelligence(sessionId);
          if (intel) {
            const intelPayload = {
              sessionId,
              sentimentScore: intel.sentimentScore,
              sentimentLabel: intel.sentimentLabel,
              aiSummary: intel.aiSummary
            };
            io.to(session.sessionId).emit("chat:intelligence-updated", intelPayload);
            io.to(`ws_${session.websiteId._id}`).emit("chat:intelligence-updated", intelPayload);
            if (session.assignedAgent) {
              io.to(`us_${session.assignedAgent._id || session.assignedAgent}`).emit("chat:intelligence-updated", intelPayload);
            }
          }
        } catch (intelErr) {
          console.error("Error processing real-time chat intelligence (agent):", intelErr);
        }
      } catch (err) {
        console.error("[AGENT_FATAL]:", err);
      }
    });

    socket.on("agent:close-session", async ({ sessionId }) => {
      const session = await ChatSession.findOne({ sessionId }).populate("websiteId");
      if (!session) return;
      const websiteId = getSessionWebsiteId(session);
      const managerId = getSessionManagerId(session);
      session.status = "closed";
      session.closedAt = new Date();
      await session.save();
      emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email isOnline").populate("assignedAgent", "name email role isOnline"));
      
      await logAuditEvent({
        actor: socket.data.user,
        action: "chat.closed",
        entityType: "chat_session",
        entityId: session._id,
        websiteId,
        metadata: { sessionId }
      });
      
      io.to(session.sessionId).emit("chat:closed", { sessionId });
      broadcastStatsUpdate(io, websiteId, managerId);
      processQueue(io);
      
      // Run intelligence processing on close
      await processChatIntelligence(sessionId);
    });

    socket.on("visitor:close-session", async ({ sessionId }) => {
      const session = await ChatSession.findOne({ sessionId }).populate("websiteId");
      if (!session) return;
      const websiteId = getSessionWebsiteId(session);
      const managerId = getSessionManagerId(session);
      session.status = "closed";
      session.closedAt = new Date();
      await session.save();
      emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email isOnline").populate("assignedAgent", "name email role isOnline"));
      
      io.to(session.sessionId).emit("chat:closed", { sessionId });
      broadcastStatsUpdate(io, websiteId, managerId);
      processQueue(io);

      // Run intelligence processing on close
      await processChatIntelligence(sessionId);
    });

    socket.on("disconnect", async () => {
      // ── Clean up any active/ringing calls associated with this disconnecting socket ──
      for (const [callId, callInfo] of activeVoiceCalls.entries()) {
        const isVisitor = callInfo.visitorSocketId === socket.id || callInfo.visitorSocket?.id === socket.id;
        const isAgent = callInfo.agentSocketId === socket.id || callInfo.agentSocket?.id === socket.id;

        if (isVisitor || isAgent) {
          console.log(`[Sockets] Disconnecting socket ${socket.id} (${isVisitor ? 'visitor' : 'agent'}) had call ${callId}. Broadcasting end/cancel.`);
          if (callInfo.status === "ringing") {
            await handleMissedCall(io, { 
              callId, 
              callInfo, 
              reason: isVisitor ? "Visitor disconnected while waiting for agent" : "Agent disconnected during call" 
            });
          } else if (callInfo.status === "connected") {
            await handleCompletedCall(io, { callId, callInfo });
          }
          activeVoiceCalls.delete(callId);
          const cancelPayload = { callId, sessionId: callInfo.sessionId, cancelled: callInfo.status === "ringing" };
          const rooms = new Set(["us_admin"]);
          if (callId) rooms.add(`call_${callId}`);
          if (callInfo.websiteId) rooms.add(`ws_${callInfo.websiteId}`);
          if (callInfo.managerId) rooms.add(`us_${callInfo.managerId}`);
          if (callInfo.sessionId) {
            rooms.add(callInfo.sessionId);
            if (!callInfo.sessionId.startsWith("session_")) rooms.add(`session_${callInfo.sessionId}`);
          }
          const otherSid = isVisitor ? callInfo.agentSocketId : callInfo.visitorSocketId;
          if (otherSid) rooms.add(otherSid);

          let broadcaster = io;
          for (const r of rooms) {
            broadcaster = broadcaster.to(r);
          }
          if (callInfo.status === "ringing") {
            broadcaster.emit("call:cancelled", cancelPayload);
          }
          broadcaster.emit("call:ended", cancelPayload);
        }
      }

      if (socket.data.type === "visitor") {
        const { website, sessionId, visitorId } = socket.data;
        if (visitorId) {
          try {
            const openSockets = await io.in(`visitor_${visitorId}`).fetchSockets();
            if (openSockets.length === 0) {
              if (website?._id) {
                await Visitor.updateOne({ visitorId, websiteId: website._id }, { $set: { isOnline: false, lastVisitTime: new Date() } }).catch(() => {});
              }
              const offlinePayload = {
                sessionId,
                visitorId,
                isOnline: false,
                lastActiveAt: new Date()
              };
              if (sessionId) {
                io.to(sessionId).emit("visitor:status", offlinePayload);
                io.to(sessionId).emit("visitor:offline", offlinePayload);
              }
              if (website?._id) {
                io.to(`ws_${website._id}`).emit("visitor:status", offlinePayload);
                io.to(`ws_${website._id}`).emit("visitor:offline", offlinePayload);
              }
              if (website?.managerId) {
                io.to(`us_${website.managerId}`).emit("visitor:status", offlinePayload);
                io.to(`us_${website.managerId}`).emit("visitor:offline", offlinePayload);
              }
              io.to("us_admin").emit("visitor:status", offlinePayload);
              io.to("us_admin").emit("visitor:offline", offlinePayload);
            }
          } catch (err) {
            console.error("Visitor disconnect error:", err);
          }
        }
      }
      if (socket.data.user) {
        try {
          const userSockets = await io.in(`us_${socket.data.user._id}`).fetchSockets();
          if (userSockets.length === 0) {
            const u = await User.findById(socket.data.user._id);
            if (u) {
              u.isOnline = false;
              u.lastActiveAt = new Date();
              await u.save();
            }
          }
        } catch (e) {
          console.warn("[Sockets] Error checking user sockets on disconnect:", e.message);
        }
      }
    });
  });

  return io;
}

export function getIo() {
  if (!ioInstance) {
    logger.warn("getIo called but socket.io is not initialized yet");
  }
  return ioInstance;
}
