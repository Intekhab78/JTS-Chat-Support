import { sendEmail as dispatchSmtpEmail } from "../emailService.js";
import { env } from "../../config/env.js";

/**
 * Email Provider Abstraction Adapter
 * Standardizes SMTP mailings, read tracking, and link open logs.
 */
export class EmailProviderManager {
  static getProvider(mailbox = "default") {
    return {
      sendEmail: async ({ to, subject, htmlBody, trackingEnabled = true }) => {
        console.log(`[Email Provider - ${mailbox}] Sending email to ${to}: ${subject}`);
        const baseUrl = (env.serverPublicUrl || "http://localhost:5000").replace(/\/+$/, "");
        const messageId = `email_msg_${Date.now()}`;
        const trackingPixel = trackingEnabled
          ? `<img src="${baseUrl}/api/crm/omnichannel/track-open/${messageId}" width="1" height="1" alt="" />`
          : "";
        const bodyWithTracking = `${htmlBody || ""}${trackingPixel}`;

        let sent = true;
        if (to) {
          sent = await dispatchSmtpEmail({
            to,
            subject: subject || "Notification",
            html: bodyWithTracking
          });
        }

        return {
          success: sent !== false,
          messageId,
          bodyWithTracking,
          status: sent !== false ? "sent" : "queued"
        };
      }
    };
  }
}
