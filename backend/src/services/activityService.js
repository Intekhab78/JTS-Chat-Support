import { ActivityEvent } from "../models/ActivityEvent.js";
import * as activityRepository from "../repositories/activityRepository.js";
import { Reminder } from "../models/Reminder.js";
import AppError from "../utils/AppError.js";
import { sendEmail } from "./emailService.js";
import { MeetingPlatform } from "../models/MeetingPlatform.js";
import { generateRoomId, buildMeetingLink } from "../controllers/meetingPlatformController.js";

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

  // Auto-generate meeting room link if platform has a URL template
  let meetingLink = data.meetingLink || null;
  let meetingRoomId = data.meetingRoomId || null;
  if (!meetingLink && data.meetingType && data.websiteId && (data.type === "meeting" || data.type === "call")) {
    try {
      const platform = await MeetingPlatform.findOne({ key: data.meetingType, websiteId: data.websiteId, isActive: true });
      if (platform?.urlTemplate) {
        meetingRoomId = generateRoomId(data.meetingType);
        meetingLink = buildMeetingLink(platform, meetingRoomId);
      }
    } catch (e) {
      console.warn("[MeetingPlatform] Could not generate link:", e.message);
    }
  }

  const activity = await activityRepository.create({
    ...data,
    meetingLink,
    meetingRoomId,
    ownerId: data.ownerId || actorId
  });

  // Sync reminder if requested
  if (data.reminderOffsetMinutes) {
    await syncActivityReminder(activity, data.reminderOffsetMinutes);
  }

  // Send meeting invitation emails to all participants
  const emails = data.participantEmails || [];
  if (emails.length > 0 && (data.type === "meeting" || data.type === "call")) {
    const eventDate = data.dueDate ? new Date(data.dueDate).toLocaleString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: data.timezone || "Asia/Kolkata"
    }) : "TBD";
    const platform = data.meetingType ? data.meetingType.replace(/_/g, " ").toUpperCase() : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head><style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .wrap { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 36px 40px; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 800; }
        .header p { color: #c7d2fe; margin: 6px 0 0; font-size: 13px; }
        .body { padding: 36px 40px; }
        .badge { display: inline-block; background: #eef2ff; color: #6366f1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 12px; border-radius: 999px; margin-bottom: 20px; }
        .info-row { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
        .info-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
        .info-text { font-size: 14px; }
        .info-text strong { display: block; font-weight: 700; color: #0f172a; }
        .info-text span { color: #64748b; font-size: 13px; }
        .divider { border: none; border-top: 1px solid #f1f5f9; margin: 28px 0; }
        .footer { background: #f8fafc; padding: 20px 40px; font-size: 12px; color: #94a3b8; text-align: center; }
      </style></head>
      <body>
        <div class="wrap">
          <div class="header">
            <h1>📅 ${data.type === "meeting" ? "Meeting Invitation" : "Call Scheduled"}</h1>
            <p>You have been invited to a ${data.type}</p>
          </div>
          <div class="body">
            <span class="badge">${data.type} • ${platform}</span>
            <div class="info-row"><span class="info-icon">📌</span><div class="info-text"><strong>Subject</strong><span>${data.title}</span></div></div>
            <div class="info-row"><span class="info-icon">🗓</span><div class="info-text"><strong>Date &amp; Time</strong><span>${eventDate} (${data.timezone || "Asia/Kolkata"})</span></div></div>
            ${data.endAt ? `<div class="info-row"><span class="info-icon">⏱</span><div class="info-text"><strong>End Time</strong><span>${new Date(data.endAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: data.timezone || "Asia/Kolkata" })}</span></div></div>` : ""}
            ${platform ? `<div class="info-row"><span class="info-icon">🔗</span><div class="info-text"><strong>Platform</strong><span>${platform}</span></div></div>` : ""}
            ${meetingLink ? `<div style="margin:24px 0;padding:20px;background:#eef2ff;border-radius:16px;text-align:center;"><p style="margin:0 0 12px;font-size:13px;color:#6366f1;font-weight:700;">JOIN MEETING</p><a href="${meetingLink}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:12px;font-weight:800;font-size:15px;">🎯 Click to Join</a><p style="margin:10px 0 0;font-size:11px;color:#94a3b8;">Or copy link: ${meetingLink}</p></div>` : ""}
            ${data.description ? `<hr class="divider"><div class="info-row"><span class="info-icon">📝</span><div class="info-text"><strong>Notes / Agenda</strong><span>${data.description}</span></div></div>` : ""}
          </div>
          <div class="footer">&copy; ${new Date().getFullYear()} JTS Chat Support &amp; CRM. This is an automated invitation.</div>
        </div>
      </body></html>
    `;

    // Fire and forget — don't await so it doesn't block the API response
    Promise.all(
      emails.map(email =>
        sendEmail({
          to: email,
          subject: `📅 ${data.type === "meeting" ? "Meeting Invite" : "Call Scheduled"}: ${data.title}`,
          html
        })
      )
    ).catch(err => console.error("[Meeting Email] Send error:", err.message));
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

  // Send rescheduled notification if date/time changed
  const emails = data.participantEmails || activity.participantEmails || [];
  const isRescheduled = data.dueDate && String(data.dueDate) !== String(activity.dueDate);
  if (emails.length > 0 && isRescheduled && (updated.type === "meeting" || updated.type === "call")) {
    const newDate = new Date(data.dueDate).toLocaleString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: updated.timezone || "Asia/Kolkata"
    });
    const html = `
      <!DOCTYPE html><html><head><style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; color: #334155; }
        .wrap { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 36px 40px; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 800; }
        .header p { color: #fef3c7; margin: 6px 0 0; font-size: 13px; }
        .body { padding: 36px 40px; font-size: 14px; }
        .footer { background: #f8fafc; padding: 20px 40px; font-size: 12px; color: #94a3b8; text-align: center; }
      </style></head><body>
        <div class="wrap">
          <div class="header"><h1>🔄 ${updated.type === "meeting" ? "Meeting" : "Call"} Rescheduled</h1><p>Time has been updated</p></div>
          <div class="body">
            <p><strong>${updated.title}</strong> has been rescheduled.</p>
            <p>📅 <strong>New Date &amp; Time:</strong> ${newDate} (${updated.timezone || "Asia/Kolkata"})</p>
            <p style="color:#94a3b8;font-size:12px;">If you have questions, please contact the organizer.</p>
          </div>
          <div class="footer">&copy; ${new Date().getFullYear()} JTS Chat Support &amp; CRM.</div>
        </div>
      </body></html>
    `;
    Promise.all(
      emails.map(email => sendEmail({ to: email, subject: `🔄 Rescheduled: ${updated.title}`, html }))
    ).catch(err => console.error("[Reschedule Email] Send error:", err.message));
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
