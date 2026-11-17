import { ObservabilityAlert } from "../models/ObservabilityAlert.js";
import { AuditLog } from "../models/AuditLog.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { collectTelemetrySnapshot, runObservabilityCheck } from "../services/observabilityTelemetryService.js";

export const getObservabilityOverview = asyncHandler(async (req, res) => {
  const { snapshot } = await collectTelemetrySnapshot({ recordHistory: true });
  return res.json(snapshot);
});

export const searchAuditLogs = asyncHandler(async (req, res) => {
  const { action, search, level, limit = 50 } = req.query;
  const query = {};

  if (req.user && req.user.role !== "admin") {
    const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
    query.$and = [
      {
        $or: [
          { websiteId: { $in: ownedWebsiteIds } },
          { actorId: req.user._id }
        ]
      }
    ];
  }

  if (action) query.action = action;
  if (level) query.level = level;
  if (search) {
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchOr = [
      { action: { $regex: escaped, $options: "i" } },
      { entityType: { $regex: escaped, $options: "i" } },
      { actorName: { $regex: escaped, $options: "i" } },
      { ipAddress: { $regex: escaped, $options: "i" } }
    ];
    if (query.$and) query.$and.push({ $or: searchOr });
    else query.$or = searchOr;
  }

  const logs = await AuditLog.find(query)
    .populate({ path: "actorId", select: "name email role", strictPopulate: false })
    .sort({ createdAt: -1 })
    .limit(Math.min(500, Math.max(1, Number(limit) || 50)));

  return res.json(logs);
});

export const listAlertRules = asyncHandler(async (req, res) => {
  const alerts = await ObservabilityAlert.find({}).populate("createdBy", "name email").sort({ createdAt: -1 });
  return res.json(alerts);
});

export const createAlertRule = asyncHandler(async (req, res) => {
  const { ruleName, metricType, thresholdValue, severity, notificationChannel, webhookUrl } = req.body;

  if (!ruleName || !metricType || thresholdValue === undefined) {
    throw new AppError("Rule name, metric type, and threshold value are required", 400);
  }

  const alert = await ObservabilityAlert.create({
    ruleName,
    metricType,
    thresholdValue: Number(thresholdValue),
    severity: severity || "warning",
    notificationChannel: notificationChannel || "in_app",
    webhookUrl: webhookUrl ? String(webhookUrl).trim() : "",
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "OBSERVABILITY_ALERT_RULE_CREATED",
    resource: "ObservabilityAlert",
    resourceId: alert._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { ruleName: alert.ruleName, metricType: alert.metricType }
  });

  // Trigger immediate background evaluation so newly-breached rules notify promptly
  void runObservabilityCheck();

  return res.status(201).json(alert);
});

export const deleteAlertRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const alert = await ObservabilityAlert.findByIdAndDelete(id);

  if (!alert) {
    throw new AppError("Alert rule not found", 404);
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "OBSERVABILITY_ALERT_RULE_DELETED",
    resource: "ObservabilityAlert",
    resourceId: alert._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { ruleName: alert.ruleName }
  });

  return res.json({ message: "Alert rule deleted successfully" });
});
