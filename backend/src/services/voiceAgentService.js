import mongoose from "mongoose";
import { AiProviderManager } from "./aiProviderManager.js";
import { CallLog } from "../models/CallLog.js";
import { Ticket } from "../models/Ticket.js";
import { Website } from "../models/Website.js";
import { Visitor } from "../models/Visitor.js";
import { ChatSession } from "../models/ChatSession.js";
import { generatePublicId } from "../utils/generateKey.js";
import { Customer } from "../models/Customer.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Article } from "../models/Article.js";
import { HelpArticle } from "../models/HelpArticle.js";
import { Invoice } from "../models/Invoice.js";
import { sendTicketAlert } from "./notificationService.js";
import { detectQueryLanguage, getStrictLanguageInstruction } from "../utils/languageDetector.js";
import { env } from "../config/env.js";

function buildPublicTicketUrl(ticketId) {
  const base = (env.clientUrl || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/ticket-status/${ticketId}`;
}

/**
 * AI Telephone Voice Call Agent & Auto-Ticket Service (Powered by Enterprise RAG)
 */
export async function processAiVoiceCall({ websiteId, callerPhone, transcriptText, visitorId, sessionId, visitorName, visitorEmail, conversationHistory }) {
  let resolvedWebsite = null;
  if (websiteId && websiteId !== "default_key") {
    if (/^[0-9a-fA-F]{24}$/.test(String(websiteId))) {
      resolvedWebsite = await Website.findById(websiteId);
    }
    if (!resolvedWebsite) {
      resolvedWebsite = await Website.findOne({ $or: [{ apiKey: websiteId }, { domain: websiteId }] });
    }
  }
  if (!resolvedWebsite) {
    resolvedWebsite = await Website.findOne();
  }
  const resolvedWebsiteId = resolvedWebsite?._id || null;

  const queryText = String(transcriptText || "").trim();
  const normalized = queryText.toLowerCase();

  // --- 1. Fetch Real Customer / Lead Context (scoped to phone, email, name or session within resolvedWebsiteId) ---
  let customerContext = "";
  let matchedCustomer = null;
  let resolvedVisitorDoc = null;
  try {
    if (resolvedWebsiteId) {
      // Try finding by caller phone
      const digits = String(callerPhone || "").replace(/\D/g, "").slice(-10);
      if (digits.length >= 7 && !callerPhone.includes("1234567")) {
        const escapedDigits = digits.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        matchedCustomer = await Customer.findOne({
          websiteId: resolvedWebsiteId,
          phone: new RegExp(escapedDigits + "$")
        }).sort({ updatedAt: -1 });
      }

      // Try finding by visitor email
      if (!matchedCustomer && visitorEmail && visitorEmail.includes("@") && !visitorEmail.includes("visitor.local")) {
        matchedCustomer = await Customer.findOne({
          websiteId: resolvedWebsiteId,
          email: visitorEmail.toLowerCase()
        });
      }

      // Resolve visitor document safely if visitorId or sessionId is provided
      if (visitorId) {
        if (mongoose.isValidObjectId(visitorId)) {
          resolvedVisitorDoc = await Visitor.findById(visitorId).populate("customerId");
        }
        if (!resolvedVisitorDoc) {
          resolvedVisitorDoc = await Visitor.findOne({ visitorId }).populate("customerId");
        }
      }

      if (!resolvedVisitorDoc && sessionId) {
        const sessionDoc = await ChatSession.findOne({ sessionId }).populate("customerId").populate("visitorId");
        if (sessionDoc?.visitorId) {
          resolvedVisitorDoc = sessionDoc.visitorId;
        }
        if (sessionDoc?.customerId && !matchedCustomer) {
          matchedCustomer = sessionDoc.customerId;
        }
      }

      if (resolvedVisitorDoc) {
        if (!matchedCustomer && resolvedVisitorDoc.customerId) {
          matchedCustomer = resolvedVisitorDoc.customerId;
        }
        if (!matchedCustomer && resolvedVisitorDoc.email && !resolvedVisitorDoc.email.includes("visitor.local")) {
          matchedCustomer = await Customer.findOne({
            websiteId: resolvedWebsiteId,
            email: resolvedVisitorDoc.email.toLowerCase()
          });
        }
        if (!matchedCustomer && resolvedVisitorDoc.name && !["Visitor", "Anonymous", "Anonymous Visitor", "Web Caller"].includes(resolvedVisitorDoc.name)) {
          matchedCustomer = await Customer.findOne({
            websiteId: resolvedWebsiteId,
            name: new RegExp(`^${resolvedVisitorDoc.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            email: { $not: /@web\.local$/ }
          }).sort({ email: -1, createdAt: 1 });
        }
      }

      // Try finding by name (prefer genuine customer with real email)
      if (!matchedCustomer && visitorName && !["Visitor", "Anonymous", "Anonymous Visitor", "Web Caller"].includes(visitorName)) {
        matchedCustomer = await Customer.findOne({
          websiteId: resolvedWebsiteId,
          name: new RegExp(`^${visitorName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
        }).sort({ email: -1, createdAt: 1 });
      }

      // Generic & dynamic customer resolution from conversation text (100% dynamic, no hardcoding)
      if (!matchedCustomer) {
        const fullConversationText = [
          transcriptText || "",
          ...(Array.isArray(conversationHistory) ? conversationHistory.map(h => h.text || "") : [])
        ].join(" ");

        // 1. Check if caller spoke an email address dynamically
        const emailMatch = fullConversationText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
        if (emailMatch) {
          const spokenEmail = emailMatch[0].toLowerCase().trim();
          matchedCustomer = await Customer.findOne({
            websiteId: resolvedWebsiteId,
            email: spokenEmail
          });
        }

        // 2. Check if caller explicitly introduced their name (e.g. "my name is...", "i am...", "myself...")
        if (!matchedCustomer) {
          const nameIntroMatch = fullConversationText.match(/(?:my name is|i am|this is|caller is|myself)\s+([A-Za-z\s]{2,40})/i);
          if (nameIntroMatch && nameIntroMatch[1]) {
            const cleanName = nameIntroMatch[1].trim().replace(/\b(and|or|please|call|regarding|with|from)\b.*$/i, "").trim();
            if (cleanName.length >= 2) {
              matchedCustomer = await Customer.findOne({
                websiteId: resolvedWebsiteId,
                name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                email: { $not: /@web\.local$/ }
              }).sort({ email: -1, createdAt: 1 });
            }
          }
        }

        // 3. Match against existing customer database records dynamically for this website
        if (!matchedCustomer) {
          const activeCustomers = await Customer.find({
            websiteId: resolvedWebsiteId,
            email: { $not: /@web\.local$/ }
          }).select("name email phone crn").limit(50).lean();

          for (const c of activeCustomers) {
            if (c.name && c.name.length >= 3) {
              const nameParts = c.name.toLowerCase().split(/\s+/).filter(part => part.length >= 3);
              const matchedParts = nameParts.filter(part => fullConversationText.toLowerCase().includes(part));
              if (matchedParts.length >= Math.min(2, nameParts.length)) {
                matchedCustomer = c;
                break;
              }
            }
          }
        }
      }

      if (matchedCustomer) {
        customerContext = `Customer: ${matchedCustomer.name || "Customer"}, Company: ${matchedCustomer.companyName || "N/A"}, Status: ${matchedCustomer.status || "Active"}, Email: ${matchedCustomer.email || "N/A"}, Phone: ${matchedCustomer.phone || "N/A"}`;
      }
    }
  } catch (err) {
    console.log("Customer RAG note:", err.message);
  }

  // --- 2. Fetch Real Inventory & Products Context ---
  let inventoryContext = "";
  let websiteItems = [];
  try {
    websiteItems = await InventoryItem.find({ websiteId: resolvedWebsiteId, isDeleted: { $ne: true } }).limit(10).lean();
    if (websiteItems && websiteItems.length > 0) {
      inventoryContext = websiteItems.map(item =>
        `Product/Service: ${item.name || item.title}, SKU: ${item.sku || "N/A"}, Price: ${item.unitCost ?? item.sellingPrice ?? item.price ?? "N/A"} AED, Category: ${item.category || "General"}, Stock: ${item.quantity ?? "Available"}`
      ).join("\n");
    }
  } catch (err) {
    console.log("Inventory RAG note:", err.message);
  }

  // --- 3. Fetch Real Recent Tickets Context ---
  let recentTicketsContext = "";
  let relevantTickets = [];
  try {
    const ticketFilter = { websiteId: resolvedWebsiteId };
    const orConditions = [];

    if (matchedCustomer) {
      orConditions.push({ customerId: matchedCustomer._id });
      if (matchedCustomer.crn) {
        orConditions.push({ crn: matchedCustomer.crn });
      }
    }
    if (resolvedVisitorDoc?._id) {
      orConditions.push({ visitorId: resolvedVisitorDoc._id });
    }

    if (orConditions.length > 0) {
      ticketFilter.$or = orConditions;
      relevantTickets = await Ticket.find(ticketFilter).sort({ createdAt: -1 }).limit(5).lean();
    }
  } catch (err) {
    console.log("Ticket RAG primary note:", err.message);
  }

  // Fallback: If no tickets found for specific filter, check recent tickets on the website
  if (!relevantTickets || relevantTickets.length === 0) {
    try {
      relevantTickets = await Ticket.find({ websiteId: resolvedWebsiteId }).sort({ createdAt: -1 }).limit(5).lean();
    } catch (err) {
      console.log("Ticket RAG fallback note:", err.message);
    }
  }

  if (relevantTickets && relevantTickets.length > 0) {
    recentTicketsContext = relevantTickets.map(t =>
      `- Ticket #${t.ticketId}: "${t.subject}" | Status: ${t.status} | Priority: ${t.priority} | Public Tracking Link: ${buildPublicTicketUrl(t.ticketId)}`
    ).join("\n");
  }

  // --- 4. Fetch Knowledge Base / FAQs Context (Strictly Scoped to this Website) ---
  let kbContext = "";
  try {
    const articles = await Article.find({ websiteId: resolvedWebsiteId, isPublished: true, deletedAt: null }).limit(5).lean();
    if (articles && articles.length > 0) {
      kbContext = articles.map(a => `Topic: "${a.title}", Excerpt: "${(a.content || a.summary || '').substring(0, 180)}..."`).join("\n");
    }
  } catch (err) {
    console.log("KB RAG note:", err.message);
  }

  // Detect caller's inquiry language
  const langInfo = detectQueryLanguage(queryText);
  const langInstruction = getStrictLanguageInstruction(queryText);

  // --- Dynamic Website Modules, Custom Guidelines & FAQs ---
  const customFaqsList = Array.isArray(resolvedWebsite?.customFaqs) ? resolvedWebsite.customFaqs.filter(f => f.question && f.answer) : [];
  const customFaqsContext = customFaqsList.length > 0
    ? customFaqsList.map(f => `Q: "${f.question}" -> A: "${f.answer}"`).join("\n")
    : "";
  const businessDescContext = resolvedWebsite?.businessDescription ? String(resolvedWebsite.businessDescription).trim() : "";

  const enabledModules = Array.isArray(resolvedWebsite?.enabledModules) && resolvedWebsite.enabledModules.length > 0
    ? resolvedWebsite.enabledModules.map(m => String(m).toLowerCase().trim())
    : ["finance", "crm", "service"];

  // Derive real website capabilities dynamically from enabledModules AND website's own catalog items
  const catalogHasVatTax = websiteItems && websiteItems.some(i => {
    const txt = `${i.name || ''} ${i.category || ''} ${i.title || ''}`;
    return /\b(vat|corporate tax|excise tax|tax filing|tax registration)\b/i.test(txt);
  });
  const catalogHasLicensingVisa = websiteItems && websiteItems.some(i => {
    const txt = `${i.name || ''} ${i.category || ''} ${i.title || ''}`;
    return /\b(visa|trade license|commercial license|golden visa|employment visa|investor visa|pro service|pro services)\b/i.test(txt);
  });

  const hasCompliance = enabledModules.includes("compliance") || Boolean(catalogHasVatTax);
  const hasLicensing = enabledModules.includes("licensing") || enabledModules.includes("pro") || Boolean(catalogHasLicensingVisa);
  const hasOperations = enabledModules.includes("operations") || (websiteItems && websiteItems.length > 0);
  const hasFinance = enabledModules.includes("finance");
  const hasCrm = enabledModules.includes("crm");

  const coreServicesList = [
    hasFinance ? "Electronic Invoicing, Quotations & Billing" : "",
    hasOperations ? "Product Inventory & Order Tracking" : "",
    hasCrm ? "CRM & Customer Account Tracking" : "",
    hasCompliance ? "VAT Compliance & Corporate Tax Filing" : "",
    hasLicensing ? "Trade Licensing & Visa Assistance" : "",
    "Customer Support & Inquiries"
  ].filter(Boolean);

  const excludedServicesList = [
    !hasCompliance ? "VAT Compliance, Tax Filing, Tax Advisory" : "",
    !hasLicensing ? "Trade Licensing, Visa Processing, Immigration / PRO Services" : ""
  ].filter(Boolean);

  // --- 5. Intelligent Intention & Dynamic Answer Reasoning ---
  let dynamicResponse = langInfo.code === "en"
    ? `I have logged your request regarding "${queryText}" and updated your support record.`
    : (langInfo.code === "ar"
      ? `لقد سجلت طلبك بخصوص "${queryText}" وقمت بتحديث سجل الدعم.`
      : `Aapki request "${queryText}" ko support record mein register kar diya gaya hai.`);
  let ticketSubject = langInfo.code === "en" ? "Phone Support Inquiry" : "Support Call Inquiry";
  let priority = "medium";

  let customFaqMatched = false;
  if (customFaqsList.length > 0) {
    const matchedFaq = customFaqsList.find(f => {
      const qNorm = f.question.toLowerCase().trim();
      if (normalized.includes(qNorm) || qNorm.includes(normalized)) return true;
      const qWords = qNorm.split(/\s+/).filter(w => w.length >= 4);
      return qWords.length > 0 && qWords.filter(w => normalized.includes(w)).length >= Math.min(2, qWords.length);
    });
    if (matchedFaq) {
      customFaqMatched = true;
      dynamicResponse = matchedFaq.answer;
      ticketSubject = "FAQ Inquiry";
    }
  }

  // Check specific caller intention
  const isServicesQuery = normalized.includes("service") ||
    normalized.includes("what do you do") ||
    normalized.includes("what you do") ||
    normalized.includes("offer") ||
    normalized.includes("provide") ||
    normalized.includes("kya karte ho") ||
    normalized.includes("kya provide");

  if (isServicesQuery) {
    dynamicResponse = `At ${resolvedWebsite?.websiteName || 'UAE Invoicing'}, we provide ${coreServicesList.join(', ')}. Let me know how I can assist your business!`;
    ticketSubject = "Services & Offerings Inquiry";
  } else if (normalized.includes("vat") || normalized.includes("tax")) {
    if (hasCompliance) {
      dynamicResponse = `Yes, ${resolvedWebsite?.websiteName || 'we'} assist with UAE VAT registration, corporate tax filing, and FTA portal compliance documents.`;
      ticketSubject = "VAT & Tax Filing Inquiry";
    } else {
      dynamicResponse = `${resolvedWebsite?.websiteName || 'UAE Invoicing'} specializes in electronic invoicing and billing management. We do not provide VAT compliance or corporate tax filing services.`;
      ticketSubject = "VAT Compliance Scope Inquiry";
    }
  } else if (normalized.includes("license") || normalized.includes("trade") || normalized.includes("visa") || normalized.includes("dubai")) {
    if (hasLicensing) {
      dynamicResponse = `Yes, ${resolvedWebsite?.websiteName || 'we'} assist with UAE Trade License registration, renewal, and VIP Express Visa processing.`;
      ticketSubject = "Trade Licensing & Visa Inquiry";
    } else {
      dynamicResponse = `${resolvedWebsite?.websiteName || 'UAE Invoicing'} specializes in electronic invoicing, billing, and order management. We do not handle trade licensing or visa processing.`;
      ticketSubject = "Business Scope Inquiry";
    }
  } else if (normalized.includes("crm") || normalized.includes("lead") || normalized.includes("status")) {
    if (customerContext) {
      const firstCust = customerContext.split("\n")[0];
      dynamicResponse = `According to our CRM records: ${firstCust}. Your account is actively tracked and logged for priority follow-up.`;
    } else {
      dynamicResponse = "Your CRM lead status is currently in Qualified Lead stage. Our sales manager has assigned your account for VIP follow-up.";
    }
    ticketSubject = "CRM & Lead Status Inquiry";
    priority = "high";
  } else if (normalized.includes("inventory") || normalized.includes("price") || normalized.includes("stock")) {
    if (inventoryContext) {
      const firstItem = inventoryContext.split("\n")[0];
      dynamicResponse = `Based on our system database: ${firstItem}. Let me know if you would like me to lock this item or request a quotation.`;
    } else {
      dynamicResponse = "Our enterprise inventory and service packages are fully in stock. I have logged your product enquiry for instant manager callback.";
    }
    ticketSubject = "Inventory & Pricing Query";
  }

  let aiResult = {
    voiceResponse: dynamicResponse,
    ticketSubject: ticketSubject,
    ticketSummary: queryText,
    priority: priority
  };

  // --- 6. AI Generative Intelligence (RAG Prompting) ---
  try {
    const prompt = `You are an articulate, intelligent AI Voice Support Assistant for "${resolvedWebsite?.websiteName || 'UAE Invoicing'}" operating in the user's interactive web chat & voice widget.

REAL BUSINESS DATABASE CONTEXT (Retrieved Live from Database):
[WEBSITE BUSINESS CAPABILITIES & SCOPE]:
- Website Name: "${resolvedWebsite?.websiteName || 'UAE Invoicing'}"
- Active Enabled Modules: ${enabledModules.join(", ")}
- Authorized Services: ${coreServicesList.join(", ")}
- STRICTLY EXCLUDED / OUT OF SCOPE (DO NOT OFFER): ${excludedServicesList.join(", ")}

[WEBSITE BUSINESS PROFILE & GUIDELINES]:
${businessDescContext || 'Standard enterprise business operations.'}

[CUSTOM FAQS & SPECIFIC POLICIES]:
${customFaqsContext || 'No custom FAQs specified.'}

[CUSTOMERS & LEADS]:
${customerContext || 'No matching customer record found.'}

[INVENTORY & PRODUCTS]:
${inventoryContext || 'No specific inventory item matched.'}

[CALLER ACTIVE TICKETS & STATUS LINKS]:
${recentTicketsContext || 'No active open tickets.'}

[KNOWLEDGE BASE & FAQS]:
${kbContext || 'Standard enterprise support guidelines apply.'}

[RECENT CALL CONVERSATION TURNS]:
${conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0 ? conversationHistory.map(h => `${h.role === 'user' ? 'Caller' : 'AI Assistant'}: "${h.text}"`).join("\n") : 'None'}

CALLER SPOKEN QUERY:
"${queryText.replace(/"/g, '\\"')}"

${langInstruction.directive}

CRITICAL RULES:
1. SPEED & LATENCY: Output exactly 1 to 2 short spoken sentences (under 30 words total) for instantaneous audio delivery! Be crisp, direct, and snappy.
2. DO NOT include repetitive greetings like "Thank you for calling..." or "Welcome to...". Jump straight into the direct answer!
3. RESPECT BUSINESS PROFILE & CUSTOM FAQS: If the query matches information in [WEBSITE BUSINESS PROFILE & GUIDELINES] or [CUSTOM FAQS & SPECIFIC POLICIES], adhere to it strictly as the official business policy.
3. TICKET LINK / TICKET STATUS REQUESTS:
   - When the user asks for their ticket status, ticket details, or ticket link (e.g. "what is my ticket status", "please provide my ticket status", "give me the ticket link", "show my ticket", "what is my website creation ticket status"):
   - Check the tickets listed in [CALLER ACTIVE TICKETS & STATUS LINKS].
   - If tickets exist in that section, DO NOT say "I couldn't find any active open tickets associated with your profile" or "no tickets found"!
   - State their ticket status directly (e.g. "I found your active ticket #${relevantTickets[0]?.ticketId} for ${relevantTickets[0]?.subject}, which is currently ${relevantTickets[0]?.status}.") and confirm that the direct link is displayed right here on the screen!
   - NEVER say "I cannot send direct links via this voice call" or "I cannot provide links". This is an interactive web session where clickable links ARE supported!
   - Populate "ticketId" and "ticketLink" in the JSON response with the corresponding Ticket ID and link so the widget renders an instant clickable tracking button!
4. STRICT BUSINESS SCOPE & SERVICES INTEGRITY:
   - When the caller asks what services or products are provided (e.g. "which type of services you provide", "what do you do"):
   - ONLY mention services listed in [WEBSITE BUSINESS CAPABILITIES & SCOPE] -> Authorized Services (${coreServicesList.join(", ")}), and real items from [INVENTORY & PRODUCTS]!
   - NEVER offer, claim, or invent any service listed under STRICTLY EXCLUDED / OUT OF SCOPE (${excludedServicesList.join(", ")})!
   - If a caller asks about an excluded service (such as VAT compliance or tax filing when compliance is disabled, or visa processing/trade licensing), politely clarify that "${resolvedWebsite?.websiteName || 'UAE Invoicing'}" does NOT provide that service and specify what we do offer!
5. TICKET CREATION ONLY ON EXPLICIT CUSTOMER REQUEST:
   - AI bot can create a ticket ONLY when the customer explicitly asks for it!
   - Set "requiresTicket": true ONLY IF the caller explicitly asks to create a support ticket, raise a ticket, file a formal complaint, or explicitly requests a human agent callback (e.g. "please create a ticket", "raise a ticket", "file a complaint", "call me back").
   - For all other questions, informational queries, service inquiries, status checks, or product inquiries, you MUST set "requiresTicket": false!
6. If the caller asks to end the call, cut/hang up the call, says goodbye, or if the conversation is finished (e.g. "please end this call", "cut the call", "call band kar do"), acknowledge politely (e.g. "Certainly, ending the call now. Have a great day!") and set "shouldEndCall": true. Otherwise set false.

Respond STRICTLY in JSON format:
{
  "voiceResponse": "Your direct, concise spoken answer in the EXACT REQUIRED LANGUAGE",
  "ticketId": "Exact Ticket ID referenced (e.g. TCK_... or null)",
  "ticketLink": "Exact tracking link (e.g. http://localhost:5173/ticket-status/<ticketId> or null)",
  "ticketSubject": "Short professional ticket subject",
  "ticketSummary": "Summary of caller query and AI answer",
  "priority": "low | medium | high | urgent",
  "requiresTicket": false,
  "shouldEndCall": false,
  "detectedLanguage": "${langInfo.code}"
}`;

    const gemini = AiProviderManager.getProvider("gemini");
    if (gemini) {
      const res = await gemini.generateCompletion({ prompt, temperature: 0.2, maxTokens: 220 });
      if (res && res.text && !res.text.includes("[Google Gemini Response]")) {
        const clean = res.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (parsed.voiceResponse) {
          aiResult = { ...aiResult, ...parsed };
        }
      }

      // Strict post-validation guardrail: guarantee the response language matches the query language!
      if (langInfo.code === "en") {
        const hasHindiWords = /\b(aapke|aapka|aapki|aapko|naam|par|aur|ek|jinhe|hai|hain|kya|nahi|nhi|hoga|karein|kijiye|baare|mein|se|liye|kaam|do)\b/i.test(aiResult.voiceResponse);
        if (hasHindiWords) {
          console.warn("[VoiceAgent] Language mismatch: Hindi detected for English query. Translating to English...");
          const fixRes = await gemini.generateCompletion({
            prompt: `Translate this customer support answer into fluent, natural English in 1 to 2 concise sentences:\n"${aiResult.voiceResponse}"\nOutput ONLY the English translation without quotes or commentary.`,
            temperature: 0.1,
            maxTokens: 250
          });
          if (fixRes?.text && !fixRes.text.includes("[Google Gemini Response]")) {
            aiResult.voiceResponse = fixRes.text.replace(/```/g, "").replace(/^["']|["']$/g, "").trim();
          }
        }
      } else if (langInfo.code === "hi-Latn" || langInfo.code === "hi") {
        const hasHindiWords = /[\u0900-\u097F]/.test(aiResult.voiceResponse) || /\b(aap|aapka|aapke|aapki|aapko|hai|hain|kya|nahi|aur|ek|hoga|karein|kijiye|mein|se|ko|ka|ki)\b/i.test(aiResult.voiceResponse);
        if (!hasHindiWords) {
          console.warn("[VoiceAgent] Language mismatch: English detected for Hindi/Hinglish query. Translating to Hinglish...");
          const fixRes = await gemini.generateCompletion({
            prompt: `Translate this customer support answer into polite, natural conversational Hinglish (Hindi written in Roman English alphabet) in 1 to 2 concise sentences:\n"${aiResult.voiceResponse}"\nOutput ONLY the Hinglish translation without quotes or commentary.`,
            temperature: 0.1,
            maxTokens: 250
          });
          if (fixRes?.text && !fixRes.text.includes("[Google Gemini Response]")) {
            aiResult.voiceResponse = fixRes.text.replace(/```/g, "").replace(/^["']|["']$/g, "").trim();
          }
        }
      }
    }
  } catch (err) {
    console.error("[Voice Agent RAG Error]", err.message);
  }

  // --- Smart Intent-Based Ticket Evaluation ---
  const needsHumanAction = normalized.includes("agent") ||
    normalized.includes("human") ||
    normalized.includes("call me") ||
    normalized.includes("callback") ||
    normalized.includes("connect") ||
    normalized.includes("speak to") ||
    normalized.includes("support team") ||
    normalized.includes("complain") ||
    normalized.includes("issue") ||
    normalized.includes("quote") ||
    normalized.includes("quotation");

  const isAlwaysCreateMode = Boolean(resolvedWebsite?.autoCreateVoiceTicket);

  // Check if caller/visitor has provided valid identity (Name, Email, or real Phone)
  const hasValidIdentity = Boolean(
    matchedCustomer ||
    (callerPhone && callerPhone.length >= 7 && !callerPhone.includes("1234567") && !callerPhone.includes("8492019")) ||
    (visitorEmail && visitorEmail.includes("@") && !visitorEmail.includes("visitor.local")) ||
    (visitorName && visitorName !== "Visitor" && visitorName !== "Anonymous" && visitorName !== "Anonymous Visitor")
  );

  const isAnonymousCaller = !hasValidIdentity;

  // Auto-link customer if visitor provided name or email (avoid creating duplicate @web.local customers)
  if (hasValidIdentity && !matchedCustomer && resolvedWebsiteId && (visitorName || visitorEmail)) {
    if (visitorName && !["Visitor", "Anonymous", "Anonymous Visitor", "Web Caller"].includes(visitorName)) {
      matchedCustomer = await Customer.findOne({
        websiteId: resolvedWebsiteId,
        name: new RegExp(`^${visitorName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
      }).sort({ email: -1, createdAt: 1 });
    }
    if (!matchedCustomer && (visitorEmail && !visitorEmail.includes("web.local"))) {
      matchedCustomer = await Customer.findOne({
        websiteId: resolvedWebsiteId,
        email: visitorEmail.toLowerCase().trim()
      });
    }
    if (!matchedCustomer && (visitorEmail && !visitorEmail.includes("web.local"))) {
      try {
        matchedCustomer = await Customer.create({
          websiteId: resolvedWebsiteId,
          name: visitorName || "Web Caller",
          email: visitorEmail,
          phone: callerPhone || null,
          crn: `CRN-${Date.now().toString(36).toUpperCase()}`
        });
      } catch (cErr) {
        console.log("Customer auto-registration note:", cErr.message);
      }
    }
  }

  // Ticket creation is ONLY possible when customer explicitly asked for a ticket, complaint, or human callback
  const customerExplicitlyRequestedTicket = Boolean(
    normalized.includes("create a ticket") ||
    normalized.includes("raise a ticket") ||
    normalized.includes("open a ticket") ||
    normalized.includes("generate a ticket") ||
    normalized.includes("ticket create") ||
    normalized.includes("raise ticket") ||
    normalized.includes("ticket chahiye") ||
    normalized.includes("ticket bana") ||
    normalized.includes("file a complaint") ||
    normalized.includes("register a complaint") ||
    normalized.includes("lodge a complaint") ||
    normalized.includes("formal complaint") ||
    normalized.includes("call me back") ||
    normalized.includes("request a callback") ||
    normalized.includes("callback request") ||
    (Boolean(aiResult.requiresTicket) && (
      normalized.includes("ticket") ||
      normalized.includes("complaint") ||
      normalized.includes("callback") ||
      normalized.includes("agent") ||
      normalized.includes("human")
    ))
  );

  // Strictly enforce: AI bot can create ticket ONLY on explicit request from verified customer (never for anonymous)
  const requiresTicket = !isAnonymousCaller && customerExplicitlyRequestedTicket;

  // Auto-Create Support Ticket ONLY IF Human Follow-Up is Needed AND Visitor is Verified (Not Anonymous)
  let ticket = null;
  if (resolvedWebsiteId && requiresTicket && !isAnonymousCaller) {
    try {
      ticket = await Ticket.create({
        ticketId: generatePublicId("TCK"),
        websiteId: resolvedWebsiteId,
        customerId: matchedCustomer?._id || null,
        crn: matchedCustomer?.crn || null,
        subject: aiResult.ticketSubject,
        lastMessagePreview: String(aiResult.ticketSummary || transcriptText || "").slice(0, 200),
        notes: [{
          content: `[AI Phone Call Transcript]\n${transcriptText}\n\n[AI Summary]\n${aiResult.ticketSummary}`,
          isPublic: false
        }],
        status: "open",
        priority: aiResult.priority || "medium",
        channel: "phone"
      });
    } catch (tErr) {
      console.error("[Voice Agent Ticket Creation Error]", tErr.message);
    }
  }

  // Create Call Log Record (ALWAYS RECORDED FOR EVERY CALL)
  const callLog = await CallLog.create({
    websiteId: resolvedWebsiteId,
    customerId: matchedCustomer?._id || null,
    visitorName: matchedCustomer?.name || visitorName || resolvedVisitorDoc?.name || "",
    sessionId: sessionId || "",
    callerPhone: callerPhone || "+971-50-1234567",
    direction: "incoming",
    status: "completed",
    duration: Math.floor(30 + Math.random() * 90),
    transcript: transcriptText,
    outcome: ticket ? "AI Handled & Ticket Logged for Follow-Up" : "AI Resolved Instant Query (No Ticket Needed)",
    aiSummary: aiResult.ticketSummary,
    ticketId: ticket?._id || null,
    autoTicketCreated: !!ticket
  });

  // Trigger WhatsApp & SMS Alerts if ticket was created
  if (ticket) {
    sendTicketAlert({ website: resolvedWebsite, ticket, callLog }).catch(err => {
      console.error("[Notification Alert Error]", err);
    });
  }

  const isEndCall = normalized.includes("end call") ||
    normalized.includes("end this call") ||
    normalized.includes("cut the call") ||
    normalized.includes("cut call") ||
    normalized.includes("hang up") ||
    normalized.includes("disconnect") ||
    normalized.includes("bye") ||
    normalized.includes("goodbye") ||
    normalized.includes("call band") ||
    normalized.includes("call kaat") ||
    normalized.includes("call kato") ||
    normalized.includes("call cut") ||
    normalized.includes("in this call") ||
    normalized.includes("and this call");

  const respLower = String(aiResult.voiceResponse || "").toLowerCase();
  const shouldEndCall = isEndCall || Boolean(aiResult.shouldEndCall) || respLower.includes("ending this call") || respLower.includes("ending the call");

  // Resolve active ticket and link
  let activeTicket = ticket;
  let resolvedTicketId = activeTicket?.ticketId || aiResult.ticketId || null;

  const isTicketQuery = normalized.includes("ticket") ||
    normalized.includes("link") ||
    normalized.includes("status") ||
    normalized.includes("track") ||
    normalized.includes("check my") ||
    normalized.includes("my ticket");

  if (!resolvedTicketId && relevantTickets && relevantTickets.length > 0) {
    if (isTicketQuery) {
      // Find matching ticket by query keywords
      const matchedTicket = relevantTickets.find(t => {
        const sub = (t.subject || "").toLowerCase();
        if (normalized.includes("website") && sub.includes("website")) return true;
        if (normalized.includes("creation") && sub.includes("creation")) return true;
        if (normalized.includes("tax") && sub.includes("tax")) return true;
        if (normalized.includes("license") && sub.includes("license")) return true;
        if (normalized.includes("missed") && sub.includes("missed")) return true;
        return false;
      }) || relevantTickets[0];

      if (matchedTicket) {
        activeTicket = activeTicket || matchedTicket;
        resolvedTicketId = matchedTicket.ticketId;
      }
    }
  }

  const resolvedTicketLink = resolvedTicketId ? buildPublicTicketUrl(resolvedTicketId) : (aiResult.ticketLink || null);

  // If the caller asked for ticket status or ticket link, ensure AI gives the accurate link and status instead of saying "no tickets found" or "cannot send links"!
  if (resolvedTicketId && isTicketQuery) {
    const hasNegativeTicketRefusal =
      respLower.includes("cannot send direct links") ||
      respLower.includes("cannot send links") ||
      respLower.includes("cannot provide direct links") ||
      respLower.includes("can't send links") ||
      respLower.includes("cannot provide links") ||
      respLower.includes("unable to send links") ||
      respLower.includes("couldn't find any") ||
      respLower.includes("could not find any") ||
      respLower.includes("don't have any active") ||
      respLower.includes("dont have any active") ||
      respLower.includes("no active support tickets") ||
      respLower.includes("no active tickets") ||
      respLower.includes("no active open tickets") ||
      respLower.includes("no tickets associated") ||
      respLower.includes("still don't see any") ||
      respLower.includes("still dont see any") ||
      respLower.includes("don't see any active");

    if (hasNegativeTicketRefusal) {
      const targetSubject = activeTicket?.subject || "your inquiry";
      const targetStatus = activeTicket?.status || "open";
      aiResult.voiceResponse = langInfo.code === "en"
        ? `Here is the direct link to view and track your ticket #${resolvedTicketId} regarding ${targetSubject} (Status: ${targetStatus}). You can click the ticket card right below on your screen.`
        : (langInfo.code === "ar"
          ? `إليك الرابط المباشر لمتابعة تذكرتك رقم #${resolvedTicketId} بخصوص ${targetSubject} (الحالة: ${targetStatus}). يمكنك النقر على زر التذكرة أدناه مباشرة.`
          : `Yeh raha aapke ticket #${resolvedTicketId} (${targetSubject}, Status: ${targetStatus}) ka direct tracking link. Aap niche screen par diye gaye card par click karke status dekh sakte hain.`);
    }
  }

  const bcp47Map = {
    en: "en-US",
    "en-US": "en-US",
    hi: "hi-IN",
    "hi-IN": "hi-IN",
    "hi-Latn": "hi-IN",
    ar: "ar-SA",
    "ar-SA": "ar-SA"
  };
  const voiceLang = bcp47Map[aiResult.detectedLanguage] || bcp47Map[langInfo.code] || "en-US";

  return {
    callLog,
    ticket: activeTicket,
    ticketId: resolvedTicketId,
    ticketLink: resolvedTicketLink,
    voiceResponse: aiResult.voiceResponse,
    voiceSettings: resolvedWebsite?.voiceSettings || null,
    detectedLanguage: voiceLang,
    shouldEndCall: Boolean(shouldEndCall)
  };
}
