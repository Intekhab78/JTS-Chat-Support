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
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) throw new AppError("Access denied", 403);

  customer.internalNotes.unshift({ type, text: noteText, authorId: req.user._id, authorName: req.user.name, createdAt: new Date() });
  customer.lastInteraction = new Date();
  await customer.save();

  await emitCustomerActivity({
    actor: req.user, websiteId: customer.websiteId, customerId: customer._id,
    type: type === "note" ? "note_added" : `${type}_logged`,
    summary: `Note logged for ${customer.name}`, metadata: { note: noteText, interactionType: type }
  });

  res.json(customer);
});

export const sendCustomerEmail = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_SEND_EMAIL);
  const { subject, body } = req.body;
  const customer = await Customer.findById(req.params.id).populate("websiteId");
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const custWebId = customer.websiteId?._id ? String(customer.websiteId._id) : (customer.websiteId ? String(customer.websiteId) : null);
  if (custWebId && !ownedWebsiteIds.map(String).includes(custWebId)) {
    throw new AppError("Access denied", 403);
  }

  if (!customer.email) {
    throw new AppError("Customer does not have a registered email address", 400);
  }

  const websiteName = customer.websiteId?.websiteName || "JTS Support";
  const { html } = salesOutreachTemplate({ 
    customerName: customer.name, 
    salesName: req.user.name, 
    body, 
    websiteName 
  });
  
  await sendEmail({ to: customer.email, subject, html, replyTo: req.user.email });

  customer.communications.unshift({ 
    type: "email", 
    direction: "outbound", 
    to: customer.email, 
    subject, 
    body, 
    sentBy: req.user._id, 
    sentAt: new Date() 
  });
  customer.lastInteraction = new Date();
  await customer.save();
  res.json(customer);
});

export const getCustomerActivity = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.ACTIVITY_VIEW);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) throw new AppError("Access denied", 403);

  const activity = await listActivityForEntity({ entityType: "customer", entityId: req.params.id, limit: 100 });
  res.json(activity);
});

export const promoteVisitor = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const { visitorId, sessionId, name, email, phone, companyName, requirement } = req.body;
  const ownedWebsiteIds = (await getOwnedWebsiteIds(req.user)).map(String);

  let visitor = null;
  if (visitorId) {
    visitor = /^[0-9a-fA-F]{24}$/.test(String(visitorId))
      ? await Visitor.findById(visitorId)
      : await Visitor.findOne({ visitorId });
  }
  const session = sessionId
    ? (/^[0-9a-fA-F]{24}$/.test(String(sessionId))
        ? await ChatSession.findById(sessionId).populate("visitorId")
        : await ChatSession.findOne({ sessionId }).populate("visitorId"))
    : null;

  if (!visitor && session?.visitorId) {
    visitor = session.visitorId;
  }
  if (!visitor) throw new AppError("Visitor not found", 404);

  const targetWebsiteId = session?.websiteId || visitor.websiteId;
  if (req.user.role !== "admin" && targetWebsiteId && !ownedWebsiteIds.includes(String(targetWebsiteId))) {
    throw new AppError("Access denied", 403);
  }

  const { getOrCreateCustomer, generateCRN } = await import("../services/customerService.js");
  const resolvedName = String(name || visitor.name || "Promoted Visitor").trim();
  const resolvedEmail = String(email || visitor.email || "").trim().toLowerCase();
  const resolvedPhone = String(phone || visitor.phone || "").trim();

  let customer = visitor.customerId ? await Customer.findById(visitor.customerId) : null;
  if (!customer && resolvedEmail && !resolvedEmail.endsWith("@visitor.local")) {
    customer = await getOrCreateCustomer({
      name: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      websiteId: targetWebsiteId,
      visitorId: visitor.visitorId,
      leadSource: "Live Chat Promotion",
      ownerId: req.user._id
    });
  }
  if (!customer) {
    customer = await Customer.create({
      crn: await generateCRN(),
      name: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone,
      companyName: companyName || "",
      requirement: requirement || session?.lastMessagePreview || "",
      websiteId: targetWebsiteId,
      ownerId: req.user._id,
      leadSource: "Live Chat Promotion",
      recordType: "lead",
      pipelineStage: "new",
      status: "new"
    });
  }

  visitor.customerId = customer._id;
  visitor.crn = customer.crn;
  if (resolvedName) visitor.name = resolvedName;
  if (resolvedEmail) visitor.email = resolvedEmail;
  if (resolvedPhone) visitor.phone = resolvedPhone;
  await visitor.save();

  await ChatSession.updateMany(
    { visitorId: visitor._id },
    { $set: { customerId: customer._id, crn: customer.crn } }
  );

  await logAuditEvent({
    actor: req.user,
    action: "crm.visitor_promoted",
    entityType: "customer",
    entityId: customer._id,
    websiteId: targetWebsiteId,
    metadata: { visitorId: visitor.visitorId, sessionId: session?.sessionId || null },
    ipAddress: req.ip
  });

  res.status(201).json({ success: true, customer });
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
