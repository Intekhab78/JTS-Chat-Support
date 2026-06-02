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
    console.error("[Email] Error sending email:", error);
    // Don't throw — we don't want email failure to crash the app logic
    return null;
  }
}

/**
 * Generate a standard HTML template for system emails
 */
export function getEmailTemplate(title, message, buttonText, buttonUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; }
        .header { margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 10px; }
        .message { font-size: 16px; margin-bottom: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; }
        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; pt: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">${title}</div>
        </div>
        <div class="message">
          ${message}
        </div>
        ${buttonText && buttonUrl ? `
          <a href="${buttonUrl}" class="button">${buttonText}</a>
        ` : ''}
        <div class="footer">
          &copy; ${new Date().getFullYear()} JTS Chat Support & Procurement System. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}
