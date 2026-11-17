import mongoose from "mongoose";
import { EnterpriseBiAnalytics } from "../models/EnterpriseBiAnalytics.js";
import { Deal } from "../models/Deal.js";
import { Subscription } from "../models/Subscription.js";
import { Ticket } from "../models/Ticket.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

const DEFAULT_DASHBOARDS = [
  {
    dashboardName: "Executive Revenue & Operations Cockpit",
    dashboardType: "executive",
    isDefault: true,
    widgets: [
      { widgetKey: "pipeline_revenue", widgetName: "CRM Pipeline & Won Revenue", chartType: "area", metricValue: "Live" },
      { widgetKey: "support_sla_health", widgetName: "Support SLA & Resolution Index", chartType: "heatmap", metricValue: "Live" },
      { widgetKey: "sales_funnel", widgetName: "Deal Acquisition Funnel Conversion", chartType: "funnel", metricValue: "Live" },
      { widgetKey: "cohort_retention", widgetName: "Subscription Cohort Retention Rate", chartType: "cohort", metricValue: "Live" }
    ],
    scheduledReports: []
  }
];

const formatCurrencyCompact = (amount) => {
  const num = Number(amount || 0);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const getBiOverview = asyncHandler(async (req, res) => {
  const count = await EnterpriseBiAnalytics.countDocuments({});

  if (count === 0) {
    await EnterpriseBiAnalytics.insertMany(DEFAULT_DASHBOARDS.map((d) => ({ ...d, createdBy: req.user._id })));
  }

  const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";
  const ownedWebsiteIds = isAdmin ? [] : await getOwnedWebsiteIds(req.user);
  const scopeFilter = isAdmin ? {} : { websiteId: { $in: ownedWebsiteIds } };

  const [dashboards, deals, subscriptions, totalTickets, resolvedTickets, totalCustomers] = await Promise.all([
    EnterpriseBiAnalytics.find(isAdmin ? {} : { $or: [{ createdBy: req.user._id }, { isDefault: true }] }).sort({ isDefault: -1, createdAt: -1 }),
    Deal.find({ ...scopeFilter, isDeleted: { $ne: true } }).select("dealValue stage forecastCategory").lean(),
    Subscription.find(scopeFilter).select("status seats billingCycle").lean(),
    Ticket.countDocuments(scopeFilter),
    Ticket.countDocuments({ ...scopeFilter, status: { $in: ["resolved", "closed"] } }),
    Customer.countDocuments(scopeFilter)
  ]);

  let totalPipelineValue = 0;
  let wonRevenue = 0;
  let wonDealsCount = 0;
  deals.forEach((d) => {
    const val = Number(d.dealValue || 0);
    totalPipelineValue += val;
    const st = String(d.stage || "").toLowerCase();
    if (st === "closed_won" || st === "won" || d.forecastCategory === "closed") {
      wonRevenue += val;
      wonDealsCount += 1;
    }
  });

  const funnelConversionPct = deals.length > 0 ? ((wonDealsCount / deals.length) * 100).toFixed(1) : "0.0";
  const activeSubs = subscriptions.filter((s) => ["active", "renewed", "free_trial"].includes(s.status)).length;
  const retentionPct = subscriptions.length > 0 ? ((activeSubs / subscriptions.length) * 100).toFixed(1) : "0.0";
  const slaHealthPct = totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : "100.0";

  const estimatedMrr = Math.round(wonRevenue / 12);
  const scheduledReportsList = dashboards.flatMap((d) =>
    (d.scheduledReports || []).map((r) => ({
      ...r.toObject(),
      dashboardId: d._id,
      dashboardName: d.dashboardName
    }))
  );

  const liveWidgetLookup = {
    pipeline_revenue: `${formatCurrencyCompact(totalPipelineValue)} Pipeline`,
    support_sla_health: `${slaHealthPct}% Resolved`,
    sales_funnel: `${funnelConversionPct}% Win Rate`,
    cohort_retention: `${retentionPct}% Active`,
    total_customers: `${totalCustomers} Customers`
  };

  const hydratedDashboards = dashboards.map((dash) => {
    const obj = dash.toObject();
    obj.widgets = (obj.widgets || []).map((w) => ({
      ...w,
      metricValue: liveWidgetLookup[w.widgetKey] || w.metricValue || "0"
    }));
    return obj;
  });

  const metrics = {
    pipelineValue: formatCurrencyCompact(totalPipelineValue),
    wonRevenue: formatCurrencyCompact(wonRevenue),
    estimatedMrr: `${formatCurrencyCompact(estimatedMrr)} / mo`,
    arrRunRate: `${formatCurrencyCompact(wonRevenue)} / yr`,
    pipelineValueAmount: totalPipelineValue,
    wonRevenueAmount: wonRevenue,
    estimatedMrrAmount: estimatedMrr,
    slaHealthScore: `${slaHealthPct}%`,
    retentionRate: `${retentionPct}%`,
    funnelConversion: `${funnelConversionPct}%`,
    totalDeals: deals.length,
    totalCustomers,
    activeSubscriptions: activeSubs,
    scheduledReportsCount: scheduledReportsList.length
  };

  return res.json({
    summary: {
      totalBiDashboards: dashboards.length,
      availableWidgetTypes: 6,
      engineStatus: mongoose.connection.readyState === 1 ? "HEALTHY" : "DEGRADED"
    },
    metrics,
    dashboards: hydratedDashboards,
    scheduledReports: scheduledReportsList
  });
});

export const saveBiDashboard = asyncHandler(async (req, res) => {
  const { dashboardName, dashboardType, widgets } = req.body;

  if (!dashboardName) throw new AppError("Dashboard name is required", 400);

  const dashboard = await EnterpriseBiAnalytics.create({
    dashboardName: dashboardName.trim(),
    dashboardType: dashboardType || "executive",
    widgets: Array.isArray(widgets) && widgets.length > 0
      ? widgets
      : [
          { widgetKey: "pipeline_revenue", widgetName: "CRM Pipeline & Won Revenue", chartType: "area", metricValue: "Live" },
          { widgetKey: "sales_funnel", widgetName: "Deal Acquisition Funnel Conversion", chartType: "funnel", metricValue: "Live" }
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

export const deleteBiDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dashboard = await EnterpriseBiAnalytics.findById(id);
  if (!dashboard) throw new AppError("BI dashboard not found", 404);
  if (dashboard.isDefault) throw new AppError("Default executive cockpit cannot be deleted", 400);

  await EnterpriseBiAnalytics.findByIdAndDelete(id);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "ENTERPRISE_BI_DASHBOARD_DELETED",
    resource: "EnterpriseBiAnalytics",
    resourceId: dashboard._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { dashboardName: dashboard.dashboardName }
  });

  return res.json({ message: "BI dashboard deleted" });
});

export const scheduleBiReport = asyncHandler(async (req, res) => {
  const { reportName, frequency, recipientEmails, dashboardId } = req.body;

  if (!reportName || !String(reportName).trim()) {
    throw new AppError("Report name is required", 400);
  }

  let dashboard = dashboardId
    ? await EnterpriseBiAnalytics.findById(dashboardId)
    : await EnterpriseBiAnalytics.findOne({ isDefault: true });
  if (!dashboard) dashboard = await EnterpriseBiAnalytics.findOne({});
  if (!dashboard) throw new AppError("No BI dashboard found", 404);

  const emails = Array.isArray(recipientEmails)
    ? recipientEmails.map((e) => String(e).trim()).filter(Boolean)
    : String(recipientEmails || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

  dashboard.scheduledReports.push({
    reportName: String(reportName).trim(),
    frequency: ["daily", "weekly", "monthly"].includes(frequency) ? frequency : "weekly",
    recipientEmails: emails,
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

export const deleteScheduledBiReport = asyncHandler(async (req, res) => {
  const { dashboardId, reportId } = req.params;
  const dashboard = await EnterpriseBiAnalytics.findById(dashboardId);
  if (!dashboard) throw new AppError("BI dashboard not found", 404);

  dashboard.scheduledReports = (dashboard.scheduledReports || []).filter(
    (r) => String(r._id) !== String(reportId)
  );
  await dashboard.save();

  return res.json({ message: "Scheduled report removed" });
});
