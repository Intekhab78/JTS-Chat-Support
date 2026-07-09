import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";
import { WhatsAppProviderManager } from "./providers/whatsappProvider.js";
import { SMSProviderManager } from "./providers/smsProvider.js";
import { FacebookProviderManager } from "./providers/facebookProvider.js";
import { InstagramProviderManager } from "./providers/instagramProvider.js";
import { sendEmail } from "./emailService.js";
import { getSocketServer, emitSessionUpdate } from "../sockets/index.js";
import { logCrmActivity } from "./activityLoggerService.js";
import AppError from "../utils/AppError.js";

// Decouple channels using provider adapters
const getProviderForChannel = (channel) => {
  switch (channel) {
    case "whatsapp":
      return WhatsAppProviderManager.getProvider("meta");
    case "sms":
      return SMSProviderManager.getProvider("twilio");
    case "facebook":
      return FacebookProviderManager.getProvider("meta");
    case "instagram":
      return InstagramProviderManager.getProvider("meta");
    default:
      return null;
  }
};

export const sendMessage = async ({ sessionId, message, attachmentUrl = null, attachmentType = null, actorId }) => {
  const session = await ChatSession.findById(sessionId).populate("customerId");
  if (!session) {
    throw new AppError("Conversation session not found", 404);
  }

  // Create local message record in database in "sent" state
  const msg = await Message.create({
    sessionId: session._id,
    sender: "agent",
    message,
    agentId: actorId,
    channel: session.channel,
    attachmentUrl,
    attachmentType,
    deliveryStatus: "sent"
  });

  // Update session timestamps
  session.lastMessageAt = new Date();
  session.lastMessagePreview = message ? message.slice(0, 60) : "Attachment";
  await session.save();

  // Dispatch message via external channel providers
  const provider = getProviderForChannel(session.channel);
  if (provider) {
    let toValue = "";
    if (session.customerId) {
      if (session.channel === "whatsapp" || session.channel === "sms") {
        toValue = session.customerId.phone || "";
      } else if (session.channel === "facebook") {
        toValue = session.customerId.customFields?.get("facebookId") || session.customerId.facebookId || "";
      } else if (session.channel === "instagram") {
        toValue = session.customerId.customFields?.get("instagramId") || session.customerId.instagramId || "";
      }
    }

    try {
      let result;
      if (session.channel === "whatsapp") {
        result = await provider.sendMessage({ to: toValue, message, mediaUrl: attachmentUrl });
      } else if (session.channel === "sms") {
        result = await provider.sendSMS({ to: toValue, body: message });
      } else {
        result = await provider.sendMessage({ to: toValue, message, mediaUrl: attachmentUrl });
      }

      if (result && result.success) {
        msg.providerMessageId = result.messageId;
        msg.deliveryStatus = result.status || "sent";
        await msg.save();
      } else {
        msg.deliveryStatus = "failed";
        await msg.save();
      }
    } catch (err) {
      console.error(`[Outbound Channel Error] Failed to send via ${session.channel}:`, err);
      msg.deliveryStatus = "failed";
      await msg.save();
    }
  } else if (session.channel === "email" && session.customerId?.email) {
    try {
      const emailResult = await sendEmail({
        to: session.customerId.email,
        subject: `Update regarding JTS Session #${session.sessionId}`,
        html: `<p>${message}</p>${attachmentUrl ? `<p><a href="${attachmentUrl}">View Attachment</a></p>` : ""}`
      });
      if (emailResult) {
        msg.providerMessageId = emailResult.messageId;
        msg.deliveryStatus = "delivered";
        await msg.save();
      } else {
        msg.deliveryStatus = "failed";
        await msg.save();
      }
    } catch (err) {
      console.error("[Outbound Channel Error] Failed to send email:", err);
      msg.deliveryStatus = "failed";
      await msg.save();
    }
  }

  // Log to Customer 360 Timeline
  await logCrmActivity({
    websiteId: session.websiteId,
    type: "chat",
    title: `Agent Reply Sent (${session.channel.toUpperCase()})`,
    description: message || "Attachment sent",
    customerId: session.customerId?._id || null,
    ownerId: actorId
  });

  // Emit WebSocket update to active agents
  const io = getSocketServer();
  if (io) {
    const payload = {
      _id: msg._id,
      sessionId: session._id,
      sender: "agent",
      message,
      agentId: actorId,
      channel: session.channel,
      attachmentUrl,
      attachmentType,
      deliveryStatus: msg.deliveryStatus,
      createdAt: msg.createdAt
    };
    io.to(session.sessionId).emit("chat:message", payload);
    io.to(`ws_${session.websiteId}`).emit("chat:new-message", payload);
  }

  emitSessionUpdate(session);

  return msg;
};

export const receiveIncomingMessage = async ({ websiteId, channel, from, text, providerMessageId = null, attachmentUrl = null, attachmentType = null }) => {
  let query = {};
  if (channel === "email") {
    query = { email: from };
  } else if (channel === "whatsapp" || channel === "sms") {
    query = { phone: from };
  } else if (channel === "facebook") {
    query = { "metadata.facebookId": from };
  } else if (channel === "instagram") {
    query = { "metadata.instagramId": from };
  }

  let customer = await Customer.findOne(query);
  if (!customer) {
    const metadata = new Map();
    if (channel === "facebook") {
      metadata.set("facebookId", from);
    } else if (channel === "instagram") {
      metadata.set("instagramId", from);
    }

    customer = await Customer.create({
      websiteId,
      name: `Omnichannel Contact (${from.slice(-6)})`,
      email: channel === "email" ? from : `${from.replace(/\s+/g, "")}@omnichannel.jts.com`,
      phone: (channel === "whatsapp" || channel === "sms") ? from : "",
      metadata,
      crn: "CUSTOMER",
      pipelineStage: "new"
    });
  }

  // 2. Find or create active ChatSession
  let session = await ChatSession.findOne({
    websiteId,
    customerId: customer._id,
    channel,
    status: { $ne: "closed" },
    isMerged: { $ne: true }
  });

  if (!session) {
    const sessionId = `${channel.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const slaDueAt = new Date();
    slaDueAt.setHours(slaDueAt.getHours() + 4);

    session = await ChatSession.create({
      sessionId,
      websiteId,
      visitorId: customer._id, // fallback mapping
      customerId: customer._id,
      channel,
      slaDueAt,
      status: "active",
      unreadCount: 1,
      lastMessageAt: new Date(),
      lastMessagePreview: text ? text.slice(0, 60) : "Attachment received"
    });
  } else {
    session.unreadCount = (session.unreadCount || 0) + 1;
    session.lastMessageAt = new Date();
    session.lastMessagePreview = text ? text.slice(0, 60) : "Attachment received";
    await session.save();
  }

  // 3. Save incoming message
  const msg = await Message.create({
    sessionId: session._id,
    sender: "visitor",
    message: text,
    channel,
    attachmentUrl,
    attachmentType,
    providerMessageId,
    deliveryStatus: "delivered"
  });

  // Log Timeline
  await logCrmActivity({
    websiteId,
    type: "chat",
    title: `Incoming Communication (${channel.toUpperCase()})`,
    description: text || "Attachment received",
    customerId: customer._id
  });

  // Dispatch Socket event
  const io = getSocketServer();
  if (io) {
    const payload = {
      _id: msg._id,
      sessionId: session._id,
      sender: "visitor",
      message: text,
      channel,
      attachmentUrl,
      attachmentType,
      deliveryStatus: "delivered",
      createdAt: msg.createdAt
    };
    io.to(session.sessionId).emit("chat:message", payload);
    io.to(`ws_${websiteId}`).emit("chat:new-message", payload);
  }

  emitSessionUpdate(session);

  return { session, message: msg };
};

export const updateMessageStatus = async (providerMessageId, status) => {
  const msg = await Message.findOne({ providerMessageId });
  if (!msg) return null;

  msg.deliveryStatus = status;
  if (status === "delivered") msg.deliveredAt = new Date();
  if (status === "read") msg.readAt = new Date();
  await msg.save();

  // Notify UI
  const io = getSocketServer();
  if (io) {
    io.emit("message:status-updated", {
      messageId: msg._id,
      providerMessageId,
      status,
      deliveredAt: msg.deliveredAt,
      readAt: msg.readAt
    });
  }

  return msg;
};

export const mergeConversations = async (sourceSessionId, targetSessionId, actorId) => {
  const [source, target] = await Promise.all([
    ChatSession.findById(sourceSessionId),
    ChatSession.findById(targetSessionId)
  ]);

  if (!source || !target) {
    throw new AppError("One or both conversations do not exist", 404);
  }

  if (String(source._id) === String(target._id)) {
    throw new AppError("Cannot merge a conversation into itself", 400);
  }

  // 1. Move all messages to target session
  await Message.updateMany(
    { sessionId: source._id },
    { sessionId: target._id }
  );

  // 2. Mark source session as merged & closed
  source.isMerged = true;
  source.mergedIntoId = target._id;
  source.status = "closed";
  await source.save();

  // 3. Update target session last preview
  const lastMsg = await Message.findOne({ sessionId: target._id }).sort({ createdAt: -1 });
  if (lastMsg) {
    target.lastMessageAt = lastMsg.createdAt;
    target.lastMessagePreview = lastMsg.message ? lastMsg.message.slice(0, 60) : "Attachment";
    await target.save();
  }

  // 4. Log audit log crm activity
  await logCrmActivity({
    websiteId: target.websiteId,
    type: "note",
    title: "Conversations Merged",
    description: `Conversation thread ${source.sessionId} was merged into ${target.sessionId}.`,
    customerId: target.customerId,
    ownerId: actorId
  });

  emitSessionUpdate(source);
  emitSessionUpdate(target);

  return target;
};
