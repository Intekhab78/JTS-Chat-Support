import { logger } from "../utils/logger.js";
import { Notification } from "../models/Notification.js";

/**
 * Creates in-app Notification document for agents/clients/admins
 */
export async function createNotification({ userId, title, message, type = "info", link = "" }) {
  try {
    const notif = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      isRead: false
    });
    return notif;
  } catch (err) {
    console.error("[Notification Creation Error]", err.message);
  }
}

/**
 * Enterprise Notification Service (WhatsApp, SMS, Email Alerts)
 */
export async function sendTicketAlert({ website, ticket, callLog }) {
  if (!ticket) return;

  const phone = website?.voiceSettings?.alertPhoneNumber || "+971-50-9876543";
  const enableWhatsApp = website?.voiceSettings?.enableWhatsAppAlerts !== false;
  const enableSms = website?.voiceSettings?.enableSmsAlerts !== false;

  const alertMessage = `🚨 [URGENT SUPPORT ALERT - ${website?.websiteName || 'JTS Enterprise'}]
🎫 Ticket ID: ${ticket.ticketId}
📌 Subject: ${ticket.subject}
⚡ Priority: ${String(ticket.priority || 'medium').toUpperCase()}
📞 Caller Phone: ${callLog?.callerPhone || 'Website Voice Visitor'}
💬 Summary: ${ticket.description?.split('\n\n[AI Summary]\n')[1] || ticket.subject}
🕒 Time: ${new Date().toLocaleTimeString()}

Please log in to your dashboard to process this ticket immediately.`;

  if (enableWhatsApp) {
    logger.log(`[WHATSAPP ALERT SENT] to ${phone} -> Ticket ${ticket.ticketId}`);
    console.log(`\n📲 --- SIMULATED WHATSAPP OUTBOUND ALERT ---`);
    console.log(`TO: ${phone}`);
    console.log(`MESSAGE:\n${alertMessage}`);
    console.log(`-------------------------------------------\n`);
  }

  if (enableSms) {
    logger.log(`[SMS ALERT SENT] to ${phone} -> Ticket ${ticket.ticketId}`);
    console.log(`\n💬 --- SIMULATED SMS OUTBOUND ALERT ---`);
    console.log(`TO: ${phone}`);
    console.log(`MESSAGE: Ticket ${ticket.ticketId} created for ${ticket.subject}. Check Dashboard.`);
    console.log(`---------------------------------------\n`);
  }

  return {
    whatsappSent: enableWhatsApp,
    smsSent: enableSms,
    alertPhone: phone
  };
}
