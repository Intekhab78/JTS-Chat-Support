import { Ticket } from "../models/Ticket.js";
import { Category } from "../models/Category.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { createActivityEvent, listActivityForEntity } from "../services/activityService.js";
import { logAuditEvent } from "../services/auditService.js";
import {
  buildTicketScopeFilter,
  findScopedTicketById,
  ticketToCsvRow,
  normalizeDepartment,
  pushAssignmentHistory,
  syncSalesOwnerFromTicket,
  mapTicketCrmStageToPipelineStage
} from "../utils/ticketUtils.js";
import { deriveLifecycleFields } from "../utils/crmUtils.js";
import { buildTicketSlaFields } from "../services/automationService.js";
import { calculateTicketHeatScore, getTicketNBA } from "../services/intelligenceService.js";
import { normalizeRole } from "../utils/roleUtils.js";
import { notifyAssignedAgent, notifyVisitorOfTicketUpdate } from "../services/ticketService.js";
import { getSocketServer } from "../sockets/index.js";

export const getTickets = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.TICKET_VIEW);
  const { websiteId, status, priority, crmStage, crn, channel, range = "all" } = req.query;
  const filter = await buildTicketScopeFilter(req.user);

  if (websiteId) filter.websiteId = websiteId;
  if (status && status !== "all") filter.status = status;
  if (priority && priority !== "all") filter.priority = priority;
  if (channel && channel !== "all") filter.channel = channel;
  if (crn) filter.crn = crn;

  const tickets = await Ticket.find(filter)
    .populate("visitorId", "name email")
    .populate("customerId", "name email crn")
    .populate("assignedAgent", "name email")
    .populate("websiteId", "websiteName domain")
    .sort({ createdAt: -1 });

  const enrichedTickets = await Promise.all(tickets.map(async (t) => {
    const doc = t.toObject();
    doc.heatScore = calculateTicketHeatScore(doc);
    doc.nbaMetadata = await getTicketNBA(doc);
    return doc;
  }));

  const summary = {
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    waiting: tickets.filter(t => t.status === "waiting").length,
    pending: tickets.filter(t => t.status === "pending").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    closed: tickets.filter(t => t.status === "closed").length,
  };

  res.json({ tickets: enrichedTickets, summary });
});

export const getTicketById = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.TICKET_VIEW);
  const ticket = await findScopedTicketById(req.params.id, req.user);
  if (!ticket) throw new AppError("Ticket not found", 404);

  const doc = ticket.toObject();
  doc.heatScore = calculateTicketHeatScore(doc);
  doc.nbaMetadata = await getTicketNBA(doc);

  // Attach chat session messages if session exists
  let messages = [];
  if (ticket.visitorId) {
    const { ChatSession } = await import("../models/ChatSession.js");
    const { Message } = await import("../models/Message.js");
    const session = await ChatSession.findOne({ visitorId: ticket.visitorId, websiteId: ticket.websiteId })
      .sort({ createdAt: -1 });
    if (session) {
      messages = await Message.find({ sessionId: session._id })
        .sort({ createdAt: 1 })
        .select("role content createdAt senderName fileUrl fileType");
      doc.sessionId = session.sessionId;
    }
  }

  res.json({ ticket: doc, messages });
});

export const updateTicket = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.TICKET_UPDATE);
  const ticket = await findScopedTicketById(req.params.id, req.user);
  if (!ticket) throw new AppError("Ticket not found", 404);

  const { status, priority, category, note, assignedAgent, crmStage } = req.body;
  const prevStatus = ticket.status;
  const prevAssignedAgent = ticket.assignedAgent;

  if (status) ticket.status = status;
  if (priority) {
    ticket.priority = priority;
    Object.assign(ticket, buildTicketSlaFields(priority, ticket.createdAt));
  }
  if (assignedAgent !== undefined) {
    ticket.assignedAgent = assignedAgent;
    pushAssignmentHistory(ticket, { assignedAgentId: assignedAgent, assignedBy: req.user._id, reason: "manual_update" });
  }
  if (category !== undefined) ticket.category = category;
  if (crmStage !== undefined) {
    ticket.crmStage = crmStage;
    const pipelineStage = mapTicketCrmStageToPipelineStage(crmStage);
    if (pipelineStage) {
      const crmFields = deriveLifecycleFields({ pipelineStage });
      let customer = null;
      if (ticket.customerId) {
        customer = await Customer.findById(ticket.customerId);
      } else if (ticket.crn) {
        customer = await Customer.findOne({ crn: ticket.crn, websiteId: ticket.websiteId });
      }
      if (customer) {
        Object.assign(customer, crmFields);
        customer.lastActivity = new Date();
        if (!customer.stageHistory) customer.stageHistory = [];
        customer.stageHistory.push({
          fromStage: customer.status || "new",
          toStage: pipelineStage,
          changedBy: req.user._id,
          changedAt: new Date(),
          reason: `Auto-synced from ticket update (${ticket.ticketId})`
        });
        await customer.save();
        
        try {
          const io = getSocketServer();
          if (io) {
            io.emit("lead:created", {
              message: `Lead status updated to ${pipelineStage}`,
              user: customer.name,
              customerId: customer._id,
              websiteId: ticket.websiteId,
              recordType: customer.recordType
            });
          }
        } catch (err) {}
      }
    }
  }
  if (note) {
    if (!ticket.notes) ticket.notes = [];
    ticket.notes.push({ content: note, addedBy: req.user._id, createdAt: new Date(), isPublic: req.body.noteIsPublic !== false });
  }

  await ticket.save();
  await syncSalesOwnerFromTicket(ticket, req.user._id);
  await notifyAssignedAgent(ticket, prevAssignedAgent);
  await notifyVisitorOfTicketUpdate({
    ticket,
    status: status || ticket.status,
    prevStatus,
    note: note && req.body.noteIsPublic !== false ? note : null
  });

  try {
    if (status === "resolved" && prevStatus !== "resolved") {
      getSocketServer().emit("ticket:resolved", {
        message: `Ticket #${ticket._id.toString().slice(-6)} was resolved`,
        user: req.user.name
      });
    }
  } catch (err) {
    console.error("Socket emit failed", err);
  }

  res.json(ticket);
});

export const deleteTicket = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.user.role);
  if (!["admin", "client", "manager"].includes(role)) throw new AppError("Only managers can delete tickets", 403);
  const ticket = await findScopedTicketById(req.params.id, req.user);
  if (!ticket) throw new AppError("Ticket not found", 404);
  await ticket.deleteOne();
  res.json({ success: true });
});

export const bulkUpdateTickets = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.TICKET_UPDATE);
  const { ticketIds, updates } = req.body;
  const filter = await buildTicketScopeFilter(req.user);
  const result = await Ticket.updateMany({ _id: { $in: ticketIds }, ...filter }, { $set: updates });
  res.json({ success: true, count: result.modifiedCount });
});

export const bulkDeleteTickets = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.user.role);
  if (!["admin", "client", "manager"].includes(role)) throw new AppError("Only managers can delete tickets", 403);
  const { ticketIds } = req.body;
  const filter = await buildTicketScopeFilter(req.user);
  const result = await Ticket.deleteMany({ _id: { $in: ticketIds }, ...filter });
  res.json({ success: true, count: result.deletedCount });
});

export const exportTickets = asyncHandler(async (req, res) => {
  const filter = await buildTicketScopeFilter(req.user);
  const tickets = await Ticket.find(filter).populate("websiteId visitorId assignedAgent");
  const header = "Ticket ID,Subject,Status,Priority,CRM Stage,Website,Visitor Name,Visitor Email,Assigned Agent,Assigned At,Created At,Updated At";
  const csv = [header, ...tickets.map(ticketToCsvRow)].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="tickets-export.csv"');
  res.send(csv);
});

export const getTicketActivity = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.ACTIVITY_VIEW);
  const ticket = await findScopedTicketById(req.params.id, req.user);
  if (!ticket) throw new AppError("Ticket not found", 404);
  const activity = await listActivityForEntity({ entityType: "ticket", entityId: req.params.id, limit: 100 });
  res.json(activity);
});
