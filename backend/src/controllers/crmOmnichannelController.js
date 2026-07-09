import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { routeSessionToAgent } from "../services/routingEngine.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import * as communicationHubService from "../services/communicationHubService.js";

export const listOmnichannelSessions = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, channel, status, priority, unassigned, search } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = { isMerged: { $ne: true } }; // Hide merged conversations
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (channel) query.channel = channel;
  if (status) query.status = status;
  if (priority) query.priority = priority;

  // -- Enforce RBAC Rules --
  if (req.user.role === "sales") {
    // Sales can only view their own conversations
    query.assignedAgent = req.user._id;
  } else if (req.user.role === "agent" || req.user.role === "support") {
    // Support/Agent can only view their own or unassigned conversations
    if (unassigned === "true") {
      query.assignedAgent = null;
    } else {
      query.$or = [
        { assignedAgent: req.user._id },
        { assignedAgent: null }
      ];
    }
  } else {
    // Manager/Admin can view everything
    if (unassigned === "true") {
      query.assignedAgent = null;
    }
  }

  if (search) {
    query.$or = [
      { sessionId: { $regex: search, $options: "i" } },
      { lastMessagePreview: { $regex: search, $options: "i" } }
    ];
  }

  const sessions = await ChatSession.find(query)
    .populate("customerId", "name email phone facebookId instagramId customFields")
    .populate("assignedAgent", "name email role isOnline")
    .sort({ lastMessageAt: -1, isPinned: -1 });

  res.json(sessions);
});

export const createOmnichannelSession = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, channel, department, tags, messageText } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized website scope", 403);
  }

  const sessionId = `${channel ? channel.toUpperCase() : "CHAT"}-${Date.now().toString().slice(-6)}`;
  const slaDueAt = new Date();
  slaDueAt.setHours(slaDueAt.getHours() + 4);

  const session = await ChatSession.create({
    sessionId,
    websiteId: resolvedWebsiteId,
    visitorId: req.user._id,
    customerId,
    channel: channel || "chat",
    department: department || "general",
    tags: tags || [],
    slaDueAt,
    lastMessagePreview: messageText || "Conversation started",
    lastMessageAt: new Date(),
    status: "queued"
  });

  if (messageText) {
    await Message.create({
      sessionId: session._id,
      sender: "visitor",
      message: messageText,
      channel: channel || "chat"
    });
  }

  await routeSessionToAgent(session);
  res.status(201).json(session);
});

export const postMessage = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const { sessionId, message, attachmentUrl, attachmentType } = req.body;

  // Delegate reply to communicationHubService to route and send it externally
  const msg = await communicationHubService.sendMessage({
    sessionId,
    message,
    attachmentUrl,
    attachmentType,
    actorId: req.user._id
  });

  res.status(201).json(msg);
});

export const getSessionMessages = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const session = await ChatSession.findById(req.params.sessionId);
  if (!session) throw new AppError("Session not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(session.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });
  res.json(messages);
});

export const assignSession = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { agentId } = req.body;
  const session = await ChatSession.findById(req.params.id);
  if (!session) throw new AppError("Conversation not found", 404);

  const previousAgent = session.assignedAgent;
  session.assignedAgent = agentId || null;
  session.status = agentId ? "active" : "queued";
  
  if (previousAgent !== session.assignedAgent) {
    session.transferHistory.push({
      fromAgentId: previousAgent,
      toAgentId: session.assignedAgent,
      reason: "Manual Assignment",
      note: "Assigned via Unified Inbox UI",
      transferredAt: new Date()
    });
  }
  await session.save();

  // Log timeline activity
  const agentUser = agentId ? await User.findById(agentId) : null;
  await logCrmActivity({
    websiteId: session.websiteId,
    type: "note",
    title: "Conversation Reassigned",
    description: agentUser ? `Conversation assigned to ${agentUser.name}.` : "Conversation unassigned.",
    customerId: session.customerId,
    ownerId: req.user._id
  });

  res.json(session);
});

export const updateSessionPriority = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { priority } = req.body;
  if (!["low", "medium", "high", "urgent"].includes(priority)) {
    throw new AppError("Invalid priority value", 400);
  }

  const session = await ChatSession.findByIdAndUpdate(
    req.params.id,
    { priority },
    { new: true }
  );
  res.json(session);
});

export const updateSessionLabels = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { labels } = req.body;
  if (!Array.isArray(labels)) {
    throw new AppError("Labels must be an array of strings", 400);
  }

  const session = await ChatSession.findByIdAndUpdate(
    req.params.id,
    { labels },
    { new: true }
  );
  res.json(session);
});

export const mergeSessions = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { targetSessionId } = req.body;
  const updatedTarget = await communicationHubService.mergeConversations(
    req.params.id,
    targetSessionId,
    req.user._id
  );
  res.json(updatedTarget);
});

export const updateAgentStatus = asyncHandler(async (req, res) => {
  const { agentStatus } = req.body;
  if (!["online", "offline", "busy", "break", "away"].includes(agentStatus)) {
    throw new AppError("Invalid status value", 400);
  }

  req.user.agentStatus = agentStatus;
  req.user.isAvailable = agentStatus === "online";
  await req.user.save();

  res.json({ success: true, agentStatus: req.user.agentStatus });
});

export const trackOpen = asyncHandler(async (req, res) => {
  const img = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Content-Length": img.length
  });
  res.end(img);
});
