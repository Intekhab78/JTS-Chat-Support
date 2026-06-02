import crypto from "crypto";
import { Ticket } from "../models/Ticket.js";
import { ChatSession } from "../models/ChatSession.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { sendEmail } from "./emailService.js";
import { createNotification } from "./notificationService.js";
import { dispatchWebsiteWebhook } from "./webhookService.js";
import { addMessage } from "./chatService.js";
import { ticketCreatedTemplate, ticketUpdatedTemplate } from "../utils/emailTemplates.js";
import { env } from "../config/env.js";
import { findAvailableAgent } from "./assignmentService.js";
import { buildTicketSlaFields, inferTicketPriority } from "./automationService.js";
import { getSocketServer } from "../sockets/index.js";
import { buildTicketId, pushAssignmentHistory, syncSalesOwnerFromTicket } from "../utils/ticketUtils.js";

export async function notifyAssignedAgent(ticket, previousAssignedAgentId = null) {
  if (!ticket.assignedAgent) return;
  const agent = await User.findById(ticket.assignedAgent).select("name email");
  if (!agent) return;
  if (previousAssignedAgentId && String(previousAssignedAgentId) === String(agent._id)) return;

  await createNotification({
    recipient: agent._id,
    type: "new_ticket",
    title: "Ticket assigned to you",
    message: `${ticket.ticketId} has been assigned to you.`,
    link: "/client?tab=tickets",
    entityType: "ticket",
    entityId: ticket._id,
    metadata: { ticketId: ticket.ticketId }
  });
}

export async function notifyVisitorOfTicketCreation({ ticket, visitorEmail, websiteName }) {
  if (!visitorEmail) return;
  const statusUrl = `${env.clientUrl}/ticket-status/${ticket.ticketId}`;
  const { html, subject } = ticketCreatedTemplate({
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    statusUrl,
    priority: ticket.priority,
    websiteName: websiteName || "Support"
  });
  await sendEmail({ to: visitorEmail, subject, html });
}

export async function notifyVisitorOfTicketUpdate({ ticket, status, prevStatus, note }) {
  const visitor = await Ticket.findById(ticket._id).populate("visitorId", "email");
  const visitorEmail = visitor?.visitorId?.email;
  if (!visitorEmail || !status || status === prevStatus) return;

  const statusUrl = `${env.clientUrl}/ticket-status/${ticket.ticketId}`;
  const agent = ticket.assignedAgent ? await User.findById(ticket.assignedAgent).select("name") : null;
  const { html, subject } = ticketUpdatedTemplate({
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    status,
    statusUrl,
    agentName: agent?.name,
    note
  });
  await sendEmail({ to: visitorEmail, subject, html });
}

export async function createManagerTicketNotification(ticket) {
  const website = await Website.findById(ticket.websiteId).select("managerId");
  if (!website?.managerId) return;
  await createNotification({
    recipient: website.managerId,
    type: "new_ticket",
    title: "New ticket created",
    message: `${ticket.ticketId} was created: ${ticket.subject}`,
    link: "/client?tab=tickets"
  });
}

export async function createTicketFromOfflineSession(session, { reason = "offline_message_timeout" } = {}) {
  if (!session || session.offlineTicketGeneratedAt) return null;

  const populatedSession = await session.populate([
    { path: "visitorId", select: "name email visitorId" },
    { path: "websiteId", select: "websiteName domain managerId" }
  ]);

  const websiteId = populatedSession.websiteId?._id || populatedSession.websiteId;
  const managerId = populatedSession.websiteId?.managerId || null;
  const visitor = populatedSession.visitorId || null;
  const autoAssignedAgent = managerId
    ? await findAvailableAgent({
        managerId,
        websiteId,
        category: "general",
        roles: ["agent", "sales", "user"]
      })
    : null;

  const ticket = new Ticket({
    ticketId: buildTicketId(),
    shareToken: crypto.randomBytes(12).toString("hex"),
    websiteId,
    visitorId: visitor?._id || visitor || null,
    customerId: populatedSession.customerId || null,
    crn: populatedSession.crn || null,
    assignedAgent: autoAssignedAgent?._id || null,
    subject: `Offline message follow-up${populatedSession.websiteId?.websiteName ? ` - ${populatedSession.websiteId.websiteName}` : ""}`,
    priority: inferTicketPriority({
      subject: populatedSession.lastMessagePreview || "Offline message follow-up",
      note: populatedSession.lastMessagePreview || ""
    }),
    status: "open",
    lastMessagePreview: populatedSession.lastMessagePreview || "",
    channel: "web",
    department: "general"
  });
  Object.assign(ticket, buildTicketSlaFields(ticket.priority, new Date()));

  if (ticket.assignedAgent) {
    pushAssignmentHistory(ticket, {
      assignedAgentId: ticket.assignedAgent,
      assignedBy: null,
      reason: "offline_timeout_auto_assignment"
    });
  }

  await ticket.save();
  await syncSalesOwnerFromTicket(ticket, null, "offline_timeout_auto_assignment");
  await notifyAssignedAgent(ticket);
  await createManagerTicketNotification(ticket);
  await dispatchWebsiteWebhook(ticket.websiteId, "ticket.created", {
    ticketId: ticket.ticketId,
    status: ticket.status,
    subject: ticket.subject,
    channel: ticket.channel,
    source: reason
  });

  return ticket;
}

export async function shareTicketLinkInChat({ session, ticket, actor }) {
  if (!session?._id || !ticket?.ticketId) return;

  const statusUrl = `${env.clientUrl}/ticket-status/${ticket.ticketId}`;
  const messageText = `Your support ticket has been created. You can track it here: ${statusUrl}`;
  const saved = await addMessage({
    chatSession: session,
    sender: "agent",
    message: messageText,
    agentId: actor?._id || null
  });

  const payload = {
    _id: saved._id,
    sessionId: session.sessionId,
    message: saved.message,
    sender: "agent",
    senderName: actor?.name || "Support",
    createdAt: saved.createdAt,
    agentId: actor?._id || null
  };

  const io = getSocketServer();
  if (io) {
    io.to(session.sessionId).emit("chat:message", payload);
  }
}
