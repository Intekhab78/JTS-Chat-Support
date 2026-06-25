import { Ticket } from "../models/Ticket.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

export const getTicketByPublicId = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
    .populate("websiteId", "websiteName domain primaryColor")
    .populate("assignedAgent", "name");

  if (!ticket) throw new AppError("Ticket not found", 404);

  // Only expose public notes (isPublic: true) to visitors
  const publicNotes = (ticket.notes || [])
    .filter(n => n.isPublic)
    .map(n => ({ content: n.content, createdAt: n.createdAt }));

  res.json({
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    department: ticket.department,
    channel: ticket.channel,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    website: ticket.websiteId,
    agent: ticket.assignedAgent ? { name: ticket.assignedAgent.name } : null,
    notes: publicNotes
  });
});
