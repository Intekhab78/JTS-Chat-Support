import mongoose from "mongoose";
import { LowCodeStudioPage } from "../models/LowCodeStudioPage.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

const DEFAULT_PAGES = [
  {
    pageName: "Enterprise Tax Filing & Document Intake Form",
    pageType: "form",
    layoutComponents: [
      { componentType: "input", label: "Company Commercial Name", props: { required: true, placeholder: "e.g. Al-Baraka Tech LLC" } },
      { componentType: "select", label: "Filing Period", props: { options: ["Q1-2026", "Q2-2026", "Annual 2025"] } },
      { componentType: "file_upload", label: "Upload Trade License PDF", props: { accept: ".pdf,.png" } },
      { componentType: "checkbox", label: "I confirm all VAT records are accurate under UAE Tax Law", props: { checked: true } }
    ]
  },
  {
    pageName: "Executive Financial & Revenue Overview Dashboard",
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

  return res.json({
    summary: {
      totalPages: pages.length,
      publishedPages: pages.filter(p => p.isPublished).length,
      availableDragDropComponents: 12,
      sdkStatus: "LOW_CODE_ENGINE_READY"
    },
    pages
  });
});

export const createStudioPage = asyncHandler(async (req, res) => {
  const { pageName, pageType, layoutComponents } = req.body;

  if (!pageName) throw new AppError("Page name is required", 400);

  const newPage = await LowCodeStudioPage.create({
    pageName,
    pageType: pageType || "dashboard",
    layoutComponents: Array.isArray(layoutComponents) ? layoutComponents : [
      { componentType: "input", label: "Sample Text Field", props: {} },
      { componentType: "chart", label: "Analytics Widget", props: {} }
    ],
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
    changes: { pageName: newPage.pageName, pageType: newPage.pageType }
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
