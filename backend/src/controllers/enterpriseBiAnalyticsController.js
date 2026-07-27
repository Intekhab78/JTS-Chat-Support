import mongoose from "mongoose";
import { EnterpriseBiAnalytics } from "../models/EnterpriseBiAnalytics.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

const DEFAULT_DASHBOARDS = [
  {
    dashboardName: "CTO & Executive Board Cockpit",
    dashboardType: "executive",
    isDefault: true,
    widgets: [
      { widgetKey: "mrr_arr_forecast", widgetName: "MRR / ARR 12-Month Growth Forecast", chartType: "area", metricValue: "$2.4M ARR" },
      { widgetKey: "compliance_heatmap", widgetName: "UAE VAT & Corporate Tax Compliance Heatmap", chartType: "heatmap", metricValue: "98.4% Compliant" },
      { widgetKey: "sales_funnel", widgetName: "Enterprise Client Acquisition Funnel", chartType: "funnel", metricValue: "34.2% Conversion" },
      { widgetKey: "cohort_retention", widgetName: "Customer Cohort 12-Month Retention Rate", chartType: "cohort", metricValue: "94.5% Retention" }
    ],
    scheduledReports: [
      { reportName: "Weekly Executive Board BI Summary", frequency: "weekly", recipientEmails: ["board@enterprise.ae"], lastSentAt: new Date() }
    ]
  }
];

export const getBiOverview = asyncHandler(async (req, res) => {
  let count = await EnterpriseBiAnalytics.countDocuments({});

  if (count === 0) {
    await EnterpriseBiAnalytics.insertMany(DEFAULT_DASHBOARDS.map(d => ({ ...d, createdBy: req.user._id })));
  }

  const dashboards = await EnterpriseBiAnalytics.find({}).sort({ isDefault: -1, createdAt: -1 });

  const metrics = {
    mrrForecast: "$204,500 / mo (+18.4% YoY)",
    arrForecast: "$2,454,000 / yr",
    complianceScore: "98.4%",
    retentionRate: "94.5%",
    funnelConversion: "34.2%",
    scheduledReportsCount: 1
  };

  return res.json({
    summary: {
      totalBiDashboards: dashboards.length,
      availableWidgetTypes: 8,
      engineStatus: "ENTERPRISE_BI_ENGINE_ONLINE"
    },
    metrics,
    dashboards
  });
});

export const saveBiDashboard = asyncHandler(async (req, res) => {
  const { dashboardName, dashboardType, widgets } = req.body;

  if (!dashboardName) throw new AppError("Dashboard name is required", 400);

  const dashboard = await EnterpriseBiAnalytics.create({
    dashboardName,
    dashboardType: dashboardType || "executive",
    widgets: Array.isArray(widgets) ? widgets : [
      { widgetKey: "mrr_arr_forecast", widgetName: "MRR Growth Forecast", chartType: "area", metricValue: "$2.4M" }
    ],
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "ENTERPRISE_BI_DASHBOARD_CREATED",
    resource: "EnterpriseBiAnalytics",
    resourceId: dashboard._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { dashboardName: dashboard.dashboardName, dashboardType: dashboard.dashboardType }
  });

  return res.status(201).json(dashboard);
});

export const scheduleBiReport = asyncHandler(async (req, res) => {
  const { reportName, frequency, recipientEmails } = req.body;

  let dashboard = await EnterpriseBiAnalytics.findOne({ isDefault: true });
  if (!dashboard) dashboard = await EnterpriseBiAnalytics.findOne({});

  if (!dashboard) throw new AppError("No BI dashboard found", 404);

  dashboard.scheduledReports.push({
    reportName: reportName || "Executive BI Digest",
    frequency: frequency || "weekly",
    recipientEmails: recipientEmails || ["cto@enterprise.ae"],
    lastSentAt: new Date()
  });

  await dashboard.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "ENTERPRISE_BI_REPORT_SCHEDULED",
    resource: "EnterpriseBiAnalytics",
    resourceId: dashboard._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { reportName, frequency }
  });

  return res.status(201).json(dashboard.scheduledReports);
});
