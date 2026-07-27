import mongoose from "mongoose";
import { ProductFeature } from "../models/ProductFeature.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

const SEED_FEATURES = [
  {
    title: "UAE FTA E-Invoicing XML & QR Engine",
    description: "Full compliance with Phase 2 UAE Federal Tax Authority structured e-invoicing standards and QR code signatures.",
    module: "VAT Compliance",
    category: "compliance",
    priority: "critical",
    businessValue: "critical",
    status: "released",
    isFeatureFlagEnabled: true,
    featureFlagKey: "fta_e_invoicing_v2",
    targetVersion: "v1.0.0",
    votesCount: 42
  },
  {
    title: "AI Auto-Classification for Corporate Tax Deductions",
    description: "LLM-powered engine to categorize deductible vs non-deductible commercial expenses under UAE CT law.",
    module: "Corporate Tax",
    category: "ai",
    priority: "high",
    businessValue: "high",
    status: "in_progress",
    isFeatureFlagEnabled: true,
    featureFlagKey: "ct_ai_categorizer",
    targetVersion: "v1.2.0",
    votesCount: 38
  },
  {
    title: "Automated Trade License Renewal Escalation Workflow",
    description: "5-tier automated SMS & Email reminder workflow triggered at 60, 30, and 15 days before license expiry.",
    module: "Trade License",
    category: "automation",
    priority: "high",
    businessValue: "high",
    status: "testing",
    isFeatureFlagEnabled: false,
    featureFlagKey: "trade_license_auto_reminder",
    targetVersion: "v1.2.0",
    votesCount: 29
  },
  {
    title: "Omnichannel WhatsApp & Live Chat Ticketing Sync",
    description: "Seamless synchronization between visitor live chats, WhatsApp Business API, and internal CRM tickets.",
    module: "Omnichannel Inbox",
    category: "core",
    priority: "high",
    businessValue: "medium",
    status: "planned",
    isFeatureFlagEnabled: false,
    featureFlagKey: "whatsapp_omnichannel_sync",
    targetVersion: "v1.3.0",
    votesCount: 19
  },
  {
    title: "Real-time SLA Penalty & SLO Health Dashboard",
    description: "Visual metrics and breach warnings for Enterprise customer service level agreements.",
    module: "SLA Management",
    category: "analytics",
    priority: "medium",
    businessValue: "medium",
    status: "backlog",
    isFeatureFlagEnabled: false,
    featureFlagKey: "enterprise_sla_telemetry",
    targetVersion: "v1.4.0",
    votesCount: 15
  }
];

export const getProductOverview = asyncHandler(async (req, res) => {
  let features = await ProductFeature.find({})
    .populate("ownerId", "name email")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  if (features.length === 0) {
    const userId = req.user?._id || null;
    const seedDocs = SEED_FEATURES.map(sf => ({ ...sf, ownerId: userId, createdBy: userId }));
    await ProductFeature.insertMany(seedDocs);
    features = await ProductFeature.find({})
      .populate("ownerId", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
  }

  const backlogCount = features.filter(f => f.status === "backlog").length;
  const plannedCount = features.filter(f => f.status === "planned").length;
  const inProgressCount = features.filter(f => f.status === "in_progress").length;
  const releasedCount = features.filter(f => f.status === "released").length;

  const activeFeatureFlags = features.filter(f => f.isFeatureFlagEnabled).length;

  const productVision = {
    vision: "To empower UAE & GCC enterprises with the most compliant, high-performance Tax & CRM automation SaaS platform.",
    mission: "Streamline VAT, Corporate Tax, Trade License renewals and SLA commitments through AI-driven automation.",
    currentQuarter: "Q3 2026 Milestone",
    targetVersion: "v1.2.0 Enterprise Suite",
    productHealthScore: 98.4
  };

  return res.json({
    summary: {
      totalFeatures: features.length,
      backlogCount,
      plannedCount,
      inProgressCount,
      releasedCount,
      activeFeatureFlags
    },
    productVision,
    features
  });
});

export const listFeatures = asyncHandler(async (req, res) => {
  const { status, category } = req.query;
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;

  const features = await ProductFeature.find(query)
    .populate("ownerId", "name email")
    .sort({ votesCount: -1, createdAt: -1 });

  return res.json(features);
});

export const createFeature = asyncHandler(async (req, res) => {
  const { title, description, module, category, priority, businessValue, targetVersion } = req.body;

  if (!title) {
    throw new AppError("Feature title is required", 400);
  }

  const feature = await ProductFeature.create({
    title,
    description: description || "",
    module: module || "CRM Core",
    category: category || "core",
    priority: priority || "high",
    businessValue: businessValue || "high",
    targetVersion: targetVersion || "v1.1.0",
    status: "planned",
    ownerId: req.user._id,
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "PRODUCT_FEATURE_CREATED",
    resource: "ProductFeature",
    resourceId: feature._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { title: feature.title, targetVersion: feature.targetVersion }
  });

  return res.status(201).json(feature);
});

export const updateFeatureStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, isFeatureFlagEnabled } = req.body;

  const feature = await ProductFeature.findById(id);
  if (!feature) {
    throw new AppError("Product feature not found", 404);
  }

  if (status) feature.status = status;
  if (isFeatureFlagEnabled !== undefined) feature.isFeatureFlagEnabled = isFeatureFlagEnabled;

  await feature.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "PRODUCT_FEATURE_UPDATED",
    resource: "ProductFeature",
    resourceId: feature._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { status: feature.status, isFeatureFlagEnabled: feature.isFeatureFlagEnabled }
  });

  return res.json(feature);
});

export const voteFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const feature = await ProductFeature.findByIdAndUpdate(id, { $inc: { votesCount: 1 } }, { new: true });

  if (!feature) {
    throw new AppError("Product feature not found", 404);
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "PRODUCT_FEATURE_UPVOTED",
    resource: "ProductFeature",
    resourceId: feature._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { votesCount: feature.votesCount }
  });

  return res.json(feature);
});

export const deleteFeature = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const feature = await ProductFeature.findByIdAndDelete(id);
  if (!feature) {
    throw new AppError("Product feature not found", 404);
  }
  return res.json({ message: "Feature deleted successfully" });
});
