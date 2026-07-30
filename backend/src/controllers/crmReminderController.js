import { Reminder } from "../models/Reminder.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listReminders = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
  if (websiteId && ownedWebsiteIds.map(id => id.toString()).includes(websiteId.toString())) {
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;

  const reminders = await Reminder.find(query).sort({ remindAt: 1 });
  res.json(reminders);
});

export const createReminder = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const reminder = await Reminder.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    ownerId: req.user._id
  });

  res.status(201).json(reminder);
});

export const deleteReminder = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const reminder = await Reminder.findById(req.params.id);

  if (!reminder) throw new AppError("Reminder not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(reminder.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await Reminder.findByIdAndDelete(req.params.id);
  res.json({ message: "Reminder deleted successfully" });
});
