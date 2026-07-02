import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { routeSessionToAgent } from "../services/routingEngine.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const listOmnichannelSessions = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, channel, status, priority, unassigned, search } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
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
  
  if (unassigned === "true") {
    query.assignedAgent = null;
  }

  if (search) {
    query.$or = [
      { sessionId: { $regex: search, $options: "i" } },
      { lastMessagePreview: { $regex: search, $options: "i" } }
    ];
  }

  const sessions = await ChatSession.find(query)
    .populate("customerId", "name email")
    .populate("assignedAgent", "name email")
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
  
  // Calculate SLA due in 4 hours
  const slaDueAt = new Date();
  slaDueAt.setHours(slaDueAt.getHours() + 4);

  const session = await ChatSession.create({
    sessionId,
    websiteId: resolvedWebsiteId,
    visitorId: req.user._id, // mock default
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

  // Attempt routing allocation
  await routeSessionToAgent(session);

  res.status(201).json(session);
});

export const postMessage = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const { sessionId, message, attachmentUrl, attachmentType } = req.body;

  const session = await ChatSession.findById(sessionId);
  if (!session) throw new AppError("ChatSession not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(session.websiteId.toString())) {
    throw new AppError("Unauthorized scope", 403);
  }

  const msg = await Message.create({
    sessionId,
    sender: "agent",
    message,
    agentId: req.user._id,
    channel: session.channel,
    attachmentUrl,
    attachmentType,
    deliveryStatus: "sent"
  });

  session.lastMessageAt = new Date();
  session.lastMessagePreview = message ? message.slice(0, 60) : "Attachment";
  await session.save();

  // Log timeline update
  await logCrmActivity({
    websiteId: session.websiteId,
    type: "visit", // mock message activity
    title: `Reply Sent: ${session.sessionId}`,
    description: `Agent ${req.user.name} sent message via ${session.channel}.`,
    customerId: session.customerId,
    ownerId: req.user._id
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
  // Simple transparent tracking pixel return
  const img = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Content-Length": img.length
  });
  res.end(img);
});
