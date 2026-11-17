import mongoose from "mongoose";
import { BiDashboard } from "../models/BiDashboard.js";
import { BiAlert } from "../models/BiAlert.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Invoice } from "../models/Invoice.js";
import { Subscription } from "../models/Subscription.js";
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

export const deleteAlert = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const alert = await BiAlert.findById(req.params.id);
  if (!alert) throw new AppError("Alert not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(String(alert.websiteId))) {
    throw new AppError("Unauthorized access", 403);
  }
  await BiAlert.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Alert deleted" });
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

  const websiteObjId = mongoose.Types.ObjectId.isValid(resolvedWebsiteId)
    ? new mongoose.Types.ObjectId(String(resolvedWebsiteId))
    : resolvedWebsiteId;

  // 1. CRM Metrics
  const totalLeads = await Customer.countDocuments({ websiteId: resolvedWebsiteId });
  const wonDeals = await Customer.countDocuments({ websiteId: resolvedWebsiteId, pipelineStage: "won" });
  const pipelineValueAgg = await Customer.aggregate([
    { $match: { websiteId: websiteObjId } },
    { $group: { _id: null, total: { $sum: "$leadValue" } } }
  ]);
  const pipelineValue = pipelineValueAgg[0]?.total || 0;

  // 2. Support Metrics
  const totalTickets = await Ticket.countDocuments({ websiteId: resolvedWebsiteId });
  const openTickets = await Ticket.countDocuments({ websiteId: resolvedWebsiteId, status: "open" });
  const escalatedTickets = await Ticket.countDocuments({ websiteId: resolvedWebsiteId, escalationLevel: { $gt: 0 } });

  // 3. Finance Metrics (real collections + active subscription MRR/ARR)
  const invoicesPaidAgg = await Invoice.aggregate([
    { $match: { websiteId: websiteObjId, status: "paid" } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  const collectionsSum = invoicesPaidAgg[0]?.total || 0;

  const activeSubs = await Subscription.find({
    websiteId: resolvedWebsiteId,
    status: { $in: ["active", "renewed"] }
  }).populate("planId", "price billingCycle").lean();

  const mrrEstimate = Math.round(
    activeSubs.reduce((sum, sub) => {
      const unitPrice = Number(sub.planId?.price || 0);
      const seats = Math.max(1, Number(sub.seats || 1));
      const cycle = sub.billingCycle || sub.planId?.billingCycle || "monthly";
      const total = unitPrice * seats;
      if (cycle === "yearly") return sum + total / 12;
      if (cycle === "half_yearly") return sum + total / 6;
      if (cycle === "quarterly") return sum + total / 3;
      return sum + total;
    }, 0)
  );
  const arrEstimate = mrrEstimate * 12;

  // 4. AI usage metrics
  const aiCostAgg = await AiUsageLog.aggregate([
    { $match: { websiteId: websiteObjId } },
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
      mrrEstimate,
      arrEstimate
    },
    ai: {
      totalAiCost
    }
  });
});
