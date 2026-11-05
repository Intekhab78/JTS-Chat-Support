import { Ticket } from "../models/Ticket.js";
import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getSocketServer } from "../sockets/index.js";
import { createActivityEvent } from "../services/activityService.js";
import { createNotification } from "../services/notificationService.js";

export const getTicketByPublicId = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
    .populate("websiteId", "websiteName domain primaryColor")
    .populate("assignedAgent", "name");

  if (!ticket) throw new AppError("Ticket not found", 404);

  // Expose public notes to visitors
  const publicNotes = (ticket.notes || [])
    .filter(n => n.isPublic)
    .map(n => ({
      content: n.content,
      createdAt: n.createdAt,
      authorName: n.authorName || (n.addedBy ? "Support Agent" : "Customer")
    }));

  res.json({
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    department: ticket.department,
    channel: ticket.channel,
    crn: ticket.crn || null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    website: ticket.websiteId,
    agent: ticket.assignedAgent ? { name: ticket.assignedAgent.name } : null,
    notes: publicNotes
  });
});

export const addPublicTicketNote = asyncHandler(async (req, res) => {
  const { message, senderName } = req.body;
  if (!message || !message.trim()) {
    throw new AppError("Message content is required", 400);
  }

  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
    .populate("websiteId", "websiteName domain primaryColor managerId")
    .populate("assignedAgent", "name email");

  if (!ticket) throw new AppError("Ticket not found", 404);

  const cleanMessage = message.trim();
  const authorName = senderName?.trim() || "Customer";
  const websiteId = ticket.websiteId?._id || ticket.websiteId;

  if (!ticket.notes) ticket.notes = [];
  const noteEntry = {
    content: cleanMessage,
    authorName,
    isPublic: true,
    createdAt: new Date()
  };

  ticket.notes.push(noteEntry);
  ticket.lastMessagePreview = cleanMessage.slice(0, 200);

  // If resolved or closed, a customer reply re-opens it to 'open'
  if (ticket.status === "resolved" || ticket.status === "closed") {
    ticket.status = "open";
  }

  await ticket.save();

  const io = getSocketServer();

  // 1. Log Activity so Ticket Activity & Notes Log displays this interaction
  try {
    await createActivityEvent({
      actor: { _id: ticket.customerId || null, name: authorName, role: "visitor" },
      action: "ticket.note_added",
      entityType: "ticket",
      entityId: ticket._id,
      websiteId: websiteId,
      metadata: {
        ticketId: ticket.ticketId,
        content: cleanMessage,
        isPublic: true,
        authorName
      }
    });
  } catch (actErr) {
    console.error("[TicketPublic] Activity log error:", actErr.message);
  }

  // 2. Real-time broadcast to public subscribers and staff on Ticket Desk
  try {
    if (io) {
      io.to(`ticket:${ticket.ticketId}`).emit("ticket:updated", {
        ticketId: ticket.ticketId,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
        newNote: {
          content: noteEntry.content,
          authorName: noteEntry.authorName,
          createdAt: noteEntry.createdAt
        }
      });

      io.emit("ticket:updated", {
        ticketId: ticket.ticketId,
        status: ticket.status,
        websiteId,
        lastMessagePreview: ticket.lastMessagePreview
      });
    }
  } catch (err) {
    console.error("[TicketPublic] Broadcast error:", err.message);
  }

  // 3. Notify assigned agent and manager
  try {
    const recipientId = ticket.assignedAgent?._id || ticket.websiteId?.managerId;
    if (recipientId) {
      await createNotification({
        recipient: recipientId,
        type: "ticket_reply",
        title: `New Reply on Ticket #${ticket.ticketId}`,
        message: `${authorName}: "${cleanMessage.slice(0, 100)}"`,
        link: `/agent?tab=tickets&search=${ticket.ticketId}`,
        entityType: "ticket",
        entityId: ticket._id
      });
      if (io) {
        io.to(`us_${recipientId}`).emit("notification:new", {
          type: "ticket_reply",
          title: `New Reply on Ticket #${ticket.ticketId}`,
          message: `${authorName}: "${cleanMessage.slice(0, 100)}"`
        });
      }
    }
  } catch (notifErr) {
    console.error("[TicketPublic] Notification error:", notifErr.message);
  }

  // 4. Cross-Channel Sync: If visitor/customer has an active ChatSession, sync this reply into their live chat
  try {
    const activeSession = await ChatSession.findOne({
      websiteId,
      $or: [
        ...(ticket.visitorId ? [{ visitorId: ticket.visitorId }] : []),
        ...(ticket.customerId ? [{ customerId: ticket.customerId }] : [])
      ],
      status: "active"
    }).sort({ updatedAt: -1 });

    if (activeSession) {
      const chatMsg = await Message.create({
        sessionId: activeSession._id,
        sender: "visitor",
        message: `[Ticket #${ticket.ticketId} Note]: ${cleanMessage}`,
        translatedText: `[Ticket #${ticket.ticketId} Note]: ${cleanMessage}`,
        detectedLanguage: "en",
        detectedLanguageName: "English"
      });

      activeSession.lastMessageAt = new Date();
      activeSession.lastMessagePreview = `[Ticket #${ticket.ticketId}]: ${cleanMessage}`;
      activeSession.ticketId = ticket._id;
      await activeSession.save();

      if (io) {
        const msgPayload = {
          _id: chatMsg._id,
          sessionId: activeSession.sessionId,
          sender: "visitor",
          message: chatMsg.message,
          createdAt: chatMsg.createdAt
        };

        // Broadcast to visitor chat widget & staff chat room
        io.to(activeSession.sessionId).emit("chat:message", msgPayload);
        io.to(`ws_${websiteId}`).emit("chat:new-message", msgPayload);
        if (activeSession.assignedAgent) {
          io.to(`us_${activeSession.assignedAgent._id || activeSession.assignedAgent}`).emit("chat:message", msgPayload);
        }
        io.emit("session:updated", {
          sessionId: activeSession.sessionId,
          lastMessage: activeSession.lastMessagePreview,
          lastMessageAt: activeSession.lastMessageAt
        });
      }
    }
  } catch (chatSyncErr) {
    console.error("[TicketPublic] ChatSession sync error:", chatSyncErr.message);
  }

  res.status(201).json({
    success: true,
    message: "Reply added successfully",
    status: ticket.status,
    note: {
      content: noteEntry.content,
      authorName: noteEntry.authorName,
      createdAt: noteEntry.createdAt
    }
  });
});
