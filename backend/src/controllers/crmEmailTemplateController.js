import { EmailTemplate } from "../models/EmailTemplate.js";
import { sendEmail } from "../services/emailService.js";
import AppError from "../utils/AppError.js";

/**
 * List all email templates within the client's website scope context
 */
export async function listTemplates(req, res, next) {
  try {
    const { websiteId } = req.query;
    if (!websiteId) {
      return next(new AppError("Website ID domain context is required.", 400));
    }

    const templates = await EmailTemplate.find({ websiteId }).sort({ createdAt: -1 });
    return res.status(200).json(templates);
  } catch (error) {
    return next(error);
  }
}

/**
 * Save / Create a new custom Email Template
 */
export async function createTemplate(req, res, next) {
  try {
    const { name, subject, htmlContent, websiteId } = req.body;

    if (!name || !name.trim()) return next(new AppError("Template name/identifier is required.", 400));
    if (!subject || !subject.trim()) return next(new AppError("Subject line is required.", 400));
    if (!htmlContent || !htmlContent.trim()) return next(new AppError("HTML template content is required.", 400));
    if (!websiteId) return next(new AppError("Website ID context is missing.", 400));

    // Check for duplicate names inside same website scope
    const existing = await EmailTemplate.findOne({ websiteId, name: name.trim() });
    if (existing) {
      return next(new AppError("A template with this name already exists in this website context.", 400));
    }

    const template = await EmailTemplate.create({
      name: name.trim(),
      subject: subject.trim(),
      htmlContent,
      websiteId,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: "Email template created successfully.",
      template
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Edit / Update an existing Email Template
 */
export async function updateTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { name, subject, htmlContent } = req.body;

    const template = await EmailTemplate.findById(id);
    if (!template) {
      return next(new AppError("Template not found.", 404));
    }

    if (name) template.name = name.trim();
    if (subject) template.subject = subject.trim();
    if (htmlContent) template.htmlContent = htmlContent;

    await template.save();

    return res.status(200).json({
      success: true,
      message: "Email template updated successfully.",
      template
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a custom Email Template
 */
export async function deleteTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const template = await EmailTemplate.findByIdAndDelete(id);
    if (!template) {
      return next(new AppError("Template not found.", 404));
    }

    return res.status(200).json({
      success: true,
      message: "Template deleted successfully."
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Dispatches a simulated test run of the template design to a specific email
 */
export async function sendTestEmail(req, res, next) {
  try {
    const { targetEmail, subject, htmlContent } = req.body;

    if (!targetEmail || !htmlContent) {
      return next(new AppError("targetEmail and htmlContent are required.", 400));
    }

    const finalSubject = (subject || "").trim() || "Notification Update";

    // Replace test variables/placeholders for live verification checks
    let parsedHtml = htmlContent
      .replace(/{customerName}/g, "Johnathan Doe (Test Client)")
      .replace(/{ctaText}/g, "ACTIVATE LIVE DASHBOARD")
      .replace(/{ctaUrl}/g, "https://chat.jtsmiddleeast.com")
      .replace(/{invoiceNumber}/g, "INV-2026-9999")
      .replace(/{amount}/g, "$2,500.00 USD");

    await sendEmail({
      to: targetEmail,
      subject: `[JTS Builder Test]: ${finalSubject}`,
      html: parsedHtml
    });

    return res.status(200).json({
      success: true,
      message: `Test email successfully dispatched to ${targetEmail}!`
    });
  } catch (error) {
    return next(error);
  }
}
