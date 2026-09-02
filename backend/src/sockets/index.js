import { Server } from "socket.io";
import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
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

let ioInstance = null;

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
        emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email").populate("assignedAgent", "name email role isOnline"));

        io.to(session.sessionId).emit("chat:assigned", {
          sessionId: session.sessionId,
          agentName: agent.name
        });
        io.to(`us_${agent._id}`).emit("chat:assigned", { sessionId: session.sessionId });
        
        try {
          io.emit("chat:assigned", {
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
    transports: ["polling", "websocket"],
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

      return next(new Error("Unauthorized socket connection"));
    } catch (error) {
      return next(error);
    }
  });

  io.on("connection", async (socket) => {
    if (socket.data.type === "visitor") {
      const { website, sessionId, visitorId } = socket.data;
      socket.join(`ws_${website._id}`);
      // Join personal visitor room for direct delivery
      if (visitorId) {
        socket.join(`visitor_${visitorId}`);
      }
      if (sessionId) {
        socket.join(sessionId);
        io.to(sessionId).emit("visitor:status", {
          sessionId,
          isOnline: true,
          lastActiveAt: new Date()
        });
      }
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
      await user.save();
      processQueue(io);
    }

    socket.on("agent:join-session", async ({ sessionId }) => {
      const NON_SESSION_PREFIXES = ["ws_", "us_", "visitor_", "lead_"];
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

    socket.on("agent:take-over-chat", async ({ sessionId }) => {
      try {
        const { user } = socket.data;
        if (!user) return;
        const session = await ChatSession.findOne({ sessionId });
        if (!session) return;

        session.assignedAgent = user._id;
        session.status = "active";
        session.acceptedAt = new Date();
        await session.save();

        const populated = await ChatSession.findById(session._id)
          .populate("websiteId", "websiteName domain managerId")
          .populate("visitorId", "visitorId name email")
          .populate("assignedAgent", "name email role isOnline");

        emitSessionUpdate(populated);
        io.to(sessionId).emit("chat:assigned", { sessionId, agentName: user.name });
        
        await logAuditEvent({
          actor: user,
          action: "chat.taken_over",
          entityType: "chat_session",
          entityId: session._id,
          websiteId: session.websiteId,
          metadata: { sessionId }
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
          .populate("visitorId", "visitorId name email")
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
      const NON_SESSION_PREFIXES = ["ws_", "us_", "visitor_", "lead_"];
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

    socket.on("visitor:join-room", ({ sessionId }) => {
      socket.join(sessionId);
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

    socket.on("visitor:typing", ({ sessionId, isTyping }) => {
      socket.to(sessionId).emit("chat:typing", { isTyping, sender: "visitor" });
    });

    socket.on("agent:typing", ({ sessionId, isTyping }) => {
      socket.to(sessionId).emit("chat:typing", { 
        isTyping, 
        sender: "agent",
        agentId: socket.data.user?._id,
        agentName: socket.data.user?.name
      });
    });

    
    socket.on("visitor:bot-prompt", async ({ sessionId, message, nodeKey }) => {
      try {
        const { website } = socket.data;
        if (!website || !message?.trim()) return;

        const session = await ChatSession.findOne({ sessionId }).populate("websiteId");
        if (!session) return;

        const existingPrompt = await Message.findOne({
          sessionId: session._id,
          sender: "agent",
          message: message.trim()
        });
        if (existingPrompt) return;

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

        if (!session.assignedAgent && (session.botStatus === "escalated" || !session.websiteId?.botEnabled)) {
          const agent = await findAvailableAgent({ managerId: session.websiteId.managerId, websiteId: session.websiteId._id });
          if (agent && !await hasReachedActiveChatLimit(agent._id)) {
            session.assignedAgent = agent._id;
            session.status = "active";
            session.acceptedAt = new Date();
            await session.save();
            emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email").populate("assignedAgent", "name email role isOnline"));
            io.to(`us_${agent._id}`).emit("chat:assigned", { sessionId: session.sessionId });
            io.to(session.sessionId).emit("chat:assigned", { sessionId: session.sessionId, agentName: agent.name });
            
            try {
              io.emit("chat:assigned", {
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
        io.to(`ws_${session.websiteId._id}`).emit("chat:new-message", payload);
        broadcastStatsUpdate(io, session.websiteId._id, session.websiteId.managerId);

        if (session.assignedAgent) {
          io.to(`us_${session.assignedAgent._id || session.assignedAgent}`).emit("chat:message", payload);
        }

        // If no human live agent is assigned, generate real-time AI response using Google Gemini
        if (!session.assignedAgent && message?.trim()) {
          try {
            const { AiProviderManager } = await import("../services/aiProviderManager.js");
            const aiProvider = AiProviderManager.getProvider("gemini");
            const websiteObj = await Website.findById(session.websiteId);

            const aiResult = await aiProvider.generateCompletion({
              prompt: `You are a helpful AI customer support assistant for ${websiteObj?.websiteName || "our company"}. Visitor message: "${message}". Reply concisely and politely.`,
              temperature: 0.7,
              maxTokens: 300
            });

            if (aiResult?.text) {
              const aiSaved = await addMessage({
                chatSession: session,
                sender: "agent",
                message: aiResult.text,
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
              io.to(`ws_${session.websiteId._id || session.websiteId}`).emit("chat:new-message", aiPayload);
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
        emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email").populate("assignedAgent", "name email role isOnline"));

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

        socket.emit("chat:message", payload);
        // Use io.to() (not socket.broadcast) so visitor socket also receives the message
        io.to(session.sessionId).emit("chat:message", payload);
        // Also emit directly to the visitorId room for extra reliability
        if (session.visitorId) {
          io.to(`visitor_${session.visitorId._id || session.visitorId}`).emit("chat:message", payload);
        }
        io.to(`ws_${session.websiteId._id}`).emit("chat:new-message", payload);
        broadcastStatsUpdate(io, session.websiteId._id, session.websiteId.managerId);

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
      emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email").populate("assignedAgent", "name email role isOnline"));
      
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
      emitSessionUpdate(await ChatSession.findById(session._id).populate("websiteId", "websiteName domain managerId").populate("visitorId", "visitorId name email").populate("assignedAgent", "name email role isOnline"));
      
      io.to(session.sessionId).emit("chat:closed", { sessionId });
      broadcastStatsUpdate(io, websiteId, managerId);
      processQueue(io);

      // Run intelligence processing on close
      await processChatIntelligence(sessionId);
    });

    socket.on("disconnect", async () => {
      if (socket.data.type === "visitor" && socket.data.sessionId) {
        io.to(socket.data.sessionId).emit("visitor:status", { sessionId: socket.data.sessionId, isOnline: false, lastActiveAt: new Date() });
      }
      if (socket.data.user) {
        const u = await User.findById(socket.data.user._id);
        if (u) {
          u.isOnline = false;
          u.lastActiveAt = new Date();
          await u.save();
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
