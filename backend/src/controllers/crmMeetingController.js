import { Meeting } from "../models/Meeting.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const listMeetings = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, page = 1, limit = 20 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ meetings: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;

  const meetings = await Meeting.find(query)
    .populate("organizerId", "name email role")
    .sort({ startAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Meeting.countDocuments(query);

  res.json({
    meetings,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const createMeeting = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const meeting = await Meeting.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    organizerId: req.user._id
  });

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "meeting",
    title: `Meeting Scheduled: ${meeting.title}`,
    description: meeting.agenda || "Discussion session.",
    customerId: meeting.customerId,
    ownerId: req.user._id
  });

  res.status(201).json(meeting);
});

export const updateMeeting = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) throw new AppError("Meeting not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(meeting.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const updated = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export const deleteMeeting = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) throw new AppError("Meeting not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(meeting.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await Meeting.findByIdAndDelete(req.params.id);
  res.json({ message: "Meeting deleted successfully" });
});
