import { ChatFlow } from "../models/ChatFlow.js";
import { FlowExecutionLog } from "../models/FlowExecutionLog.js";
import { Article } from "../models/Article.js";
import { AiKnowledgeSource } from "../models/AiKnowledgeSource.js";
import { Ticket } from "../models/Ticket.js";
import { Customer } from "../models/Customer.js";
import { Visitor } from "../models/Visitor.js";
import { Message } from "../models/Message.js";
import { findAvailableAgent } from "./assignmentService.js";
import { chunkText } from "../utils/knowledgeBaseUtils.js";
import { AiProviderManager } from "./aiProviderManager.js";
import { buildTicketId } from "../utils/ticketUtils.js";
import { generateCRN } from "./customerService.js";
import { isBusinessOpen } from "../controllers/chatController.js";
import { broadcastDataChange } from "../services/dataSyncService.js";
import { env } from "../config/env.js";

function parseNumericValue(raw) {
  const s = String(raw || "").toLowerCase().replace(/[,₹$\s]/g, "");
  const num = parseFloat(s);
  if (Number.isNaN(num)) return NaN;
  if (s.endsWith("k")) return num * 1000;
  if (s.endsWith("l") || s.endsWith("lac")) return num * 100000;
  return num;
}

function evaluateConditionNode(node, session, visitorMessage) {
  const cfg = node.conditionConfig || {};
  const fieldKey = String(cfg.fieldKey || "budget").trim().toLowerCase();
  const operator = cfg.operator || "gt";
  const expectedRaw = String(cfg.value ?? "").trim();

  const formSub = session?.botMetadata?.lastFormSubmission || {};
  let actualRaw = "";
  for (const [k, v] of Object.entries(formSub)) {
    if (k.toLowerCase() === fieldKey || k.toLowerCase().includes(fieldKey)) {
      actualRaw = String(v ?? "");
      break;
    }
  }
  if (!actualRaw) actualRaw = String(visitorMessage || "");

  if (operator === "gt" || operator === "lt") {
    const aNum = parseNumericValue(actualRaw);
    const eNum = parseNumericValue(expectedRaw);
    if (!Number.isNaN(aNum) && !Number.isNaN(eNum)) {
      return operator === "gt" ? aNum > eNum : aNum < eNum;
    }
    return false;
  }
  if (operator === "equals") {
    return actualRaw.trim().toLowerCase() === expectedRaw.toLowerCase();
  }
  return actualRaw.toLowerCase().includes(expectedRaw.toLowerCase());
}

function resolveRoutingNode(flow, node, websiteObj, session, visitorMessage, depth = 0) {
  if (!node || depth >= 5) return node;
  if (node.type === "business_hours") {
    const open = isBusinessOpen(websiteObj?.businessHours);
    const targetId = open ? node.openTargetNodeId : node.closedTargetNodeId;
    const nextNode = targetId ? flow.nodes.find((n) => n.id === targetId) : null;
    return nextNode ? resolveRoutingNode(flow, nextNode, websiteObj, session, visitorMessage, depth + 1) : node;
  }
  if (node.type === "condition") {
    const passed = evaluateConditionNode(node, session, visitorMessage);
    const cfg = node.conditionConfig || {};
    const targetId = passed ? cfg.trueTargetNodeId : cfg.falseTargetNodeId;
    const nextNode = targetId ? flow.nodes.find((n) => n.id === targetId) : null;
    return nextNode ? resolveRoutingNode(flow, nextNode, websiteObj, session, visitorMessage, depth + 1) : node;
  }
  return node;
}

function getMainMenuNode(flow) {
  return flow?.nodes?.find((n) => n.type === "question") || flow?.nodes?.find((n) => n.type === "trigger") || null;
}

function buildSmartFallbackOptions(flow, currentNode) {
  const opts = [];
  const mainMenuNode = getMainMenuNode(flow);
  const formNode = flow?.nodes?.find((n) => n.type === "form");
  const ticketNode = flow?.nodes?.find((n) => n.type === "ticket_action");
  if (formNode && formNode.id !== currentNode?.id) {
    opts.push({ label: "📝 Leave Details", targetNodeId: formNode.id });
  }
  if (ticketNode && ticketNode.id !== currentNode?.id) {
    opts.push({ label: "🎫 Create Ticket", targetNodeId: ticketNode.id });
  }
  if (mainMenuNode && mainMenuNode.id !== currentNode?.id) {
    opts.push({ label: "🏠 Main Menu", targetNodeId: mainMenuNode.id });
  }
  return opts;
}

async function findAvailableOnlineAgent(websiteObj) {
  if (!websiteObj?._id) return null;
  try {
    const agent = await findAvailableAgent({
      managerId: websiteObj.managerId,
      websiteId: websiteObj._id,
      roles: ["agent", "sales"]
    });
    return agent || null;
  } catch {
    return null;
  }
}

function formatFlowNodeReply(flow, node, messageOverride = null, conversionType = null, session = null, suppressForm = false, optionsOverride = null, extra = {}) {
  let effectiveOptions = optionsOverride !== null ? optionsOverride : (node.options || []);
  const mainMenuNode = getMainMenuNode(flow);
  const shouldAppendMainMenu = (
    optionsOverride === null
    && effectiveOptions.length === 0
    && node.type !== "form"
    && node.type !== "transfer_agent"
    && mainMenuNode
    && mainMenuNode.id !== node.id
  );
  if (shouldAppendMainMenu) {
    effectiveOptions = [{ label: "🏠 Main Menu", targetNodeId: mainMenuNode.id }];
  }

  return {
    flowId: flow._id,
    flowName: flow.name,
    nodeId: node.id,
    nodeType: node.type,
    message: messageOverride !== null ? messageOverride : node.content,
    options: effectiveOptions,
    formFields: (!suppressForm && node.type === "form") ? (node.formFields || []) : [],
    submitLabel: (!suppressForm && node.type === "form") ? (node.submitLabel || "Submit Details") : "",
    conversionType,
    notifyEmail: flow.notifyEmail || "",
    notifyWhatsapp: flow.notifyWhatsapp || "",
    notifyCustomerWhatsapp: Boolean(flow.notifyCustomerWhatsapp),
    notifyWebhookUrl: flow.notifyWebhookUrl || "",
    formData: session?.botMetadata?.lastFormSubmission || null,
    ...extra
  };
}

function parseFormSubmission(formData, visitorMessage) {
  if (formData && typeof formData === "object" && Object.keys(formData).length > 0) {
    return formData;
  }
  const text = String(visitorMessage || "").trim();
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const k = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "_");
      const v = line.slice(idx + 1).trim();
      if (k && v) parsed[k] = v;
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

function isPlaceholderName(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized === "chatbot lead" || normalized.startsWith("anonymous");
}

function isPlaceholderEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || normalized.endsWith("@visitor.local");
}

function extractStructuredField(structured, exactKeys, keyPatterns = []) {
  if (!structured || typeof structured !== "object") return "";
  for (const key of exactKeys) {
    if (structured[key] !== undefined && structured[key] !== null && String(structured[key]).trim()) {
      return String(structured[key]).trim();
    }
  }
  for (const [k, v] of Object.entries(structured)) {
    if (v === undefined || v === null || !String(v).trim()) continue;
    const lowerKey = k.toLowerCase();
    if (keyPatterns.some((re) => re.test(lowerKey))) {
      return String(v).trim();
    }
  }
  return "";
}

async function upsertLeadFromFlowMessage({ session, websiteId, visitorMessage, formData = null }) {
  const text = String(visitorMessage || "").trim();
  const structured = formData || session?.botMetadata?.lastFormSubmission || null;

  const rawEmail = extractStructuredField(structured, ["email", "work_email"], [/email/]);
  const rawPhone = extractStructuredField(structured, ["phone", "mobile", "whatsapp"], [/phone|mobile|whatsapp|tel/]);
  const rawName = extractStructuredField(structured, ["name", "full_name"], [/^name$|full.?name|visitor.?name/]);
  const rawCompany = extractStructuredField(structured, ["company", "company_name"], [/company|org/]);
  const rawRequirement = extractStructuredField(
    structured,
    ["requirement", "requierment", "notes", "message", "project_details"],
    [/require|requier|note|message|project|detail|budget|desc/]
  );

  const emailMatch = (rawEmail || text).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = (rawPhone || text).match(/(?:\+?\d[\d\s\-()]{7,18}\d)/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";
  const phone = phoneMatch ? phoneMatch[0].trim() : String(rawPhone || "").trim();
  const textReqMatch = text.match(/(?:Requirement|Requierment|Project\s*Details|Notes|Message|Inquiry)\s*:\s*(.+)$/i);
  const textNameMatch = text.match(/(?:Full\s*Name|Name)\s*:\s*(.+?)(?=\s+(?:Work\s*Email|Email|Phone|WhatsApp|Mobile|Company|Requirement|Requierment|Message)\s*:|$)/i);
  const resolvedName = String(rawName || (textNameMatch ? textNameMatch[1] : "")).trim() || (email ? email.split("@")[0] : "Chatbot Lead");
  const cleanRequirement = String(rawRequirement || (textReqMatch ? textReqMatch[1] : text)).trim();
  const name = resolvedName;
  const requirementSummary = [rawCompany ? `Company: ${rawCompany}` : "", cleanRequirement]
    .filter(Boolean)
    .join(" | ");

  if (!email && !phone && !rawName) return null;

  try {
    let customer = session.customerId ? await Customer.findById(session.customerId) : null;
    const existingByEmail = email ? await Customer.findOne({ websiteId, email }) : null;

    // Switch to existingByEmail (or create a brand-new lead) if session pointed to a placeholder OR a different real customer's email
    if (email && customer && customer.email && !isPlaceholderEmail(customer.email) && customer.email.toLowerCase() !== email) {
      customer = existingByEmail || null;
    } else if (existingByEmail && customer && String(customer._id) !== String(existingByEmail._id) && isPlaceholderEmail(customer.email)) {
      customer = existingByEmail;
    } else if (!customer && existingByEmail) {
      customer = existingByEmail;
    }

    if (!customer) {
      const crn = await generateCRN();
      customer = await Customer.create({
        websiteId,
        crn,
        name,
        email: email || "",
        phone: phone || undefined,
        company: rawCompany || undefined,
        recordType: "lead",
        leadStatus: "new",
        leadSource: "chatbot_flow",
        requirement: requirementSummary
      });
    } else {
      if (rawName && isPlaceholderName(customer.name)) customer.name = name;
      else if (email && isPlaceholderName(customer.name)) customer.name = name;
      if (email && isPlaceholderEmail(customer.email)) customer.email = email;
      if (phone) customer.phone = phone;
      if (rawCompany) customer.company = rawCompany;
      if (requirementSummary) customer.requirement = requirementSummary;
      if (!customer.recordType || customer.recordType === "visitor" || isPlaceholderEmail(customer.email)) {
        customer.recordType = "lead";
      }
      customer.leadStatus = customer.leadStatus || "new";
      customer.leadSource = "chatbot_flow";
      await customer.save();
    }

    session.customerId = customer._id;

    const visitorId = session?.visitorId?._id || session?.visitorId;
    if (visitorId) {
      const visitorUpdate = { customerId: customer._id };
      if (!isPlaceholderName(customer.name)) visitorUpdate.name = customer.name;
      if (email) visitorUpdate.email = email;
      if (phone) visitorUpdate.phone = phone;
      await Visitor.findByIdAndUpdate(visitorId, { $set: visitorUpdate });
    }

    try {
      const { getSocketServer } = await import("../sockets/index.js");
      const io = getSocketServer();
      const wsRoom = String(websiteId);
      if (io) {
        io.to(`ws_${wsRoom}`).to("us_admin").emit("lead:created", {
          websiteId: wsRoom,
          customerId: customer._id,
          name: customer.name,
          source: "chatbot_flow"
        });
      }
      broadcastDataChange({
        entity: "customer",
        action: "created",
        websiteId: wsRoom,
        data: { id: customer._id }
      });
    } catch (_) { }

    return customer;
  } catch (err) {
    console.error("Flow CRM lead upsert failed:", err.message);
    return null;
  }
}

async function queryWebsiteKnowledgeForFlow(websiteId, queryText, websiteObj = null) {
  const safeQuery = String(queryText || "").trim();
  if (!safeQuery) return null;

  const [articles, sources] = await Promise.all([
    Article.find({ websiteId, deletedAt: null, archivedAt: null, isPublished: true }).select("title content tags"),
    AiKnowledgeSource.find({ websiteId }).select("name content type")
  ]);

  const terms = [...new Set(
    safeQuery
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2)
  )];

  const scored = [];
  const scoreDoc = (title, content, tags = []) => {
    const titleLower = String(title || "").toLowerCase();
    const tagStr = Array.isArray(tags) ? tags.join(" ").toLowerCase() : "";
    for (const chunk of chunkText(content || "", 500, 80)) {
      const lower = chunk.toLowerCase();
      let hits = 0;
      for (const term of terms) {
        if (lower.includes(term)) hits += 1;
        if (titleLower.includes(term) || tagStr.includes(term)) hits += 0.5;
      }
      if (hits > 0) scored.push({ title, excerpt: chunk, score: hits });
    }
  };

  for (const a of articles) scoreDoc(a.title, a.content, a.tags);
  for (const s of sources) scoreDoc(s.name, s.content);

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  if (process.env.GEMINI_API_KEY) {
    try {
      const driver = AiProviderManager.getProvider("gemini");
      if (top.length > 0) {
        const context = top.map((c, i) => `[${i + 1}. ${c.title}]\n${c.excerpt}`).join("\n\n");
        const res = await driver.generateCompletion({
          prompt: `Answer the customer's question concisely using ONLY these verified knowledge excerpts:\n\n${context}\n\nCustomer: ${safeQuery}\nReply:`,
          temperature: 0.2,
          maxTokens: 300
        });
        if (res?.text && !res.isFallback && !res.text.includes("[Google Gemini Response]") && !res.text.startsWith("Hello! I am your AI assistant")) {
          return res.text.trim();
        }
      } else {
        const siteLabel = websiteObj?.name || websiteObj?.domain || "our company";
        const customPrompt = websiteObj?.aiSystemPrompt ? `Additional Instructions: ${websiteObj.aiSystemPrompt}\n` : "";
        const res = await driver.generateCompletion({
          prompt: `You are a helpful, concise customer support & sales assistant for ${siteLabel}.\n${customPrompt}Answer the customer's message clearly in 2-4 sentences (match their language: English or Hinglish). Never invent specific fake prices or guarantees; if exact team confirmation or a quote is needed, invite them to submit their details or open a support ticket.\n\nCustomer: ${safeQuery}\nReply:`,
          temperature: 0.4,
          maxTokens: 280
        });
        if (res?.text && !res.isFallback && !res.text.includes("[Google Gemini Response]") && !res.text.startsWith("Hello! I am your AI assistant")) {
          return res.text.trim();
        }
      }
    } catch {
      // Fall back to direct excerpt below
    }
  }

  return top.length > 0 ? top[0].excerpt : null;
}

async function logFlowEvent({ websiteId, flowId, sessionId, eventType, nodeId = "", nodeType = "", optionLabel = "", targetNodeId = "" }) {
  try {
    await FlowExecutionLog.create({
      websiteId,
      flowId,
      sessionId,
      eventType,
      nodeId,
      nodeType,
      optionLabel,
      targetNodeId
    });
  } catch (err) {
    console.error("FlowExecutionLog write failed:", err.message);
  }
}

async function applyNodeSideEffects({ session, websiteId, flowId, node, visitorMessage, formData = null }) {
  if (!session.botMetadata) session.botMetadata = {};
  const path = Array.isArray(session.botMetadata.path) ? session.botMetadata.path : [];
  if (!path.includes(node.id)) path.push(node.id);
  session.botMetadata.path = path;
  session.botMetadata.activeFlowId = String(flowId);
  session.botMetadata.currentNodeId = node.id;

  const conversions = Array.isArray(session.botMetadata.conversions) ? session.botMetadata.conversions : [];

  await logFlowEvent({
    websiteId,
    flowId,
    sessionId: session.sessionId,
    eventType: "node_visited",
    nodeId: node.id,
    nodeType: node.type
  });

  if (node.type === "ticket_action") {
    if (!conversions.includes("ticket")) conversions.push("ticket");
    session.botMetadata.conversions = conversions;
    session.botStatus = "resolved";
    session.resolvedByBot = true;

    await logFlowEvent({
      websiteId,
      flowId,
      sessionId: session.sessionId,
      eventType: "conversion_ticket",
      nodeId: node.id,
      nodeType: node.type
    });

    // Auto-link/create Customer if structured form data was captured before this ticket step
    const effectiveFormData = formData || session.botMetadata?.lastFormSubmission || null;
    if (!session.customerId && effectiveFormData) {
      await upsertLeadFromFlowMessage({ session, websiteId, visitorMessage, formData: effectiveFormData });
    }

    // Auto-create a real ticket if none is attached to this session yet
    if (!session.ticketId && session.visitorId) {
      try {
        const ticket = await Ticket.create({
          ticketId: buildTicketId(),
          websiteId,
          visitorId: session.visitorId._id || session.visitorId,
          customerId: session.customerId || undefined,
          subject: node.title || "Automated Flow Support Ticket",
          lastMessagePreview: String(visitorMessage || node.content || "").slice(0, 200),
          notes: [{
            content: `Auto-created by Chatbot Flow. Visitor message: ${visitorMessage || "N/A"}`,
            authorName: "Chatbot Flow",
            isPublic: false
          }],
          status: "open",
          priority: "medium"
        });
        session.ticketId = ticket._id;
        session.botMetadata.lastTicketId = ticket.ticketId;
      } catch (err) {
        console.error("Flow auto-ticket creation failed:", err.message);
      }
    } else if (session.ticketId && !session.botMetadata.lastTicketId) {
      const existingTicket = await Ticket.findById(session.ticketId).select("ticketId");
      if (existingTicket?.ticketId) session.botMetadata.lastTicketId = existingTicket.ticketId;
    }
  } else if (node.type === "lead_action") {
    if (!conversions.includes("lead")) conversions.push("lead");
    session.botMetadata.conversions = conversions;
    const effectiveFormData = formData || session.botMetadata?.lastFormSubmission || null;
    if (effectiveFormData || visitorMessage) {
      await upsertLeadFromFlowMessage({ session, websiteId, visitorMessage, formData: effectiveFormData });
    }
    await logFlowEvent({
      websiteId,
      flowId,
      sessionId: session.sessionId,
      eventType: "conversion_lead",
      nodeId: node.id,
      nodeType: node.type
    });
    session.botStatus = (node.options?.length > 0 || !session.customerId) ? "in_progress" : "resolved";
    if (session.botStatus === "resolved") session.resolvedByBot = true;
  } else if (node.type === "form") {
    session.botStatus = "in_progress";
  } else if (node.type === "transfer_agent") {
    session.botStatus = "escalated";
    session.botMetadata.transferredToAgent = true;
    await logFlowEvent({
      websiteId,
      flowId,
      sessionId: session.sessionId,
      eventType: "transferred_agent",
      nodeId: node.id,
      nodeType: node.type
    });
  } else if ((!node.options || node.options.length === 0) && !node.nextNodeId) {
    session.botStatus = "resolved";
    session.resolvedByBot = true;
    await logFlowEvent({
      websiteId,
      flowId,
      sessionId: session.sessionId,
      eventType: "flow_completed",
      nodeId: node.id,
      nodeType: node.type
    });
  } else {
    session.botStatus = "in_progress";
  }

  session.markModified("botMetadata");
  await session.save();
}

/**
 * Executes an active ChatFlow for an incoming visitor message if matched or already in progress.
 * Returns null if no flow applies so caller can fall back to generic Gemini AI.
 */
export async function executeChatFlowStep({ session, websiteObj, message, formData = null }) {
  if (!session || !websiteObj || (!message?.trim() && !formData)) return null;
  if (session.assignedAgent) return null;

  const websiteId = websiteObj._id;
  const activeFlows = await ChatFlow.find({ websiteId, isActive: true }).sort({ updatedAt: -1 });
  if (!activeFlows.length) return null;

  const text = String(message).trim();
  const textLower = text.toLowerCase();

  // 1. Check if session already has an active flow in progress
  const activeFlowId = session.botMetadata?.activeFlowId;
  const currentNodeId = session.botMetadata?.currentNodeId;

  if (activeFlowId && currentNodeId && ["in_progress", "resolved", "escalated"].includes(session.botStatus)) {
    const flow = activeFlows.find((f) => String(f._id) === String(activeFlowId));
    const currentNode = flow?.nodes?.find((n) => n.id === currentNodeId);

    if (flow && currentNode) {
      if (textLower === "main menu" || textLower === "🏠 main menu" || textLower === "back to main menu") {
        const mainMenuNode = getMainMenuNode(flow);
        if (mainMenuNode) {
          if (session.botMetadata) session.botMetadata.aiAssistantActive = false;
          await applyNodeSideEffects({ session, websiteId, flowId: flow._id, node: mainMenuNode, visitorMessage: text });
          return formatFlowNodeReply(flow, mainMenuNode, null, null, session);
        }
      }

      const matchedOpt = (currentNode.options || []).find(
        (opt) => opt.label && textLower === opt.label.trim().toLowerCase()
      ) || buildSmartFallbackOptions(flow, currentNode).find(
        (opt) => opt.label && textLower === opt.label.trim().toLowerCase()
      );

      if (matchedOpt) {
        await logFlowEvent({
          websiteId,
          flowId: flow._id,
          sessionId: session.sessionId,
          eventType: "option_clicked",
          nodeId: currentNode.id,
          nodeType: currentNode.type,
          optionLabel: matchedOpt.label,
          targetNodeId: matchedOpt.targetNodeId || ""
        });

        const rawNext = flow.nodes.find((n) => n.id === matchedOpt.targetNodeId);
        const nextNode = resolveRoutingNode(flow, rawNext, websiteObj, session, text);
        if (nextNode) {
          if (nextNode.type === "transfer_agent") {
            const businessOpen = isBusinessOpen(websiteObj?.businessHours);
            const availableAgent = businessOpen ? await findAvailableOnlineAgent(websiteObj) : null;
            if (!businessOpen || !availableAgent) {
              const offlineNode = nextNode.offlineTargetNodeId
                ? flow.nodes.find((n) => n.id === nextNode.offlineTargetNodeId)
                : null;
              if (offlineNode) {
                await applyNodeSideEffects({ session, websiteId, flowId: flow._id, node: offlineNode, visitorMessage: text });
                return formatFlowNodeReply(flow, offlineNode, null, null, session);
              }
              if (!session.botMetadata) session.botMetadata = {};
              session.botMetadata.aiAssistantActive = true;
              session.botMetadata.currentNodeId = nextNode.id;
              session.botStatus = "in_progress";
              session.markModified("botMetadata");
              await session.save();
              const reasonText = !businessOpen ? "outside business hours" : "no live agent is online right now";
              return formatFlowNodeReply(
                flow,
                nextNode,
                `🤖 Live agent is unavailable (${reasonText}), so I've connected you to our **Gemini AI Assistant**! Ask your question below, or pick an option:`,
                null,
                session,
                false,
                buildSmartFallbackOptions(flow, nextNode)
              );
            }

            session.assignedAgent = availableAgent._id;
            if (!session.botMetadata) session.botMetadata = {};
            session.botMetadata.aiAssistantActive = false;
            await applyNodeSideEffects({ session, websiteId, flowId: flow._id, node: nextNode, visitorMessage: text });
            return formatFlowNodeReply(
              flow,
              nextNode,
              `✅ Connected to Live Agent (${availableAgent.name})! They have received your chat and will reply shortly.`,
              null,
              session,
              false,
              null,
              { assignedAgentId: availableAgent._id, assignedAgentName: availableAgent.name }
            );
          }

          if (session.botMetadata) session.botMetadata.aiAssistantActive = nextNode.type === "ai_faq";
          await applyNodeSideEffects({ session, websiteId, flowId: flow._id, node: nextNode, visitorMessage: text });
          const convType = nextNode.type === "lead_action" ? "lead" : (nextNode.type === "ticket_action" ? "ticket" : null);
          let ticketMsgOverride = null;
          if (nextNode.type === "ticket_action") {
            const tid = session.botMetadata?.lastTicketId;
            const ticketRef = tid ? ` (Ticket ID: ${tid})` : "";
            const baseUrl = String(env.clientUrl || "http://localhost:5173").replace(/\/+$/, "");
            const trackingLine = tid ? `\nTrack status: ${baseUrl}/ticket-status/${tid}` : "";
            ticketMsgOverride = `🎫 Thank you! Your support ticket has been created${ticketRef}. Our support team will update you soon.${trackingLine}`;
          }
          return formatFlowNodeReply(flow, nextNode, ticketMsgOverride, convType, session);
        }
      }

      // If visitor is currently on a Form step and submitted formData (or key:value text)
      if (currentNode.type === "form") {
        const submitted = parseFormSubmission(formData, text);
        if (submitted) {
          session.botMetadata.lastFormSubmission = submitted;
          session.markModified("botMetadata");

          await logFlowEvent({
            websiteId,
            flowId: flow._id,
            sessionId: session.sessionId,
            eventType: "option_clicked",
            nodeId: currentNode.id,
            nodeType: currentNode.type,
            optionLabel: currentNode.submitLabel || "Form Submitted",
            targetNodeId: currentNode.nextNodeId || ""
          });

          const rawNext = currentNode.nextNodeId
            ? flow.nodes.find((n) => n.id === currentNode.nextNodeId)
            : null;
          const nextNode = resolveRoutingNode(flow, rawNext, websiteObj, session, text);

          if (nextNode) {
            await applyNodeSideEffects({
              session,
              websiteId,
              flowId: flow._id,
              node: nextNode,
              visitorMessage: text,
              formData: submitted
            });
            const convType = nextNode.type === "lead_action" ? "lead" : (nextNode.type === "ticket_action" ? "ticket" : "form");
            return formatFlowNodeReply(flow, nextNode, null, convType, session);
          }

          const lead = await upsertLeadFromFlowMessage({ session, websiteId, visitorMessage: text, formData: submitted });
          const mainMenuNode = flow.nodes.find((n) => n.type === "question") || flow.nodes.find((n) => n.type === "trigger");
          session.botStatus = mainMenuNode ? "in_progress" : "resolved";
          session.resolvedByBot = !mainMenuNode;
          await session.save();

          const customerName = lead?.name && lead.name !== "Chatbot Lead" ? `, ${lead.name}` : "";
          const contactTarget = [lead?.email, lead?.phone].filter(Boolean).join(" / ");
          const confirmMsg = lead
            ? `Thank you${customerName}! Your inquiry is confirmed.\nReference ID: ${lead.crn}${contactTarget ? `\nWe'll reach out via ${contactTarget} shortly.` : "\nOur team will reach out shortly."}`
            : "Thank you! Your details have been submitted. Our team will get back to you shortly.";

          return formatFlowNodeReply(
            flow,
            currentNode,
            confirmMsg,
            lead ? "lead" : "form",
            session,
            true,
            mainMenuNode ? [{ label: "🏠 Main Menu", targetNodeId: mainMenuNode.id }] : []
          );
        }
      }

      // If current node is a plain Message step with a nextNodeId fallback
      if (currentNode.type === "message" && currentNode.nextNodeId) {
        const nextNode = flow.nodes.find((n) => n.id === currentNode.nextNodeId);
        if (nextNode) {
          await applyNodeSideEffects({ session, websiteId, flowId: flow._id, node: nextNode, visitorMessage: text });
          return formatFlowNodeReply(flow, nextNode);
        }
      }

      // If visitor is currently on a CRM Lead Capture node and submitted email/phone
      if (currentNode.type === "lead_action") {
        const lead = await upsertLeadFromFlowMessage({ session, websiteId, visitorMessage: text });
        if (lead) {
          await session.save();
          return {
            flowId: flow._id,
            flowName: flow.name,
            nodeId: currentNode.id,
            nodeType: currentNode.type,
            message: `Thank you! Your contact details have been saved (Ref: ${lead.crn}).`,
            options: currentNode.options || []
          };
        }
      }

      // If visitor is currently on an AI Knowledge node, Gemini fallback mode, or typed a free-text question
      if (
        currentNode.type === "ai_faq"
        || session.botMetadata?.aiAssistantActive
        || (text.length > 3 && ["question", "message"].includes(currentNode.type))
      ) {
        const kbAnswer = await queryWebsiteKnowledgeForFlow(websiteId, text, websiteObj);
        if (kbAnswer) {
          await logFlowEvent({
            websiteId,
            flowId: flow._id,
            sessionId: session.sessionId,
            eventType: "ai_resolved",
            nodeId: currentNode.id,
            nodeType: currentNode.type
          });
          const aiOptions = (currentNode.options && currentNode.options.length > 0)
            ? currentNode.options
            : buildSmartFallbackOptions(flow, currentNode);
          return formatFlowNodeReply(flow, currentNode, kbAnswer, null, session, true, aiOptions);
        }
      }
    }
  }

  // 2. Otherwise check for a trigger match (comma-separated keywords first, then welcome on idle session)
  const keywordFlow = activeFlows.find((f) => {
    if (f.triggerType && f.triggerType !== "keyword") return false;
    const keywords = String(f.triggerKeyword || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    return keywords.some((kw) => textLower.includes(kw));
  });

  const welcomeFlow = !keywordFlow && session.botStatus === "idle"
    ? activeFlows.find((f) => f.triggerType === "welcome")
    : null;

  const matchedFlow = keywordFlow || welcomeFlow;
  if (!matchedFlow || !Array.isArray(matchedFlow.nodes) || matchedFlow.nodes.length === 0) {
    return null;
  }

  const startNode = matchedFlow.nodes.find((n) => n.type === "trigger") || matchedFlow.nodes[0];

  await logFlowEvent({
    websiteId,
    flowId: matchedFlow._id,
    sessionId: session.sessionId,
    eventType: "flow_started",
    nodeId: startNode.id,
    nodeType: startNode.type
  });

  await applyNodeSideEffects({ session, websiteId, flowId: matchedFlow._id, node: startNode, visitorMessage: text });

  return formatFlowNodeReply(matchedFlow, startNode);
}

/**
 * Auto-triggers an active "welcome" ChatFlow when a fresh idle visitor session joins.
 */
export async function triggerWelcomeChatFlow({ session, websiteObj, pageUrl = "" }) {
  if (!session || !websiteObj) return null;
  if (session.assignedAgent) return null;
  if (session.botStatus !== "idle") return null;

  const existingMsgCount = await Message.countDocuments({ sessionId: session._id });
  if (existingMsgCount > 0) return null;

  let welcomeFlow = null;
  const safePageUrl = String(pageUrl || "").trim().toLowerCase();
  if (safePageUrl) {
    const urlFlows = await ChatFlow.find({
      websiteId: websiteObj._id,
      isActive: true,
      triggerType: "page_url"
    }).sort({ updatedAt: -1 });
    welcomeFlow = urlFlows.find((f) => {
      const patterns = String(f.triggerUrlPattern || "")
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      return patterns.some((pat) => safePageUrl.includes(pat));
    }) || null;
  }

  if (!welcomeFlow) {
    welcomeFlow = await ChatFlow.findOne({
      websiteId: websiteObj._id,
      isActive: true,
      triggerType: "welcome"
    }).sort({ updatedAt: -1 });
  }

  if (!welcomeFlow || !Array.isArray(welcomeFlow.nodes) || welcomeFlow.nodes.length === 0) {
    return null;
  }

  const rawStart = welcomeFlow.nodes.find((n) => n.type === "trigger") || welcomeFlow.nodes[0];
  const startNode = resolveRoutingNode(welcomeFlow, rawStart, websiteObj, session, "");

  await logFlowEvent({
    websiteId: websiteObj._id,
    flowId: welcomeFlow._id,
    sessionId: session.sessionId,
    eventType: "flow_started",
    nodeId: startNode.id,
    nodeType: startNode.type
  });

  await applyNodeSideEffects({
    session,
    websiteId: websiteObj._id,
    flowId: welcomeFlow._id,
    node: startNode,
    visitorMessage: ""
  });

  return formatFlowNodeReply(welcomeFlow, startNode);
}

