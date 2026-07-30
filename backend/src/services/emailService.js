import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create a transporter using environment variables
// For testing/dev, you can use a service like Ethereal or Mailtrap
const isGmail = process.env.SMTP_HOST === "smtp.gmail.com";

const transporter = nodemailer.createTransport(
  isGmail
    ? {
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }
    : {
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "mock_user@example.com",
          pass: process.env.SMTP_PASS || "mock_pass"
        }
      }
);

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
import { EmailTemplate } from "../models/EmailTemplate.js";

/**
 * Generate a standard HTML template for system emails
 */
export function getEmailTemplate(title, message, buttonText, buttonUrl) {
  return buildPremiumEmailTemplate(title, message, buttonText, buttonUrl);
}

/**
 * Sends an email using a custom stored HTML template with placeholder merge tags
 * @param {string} to - Destination recipient email address.
 * @param {string} templateName - The name key of the customized template.
 * @param {string} websiteId - Website scope context ID.
 * @param {Object} mergeVars - KV merge tags (e.g. { customerName: "John", amount: "$50" }).
 */
export async function sendCustomEmailTemplate(to, templateName, websiteId, mergeVars = {}) {
  try {
    const template = await EmailTemplate.findOne({ name: templateName, websiteId });
    
    let htmlContent = "";
    let subject = "Notification Update";

    if (template) {
      htmlContent = template.htmlContent;
      subject = template.subject;

      // Swap placeholder merge tags dynamically
      Object.entries(mergeVars).forEach(([key, val]) => {
        const regex = new RegExp(`{${key}}`, "g");
        htmlContent = htmlContent.replace(regex, val);
        subject = subject.replace(regex, val);
      });
    } else {
      console.warn(`[Email Service] Custom template "${templateName}" not found. Falling back to default layout.`);
      subject = mergeVars.subject || "Notification Dispatch";
      htmlContent = buildPremiumEmailTemplate(subject, mergeVars.message || "");
    }

    return await sendEmail({
      to,
      subject,
      html: htmlContent
    });
  } catch (error) {
    console.error("[Email Service] Failed sending custom template email:", error.message);
    return null;
  }
}
