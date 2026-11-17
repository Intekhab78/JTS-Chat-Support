import { ChatFlow } from "../models/ChatFlow.js";
import { FlowExecutionLog } from "../models/FlowExecutionLog.js";
import { FlowTemplate } from "../models/FlowTemplate.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";

async function assertFlowWebsiteAccess(req, websiteId) {
  const role = normalizeRole(req.user?.role);
  if (role === "admin") return;
  const ownedIds = (await getOwnedWebsiteIds(req.user)).map(String);
  if (!websiteId || !ownedIds.includes(String(websiteId))) {
    throw new AppError("Access denied: Unauthorized website access", 403);
  }
}

export const getFlows = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const role = normalizeRole(req.user?.role);
  const query = { isDeleted: { $ne: true } };

  if (role !== "admin") {
    const ownedIds = await getOwnedWebsiteIds(req.user);
    if (websiteId) {
      if (!ownedIds.some((id) => String(id) === String(websiteId))) {
        throw new AppError("Access denied: Unauthorized website access", 403);
      }
      query.websiteId = websiteId;
    } else {
      query.websiteId = { $in: ownedIds };
    }
  } else if (websiteId) {
    query.websiteId = websiteId;
  }

  const flows = await ChatFlow.find(query).sort({ updatedAt: -1 });
  res.json(flows);
});

export const getFlowById = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);
  await assertFlowWebsiteAccess(req, flow.websiteId);
  res.json(flow);
});

export const createFlow = asyncHandler(async (req, res) => {
  const { websiteId, name, description, triggerKeyword, triggerType, triggerUrlPattern, notifyEmail, notifyWhatsapp, notifyCustomerWhatsapp, notifyWebhookUrl, isActive, nodes } = req.body;
  if (!name) throw new AppError("Flow name is required", 400);
  if (!websiteId) throw new AppError("Website ID is required", 400);

  await assertFlowWebsiteAccess(req, websiteId);

  const flow = await ChatFlow.create({
    websiteId,
    name,
    description: description || "",
    triggerKeyword: triggerKeyword || "hello",
    triggerType: ["keyword", "welcome", "delayed", "page_url"].includes(triggerType) ? triggerType : "keyword",
    triggerUrlPattern: triggerUrlPattern || "",
    notifyEmail: notifyEmail || "",
    notifyWhatsapp: notifyWhatsapp || "",
    notifyCustomerWhatsapp: Boolean(notifyCustomerWhatsapp),
    notifyWebhookUrl: notifyWebhookUrl || "",
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    nodes: nodes || [
      {
        id: "node-start",
        type: "trigger",
        title: "Chat Started Trigger",
        content: "User opens live chat widget",
        position: { x: 100, y: 100 },
        options: [{ label: "User clicks Next", targetNodeId: "node-question-1" }]
      },
      {
        id: "node-question-1",
        type: "question",
        title: "Initial Support Options",
        content: "How can we help you today?",
        position: { x: 400, y: 100 },
        options: [
          { label: "Sales & Pricing", targetNodeId: "node-action-sales" },
          { label: "Technical Support", targetNodeId: "node-action-ticket" }
        ]
      },
      {
        id: "node-action-ticket",
        type: "ticket_action",
        title: "Auto-Create Ticket",
        content: "Creates a Support Ticket automatically",
        position: { x: 700, y: 200 },
        options: []
      }
    ],
    createdBy: req.user._id
  });

  res.status(201).json(flow);
});

export const updateFlow = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);
  await assertFlowWebsiteAccess(req, flow.websiteId);

  if (req.body.name !== undefined) flow.name = req.body.name;
  if (req.body.description !== undefined) flow.description = req.body.description;
  if (req.body.triggerKeyword !== undefined) flow.triggerKeyword = req.body.triggerKeyword;
  if (req.body.triggerType !== undefined && ["keyword", "welcome", "delayed", "page_url"].includes(req.body.triggerType)) {
    flow.triggerType = req.body.triggerType;
  }
  if (req.body.triggerUrlPattern !== undefined) flow.triggerUrlPattern = req.body.triggerUrlPattern;
  if (req.body.notifyEmail !== undefined) flow.notifyEmail = req.body.notifyEmail;
  if (req.body.notifyWhatsapp !== undefined) flow.notifyWhatsapp = req.body.notifyWhatsapp;
  if (req.body.notifyCustomerWhatsapp !== undefined) flow.notifyCustomerWhatsapp = Boolean(req.body.notifyCustomerWhatsapp);
  if (req.body.notifyWebhookUrl !== undefined) flow.notifyWebhookUrl = req.body.notifyWebhookUrl;
  if (req.body.isActive !== undefined) flow.isActive = req.body.isActive;
  if (req.body.nodes !== undefined) flow.nodes = req.body.nodes;

  await flow.save();
  res.json(flow);
});

export const deleteFlow = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);
  await assertFlowWebsiteAccess(req, flow.websiteId);
  await flow.deleteOne();
  res.json({ message: "Flow deleted successfully" });
});

export const getFlowsByWebsite = asyncHandler(async (req, res) => {
  const { websiteId } = req.params;
  await assertFlowWebsiteAccess(req, websiteId);
  const flows = await ChatFlow.find({ websiteId, isDeleted: { $ne: true } }).sort({ updatedAt: -1 });
  res.json(flows);
});

export const getFlowExecutiveSummary = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);
  await assertFlowWebsiteAccess(req, flow.websiteId);

  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  const nodeVisits = {};
  const nodeDropoffs = {};
  const optionClickMap = new Map();

  nodes.forEach((n, idx) => {
    const nid = n.id || `node-${idx}`;
    nodeVisits[nid] = 0;
    nodeDropoffs[nid] = 0;
    if (Array.isArray(n.options)) {
      n.options.forEach((opt) => {
        if (opt.label && !optionClickMap.has(opt.label)) {
          optionClickMap.set(opt.label, 0);
        }
      });
    }
  });

  const logs = await FlowExecutionLog.find({ flowId: flow._id }).sort({ createdAt: 1 }).lean();

  const startedSessions = new Set();
  const questionSessions = new Set();
  const actionSessions = new Set();
  const completedSessions = new Set();
  const transferSessions = new Set();
  const sessionLastVisitedNode = new Map();
  let leadConversions = 0;
  let ticketConversions = 0;
  let aiResolutions = 0;

  for (const log of logs) {
    if (log.eventType === "flow_started") {
      startedSessions.add(log.sessionId);
    } else if (log.eventType === "node_visited") {
      if (log.nodeId) {
        nodeVisits[log.nodeId] = (nodeVisits[log.nodeId] || 0) + 1;
        sessionLastVisitedNode.set(log.sessionId, log.nodeId);
      }
      if (log.nodeType === "question" || log.nodeType === "ai_faq") {
        questionSessions.add(log.sessionId);
      }
      if (log.nodeType === "lead_action" || log.nodeType === "ticket_action") {
        actionSessions.add(log.sessionId);
      }
    } else if (log.eventType === "option_clicked" && log.optionLabel) {
      optionClickMap.set(log.optionLabel, (optionClickMap.get(log.optionLabel) || 0) + 1);
      questionSessions.add(log.sessionId);
    } else if (log.eventType === "conversion_lead") {
      leadConversions += 1;
      actionSessions.add(log.sessionId);
      completedSessions.add(log.sessionId);
    } else if (log.eventType === "conversion_ticket") {
      ticketConversions += 1;
      actionSessions.add(log.sessionId);
      completedSessions.add(log.sessionId);
    } else if (log.eventType === "ai_resolved") {
      aiResolutions += 1;
      completedSessions.add(log.sessionId);
    } else if (log.eventType === "transferred_agent") {
      transferSessions.add(log.sessionId);
      completedSessions.add(log.sessionId);
    } else if (log.eventType === "flow_completed") {
      completedSessions.add(log.sessionId);
    }
  }

  let totalDropoffs = 0;
  for (const [sessId, lastNodeId] of sessionLastVisitedNode.entries()) {
    if (!completedSessions.has(sessId) && !transferSessions.has(sessId)) {
      totalDropoffs += 1;
      nodeDropoffs[lastNodeId] = (nodeDropoffs[lastNodeId] || 0) + 1;
    }
  }

  const totalStarted = startedSessions.size;
  const totalConversions = leadConversions + ticketConversions + aiResolutions;
  const totalTransfers = transferSessions.size;
  const conversionRate = totalStarted > 0 ? Math.round((completedSessions.size / totalStarted) * 100) : 0;
  const dropoffRate = totalStarted > 0 ? Math.round((totalDropoffs / totalStarted) * 100) : 0;

  const topClickedOptions = Array.from(optionClickMap.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const funnel = [
    { step: "Trigger Initiated", count: totalStarted },
    { step: "Question / AI Engaged", count: questionSessions.size },
    { step: "Lead / Ticket Action", count: actionSessions.size },
    { step: "Completed / Converted", count: completedSessions.size }
  ];

  res.json({
    flowId: flow._id,
    flowName: flow.name,
    totalStarted,
    totalConversions,
    leadConversions,
    ticketConversions,
    aiResolutions,
    conversionRate,
    totalTransfers,
    totalDropoffs,
    dropoffRate,
    funnel,
    topClickedOptions,
    nodeVisits,
    nodeDropoffs
  });
});

const DEFAULT_SYSTEM_TEMPLATES = [
  {
    name: "Customer Support & Lead Qualification Bot",
    industry: "SaaS & Services",
    description: "Qualifies visitors, answers support queries via Knowledge Base AI, captures CRM leads, and routes to live agents.",
    isSystem: true,
    nodes: {
      triggerKeyword: "support",
      triggerType: "keyword",
      nodes: [
        {
          id: "node-start",
          type: "trigger",
          title: "Chat Trigger",
          content: "Welcome! How can our team assist you today?",
          options: [{ label: "Start Qualification", targetNodeId: "node-q1" }]
        },
        {
          id: "node-q1",
          type: "question",
          title: "Service Requirement",
          content: "Please choose the topic that best matches your inquiry:",
          options: [
            { label: "Product & Pricing Inquiry", targetNodeId: "node-lead-sales" },
            { label: "Technical Support / Ticket", targetNodeId: "node-ticket" },
            { label: "Ask AI Knowledge Base", targetNodeId: "node-ai-faq" },
            { label: "Talk to Live Agent", targetNodeId: "node-transfer-agent" }
          ]
        },
        {
          id: "node-lead-sales",
          type: "lead_action",
          title: "Sales Lead Capture",
          content: "Please share your work email and company name so our sales specialist can send tailored pricing.",
          options: [{ label: "Connect with Agent", targetNodeId: "node-transfer-agent" }]
        },
        {
          id: "node-ai-faq",
          type: "ai_faq",
          title: "AI Knowledge Resolution",
          content: "Ask any question below and I will search our verified Knowledge Base for an instant answer.",
          options: [{ label: "Still Need Human Agent", targetNodeId: "node-transfer-agent" }]
        },
        {
          id: "node-ticket",
          type: "ticket_action",
          title: "Auto-Create Support Ticket",
          content: "A high-priority support ticket has been logged and assigned to the right department.",
          options: []
        },
        {
          id: "node-transfer-agent",
          type: "transfer_agent",
          title: "Transfer to Live Agent",
          content: "Connecting you to the next available support specialist.",
          options: []
        }
      ]
    }
  },
  {
    name: "24/7 Support & Ticket Triage Bot",
    industry: "Customer Support",
    description: "Automates issue categorization, AI FAQ deflection, and priority ticket escalation.",
    isSystem: true,
    nodes: {
      triggerKeyword: "help",
      triggerType: "keyword",
      nodes: [
        {
          id: "node-start",
          type: "trigger",
          title: "Support Intake",
          content: "Hi there! Tell us what you need help with.",
          options: [{ label: "Begin Triage", targetNodeId: "node-q1" }]
        },
        {
          id: "node-q1",
          type: "question",
          title: "Issue Category",
          content: "Select the department or issue type:",
          options: [
            { label: "Technical Issue / Bug", targetNodeId: "node-ticket-bug" },
            { label: "Billing & Invoice Query", targetNodeId: "node-ticket-billing" },
            { label: "Instant AI Answers", targetNodeId: "node-ai-faq" }
          ]
        },
        {
          id: "node-ai-faq",
          type: "ai_faq",
          title: "AI Knowledge Resolution",
          content: "Type your question below to search our Knowledge Base.",
          options: [{ label: "Escalate to Live Agent", targetNodeId: "node-transfer" }]
        },
        {
          id: "node-ticket-bug",
          type: "ticket_action",
          title: "Log Technical Ticket",
          content: "Created a technical support ticket with High Priority.",
          options: []
        },
        {
          id: "node-ticket-billing",
          type: "ticket_action",
          title: "Log Billing Ticket",
          content: "Routed your billing inquiry to the Finance & Accounts team.",
          options: []
        },
        {
          id: "node-transfer",
          type: "transfer_agent",
          title: "Transfer to Live Agent",
          content: "Transferring chat to an available support executive.",
          options: []
        }
      ]
    }
  },
  {
    name: "Instant Welcome Concierge",
    industry: "General",
    description: "Greets visitors automatically on widget open and routes them to AI answers or sales.",
    isSystem: true,
    nodes: {
      triggerKeyword: "hello",
      triggerType: "welcome",
      nodes: [
        {
          id: "node-start",
          type: "trigger",
          title: "Welcome Greeting",
          content: "Hello! Welcome to our support desk. How can I help you today?",
          options: [
            { label: "Ask a Question (AI)", targetNodeId: "node-ai" },
            { label: "Request a Quote", targetNodeId: "node-lead" },
            { label: "Speak to Support", targetNodeId: "node-agent" }
          ]
        },
        {
          id: "node-ai",
          type: "ai_faq",
          title: "AI Self-Service",
          content: "Ask me anything about our services, pricing, or policies.",
          options: [{ label: "Talk to Agent", targetNodeId: "node-agent" }]
        },
        {
          id: "node-lead",
          type: "lead_action",
          title: "Quote Request",
          content: "Please share your name, email, and project requirements.",
          options: []
        },
        {
          id: "node-agent",
          type: "transfer_agent",
          title: "Live Support",
          content: "Connecting you with our support team now.",
          options: []
        }
      ]
    }
  }
];

function normalizeTemplateDoc(doc) {
  const obj = doc?.toObject ? doc.toObject() : doc;
  const payload = obj.nodes || {};
  const nodeList = Array.isArray(payload) ? payload : (Array.isArray(payload.nodes) ? payload.nodes : []);
  return {
    _id: obj._id,
    name: obj.name,
    description: obj.description || "",
    industry: obj.industry || "General",
    isSystem: Boolean(obj.isSystem),
    triggerKeyword: payload.triggerKeyword || "hello",
    triggerType: payload.triggerType || "keyword",
    nodes: nodeList
  };
}

export const listFlowTemplates = asyncHandler(async (req, res) => {
  let templates = await FlowTemplate.find({}).sort({ isSystem: -1, createdAt: 1 });
  if (templates.length === 0) {
    templates = await FlowTemplate.insertMany(DEFAULT_SYSTEM_TEMPLATES);
  }
  res.json(templates.map(normalizeTemplateDoc));
});

export const createFlowTemplate = asyncHandler(async (req, res) => {
  const { name, description, industry, triggerKeyword, triggerType, nodes } = req.body;
  if (!name || !Array.isArray(nodes) || nodes.length === 0) {
    throw new AppError("Template name and nodes are required.", 400);
  }

  const created = await FlowTemplate.create({
    name: String(name).trim(),
    description: String(description || "").trim(),
    industry: String(industry || "Custom").trim(),
    isSystem: false,
    nodes: {
      triggerKeyword: triggerKeyword || "hello",
      triggerType: triggerType || "keyword",
      nodes
    }
  });

  res.status(201).json(normalizeTemplateDoc(created));
});
