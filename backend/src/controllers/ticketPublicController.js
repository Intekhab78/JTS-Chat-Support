import { Ticket } from "../models/Ticket.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

export const getTicketByPublicId = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
    .populate("websiteId", "websiteName domain primaryColor")
    .populate("assignedAgent", "name");

  if (!ticket) throw new AppError("Ticket not found", 404);

  res.json({
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    website: ticket.websiteId,
    agent: ticket.assignedAgent ? { name: ticket.assignedAgent.name } : null
  });
});
