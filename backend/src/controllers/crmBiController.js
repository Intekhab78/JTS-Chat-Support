import { BiDashboard } from "../models/BiDashboard.js";
import { BiAlert } from "../models/BiAlert.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Invoice } from "../models/Invoice.js";
import { AiUsageLog } from "../models/AiUsageLog.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

// Dashboards Layout Configurations
export const listDashboards = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const dashboards = await BiDashboard.find(query).sort({ name: 1 });
  res.json(dashboards);
});

export const createDashboard = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  const dashboard = await BiDashboard.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(dashboard);
});

// Alerts Threshold Settings
export const listAlerts = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const alerts = await BiAlert.find(query).sort({ createdAt: -1 });
  res.json(alerts);
});

export const createAlert = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  const alert = await BiAlert.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(alert);
});

// Central BI Metric Aggregator
export const getCentralMetrics = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  // 1. CRM Metrics
  const totalLeads = await Customer.countDocuments({ websiteId: resolvedWebsiteId });
  const wonDeals = await Customer.countDocuments({ websiteId: resolvedWebsiteId, pipelineStage: "won" });
  const pipelineValueAgg = await Customer.aggregate([
    { $match: { websiteId: resolvedWebsiteId } },
    { $group: { _id: null, total: { $sum: "$leadValue" } } }
  ]);
  const pipelineValue = pipelineValueAgg[0]?.total || 0;

  // 2. Support Metrics
  const totalTickets = await Ticket.countDocuments({ websiteId: resolvedWebsiteId });
  const openTickets = await Ticket.countDocuments({ websiteId: resolvedWebsiteId, status: "open" });
  const escalatedTickets = await Ticket.countDocuments({ websiteId: resolvedWebsiteId, escalationLevel: { $gt: 0 } });

  // 3. Finance Metrics
  const invoicesPaidAgg = await Invoice.aggregate([
    { $match: { websiteId: resolvedWebsiteId, status: "paid" } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  const collectionsSum = invoicesPaidAgg[0]?.total || 0;

  // 4. AI usage metrics
  const aiCostAgg = await AiUsageLog.aggregate([
    { $match: { websiteId: resolvedWebsiteId } },
    { $group: { _id: null, total: { $sum: "$cost" } } }
  ]);
  const totalAiCost = aiCostAgg[0]?.total || 0;

  res.json({
    crm: {
      totalLeads,
      wonDeals,
      pipelineValue,
      conversionRate: totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0
    },
    support: {
      totalTickets,
      openTickets,
      escalatedTickets
    },
    finance: {
      collectionsSum,
      mrrEstimate: Math.round(collectionsSum * 0.15), // Mock SaaS MRR Estimate
      arrEstimate: Math.round(collectionsSum * 0.15 * 12)
    },
    ai: {
      totalAiCost
    }
  });
});
