import { EmailHistory } from "../models/EmailHistory.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const listEmails = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, page = 1, limit = 20 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ emails: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId && ownedWebsiteIds.map(id => id.toString()).includes(websiteId.toString())) {
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;

  const emails = await EmailHistory.find(query)
    .sort({ sentAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await EmailHistory.countDocuments(query);

  res.json({
    emails,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const createEmail = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, subject, body, direction } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const email = await EmailHistory.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "email",
    title: `Email logged: ${subject}`,
    description: body || `Direction: ${direction}.`,
    customerId,
    ownerId: req.user._id
  });

  res.status(201).json(email);
});

export const deleteEmail = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const email = await EmailHistory.findById(req.params.id);

  if (!email) throw new AppError("Email not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(email.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await EmailHistory.findByIdAndDelete(req.params.id);
  res.json({ message: "Email deleted successfully" });
});
