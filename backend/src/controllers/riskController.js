import { Risk } from "../models/Risk.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { logAuditEvent } from "../services/auditService.js";

export const listRisks = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, category, status, search, minScore } = req.query;

  const query = { websiteId: { $in: ownedWebsiteIds } };
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's risk data", 403);
    }
    query.websiteId = websiteId;
  }
  if (category) query.category = category;
  if (status) query.status = status;
  if (minScore) query.riskScore = { $gte: Number(minScore) };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { mitigationPlan: { $regex: search, $options: "i" } }
    ];
  }

  const risks = await Risk.find(query)
    .populate("ownerId", "name email")
    .populate("createdBy", "name email")
    .sort({ riskScore: -1, createdAt: -1 });

  // Summary Metrics
  const totalRisks = risks.length;
  const criticalRisks = risks.filter(r => r.riskScore >= 15).length;
  const openRisks = risks.filter(r => r.status === "open" || r.status === "in_mitigation").length;
  const closedRisks = risks.filter(r => r.status === "closed").length;
  const avgRiskScore = totalRisks > 0 ? (risks.reduce((sum, r) => sum + r.riskScore, 0) / totalRisks).toFixed(1) : 0;

  return res.json({
    summary: {
      totalRisks,
      criticalRisks,
      openRisks,
      closedRisks,
      avgRiskScore
    },
    risks
  });
});

export const createRisk = asyncHandler(async (req, res) => {
  const { websiteId, title, description, category, probability, impact, mitigationPlan, ownerId, status, reviewDate } = req.body;

  if (!websiteId || !title || !category) {
    throw new AppError("Website, title, and risk category are required", 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
    throw new AppError("Unauthorized access to this website scope", 403);
  }

  const probNum = Number(probability) || 3;
  const impNum = Number(impact) || 3;

  const risk = await Risk.create({
    websiteId,
    title,
    description: description || "",
    category,
    probability: probNum,
    impact: impNum,
    riskScore: probNum * impNum,
    mitigationPlan: mitigationPlan || "",
    ownerId: ownerId || req.user._id,
    status: status || "open",
    reviewDate: reviewDate ? new Date(reviewDate) : null,
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId,
    action: "RISK_CREATED",
    resource: "Risk",
    resourceId: risk._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { title: risk.title, category: risk.category, riskScore: risk.riskScore }
  });

  return res.status(201).json(risk);
});

export const updateRisk = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const risk = await Risk.findById(id);
  if (!risk) {
    throw new AppError("Risk record not found", 404);
  }

  if (!ownedWebsiteIds.map(wId => wId.toString()).includes(risk.websiteId.toString())) {
    throw new AppError("Unauthorized access to update this risk", 403);
  }

  const beforeState = risk.toObject();

  const fields = ["title", "description", "category", "probability", "impact", "mitigationPlan", "ownerId", "status", "reviewDate"];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      risk[field] = req.body[field];
    }
  });

  if (req.body.probability !== undefined || req.body.impact !== undefined) {
    risk.riskScore = (Number(risk.probability) || 3) * (Number(risk.impact) || 3);
  }

  if (req.body.status === "closed" && !risk.resolutionDate) {
    risk.resolutionDate = new Date();
  }

  await risk.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: risk.websiteId,
    action: "RISK_UPDATED",
    resource: "Risk",
    resourceId: risk._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { before: beforeState, after: risk.toObject() }
  });

  return res.json(risk);
});

export const deleteRisk = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const risk = await Risk.findById(id);
  if (!risk) {
    throw new AppError("Risk record not found", 404);
  }

  if (!ownedWebsiteIds.map(wId => wId.toString()).includes(risk.websiteId.toString())) {
    throw new AppError("Unauthorized access to delete this risk", 403);
  }

  await Risk.findByIdAndDelete(id);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: risk.websiteId,
    action: "RISK_DELETED",
    resource: "Risk",
    resourceId: risk._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { title: risk.title }
  });

  return res.json({ message: "Risk record purged successfully" });
});

export const addRiskComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new AppError("Comment content cannot be empty", 400);
  }

  const risk = await Risk.findById(id);
  if (!risk) {
    throw new AppError("Risk record not found", 404);
  }

  risk.comments.push({
    content: content.trim(),
    authorId: req.user._id,
    authorName: req.user.name || "Staff Member"
  });

  await risk.save();
  return res.json(risk);
});
