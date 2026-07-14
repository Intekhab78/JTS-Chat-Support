import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create a transporter using environment variables
// For testing/dev, you can use a service like Ethereal or Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "mock_user@example.com",
    pass: process.env.SMTP_PASS || "mock_pass"
  }
});

/**
 * Send an email
 * @param {Object} options - { to, subject, html, attachments }
 */
export async function sendEmail({ to, subject, html, attachments = [] }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"JTS Command Center" <noreply@jts-support.com>`,
      to,
      subject,
      html,
      attachments
    });

    console.log(`[Email] Message sent: %s`, info.messageId);
    // If using Ethereal, log the preview URL
    if (transporter.options.host === "smtp.ethereal.email") {
      console.log(`[Email] Preview URL: %s`, nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    if (error.code === 'EAUTH') {
      console.error("[Email] Authentication failed (Too many logins / Invalid credentials). Email skipped.");
    } else {
      console.error("[Email] Error sending email:", error.message || error);
    }
    // Don't throw — we don't want email failure to crash the app logic
    return null;
  }
}

import { buildPremiumEmailTemplate } from "../utils/htmlEmailTemplates.js";

/**
 * Generate a standard HTML template for system emails
 */
export function getEmailTemplate(title, message, buttonText, buttonUrl) {
  return buildPremiumEmailTemplate(title, message, buttonText, buttonUrl);
}
