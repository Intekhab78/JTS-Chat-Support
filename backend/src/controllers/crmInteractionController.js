import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Visitor } from "../models/Visitor.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { emitCustomerActivity, buildCustomerPayload, createAndEmitCrmNotification } from "../utils/crmUtils.js";
import { logAuditEvent } from "../services/auditService.js";
import { sendEmail } from "../services/emailService.js";
import { salesOutreachTemplate } from "../utils/emailTemplates.js";
import { listActivityForEntity } from "../services/activityService.js";
import { ChatSession } from "../models/ChatSession.js";

export const addCustomerNote = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { text, content, type = "note" } = req.body;
  const noteText = content || text;
  if (!noteText) throw new AppError("Note text is required", 400);

  const customer = await Customer.findById(req.params.id);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) throw new AppError("Access denied", 403);

  customer.internalNotes.unshift({ type, text: noteText, authorId: req.user._id, authorName: req.user.name, createdAt: new Date() });
  customer.lastInteraction = new Date();
  await customer.save();

  await emitCustomerActivity({
    actor: req.user, websiteId: customer.websiteId, customerId: customer._id,
    type: type === "note" ? "note_added" : `${type}_logged`,
    summary: `Interaction logged for ${customer.name}`, metadata: { note: noteText, interactionType: type }
  });

  res.json(customer);
});

export const sendCustomerEmail = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_SEND_EMAIL);
  const { subject, body } = req.body;
  const customer = await Customer.findById(req.params.id).populate("websiteId");
  
  const { html } = salesOutreachTemplate({ customerName: customer.name, salesName: req.user.name, body, websiteName: customer.websiteId.websiteName });
  await sendEmail({ to: customer.email, subject, html, replyTo: req.user.email });

  customer.communications.unshift({ type: "email", direction: "outbound", to: customer.email, subject, body, sentBy: req.user._id, sentAt: new Date() });
  await customer.save();
  res.json(customer);
});

export const getCustomerActivity = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.ACTIVITY_VIEW);
  const activity = await listActivityForEntity({ entityType: "customer", entityId: req.params.id, limit: 100 });
  res.json(activity);
});

export const promoteVisitor = asyncHandler(async (req, res) => {
  const { visitorId, sessionId } = req.body;
  const visitor = await Visitor.findOne({ visitorId });
  if (!visitor) throw new AppError("Visitor not found", 404);

  // Promotion logic simplified for the controller split
  res.status(501).json({ message: "Promote logic requires full service integration" });
});

export const getMyCustomerNotes = asyncHandler(async (req, res) => {
  const customers = await Customer.find({
    ownerId: req.user._id,
    "internalNotes.0": { $exists: true }
  }).select("name email internalNotes crn");

  const allNotes = customers.flatMap(c =>
    c.internalNotes.map(n => ({
      ...n.toObject(),
      customerName: c.name,
      customerId: c._id,
      customerCrn: c.crn
    }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(allNotes);
});
