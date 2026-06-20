import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";
import { Customer } from "../models/Customer.js";
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

  const customer = await Customer.create({
    crn: await generateCRN(),
    name,
    email: String(email).trim().toLowerCase(),
    phone,
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

  res.status(201).json({ success: true, message: "Lead submitted successfully." });
});

export const submitWidgetTicket = asyncHandler(async (req, res) => {
  const { subject, department, category, priority, description, sessionId } = req.body;
  const websiteId = req.website._id;

  const priorityLevel = priority || inferTicketPriority({ subject, category, note: description });
  const slas = buildTicketSlaFields(priorityLevel);

  let customerId = null;
  let visitorId = null;
  if (sessionId) {
     const session = await ChatSession.findOne({ sessionId });
     customerId = session?.customerId;
     visitorId = session?.visitorId;
  }

  const ticket = await Ticket.create({
    ticketId: await buildTicketId(),
    websiteId,
    customerId,
    visitorId,
    subject,
    department: department || "general",
    category,
    priority: priorityLevel,
    firstResponseDueAt: slas.firstResponseDueAt,
    resolutionDueAt: slas.resolutionDueAt,
    channel: "chat",
    notes: [{ content: description, isPublic: true }]
  });

  await autoAssignTicket(ticket);

  getSocketServer().to(`manager_${req.website.managerId}`).emit("ticketUpdated", ticket);

  res.status(201).json({ success: true, ticketId: ticket.ticketId });
});

export const executeWidgetAction = asyncHandler(async (req, res) => {
  const { actionType, nodeData, context, sessionId } = req.body;
  const websiteId = req.website._id;

  if (actionType === "create_lead") {
    const customer = await Customer.create({
      crn: await generateCRN(),
      name: context.name || "Unknown",
      email: context.email ? String(context.email).trim().toLowerCase() : "",
      phone: context.phone || "",
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
        user: customer.name || "Visitor"
      });
    } catch (err) {
      console.error(err);
    }

    return res.status(201).json({ success: true, leadId: customer._id });
  } 

  if (actionType === "create_ticket_form" || actionType === "create_ticket") {
    const priorityLevel = context.priority || nodeData.priority || inferTicketPriority({ subject: context.subject, category: context.category, note: context.description });
    const slas = buildTicketSlaFields(priorityLevel);

    let customerId = null;
    let visitorId = null;
    if (sessionId) {
       const session = await ChatSession.findOne({ sessionId });
       customerId = session?.customerId;
       visitorId = session?.visitorId;
    }

    const ticket = await Ticket.create({
      ticketId: await buildTicketId(),
      websiteId,
      customerId,
      visitorId,
      subject: context.subject || nodeData.message || "Support Request",
      department: context.department || nodeData.department || "general",
      category: context.category,
      priority: priorityLevel,
      firstResponseDueAt: slas.firstResponseDueAt,
      resolutionDueAt: slas.resolutionDueAt,
      channel: "chat",
      notes: [{ content: context.description || "Ticket created via chat bot action.", isPublic: true }]
    });

    await autoAssignTicket(ticket);

    getSocketServer().to(`manager_${req.website.managerId}`).emit("ticketUpdated", ticket);
    
    try {
      getSocketServer().emit("ticket:created", {
        message: `New ticket created from widget: ${ticket.subject}`,
        user: context.name || "Visitor"
      });
    } catch(err) {}

    return res.status(201).json({ success: true, ticketId: ticket.ticketId });
  }

  if (actionType === "create_callback_request") {
    const customer = await Customer.create({
      crn: await generateCRN(),
      name: context.name || "Callback Request",
      phone: context.phone || "",
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
        user: customer.name
      });
    } catch(err) {}

    return res.status(201).json({ success: true, leadId: customer._id });
  }

  return res.json({ success: true, message: "Action executed", actionType });
});
