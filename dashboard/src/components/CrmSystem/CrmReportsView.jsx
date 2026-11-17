import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  XCircle, Filter, Info, Calendar, ArrowUpRight, ArrowDownRight, Printer, FileText,
  Clock, TrendingUp, Zap, TrendingDown, AlertTriangle, Download,
  BarChart3, PieChart, Users, Target, CheckCircle2, TrendingUp as TrendUpIcon, Sparkles,
  Repeat, Receipt, UserPlus, Building2, Briefcase, ShoppingCart, Package, CreditCard, FileCheck, Calculator, ShieldAlert, MessageSquare, Inbox, Eye, X, Search, History, Headphones, Heart, Shield, BarChart2, Tag
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import CRMLeaderboard from "./CrmLeaderboard.jsx";

import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from "../../utils/currencyFormatter.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../../api/client.js";
import { useWebsite } from "../../context/WebsiteContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const CRM_ALL_MODULES = [
  { id: "all", label: "⚡ MASTER ALL-IN-ONE WORKBOOK", category: "Master", icon: Sparkles, color: "emerald", desc: "Download complete CRM ecosystem in 1 Master PDF / Excel" },
  { id: "leads", label: "1. Leads Register", category: "CRM & Sales", icon: UserPlus, color: "indigo", desc: "Leads with stage, source, budget, owner & timeline" },
  { id: "contacts", label: "2. Contacts Master", category: "CRM & Sales", icon: Users, color: "sky", desc: "All contact directory with email, phone, job title & status" },
  { id: "companies", label: "3. Companies Directory", category: "CRM & Sales", icon: Building2, color: "blue", desc: "Company registry, CRN, TRN, domain & size" },
  { id: "deals", label: "4. Deals & Pipeline", category: "CRM & Sales", icon: Briefcase, color: "purple", desc: "Deals, stage, deal value, probability & close date" },
  { id: "quotations", label: "5. Quotations Ledger", category: "Operations", icon: FileText, color: "amber", desc: "All quotations sent, totals, validity & status" },
  { id: "salesorders", label: "6. Sales Orders", category: "Operations", icon: ShoppingCart, color: "orange", desc: "Sales orders, fulfillment status & totals" },
  { id: "products", label: "7. Products & Services Catalog", category: "Operations", icon: Package, color: "teal", desc: "Service & product catalog, prices & categories" },
  { id: "invoices", label: "8. Invoices Register", category: "Finance", icon: Receipt, color: "emerald", desc: "Invoices, paid/pending/overdue status, tax & totals" },
  { id: "payments-ledger", label: "9. Payments Ledger", category: "Finance", icon: CreditCard, color: "green", desc: "Payment transaction logs, collections & receipts" },
  { id: "subscriptions", label: "10. Subscriptions & MRR", category: "Finance", icon: Repeat, color: "violet", desc: "Recurring billing plans, MRR & renewal dates" },
  { id: "finance", label: "11. Financial Summary", category: "Finance", icon: BarChart3, color: "cyan", desc: "P&L summary, revenue, collections & expenses" },
  { id: "tasks", label: "12. Tasks & Action Items", category: "Activity & Staff", icon: Clock, color: "amber", desc: "Pending, completed & overdue tasks with assignees" },
  { id: "calendar", label: "16. Calendar & Meetings", category: "Activity & Staff", icon: Calendar, color: "indigo", desc: "Scheduled meetings, call logs & appointments" },
  { id: "targets", label: "17. Sales Targets & Quotas", category: "CRM & Sales", icon: Target, color: "emerald", desc: "Sales targets, consultant quotas & achievement %" },
  { id: "feed", label: "18. Live Team Activity Feed", category: "Activity & Staff", icon: History, color: "indigo", desc: "Real-time stream of all staff calls, notes, emails & stage updates" },
  { id: "helpdesk", label: "19. Helpdesk SLA Tickets", category: "Activity & Staff", icon: Headphones, color: "rose", desc: "Active support tickets, SLA status & escalation logs" },
  { id: "success", label: "20. Customer Retention & Success", category: "CRM & Sales", icon: Heart, color: "pink", desc: "Client health scores, churn risk categories & onboarding checklists" },
  { id: "inbox", label: "21. Omnichannel Conversations", category: "Activity & Staff", icon: MessageSquare, color: "violet", desc: "Unified inbox sessions, channels & assigned agent tracking" },
  { id: "bi", label: "22. BI Analytics & Intelligence", category: "Master", icon: BarChart2, color: "blue", desc: "Multi-tenant business intelligence, custom KPI metrics & alerts" },
  { id: "audit-logs", label: "23. System Security Audit Trail", category: "Master", icon: Shield, color: "emerald", desc: "Comprehensive audit logs, user actions, IP addresses & timestamps" },
  { id: "workflow-history", label: "24. Automation Workflow Audit", category: "Master", icon: Zap, color: "amber", desc: "Automation pipeline execution logs, triggers & pass/fail status" }
];

export default function CRMReportsView({ summary, customers = [], websiteId, onDrillDown, activeRange, setActiveRange }) {
  const { selectedWebsite } = useWebsite() || {};
  const toast = useToast();
  const enabledModules = selectedWebsite?.enabledModules;
  const isComplianceEnabled = !selectedWebsite || !Array.isArray(selectedWebsite.enabledModules) || selectedWebsite.enabledModules.includes("compliance");

  const categoryToModuleKey = {
    "CRM & Sales": "crm",
    "Operations": "operations",
    "Finance": "finance",
    "Compliance": "compliance",
    "Activity & Staff": "service",
    "Master": "automation"
  };

  const allowedModules = CRM_ALL_MODULES.filter(m => {
    if (m.id === "all") return true;
    if (m.category === "Compliance" && !isComplianceEnabled) return false;
    if (!enabledModules || !Array.isArray(enabledModules) || enabledModules.length === 0) return true;
    const modKey = categoryToModuleKey[m.category];
    if (!modKey) return true;
    return enabledModules.includes(modKey);
  });

  const totalModulesCount = allowedModules.filter(m => m.id !== "all").length;

  const [exportCategoryTab, setExportCategoryTab] = useState("All");
  const [modulesPage, setModulesPage] = useState(1);
  const [modulesPerPage, setModulesPerPage] = useState(6);
  const [exportingModule, setExportingModule] = useState("");
  const [previewModal, setPreviewModal] = useState(null); // { title, columns, rows, moduleId }
  const [previewSearch, setPreviewSearch] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ frequency: "weekly", channel: "email", recipient: "" });


  // Filter States for Filter-wise Report Generation & Downloads
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  const matchesDateRange = useCallback((rawDate) => {
    if (filterDateRange === "all") return true;
    if (!rawDate) return false;
    const itemDate = new Date(rawDate);
    if (Number.isNaN(itemDate.getTime())) return false;
    const now = new Date();
    if (filterDateRange === "today") return itemDate.toDateString() === now.toDateString();
    if (filterDateRange === "week") return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (filterDateRange === "month") return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (filterDateRange === "quarter") return itemDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (filterDateRange === "year") return itemDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (filterDateRange === "custom") {
      if (customStartDate && itemDate < new Date(customStartDate)) return false;
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
    }
    return true;
  }, [filterDateRange, customStartDate, customEndDate]);

  const getFilteredCustomers = useCallback(() => {
    return (customers || []).filter((item) => {
      // 1. Keyword Search Filter
      if (filterSearchQuery.trim()) {
        const q = filterSearchQuery.toLowerCase();
        const matchName = String(item.name || "").toLowerCase().includes(q);
        const matchComp = String(item.companyName || "").toLowerCase().includes(q);
        const matchEmail = String(item.email || "").toLowerCase().includes(q);
        const matchPhone = String(item.phone || item.whatsApp || "").toLowerCase().includes(q);
        const matchTrn = String(item.trn || "").toLowerCase().includes(q);
        if (!matchName && !matchComp && !matchEmail && !matchPhone && !matchTrn) return false;
      }

      // 2. Stage Filter
      if (filterStage !== "all") {
        const itemStage = String(item.pipelineStage || item.stage || item.status || "").toLowerCase();
        if (itemStage !== filterStage.toLowerCase()) return false;
      }

      // 3. Status Filter
      if (filterStatus !== "all") {
        const itemStatus = String(item.workStatus || item.paymentStatus || item.status || "").toLowerCase();
        if (!itemStatus.includes(filterStatus.toLowerCase())) return false;
      }

      // 4. Date Range Filter
      if (!matchesDateRange(item.createdAt)) return false;

      return true;
    });
  }, [customers, filterSearchQuery, filterStage, filterStatus, matchesDateRange]);

  const activeFilteredCustomers = getFilteredCustomers();

  const aging = summary?.aging || { recent: 0, stale: 0, dormant: 0 };
  const breakdown = summary?.stageBreakdown || [];
  const leadsBySource = summary?.leadsBySource || [];
  const leadsPerDay = summary?.leadsPerDay || [];
  const followUpHealth = summary?.followUpHealth || { overdue: 0, completedToday: 0, totalOpen: 0 };
  const { cac, ltv, agents, lostReasons, totalLeads, conversionRate, comparison, lostByStage } = summary || {};

  const safeConversionRate = typeof conversionRate === "number" && !Number.isNaN(conversionRate) ? conversionRate : 0;
  const totalReceived = Number(summary?.totalReceived) || 0;
  const totalInvoiced = Number(summary?.totalInvoiced) || 0;
  const collectionEfficiency = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 100;
  const safeCollectionEfficiency = !Number.isNaN(collectionEfficiency) ? collectionEfficiency : 100;

  const revenueGrowth = comparison?.prevMonthRevenue
    ? ((summary.revenue - comparison.prevMonthRevenue) / comparison.prevMonthRevenue * 100).toFixed(1)
    : 0;

  const isRevenueUp = Number(revenueGrowth) >= 0;

  const stagesLost = lostByStage?.[0]?.stages || [];
  const stageLossCount = stagesLost.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const sortedLossStages = Object.entries(stageLossCount).sort((a, b) => b[1] - a[1]);

  const stageOrder = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
  const sortedBreakdown = stageOrder
    .map(stageKey => {
      const found = breakdown.find(b => b._id === stageKey);
      return {
        stage: stageKey,
        count: found ? found.count : 0,
        totalValue: found ? found.totalValue : 0
      };
    })
    .filter(item => item.count > 0 || item.totalValue > 0);

  const funnelData = sortedBreakdown.map((item, idx, arr) => {
    const prev = idx > 0 ? arr[idx - 1] : null;
    const baseline = arr[0];
    const convFromPrev = prev && prev.count > 0 ? Math.round((item.count / prev.count) * 100) : 100;
    const convFromBase = baseline && baseline.count > 0 ? Math.round((item.count / baseline.count) * 100) : 100;
    return {
      ...item,
      convFromPrev,
      convFromBase
    };
  });

  // ── MASTER MULTI-SECTION CSV EXPORT ────────────────────────────────
  const handleExportCSV = () => {
    const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const totalPipelineValue = sortedBreakdown.reduce((sum, b) => sum + (b.totalValue || 0), 0);

    const rows = [
      ["=========================================================================="],
      ["JTS SUPPORT ENTERPRISE CRM MASTER PERFORMANCE REPORT"],
      ["Generated Date", reportDate],
      ["Time Period Scope", activeRange ? activeRange.toUpperCase() : "ALL TIME"],
      ["=========================================================================="],
      [],
      ["--- SECTION 1: CRM EXECUTIVE SUMMARY ---"],
      ["Metric", "Value"],
      ["Total Leads in Scope", totalLeads || 0],
      [`Total Pipeline Value (${getCurrencySymbol()})`, totalPipelineValue],
      [`Total Won Revenue (${getCurrencySymbol()})`, summary?.revenue || 0],
      ["Overall Conversion Rate (%)", `${safeConversionRate}%`],
      [`Total Invoiced Amount (${getCurrencySymbol()})`, totalInvoiced],
      [`Total Payments Collected (${getCurrencySymbol()})`, totalReceived],
      ["Collection Efficiency (%)", `${safeCollectionEfficiency.toFixed(1)}%`],
      ["Customer Acquisition Cost (CAC)", cac ? formatCurrency(cac) : "N/A"],
      ["Customer Lifetime Value (LTV)", ltv ? formatCurrency(ltv) : "N/A"],
      [],
      ["--- SECTION 2: PIPELINE STAGE BREAKDOWN ---"],
      ["Pipeline Stage", "Total Count", `Total Deal Value (${getCurrencySymbol()})`, "Stage Conversion Rate (%)"],
      ...funnelData.map(item => [
        item.stage.toUpperCase(),
        item.count,
        item.totalValue || 0,
        `${item.convFromPrev}%`
      ]),
      [],
      ["--- SECTION 3: LEAD ACQUISITION SOURCES ---"],
      ["Source Channel", "Total Leads", "Share (%)"],
      ...(leadsBySource.map(src => [
        src._id || "Direct / Unknown",
        src.count,
        `${totalLeads > 0 ? Math.round((src.count / totalLeads) * 100) : 0}%`
      ])),
      [],
      ["--- SECTION 4: LEAD AGING & OPERATIONAL HEALTH ---"],
      ["Health Metric", "Value"],
      ["Recent Active Leads (<7 Days)", aging.recent || 0],
      ["Stale Pending Leads (8-30 Days)", aging.stale || 0],
      ["Dormant Inactive Leads (>30 Days)", aging.dormant || 0],
      ["Overdue Tasks Pending", followUpHealth.overdue || 0],
      ["Completed Tasks Today", followUpHealth.completedToday || 0],
      [],
      ["--- SECTION 5: SALES TEAM LEADERBOARD & CONSULTANTS ---"],
      ["Consultant Name", "Role / Designation", "Leads Handled", "Won Deals", `Revenue Generated (${getCurrencySymbol()})`],
      ...((agents || []).map(ag => [
        ag.name || "Consultant",
        ag.role || "Sales Agent",
        ag.totalLeads || 0,
        ag.wonDeals || 0,
        ag.revenue || 0
      ])),
      [],
      ["--- SECTION 6: MASTER CUSTOMER & LEAD DIRECTORY REGISTER ---"],
      ["Client / Lead Name", "Company Name", "Email Address", "Phone / Contact", "TRN / Tax ID", "Pipeline Stage", "CRM Status", `Lead Value (${getCurrencySymbol()})`, "Work Status", "Payment Status", "Assigned Owner", "Created Date"],
      ...((activeFilteredCustomers || []).map(c => [
        c.name || "-",
        c.companyName || "-",
        c.email || "-",
        c.phones?.[0]?.phone || c.phone || c.whatsApp || "-",
        c.trn || "Not Registered",
        c.pipelineStage || "new",
        c.status || "lead",
        c.leadValue || c.budget || 0,
        c.workStatus || "Pending",
        c.paymentStatus || "Pending",
        c.ownerId?.name || "Unassigned",
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"
      ]))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_CRM_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── MASTER EXECUTIVE PDF REPORT DOWNLOAD ────────────────────────────
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const totalPipelineValue = sortedBreakdown.reduce((sum, b) => sum + (b.totalValue || 0), 0);

      // Header Dark Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("JTS SUPPORT", 14, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(199, 210, 254);
      doc.text("MASTER ENTERPRISE CRM & SALES INTELLIGENCE REPORT", 14, 21);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${reportDate}`, 196, 14, { align: "right" });
      doc.text("EXECUTIVE SUMMARY", 196, 21, { align: "right" });

      // KPI Grid Box
      let currentY = 38;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, 182, 28, 3, 3, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);

      doc.text("TOTAL LEADS", 20, currentY + 9);
      doc.text("PIPELINE VALUE", 65, currentY + 9);
      doc.text("CONVERSION RATE", 115, currentY + 9);
      doc.text("TOTAL REVENUE", 160, currentY + 9);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalLeads || 0}`, 20, currentY + 20);
      doc.setTextColor(79, 70, 229);
      doc.text(formatCurrency(totalPipelineValue), 65, currentY + 20);
      doc.setTextColor(16, 185, 129);
      doc.text(`${safeConversionRate}%`, 115, currentY + 20);
      doc.setTextColor(15, 23, 42);
      doc.text(formatCurrency(summary?.revenue || 0), 160, currentY + 20);

      currentY += 34;

      // Section 1: Funnel & Stage Breakdown
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("1. PIPELINE STAGE & FUNNEL ANALYSIS", 14, currentY);

      const funnelRows = funnelData.map(item => [
        item.stage.toUpperCase(),
        String(item.count),
        formatCurrency(item.totalValue || 0),
        `${item.convFromPrev}%`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["PIPELINE STAGE", "TOTAL COUNT", `DEAL VALUE (${getCurrencySymbol()})`, "STAGE CONVERSION RATE (%)"]],
        body: funnelRows.length > 0 ? funnelRows : [["No stage data available", "0", formatCurrency(0), "0%"]],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Section 2: Acquisition Sources
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("2. LEAD ACQUISITION SOURCES", 14, currentY);

      const sourceRows = leadsBySource.map(src => [
        (src._id || "Direct / Unknown").toUpperCase(),
        String(src.count),
        `${totalLeads > 0 ? Math.round((src.count / totalLeads) * 100) : 0}%`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["SOURCE CHANNEL", "TOTAL LEADS GENERATED", "CONTRIBUTION SHARE (%)"]],
        body: sourceRows.length > 0 ? sourceRows : [["Direct", String(totalLeads || 0), "100%"]],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Section 3: Master Customer Directory Register
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("3. MASTER CUSTOMER & LEAD DIRECTORY REGISTER", 14, currentY);

      const customerRows = (customers || []).map(c => [
        c.name || "-",
        c.companyName || "-",
        c.email || "-",
        c.phones?.[0]?.phone || c.phone || c.whatsApp || "-",
        (c.pipelineStage || "new").toUpperCase(),
        (c.status || "lead").toUpperCase(),
        formatCurrency(c.leadValue || c.budget || 0)
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["CLIENT / LEAD NAME", "COMPANY", "EMAIL", "PHONE", "STAGE", "STATUS", `VALUE (${getCurrencySymbol()})`]],
        body: customerRows.length > 0 ? customerRows : [["No customer records found", "-", "-", "-", "-", "-", formatCurrency(0)]],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "bold");
        doc.text("CONFIDENTIAL - JTS ENTERPRISE CRM SYSTEM", 14, 285);
        doc.text(`Page ${i} of ${totalPages}`, 196, 285, { align: "right" });
      }

      const fileName = `Master_CRM_Performance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast?.error?.("Failed to generate PDF report: " + err.message);
    }
  };

  // ── SHARED DYNAMIC DATA FETCHER FOR BOTH VIEW & EXPORT ──────────────
  const getModuleData = useCallback(async (moduleId) => {
    let title = "";
    let filename = "";
    let columns = [];
    let rows = [];
    const ws = websiteId || "";
    const todayIso = new Date().toISOString().slice(0, 10);

    if (moduleId === "leads" || moduleId === "contacts" || moduleId === "companies") {
      const sourceList =
        moduleId === "contacts"
          ? (activeFilteredCustomers || []).filter(c => c.email || c.phone || c.whatsApp || c.phones?.length)
          : moduleId === "companies"
            ? (activeFilteredCustomers || []).filter(c => c.companyName || c.trn)
            : (activeFilteredCustomers || []);

      title = moduleId === "leads" ? "CRM LEADS REGISTER" : moduleId === "contacts" ? "CONTACTS MASTER DIRECTORY" : "COMPANIES DIRECTORY";
      filename = `${moduleId.toUpperCase()}_Report_${todayIso}`;
      columns = ["Name", "Company", "Email", "Phone", "TRN", "Stage", "Status", "Value", "Owner"];
      rows = sourceList.map(c => [
        c.name || "-",
        c.companyName || "-",
        c.email || "-",
        c.phones?.[0]?.phone || c.phone || c.whatsApp || "-",
        c.trn || "Not Registered",
        (c.pipelineStage || "new").toUpperCase(),
        (c.status || "lead").toUpperCase(),
        formatCurrency(c.leadValue || c.budget || 0),
        c.ownerId?.name || "Unassigned"
      ]);
    } else if (moduleId === "deals") {
      title = "DEALS & PIPELINE REGISTER";
      filename = `DEALS_PIPELINE_Report_${todayIso}`;
      columns = ["Deal Name", "Client / Company", "Stage", "Deal Value", "Probability (%)", "Expected Close Date", "Owner"];
      const res = await api(`/api/crm/deals?websiteId=${ws}`).catch(() => ({ deals: [] }));
      const rawDeals = Array.isArray(res) ? res : (res.deals || []);
      const list = rawDeals.length > 0
        ? rawDeals.filter(d => matchesDateRange(d.createdAt || d.expectedCloseDate))
        : (activeFilteredCustomers || []).filter(c => c.recordType === "deal");
      rows = list.map(d => [
        d.dealName || d.name || d.companyName || "Deal",
        d.companyName || d.customerName || d.customerId?.companyName || "-",
        (d.pipelineStage || d.stage || "new").toUpperCase(),
        formatCurrency(d.dealValue || d.value || d.leadValue || 0),
        d.probability != null ? `${d.probability}%` : "-",
        d.closeDate || d.expectedCloseDate ? new Date(d.closeDate || d.expectedCloseDate).toLocaleDateString() : "-",
        d.ownerId?.name || d.owner || "Unassigned"
      ]);
    } else if (moduleId === "quotations") {
      title = "QUOTATIONS LEDGER REPORT";
      filename = `QUOTATIONS_LEDGER_Report_${todayIso}`;
      columns = ["Quotation #", "Client / Company", "Total Amount", "Status", "Valid Until Date"];
      const res = await api(`/api/crm/quotations?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.quotations || res.quotes || []))
        .filter(q => matchesDateRange(q.createdAt || q.validUntil));
      rows = list.map(q => [
        q.quoteNo || q.quoteNumber || q.quotationNumber || q._id?.slice(-6) || "-",
        q.customerId?.companyName || q.customerId?.name || q.company || q.customerName || q.companyName || "-",
        formatCurrency(q.total || q.totalAmount || q.grandTotal || 0),
        (q.status || "Draft").toUpperCase(),
        q.validUntil || q.validUntilDate ? new Date(q.validUntil || q.validUntilDate).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "salesorders") {
      title = "SALES ORDERS REGISTER";
      filename = `SALES_ORDERS_Report_${todayIso}`;
      columns = ["Order #", "Client / Company", "Order Total", "Fulfillment Status", "Order Date"];
      const res = await api(`/api/crm/salesorders?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.salesOrders || res.orders || []))
        .filter(o => matchesDateRange(o.orderDate || o.createdAt));
      rows = list.map(o => [
        o.orderNo || o.orderNumber || o._id?.slice(-6) || "-",
        o.customerId?.companyName || o.customerId?.name || o.company || o.customerName || "-",
        formatCurrency(o.total || o.totalAmount || o.grandTotal || 0),
        (o.status || "Processing").toUpperCase(),
        o.date || o.orderDate || o.createdAt ? new Date(o.date || o.orderDate || o.createdAt).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "products") {
      title = "PRODUCTS & SERVICES CATALOG";
      filename = `PRODUCTS_CATALOG_Report_${todayIso}`;
      columns = ["Product / Service Name", "Category", "Unit Price", "Stock / Seats", "Status"];
      const res = await api(`/api/crm/products?websiteId=${ws}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.products || []);
      rows = list.map(p => [
        p.name || p.productName || "-",
        p.category || "Service",
        formatCurrency(p.price || p.unitPrice || 0),
        p.stock ?? p.seats ?? "-",
        (p.status || "Active").toUpperCase()
      ]);
    } else if (moduleId === "invoices") {
      title = "INVOICES REGISTER & RECEIVABLES";
      filename = `INVOICES_REGISTER_Report_${todayIso}`;
      columns = ["Invoice #", "Client / Company", "Invoice Total", "Status", "Due Date"];
      const res = await api(`/api/crm/invoices?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.invoices || []))
        .filter(inv => matchesDateRange(inv.createdAt || inv.dueDate));
      rows = list.map(inv => [
        inv.invoiceNo || inv.invoiceNumber || inv._id?.slice(-6) || "-",
        inv.customerId?.companyName || inv.customerId?.name || inv.company || inv.customerName || "-",
        formatCurrency(inv.total || inv.amount || 0),
        (inv.status || "Pending").toUpperCase(),
        inv.dueDate || inv.due ? new Date(inv.dueDate || inv.due).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "payments-ledger") {
      title = "FINANCE PAYMENTS LEDGER";
      filename = `PAYMENTS_LEDGER_${todayIso}`;
      columns = ["Receipt #", "Client / Company", "Amount Paid", "Payment Method", "Transaction Date"];
      const res = await api(`/api/crm/payments?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.payments || []))
        .filter(p => matchesDateRange(p.date || p.createdAt));
      rows = list.map(p => [
        p.rcpNo || p.receiptNo || p._id?.slice(-6) || "-",
        p.customerId?.companyName || p.customerId?.name || p.client || p.customerName || "-",
        formatCurrency(p.amount || 0),
        p.method || p.paymentMethod || "-",
        p.date || p.createdAt ? new Date(p.date || p.createdAt).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "subscriptions") {
      title = "FINANCE SUBSCRIPTIONS & RECURRING REVENUE REPORT";
      filename = `SUBSCRIPTIONS_Report_${todayIso}`;
      columns = ["Subscription Plan", "Client / Company", "Monthly Value", "Billing Cycle", "Renewal Date"];
      const res = await api(`/api/crm/subscriptions?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.subscriptions || []))
        .filter(s => matchesDateRange(s.createdAt || s.renewalDate));
      rows = list.map(s => [
        s.planName || s.name || s.serviceType || "-",
        s.customerId?.companyName || s.customerId?.name || s.companyName || "-",
        formatCurrency(s.amount || s.monthlyValue || 0),
        s.billingCycle || "Monthly",
        s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "finance") {
      title = "ENTERPRISE FINANCIAL & P&L REPORT";
      filename = `FINANCIAL_SUMMARY_${todayIso}`;
      columns = ["Financial Metric", "Amount / Ratio", "Notes"];
      rows = [
        ["Total Won Revenue", formatCurrency(summary?.revenue || 0), "Recognized Sales"],
        ["Total Invoiced Outstanding", formatCurrency(summary?.totalInvoiced || 0), "Accounts Receivable"],
        ["Total Payments Collected", formatCurrency(summary?.totalReceived || 0), "Cash Collections"],
        ["Net Collection Efficiency", `${safeCollectionEfficiency.toFixed(1)}%`, "Collection Ratio"],
        ["Weighted Pipeline Forecast", formatCurrency(summary?.weightedRevenue || 0), "Stage-Weighted Value"]
      ];
    } else if (moduleId === "tasks") {
      title = "CRM TASKS & ACTION ITEMS REPORT";
      filename = `TASKS_Report_${todayIso}`;
      columns = ["Task Title", "Type", "Assigned Owner", "Priority", "Status", "Due Date"];
      const res = await api(`/api/crm/tasks/my?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.tasks || []))
        .filter(t => matchesDateRange(t.createdAt || t.dueAt));
      rows = list.map(t => [
        t.title || "Task",
        t.type || "General",
        t.ownerId?.name || t.assignee?.name || t.owner || "Unassigned",
        (t.priority || "Medium").toUpperCase(),
        (t.status || "Open").toUpperCase(),
        t.dueAt || t.due ? new Date(t.dueAt || t.due).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "calendar") {
      title = "CALENDAR MEETINGS & SCHEDULED EVENTS REPORT";
      filename = `CALENDAR_MEETINGS_Report_${todayIso}`;
      columns = ["Event Title", "Activity Type", "Client / Contact", "Platform", "Scheduled Date & Time", "Status"];
      const res = await api(`/api/crm/activities?websiteId=${ws}&limit=200`).catch(() => ({ activities: [] }));
      const list = (Array.isArray(res) ? res : (res.activities || []))
        .filter(item => ["meeting", "call", "reminder", "task"].includes((item.type || "").toLowerCase()))
        .filter(item => matchesDateRange(item.dueDate || item.startAt || item.createdAt));
      rows = list.map(item => [
        item.title || "-",
        (item.type || "meeting").toUpperCase(),
        item.customerId?.companyName || item.customerId?.name || "-",
        item.meetingType || "-",
        item.dueDate || item.startAt ? new Date(item.dueDate || item.startAt).toLocaleString() : "-",
        (item.status || "Scheduled").toUpperCase()
      ]);
    } else if (moduleId === "targets") {
      title = "SALES TARGETS & QUOTA ACHIEVEMENT REPORT";
      filename = `SALES_TARGETS_Report_${todayIso}`;
      columns = ["Consultant Name", "Role", "Leads Handled", "Won Deals", "Achieved Revenue", "Target"];
      const list = Array.isArray(summary?.agents) ? summary.agents : [];
      rows = list.map(ag => [
        ag.name || "Consultant",
        ag.role || "Agent",
        ag.totalLeads || 0,
        ag.wonDeals || 0,
        formatCurrency(ag.revenue || 0),
        ag.target ? formatCurrency(ag.target) : "Not Set"
      ]);
    } else if (moduleId === "feed") {
      title = "LIVE TEAM ACTIVITY FEED REPORT";
      filename = `LIVE_ACTIVITY_FEED_${todayIso}`;
      columns = ["Activity Title", "Type", "Details / Note", "Created By", "Timestamp"];
      const res = await api(`/api/crm/activities?websiteId=${ws}&limit=100`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.activities || []))
        .filter(a => matchesDateRange(a.createdAt || a.activityAt));
      rows = list.map(a => [
        a.title || "Activity",
        (a.type || "general").toUpperCase(),
        a.description || a.desc || "-",
        a.ownerId?.name || a.owner || "System",
        a.createdAt ? new Date(a.createdAt).toLocaleString() : "-"
      ]);
    } else if (moduleId === "helpdesk") {
      title = "HELPDESK TICKETS & SLA AUDIT REPORT";
      filename = `HELPDESK_TICKETS_${todayIso}`;
      columns = ["Ticket ID", "Subject", "Priority", "Escalation Level", "Status", "Date"];
      const res = await api(`/api/tickets?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.tickets || []))
        .filter(t => matchesDateRange(t.createdAt));
      rows = list.map(t => [
        t.ticketId || t._id,
        t.subject || "-",
        (t.priority || "Medium").toUpperCase(),
        t.escalationLevel || 0,
        (t.status || "Open").toUpperCase(),
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "success") {
      title = "CUSTOMER RETENTION & HEALTH DOSSIER";
      filename = `CUSTOMER_SUCCESS_${todayIso}`;
      columns = ["Client Name", "Onboarding Status", "Health Score", "Adoption Rate (%)", "Churn Risk"];
      const res = await api(`/api/crm/customersuccess?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.records || res.customers || []))
        .filter(p => matchesDateRange(p.createdAt));
      rows = list.map(p => [
        p.customerId?.name || p.name || "Client",
        p.onboardingStatus || p.status || "-",
        p.healthScore != null ? `${p.healthScore} / 100` : "-",
        p.adoptionScore != null ? `${p.adoptionScore}%` : "-",
        (p.riskLevel || p.risk || "Low").toUpperCase()
      ]);
    } else if (moduleId === "inbox") {
      title = "OMNICHANNEL CONVERSATIONS REGISTER";
      filename = `OMNICHANNEL_INBOX_${todayIso}`;
      columns = ["Session ID", "Customer / Contact", "Channel", "Priority", "Status", "Assigned Agent"];
      const res = await api(`/api/crm/omnichannel/sessions?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.sessions || []))
        .filter(s => matchesDateRange(s.createdAt));
      rows = list.map(s => [
        s.sessionId || s._id,
        s.customerName || s.name || s.customerId?.name || "Visitor",
        (s.channel || "Chat").toUpperCase(),
        (s.priority || "Normal").toUpperCase(),
        (s.status || "Active").toUpperCase(),
        s.assignedAgentId?.name || s.agent || "Unassigned"
      ]);
    } else if (moduleId === "bi") {
      title = "BUSINESS INTELLIGENCE & ANALYTICS SUMMARY";
      filename = `BI_ANALYTICS_${todayIso}`;
      columns = ["Metric Category", "Metric Parameter", "Current Performance"];
      rows = [
        ["CRM & Sales", "Total Leads Logged", totalLeads || 0],
        ["CRM & Sales", "Won Deals Count", summary?.wonDeals || 0],
        ["CRM & Sales", "Lead Conversion Rate", `${safeConversionRate}%`],
        ["Finance", "Recognized Revenue", formatCurrency(summary?.revenue || 0)],
        ["Finance", "Weighted Revenue Forecast", formatCurrency(summary?.weightedRevenue || 0)],
        ["Customer Care", "Collection Efficiency Ratio", `${safeCollectionEfficiency.toFixed(1)}%`]
      ];
    } else if (moduleId === "audit-logs") {
      title = "SYSTEM SECURITY AUDIT TRAIL REPORT";
      filename = `SECURITY_AUDIT_LOGS_${todayIso}`;
      columns = ["Timestamp", "Actor Name", "Actor Role", "Action Performed", "Target Entity", "IP Address"];
      const res = await api(`/api/audit-logs?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.logs || []))
        .filter(l => matchesDateRange(l.createdAt));
      rows = list.map(l => [
        l.createdAt ? new Date(l.createdAt).toLocaleString() : "-",
        l.actorName || l.actor || "System",
        (l.actorRole || l.role || "System").toUpperCase(),
        (l.action || "general").toUpperCase(),
        `${l.entityType || "Entity"} (${l.entityId || "-"})`,
        l.ipAddress || l.ip || "Internal"
      ]);
    } else if (moduleId === "workflow-history") {
      title = "AUTOMATION WORKFLOW EXECUTION AUDIT";
      filename = `WORKFLOW_EXECUTION_AUDIT_${todayIso}`;
      columns = ["Workflow Name", "Trigger Event", "Execution Status", "Execution Date & Time"];
      const res = await api(`/api/crm/workflows/executions?websiteId=${ws}`).catch(() => []);
      const list = (Array.isArray(res) ? res : (res.executions || []))
        .filter(w => matchesDateRange(w.createdAt));
      rows = list.map(w => [
        w.workflowId?.name || w.name || "Workflow Run",
        w.workflowId?.trigger || w.trigger || "System Event",
        (w.status || "Success").toUpperCase(),
        w.createdAt ? new Date(w.createdAt).toLocaleString() : "-"
      ]);
    }

    // Apply active filter controls to generated rows
    if (filterStage !== "all" || filterStatus !== "all" || filterSearchQuery.trim()) {
      rows = rows.filter((row) => {
        const rowText = row.map(cell => String(cell || "")).join(" ").toLowerCase();

        if (filterSearchQuery.trim()) {
          const q = filterSearchQuery.toLowerCase();
          if (!rowText.includes(q)) return false;
        }

        if (filterStage !== "all") {
          const targetStage = filterStage.toLowerCase();
          if (!rowText.includes(targetStage)) return false;
        }

        if (filterStatus !== "all") {
          const targetStatus = filterStatus.toLowerCase();
          if (!rowText.includes(targetStatus)) return false;
        }

        return true;
      });
    }

    return { title, filename, columns, rows };
  }, [activeFilteredCustomers, websiteId, summary, filterStage, filterStatus, filterSearchQuery, matchesDateRange, safeConversionRate, safeCollectionEfficiency, totalLeads]);

  // ── VIEW MODAL HANDLER ──────────────────────────────────────────────
  const handleViewModule = async (moduleId) => {
    setLoadingPreview(true);
    setPreviewSearch("");
    try {
      const data = await getModuleData(moduleId);
      setPreviewModal({ ...data, moduleId });
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExportSingleModule = async (moduleId, format = "csv") => {
    if (moduleId === "all") {
      if (format === "csv") handleExportCSV();
      else handleExportPDF();
      return;
    }
    setExportingModule(moduleId);
    try {
      const { title, filename, columns, rows } = await getModuleData(moduleId);

      if (format === "csv") {
        const csvContent = "data:text/csv;charset=utf-8," + [
          [title],
          ["Generated Date", new Date().toLocaleDateString()],
          [],
          columns,
          ...rows
        ].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 28, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text("JTS SUPPORT CRM", 14, 13);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(199, 210, 254);
        doc.text(title, 14, 20);

        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(`DATE: ${new Date().toLocaleDateString()}`, 196, 14, { align: "right" });

        autoTable(doc, {
          startY: 34,
          margin: { left: 14, right: 14 },
          head: [columns.map(c => c.toUpperCase())],
          body: rows.map(r => r.map(cell => String(cell))),
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`${filename}.pdf`);
      }
    } catch (err) {
      console.error("Module export error:", err);
      toast?.error?.("Export failed: " + err.message);
    } finally {
      setExportingModule("");
    }
  };

  const totalPipelineVal = sortedBreakdown.reduce((sum, b) => sum + (b.totalValue || 0), 0);
  const filteredPipelineVal = activeFilteredCustomers.reduce((sum, c) => sum + (Number(c.leadValue || c.budget) || 0), 0);
  const hasActiveFilter = filterDateRange !== "all" || filterStage !== "all" || filterStatus !== "all" || filterSearchQuery.trim() !== "";

  const categoryTabs = ["All", "CRM & Sales", "Operations", "Finance", ...(isComplianceEnabled ? ["Compliance"] : []), "Activity & Staff", "Master"];

  const revenueChartData = React.useMemo(() => {
    if (Array.isArray(summary?.revenueByMonth) && summary.revenueByMonth.length > 0) {
      return summary.revenueByMonth;
    }
    const monthBuckets = new Map();
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets.set(key, {
        name: d.toLocaleString("en-US", { month: "short" }),
        revenue: 0
      });
    }
    (activeFilteredCustomers || []).forEach((c) => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthBuckets.has(key)) {
        const bucket = monthBuckets.get(key);
        bucket.revenue += Number(c.leadValue || c.budget || 0);
      }
    });
    return Array.from(monthBuckets.values());
  }, [summary?.revenueByMonth, activeFilteredCustomers]);

  return (
    <div id="reports-print-area" className="space-y-5 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          aside, header, nav, footer, .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          #reports-print-area, #reports-print-area * {
            visibility: visible !important;
          }
          #reports-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}} />

      {/* ── UNIVERSAL REPORT & EXPORT CENTER ─────────── */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 text-slate-900 shadow-sm relative overflow-hidden border border-slate-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  CRM Reporting & Export Hub
                </h3>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                  {totalModulesCount} Active Modules
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                Enterprise-grade live CRM exports, filtered tables & executive PDF/CSV workbooks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => handleExportSingleModule("all", "csv")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
              title="Download Master Excel/CSV Workbook"
            >
              <Download size={13} />
              <span>Excel/CSV</span>
            </button>
            <button
              onClick={() => handleExportSingleModule("all", "pdf")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
              title="Generate Master PDF Report"
            >
              <Printer size={13} />
              <span>PDF Report</span>
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shrink-0"
              title="Schedule Automated Dispatch"
            >
              <Clock size={13} className="text-amber-500" />
              <span>Schedule</span>
            </button>
          </div>
        </div>

        {/* EXECUTIVE KPI SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 relative z-10">
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Records in Scope</p>
            <p className="text-base font-black text-slate-900 mt-0.5">{activeFilteredCustomers.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{hasActiveFilter ? "Filtered view" : "All CRM accounts"}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Value</p>
            <p className="text-base font-black text-indigo-600 mt-0.5">{formatCurrency(hasActiveFilter ? filteredPipelineVal : totalPipelineVal)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active deal volume</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Won Revenue</p>
            <p className="text-base font-black text-emerald-600 mt-0.5">{formatCurrency(summary?.revenue || 0)}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Realized closed-won</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Conversion Rate</p>
            <p className="text-base font-black text-slate-900 mt-0.5">{safeConversionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Lead-to-win ratio</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Collection Ratio</p>
            <p className="text-base font-black text-sky-600 mt-0.5">{safeCollectionEfficiency.toFixed(0)}%</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Received vs invoiced</p>
          </div>
        </div>

        {/* EXECUTIVE REPORT FILTER BAR */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3 relative z-10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-indigo-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Interactive Report Filter Controls</span>
              {hasActiveFilter && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wider">
                  {activeFilteredCustomers.length} Records Matched
                </span>
              )}
            </div>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setFilterDateRange("all");
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setFilterStage("all");
                  setFilterStatus("all");
                  setFilterSearchQuery("");
                }}
                className="text-[10px] font-black text-rose-600 hover:text-rose-500 uppercase tracking-widest flex items-center gap-1 transition-all"
              >
                <X size={12} /> Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search Keyword */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterSearchQuery}
                onChange={(e) => setFilterSearchQuery(e.target.value)}
                placeholder="Search company, TRN, email..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 font-semibold"
              />
            </div>

            {/* Date Range Selector */}
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                <option value="all">Date Range: All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">This Quarter (90 Days)</option>
                <option value="year">This Year (365 Days)</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Pipeline Stage */}
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                <option value="all">Stage: All Stages</option>
                <option value="new">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won Deals</option>
                <option value="lost">Lost Deals</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 font-semibold cursor-pointer"
              >
                <option value="all">Status: All Statuses</option>
                <option value="paid">Paid / Completed</option>
                <option value="pending">Pending / In Progress</option>
                <option value="overdue">Overdue / Expired</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {filterDateRange === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-300">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-semibold"
              />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-semibold"
              />
            </div>
          )}
        </div>

        {/* Category Tabs with Live Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none relative z-10">
          {categoryTabs.map((cat) => {
            const count = allowedModules.filter(
              (m) => m.id !== "all" && (cat === "All" || m.category.includes(cat.split(" ")[0]))
            ).length;
            return (
              <button
                key={cat}
                onClick={() => {
                  setExportCategoryTab(cat);
                  setModulesPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                  exportCategoryTab === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${exportCategoryTab === cat ? "bg-indigo-500 text-white" : "bg-white text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Module Cards Grid (Paginated) */}
        {(() => {
          const filteredMods = allowedModules.filter(
            (m) => m.id !== "all" && (exportCategoryTab === "All" || m.category.includes(exportCategoryTab.split(" ")[0]))
          );
          const pageSize = modulesPerPage === "all" ? Math.max(1, filteredMods.length) : modulesPerPage;
          const totalPages = Math.max(1, Math.ceil(filteredMods.length / pageSize));
          const safePage = Math.min(modulesPage, totalPages);
          const startIdx = (safePage - 1) * pageSize;
          const visibleMods = filteredMods.slice(startIdx, startIdx + pageSize);

          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
                {visibleMods.map(mod => {
                  const Icon = mod.icon;
                  const isExporting = exportingModule === mod.id;
                  return (
                    <div
                      key={mod.id}
                      className="bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-indigo-300 rounded-xl p-3.5 transition-all flex flex-col justify-between group shadow-xs hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors">
                            <Icon size={16} />
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{mod.category}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{mod.label}</h4>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-2">{mod.desc}</p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                        <button
                          onClick={() => handleViewModule(mod.id)}
                          disabled={loadingPreview}
                          className="py-1.5 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shrink-0"
                          title="Preview Report Data in Table"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          disabled={isExporting}
                          onClick={() => handleExportSingleModule(mod.id, "csv")}
                          className="flex-1 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                        >
                          <Download size={12} /> CSV
                        </button>
                        <button
                          disabled={isExporting}
                          onClick={() => handleExportSingleModule(mod.id, "pdf")}
                          className="flex-1 py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                        >
                          <Printer size={12} /> PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Pagination & Page-Size Bar */}
              {filteredMods.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 relative z-10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Showing <span className="font-bold text-slate-800">{startIdx + 1}–{Math.min(startIdx + visibleMods.length, filteredMods.length)}</span> of <span className="font-bold text-slate-800">{filteredMods.length}</span> modules
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                      <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5">Per page:</span>
                      {[6, 9, "all"].map((size) => (
                        <button
                          key={String(size)}
                          type="button"
                          onClick={() => {
                            setModulesPerPage(size);
                            setModulesPage(1);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                            modulesPerPage === size
                              ? "bg-white text-indigo-600 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {size === "all" ? "All" : size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setModulesPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setModulesPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                            safePage === pageNum
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage >= totalPages}
                        onClick={() => setModulesPage((p) => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </section>

      {/* ── EXECUTIVE CRM ANALYTICS HEADER ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Executive CRM Analytics</h2>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Filter size={12} className="text-indigo-500" />
            Live pipeline, conversion, cashflow & team intelligence
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="no-print flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:bg-indigo-100 transition-all"
          >
            <Download size={13} /> Export CSV
          </button>

          <button
            onClick={handleExportPDF}
            className="no-print flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-900 text-[10px] font-black uppercase tracking-wider text-white hover:bg-slate-800 transition-all"
            title="Download Master CRM Executive PDF Report"
          >
            <Printer size={13} /> Master PDF
          </button>

          <div className="no-print flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {["today", "week", "month"].map(range => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeRange === range ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 1: REVENUE TREND & CONVERSION VELOCITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue & Pipeline Trend */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Revenue & Pipeline Trend</h3>
                <p className="text-[10px] font-medium text-slate-500">6-month live CRM revenue & weighted pipeline analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-left sm:text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Weighted Forecast</p>
                <p className="text-base font-black text-indigo-600">{formatCurrency(summary?.weightedRevenue || 0)}</p>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div className="text-left sm:text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Win Rate</p>
                <p className="text-base font-black text-emerald-600">{safeConversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => formatCurrencyCompact(val)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
                    padding: '10px 12px'
                  }}
                  formatter={(value) => [formatCurrency(value), "Revenue"]}
                  itemStyle={{ fontSize: '12px', fontWeight: '800', color: '#4f46e5' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion & Velocity */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp size={17} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Conversion & Velocity</h3>
              <p className="text-[10px] font-medium text-slate-500">Lead-to-close winning efficiency</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <button
              onClick={() => onDrillDown?.("stage", "won")}
              className="relative w-28 h-28 flex items-center justify-center group/gauge cursor-pointer"
            >
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="52" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100" />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={327}
                  strokeDashoffset={327 - (327 * Math.min(100, safeConversionRate)) / 100}
                  className="text-emerald-500 transition-all duration-1000 group-hover/gauge:text-emerald-600"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-xl font-black text-slate-900 leading-none">{safeConversionRate.toFixed(1)}%</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">Win Rate</p>
              </div>
            </button>

            <div className="mt-3 flex flex-col items-center gap-0.5">
              <div className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wider ${isRevenueUp ? "text-emerald-600" : "text-rose-600"}`}>
                {isRevenueUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {revenueGrowth}% Growth
              </div>
              <p className="text-[10px] font-medium text-slate-400">vs previous period</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-center">
            <div className="p-2 rounded-xl bg-slate-50">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total Leads</p>
              <p className="text-sm font-black text-slate-900">{totalLeads || 0}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Won Revenue</p>
              <p className="text-sm font-black text-emerald-600">{formatCurrencyCompact(summary?.revenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: FUNNEL, RECEIVABLES & SUBSCRIPTIONS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Sales Funnel */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <BarChart3 size={17} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Sales Funnel</h3>
              <p className="text-[10px] font-medium text-slate-500">Pipeline conversion & stage drop-offs</p>
            </div>
          </div>

          <div className="space-y-2">
            {funnelData.length > 0 ? funnelData.map((item, idx) => (
              <div key={item.stage} className="space-y-1 text-center">
                <button
                  onClick={() => onDrillDown?.("stage", item.stage)}
                  style={{ width: `${Math.max(52, item.convFromBase)}%` }}
                  className="mx-auto flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-orange-50/70 border border-slate-200/80 hover:border-orange-200 transition-all cursor-pointer group/funnel"
                >
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider group-hover/funnel:text-orange-600">{item.stage}</span>
                  <div className="flex items-baseline gap-1 text-[10px] font-bold text-slate-500">
                    <span className="text-slate-900 font-black">{item.count}</span>
                    <span>•</span>
                    <span>{formatCurrencyCompact(item.totalValue)}</span>
                  </div>
                </button>

                {idx < funnelData.length - 1 && (
                  <div className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">
                    ↓ {funnelData[idx + 1].convFromPrev}% conversion
                  </div>
                )}
              </div>
            )) : (
              <div className="py-10 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-500">No active pipeline stages</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Deals added to stages will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Receivables & Cash */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Receipt size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Receivables & Cash</h3>
                <p className="text-[10px] font-medium text-slate-500">Gross invoiced vs cash collected</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3.5">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Invoiced</p>
                <p className="text-xs font-black text-slate-900 mt-0.5 truncate" title={formatCurrency(summary?.totalInvoiced || 0)}>
                  {formatCurrency(summary?.totalInvoiced || 0)}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <p className="text-[9px] font-bold text-emerald-600 uppercase">Collected</p>
                <p className="text-xs font-black text-emerald-700 mt-0.5 truncate" title={formatCurrency(summary?.totalReceived || 0)}>
                  {formatCurrency(summary?.totalReceived || 0)}
                </p>
              </div>
              <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
                <p className="text-[9px] font-bold text-rose-500 uppercase">Pending</p>
                <p className="text-xs font-black text-rose-600 mt-0.5 truncate" title={formatCurrency(summary?.totalOutstanding || 0)}>
                  {formatCurrency(summary?.totalOutstanding || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={163}
                  strokeDashoffset={163 - (163 * Math.min(100, safeCollectionEfficiency)) / 100}
                  className="text-emerald-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[11px] font-black text-slate-900">{Math.round(safeCollectionEfficiency)}%</p>
              </div>
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Collection Efficiency</p>
              <p className="text-[11px] font-medium text-slate-500 leading-snug">
                {summary?.totalOutstanding > 0
                  ? `${formatCurrency(summary.totalOutstanding)} unpaid receivables pending follow-up.`
                  : "All invoiced bills are fully settled."}
              </p>
            </div>
          </div>
        </div>

        {/* Subscriptions & Recurring Revenue */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Repeat size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Subscriptions & MRR</h3>
                <p className="text-[10px] font-medium text-slate-500">Active recurring plans & run rate</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Monthly (MRR)</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{formatCurrency(summary?.mrr || 0)}</p>
              </div>
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <p className="text-[9px] font-bold text-indigo-500 uppercase">Annual (ARR)</p>
                <p className="text-base font-black text-indigo-600 mt-0.5">{formatCurrency(summary?.arr || 0)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Plan Distribution ({summary?.activeSubscriptionsCount || 0} Active)
              </p>
              {summary?.planDistribution && summary.planDistribution.length > 0 ? (
                summary.planDistribution.map((plan) => {
                  const maxCount = Math.max(...summary.planDistribution.map(p => p.count)) || 1;
                  return (
                    <div key={plan.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="truncate">{plan.name}</span>
                        <span className="text-slate-500">{plan.count} users</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(plan.count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
                  <p className="text-[11px] font-semibold text-slate-400">No active subscriptions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: INTAKE, SLA AGING & EXECUTION/STRATEGY AUDIT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Intake & Trends */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={17} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Intake & Lead Sources</h3>
              <p className="text-[10px] font-medium text-slate-500">Daily lead velocity & channel share</p>
            </div>
          </div>

          <div className="h-14 flex items-end gap-1 mb-4 px-1">
            {leadsPerDay.length > 0 ? leadsPerDay.map((d) => (
              <div
                key={d._id}
                className="flex-1 bg-indigo-100 hover:bg-indigo-500 rounded-sm transition-all relative group/bar cursor-help"
                style={{ height: `${Math.max(12, (d.count / Math.max(...leadsPerDay.map(x => x.count))) * 100)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:block bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-20">
                  {d.count} Leads
                </div>
              </div>
            )) : (
              <div className="w-full h-full flex items-center justify-center border-b border-dashed border-slate-200 text-[10px] text-slate-400">
                No daily intake recorded in range
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume Distribution</p>
            {leadsBySource.length > 0 ? leadsBySource.slice(0, 4).map((s) => (
              <button
                key={s._id}
                onClick={() => onDrillDown?.("source", s._id)}
                className="w-full text-left space-y-1 group/source cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] font-bold group-hover/source:text-indigo-600 transition-colors">
                  <span className="text-slate-600 uppercase">{s._id}</span>
                  <span className="text-slate-900">{s.count}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full group-hover/source:bg-indigo-600 transition-all"
                    style={{ width: `${(s.count / (totalLeads || 1)) * 100}%` }}
                  />
                </div>
              </button>
            )) : (
              <p className="text-[11px] text-slate-400">No source attribution data yet.</p>
            )}
          </div>
        </div>

        {/* Response SLA */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center shrink-0">
              <Clock size={17} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Response SLA & Aging</h3>
              <p className="text-[10px] font-medium text-slate-500">Lead follow-up freshness breakdown</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { id: "recent", label: "Handled (0-2d)", count: aging.recent || 0, barColor: "bg-emerald-500", textColor: "text-emerald-600", health: "none" },
              { id: "stale", label: "Slow (3-7d)", count: aging.stale || 0, barColor: "bg-amber-500", textColor: "text-amber-600", health: "stale" },
              { id: "dormant", label: "Critical (7d+)", count: aging.dormant || 0, barColor: "bg-rose-500", textColor: "text-rose-600", health: "critical" }
            ].map(item => {
              const total = (aging.recent || 0) + (aging.stale || 0) + (aging.dormant || 0) || 1;
              return (
                <button
                  key={item.id}
                  onClick={() => item.health !== "none" && onDrillDown?.("health", item.health)}
                  className={`w-full text-left space-y-1.5 group/aging ${item.health !== "none" ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600 group-hover/aging:text-slate-900 transition-colors">{item.label}</span>
                    <span className={item.textColor}>{item.count} leads</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.barColor} rounded-full transition-all duration-700 group-hover/aging:brightness-95`}
                      style={{ width: `${(item.count / total) * 100}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Discipline & Strategy Audit */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Target size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Discipline & Loss Audit</h3>
                <p className="text-[10px] font-medium text-slate-500">Task backlog & drop-off reasons</p>
              </div>
            </div>
            <button
              onClick={() => onDrillDown?.("health", "overdue")}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer ${
                followUpHealth.overdue > 0
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : "bg-emerald-50 text-emerald-600 border-emerald-200"
              }`}
            >
              {followUpHealth.overdue > 0 ? "Backlog" : "Healthy"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => onDrillDown?.("health", "overdue")} className="text-left p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 hover:bg-rose-100/70 transition-colors cursor-pointer">
              <p className="text-[9px] font-bold text-rose-500 uppercase">Overdue</p>
              <p className="text-lg font-black text-rose-600 mt-0.5">{followUpHealth.overdue || 0}</p>
            </button>
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <p className="text-[9px] font-bold text-emerald-600 uppercase">Done Today</p>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{followUpHealth.completedToday || 0}</p>
            </div>
            <button onClick={() => onDrillDown?.("stage", "all")} className="text-left p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100/70 transition-colors cursor-pointer">
              <p className="text-[9px] font-bold text-indigo-500 uppercase">Active</p>
              <p className="text-lg font-black text-indigo-600 mt-0.5">{followUpHealth.totalOpen || 0}</p>
            </button>
          </div>

          <div className="pt-2.5 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Drop-off Reasons</p>
            {lostReasons && lostReasons.length > 0 ? (
              lostReasons.slice(0, 3).map((reason) => (
                <button
                  key={reason._id}
                  onClick={() => onDrillDown?.("stage", "lost")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/60 border border-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="truncate uppercase">{String(reason._id).replaceAll("_", " ")}</span>
                  <span className="text-rose-600 shrink-0">{reason.count} records</span>
                </button>
              ))
            ) : sortedLossStages.length > 0 ? (
              sortedLossStages.slice(0, 3).map(([stage, count]) => (
                <button
                  key={stage}
                  onClick={() => onDrillDown?.("stage", "lost")}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50/60 border border-slate-100 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="truncate uppercase">{stage}</span>
                  <span className="text-rose-600 shrink-0">{count} records</span>
                </button>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No lost-deal reasons recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 4: TEAM LEADERBOARD & UNIT ECONOMICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <CRMLeaderboard agents={agents || []} />
        </div>

        {/* Enterprise Unit Economics (Clean Light Card) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-indigo-200 mb-1">
                Unit Economics
              </span>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">LTV, CAC & Pipeline Health</h3>
              <p className="text-[10px] font-medium text-slate-500">
                {conversionRate > 20 ? "Conversion is above operational threshold." : "Focus on early lead qualification to boost win rate."}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Calculator size={17} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer LTV</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(ltv || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100">
              <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Acquisition Cost (CAC)</p>
              <p className="text-lg font-black text-rose-600 mt-0.5">{formatCurrency(cac || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">LTV : CAC Ratio</p>
              <p className="text-lg font-black text-indigo-700 mt-0.5">
                {Number(cac) > 0 ? `${(Number(ltv || 0) / Number(cac)).toFixed(1)}x` : "—"}
              </p>
            </div>
            <button
              onClick={() => onDrillDown?.("stage", "won")}
              className="text-left p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-100/60 transition-colors cursor-pointer"
            >
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Weighted Forecast</p>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{formatCurrency(summary?.weightedRevenue || 0)}</p>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-500">Period Revenue Delta</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isRevenueUp ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
              {isRevenueUp ? "+" : ""}{revenueGrowth}% vs prior period
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #reports-print-area, #reports-print-area * { visibility: visible !important; }
          #reports-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
          }
          button, .no-print { display: none !important; }
        }
      `}</style>

      {/* ── REPORT PREVIEW MODAL (PORTAL TO DOCUMENT.BODY) ───────────── */}
      {previewModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewModal(null); }}
        >
          <div className="bg-white rounded-[28px] w-full max-w-6xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 px-8 py-5 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-0.5">JTS CRM — Report Preview</p>
                <h3 className="text-sm font-black text-white tracking-tight">{previewModal.title}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{previewModal.rows.length} records found</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleModule(previewModal.moduleId, "csv")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  <Download size={12} /> Export CSV
                </button>
                <button
                  onClick={() => handleExportSingleModule(previewModal.moduleId, "pdf")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                >
                  <Printer size={12} /> Export PDF
                </button>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all ml-2"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-8 py-4 border-b border-slate-100 shrink-0">
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-10">#</th>
                    {previewModal.columns.map((col, i) => (
                      <th key={i} className="text-left px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewModal.rows
                    .filter(row => !previewSearch || row.some(cell => String(cell).toLowerCase().includes(previewSearch.toLowerCase())))
                    .map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400">{rowIdx + 1}</td>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-[11px] font-semibold text-slate-700 max-w-[200px] truncate">{String(cell)}</td>
                        ))}
                      </tr>
                    ))
                  }
                  {previewModal.rows.filter(row => !previewSearch || row.some(cell => String(cell).toLowerCase().includes(previewSearch.toLowerCase()))).length === 0 && (
                    <tr>
                      <td colSpan={previewModal.columns.length + 1} className="px-4 py-12 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">No records found matching search</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Showing {previewModal.rows.filter(row => !previewSearch || row.some(cell => String(cell).toLowerCase().includes(previewSearch.toLowerCase()))).length} of {previewModal.rows.length} records
              </p>
              <button
                onClick={() => setPreviewModal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Dispatch Modal */}
      {showScheduleModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">Schedule Automated Report</h4>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-900"><X size={18} /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/api/enterprise-bi/schedule-report", {
                  method: "POST",
                  body: JSON.stringify(scheduleForm)
                });
                toast?.success?.(`Report dispatch scheduled (${scheduleForm.frequency}) via ${scheduleForm.channel.toUpperCase()}!`);
                setShowScheduleModal(false);
              } catch (err) {
                toast?.error?.(err?.message || "Failed to schedule automated report");
              }
            }} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Dispatch Frequency</label>
                <select
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm(s => ({ ...s, frequency: e.target.value }))}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="daily">Daily Summary Digest (9:00 AM)</option>
                  <option value="weekly">Weekly Master Audit (Mondays)</option>
                  <option value="monthly">Monthly Financial & Compliance Report</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Dispatch Channel</label>
                <select
                  value={scheduleForm.channel}
                  onChange={(e) => setScheduleForm(s => ({ ...s, channel: e.target.value }))}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="email">Email PDF Attachment</option>
                  <option value="whatsapp">WhatsApp Summary Alert</option>
                  <option value="telegram">Telegram Broadcast Channel</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Recipient Address / Number</label>
                <input
                  required
                  placeholder="e.g. executive@company.com or +971501234567"
                  value={scheduleForm.recipient}
                  onChange={(e) => setScheduleForm(s => ({ ...s, recipient: e.target.value }))}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
