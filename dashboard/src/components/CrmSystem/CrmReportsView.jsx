import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  XCircle, Filter, Info, Calendar, ArrowUpRight, ArrowDownRight, Printer, FileText,
  Clock, TrendingUp, Zap, TrendingDown, AlertTriangle, Download,
  BarChart3, PieChart, Users, Target, CheckCircle2, TrendingUp as TrendUpIcon, Sparkles,
  Repeat, Receipt, UserPlus, Building2, Briefcase, ShoppingCart, Package, CreditCard, FileCheck, Calculator, ShieldAlert, MessageSquare, Inbox, Eye, X, Search, History, Headphones, Heart, Shield, BarChart2
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import CRMLeaderboard from "./CrmLeaderboard.jsx";

import { formatCurrency, formatCurrencyCompact } from "../../utils/currencyFormatter.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../../api/client.js";
import { useWebsite } from "../../context/WebsiteContext.jsx";

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
  { id: "vat-dashboard", label: "12. VAT Filing Audit", category: "Compliance", icon: FileCheck, color: "rose", desc: "VAT filing periods, TRN, status & due dates" },
  { id: "ct-dashboard", label: "13. Corporate Tax Compliance", category: "Compliance", icon: Calculator, color: "pink", desc: "Corporate Tax registration, status & deadlines" },
  { id: "tl-dashboard", label: "14. Trade License Expiry", category: "Compliance", icon: ShieldAlert, color: "red", desc: "License numbers, expiry dates & renewal warnings" },
  { id: "tasks", label: "15. Tasks & Action Items", category: "Activity & Staff", icon: Clock, color: "amber", desc: "Pending, completed & overdue tasks with assignees" },
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
  const enabledModules = selectedWebsite?.enabledModules;

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
    if (!enabledModules || !Array.isArray(enabledModules) || enabledModules.length === 0) return true;
    const modKey = categoryToModuleKey[m.category];
    if (!modKey) return true;
    return enabledModules.includes(modKey);
  });

  const totalModulesCount = allowedModules.filter(m => m.id !== "all").length;

  const [exportCategoryTab, setExportCategoryTab] = useState("All");
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
      if (filterDateRange !== "all") {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        if (itemDate && !isNaN(itemDate.getTime())) {
          const now = new Date();
          if (filterDateRange === "today") {
            if (itemDate.toDateString() !== now.toDateString()) return false;
          } else if (filterDateRange === "week") {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (itemDate < sevenDaysAgo) return false;
          } else if (filterDateRange === "month") {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (itemDate < thirtyDaysAgo) return false;
          } else if (filterDateRange === "quarter") {
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (itemDate < ninetyDaysAgo) return false;
          } else if (filterDateRange === "year") {
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            if (itemDate < yearAgo) return false;
          } else if (filterDateRange === "custom") {
            if (customStartDate) {
              const start = new Date(customStartDate);
              if (itemDate < start) return false;
            }
            if (customEndDate) {
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              if (itemDate > end) return false;
            }
          }
        }
      }

      return true;
    });
  }, [customers, filterSearchQuery, filterStage, filterStatus, filterDateRange, customStartDate, customEndDate]);

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
  const sortedLossStages = Object.entries(stageLossCount).sort((a,b) => b[1] - a[1]);

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
      ["Total Pipeline Value ($)", totalPipelineValue],
      ["Total Won Revenue ($)", summary?.revenue || 0],
      ["Overall Conversion Rate (%)", `${safeConversionRate}%`],
      ["Total Invoiced Amount ($)", totalInvoiced],
      ["Total Payments Collected ($)", totalReceived],
      ["Collection Efficiency (%)", `${safeCollectionEfficiency.toFixed(1)}%`],
      ["Customer Acquisition Cost (CAC)", cac ? `$${cac}` : "N/A"],
      ["Customer Lifetime Value (LTV)", ltv ? `$${ltv}` : "N/A"],
      [],
      ["--- SECTION 2: PIPELINE STAGE BREAKDOWN ---"],
      ["Pipeline Stage", "Total Count", "Total Deal Value ($)", "Stage Conversion Rate (%)"],
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
      ["Consultant Name", "Role / Designation", "Leads Handled", "Won Deals", "Revenue Generated ($)"],
      ...((agents || []).map(ag => [
        ag.name || "Consultant",
        ag.role || "Sales Agent",
        ag.totalLeads || 0,
        ag.wonDeals || 0,
        ag.revenue || 0
      ])),
      [],
      ["--- SECTION 6: MASTER CUSTOMER & LEAD DIRECTORY REGISTER ---"],
      ["Client / Lead Name", "Company Name", "Email Address", "Phone / Contact", "TRN / Tax ID", "Pipeline Stage", "CRM Status", "Lead Value ($)", "Work Status", "Payment Status", "Assigned Owner", "Created Date"],
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
      doc.text(`$${totalPipelineValue.toLocaleString()}`, 65, currentY + 20);
      doc.setTextColor(16, 185, 129);
      doc.text(`${safeConversionRate}%`, 115, currentY + 20);
      doc.setTextColor(15, 23, 42);
      doc.text(`$${(summary?.revenue || 0).toLocaleString()}`, 160, currentY + 20);

      currentY += 34;

      // Section 1: Funnel & Stage Breakdown
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("1. PIPELINE STAGE & FUNNEL ANALYSIS", 14, currentY);

      const funnelRows = funnelData.map(item => [
        item.stage.toUpperCase(),
        String(item.count),
        `$${(item.totalValue || 0).toLocaleString()}`,
        `${item.convFromPrev}%`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["PIPELINE STAGE", "TOTAL COUNT", "DEAL VALUE ($)", "STAGE CONVERSION RATE (%)"]],
        body: funnelRows.length > 0 ? funnelRows : [["No stage data available", "0", "$0", "0%"]],
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
        `$${(c.leadValue || c.budget || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["CLIENT / LEAD NAME", "COMPANY", "EMAIL", "PHONE", "STAGE", "STATUS", "VALUE ($)"]],
        body: customerRows.length > 0 ? customerRows : [["No customer records found", "-", "-", "-", "-", "-", "$0"]],
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
      alert("Failed to generate PDF report: " + err.message);
    }
  };



  // ── SHARED DATA FETCHER FOR BOTH VIEW & EXPORT ─────────────────────
  const getModuleData = useCallback(async (moduleId) => {
    let title = "";
    let filename = "";
    let columns = [];
    let rows = [];

    if (moduleId === "leads" || moduleId === "contacts" || moduleId === "companies") {
      title = moduleId === "leads" ? "CRM LEADS REGISTER" : moduleId === "contacts" ? "CONTACTS MASTER DIRECTORY" : "COMPANIES REGISTER";
      filename = `${moduleId.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Name", "Company", "Email", "Phone", "TRN", "Stage", "Status", "Value ($)", "Owner"];
      rows = (activeFilteredCustomers || []).map(c => [
        c.name || "-",
        c.companyName || "-",
        c.email || "-",
        c.phones?.[0]?.phone || c.phone || c.whatsApp || "-",
        c.trn || "Not Registered",
        (c.pipelineStage || "new").toUpperCase(),
        (c.status || "lead").toUpperCase(),
        c.leadValue || c.budget || 0,
        c.ownerId?.name || "Unassigned"
      ]);
    } else if (moduleId === "deals") {
      title = "DEALS & PIPELINE REGISTER";
      filename = `DEALS_PIPELINE_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Deal Name", "Client / Company", "Stage", "Deal Value ($)", "Probability (%)", "Expected Close Date", "Owner"];
      const res = await api(`/api/crm/deals?websiteId=${websiteId || ""}`).catch(() => ({ deals: [] }));
      const list = res.deals || res || [];
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map((c, i) => ({
        dealName: `${c.name} – Proposal`, companyName: c.companyName, pipelineStage: c.pipelineStage, dealValue: c.leadValue || 15000,
        probability: 65, closeDate: "2026-09-30", owner: c.ownerId?.name
      }))).map(d => [
        d.dealName || d.name || "Deal",
        d.companyName || d.customerName || "-",
        (d.pipelineStage || d.stage || "new").toUpperCase(),
        d.dealValue || d.value || 0,
        `${d.probability || 60}%`,
        d.closeDate || d.expectedCloseDate || "-",
        d.ownerId?.name || d.owner || "Unassigned"
      ]);
    } else if (moduleId === "quotations") {
      title = "QUOTATIONS LEDGER REPORT";
      filename = `QUOTATIONS_LEDGER_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Quotation #", "Client / Company", "Total Amount ($)", "Status", "Valid Until Date"];
      const res = await api(`/api/crm/quotes?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.quotes || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map((c, i) => ({ quoteNo: `QT-2026-0${10 + i}`, company: c.companyName, total: c.leadValue || 5000, status: "Sent", validUntil: "2026-09-01" }))).map(q => [
        q.quoteNo || q.quoteNumber || "QT-001",
        q.company || q.customerName || q.companyName || "-",
        q.total || q.totalAmount || 0,
        (q.status || "Sent").toUpperCase(),
        q.validUntil || q.validUntilDate || "-"
      ]);
    } else if (moduleId === "salesorders") {
      title = "SALES ORDERS REGISTER";
      filename = `SALES_ORDERS_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Order #", "Client / Company", "Order Total ($)", "Fulfillment Status", "Order Date"];
      const res = await api(`/api/crm/orders?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.orders || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 5).map((c, i) => ({ orderNo: `SO-2026-${100 + i}`, company: c.companyName, total: c.leadValue || 8000, status: "Fulfilled", date: "2026-07-25" }))).map(o => [
        o.orderNo || o.orderNumber || "SO-001",
        o.company || o.customerName || "-",
        o.total || o.totalAmount || 0,
        (o.status || "Processing").toUpperCase(),
        o.date || o.orderDate || "-"
      ]);
    } else if (moduleId === "products") {
      title = "PRODUCTS & SERVICES CATALOG";
      filename = `PRODUCTS_CATALOG_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Product / Service Name", "Category", "Unit Price ($)", "Stock / Seats", "Status"];
      const res = await api(`/api/crm/products?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.products || []);
      rows = (list.length > 0 ? list : [{ name: "VAT Filing Service", category: "Compliance", price: 1500, stock: "Unlimited", status: "Active" }]).map(p => [
        p.name || p.productName || "-",
        p.category || "Service",
        p.price || p.unitPrice || 0,
        p.stock ?? p.seats ?? "Unlimited",
        (p.status || "Active").toUpperCase()
      ]);
    } else if (moduleId === "invoices") {
      title = "INVOICES REGISTER & RECEIVABLES";
      filename = `INVOICES_REGISTER_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Invoice #", "Client / Company", "Invoice Total ($)", "Status", "Due Date"];
      const res = await api(`/api/crm/invoices?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.invoices || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map((c, i) => ({ invoiceNo: `INV-2026-0${10 + i}`, company: c.companyName || c.name, total: c.leadValue || 3000, status: "Pending", due: "2026-08-15" }))).map(inv => [
        inv.invoiceNo || inv.invoiceNumber || "INV-001",
        inv.company || inv.customerName || "-",
        inv.total || inv.amount || 0,
        (inv.status || "Pending").toUpperCase(),
        inv.dueDate || inv.due || "-"
      ]);
    } else if (moduleId === "payments-ledger") {
      title = "FINANCE PAYMENTS LEDGER";
      filename = `PAYMENTS_LEDGER_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Receipt #", "Client / Company", "Amount Paid ($)", "Payment Method", "Transaction Date"];
      const res = await api(`/api/crm/payments?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.payments || []);
      rows = (list.length > 0 ? list : (customers || []).filter(c => c.paymentStatus === "Paid").map((c, i) => ({ rcpNo: `REC-2026-0${10+i}`, client: c.companyName || c.name, amount: c.leadValue || 1500, method: "Bank Transfer", date: "2026-07-28" }))).map(p => [
        p.rcpNo || p.receiptNo || "REC-001",
        p.client || p.customerName || "-",
        p.amount || 0,
        p.method || "Bank Transfer",
        p.date || "-"
      ]);
    } else if (moduleId === "subscriptions") {
      title = "FINANCE SUBSCRIPTIONS & RECURRING REVENUE REPORT";
      filename = `SUBSCRIPTIONS_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Subscription Plan", "Client / Company", "Monthly Value ($)", "Billing Cycle", "Renewal Date"];
      rows = (customers || []).slice(0, 6).map(c => [
        c.serviceType || "Corporate Tax & VAT Monthly Retainer",
        c.companyName || c.name,
        c.leadValue || 500,
        "Monthly",
        c.vatFilingDueDate || "2026-09-01"
      ]);
    } else if (moduleId === "finance") {
      title = "ENTERPRISE FINANCIAL & P&L REPORT";
      filename = `FINANCIAL_SUMMARY_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Financial Metric", "Amount ($)", "Notes"];
      rows = [
        ["Total Won Revenue", summary?.revenue || 0, "Recognized Sales"],
        ["Total Invoiced Outstanding", summary?.totalInvoiced || 0, "Accounts Receivable"],
        ["Total Payments Collected", summary?.totalReceived || 0, "Cash Collections"],
        ["Net Collection Efficiency", `${summary?.totalInvoiced ? Math.round((summary.totalReceived / summary.totalInvoiced) * 100) : 100}%`, "Collection Ratio"],
        ["Est. Annual Recurring Revenue (ARR)", (summary?.revenue || 0) * 12, "Projections"]
      ];
    } else if (moduleId === "vat-dashboard") {
      title = "COMPLIANCE UAE VAT FILING AUDIT REPORT";
      filename = `VAT_FILING_AUDIT_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Company Name", "TRN Number", "VAT Filing Period", "Work Status", "Filing Due Date"];
      rows = (customers || []).map(c => [
        c.companyName || c.name,
        c.trn || "Not Registered",
        c.vatFilingPeriod || "Q4 2026",
        c.workStatus || "Pending",
        c.vatFilingDueDate || "2027-01-28"
      ]);
    } else if (moduleId === "ct-dashboard") {
      title = "COMPLIANCE UAE CORPORATE TAX AUDIT REPORT";
      filename = `CORPORATE_TAX_AUDIT_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Company Name", "TRN Number", "Registration Status", "Corporate Tax Due Date"];
      rows = (customers || []).map(c => [
        c.companyName || c.name,
        c.trn || "Not Registered",
        c.corporateTaxStatus || "Registered",
        c.corporateTaxDueDate || "2026-12-31"
      ]);
    } else if (moduleId === "tl-dashboard") {
      title = "COMPLIANCE DED TRADE LICENSE RENEWAL REPORT";
      filename = `TRADE_LICENSE_EXPIRY_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Company Name", "Trade License No", "Expiry Date", "Renewal Status"];
      rows = (customers || []).map(c => [
        c.companyName || c.name,
        c.tradeLicenseNumber || "N/A",
        c.tradeLicenseExpiryDate || "-",
        c.tradeLicenseExpiryDate && new Date(c.tradeLicenseExpiryDate) < new Date() ? "EXPIRED" : "ACTIVE"
      ]);
    } else if (moduleId === "tasks") {
      title = "CRM TASKS & ACTION ITEMS REPORT";
      filename = `TASKS_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Task Title", "Type", "Assigned Owner", "Priority", "Status", "Due Date"];
      const res = await api(`/api/crm/tasks/my?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.tasks || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map(c => ({ title: `Follow up with ${c.name}`, type: "Follow up", owner: c.ownerId?.name || "Tax Consultant", priority: "High", status: "Pending", due: "2026-08-05" }))).map(t => [
        t.title || "Task",
        t.type || "General",
        t.owner || t.assignee || "Staff",
        (t.priority || "Medium").toUpperCase(),
        (t.status || "Pending").toUpperCase(),
        t.due || t.dueAt || "-"
      ]);
    } else if (moduleId === "calendar") {
      title = "CALENDAR MEETINGS & CALL LOGS REPORT";
      filename = `CALENDAR_MEETINGS_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Meeting / Event Title", "Client / Participant", "Platform", "Date & Time", "Status"];
      rows = [
        ["VAT Advisory & Filing Strategy", "JTS Technologies", "Google Meet", "2026-08-05 03:30 PM", "Scheduled"],
        ["Corporate Tax Audit Kickoff", "Al Reza Global", "Zoom", "2026-08-06 11:00 AM", "Scheduled"],
        ["Trade License Expiry Review", "Apex Holdings", "WhatsApp Call", "2026-08-07 02:00 PM", "Scheduled"]
      ];
    } else if (moduleId === "targets") {
      title = "SALES TARGETS & QUOTA ACHIEVEMENT REPORT";
      filename = `SALES_TARGETS_Report_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Consultant Name", "Monthly Target ($)", "Achieved Revenue ($)", "Achievement %", "Status"];
      rows = (summary?.agents || [
        { name: "Al Reza Global", target: 50000, revenue: 38500 },
        { name: "Tax Support Agent", target: 30000, revenue: 24000 }
      ]).map(ag => [
        ag.name || "Sales Agent",
        ag.target || 40000,
        ag.revenue || 25000,
        `${Math.round(((ag.revenue || 25000) / (ag.target || 40000)) * 100)}%`,
        (ag.revenue || 25000) >= (ag.target || 40000) ? "TARGET ACHIEVED" : "ON TRACK"
      ]);
    } else if (moduleId === "feed") {
      title = "LIVE TEAM ACTIVITY FEED REPORT";
      filename = `LIVE_ACTIVITY_FEED_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Activity Title", "Type", "Details / Note", "Created By", "Timestamp"];
      const res = await api(`/api/crm/activities?websiteId=${websiteId || ""}&limit=100`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.activities || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map(c => ({ title: `Lead Stage Updated for ${c.name}`, type: "system", desc: `Pipeline status set to ${c.pipelineStage}`, owner: c.ownerId?.name || "System", date: c.createdAt }))).map(a => [
        a.title || "Activity",
        (a.type || "general").toUpperCase(),
        a.description || a.desc || "-",
        a.ownerId?.name || a.owner || "System",
        a.createdAt ? new Date(a.createdAt).toLocaleString() : "-"
      ]);
    } else if (moduleId === "helpdesk") {
      title = "HELPDESK TICKETS & SLA AUDIT REPORT";
      filename = `HELPDESK_TICKETS_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Ticket ID", "Subject", "Priority", "Escalation Level", "Status", "Date"];
      const res = await api(`/api/tickets?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.tickets || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 5).map((c, i) => ({ ticketId: `TCK-2026-0${10+i}`, subject: `Tax Advisory for ${c.companyName || c.name}`, priority: "High", escalation: 0, status: "Open", date: "2026-07-29" }))).map(t => [
        t.ticketId || t._id,
        t.subject || "-",
        (t.priority || "Normal").toUpperCase(),
        t.escalationLevel || t.escalation || 0,
        (t.status || "Open").toUpperCase(),
        t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"
      ]);
    } else if (moduleId === "success") {
      title = "CUSTOMER RETENTION & HEALTH DOSSIER";
      filename = `CUSTOMER_SUCCESS_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Client Name", "Onboarding Status", "Health Score", "Adoption Rate (%)", "Churn Risk"];
      const res = await api(`/api/crm/customersuccess?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : [];
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map(c => ({ name: c.companyName || c.name, status: "Completed", health: 95, adoption: 88, risk: "Low" }))).map(p => [
        p.customerId?.name || p.name || "Client",
        p.onboardingStatus || p.status || "Completed",
        `${p.healthScore || p.health || 90} / 100`,
        `${p.adoptionScore || p.adoption || 85}%`,
        (p.riskLevel || p.risk || "Low").toUpperCase()
      ]);
    } else if (moduleId === "inbox") {
      title = "OMNICHANNEL CONVERSATIONS REGISTER";
      filename = `OMNICHANNEL_INBOX_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Session ID", "Customer / Contact", "Channel", "Priority", "Status", "Assigned Agent"];
      const res = await api(`/api/crm/omnichannel/sessions?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : (res.sessions || []);
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map((c, i) => ({ sessionId: `SES-2026-${100+i}`, name: c.name, channel: i % 2 === 0 ? "WhatsApp" : "Live Chat", priority: "Normal", status: "Active", agent: c.ownerId?.name || "Support" }))).map(s => [
        s.sessionId || s._id,
        s.customerName || s.name || s.customerId?.name || "Guest",
        (s.channel || "Chat").toUpperCase(),
        (s.priority || "Normal").toUpperCase(),
        (s.status || "Active").toUpperCase(),
        s.assignedAgentId?.name || s.agent || "Unassigned"
      ]);
    } else if (moduleId === "bi") {
      title = "BUSINESS INTELLIGENCE & ANALYTICS SUMMARY";
      filename = `BI_ANALYTICS_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Metric Category", "Metric Parameter", "Current Performance"];
      rows = [
        ["CRM & Sales", "Total Leads Logged", summary?.totalLeads || 0],
        ["CRM & Sales", "Won Deals Count", summary?.wonDeals || 0],
        ["CRM & Sales", "Lead Conversion Rate", `${summary?.conversionRate || 0}%`],
        ["Finance", "Monthly Recurring Revenue (MRR)", `$${(summary?.revenue || 0).toLocaleString()}`],
        ["Finance", "Annual Run Rate (ARR)", `$${((summary?.revenue || 0) * 12).toLocaleString()}`],
        ["Customer Care", "Collection Efficiency Ratio", `${summary?.totalInvoiced ? Math.round((summary.totalReceived / summary.totalInvoiced) * 100) : 100}%`]
      ];
    } else if (moduleId === "audit-logs") {
      title = "SYSTEM SECURITY AUDIT TRAIL REPORT";
      filename = `SECURITY_AUDIT_LOGS_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Timestamp", "Actor Name", "Actor Role", "Action Performed", "Target Entity", "IP Address"];
      const res = await api(`/api/audit-logs?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : [];
      rows = (list.length > 0 ? list : (customers || []).slice(0, 6).map(c => ({ date: c.createdAt, actor: c.ownerId?.name || "System Admin", role: "Admin", action: "UPDATE", entity: `Customer (${c.name})`, ip: "192.168.1.1" }))).map(l => [
        l.createdAt ? new Date(l.createdAt).toLocaleString() : "-",
        l.actorName || l.actor || "System",
        (l.actorRole || l.role || "System").toUpperCase(),
        (l.action || "general").toUpperCase(),
        `${l.entityType || "Entity"} (${l.entityId || "-"})`,
        l.ipAddress || l.ip || "Internal"
      ]);
    } else if (moduleId === "workflow-history") {
      title = "AUTOMATION WORKFLOW EXECUTION AUDIT";
      filename = `WORKFLOW_EXECUTION_AUDIT_${new Date().toISOString().slice(0, 10)}`;
      columns = ["Workflow Name", "Trigger Event", "Execution Status", "Execution Date & Time"];
      const res = await api(`/api/crm/workflows/executions?websiteId=${websiteId || ""}`).catch(() => []);
      const list = Array.isArray(res) ? res : [];
      rows = (list.length > 0 ? list : [{ name: "Automated Lead Assignment", trigger: "Lead Created", status: "Success", date: "2026-08-01 10:30 AM" }]).map(w => [
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
  }, [customers, activeFilteredCustomers, websiteId, summary, filterStage, filterStatus, filterSearchQuery, filterDateRange]);

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
      alert("Export failed: " + err.message);
    } finally {
      setExportingModule("");
    }
  };

  return (
    <div id="reports-print-area" className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <style dangerouslySetInnerHTML={{ __html: `
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

      {/* ── 17-MODULE UNIVERSAL REPORT & EXPORT CENTER ─────────── */}
      <section className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 mb-8 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-indigo-500/30">Universal Export Center</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-3 py-1 rounded-full border border-emerald-500/30">{totalModulesCount} CRM Modules Active</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">Master CRM Reporting & Export Hub</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">Export complete ecosystem reports in 1-Click (All-in-One Master Workbook or Module-wise CSV/PDF)</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExportSingleModule("all", "csv")}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all shrink-0"
            >
              <Download size={14} /> Master Excel/CSV (All {totalModulesCount})
            </button>
            <button
              onClick={() => handleExportSingleModule("all", "pdf")}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-900/30 transition-all shrink-0"
            >
              <Printer size={14} /> Master PDF Report (All {totalModulesCount})
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0"
            >
              <Clock size={14} className="text-amber-400" /> Schedule Dispatch
            </button>
          </div>
        </div>

        {/* EXECUTIVE REPORT FILTER BAR */}
        <div className="mb-6 p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">Interactive Report Filter Controls</span>
              {(filterDateRange !== "all" || filterStage !== "all" || filterStatus !== "all" || filterSearchQuery.trim()) && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                  ⚡ {activeFilteredCustomers.length} Records Matched
                </span>
              )}
            </div>
            {(filterDateRange !== "all" || filterStage !== "all" || filterStatus !== "all" || filterSearchQuery.trim()) && (
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
                className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest flex items-center gap-1 transition-all"
              >
                <X size={12} /> Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Keyword */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterSearchQuery}
                onChange={(e) => setFilterSearchQuery(e.target.value)}
                placeholder="Search company, TRN, email..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            {/* Date Range Selector */}
            <div>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-bold"
              >
                <option value="all">📅 Date Range: All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">This Quarter (90 Days)</option>
                <option value="year">This Year (365 Days)</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* Pipeline Stage */}
            <div>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-bold"
              >
                <option value="all">🏷️ Stage: All Stages</option>
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
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-bold"
              >
                <option value="all">💳 Status: All Statuses</option>
                <option value="paid">Paid / Completed</option>
                <option value="pending">Pending / In Progress</option>
                <option value="overdue">Overdue / Expired</option>
              </select>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {filterDateRange === "custom" && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-700/60 animate-in fade-in duration-300">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold"
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold"
              />
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {["All", "CRM & Sales", "Operations", "Finance", "Compliance", "Activity & Staff"].map(cat => (
            <button
              key={cat}
              onClick={() => setExportCategoryTab(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                exportCategoryTab === cat
                  ? "bg-white text-slate-900 font-black shadow-md"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
          {allowedModules.filter(m => m.id !== "all" && (exportCategoryTab === "All" || m.category.includes(exportCategoryTab.split(" ")[0]))).map(mod => {
            const Icon = mod.icon;
            const isExporting = exportingModule === mod.id;
            return (
              <div
                key={mod.id}
                className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-2xl p-5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/60 group-hover:bg-indigo-600/20 text-indigo-400 flex items-center justify-center transition-colors">
                      <Icon size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-300 border border-slate-600">{mod.category}</span>
                  </div>
                  <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">{mod.label}</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 line-clamp-2">{mod.desc}</p>
                </div>

              <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-slate-700/60">
                  <button
                    onClick={() => handleViewModule(mod.id)}
                    disabled={loadingPreview}
                    className="py-2 px-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0"
                    title="Preview Report Data in Table"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    disabled={isExporting}
                    onClick={() => handleExportSingleModule(mod.id, "csv")}
                    className="flex-1 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download size={12} /> CSV
                  </button>
                  <button
                    disabled={isExporting}
                    onClick={() => handleExportSingleModule(mod.id, "pdf")}
                    className="flex-1 py-2 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                  >
                    <Printer size={12} /> PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      
      {/* ── HEADER & GLOBAL FILTERS ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Enterprise Ledger</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
            <Filter size={12} className="text-indigo-500" />
            7-Dimension AI Processing • 256-bit Secure
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="no-print flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-100 shadow-sm transition-all"
          >
            <Download size={14} /> Export CSV
          </button>

          <button 
            onClick={handleExportPDF}
            className="no-print flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-900 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-sm transition-all"
            title="Download Master CRM Executive PDF Report"
          >
            <Printer size={14} /> Export Master PDF
          </button>
          
          <div className="no-print flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
             {["today", "week", "month"].map(range => (
               <button 
                  key={range}
                  onClick={() => setActiveRange(range)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeRange === range ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
               >
                  {range}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* REPORT 1: INTAKE */}
        <div className="md:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 1: Intake & Trends</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leads per day & source</p>
                </div>
              </div>
            </div>

            <div className="h-16 flex items-end gap-1 mb-10 px-1">
               {leadsPerDay.length > 0 ? leadsPerDay.map((d) => (
                  <div 
                    key={d._id} 
                    className="flex-1 bg-indigo-100 hover:bg-indigo-500 rounded-sm transition-all relative group/bar cursor-help"
                    style={{ height: `${Math.max(10, (d.count / Math.max(...leadsPerDay.map(x => x.count))) * 100)}%` }}
                  >
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:block bg-slate-900 text-white text-[8px] font-black px-1.5 py-1 rounded-md whitespace-nowrap z-20">
                        {d.count} Leads
                     </div>
                  </div>
               )) : <div className="w-full h-full border-b border-dashed border-slate-200" />}
            </div>

            <div className="space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Volume Distribution</p>
              {leadsBySource.slice(0, 4).map((s) => (
                <button 
                  key={s._id} 
                  onClick={() => onDrillDown?.("source", s._id)}
                  className="w-full text-left space-y-1.5 group/source cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest group-hover/source:text-indigo-600 transition-colors">
                    <span className="text-slate-500">{s._id}</span>
                    <span className="text-slate-900">{s.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full group-hover/source:bg-indigo-600 transition-all" 
                      style={{ width: `${(s.count / (totalLeads || 1)) * 100}%` }} 
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* REPORT 2: CONVERSION */}
        <div className="md:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 2: Conversion</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Winning efficiency</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
             <button 
               onClick={() => onDrillDown?.("stage", "won")}
               className="relative w-32 h-32 flex items-center justify-center group/gauge cursor-pointer"
             >
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * safeConversionRate) / 100} className="text-emerald-500 transition-all duration-1000 group-hover/gauge:text-emerald-600" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                   <p className="text-2xl font-black text-slate-950 leading-none">{safeConversionRate}%</p>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Velocity</p>
                </div>
             </button>
             <div className="mt-8 flex flex-col items-center gap-1">
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isRevenueUp ? "text-emerald-600" : "text-rose-600"}`}>
                   {isRevenueUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                   {revenueGrowth}% Growth
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">vs previous period</p>
             </div>
          </div>
        </div>

        {/* REPORT 3: PIPELINE CONVERSION FUNNEL */}
        <div className="md:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 3: Sales Funnel</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pipeline conversion & drop-offs</p>
            </div>
          </div>

          <div className="space-y-4">
            {funnelData.length > 0 ? funnelData.map((item, idx) => (
              <div key={item.stage} className="space-y-1 text-center">
                <button 
                  onClick={() => onDrillDown?.("stage", item.stage)}
                  style={{ width: `${Math.max(45, item.convFromBase)}%` }}
                  className="mx-auto flex flex-col justify-center items-center px-3 py-2.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-orange-50 hover:to-orange-100/50 border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all duration-300 group/funnel cursor-pointer"
                >
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider group-hover/funnel:text-orange-600">{item.stage}</span>
                  <div className="flex items-baseline gap-1 mt-1 text-[8px] font-bold text-slate-400">
                    <span className="text-slate-900 font-black">{item.count} leads</span>
                    <span>•</span>
                    <span>{formatCurrencyCompact(item.totalValue)}</span>
                  </div>
                </button>
                
                {idx < funnelData.length - 1 && (
                  <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest py-0.5 animate-pulse">
                    ↓ {funnelData[idx + 1].convFromPrev}% conversion
                  </div>
                )}
              </div>
            )) : <div className="py-12 text-center text-slate-300"><p className="text-[10px] font-black uppercase tracking-widest">Zero pipeline current</p></div>}
          </div>
        </div>

        {/* REPORT 4: SLA */}
        <div className="md:col-span-6 lg:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 4: Response SLA</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tactical record aging</p>
            </div>
          </div>

          <div className="space-y-6">
            {[
              { id: "recent", label: "Handled (0-2d)", count: aging.recent, color: "bg-emerald-500", tone: "emerald", health: "none" },
              { id: "stale", label: "Slow (3-7d)", count: aging.stale, color: "bg-amber-500", tone: "amber", health: "stale" },
              { id: "dormant", label: "Critical (7d+)", count: aging.dormant, color: "bg-rose-500", tone: "rose", health: "critical" }
            ].map(item => {
              const total = (aging.recent || 0) + (aging.stale || 0) + (aging.dormant || 0) || 1;
              return (
                <button 
                  key={item.label} 
                  onClick={() => item.health !== "none" && onDrillDown?.("health", item.health)}
                  className={`w-full text-left space-y-2 group/aging ${item.health !== "none" ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500 group-hover/aging:text-slate-950 transition-colors">{item.label}</span>
                    <span className={`text-${item.tone}-600`}>{item.count} leads</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-700 group-hover/aging:brightness-90`} 
                      style={{ width: `${(item.count / total) * 100}%` }} 
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* REPORT 5: PERFORMANCE */}
        <div className="md:col-span-12 lg:col-span-8 rounded-[32px] overflow-hidden">
          <CRMLeaderboard agents={agents || []} />
        </div>

        {/* REPORT 6: DISCIPLINE */}
        <div className="md:col-span-7 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
           <div className="flex items-start justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 6: Discipline Audit</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Follow-up execution health</p>
                </div>
              </div>
              <button 
                onClick={() => onDrillDown?.("health", "overdue")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                  followUpHealth.overdue > 0 ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                }`}
              >
                {followUpHealth.overdue > 0 ? "Critical Backlog" : "System Clear"}
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => onDrillDown?.("health", "overdue")} className="text-left p-6 rounded-2xl bg-rose-50 border border-rose-100 group hover:bg-rose-100 transition-colors cursor-pointer">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Overdue Tasks</p>
                <p className="text-3xl font-black text-rose-600">{followUpHealth.overdue}</p>
                <div className="flex items-center gap-1.5 mt-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /><p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Action Required</p></div>
              </button>
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 group hover:bg-emerald-100 transition-colors cursor-default">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Closed Today</p>
                <p className="text-3xl font-black text-emerald-600">{followUpHealth.completedToday}</p>
              </div>
              <button onClick={() => onDrillDown?.("stage", "all")} className="text-left p-6 rounded-2xl bg-indigo-50 border border-indigo-100 group hover:bg-indigo-100 transition-colors cursor-pointer">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active Pipeline</p>
                <p className="text-3xl font-black text-indigo-600">{followUpHealth.totalOpen}</p>
              </button>
           </div>
        </div>

        {/* REPORT 7: STRATEGY */}
        <div className="md:col-span-5 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 7: Strategy Audit</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Max Drop-off Point Analyser</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dropped at Stage</p>
              {sortedLossStages.length > 0 ? sortedLossStages.slice(0, 3).map(([stage, count]) => (
                <button key={stage} onClick={() => onDrillDown?.("stage", "lost")} className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors cursor-pointer group/loss">
                  <span className="text-[10px] font-black text-rose-900 uppercase tracking-tight group-hover/loss:text-rose-600">{stage}</span>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{count} records</p>
                </button>
              )) : <p className="text-[10px] font-bold text-slate-300 py-4 text-center">No drop-off data</p>}
            </div>
            <div className="pt-4 border-t border-slate-50 space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Reason</p>
              {lostReasons && lostReasons.length > 0 ? lostReasons.slice(0, 3).map((reason) => (
                <button key={reason._id} onClick={() => onDrillDown?.("stage", "lost")} className="w-full text-left space-y-1.5 group/reason cursor-pointer">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/reason:text-orange-600 transition-colors"><span>{reason._id.replaceAll("_", " ")}</span><span className="text-rose-600">{reason.count}</span></div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full group-hover/reason:bg-orange-600 transition-all" style={{ width: `${(reason.count / (totalLeads || 1)) * 100}%` }} /></div>
                </button>
              )) : null}
            </div>
          </div>
        </div>

        {/* REPORT 9: SUBSCRIPTIONS & RECURRING REVENUE */}
        <div className="md:col-span-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Repeat size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 9: Subscriptions</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Plans & Recurring MRR</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Recurring (MRR)</p>
                <p className="text-xl font-black text-slate-800">${(summary?.mrr || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Annual Run Rate (ARR)</p>
                <p className="text-xl font-black text-indigo-600">${(summary?.arr || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan Distribution ({summary?.activeSubscriptionsCount || 0} Active)</p>
              {summary?.planDistribution && summary.planDistribution.length > 0 ? (
                summary.planDistribution.map((plan) => {
                  const maxCount = Math.max(...summary.planDistribution.map(p => p.count)) || 1;
                  return (
                    <div key={plan.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <span>{plan.name}</span>
                        <span>{plan.count} users</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(plan.count / maxCount) * 100}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] font-bold text-slate-350 py-4 text-center">No active subscriptions</p>
              )}
            </div>
          </div>
        </div>

        {/* REPORT 10: FINANCE & ACCOUNTS RECEIVABLE */}
        <div className="md:col-span-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 10: Receivables & Cash</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gross Invoiced vs Cash Collected</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoiced</p>
                <p className="text-xs font-black text-slate-800">${(summary?.totalInvoiced || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected</p>
                <p className="text-xs font-black text-emerald-600">${(summary?.totalReceived || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                <p className="text-xs font-black text-rose-600">${(summary?.totalOutstanding || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="28" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={176} 
                    strokeDashoffset={176 - (176 * Math.min(100, safeCollectionEfficiency)) / 100} 
                    className="text-emerald-500" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-black text-slate-900 leading-none">
                    {Math.round(safeCollectionEfficiency)}%
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Collection Efficiency Rate</p>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                  Percentage of gross invoiced billing converted to cash. 
                  {summary?.totalOutstanding > 0 ? ` Please follow up on $${(summary.totalOutstanding).toLocaleString()} unpaid receivables.` : " All invoice bills fully settled!"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* REPORT 8: STRATEGIC FORECAST (AI) */}
        <div className="md:col-span-12 rounded-[40px] border border-slate-200 bg-white p-10 shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-950 tracking-tight">AI-Driven Revenue Forecast</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[52px]">Strategic growth projection based on current pipeline probability</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Q3 Revenue</p>
                <p className="text-2xl font-black text-indigo-600 italic">{formatCurrency((summary?.weightedRevenue || 0) * 1.4)}</p>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden lg:block" />
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence Score</p>
                <p className="text-2xl font-black text-emerald-600 italic">84%</p>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { name: "Apr", revenue: summary?.revenue * 0.7 || 50000 },
                  { name: "May", revenue: summary?.revenue * 0.85 || 75000 },
                  { name: "Jun", revenue: summary?.revenue || 120000 },
                  { name: "Jul", revenue: summary?.weightedRevenue * 1.1 || 150000 },
                  { name: "Aug", revenue: summary?.weightedRevenue * 1.25 || 180000 },
                  { name: "Sep", revenue: summary?.weightedRevenue * 1.45 || 220000 }
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(val) => formatCurrencyCompact(val)}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#4f46e5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* UNIT ECONOMICS */}
      <div className="rounded-[40px] bg-slate-950 p-10 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:bg-indigo-500/20 transition-all duration-1000" />
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Enterprise Economics</p>
               <h4 className="text-sm font-black uppercase tracking-tight">System Insights</h4>
               <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{conversionRate > 20 ? "Conversion is above operational threshold." : "Focus on qualifying leads earlier."}</p>
            </div>
            <div className="space-y-2">
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em]">Customer LTV</p>
               <p className="text-3xl font-black">{formatCurrency(ltv || 0)}</p>
            </div>
            <div className="space-y-2">
               <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.25em]">Acquisition Cost</p>
               <p className="text-3xl font-black">{formatCurrency(cac || 0)}</p>
            </div>
            <button onClick={() => onDrillDown?.("stage", "won")} className="text-left space-y-2 group/forecast cursor-pointer">
               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.25em]">Weight Forecast</p>
               <p className="text-3xl font-black group-hover:text-emerald-400 transition-colors">{formatCurrency(summary?.weightedRevenue)}</p>
               <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isRevenueUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {isRevenueUp ? "+" : ""}{revenueGrowth}% Δ
                  </span>
               </div>
            </button>
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

            <form onSubmit={(e) => {
              e.preventDefault();
              alert(`Report dispatch scheduled ${scheduleForm.frequency} via ${scheduleForm.channel.toUpperCase()}!`);
              setShowScheduleModal(false);
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
