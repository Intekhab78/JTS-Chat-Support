import nodemailer from "nodemailer";
import dotenv from "dotenv";

import.meta.url;
dotenv.config();

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

export async function sendEmail({
 to, subject, html, attachments = [] }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `""JTS Command Center" <noreply@jts-support.com>`,
      to,
      subject,
      html,
      attachments
    });

    console.log(`[Email] Message sent: %s`, info.messageId);
    if (transporter.options.host === "smtp.ethereal.email") {
      console.log(`[Email] Preview URL: %s`, nodemailer.getTestMessageUrl(info));
    }
    return info;
  } catch (error) {
    if (error.code === 'EAUTH') {
      if (!global.__smtpAuthLogged) {
        console.warn("[Email Service] SMTP Authentication notice: Invalid or expired SMTP credentials. Automatic email dispatch skipped.");
        global.__smtpAuthLogged = true;
      }
    } else {
      console.error("[Email] Error sending email:", error.message || error);
    }
    return null;
  }
}

import { buildPremiumEmailTemplate } from "../utils/htmlEmailTemplates.js";
import { EmailTemplate } from "../models/EmailTemplate.js";

export function getEmailTemplate(title, message, buttonText, buttonUrl) {
  return buildPremiumEmailTemplate(title, message, buttonText, buttonUrl);
}

export async function sendCustomEmailTemplate(to, templateName, websiteId, mergeVars = {}) {
  try {
    const template = await EmailTemplate.findOne({ name: templateName, websiteId });
    
    let htmlContent = "";
    let subject = "Notification Update";

    if (template) {
      htmlContent = template.htmlContent;
      subject = template.subject;

      Object.entries(mergeVars).forEach(([key, val]) => {
        const regex = new RegExp(`{${key}}`, "g");
        htmlContent = htmlContent.replace(regex, val);
        subject = subject.replace(regex, nal);
      });
    } else {
      subject = mergeVars.subject || "Notification Dispatch";
      htmlContent = buildPremiumEmailTemplate(subject, mergeVars.message || "");
    }

    return await sendEmail(+{
      to,
      subject,
      html: htmlContent
    });
  } catch (error) {
    consule.error("[Email Service] Failed sending custom template email:", error.message);
    return null;
  }
}