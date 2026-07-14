import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";
import { Customer } from "../models/Customer.js";

// Build the public ticket status URL for visitors
function buildTicketStatusUrl(ticketId) {
  const base = (env.clientUrl || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/ticket-status/${ticketId}`;
}
import { Ticket } from "../models/Ticket.js";
import { generateCRN } from "../services/customerService.js";
import { autoAssignLeadOwner, inferTicketPriority, buildTicketSlaFields } from "../services/automationService.js";
import { buildTicketId } from "../utils/ticketUtils.js";
import { getSocketServer } from "../sockets/index.js";
import { ChatSession } from "../models/ChatSession.js";
import { autoAssignTicket } from "../services/ticketService.js";

/**
 * Serves the one-liner embed <script> snippet that customers paste into their websites.
 * The snippet dynamically loads the full widget bundle from the CDN/public URL.
 */
export const getWidgetScript = asyncHandler(async (req, res) => {
  const widgetUrl = env.widgetPublicUrl;
  const scriptOrigin = new URL(widgetUrl).origin;

  const script = `
(function() {
  const currentScript = document.currentScript;
  const apiKey = currentScript && currentScript.getAttribute('data-api-key');
  if (!apiKey) return;
  const origin = "${scriptOrigin}";
  const s = document.createElement('script');
  s.src = "${widgetUrl}";
  s.setAttribute('data-api-key', apiKey);
  s.setAttribute('data-api-url', origin);
  document.head.appendChild(s);
})();
  `;
  res.type("application/javascript").send(script);
});

export const submitWidgetLead = asyncHandler(async (req, res) => {
  const { name, email, phone, companyName, budget, requirement, sessionId } = req.body;
  const websiteId = req.website._id;

  let resolvedName = name;
  let resolvedEmail = email;
  let resolvedPhone = phone;

  // Fallback to pre-chat details from visitor profile if form submission is missing them
  if (sessionId && (!resolvedName || !resolvedEmail || !resolvedPhone)) {
    const session = await ChatSession.findOne({ sessionId }).populate("visitorId");
    if (session && session.visitorId) {
      if (!resolvedName) resolvedName = session.visitorId.name;
      if (!resolvedEmail) resolvedEmail = session.visitorId.email;
      if (!resolvedPhone) resolvedPhone = session.visitorId.phone;
    }
  }

  resolvedName = resolvedName || "Anonymous Visitor";
  resolvedEmail = resolvedEmail ? String(resolvedEmail).trim().toLowerCase() : "";

  const customer = await Customer.create({
    crn: await generateCRN(),
    name: resolvedName,
    email: resolvedEmail,
    phone: resolvedPhone || null,
    companyName,
    budget: Number(budget || 0),
    requirement,
    websiteId,
    recordType: "lead",
    leadSource: "widget",
    pipelineStage: "new",
    stageEnteredAt: new Date()
  });

  await autoAssignLeadOwner(customer, { reason: "widget_lead_submission" });

  if (sessionId) {
    const session = await ChatSession.findOne({ sessionId });
    if (session) {
      session.customerId = customer._id;
      if (session.visitorId) {
        try {
          const mongoose = (await import("mongoose")).default;
          const VisitorModel = mongoose.models.Visitor || mongoose.model("Visitor");
          if (VisitorModel) {
            await VisitorModel.findByIdAndUpdate(session.visitorId, {
              name: customer.name,
              email: customer.email,
              phone: customer.phone
            });
          }
          const UserModel = mongoose.models.User || mongoose.model("User");
          if (UserModel) {
            await UserModel.findByIdAndUpdate(session.visitorId, {
              name: customer.name,
              email: customer.email,
              phone: customer.phone
            });
          }
        } catch (err) {
          console.error("Failed to update anonymous visitor profile details:", err);
        }
      }
      await session.save();

      try {
        const { emitSessionUpdate } = await import("../sockets/index.js");
        const populatedSession = await ChatSession.findById(session._id)
          .populate("websiteId")
          .populate("visitorId")
          .populate("customerId")
          .populate("assignedAgent");
        emitSessionUpdate(populatedSession);
      } catch (err) {
        console.error("Failed to emit session update socket:", err);
      }
    }
  }

  res.status(201).json({ success: true, message: "Lead submitted successfully." });
});

export const submitWidgetTicket = asyncHandler(async (req, res) => {
  const { subject, department, category, priority, description, sessionId } = req.body;
  const websiteId = req.website._id;

  const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

  const safeSubject = String(subject || "Support Request").trim() || "Support Request";
  const safeDept = String(department || "general").trim().toLowerCase() || "general";
  const safeDescription = String(description || "").trim() || "Support request submitted via widget.";

  const rawPriority = priority || inferTicketPriority({ subject: safeSubject, category, note: safeDescription });
  const priorityLevel = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : "medium";

  const slas = buildTicketSlaFields(priorityLevel);

  let customerId = null;
  let visitorId = null;
  if (sessionId) {
    const session = await ChatSession.findOne({ sessionId });
    customerId = session?.customerId;
    visitorId = session?.visitorId;
  }

  const ticket = await Ticket.create({
    ticketId: buildTicketId(),
    websiteId,
    customerId,
    visitorId,
    subject: safeSubject,
    department: safeDept,
    category: category ? String(category).trim() : undefined,
    priority: priorityLevel,
    firstResponseDueAt: slas.firstResponseDueAt,
    resolutionDueAt: slas.resolutionDueAt,
    channel: "chat",
    notes: [{ content: safeDescription, isPublic: true }]
  });

  await autoAssignTicket(ticket);

  getSocketServer().to(`manager_${req.website.managerId}`).emit("ticketUpdated", ticket);

  res.status(201).json({
    success: true,
    ticketId: ticket.ticketId,
    ticketStatusUrl: buildTicketStatusUrl(ticket.ticketId)
  });
});

export const executeWidgetAction = asyncHandler(async (req, res) => {
  const { actionType, nodeData, context, sessionId } = req.body;
  const websiteId = req.website._id;

  if (actionType === "create_lead") {
    let resolvedName = context.name;
    let resolvedEmail = context.email;
    let resolvedPhone = context.phone;

    if (sessionId && (!resolvedName || !resolvedEmail || !resolvedPhone)) {
      const session = await ChatSession.findOne({ sessionId }).populate("visitorId");
      if (session && session.visitorId) {
        if (!resolvedName) resolvedName = session.visitorId.name;
        if (!resolvedEmail) resolvedEmail = session.visitorId.email;
        if (!resolvedPhone) resolvedPhone = session.visitorId.phone;
      }
    }

    resolvedName = resolvedName || "Unknown";
    resolvedEmail = resolvedEmail ? String(resolvedEmail).trim().toLowerCase() : "";

    const customer = await Customer.create({
      crn: await generateCRN(),
      name: resolvedName,
      email: resolvedEmail,
      phone: resolvedPhone || "",
      companyName: context.company || context.companyName || "",
      budget: Number(context.budget?.replace(/[^0-9]/g, '') || 0),
      requirement: context.requirements || context.service_interest || context.requirement || "",
      websiteId,
      recordType: "lead",
      leadSource: "widget",
      pipelineStage: "new",
      stageEnteredAt: new Date(),
      customFields: context
    });
    await autoAssignLeadOwner(customer, { reason: "widget_dynamic_lead" });

    if (sessionId) {
      await ChatSession.updateOne({ sessionId }, { customerId: customer._id });
    }

    try {
      getSocketServer().emit("lead:created", {
        message: `New Lead registered via chat widget`,
        user: customer.name || "Visitor",
        customerId: customer._id,
        websiteId,
        recordType: customer.recordType
      });
    } catch (err) {
      console.error(err);
    }

    return res.status(201).json({ success: true, leadId: customer._id });
  }

  if (actionType === "create_ticket_form" || actionType === "create_ticket") {
    const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

    // Sanitize department — must be lowercase, fall back to "general"
    const rawDept = String(context.department || nodeData.department || "general").trim().toLowerCase();
    const department = rawDept || "general";

    // Ensure subject is always a non-empty string
    const subject = String(context.subject || nodeData.subject || nodeData.message || "Support Request").trim() || "Support Request";

    // Ensure description is always a non-empty string
    const description = String(context.description || context.issue || context.details || "Ticket created via chat bot action.").trim() || "Ticket created via chat bot action.";

    // Safely infer priority and validate it's an allowed enum value
    const rawPriority = context.priority || nodeData.priority || inferTicketPriority({ subject, category: context.category, note: description });
    const priorityLevel = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : "medium";

    const slas = buildTicketSlaFields(priorityLevel);

    let customerId = null;
    let visitorId = null;
    if (sessionId) {
      const session = await ChatSession.findOne({ sessionId });
      customerId = session?.customerId;
      visitorId = session?.visitorId;
    }

    const ticket = await Ticket.create({
      ticketId: buildTicketId(),
      websiteId,
      customerId,
      visitorId,
      subject,
      department,
      category: context.category ? String(context.category).trim() : undefined,
      priority: priorityLevel,
      firstResponseDueAt: slas.firstResponseDueAt,
      resolutionDueAt: slas.resolutionDueAt,
      channel: "chat",
      notes: [{ content: description, isPublic: true }]
    });

    await autoAssignTicket(ticket);

    getSocketServer().to(`manager_${req.website.managerId}`).emit("ticketUpdated", ticket);

    try {
      getSocketServer().emit("ticket:created", {
        message: `New ticket created from widget: ${ticket.subject}`,
        user: context.name || "Visitor"
      });
    } catch (err) { }

    return res.status(201).json({
      success: true,
      ticketId: ticket.ticketId,
      ticketStatusUrl: buildTicketStatusUrl(ticket.ticketId)
    });
  }

  if (actionType === "create_callback_request") {
    let resolvedName = context.name;
    let resolvedPhone = context.phone;

    if (sessionId && (!resolvedName || !resolvedPhone)) {
      const session = await ChatSession.findOne({ sessionId }).populate("visitorId");
      if (session && session.visitorId) {
        if (!resolvedName) resolvedName = session.visitorId.name;
        if (!resolvedPhone) resolvedPhone = session.visitorId.phone;
      }
    }

    resolvedName = resolvedName || "Callback Request";

    const customer = await Customer.create({
      crn: await generateCRN(),
      name: resolvedName,
      phone: resolvedPhone || "",
      websiteId,
      recordType: "lead",
      leadSource: "widget",
      pipelineStage: "new",
      requirement: "Callback Requested during offline hours",
      stageEnteredAt: new Date()
    });

    try {
      getSocketServer().emit("lead:created", {
        message: `Callback requested by visitor`,
        user: customer.name,
        customerId: customer._id,
        websiteId,
        recordType: customer.recordType
      });
    } catch (err) { }

    return res.status(201).json({ success: true, leadId: customer._id });
  }

  return res.json({ success: true, message: "Action executed", actionType });
});
