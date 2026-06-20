import crypto from "crypto";
import { Ticket } from "../models/Ticket.js";
import { ChatSession } from "../models/ChatSession.js";
import { Website } from "../models/Website.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { buildTicketSlaFields, inferTicketPriority } from "../services/automationService.js";
import {
  buildTicketId,
  pushAssignmentHistory,
  syncSalesOwnerFromTicket,
  ensureSessionTicketAccess,
  buildTicketScopeFilter,
  buildSessionScopeFilter
} from "../utils/ticketUtils.js";
import { createActivityEvent } from "../services/activityService.js";
import { 
  notifyVisitorOfTicketCreation, 
  shareTicketLinkInChat, 
  notifyAssignedAgent, 
  createManagerTicketNotification,
  autoAssignTicket
} from "../services/ticketService.js";
import { getOrCreateCustomer } from "../services/customerService.js";

export const createTicketFromChat = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.TICKET_UPDATE);
  const { sessionId, subject, priority, crmStage } = req.body;
  const session = await ChatSession.findById(sessionId).populate("visitorId").populate("websiteId");
  if (!session) throw new AppError("Session not found", 404);
  if (!(await ensureSessionTicketAccess(session, req.user))) throw new AppError("Access denied", 403);

  const ticket = new Ticket({
    ticketId: buildTicketId(),
    shareToken: crypto.randomBytes(12).toString("hex"),
    websiteId: session.websiteId?._id || session.websiteId,
    visitorId: session.visitorId?._id || null,
    customerId: session.customerId || null,
    crn: session.crn || null,
    assignedAgent: session.assignedAgent || req.user._id,
    subject: subject || "Support Request from Live Chat",
    priority: priority || "medium",
    crmStage: crmStage || "none",
    status: "open",
    lastMessagePreview: session.lastMessagePreview
  });
  
  Object.assign(ticket, buildTicketSlaFields(ticket.priority, new Date()));
  await ticket.save();
  
  await syncSalesOwnerFromTicket(ticket, req.user._id);
  await notifyVisitorOfTicketCreation({ ticket, visitorEmail: session.visitorId?.email, websiteName: session.websiteId?.websiteName });
  await shareTicketLinkInChat({ session, ticket, actor: req.user });
  await notifyAssignedAgent(ticket);
  await createManagerTicketNotification(ticket);

  await createActivityEvent({
    actor: req.user, websiteId: ticket.websiteId, entityType: "ticket", entityId: ticket._id,
    type: "created", summary: `Ticket ${ticket.ticketId} created from chat`
  });

  res.status(201).json(ticket);
});

export const submitVisitorTicket = asyncHandler(async (req, res) => {
  const { apiKey, name, email, subject, message } = req.body;
  const website = await Website.findOne({ apiKey });
  if (!website) throw new AppError("Invalid API Key", 400);

  const ticket = new Ticket({
    ticketId: buildTicketId(),
    shareToken: crypto.randomBytes(12).toString("hex"),
    websiteId: website._id,
    subject: subject || "Offline Inquiry",
    lastMessagePreview: message,
    status: "open",
    priority: "medium",
    channel: "web"
  });

  if (email) {
    const customer = await getOrCreateCustomer({ name, email, websiteId: website._id });
    if (customer) {
      ticket.customerId = customer._id;
      ticket.crn = customer.crn;
    }
  }

  await ticket.save();
  await autoAssignTicket(ticket);
  await notifyVisitorOfTicketCreation({ ticket, visitorEmail: email, websiteName: website.websiteName });
  await notifyAssignedAgent(ticket);
  await createManagerTicketNotification(ticket);

  res.status(201).json({ ticketId: ticket.ticketId, statusUrl: `/ticket-status/${ticket.ticketId}` });
});

export const getVisitorHistory = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ sessionId: req.params.sessionId }).populate("visitorId");
  if (!session) throw new AppError("Session not found", 404);
  const visitorId = session.visitorId?._id;
  if (!visitorId) return res.json({ tickets: [], pastSessions: 0 });

  const ticketScope = await buildTicketScopeFilter(req.user);
  const tickets = await Ticket.find({ visitorId, ...ticketScope }).sort({ createdAt: -1 }).limit(10);
  res.json({ tickets });
});

export const getCustomerHistoryByCRN = asyncHandler(async (req, res) => {
  const { crn } = req.params;
  const ticketScope = await buildTicketScopeFilter(req.user);
  const tickets = await Ticket.find({ crn, ...ticketScope }).sort({ createdAt: -1 });
  res.json({ tickets });
});
