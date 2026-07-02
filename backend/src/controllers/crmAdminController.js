import { TenantConfig } from "../models/TenantConfig.js";
import { FeatureFlag } from "../models/FeatureFlag.js";
import { CustomFieldDefinition } from "../models/CustomFieldDefinition.js";
import { SessionAudit } from "../models/SessionAudit.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

// Tenant Settings Config
export const getTenantConfig = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access scope", 403);
  }

  let config = await TenantConfig.findOne({ websiteId: resolvedWebsiteId });
  if (!config) {
    config = await TenantConfig.create({ websiteId: resolvedWebsiteId });
  }

  res.json(config);
});

export const saveTenantConfig = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access scope", 403);
  }

  const config = await TenantConfig.findOneAndUpdate(
    { websiteId: resolvedWebsiteId },
    req.body,
    { new: true, upsert: true }
  );

  res.json(config);
});

// Feature Flags CRUD
export const listFeatureFlags = asyncHandler(async (req, res) => {
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

  const flags = await FeatureFlag.find(query).sort({ name: 1 });
  res.json(flags);
});

export const createFeatureFlag = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  const flag = await FeatureFlag.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(flag);
});

// Custom Fields
export const listCustomFields = asyncHandler(async (req, res) => {
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

  const definitions = await CustomFieldDefinition.find(query).sort({ entityName: 1 });
  res.json(definitions);
});

export const createCustomField = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  const field = await CustomFieldDefinition.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(field);
});

// Session Management Logs
export const listSessionAudits = asyncHandler(async (req, res) => {
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

  const audits = await SessionAudit.find(query)
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(audits);
});

export const revokeSession = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const session = await SessionAudit.findById(req.params.id);

  if (!session) throw new AppError("Session not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(session.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  session.revokedAt = new Date();
  await session.save();

  res.json({ message: "Session revoked successfully" });
});
