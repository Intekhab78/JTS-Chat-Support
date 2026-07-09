import { ActivityEvent } from "../models/ActivityEvent.js";
import * as activityRepository from "../repositories/activityRepository.js";
import { Reminder } from "../models/Reminder.js";
import AppError from "../utils/AppError.js";

/* ── Reminder Synchronization Helper ── */
const syncActivityReminder = async (activity, reminderOffsetMinutes) => {
  if (!activity.dueDate) return;

  const offset = parseInt(reminderOffsetMinutes) || 15; // default 15 mins before
  const remindAt = new Date(new Date(activity.dueDate).getTime() - offset * 60 * 1000);

  const existing = await Reminder.findOne({ relatedId: activity._id });
  if (existing) {
    if (activity.status === "cancelled" || activity.isDeleted) {
      await Reminder.findByIdAndDelete(existing._id);
    } else if (activity.status === "completed") {
      existing.isSent = true;
      await existing.save();
    } else {
      existing.remindAt = remindAt;
      existing.title = `Reminder: ${activity.title}`;
      existing.isSent = false;
      await existing.save();
    }
  } else if (activity.status !== "cancelled" && activity.status !== "completed" && !activity.isDeleted) {
    await Reminder.create({
      websiteId: activity.websiteId,
      customerId: activity.customerId || null,
      type: activity.type === "meeting" ? "meeting" : activity.type === "call" ? "call" : "custom",
      title: `Reminder: ${activity.title}`,
      remindAt,
      ownerId: activity.ownerId,
      relatedId: activity._id
    });
  }
};

/* ── Original Auditing Event Helpers ── */
export async function createActivityEvent({
  actor = null,
  websiteId = null,
  entityType,
  entityId,
  type,
  summary,
  visibility = "internal",
  metadata = {}
}) {
  if (!entityType || !entityId || !type || !summary) return null;

  try {
    return await ActivityEvent.create({
      actorId: actor?._id || null,
      actorName: actor?.name || "System",
      actorRole: actor?.role || "system",
      websiteId,
      entityType,
      entityId: String(entityId),
      type,
      summary,
      visibility,
      metadata
    });
  } catch (error) {
    console.error("Activity event error:", error.message);
    return null;
  }
}

export async function listActivityForEntity({ entityType, entityId, visitorId = null, limit = 100 }) {
  const query = {
    $or: [
      { entityType, entityId: String(entityId) }
    ]
  };

  if (visitorId) {
    query.$or.push({ "metadata.visitorId": String(visitorId) });
  }

  return ActivityEvent.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
}

/* ── New CRM Activity Service Layer Methods ── */
export const getActivitiesList = async (query, { page = 1, limit = 50, populate = ["ownerId"] } = {}) => {
  const skip = (page - 1) * limit;
  const activities = await activityRepository.find(query, { skip, limit, populate });
  const total = await activityRepository.count(query);
  return {
    activities,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  };
};

export const getActivity = async (id, populate = ["ownerId"]) => {
  const activity = await activityRepository.findById(id, populate);
  if (!activity) {
    throw new AppError("Activity not found", 404);
  }
  return activity;
};

export const createActivity = async (data, actorId) => {
  if (!data.type || !data.title || !data.dueDate) {
    throw new AppError("Activity type, title, and due date are required", 400);
  }

  const activity = await activityRepository.create({
    ...data,
    ownerId: data.ownerId || actorId
  });

  // Sync reminder if requested (e.g. reminderOffsetMinutes is passed)
  if (data.reminderOffsetMinutes) {
    await syncActivityReminder(activity, data.reminderOffsetMinutes);
  }

  return activity;
};

export const updateActivity = async (id, data, actorId) => {
  const activity = await activityRepository.findById(id);
  if (!activity) {
    throw new AppError("Activity not found", 404);
  }

  // Manage completion tracking
  if (data.status === "completed" && activity.status !== "completed") {
    data.completedAt = new Date();
    data.completedBy = actorId;
  } else if (data.status === "pending") {
    data.completedAt = null;
    data.completedBy = null;
  }

  const updated = await activityRepository.update(id, data);

  // Sync reminder
  const offset = data.reminderOffsetMinutes || (await Reminder.findOne({ relatedId: id }))?.remindAt ? 15 : null;
  if (offset || data.status === "cancelled" || data.status === "completed") {
    await syncActivityReminder(updated, offset);
  }

  return updated;
};

export const deleteActivity = async (id, actorId) => {
  const activity = await activityRepository.findById(id);
  if (!activity) {
    throw new AppError("Activity not found", 404);
  }

  await activityRepository.softDelete(id);

  // Remove corresponding reminders
  await Reminder.deleteMany({ relatedId: id });

  return { message: "Activity deleted successfully" };
};
