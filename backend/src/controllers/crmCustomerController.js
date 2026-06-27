import { Customer } from "../models/Customer.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { User } from "../models/User.js";
import { ChatSession } from "../models/ChatSession.js";
import { Ticket } from "../models/Ticket.js";
import { Visitor } from "../models/Visitor.js";
import { incrementCustomers } from "../services/analyticsService.js";
import { generateCRN } from "../services/customerService.js";
import { logAuditEvent } from "../services/auditService.js";
import {
  buildTenantScopedCustomerFilter,
  normalizeBulkCustomerIds,
  sendUnauthorizedTenant
} from "../utils/crmBulkAccess.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import {
  autoAssignLeadOwner,
  ensureFirstTouchTask,
  sendCrmLifecycleEmail
} from "../services/automationService.js";
import {
  calculateWinProbability,
  calculateChurnRisk,
  calculateHeatScore
} from "../services/intelligenceService.js";
import {
  getEnrichedData,
  normalizeCompanyName,
  normalizePipelineStage,
  deriveLifecycleFields,
  computeLeadScore,
  categoryFromScore,
  expectedRevenueFromCustomer,
  validateLifecycleTransition,
  buildChatContextFromSession,
  findDuplicateCandidates,
  emitCustomerActivity,
  buildCustomerPayload,
  createAndEmitCrmNotification,
  probabilityFromStage
} from "../utils/crmUtils.js";
import { SALES_ALLOWED_STATUS_TRANSITIONS } from "../constants/domain.js";
import { getSocketServer } from "../sockets/index.js";

export const listCustomers = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const {
    status,
    search,
    websiteId,
    ownerId,
    page = 1,
    limit = 20,
    includeArchived = "false",
    view = "",
    leadSource,
    healthStatus,
    pipelineStage,
    range = "month"
  } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({
      customers: [],
      pagination: { total: 0, page: 1, pages: 0 }
    });
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's CRM data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (status) query.status = status;
  if (req.query.recordType && req.query.recordType !== "all") query.recordType = req.query.recordType;
  if (req.query.ownerId) query.ownerId = req.query.ownerId;
  if (includeArchived !== "true") query.archivedAt = null;

  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { crn: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
      { companyName: new RegExp(search, "i") }
    ];
  }

  if (req.user.role === "sales") query.ownerId = req.user._id;

  if (req.user.role === "purchase") {
    query.pipelineStage = "won";
    query.isLocked = true;
    query.recordType = "customer";
  }

  const now = new Date();
  if (view === "my_leads") {
    query.ownerId = req.user._id;
  } else if (view === "won_this_month") {
    query.pipelineStage = "won";
    query.updatedAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  } else if (view === "archived") {
    query.archivedAt = { $ne: null };
  }

  if (leadSource) query.leadSource = leadSource;
  if (pipelineStage) query.pipelineStage = pipelineStage;

  const customers = await Customer.find(query)
    .populate("ownerId", "name email role")
    .populate("websiteId", "websiteName")
    .sort({ lastInteraction: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Customer.countDocuments(query);

  const finalCustomers = await Promise.all(customers.map(async (c) => {
    const doc = c.toObject();
    const computedLeadScore = computeLeadScore(doc);
    doc.score = computedLeadScore;
    doc.leadCategory = doc.leadCategory || categoryFromScore(computedLeadScore);
    doc.expectedRevenue = expectedRevenueFromCustomer(doc);
    doc.heatScore = calculateHeatScore(doc);
    doc.probability = calculateWinProbability(doc);
    if (doc.status === "customer") doc.churnRisk = calculateChurnRisk(doc);

    const enriched = await getEnrichedData(doc);
    doc.nbaRecommendation = enriched.nba ? `${enriched.nba.action}: ${enriched.nba.recommendation}` : "";
    doc.nbaMetadata = enriched.nba;
    if (doc.status === "customer") doc.ltv = enriched.ltv;
    return doc;
  }));

  res.json({
    customers: finalCustomers,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const createCustomer = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const {
    name, email, phone, companyName, recordType, leadStatus, dealStage,
    leadSource, leadValue, budget, requirement, timeline, interestLevel,
    leadCategory, probability, expectedCloseDate, decisionMaker, websiteId,
    status, pipelineStage, priority, ownerId, tags, notes, sessionId
  } = req.body;

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's CRM data", 403);
  }

  const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
  if (normalizedEmail) {
    const existing = await Customer.findOne({ websiteId: resolvedWebsiteId, email: normalizedEmail });
    if (existing) throw new AppError("A lead with this email already exists", 409);
  }

  const duplicateCandidates = await findDuplicateCandidates({ email: normalizedEmail, phone, companyName, websiteId: resolvedWebsiteId });
  const sourceDetails = await buildChatContextFromSession(sessionId);
  const lifecycle = deriveLifecycleFields({
    pipelineStage: pipelineStage || status || leadStatus || dealStage || "new",
    recordType, leadStatus, dealStage
  });

  validateLifecycleTransition({ recordType: "lead", leadStatus: lifecycle.leadStatus, dealStage: null }, lifecycle, true);

  let resolvedOwnerId = (req.user.role === "sales") ? req.user._id : (ownerId || null);

  const customer = await Customer.create({
    crn: await generateCRN(),
    name,
    email: normalizedEmail,
    phone: phone || null,
    companyName: normalizeCompanyName(companyName), recordType: lifecycle.recordType,
    leadStatus: lifecycle.leadStatus, dealStage: lifecycle.dealStage, leadSource: leadSource || "",
    leadValue: Number(leadValue || 0), budget: Number(budget || 0), requirement: String(requirement || "").trim(),
    timeline: String(timeline || "").trim(), interestLevel: interestLevel || "warm",
    leadCategory: leadCategory || categoryFromScore(computeLeadScore(req.body)),
    probability: Number(probability ?? probabilityFromStage(lifecycle.pipelineStage)),
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    decisionMaker: String(decisionMaker || "").trim(), websiteId: resolvedWebsiteId,
    status: lifecycle.status, pipelineStage: lifecycle.pipelineStage,
    stageEnteredAt: new Date(), ownerId: resolvedOwnerId, ownerAssignedAt: resolvedOwnerId ? new Date() : null,
    priority: priority || "medium", tags: Array.isArray(tags) ? tags : [], sourceDetails,
    internalNotes: notes ? [{ text: String(notes).trim(), authorName: req.user.name, createdAt: new Date() }] : []
  });

  await incrementCustomers(resolvedWebsiteId);
  if (resolvedOwnerId) await ensureFirstTouchTask(customer, resolvedOwnerId);
  await sendCrmLifecycleEmail(customer, "welcome");

  if (resolvedOwnerId) {
    await createAndEmitCrmNotification({
      recipient: resolvedOwnerId, type: "crm_lead_assigned",
      title: "New CRM lead assigned", message: `${name} assigned to you.`, link: "/sales"
    });
  }

  try {
    getSocketServer().emit("lead:created", {
      message: `New CRM record created for ${customer.companyName || customer.name}`,
      user: customer.name,
      customerId: customer._id,
      websiteId: resolvedWebsiteId,
      recordType: customer.recordType
    });
  } catch (err) {
    console.error("Socket emit failed", err);
  }

  res.status(201).json(customer);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(customer.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  if (customer.isLocked) throw new AppError("This lead is locked.", 403);

  const updates = req.body;
  const previousState = customer.toObject();

  // Basic update logic
  Object.keys(updates).forEach(key => {
    if (["name", "phone", "email", "companyName", "leadValue", "priority", "tags"].includes(key)) {
      customer[key] = updates[key];
    }
  });

  if (updates.pipelineStage) {
    const nextLifecycle = deriveLifecycleFields({
      pipelineStage: updates.pipelineStage,
      recordType: updates.recordType || customer.recordType
    });
    validateLifecycleTransition(previousState, nextLifecycle);
    customer.pipelineStage = nextLifecycle.pipelineStage;
    customer.recordType = nextLifecycle.recordType;
    customer.status = nextLifecycle.status;
  }

  await customer.save();
  await emitCustomerActivity({
    actor: req.user, websiteId: customer.websiteId, customerId: customer._id,
    type: "updated", summary: `${customer.name} updated`, metadata: { before: previousState, after: customer }
  });

  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(customer.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await Customer.deleteOne({ _id: customer._id });
  res.json({ success: true, message: "Lead deleted permanently" });
});

export const getCustomerProfile = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const payload = await buildCustomerPayload(req.params.id);
  if (!payload) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(payload.customer.websiteId._id.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const [sessions, tickets] = await Promise.all([
    ChatSession.find({ customerId: payload.customer._id }).populate("assignedAgent", "name email").sort({ createdAt: -1 }).limit(10),
    Ticket.find({ customerId: payload.customer._id }).populate("assignedAgent", "name email").sort({ createdAt: -1 }).limit(10)
  ]);

  res.json({ ...payload, sessions, tickets });
});

export const archiveCustomer = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_ARCHIVE);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  customer.archivedAt = new Date();
  customer.archivedBy = req.user._id;
  customer.status = "inactive";
  await customer.save();
  res.json(customer);
});

export const searchCustomers = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { q } = req.query;
  const results = await Customer.find({
    websiteId: { $in: ownedWebsiteIds },
    $or: [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }, { crn: new RegExp(q, "i") }]
  }).limit(10);
  res.json(results);
});

export const mergeCustomers = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_MERGE);
  const { primaryCustomerId, secondaryCustomerId } = req.body;
  const [primary, secondary] = await Promise.all([
    Customer.findById(primaryCustomerId),
    Customer.findById(secondaryCustomerId)
  ]);
  if (!primary || !secondary) throw new AppError("Both records must exist", 404);

  primary.internalNotes = [...(primary.internalNotes || []), ...(secondary.internalNotes || [])];
  await primary.save();
  secondary.archivedAt = new Date();
  secondary.status = "inactive";
  await secondary.save();
  res.json(primary);
});

export const bulkUpdateCustomers = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { ids, updates } = req.body;

  const normalized = normalizeBulkCustomerIds(ids);
  if (normalized.error) {
    throw new AppError(normalized.error, 400);
  }

  if (!updates || typeof updates !== "object" || Array.isArray(updates) || Object.keys(updates).length === 0) {
    throw new AppError("At least one update field is required", 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (ownedWebsiteIds.length === 0) {
    return sendUnauthorizedTenant(res);
  }

  const scopedFilter = buildTenantScopedCustomerFilter(normalized.ids, ownedWebsiteIds);
  const customers = await Customer.find(scopedFilter).select("_id websiteId archivedAt");
  if (customers.length !== normalized.ids.length) {
    return sendUnauthorizedTenant(res);
  }

  if (customers.some((customer) => customer.archivedAt)) {
    throw new AppError("Archived CRM records cannot be modified in bulk.", 400);
  }

  const activeFilter = buildTenantScopedCustomerFilter(normalized.ids, ownedWebsiteIds, { archivedAt: null });
  const result = await Customer.updateMany(activeFilter, { $set: updates });

  const affectedByWebsite = customers.reduce((acc, customer) => {
    const websiteId = String(customer.websiteId);
    acc.set(websiteId, (acc.get(websiteId) || 0) + 1);
    return acc;
  }, new Map());

  await Promise.all([...affectedByWebsite.entries()].map(([websiteId, affectedCount]) => logAuditEvent({
    actor: req.user,
    action: "crm.bulk_update",
    entityType: "customer",
    entityId: `bulk:${normalized.ids.join(",")}`,
    websiteId,
    metadata: {
      userId: String(req.user._id),
      websiteId,
      affectedCount,
      timestamp: new Date().toISOString(),
      updates: Object.keys(updates)
    },
    ipAddress: req.ip
  })));

  res.json({ success: true, count: result.modifiedCount });
});

export const bulkDeleteCustomers = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const { ids } = req.body;

  const normalized = normalizeBulkCustomerIds(ids);
  if (normalized.error) {
    throw new AppError(normalized.error, 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (ownedWebsiteIds.length === 0) {
    return sendUnauthorizedTenant(res);
  }

  const scopedFilter = buildTenantScopedCustomerFilter(normalized.ids, ownedWebsiteIds);
  const customers = await Customer.find(scopedFilter).select("_id websiteId archivedAt");
  if (customers.length !== normalized.ids.length) {
    return sendUnauthorizedTenant(res);
  }

  if (customers.some((customer) => customer.archivedAt)) {
    throw new AppError("Archived CRM records cannot be deleted in bulk.", 400);
  }

  const activeFilter = buildTenantScopedCustomerFilter(normalized.ids, ownedWebsiteIds, { archivedAt: null });
  const result = await Customer.deleteMany(activeFilter);

  const affectedByWebsite = customers.reduce((acc, customer) => {
    const websiteId = String(customer.websiteId);
    acc.set(websiteId, (acc.get(websiteId) || 0) + 1);
    return acc;
  }, new Map());

  await Promise.all([...affectedByWebsite.entries()].map(([websiteId, affectedCount]) => logAuditEvent({
    actor: req.user,
    action: "crm.bulk_delete",
    entityType: "customer",
    entityId: `bulk:${normalized.ids.join(",")}`,
    websiteId,
    metadata: {
      userId: String(req.user._id),
      websiteId,
      affectedCount,
      timestamp: new Date().toISOString()
    },
    ipAddress: req.ip
  })));

  res.json({ success: true, count: result.deletedCount });
});
