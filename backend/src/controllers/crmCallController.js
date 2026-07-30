import { CallLog } from "../models/CallLog.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const listCalls = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, page = 1, limit = 20 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ calls: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId && ownedWebsiteIds.map(id => id.toString()).includes(websiteId.toString())) {
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;

  const calls = await CallLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await CallLog.countDocuments(query);

  res.json({
    calls,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const createCall = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, direction, duration, outcome } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const call = await CallLog.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "call",
    title: `Call logged: ${direction === "incoming" ? "Inbound" : "Outbound"} call`,
    description: outcome || `Duration: ${duration} seconds.`,
    duration: Math.ceil(duration / 60),
    customerId,
    ownerId: req.user._id
  });

  res.status(201).json(call);
});

export const deleteCall = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const call = await CallLog.findById(req.params.id);

  if (!call) throw new AppError("Call log not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(call.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await CallLog.findByIdAndDelete(req.params.id);
  res.json({ message: "Call log deleted successfully" });
});
