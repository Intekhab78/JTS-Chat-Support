import { Customer } from "../models/Customer.js";
import { ChatSession } from "../models/ChatSession.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { getSocketServer } from "../sockets/index.js";
import { calculateCustomerLTV } from "../services/revenueService.js";
import { getNextBestAction, calculateHeatScore, calculateWinProbability, calculateChurnRisk } from "../services/intelligenceService.js";
import {
  CRM_DEAL_STAGES,
  CRM_RECORD_TYPES
} from "../constants/domain.js";
import AppError from "../utils/AppError.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import { listActivityForEntity, createActivityEvent } from "../services/activityService.js";
import { Visitor } from "../models/Visitor.js";

const enrichmentCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getEnrichedData(doc) {
  const cacheKey = doc._id.toString();
  const cached = enrichmentCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  const [nba, ltv] = await Promise.all([
    getNextBestAction(doc),
    doc.status === "customer" ? calculateCustomerLTV(doc._id) : Promise.resolve(0)
  ]);

  const data = { nba, ltv };
  enrichmentCache.set(cacheKey, { timestamp: Date.now(), data });

  if (enrichmentCache.size > 1000) {
    const oldest = enrichmentCache.keys().next().value;
    enrichmentCache.delete(oldest);
  }

  return data;
}

export async function createAndEmitCrmNotification({ recipient, type, title, message, link }) {
  const notification = await createNotification({ recipient, type, title, message, link });
  const io = getSocketServer();
  if (notification && io && recipient) {
    io.to(`us_${recipient}`).emit("notification:new", notification);
  }
  return notification;
}

export async function getPurchaseRecipientsForWebsite(websiteId, fallbackManagerId = null) {
  const website = await Website.findById(websiteId).select("managerId");
  const managerId = website?.managerId || fallbackManagerId || null;
  const recipients = await User.find({
    role: "purchase",
    $or: [
      { websiteIds: websiteId },
      ...(managerId ? [{ managerId }] : [])
    ]
  }).select("_id");
  return [...new Set(recipients.map((user) => String(user._id)))];
}

export function normalizeCompanyName(value = "") {
  const str = String(value || "").trim();
  const lower = str.toLowerCase();
  if (lower === "undefined" || lower === "null") return "";
  return lower;
}

export function normalizePipelineStage(value = "") {
  const stage = String(value || "").trim().toLowerCase();
  if (["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"].includes(stage)) return stage;
  if (stage === "hold") return "contacted";
  if (stage === "proposal_sent" || stage === "proposition") return "proposal";
  return "new";
}

export function resolveStatusFromPipelineStage(stage) {
  const normalizedStage = normalizePipelineStage(stage);
  if (normalizedStage === "won") return "won";
  if (normalizedStage === "lost") return "lost";
  return normalizedStage;
}

export function probabilityFromStage(stage) {
  const map = {
    new: 10,
    contacted: 25,
    qualified: 50,
    proposal: 70,
    negotiation: 85,
    won: 100,
    lost: 0
  };
  return map[normalizePipelineStage(stage)] ?? 10;
}

export function normalizeRecordType(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (CRM_RECORD_TYPES.includes(normalized)) return normalized;
  if (normalized === "client") return "customer";
  return "lead";
}

export function normalizeLeadStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  const validStages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
  if (validStages.includes(normalized)) return normalized;
  return "new";
}

export function normalizeDealStage(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (CRM_DEAL_STAGES.includes(normalized)) return normalized;
  if (normalized === "proposal_sent") return "proposal";
  return null;
}

export function deriveLifecycleFields({
  pipelineStage,
  recordType,
  leadStatus,
  dealStage
} = {}) {
  const normalizedPipelineStage = normalizePipelineStage(pipelineStage);

  if (normalizedPipelineStage === "won") {
    return {
      recordType: "customer",
      leadStatus: "qualified",
      dealStage: "won",
      pipelineStage: "won",
      status: "won"
    };
  }

  if (normalizedPipelineStage === "lost") {
    return {
      recordType: "deal",
      leadStatus: "qualified",
      dealStage: "lost",
      pipelineStage: "lost",
      status: "lost"
    };
  }

  const isDealStage = ["qualified", "proposal", "negotiation"].includes(normalizedPipelineStage);

  if (isDealStage) {
    return {
      recordType: "deal",
      leadStatus: "qualified",
      dealStage: normalizedPipelineStage,
      pipelineStage: normalizedPipelineStage,
      status: normalizedPipelineStage
    };
  }

  return {
    recordType: "lead",
    leadStatus: normalizedPipelineStage,
    dealStage: null,
    pipelineStage: normalizedPipelineStage,
    status: normalizedPipelineStage
  };
}

export function computeLeadScore(customerLike = {}) {
  const budget = Number(customerLike.budget || 0);
  const notesCount = customerLike.internalNotes?.length || 0;
  const communicationsCount = customerLike.communications?.length || 0;
  const source = String(customerLike.leadSource || "").toLowerCase();
  const score =
    (budget >= 100000 ? 30 : budget >= 50000 ? 22 : budget > 0 ? 12 : 0) +
    (communicationsCount >= 5 ? 25 : communicationsCount >= 2 ? 15 : communicationsCount > 0 ? 8 : 0) +
    (notesCount >= 4 ? 15 : notesCount >= 2 ? 10 : notesCount > 0 ? 5 : 0) +
    (["referral", "google", "website"].includes(source) ? 15 : source ? 8 : 0) +
    (customerLike.lastFollowUpAt ? 10 : 0) +
    (customerLike.requirement ? 10 : 0) +
    (customerLike.timeline ? 10 : 0);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function categoryFromScore(score) {
  if (score >= 75) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export function expectedRevenueFromCustomer(customerLike = {}) {
  return Math.round((Number(customerLike.leadValue || 0) * Number(customerLike.probability || 0)) / 100);
}

export function validateLifecycleTransition(current, next, isNew = false) {
  const currentType = normalizeRecordType(current.recordType);
  const nextType = normalizeRecordType(next.recordType);

  if (isNew && nextType === "customer") {
    throw new AppError("Cannot create a new record directly as a 'customer'. Must start as a 'lead'.", 400);
  }

  if (!isNew && currentType === "lead" && nextType === "customer") {
    throw new AppError("Lead must first be converted to a deal before becoming a customer", 400);
  }

  if (nextType === "customer" && normalizeDealStage(next.dealStage) !== "won") {
    throw new AppError("Only won deals can become customers", 400);
  }
}

export async function buildChatContextFromSession(sessionId) {
  if (!sessionId) return {};

  const session = await ChatSession.findById(sessionId)
    .populate("visitorId", "visitorId country city device browser os")
    .select("visitorId currentPage firstPage");

  if (!session) return {};

  return {
    sessionId: session._id,
    pageUrl: session.currentPage || "",
    firstPage: session.firstPage || "",
    device: [
      session.visitorId?.device,
      session.visitorId?.browser,
      session.visitorId?.os
    ].filter(Boolean).join(" / "),
    duration: session.createdAt && session.lastMessageAt
      ? `${Math.floor((new Date(session.lastMessageAt) - new Date(session.createdAt)) / 60000)} min`
      : "Unknown",
    timestamp: session.createdAt,
    location: [session.visitorId?.city, session.visitorId?.country].filter(Boolean).join(", ")
  };
}

export function buildDuplicateFilters({ email, phone, companyName, websiteId, excludeId = null }) {
  const filters = [];
  if (email) filters.push({ email: String(email).trim().toLowerCase() });
  if (phone) filters.push({ phone: String(phone).trim() });
  if (companyName) filters.push({ companyName: normalizeCompanyName(companyName) });
  const query = {
    websiteId,
    archivedAt: null
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  if (filters.length > 0) {
    query.$or = filters;
  }
  return query;
}

export async function findDuplicateCandidates({ email, phone, companyName, websiteId, excludeId = null }) {
  if (!email && !phone && !companyName) return [];
  const matches = await Customer.find(buildDuplicateFilters({ email, phone, companyName, websiteId, excludeId }))
    .select("_id name email phone companyName pipelineStage status ownerId archivedAt")
    .populate("ownerId", "name email role")
    .limit(10);

  return matches.map((match) => {
    let score = 0;
    if (email && String(match.email || "").toLowerCase() === String(email).trim().toLowerCase()) score += 60;
    if (phone && String(match.phone || "").trim() === String(phone).trim()) score += 30;
    if (companyName && normalizeCompanyName(match.companyName) === normalizeCompanyName(companyName)) score += 20;
    return { ...match.toObject(), duplicateScore: score };
  }).sort((a, b) => b.duplicateScore - a.duplicateScore);
}

export async function emitCustomerActivity({ actor, websiteId, customerId, type, summary, metadata = {} }) {
  await createActivityEvent({
    actor,
    websiteId,
    entityType: "customer",
    entityId: customerId,
    type,
    summary,
    metadata
  });
}

export async function buildCustomerPayload(customerId) {
  const customer = await Customer.findById(customerId)
    .populate("ownerId", "name email role")
    .populate("assignmentHistory.ownerId", "name email role")
    .populate("assignmentHistory.assignedBy", "name email role")
    .populate("communications.sentBy", "name email role")
    .populate("communications.ticketId", "ticketId subject")
    .populate("websiteId", "websiteName domain");

  if (!customer) return null;

  const visitor = await Visitor.findOne({ customerId: customer._id }).select("visitorId");

  const [tasks, activity] = await Promise.all([
    FollowUpTask.find({ customerId: customer._id })
      .populate("ownerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("completedBy", "name email role")
      .sort({ dueAt: 1, createdAt: -1 })
      .limit(50),
    listActivityForEntity({
      entityType: "customer",
      entityId: customer._id,
      visitorId: visitor?.visitorId || null,
      limit: 100
    })
  ]);

  return { customer, tasks, activity };
}
