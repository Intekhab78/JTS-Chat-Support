import * as activityService from "../services/activityService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { Reminder } from "../models/Reminder.js";

export const listActivities = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { search, websiteId, customerId, companyId, contactId, dealId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ activities: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId && ownedWebsiteIds.map(id => id.toString()).includes(websiteId.toString())) {
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;
  if (companyId) query.companyId = companyId;
  if (contactId) query.contactId = contactId;
  if (dealId) query.dealId = dealId;

  // -- Enforce RBAC Rules (Module 6) --
  if (req.user.role === "sales" || req.user.role === "support" || req.user.role === "agent") {
    query.ownerId = req.user._id;
  }

  // Date Range Filtering (Module 1 Centralized Calendar Range)
  if (startDate || endDate) {
    query.dueDate = {};
    if (startDate) query.dueDate.$gte = new Date(startDate);
    if (endDate) query.dueDate.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { title: new RegExp(search, "i") },
      { description: new RegExp(search, "i") }
    ];
  }

  // Support querying Reminders directly mapped as calendar items
  if (type === "reminder") {
    const reminders = await Reminder.find({
      ...query,
      remindAt: query.dueDate // map range query key to remindAt
    }).populate("ownerId", "name email");

    const mappedReminders = reminders.map(r => ({
      _id: r._id,
      websiteId: r.websiteId,
      type: "reminder",
      title: r.title,
      dueDate: r.remindAt,
      ownerId: r.ownerId,
      status: r.isSent ? "completed" : "pending",
      customerId: r.customerId
    }));

    return res.json({
      activities: mappedReminders,
      pagination: { total: mappedReminders.length, page: 1, pages: 1 }
    });
  }

  if (type) query.type = type;

  const result = await activityService.getActivitiesList(query, {
    page: parseInt(page),
    limit: parseInt(limit),
    populate: ["ownerId", "customerId"]
  });

  res.json(result);
});

export const createActivity = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const activity = await activityService.createActivity(
    { ...req.body, websiteId: resolvedWebsiteId },
    req.user._id
  );

  res.status(201).json(activity);
});

export const updateActivity = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const activity = await activityService.getActivity(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(activity.websiteId.toString())) {
    throw new AppError("Unauthorized access to this activity's data", 403);
  }

  const updated = await activityService.updateActivity(req.params.id, req.body, req.user._id);
  res.json(updated);
});

export const deleteActivity = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const activity = await activityService.getActivity(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(activity.websiteId.toString())) {
    throw new AppError("Unauthorized access to this activity's data", 403);
  }

  const response = await activityService.deleteActivity(req.params.id, req.user._id);
  res.json(response);
});
