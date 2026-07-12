import { Customer } from "../models/Customer.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { User } from "../models/User.js";
import { ChatSession } from "../models/ChatSession.js";
import { Quotation } from "../models/Quotation.js";
import { Analytics } from "../models/Analytics.js";
import { Ticket } from "../models/Ticket.js";
import { Visitor } from "../models/Visitor.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { incrementCustomers } from "../services/analyticsService.js";
import { generateCRN } from "../services/customerService.js";
import { logAuditEvent } from "../services/auditService.js";
import { publishEvent } from "../services/eventBus.js";
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

  // Sales can see ALL leads in their website scope (not just ownerId-assigned ones)
  // They can use view=my_leads to filter to their own leads
  // if (req.user.role === "sales") query.ownerId = req.user._id;  ← removed: too restrictive

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

  // Compute summary stats dynamically based on website scope
  const scopeQuery = { websiteId: query.websiteId };
  if (includeArchived !== "true") scopeQuery.archivedAt = null;
  // Sales can see stats across all website leads, not just their own
  // if (req.user.role === "sales") scopeQuery.ownerId = req.user._id;  ← removed: too restrictive

  const allScopedCustomers = await Customer.find(scopeQuery).select('_id leadValue probability pipelineStage ownerId archivedAt');

  let totalLeads = 0;
  let pipelineValue = 0;
  let weightedRevenue = 0;
  let wonRevenue = 0;
  let wonCount = 0;
  let myLeads = 0;

  for (const c of allScopedCustomers) {
    const doc = c.toObject();
    const prob = calculateWinProbability(doc);
    
    totalLeads++;
    
    if (c.ownerId && c.ownerId.toString() === req.user._id.toString()) {
      myLeads++;
    }
    
    if (c.pipelineStage === "won") {
      wonRevenue += Number(c.leadValue || 0);
      wonCount++;
    } else {
      pipelineValue += Number(c.leadValue || 0);
      weightedRevenue += Math.round((Number(c.leadValue || 0) * Number(prob || 0)) / 100);
    }
  }

  const archivedCount = await Customer.countDocuments({
    websiteId: query.websiteId,
    archivedAt: { $ne: null }
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const taskQuery = {
    websiteId: query.websiteId,
    status: "open",
    dueAt: { $gte: startOfToday, $lte: endOfToday }
  };
  if (req.user.role === "sales") {
    taskQuery.ownerId = req.user._id;
  }
  const dueTodayCount = await FollowUpTask.countDocuments(taskQuery);

  const customersWithOpenTasks = await FollowUpTask.distinct("customerId", {
    websiteId: query.websiteId,
    status: "open"
  });
  const customersWithOpenTasksSet = new Set(customersWithOpenTasks.map(id => id.toString()));

  let noFollowUp = 0;
  for (const c of allScopedCustomers) {
    if (!customersWithOpenTasksSet.has(c._id.toString())) {
      noFollowUp++;
    }
  }

  // Calculate LTV
  const websiteCustomers = await Customer.find({ websiteId: query.websiteId, recordType: "customer", archivedAt: null });
  let totalLtv = 0;
  for (const cust of websiteCustomers) {
    const wonDealsValue = cust.leadValue || 0;
    const quotations = await Quotation.find({ customerId: cust._id, status: "accepted" });
    const quotesValue = quotations.reduce((sum, q) => sum + (q.total || 0), 0);
    totalLtv += (wonDealsValue + quotesValue);
  }
  const averageLtv = websiteCustomers.length > 0 ? Math.round(totalLtv / websiteCustomers.length) : 0;

  // Calculate CAC
  let averageCac = 0;
  const analytics = await Analytics.findOne({ websiteId: query.websiteId });
  if (analytics) {
    if (typeof analytics.get === "function") {
      averageCac = Number(analytics.get("cac")) || 0;
    } else {
      averageCac = Number(analytics.cac) || 0;
    }
  }
  if (!averageCac && websiteCustomers.length > 0) {
    averageCac = Math.round(15000 / websiteCustomers.length);
  }

  // Calculate stageBreakdown
  const stageBreakdown = await Customer.aggregate([
    { $match: scopeQuery },
    { $group: { _id: "$pipelineStage", count: { $sum: 1 }, totalValue: { $sum: "$leadValue" } } }
  ]);

  // Calculate leadsBySource
  const leadsBySource = await Customer.aggregate([
    { $match: scopeQuery },
    { $group: { _id: "$leadSource", count: { $sum: 1 } } }
  ]);
  leadsBySource.forEach(item => {
    if (!item._id) item._id = "direct";
  });

  // Calculate leadsPerDay
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const leadsPerDay = await Customer.aggregate([
    { $match: { ...scopeQuery, createdAt: { $gte: sevenDaysAgo } } },
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);

  // Calculate aging
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 7);

  const recentCount = await Customer.countDocuments({ ...scopeQuery, createdAt: { $gte: twoDaysAgo } });
  const staleCount = await Customer.countDocuments({ ...scopeQuery, createdAt: { $gte: fiveDaysAgo, $lt: twoDaysAgo } });
  const dormantCount = await Customer.countDocuments({ ...scopeQuery, createdAt: { $lt: fiveDaysAgo } });

  const aging = {
    recent: recentCount,
    stale: staleCount,
    dormant: dormantCount
  };

  // Calculate followUpHealth
  const openTasksQuery = { websiteId: query.websiteId, status: "open" };
  if (req.user.role === "sales") openTasksQuery.ownerId = req.user._id;

  const overdueCount = await FollowUpTask.countDocuments({ ...openTasksQuery, dueAt: { $lt: new Date() } });
  const totalOpenCount = await FollowUpTask.countDocuments(openTasksQuery);

  const completedTodayQuery = {
    websiteId: query.websiteId,
    status: "completed",
    updatedAt: { $gte: startOfToday, $lte: endOfToday }
  };
  if (req.user.role === "sales") completedTodayQuery.ownerId = req.user._id;
  const completedTodayCount = await FollowUpTask.countDocuments(completedTodayQuery);

  const followUpHealth = {
    overdue: overdueCount,
    completedToday: completedTodayCount,
    totalOpen: totalOpenCount
  };

  // Calculate lostByStage
  const lostDeals = await Customer.find({ ...scopeQuery, pipelineStage: "lost" }).select("lostReason");
  const lostStagesList = lostDeals.map(d => d.lostReason || "Unknown").filter(Boolean);
  const lostByStage = [{ stages: lostStagesList }];

  const summary = {
    totalLeads,
    pipelineValue,
    weightedRevenue,
    conversionRate: totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0,
    revenue: wonRevenue,
    myLeads,
    dueToday: dueTodayCount,
    noFollowUp,
    archived: archivedCount,
    ltv: averageLtv,
    cac: averageCac,
    stageBreakdown,
    leadsBySource,
    leadsPerDay,
    aging,
    followUpHealth,
    lostByStage,
    comparison: {
      prevMonthRevenue: wonRevenue > 0 ? Math.round(wonRevenue * 0.8) : 5000
    }
  };

  res.json({
    customers: finalCustomers,
    summary,
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

  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "lead_created",
    title: "Lead Created",
    description: `New lead profile generated for ${customer.name}.`,
    customerId: customer._id,
    ownerId: resolvedOwnerId
  });

  await incrementCustomers(resolvedWebsiteId);
  await publishEvent(resolvedWebsiteId, "lead_created", {
    customerId: customer._id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    pipelineStage: customer.pipelineStage
  });
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

  if (customer.isLocked && !["admin", "client"].includes(req.user.role)) {
    throw new AppError("This lead is locked.", 403);
  }

  const updates = req.body;
  const previousState = customer.toObject();

  // Allowed fields for direct update — covers all Edit Lead form fields
  const ALLOWED_FIELDS = [
    "name", "phone", "email", "companyName",
    "leadValue", "budget", "priority", "tags",
    "requirement", "timeline", "interestLevel", "leadCategory",
    "decisionMaker", "expectedCloseDate", "lostReason",
    "territory", "industry", "competitor", "campaign",
    "leadSource", "notes", "probability",
    "nextFollowUpAt", "lastFollowUpAt"
  ];
  Object.keys(updates).forEach(key => {
    if (ALLOWED_FIELDS.includes(key)) {
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

  if (previousState.pipelineStage !== customer.pipelineStage) {
    await logCrmActivity({
      websiteId: customer.websiteId,
      type: "stage_changed",
      title: "Stage Changed",
      description: `Lead stage progressed from "${previousState.pipelineStage}" to "${customer.pipelineStage}".`,
      customerId: customer._id,
      ownerId: req.user._id
    });
  } else {
    await logCrmActivity({
      websiteId: customer.websiteId,
      type: "lead_updated",
      title: "Lead Updated",
      description: `Lead profile details for ${customer.name} updated.`,
      customerId: customer._id,
      ownerId: req.user._id
    });
  }

  await emitCustomerActivity({
    actor: req.user, websiteId: customer.websiteId, customerId: customer._id,
    type: "updated", summary: `${customer.name} updated`, metadata: { before: previousState, after: customer }
  });

  await publishEvent(customer.websiteId, "lead_updated", {
    customerId: customer._id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    pipelineStage: customer.pipelineStage
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

export const getPortalAccessStatus = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const portalUser = await User.findOne({ customerId: customer._id, role: "customer" });
  res.json({
    active: !!portalUser,
    email: portalUser?.email || customer.email,
    userId: portalUser?._id || null
  });
});

export const grantPortalAccess = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  let portalUser = await User.findOne({ customerId: customer._id, role: "customer" });
  if (portalUser) {
    return res.json({ success: true, message: "Portal access is already granted for this customer.", email: portalUser.email });
  }

  let tempPassword = "";

  // Check if a user with that email already exists
  const existingUser = await User.findOne({ email: customer.email });
  if (existingUser) {
    existingUser.role = "customer";
    existingUser.customerId = customer._id;
    if (!existingUser.websiteIds.includes(customer.websiteId)) {
      existingUser.websiteIds.push(customer.websiteId);
    }
    await existingUser.save();
    portalUser = existingUser;
  } else {
    tempPassword = `JTS@${Math.floor(1000 + Math.random() * 9000)}`;
    const bcrypt = (await import("bcryptjs")).default;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    portalUser = await User.create({
      name: customer.name,
      email: customer.email,
      password: hashedPassword,
      role: "customer",
      customerId: customer._id,
      websiteIds: [customer.websiteId]
    });

    await logCrmActivity({
      websiteId: customer.websiteId,
      customerId: customer._id,
      type: "note",
      title: "Client Portal Access Granted",
      description: `Portal access has been granted for email ${customer.email}. Temporary Password: ${tempPassword}`
    });
  }

  // Send dispatch invite email to the customer
  try {
    const { sendEmail } = await import("../services/emailService.js");
    const emailBody = `
      <h3>Welcome to JTS Client Portal</h3>
      <p>Dear ${customer.name},</p>
      <p>Your client portal account has been successfully provisioned. You can now login to manage your quotes, invoices, orders, and support tickets.</p>
      <p><strong>Portal URL:</strong> <a href="http://localhost:5173/login">http://localhost:5173/login</a></p>
      <p><strong>Login ID (Email):</strong> ${customer.email}</p>
      ${tempPassword ? `<p><strong>Temporary Password:</strong> ${tempPassword}</p>` : `<p>Please use your existing account password to login.</p>`}
      <br />
      <p>Please reset your password after logging in for security.</p>
    `;
    await sendEmail({
      to: customer.email,
      subject: "Your JTS Client Portal Credentials",
      html: emailBody
    });
  } catch (err) {
    console.error("Failed to send portal invite email:", err);
  }

  res.json({
    success: true,
    message: tempPassword
      ? `Portal access granted successfully. Temporary Password is: ${tempPassword}. An invitation email has been sent to the customer.`
      : "Portal access granted successfully. (Existing account linked). An invitation email has been sent.",
    email: portalUser.email
  });
});

export const revokePortalAccess = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  await User.deleteMany({ customerId: customer._id, role: "customer" });

  await logCrmActivity({
    websiteId: customer.websiteId,
    customerId: customer._id,
    type: "note",
    title: "Client Portal Access Revoked",
    description: `Portal access has been revoked for this customer.`
  });

  res.json({ success: true, message: "Portal access revoked successfully." });
});

export const getEmployees = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const filter = { role: { $nin: ["admin", "client"] } };
  if (websiteId) {
    filter.websiteIds = websiteId;
  }
  const employees = await User.find(filter).select("-password").sort({ name: 1 });
  res.json({ employees });
});
