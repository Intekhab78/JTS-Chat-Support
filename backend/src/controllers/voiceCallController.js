import { CallLog } from "../models/CallLog.js";
import { Website } from "../models/Website.js";
import { processAiVoiceCall } from "../services/voiceAgentService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

export const getCallLogs = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const query = {};
  if (websiteId) {
    query.websiteId = websiteId;
  } else {
    const ownedIds = await getOwnedWebsiteIds(req.user);
    if (ownedIds && ownedIds.length > 0) {
      query.websiteId = { $in: ownedIds };
    }
  }

  const logs = await CallLog.find(query)
    .populate("ticketId", "ticketId subject status priority")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(logs);
});

export const getCallAnalytics = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const query = {};
  if (websiteId) {
    query.websiteId = websiteId;
  } else {
    const ownedIds = await getOwnedWebsiteIds(req.user);
    if (ownedIds && ownedIds.length > 0) {
      query.websiteId = { $in: ownedIds };
    }
  }

  const totalCalls = await CallLog.countDocuments(query);
  const ticketCalls = await CallLog.countDocuments({ ...query, autoTicketCreated: true });
  const resolvedCalls = totalCalls - ticketCalls;

  const logs = await CallLog.find(query).select("duration transcript outcome createdAt");
  const avgDuration = totalCalls > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.duration || 0), 0) / totalCalls) : 0;

  const topics = { "Trade License": 0, "VAT & Tax": 0, "Dubai Visa": 0, "CRM & Status": 0, "General Inquiry": 0 };
  logs.forEach(l => {
    const txt = (l.transcript || "").toLowerCase();
    if (txt.includes("license") || txt.includes("trade")) topics["Trade License"]++;
    else if (txt.includes("vat") || txt.includes("tax")) topics["VAT & Tax"]++;
    else if (txt.includes("visa")) topics["Dubai Visa"]++;
    else if (txt.includes("crm") || txt.includes("lead") || txt.includes("status")) topics["CRM & Status"]++;
    else topics["General Inquiry"]++;
  });

  res.json({
    totalCalls,
    ticketCalls,
    resolvedCalls,
    aiResolutionRate: totalCalls > 0 ? Math.round((resolvedCalls / totalCalls) * 100) : 100,
    avgDurationSeconds: avgDuration,
    topicBreakdown: topics
  });
});

export const simulateIncomingCall = asyncHandler(async (req, res) => {
  const { websiteId, callerPhone, transcriptText, prompt } = req.body;

  let resolvedWebsite = null;
  if (websiteId) {
    if (String(websiteId).length === 24) {
      resolvedWebsite = await Website.findById(websiteId);
    }
    if (!resolvedWebsite) {
      resolvedWebsite = await Website.findOne({ $or: [{ apiKey: websiteId }, { domain: websiteId }] });
    }
  }

  if (!resolvedWebsite && req.user) {
    try {
      const ownedIds = await getOwnedWebsiteIds(req.user);
      if (ownedIds && ownedIds.length > 0) {
        resolvedWebsite = await Website.findById(ownedIds[0]);
      }
    } catch (e) {
      // ignore
    }
  }

  if (!resolvedWebsite) {
    resolvedWebsite = await Website.findOne();
  }

  const result = await processAiVoiceCall({
    websiteId: resolvedWebsite?._id || null,
    callerPhone: callerPhone || "+971-50-8492019",
    transcriptText: transcriptText || prompt || "Hello, I am calling regarding my PRO Express Visa Application for Dubai."
  });

  res.status(201).json(result);
});
