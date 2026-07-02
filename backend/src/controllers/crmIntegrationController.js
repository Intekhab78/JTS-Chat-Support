import crypto from "crypto";
import { ApiKey } from "../models/ApiKey.js";
import { OauthApp } from "../models/OauthApp.js";
import { WebhookDeliveryLog } from "../models/WebhookDeliveryLog.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { dispatchWebhookEvent } from "../services/webhookDispatcher.js";

// API Keys CRUD
export const listApiKeys = asyncHandler(async (req, res) => {
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

  const keys = await ApiKey.find(query).sort({ createdAt: -1 });
  res.json(keys);
});

export const createApiKey = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, name } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  // Generate plain prefix key
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `jts_live_${randomBytes}`;

  const keyRecord = await ApiKey.create({
    websiteId: resolvedWebsiteId,
    name: name || "Developer Key",
    key: rawKey
  });

  res.status(201).json(keyRecord);
});

export const revokeApiKey = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const keyRecord = await ApiKey.findById(req.params.id);

  if (!keyRecord) throw new AppError("API Key not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(keyRecord.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  keyRecord.status = "revoked";
  await keyRecord.save();

  res.json({ message: "API Key revoked successfully" });
});

// OAuth Client configurations
export const listOauthApps = asyncHandler(async (req, res) => {
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

  const apps = await OauthApp.find(query).sort({ name: 1 });
  res.json(apps);
});

export const createOauthApp = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, name, redirectUri, scopes } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  const clientId = `cli_${crypto.randomBytes(12).toString("hex")}`;
  const clientSecret = `sec_${crypto.randomBytes(24).toString("hex")}`;

  const app = await OauthApp.create({
    websiteId: resolvedWebsiteId,
    name,
    clientId,
    clientSecret,
    redirectUri,
    scopes: scopes || ["crm:read"]
  });

  res.status(201).json(app);
});

// Webhooks log traces
export const listWebhookLogs = asyncHandler(async (req, res) => {
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

  const logs = await WebhookDeliveryLog.find(query).sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

export const triggerSandboxWebhook = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, url, eventName } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  // Trigger outbound signed webhook async
  dispatchWebhookEvent(resolvedWebsiteId, eventName || "test_event", url, {
    testPayload: "sandbox_verification_value",
    timestamp: new Date()
  }).catch(console.error);

  res.json({ success: true, message: "Sandbox Webhook trigger initialized." });
});
