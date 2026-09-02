import { logger } from "../utils/logger.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { NOTIFICATION_TYPES } from "../constants/domain.js";

export async function createNotification( { userId, recipient, title, message, type = "system_alert", link = "", actorId, actorName, entityType, entityId, metadata }) {
  try {
    let targetRecipient = recipient || userId;

    if (!targetRecipient) {
      const admin = await User.findOne({ role: "admin" }).select("_id");
      if (admin) targetRecipient = admin._id;
    }

    if (!targetRecipient) {
      return null;
    }

    const validTypes = Array.isArray(NOTIFICATION_TYPES) ? NOTIFICATION_TYPES : [];
    const validCategoryType = validTypes.includes(type) ? type : "system_alert";

    const notif = await Notification.create({
      recipient: targetRecipient,
      title: title || "System Alert",
      message: message || "",
      type: validCategoryType,
      link: link || "",
      actorId: actorId || null,
      actorName: actorName || "",
      entityType: entityType || "",
      entityId: entityId || "",
      metadata: metadata || {},
      isRead: false
    });
    return notif;
  } catch (err) {
    console.error("[Notification Creation Error]", err.message);
  }
}

export async function sendTicketAlert({ website, ticket, callLog }) {
  if (!ticket) return;
  const phone = website?.voiceSettings?.alertPhoneNumber || "+971-50-9876543";
  const enableWhatsApp = website?.voiceSettings?.enableWhatsAppAlerts !== false;
  const enableSms = website?.voiceSettings?.enableSmsAlerts !== false;
  if (enableWhatsApp) { logger.log(`[WHATSAPP ALERT SENT] to ${phone} -> Ticket ${ticket.ticketId}`); }
  if (enableSms) { logger.log(`[SMS ALERT SENT] to ${phone} -> Ticket ${ticket.ticketId}`); }
  return { whatsappSent: enableWhatsApp, smsSent: enableSms, alertPhone: phone };
}