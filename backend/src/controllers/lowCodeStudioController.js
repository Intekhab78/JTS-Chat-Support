import mongoose from "mongoose";
import { LowCodeStudioPage } from "../models/LowCodeStudioPage.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Website } from "../models/Website.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";
import { getSocketServer } from "../sockets/index.js";

const DEFAULT_PAGES = [
  {
    pageName: "Enterprise Tax Filing & Document Intake Form",
    slug: "tax-filing-intake",
    pageType: "form",
    targetEntity: "lead",
    submitButtonText: "Submit Filing Intake",
    successMessage: "Your corporate tax intake details have been submitted. A senior tax consultant has been assigned.",
    layoutComponents: [
      { componentType: "input", label: "Company Commercial Name", props: { name: "companyName", required: true, placeholder: "e.g. Al-Baraka Tech LLC" } },
      { componentType: "input", label: "Contact Person Name", props: { name: "contactName", required: true, placeholder: "e.g. Ahmed Al-Mansoor" } },
      { componentType: "input", label: "Business Email", props: { name: "email", required: true, type: "email", placeholder: "ahmed@albaraka.ae" } },
      { componentType: "input", label: "Phone / WhatsApp", props: { name: "phone", required: true, placeholder: "+971 50 123 4567" } },
      { componentType: "select", label: "Filing Period", props: { name: "filingPeriod", options: ["Q1-2026", "Q2-2026", "Annual 2025"] } },
      { componentType: "checkbox", label: "I confirm all VAT records are accurate under UAE Tax Law", props: { name: "taxComplianceAgreed", checked: true } }
    ]
  },
  {
    pageName: "Executive Financial & Revenue Overview Dashboard",
    slug: "executive-financial-dashboard",
    pageType: "dashboard",
    layoutComponents: [
      { componentType: "chart", label: "Monthly Revenue (MRR Trend)", props: { chartType: "area", height: 280 } },
      { componentType: "table", label: "High-Priority Client Tax Deadlines", props: { columns: ["Client", "TRN", "Status", "Due Date"] } },
      { componentType: "kanban", label: "Audit Resolution Pipeline", props: { stages: ["Pending", "In Review", "Filed"] } }
    ]
  }
];

export const getStudioOverview = asyncHandler(async (req, res) => {
  let count = await LowCodeStudioPage.countDocuments({});

  if (count === 0) {
    await LowCodeStudioPage.insertMany(DEFAULT_PAGES.map(p => ({ ...p, createdBy: req.user._id })));
  }

  const pages = await LowCodeStudioPage.find({}).sort({ createdAt: -1 });

  // Compute submission counts per page
  const submissionCounts = await FormSubmission.aggregate([
    { $group: { _id: "$pageId", count: { $sum: 1 } } }
  ]);
  const submissionMap = Object.fromEntries(submissionCounts.map(s => [String(s._id), s.count]));

  const enrichedPages = pages.map(page => {
    const pObj = page.toObject();
    pObj.submissionCount = submissionMap[String(page._id)] || 0;
    return pObj;
  });

  return res.json({
    summary: {
      totalPages: pages.length,
      publishedPages: pages.filter(p => p.isPublished).length,
      totalSubmissionsReceived: Object.values(submissionMap).reduce((a, b) => a + b, 0),
      availableDragDropComponents: 12,
      sdkStatus: "LOW_CODE_ENGINE_READY"
    },
    pages: enrichedPages
  });
});

export const createStudioPage = asyncHandler(async (req, res) => {
  const { pageName, pageType, slug, targetEntity, submitButtonText, successMessage, layoutComponents, themeConfig } = req.body;

  if (!pageName) throw new AppError("Page name is required", 400);

  const cleanSlug = (slug || pageName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existing = await LowCodeStudioPage.findOne({ slug: cleanSlug });
  const finalSlug = existing ? `${cleanSlug}-${Date.now().toString().slice(-4)}` : cleanSlug;

  const newPage = await LowCodeStudioPage.create({
    pageName,
    pageType: pageType || "form",
    slug: finalSlug,
    targetEntity: targetEntity || "lead",
    submitButtonText: submitButtonText || "Submit",
    successMessage: successMessage || "Thank you! Your information has been received.",
    layoutComponents: Array.isArray(layoutComponents) && layoutComponents.length > 0 ? layoutComponents : [
      { componentType: "input", label: "Full Name", props: { name: "name", required: true } },
      { componentType: "input", label: "Email Address", props: { name: "email", required: true } },
      { componentType: "input", label: "Phone Number", props: { name: "phone" } }
    ],
    themeConfig: themeConfig || {},
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "LOWCODE_STUDIO_PAGE_CREATED",
    resource: "LowCodeStudioPage",
    resourceId: newPage._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { pageName: newPage.pageName, slug: newPage.slug, pageType: newPage.pageType }
  });

  return res.status(201).json(newPage);
});

export const exportPageJson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = await LowCodeStudioPage.findById(id);

  if (!page) throw new AppError("Low-code page definition not found", 404);

  return res.json({
    version: "1.0.0",
    exportedAt: new Date(),
    schema: page
  });
});

export const deleteStudioPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = await LowCodeStudioPage.findByIdAndDelete(id);

  if (!page) throw new AppError("Page not found", 404);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "LOWCODE_STUDIO_PAGE_DELETED",
    resource: "LowCodeStudioPage",
    resourceId: page._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { pageName: page.pageName }
  });

  return res.json({ message: "Page deleted successfully" });
});

/**
 * PUBLIC: Fetch published form definition by slug or ID
 */
export const getPublicForm = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;

  let query = { isPublished: true };
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    query._id = idOrSlug;
  } else {
    query.slug = idOrSlug;
  }

  const page = await LowCodeStudioPage.findOne(query);
  if (!page) {
    throw new AppError("Form not found or unpublished", 404);
  }

  return res.json({
    id: page._id,
    pageName: page.pageName,
    slug: page.slug,
    pageType: page.pageType,
    targetEntity: page.targetEntity,
    submitButtonText: page.submitButtonText,
    layoutComponents: page.layoutComponents,
    themeConfig: page.themeConfig
  });
});

/**
 * PUBLIC: Submit answers to a LowCode dynamic form
 */
export const submitPublicForm = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const { answers = {} } = req.body;

  let query = { isPublished: true };
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    query._id = idOrSlug;
  } else {
    query.slug = idOrSlug;
  }

  const page = await LowCodeStudioPage.findOne(query);
  if (!page) {
    throw new AppError("Target form not found or inactive", 404);
  }

  // Find associated website
  let website = null;
  if (page.websiteId) {
    website = await Website.findById(page.websiteId);
  }
  if (!website) {
    website = await Website.findOne({});
  }

  let createdCustomerId = null;
  let createdTicketId = null;
  let conversionStatus = "saved";

  // Heuristic extraction for lead creation
  const emailVal = answers.email || answers.businessEmail || answers.emailAddress || "";
  const phoneVal = answers.phone || answers.phoneNumber || answers.mobile || answers.whatsapp || "";
  const nameVal = answers.contactName || answers.name || answers.fullName || answers.companyName || "Form Submitter";
  const companyVal = answers.companyName || answers.company || answers.businessName || "";

  if (page.targetEntity === "lead" && (emailVal || phoneVal || companyVal)) {
    try {
      let existingCustomer = null;
      if (emailVal) {
        existingCustomer = await Customer.findOne({ email: emailVal.toLowerCase().trim() });
      }

      if (!existingCustomer && website) {
        const newCustomer = await Customer.create({
          websiteId: website._id,
          name: nameVal,
          email: emailVal ? emailVal.toLowerCase().trim() : `lead_${Date.now()}@form.in`,
          phone: phoneVal,
          companyName: companyVal || nameVal,
          leadSource: `LowCode Form: ${page.pageName}`,
          requirement: JSON.stringify(answers, null, 2),
          status: "lead",
          pipelineStage: "new",
          interestLevel: "hot"
        });

        createdCustomerId = newCustomer._id;
        conversionStatus = "lead_created";

        const io = getSocketServer();
        if (io) {
          io.emit("lead:created", {
            customerId: newCustomer._id,
            name: newCustomer.name,
            companyName: newCustomer.companyName,
            source: newCustomer.leadSource,
            createdAt: newCustomer.createdAt
          });
        }
      } else if (existingCustomer) {
        createdCustomerId = existingCustomer._id;
        conversionStatus = "lead_created";
      }
    } catch (err) {
      console.error("[LowCode Form] Lead auto-creation error:", err.message);
    }
  } else if (page.targetEntity === "ticket" && website) {
    try {
      const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
      const newTicket = await Ticket.create({
        ticketId,
        websiteId: website._id,
        subject: `[Web Form] ${page.pageName} Submission`,
        lastMessagePreview: `New submission from ${nameVal} (${emailVal || phoneVal})`,
        priority: "medium",
        status: "open",
        channel: "web"
      });

      createdTicketId = newTicket._id;
      conversionStatus = "ticket_created";

      const io = getSocketServer();
      if (io) {
        io.emit("ticket:created", {
          ticketId: newTicket.ticketId,
          subject: newTicket.subject,
          priority: newTicket.priority,
          createdAt: newTicket.createdAt
        });
      }
    } catch (err) {
      console.error("[LowCode Form] Ticket auto-creation error:", err.message);
    }
  }

  // Persist submission record
  const submission = await FormSubmission.create({
    pageId: page._id,
    pageName: page.pageName,
    answers,
    submitterIp: req.ip || "",
    submitterUserAgent: req.get("user-agent") || "",
    associatedCustomerId: createdCustomerId,
    associatedTicketId: createdTicketId,
    conversionStatus
  });

  return res.status(201).json({
    success: true,
    message: page.successMessage,
    submissionId: submission._id,
    conversionStatus
  });
});

/**
 * Fetch all submissions for a specific LowCode studio page
 */
export const getFormSubmissions = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const page = await LowCodeStudioPage.findById(id);
  if (!page) throw new AppError("Page not found", 404);

  const submissions = await FormSubmission.find({ pageId: page._id })
    .populate("associatedCustomerId", "name email phone companyName")
    .populate("associatedTicketId", "ticketId subject status")
    .sort({ createdAt: -1 });

  return res.json({
    pageId: page._id,
    pageName: page.pageName,
    totalSubmissions: submissions.length,
    submissions
  });
});

