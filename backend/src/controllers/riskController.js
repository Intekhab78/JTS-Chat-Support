import { Risk } from "../models/Risk.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { logAuditEvent } from "../services/auditService.js";

function clampScoreInput(val) {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

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

  const [risks, owners] = await Promise.all([
    Risk.find(query)
      .populate("ownerId", "name email")
      .populate("createdBy", "name email")
      .sort({ riskScore: -1, createdAt: -1 }),
    User.find({ role: { $in: ["admin", "client", "manager", "management", "agent"] } })
      .select("_id name email role")
      .sort({ name: 1 })
      .lean()
  ]);

  const totalRisks = risks.length;
  const criticalRisks = risks.filter(r => r.riskScore >= 15).length;
  const openRisks = risks.filter(r => r.status === "open" || r.status === "in_mitigation").length;
  const closedRisks = risks.filter(r => r.status === "closed").length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const overdueRisks = risks.filter(r => r.reviewDate && r.status !== "closed" && new Date(r.reviewDate) < startOfToday).length;
  const avgRiskScore = totalRisks > 0 ? (risks.reduce((sum, r) => sum + r.riskScore, 0) / totalRisks).toFixed(1) : 0;
  const residualRisks = risks.filter(r => r.residualRiskScore != null);
  const avgResidualScore = residualRisks.length > 0
    ? (residualRisks.reduce((sum, r) => sum + Number(r.residualRiskScore), 0) / residualRisks.length).toFixed(1)
    : null;

  return res.json({
    summary: {
      totalRisks,
      criticalRisks,
      openRisks,
      closedRisks,
      overdueRisks,
      avgRiskScore,
      avgResidualScore
    },
    owners,
    risks
  });
});

export const createRisk = asyncHandler(async (req, res) => {
  const {
    websiteId, title, description, category, probability, impact,
    residualProbability, residualImpact, mitigationPlan, ownerId, status, reviewDate
  } = req.body;

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const resolvedWebsiteId = websiteId || (ownedWebsiteIds.length > 0 ? String(ownedWebsiteIds[0]) : "");

  if (!resolvedWebsiteId || !title || !category) {
    throw new AppError("Website, title, and risk category are required", 400);
  }

  if (!ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website scope", 403);
  }

  const probNum = clampScoreInput(probability) || 3;
  const impNum = clampScoreInput(impact) || 3;
  const resProbNum = clampScoreInput(residualProbability);
  const resImpNum = clampScoreInput(residualImpact);

  const risk = await Risk.create({
    websiteId: resolvedWebsiteId,
    title,
    description: description || "",
    category,
    probability: probNum,
    impact: impNum,
    riskScore: probNum * impNum,
    residualProbability: resProbNum,
    residualImpact: resImpNum,
    residualRiskScore: resProbNum != null && resImpNum != null ? resProbNum * resImpNum : null,
    mitigationPlan: mitigationPlan || "",
    ownerId: ownerId || req.user._id,
    status: status || "open",
    reviewDate: reviewDate ? new Date(reviewDate) : null,
    createdBy: req.user._id
  });

  if (risk.riskScore >= 15 && risk.ownerId) {
    await Notification.create({
      recipient: risk.ownerId,
      type: "system_alert",
      title: `Critical Risk Logged (${risk.riskScore}/25)`,
      message: `${risk.title} [${risk.category}] requires mitigation review.`,
      link: "/admin?tab=risk-register",
      actorId: req.user._id,
      actorName: req.user.name || "Admin",
      entityType: "Risk",
      entityId: risk._id
    }).catch(() => {});
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: resolvedWebsiteId,
    action: "RISK_CREATED",
    resource: "Risk",
    resourceId: risk._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { title: risk.title, category: risk.category, riskScore: risk.riskScore, residualRiskScore: risk.residualRiskScore }
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

  const fields = [
    "title", "description", "category", "probability", "impact",
    "residualProbability", "residualImpact", "mitigationPlan", "ownerId", "status", "reviewDate"
  ];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === "ownerId") {
        risk.ownerId = req.body.ownerId || null;
      } else if (field === "reviewDate") {
        risk.reviewDate = req.body.reviewDate ? new Date(req.body.reviewDate) : null;
      } else if (field === "probability" || field === "impact") {
        risk[field] = clampScoreInput(req.body[field]) || 3;
      } else if (field === "residualProbability" || field === "residualImpact") {
        risk[field] = clampScoreInput(req.body[field]);
      } else {
        risk[field] = req.body[field];
      }
    }
  });

  if (req.body.status === "closed" && !risk.resolutionDate) {
    risk.resolutionDate = new Date();
  }

  await risk.save();
  await risk.populate("ownerId", "name email");

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
    authorName: req.user.name || "Staff Member",
    createdAt: new Date()
  });

  await risk.save();
  await risk.populate("ownerId", "name email");
  return res.json(risk);
});

export const addRiskAttachment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const risk = await Risk.findById(id);
  if (!risk) {
    throw new AppError("Risk record not found", 404);
  }
  if (!ownedWebsiteIds.map(wId => wId.toString()).includes(risk.websiteId.toString())) {
    throw new AppError("Unauthorized access to this risk", 403);
  }

  let attachmentName = String(req.body?.name || "").trim();
  let attachmentUrl = String(req.body?.url || "").trim();

  if (req.file) {
    const protocol = req.protocol;
    const host = req.get("host");
    attachmentName = attachmentName || req.file.originalname || req.file.filename;
    attachmentUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  }

  if (!attachmentName || !attachmentUrl) {
    throw new AppError("Attachment file or evidence name and URL are required", 400);
  }

  risk.attachments.push({
    name: attachmentName,
    url: attachmentUrl,
    uploadedAt: new Date()
  });

  await risk.save();
  await risk.populate("ownerId", "name email");

  await logAuditEvent({
    userId: req.user._id,
    websiteId: risk.websiteId,
    action: "RISK_EVIDENCE_ATTACHED",
    resource: "Risk",
    resourceId: risk._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name: attachmentName, url: attachmentUrl }
  });

  return res.json(risk);
});

export const deleteRiskAttachment = asyncHandler(async (req, res) => {
  const { id, attachmentId } = req.params;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const risk = await Risk.findById(id);
  if (!risk) {
    throw new AppError("Risk record not found", 404);
  }
  if (!ownedWebsiteIds.map(wId => wId.toString()).includes(risk.websiteId.toString())) {
    throw new AppError("Unauthorized access to this risk", 403);
  }

  risk.attachments = (risk.attachments || []).filter(a => String(a._id) !== String(attachmentId));
  await risk.save();
  await risk.populate("ownerId", "name email");
  return res.json(risk);
});

export async function checkRiskReviewReminders() {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const dueRisks = await Risk.find({
      status: { $ne: "closed" },
      reviewDate: { $ne: null, $lte: endOfToday },
      $or: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { $lt: startOfToday } }
      ]
    }).limit(100);

    for (const risk of dueRisks) {
      const recipientId = risk.ownerId || risk.createdBy;
      if (!recipientId) continue;

      const isOverdue = new Date(risk.reviewDate) < startOfToday;
      await Notification.create({
        recipient: recipientId,
        type: "overdue_compliance",
        title: isOverdue ? `Risk Review Overdue: ${risk.title}` : `Risk Review Due Today: ${risk.title}`,
        message: `${risk.category} (Score ${risk.riskScore}/25) review was scheduled for ${new Date(risk.reviewDate).toLocaleDateString()}.`,
        link: "/admin?tab=risk-register",
        entityType: "Risk",
        entityId: risk._id
      });

      risk.lastReminderSentAt = new Date();
      await risk.save();
    }
  } catch (err) {
    console.warn("[RiskReminder] Failed checking due risk reviews:", err.message);
  }
}
