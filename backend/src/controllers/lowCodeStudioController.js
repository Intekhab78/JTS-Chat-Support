import mongoose from "mongoose";
import { LowCodeStudioPage } from "../models/LowCodeStudioPage.js";
import { FormSubmission } from "../models/FormSubmission.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Invoice } from "../models/Invoice.js";
import { Deal } from "../models/Deal.js";
import { Risk } from "../models/Risk.js";
import { Website } from "../models/Website.js";
import asyncHandler from "../utils/asyncHandler.js";
import { escapeRegex } from "../utils/regexUtils.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";
import { getSocketServer } from "../sockets/index.js";
import { generateCRN } from "../services/customerService.js";

export const getStudioOverview = asyncHandler(async (req, res) => {
  const { search, pageType, status } = req.query;
  const query = {};
  if (pageType && pageType !== "all") query.pageType = pageType;
  if (status === "published") query.isPublished = true;
  if (status === "draft") query.isPublished = false;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ pageName: rx }, { slug: rx }, { pageType: rx }];
  }

  const allPages = await LowCodeStudioPage.find({}).sort({ createdAt: -1 });
  const pages = await LowCodeStudioPage.find(query).sort({ createdAt: -1 });

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
      totalPages: allPages.length,
      publishedPages: allPages.filter(p => p.isPublished).length,
      draftPages: allPages.filter(p => !p.isPublished).length,
      totalSubmissionsReceived: Object.values(submissionMap).reduce((a, b) => a + b, 0),
      availableDragDropComponents: 9,
      sdkStatus: "LOW_CODE_ENGINE_READY"
    },
    pages: enrichedPages
  });
});

export const createStudioPage = asyncHandler(async (req, res) => {
  const {
    pageName,
    pageType,
    slug,
    targetEntity,
    submitButtonText,
    successMessage,
    layoutComponents,
    themeConfig,
    isPublished
  } = req.body;

  if (!pageName || !pageName.trim()) throw new AppError("Page name is required", 400);

  const cleanSlug = (slug || pageName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const existing = await LowCodeStudioPage.findOne({ slug: cleanSlug });
  const finalSlug = existing ? `${cleanSlug}-${Date.now().toString().slice(-4)}` : cleanSlug;

  const newPage = await LowCodeStudioPage.create({
    pageName: pageName.trim(),
    pageType: pageType || "form",
    slug: finalSlug,
    targetEntity: targetEntity || "lead",
    submitButtonText: submitButtonText || "Submit",
    successMessage: successMessage || "Thank you! Your information has been received.",
    layoutComponents: Array.isArray(layoutComponents) ? layoutComponents : [],
    themeConfig: themeConfig || {},
    isPublished: typeof isPublished === "boolean" ? isPublished : true,
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

export const updateStudioPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const page = await LowCodeStudioPage.findById(id);
  if (!page) throw new AppError("Low-code page not found", 404);

  const allowedFields = [
    "pageName",
    "pageType",
    "slug",
    "targetEntity",
    "submitButtonText",
    "successMessage",
    "layoutComponents",
    "themeConfig",
    "isPublished"
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      page[field] = req.body[field];
    }
  }

  await page.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "LOWCODE_STUDIO_PAGE_UPDATED",
    resource: "LowCodeStudioPage",
    resourceId: page._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { pageName: page.pageName, isPublished: page.isPublished, componentCount: page.layoutComponents?.length || 0 }
  });

  return res.json(page);
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
          crn: await generateCRN(),
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
          io.to(`ws_${website._id}`).to("us_admin").emit("lead:created", {
            customerId: newCustomer._id,
            websiteId: website._id,
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
        io.to(`ws_${website._id}`).to("us_admin").emit("ticket:created", {
          ticketId: newTicket.ticketId,
          websiteId: website._id,
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

/**
 * Delete a form submission record
 */
export const deleteFormSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const sub = await FormSubmission.findByIdAndDelete(submissionId);
  if (!sub) throw new AppError("Submission not found", 404);
  return res.json({ message: "Submission deleted" });
});

/**
 * Live Data Binding Engine for Chart, Table, and Kanban components
 */
export const getLiveComponentData = asyncHandler(async (req, res) => {
  const source = String(req.query.source || "all").toLowerCase();

  const [customers, tickets, invoices, deals, risks, submissions] = await Promise.all([
    Customer.find({}).sort({ createdAt: -1 }).limit(15).select("crn name email companyName status pipelineStage createdAt").lean(),
    Ticket.find({}).sort({ createdAt: -1 }).limit(15).select("ticketId subject status priority createdAt").lean(),
    Invoice.find({}).sort({ createdAt: -1 }).limit(20).select("invoiceNumber total paidAmount status createdAt").lean(),
    Deal.find({}).sort({ createdAt: -1 }).limit(15).select("title stage value createdAt").lean(),
    Risk.find({}).sort({ createdAt: -1 }).limit(15).select("title status category inherentScore createdAt").lean(),
    FormSubmission.find({}).sort({ createdAt: -1 }).limit(15).select("pageName answers conversionStatus createdAt").lean()
  ]);

  // Build real chart series based on source
  let chartSeries = [];
  if (source === "tickets") {
    const counts = {};
    tickets.forEach(t => {
      const k = t.status || "open";
      counts[k] = (counts[k] || 0) + 1;
    });
    chartSeries = Object.entries(counts).map(([label, value]) => ({ label: label.toUpperCase(), value }));
  } else if (source === "customers") {
    const counts = {};
    customers.forEach(c => {
      const k = c.pipelineStage || c.status || "new";
      counts[k] = (counts[k] || 0) + 1;
    });
    chartSeries = Object.entries(counts).map(([label, value]) => ({ label: label.toUpperCase(), value }));
  } else if (source === "risks") {
    const counts = {};
    risks.forEach(r => {
      const k = r.status || "open";
      counts[k] = (counts[k] || 0) + 1;
    });
    chartSeries = Object.entries(counts).map(([label, value]) => ({ label: label.toUpperCase(), value }));
  } else {
    // Default / revenue / invoices: aggregate invoices by status or month, fallback to customers+tickets activity
    if (invoices.length > 0) {
      const byMonth = {};
      invoices.forEach(inv => {
        const d = new Date(inv.createdAt);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        byMonth[key] = (byMonth[key] || 0) + (Number(inv.total) || 0);
      });
      chartSeries = Object.entries(byMonth).map(([label, value]) => ({ label, value }));
    } else {
      chartSeries = [
        { label: "Customers", value: customers.length },
        { label: "Tickets", value: tickets.length },
        { label: "Deals", value: deals.length },
        { label: "Risks", value: risks.length },
        { label: "Submissions", value: submissions.length }
      ];
    }
  }

  // Build real table rows based on source
  let tableColumns = ["ID", "Name / Title", "Category / Stage", "Status"];
  let tableRows = [];
  if (source === "tickets") {
    tableColumns = ["Ticket ID", "Subject", "Priority", "Status"];
    tableRows = tickets.slice(0, 6).map(t => ({
      id: t.ticketId || String(t._id).slice(-6),
      col2: t.subject || "Untitled Ticket",
      col3: t.priority || "medium",
      col4: t.status || "open"
    }));
  } else if (source === "risks") {
    tableColumns = ["Risk", "Category", "Score", "Status"];
    tableRows = risks.slice(0, 6).map(r => ({
      id: r.title,
      col2: r.category || "operational",
      col3: String(r.inherentScore || 0),
      col4: r.status || "open"
    }));
  } else if (source === "submissions") {
    tableColumns = ["Page", "Submitter", "Status", "Submitted"];
    tableRows = submissions.slice(0, 6).map(s => ({
      id: s.pageName,
      col2: s.answers?.contactName || s.answers?.name || s.answers?.email || "Anonymous",
      col3: s.conversionStatus || "saved",
      col4: new Date(s.createdAt).toLocaleDateString()
    }));
  } else {
    // Default / customers
    tableColumns = ["CRN", "Customer / Company", "Stage", "Status"];
    tableRows = customers.slice(0, 6).map(c => ({
      id: c.crn || String(c._id).slice(-6),
      col2: c.companyName || c.name || c.email || "Record",
      col3: c.pipelineStage || "new",
      col4: c.status || "lead"
    }));
  }

  // Build real Kanban columns
  let kanbanColumns = [];
  if (source === "deals" && deals.length > 0) {
    const stages = ["qualified", "proposal", "negotiation", "won"];
    kanbanColumns = stages.map(st => ({
      stage: st,
      items: deals.filter(d => (d.stage || "").toLowerCase() === st).slice(0, 4).map(d => ({
        id: d._id,
        title: d.title,
        meta: `$${Number(d.value || 0).toLocaleString()}`
      }))
    }));
  } else if (source === "customers" && customers.length > 0) {
    const stages = ["new", "contacted", "qualified", "converted"];
    kanbanColumns = stages.map(st => ({
      stage: st,
      items: customers.filter(c => (c.pipelineStage || "new").toLowerCase() === st).slice(0, 4).map(c => ({
        id: c._id,
        title: c.companyName || c.name,
        meta: c.email || c.status
      }))
    }));
  } else {
    const stages = ["open", "in_progress", "resolved"];
    kanbanColumns = stages.map(st => ({
      stage: st.replace("_", " "),
      items: tickets.filter(t => (t.status || "open").toLowerCase() === st).slice(0, 4).map(t => ({
        id: t._id,
        title: t.subject,
        meta: `${t.ticketId || ""} · ${t.priority || "medium"}`
      }))
    }));
  }

  return res.json({
    source,
    chartSeries,
    tableColumns,
    tableRows,
    kanbanColumns,
    totals: {
      customers: customers.length,
      tickets: tickets.length,
      invoices: invoices.length,
      deals: deals.length,
      risks: risks.length,
      submissions: submissions.length
    }
  });
});

