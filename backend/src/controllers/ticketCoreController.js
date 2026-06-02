import { Ticket } from "../models/Ticket.js";
import { Category } from "../models/Category.js";
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
  syncSalesOwnerFromTicket
} from "../utils/ticketUtils.js";
import { buildTicketSlaFields } from "../services/automationService.js";
import { calculateTicketHeatScore, getTicketNBA } from "../services/intelligenceService.js";
import { normalizeRole } from "../utils/roleUtils.js";
import { notifyAssignedAgent, notifyVisitorOfTicketUpdate } from "../services/ticketService.js";

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

  res.json({ tickets: enrichedTickets });
});

export const updateTicket = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.TICKET_UPDATE);
  const ticket = await findScopedTicketById(req.params.id, req.user);
  if (!ticket) throw new AppError("Ticket not found", 404);

  const { status, priority, category, note, assignedAgent } = req.body;
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
  const { ticketIds, updates } = req.body;
  const result = await Ticket.updateMany({ _id: { $in: ticketIds } }, { $set: updates });
  res.json({ success: true, count: result.modifiedCount });
});

export const bulkDeleteTickets = asyncHandler(async (req, res) => {
  const { ticketIds } = req.body;
  const result = await Ticket.deleteMany({ _id: { $in: ticketIds } });
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
  const activity = await listActivityForEntity({ entityType: "ticket", entityId: req.params.id, limit: 100 });
  res.json(activity);
});
