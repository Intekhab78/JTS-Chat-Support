import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router-dom";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell, LineChart, Line
} from 'recharts';
import {
  Users, Globe, Headphones, MessageSquare, LayoutDashboard, Search, Bell, Menu, X, Trash2, Send, Paperclip, AlertTriangle, Lock, Shield, Plus, ArrowRight, Layers,
  Bot, Sparkles, CheckCircle2, Clock, Activity, ExternalLink, ShieldCheck, Key, RefreshCw, ChevronLeft, ChevronRight, MapPin, UserCheck, Cpu, Database, Zap,
  Package, Folder, FolderTree, Tag, BarChart3, TrendingUp, Copy, Check, Video, FileText, Target, Award, Network, CreditCard, Contact, GitBranch, BookOpen, Radio, Building2, Sliders, CircleDot, Server, Eye
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import StatCard from "../components/StatCard.jsx";
import { useToast } from "../context/ToastContext.jsx";
import AdminOverdueFollowupsCard from "../components/CrmSystem/AdminOverdueFollowupsCard.jsx";

const WebsiteManager = lazy(() => import("../components/WebsiteManager.jsx"));
const AgentManager = lazy(() => import("../components/AgentManager.jsx"));
const ClientManager = lazy(() => import("../components/ClientManager.jsx"));
const ConversationHub = lazy(() => import("../components/ConversationHub.jsx"));
const TicketManager = lazy(() => import("../components/TicketManager.jsx"));
const ConversationHistory = lazy(() => import("../components/ConversationHistory.jsx"));
const CannedResponseManager = lazy(() => import("../components/CannedResponseManager.jsx"));
const CategoryManager = lazy(() => import("../components/CategoryManager.jsx"));
const DepartmentManager = lazy(() => import("../components/DepartmentManager.jsx"));
const CRMManager = lazy(() => import("../components/CRMManager.jsx"));
const SecurityCenter = lazy(() => import("../components/SecurityCenter.jsx"));
const HelpCenterManager = lazy(() => import("../components/KnowledgeBaseManager.jsx"));
const EnterpriseReportsCenter = lazy(() => import("../components/EnterpriseReportsCenter.jsx"));
const RoleManager = lazy(() => import("../components/RoleManager.jsx"));
const AdminSubscriptionManager = lazy(() => import("../components/AdminSubscriptionManager.jsx"));
const InventoryManager = lazy(() => import("../components/InventoryManager.jsx"));
const CustomerManager = lazy(() => import("../components/CustomerManager.jsx"));
const BillingPage = lazy(() => import("./BillingPage.jsx"));
const ExecutiveFlowDashboard = lazy(() => import("../components/ExecutiveFlowDashboard.jsx"));
const RiskRegisterManager = lazy(() => import("../components/RiskRegisterManager.jsx"));
const SaaSFinancialCenter = lazy(() => import("../components/SaaSFinancialCenter.jsx"));
const SlaManagementCenter = lazy(() => import("../components/SlaManagementCenter.jsx"));
const ObservabilityPlatform = lazy(() => import("../components/ObservabilityPlatform.jsx"));
const DeveloperPortalCenter = lazy(() => import("../components/DeveloperPortalCenter.jsx"));
const EnterpriseIntegrationCenter = lazy(() => import("../components/EnterpriseIntegrationCenter.jsx"));
const NoCodeWorkflowCenter = lazy(() => import("../components/NoCodeWorkflowCenter.jsx"));
const LowCodeStudioCenter = lazy(() => import("../components/LowCodeStudioCenter.jsx"));
const MissionControlCenter = lazy(() => import("../components/MissionControlCenter.jsx"));
const VisualFlowBuilder = lazy(() => import("../components/VisualFlowBuilder.jsx"));
import VoiceCallLogsTab from "../components/VoiceCallLogsTab.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { NotificationService } from "../utils/notifications.js";
import { useSocket } from "../context/SocketContext.jsx";
import { hasModule } from "../utils/planAccess.js";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    const key = message._id || `${message.createdAt}-${message.sender}-${message.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}

function getDefaultReportRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    preset: "7d",
    startDate: formatDateInput(start),
    endDate: formatDateInput(end)
  };
}

function TrafficChart({ data = [] }) {
  const hasValues = data.some(d => (Number(d.count) || 0) > 0);
  return (
    <div className="h-[190px] w-full min-w-0 overflow-hidden relative" style={{ minHeight: '190px' }}>
      {!hasValues && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500">
            0 visitors recorded in this date window
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%" minHeight={190} debounce={50}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent, #6366f1)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--accent, #6366f1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={6} stroke="#94a3b8" />
          <YAxis allowDecimals={false} width={28} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '10px', fontWeight: '700' }}
            cursor={{ stroke: 'var(--accent, #6366f1)', strokeWidth: 1.5, strokeDasharray: '3 3' }}
          />
          <Area type="monotone" dataKey="count" stroke="var(--accent, #6366f1)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTraffic)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityChart({ data = [] }) {
  const hasValues = data.some(d => (Number(d.count) || 0) > 0);
  return (
    <div className="h-[190px] w-full min-w-0 overflow-hidden relative" style={{ minHeight: '190px' }}>
      {!hasValues && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500">
            0 chats recorded in this date window
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%" minHeight={190} debounce={50}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={6} stroke="#94a3b8" />
          <YAxis allowDecimals={false} width={28} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '10px', fontWeight: '700' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={index % 2 === 0 ? "var(--accent, #6366f1)" : "#94a3b8"} fillOpacity={index % 2 === 0 ? 0.9 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SnapshotChart({ data = [] }) {
  const hasValues = data.some(d => (Number(d.visitors) || 0) > 0 || (Number(d.chats) || 0) > 0 || (Number(d.resolutions) || 0) > 0);
  return (
    <div className="h-[210px] w-full min-w-0 mt-3 overflow-hidden relative" style={{ minHeight: '210px' }}>
      {data.length > 0 && !hasValues && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500">
            No cross-channel activity in selected range
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%" minHeight={210} debounce={50}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={6} stroke="#94a3b8" />
          <YAxis allowDecimals={false} width={28} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 6px 16px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }}
          />
          <Line type="monotone" dataKey="chats" stroke="var(--accent, #6366f1)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent, #6366f1)', strokeWidth: 1.5, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="visitors" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="resolutions" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const workflowStages = [
  {
    title: "Capture",
    subtitle: "Real-time Visitor Tracking",
    accent: "from-indigo-500 to-indigo-600",
    points: ["Session fingerprinting", "Geo-location tracking", "Live activity monitoring"]
  },
  {
    title: "Engage",
    subtitle: "Active Conversation",
    accent: "from-cyan-500 to-cyan-600",
    points: ["Real-time messaging", "Canned responses", "Department routing"]
  },
  {
    title: "Convert",
    subtitle: "Lead Qualification",
    accent: "from-emerald-500 to-emerald-600",
    points: ["CRM lead generation", "Stage tracking", "Opportunity scoring"]
  },
  {
    title: "Resolve",
    subtitle: "Support Ticketing",
    accent: "from-amber-500 to-amber-600",
    points: ["Ticket lifecycle", "SLA monitoring", "Issue categorization"]
  },
  {
    title: "Optimize",
    subtitle: "Business Intelligence",
    accent: "from-rose-500 to-rose-600",
    points: ["Performance reports", "Volume analytics", "Strategic insights"]
  }
];

const ClientOverview = ({ analytics, queuedSessions, isExpired, stripeCustomerId, procurementStats, websiteId, selectedWebsite, user }) => {
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const CATEGORIES_PER_PAGE = 6;
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [graphRange, setGraphRange] = useState("7d");
  const [crmSummary, setCrmSummary] = useState(null);
  const [invoicesList, setInvoicesList] = useState([]);
  const [slaOverview, setSlaOverview] = useState(null);
  const [rangeAnalytics, setRangeAnalytics] = useState(null);

  useEffect(() => {
    let active = true;
    const wq = websiteId ? `?websiteId=${websiteId}` : "";
    const iq = websiteId ? `?websiteId=${websiteId}&limit=100` : "?limit=100";
    Promise.all([
      api(`/api/crm/summary${wq}`).catch(() => null),
      api(`/api/crm/invoices${iq}`).catch(() => []),
      api(`/api/sla-center/overview${wq}`).catch(() => null),
    ]).then(([crmRes, invRes, slaRes]) => {
      if (!active) return;
      setCrmSummary(crmRes || null);
      const invArr = Array.isArray(invRes) ? invRes : invRes?.invoices || invRes?.data || [];
      setInvoicesList(invArr);
      setSlaOverview(slaRes || null);
    });
    return () => { active = false; };
  }, [websiteId]);

  useEffect(() => {
    let active = true;
    if (graphRange === "7d") {
      setRangeAnalytics(null);
      return;
    }
    const days = graphRange === "today" ? 1 : 30;
    const qs = `?${websiteId ? `websiteId=${websiteId}&` : ""}days=${days}&range=${graphRange}`;
    api(`/api/analytics${qs}`)
      .then((res) => { if (active && res) setRangeAnalytics(res); })
      .catch(() => {});
    return () => { active = false; };
  }, [websiteId, graphRange]);

  const handleCopyKey = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };
  const isNewAccount = isExpired && !stripeCustomerId;

  const { formatCurrency } = useCurrency();

  useEffect(() => {
    let active = true;
    if (!websiteId) {
      setCategories([]);
      setInventoryItems([]);
      return;
    }

    setLoadingCats(true);
    Promise.all([
      api(`/api/categories?websiteId=${websiteId}`).catch(() => []),
      api(`/api/inventory/items?websiteId=${websiteId}`).catch(() => [])
    ])
      .then(([cats, items]) => {
        if (!active) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setInventoryItems(Array.isArray(items) ? items : []);
      })
      .finally(() => {
        if (active) setLoadingCats(false);
      });

    return () => {
      active = false;
    };
  }, [websiteId]);

  const dynamicCategories = useMemo(() => {
    const colors = ["indigo", "purple", "emerald", "cyan", "amber", "rose", "blue"];
    return categories.map((cat, idx) => {
      const subs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
      const mapped = inventoryItems.filter(item => 
        (item.categoryId && String(item.categoryId) === String(cat._id)) ||
        (item.category && String(item.category).toLowerCase() === String(cat.name).toLowerCase())
      );
      const totalVal = mapped.reduce((acc, it) => acc + ((it.unitCost || 0) * (it.quantity || 1)), 0);

      return {
        id: cat._id,
        name: cat.name,
        department: cat.department || "General",
        subs,
        items: mapped.length,
        itemNames: mapped.map(it => `${it.name}${it.sku ? ` (${it.sku})` : ''}`),
        val: totalVal > 0 ? formatCurrency(totalVal) : "—",
        color: colors[idx % colors.length]
      };
    });
  }, [categories, inventoryItems, formatCurrency]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return dynamicCategories;
    const q = categorySearch.toLowerCase();
    return dynamicCategories.filter(cat => 
      cat.name.toLowerCase().includes(q) || 
      cat.subs.some(s => s.toLowerCase().includes(q)) ||
      (cat.department && cat.department.toLowerCase().includes(q))
    );
  }, [dynamicCategories, categorySearch]);

  useEffect(() => {
    setCategoryPage(1);
  }, [websiteId, categorySearch]);

  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const paginatedCategories = useMemo(() => {
    const startIdx = (safeCategoryPage - 1) * CATEGORIES_PER_PAGE;
    return filteredCategories.slice(startIdx, startIdx + CATEGORIES_PER_PAGE);
  }, [filteredCategories, safeCategoryPage]);
  const activeAnalytics = rangeAnalytics || analytics;
  const rawChartData = activeAnalytics.trends?.dailyChats || [];
  const rawVisitorData = activeAnalytics.trends?.dailyVisitors || rawChartData;
  const sliceCount = graphRange === "today" ? 1 : graphRange === "7d" ? 7 : 30;
  const chartData = rawChartData.slice(-sliceCount);
  const visitorChartData = rawVisitorData.slice(-sliceCount);
  const snapshotData = (activeAnalytics.trends?.hourly || []).map(s => ({
    label: s.time,
    visitors: s.visitors,
    chats: s.chats,
    resolutions: s.resolved
  }));

  const unassignedChats = Array.isArray(queuedSessions) ? queuedSessions.length : (analytics.totals?.queuedChats ?? 0);
  const breachedSlas = slaOverview?.summary?.breachedSla ?? 0;

  const financePulse = useMemo(() => {
    const now = new Date();
    let collected = 0;
    let pendingDue = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    for (const inv of invoicesList) {
      const status = String(inv.status || "").toLowerCase();
      if (status === "void" || status === "cancelled") continue;
      const total = Number(inv.total) || 0;
      const paid = status === "paid" ? total : (Number(inv.paidAmount) || 0);
      collected += paid;
      const due = Math.max(0, total - paid);
      if (status !== "paid" && due > 0) {
        pendingDue += due;
        pendingCount += 1;
        if (status === "overdue" || (inv.dueDate && new Date(inv.dueDate) < now)) {
          overdueCount += 1;
        }
      } else if (status === "overdue") {
        overdueCount += 1;
      }
    }
    return {
      pipelineValue: Number(crmSummary?.pipelineValue ?? 0),
      collected,
      pendingDue,
      pendingCount,
      overdueCount,
    };
  }, [invoicesList, crmSummary]);

  const hasUrgentAlerts = unassignedChats > 0 || breachedSlas > 0 || financePulse.overdueCount > 0;

  const totalTickets = analytics.totals?.totalTickets ?? 0;
  const resolvedTickets = analytics.totals?.resolvedTickets ?? 0;
  const ticketResolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  const activeSiteWebhooks = Array.isArray(selectedWebsite?.webhooks)
    ? selectedWebsite.webhooks.filter((w) => w.isActive !== false).length
    : (analytics.ecosystem?.webhooksCount ?? 0);

  return (
    <div className="space-y-4">
      {/* 0. ACCOUNT SETUP / SUSPENSION ALERT (COMPACT) */}
      {isExpired && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-2 ${
          isNewAccount ? 'bg-indigo-50/70 border-indigo-200' : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 text-white rounded-lg flex items-center justify-center shrink-0 ${
              isNewAccount ? 'bg-indigo-600' : 'bg-rose-600'
            }`}>
              <AlertTriangle size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h4 className={`text-xs font-bold ${isNewAccount ? 'text-indigo-900' : 'text-rose-900'}`}>
                {isNewAccount ? "Platform Setup Pending" : "Ecosystem Suspended"}
              </h4>
              <p className={`text-[11px] font-medium truncate ${isNewAccount ? 'text-indigo-600' : 'text-rose-600'}`}>
                {isNewAccount ? "Please activate your plan to unlock enterprise support channels." : "Subscription expired. Renew access to resume automated routing."}
              </p>
            </div>
          </div>
          <a
            href="/client?tab=billing"
            className={`px-3 py-1.5 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-sm inline-flex items-center gap-1.5 ${
              isNewAccount ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <CreditCard size={12} strokeWidth={2.2} />
            <span>{isNewAccount ? "Buy Plan" : "Renew Access"}</span>
          </a>
        </div>
      )}

      {/* ACTIONABLE URGENT ALERT STRIP (ONLY SHOWN WHEN URGENT ITEMS EXIST) */}
      {hasUrgentAlerts && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Attention Required:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unassignedChats > 0 && (
              <a
                href="/client?tab=chats"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 hover:border-amber-400 text-[10px] font-bold transition-colors shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{unassignedChats} Unassigned Chat{unassignedChats === 1 ? "" : "s"}</span>
                <ArrowRight size={10} />
              </a>
            )}
            {breachedSlas > 0 && (
              <a
                href="/client?tab=sla-center"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:border-rose-400 text-[10px] font-bold transition-colors shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>{breachedSlas} Breached SLA{breachedSlas === 1 ? "" : "s"}</span>
                <ArrowRight size={10} />
              </a>
            )}
            {financePulse.overdueCount > 0 && (
              <a
                href="/client?tab=crm"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:border-rose-400 text-[10px] font-bold transition-colors shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>{financePulse.overdueCount} Overdue Invoice{financePulse.overdueCount === 1 ? "" : "s"}</span>
                <ArrowRight size={10} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: EXECUTIVE KPI COMMAND CENTER (6 SLEEK COMPACT WHITE CARDS)
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <LayoutDashboard size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Executive KPI Command Center
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
              <Radio size={10} strokeWidth={2.4} className="text-emerald-600" />
              <span>Real-time Live Pulse</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
            <Globe size={11} strokeWidth={2.2} />
            <span>{selectedWebsite?.websiteName || "All My Websites"}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Card 1: Live Visitors */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Visitors</span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Eye size={13} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {analytics.totals?.liveVisitors ?? 0}
            </div>
            <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
              <CircleDot size={10} strokeWidth={2.5} />
              <span>{analytics.totals?.totalVisitors ?? 0} Total Visitors</span>
            </p>
          </div>

          {/* Card 2: Today Chats */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Chats</span>
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MessageSquare size={13} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {analytics.totals?.dailyChats ?? 0}
            </div>
            <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
              <TrendingUp size={10} strokeWidth={2.2} className="text-indigo-500" />
              <span>{analytics.totals?.aiHandledChats ?? 0} AI Handled</span>
            </p>
          </div>

          {/* Card 3: AI Deflection */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Deflection</span>
              <div className="w-6 h-6 rounded-md bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Bot size={13} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-xl font-bold text-cyan-700 tracking-tight">
              {(analytics.totals?.aiDeflectionRate ?? 0) + "%"}
            </div>
            <p className="text-[10px] font-medium text-cyan-600 flex items-center gap-1">
              <Sparkles size={10} strokeWidth={2.2} />
              <span>{analytics.totals?.aiHandledChats ?? 0} Auto-Handled</span>
            </p>
          </div>

          {/* Card 4: Waiting Queue */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Queued Chats</span>
              <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={13} strokeWidth={2.2} />
              </div>
            </div>
            <div className={`text-xl font-bold tracking-tight ${(analytics.totals?.queuedChats ?? queuedSessions.length) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {analytics.totals?.queuedChats ?? queuedSessions.length}
            </div>
            <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
              <Activity size={10} strokeWidth={2.2} className="text-amber-500" />
              <span>{analytics.totals?.openTickets ?? 0} Open Tickets</span>
            </p>
          </div>

          {/* Card 5: First Response SLA */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Response</span>
              <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Zap size={13} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {(analytics.sla?.avgResponseTimeSeconds ?? 0) + "s"}
            </div>
            <p className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={10} strokeWidth={2.2} />
              <span>Wait: {(analytics.sla?.avgWaitTimeSeconds ?? 0) + "s"}</span>
            </p>
          </div>

          {/* Card 6: Customer CSAT */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CSAT Score</span>
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Award size={13} strokeWidth={2.2} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {(analytics.feedback?.satisfactionRate ?? 0) + "%"}
            </div>
            <p className="text-[10px] font-medium text-indigo-600 flex items-center gap-1">
              <CheckCircle2 size={10} strokeWidth={2.2} />
              <span>{analytics.feedback?.totalFeedback ?? 0} Ratings</span>
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: LIVE TRAFFIC & DEMAND DYNAMICS (2 COMPACT WHITE CHARTS)
         ========================================================================= */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Traffic & Operations Window
        </span>
        <div className="inline-flex items-center bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-2xs">
          {[
            { id: "today", label: "Today" },
            { id: "7d", label: "7D" },
            { id: "30d", label: "30D" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGraphRange(opt.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                graphRange === opt.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <TrendingUp size={13} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Realtime Traffic Evolution
                </h3>
                <p className="text-[11px] font-medium text-slate-400">Daily conversation & visitor volume</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md text-[9px] font-bold uppercase tracking-wider">
              <Activity size={10} strokeWidth={2.4} />
              <span>{analytics.totals?.totalMonthlyVisitors ?? 0} Range / {analytics.totals?.totalVisitors ?? 0} Total</span>
            </span>
          </div>
          <TrafficChart data={visitorChartData} />
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <BarChart3 size={13} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Peak Demand & Chat Volume
                </h3>
                <p className="text-[11px] font-medium text-slate-400">Incoming support sessions distribution</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
              <Clock size={10} strokeWidth={2.2} />
              <span>{analytics.totals?.dailyChats ?? 0} Chats</span>
            </span>
          </div>
          <ActivityChart data={chartData} />
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: 24-HOUR CROSS-CHANNEL DYNAMICS & SLA RESOLUTION TIMELINE
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-2.5 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Activity size={13} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Cross-Channel Operations & Resolution Timeline
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Correlating live visitors, active conversations, and resolved customer tickets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CircleDot size={11} strokeWidth={2.5} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Chats ({analytics.totals?.dailyChats ?? 0})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CircleDot size={11} strokeWidth={2.5} className="text-amber-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Visitors ({analytics.totals?.totalVisitors ?? 0})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CircleDot size={11} strokeWidth={2.5} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Solved ({analytics.totals?.resolvedTickets ?? 0})
              </span>
            </div>
          </div>
        </div>
        <SnapshotChart data={snapshotData} />
      </section>

      {/* =========================================================================
          SECTION 4: MULTI-BRAND & CONNECTED DOMAIN HUB
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Globe size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              4. Multi-Brand & Connected Domain Hub
            </h3>
          </div>
          <a
            href="/client?tab=websites"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>Manage Websites ({analytics.totals?.websites ?? 0})</span>
            <ArrowRight size={13} strokeWidth={2.2} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <Building2 size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Website Brand</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {selectedWebsite?.websiteName || "No Website Selected"}
              </p>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {selectedWebsite?.domain || "No domain linked"}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <Key size={15} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">API Tracking Key</p>
                <button
                  type="button"
                  onClick={() => handleCopyKey(selectedWebsite?.apiKey || selectedWebsite?._id || "")}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded cursor-pointer"
                >
                  {copiedKey ? <Check size={10} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={2.2} />}
                  <span>{copiedKey ? "Copied" : "Copy Key"}</span>
                </button>
              </div>
              <p className="text-xs font-mono font-semibold text-slate-700 truncate">
                {selectedWebsite?.apiKey ? `${selectedWebsite.apiKey.slice(0, 16)}...` : "Not Generated"}
              </p>
              <p className="text-[10px] font-medium text-slate-400">
                Widget ID: {selectedWebsite?._id ? String(selectedWebsite._id).slice(-8) : "—"}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <Server size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Domain Webhooks & Status</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} strokeWidth={2.3} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">
                  {activeSiteWebhooks} Active Webhook{activeSiteWebhooks === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400">
                {analytics.totals?.websites ?? 0} Total Owned Website{(analytics.totals?.websites ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: AI AUTOMATION & VISUAL FLOW DECISION BUILDER
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
              <Sparkles size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              5. AI Agent & Visual Decision Automation
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-bold">
              <Bot size={11} strokeWidth={2.2} />
              <span>{selectedWebsite?.aiEnabled !== false ? "AI Enabled" : "AI Paused"}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/client?tab=flow-builder"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors border border-indigo-100"
            >
              <GitBranch size={12} strokeWidth={2.2} />
              <span>Visual Flow Builder</span>
              <ArrowRight size={11} strokeWidth={2.2} />
            </a>
            <a
              href="/client?tab=help-center"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[11px] font-bold rounded-lg transition-colors border border-cyan-100"
            >
              <BookOpen size={12} strokeWidth={2.2} />
              <span>Train Knowledge Base</span>
              <ArrowRight size={11} strokeWidth={2.2} />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-cyan-600 shrink-0 shadow-xs">
              <GitBranch size={15} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual Decision Flows</p>
              <p className="text-sm font-bold text-slate-900">
                {analytics.ecosystem?.activeFlows ?? 0} Active Flow{(analytics.ecosystem?.activeFlows ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                {analytics.ecosystem?.totalFlows ?? 0} total flows configured for this website
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <Database size={15} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Knowledge Base Articles</p>
              <p className="text-sm font-bold text-slate-900">
                {analytics.ecosystem?.kbArticles ?? 0} Indexed Article{(analytics.ecosystem?.kbArticles ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                {dynamicCategories.length} categories & {inventoryItems.length} catalog items synced
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <Bot size={15} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Bot Resolution</p>
              <p className="text-sm font-bold text-slate-900">
                {analytics.totals?.aiHandledChats ?? 0} AI-Handled Chats
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                {(analytics.totals?.aiDeflectionRate ?? 0)}% automated deflection rate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: DYNAMIC CATEGORY & SERVICES INTELLIGENCE HUB (100% DYNAMIC PER WEBSITE)
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FolderTree size={13} strokeWidth={2.2} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                6. Category Analytics & Services Intelligence Hub
              </h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                dynamicCategories.length > 0
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-slate-500 bg-slate-50 border-slate-200"
              }`}>
                <CheckCircle2 size={10} strokeWidth={2.4} className={dynamicCategories.length > 0 ? "text-emerald-600" : "text-slate-400"} />
                <span>{dynamicCategories.length > 0 ? `${dynamicCategories.length} Categories Mapped` : "0 Categories"}</span>
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 pl-8">
              Live service categories and inventory intelligence strictly for <strong className="text-slate-700 font-semibold">{selectedWebsite?.websiteName || "selected website"}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/client?tab=categories"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <Layers size={12} strokeWidth={2.2} />
              <span>Manage Categories</span>
              <ArrowRight size={12} strokeWidth={2.2} />
            </a>
          </div>
        </div>

        {/* Dynamic Category Quick Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} strokeWidth={2.2} />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Quick search category, service tier, or subcategory..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Categories Grid or Clean Zero-Data Empty State */}
        {loadingCats ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-indigo-500" />
            <span>Loading categories for {selectedWebsite?.websiteName || "website"}...</span>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryModal(cat)}
                className="group relative p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors">
                        <BarChart3 size={14} strokeWidth={2.2} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {cat.department || "General"}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                      <CheckCircle2 size={10} strokeWidth={2.4} />
                      <span>Active</span>
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    {cat.name}
                  </h4>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {cat.subs.slice(0, 3).map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-medium"
                      >
                        <Folder size={10} strokeWidth={2} className="text-slate-400" />
                        <span>{sub}</span>
                      </span>
                    ))}
                    {cat.subs.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold">
                        +{cat.subs.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600 inline-flex items-center gap-1.5">
                    <Package size={12} strokeWidth={2.2} className="text-indigo-500" />
                    <span>{cat.items} Mapped Items</span>
                  </span>
                  <span className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                    <span>Inspect</span>
                    <ArrowRight size={12} strokeWidth={2.3} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredCategories.length > CATEGORIES_PER_PAGE && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
              <p className="text-[11px] font-medium text-slate-500">
                Showing <span className="font-bold text-slate-800">{(safeCategoryPage - 1) * CATEGORIES_PER_PAGE + 1}</span>–<span className="font-bold text-slate-800">{Math.min(safeCategoryPage * CATEGORIES_PER_PAGE, filteredCategories.length)}</span> of <span className="font-bold text-slate-800">{filteredCategories.length}</span> categories
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCategoryPage((p) => Math.max(1, p - 1))}
                  disabled={safeCategoryPage <= 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft size={12} strokeWidth={2.3} />
                  <span>Prev</span>
                </button>
                {Array.from({ length: totalCategoryPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCategoryPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      pageNum === safeCategoryPage
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))}
                  disabled={safeCategoryPage >= totalCategoryPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={12} strokeWidth={2.3} />
                </button>
              </div>
            </div>
          )}
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2.5">
            <div className="w-10 h-10 mx-auto rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Tag size={18} strokeWidth={2.2} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-xs font-bold text-slate-900">
                No Services or Categories Configured
              </h4>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                {selectedWebsite?.websiteName || "This website"} does not have any active service categories configured yet.
              </p>
            </div>
            <div className="pt-1">
              <a
                href="/client?tab=categories"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm transition-all"
              >
                <Plus size={12} strokeWidth={2.4} />
                <span>Add First Category / Service</span>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 7: CRM & CUSTOMER CONVERSION PIPELINE TRACKER
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Target size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              7. CRM & Customer Conversion Pipeline Tracker
            </h3>
          </div>
          <a
            href="/client?tab=crm"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>Open Full CRM Pipeline</span>
            <ArrowRight size={13} strokeWidth={2.2} />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
              <MessageSquare size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. New Inquiries</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {analytics.crm?.newInquiries ?? 0} Lead{(analytics.crm?.newInquiries ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="text-[10px] font-medium text-indigo-600">Captured for this website</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0">
              <Contact size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. In Qualification</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {analytics.crm?.inQualification ?? 0} In Follow-up
              </p>
              <p className="text-[10px] font-medium text-amber-600">Active qualification stage</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-cyan-600 shrink-0">
              <FileText size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Proposals Sent</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {analytics.crm?.proposalsSent ?? 0} Quotation{(analytics.crm?.proposalsSent ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="text-[10px] font-medium text-cyan-600">Active commercial proposals</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0">
              <UserCheck size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Deals Won</p>
              <p className="text-sm font-bold text-emerald-700 truncate">
                {analytics.crm?.dealsWon ?? 0} Customer{(analytics.crm?.dealsWon ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="text-[10px] font-medium text-emerald-600">Converted in Customer Master</p>
            </div>
          </div>
        </div>

        {/* Revenue & Finance Pulse */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-500">Pipeline Value</p>
              <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(financePulse.pipelineValue)}</p>
            </div>
            <span className="text-[9.5px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
              Open CRM
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-600">Collected Revenue</p>
              <p className="text-sm font-bold text-emerald-700 truncate">{formatCurrency(financePulse.collected)}</p>
            </div>
            <span className="text-[9.5px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
              Paid
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100/80 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-amber-600">Pending / Overdue</p>
              <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(financePulse.pendingDue)}</p>
            </div>
            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
              financePulse.overdueCount > 0
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-white text-amber-700 border-amber-100"
            }`}>
              {financePulse.pendingCount} inv{financePulse.overdueCount > 0 ? ` · ${financePulse.overdueCount} overdue` : ""}
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: TEAM & PERSONNEL LIVE WORKLOAD MONITOR
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Headphones size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              8. Team & Agent Live Workload Monitor
            </h3>
          </div>
          <a
            href="/client?tab=agents"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>Manage Agents & Shifts ({analytics.totals?.agents ?? 0})</span>
            <ArrowRight size={13} strokeWidth={2.2} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
              <Users size={15} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Human Personnel Active</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} strokeWidth={2.3} className="text-emerald-600" />
                <span className="text-sm font-bold text-slate-900">
                  {analytics.totals?.onlineAgents ?? 0} Online / {analytics.totals?.agents ?? 0} Total
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Assigned strictly to your organization</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <Building2 size={15} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Departments</p>
              <p className="text-sm font-bold text-slate-900">
                {analytics.ecosystem?.departmentsCount ?? 0} Department{(analytics.ecosystem?.departmentsCount ?? 0) === 1 ? "" : "s"} Active
              </p>
              <p className="text-[11px] font-medium text-slate-500">Configured for ticket & chat routing</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
              <Clock size={15} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Handle Time</p>
              <p className="text-sm font-bold text-indigo-700">
                {(analytics.sla?.avgHandleTimeMinutes ?? 0) + " min"} Avg Duration
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                {analytics.leaderboard?.length ?? 0} active agent{(analytics.leaderboard?.length ?? 0) === 1 ? "" : "s"} in period leaderboard
              </p>
            </div>
          </div>
        </div>

        {/* Live Agent Leaderboard & Visitor Geo Distribution Sub-Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Award size={12} strokeWidth={2.2} className="text-indigo-600" />
                <span>Live Agent Chat Leaderboard</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Top 3 Performers</span>
            </div>
            {Array.isArray(analytics.leaderboard) && analytics.leaderboard.length > 0 ? (
              <div className="space-y-1.5">
                {analytics.leaderboard.slice(0, 3).map((ag, idx) => (
                  <div key={ag._id || idx} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/70 text-xs">
                    <span className="font-bold text-slate-800 truncate">{idx + 1}. {ag.name || ag.email || "Agent"}</span>
                    <span className="text-[11px] font-bold text-indigo-600 shrink-0">
                      {ag.chatsHandled || 0} chats • {ag.avgHandleSeconds ? `${Math.round(ag.avgHandleSeconds)}s avg` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] font-medium text-slate-400 py-1">No agent-handled chat sessions recorded in this period yet.</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin size={12} strokeWidth={2.2} className="text-emerald-600" />
                <span>Live Visitor Geo-Distribution</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Top Regions</span>
            </div>
            {Array.isArray(analytics.topCountries) && analytics.topCountries.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {analytics.topCountries.map((c, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 text-[11px] font-semibold text-slate-700">
                    <Globe size={11} strokeWidth={2.2} className="text-indigo-500" />
                    <span>{c.country || "Unknown"}</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">{c.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] font-medium text-slate-400 py-1">Visitor country telemetry will appear as live traffic arrives.</p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: ENTERPRISE INTEGRATIONS, SECURITY & SLA COMPLIANCE
         ========================================================================= */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck size={13} strokeWidth={2.2} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              9. Enterprise Integrations, Security & SLA Compliance
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/client?tab=enterprise-integrations"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition-colors border border-indigo-100"
            >
              <Network size={12} strokeWidth={2.2} />
              <span>JTS Meet & Webhooks</span>
              <ArrowRight size={11} strokeWidth={2.2} />
            </a>
            <a
              href="/client?tab=security"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors"
            >
              <Lock size={12} strokeWidth={2.2} />
              <span>Security & 2FA Center</span>
              <ArrowRight size={11} strokeWidth={2.2} />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Video size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Connectors</p>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={11} strokeWidth={2.4} className={analytics.ecosystem?.connectedIntegrations > 0 ? "text-emerald-600 shrink-0" : "text-slate-400 shrink-0"} />
                <span className="text-xs font-bold text-slate-900 truncate">
                  {analytics.ecosystem?.connectedIntegrations ?? 0} Connected
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500">
                {activeSiteWebhooks} webhook endpoint{activeSiteWebhooks === 1 ? "" : "s"} active
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Lock size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2FA & Access Control</p>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={11} strokeWidth={2.4} className={user?.twoFactorEnabled ? "text-emerald-600 shrink-0" : "text-amber-500 shrink-0"} />
                <span className={`text-xs font-bold truncate ${user?.twoFactorEnabled ? "text-emerald-700" : "text-slate-800"}`}>
                  {user?.twoFactorEnabled ? "2FA Enabled" : "2FA Not Enabled"}
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500">
                {analytics.ecosystem?.customRolesCount ?? 0} custom RBAC role{(analytics.ecosystem?.customRolesCount ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tenant Audit Trail</p>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={11} strokeWidth={2.4} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900 truncate">
                  {analytics.ecosystem?.auditLogsCount ?? 0} Audit Events
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500">100% isolated tenant logs</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Activity size={13} strokeWidth={2.2} />
            </div>
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket Resolution Rate</p>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={11} strokeWidth={2.4} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900 truncate">
                  {ticketResolutionRate}% Resolved
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500">
                {resolvedTickets} of {totalTickets} tickets closed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OPTIONAL PROCUREMENT PULSE (COMPACT WHITE CARD) */}
      {procurementStats && (
        <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Package size={13} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Procurement & Spending Pulse
                </h3>
                <p className="text-[11px] font-medium text-slate-400">Inventory spending & stock levels</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-900">
              Total Spend: {formatCurrency(procurementStats.totalSpend)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Alerts</p>
                <h4 className={`text-lg font-bold ${procurementStats.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {procurementStats.lowStockCount}
                </h4>
              </div>
              <AlertTriangle size={16} strokeWidth={2.2} className={procurementStats.lowStockCount > 0 ? 'text-rose-500' : 'text-emerald-500'} />
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Suppliers</p>
                <h4 className="text-lg font-bold text-slate-900">
                  {procurementStats.topSuppliers?.length || 0}
                </h4>
              </div>
              <Users size={16} strokeWidth={2.2} className="text-indigo-500" />
            </div>
            <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Purchase Orders</p>
                <h4 className="text-lg font-bold text-slate-900">
                  {procurementStats.statusDistribution?.reduce((acc, s) => acc + s.count, 0) || 0}
                </h4>
              </div>
              <BarChart3 size={16} strokeWidth={2.2} className="text-amber-500" />
            </div>
          </div>
        </section>
      )}

      {/* CATEGORY DASHBOARD ANALYTICS MODAL (COMPACT WHITE THEME WITH SHARP REACT ICONS) */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <BarChart3 size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">
                    <CheckCircle2 size={10} strokeWidth={2.4} />
                    <span>Live Category</span>
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mt-0.5">
                    {selectedCategoryModal.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategoryModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Mapped Items</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{selectedCategoryModal.items} Items</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Category Valuation</p>
                <p className="text-lg font-bold text-indigo-900 mt-0.5">{selectedCategoryModal.val}</p>
              </div>
            </div>

            {/* Mapped Item Names List */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mapped Items List:</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedCategoryModal.itemNames && selectedCategoryModal.itemNames.length > 0 ? (
                  selectedCategoryModal.itemNames.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Package size={13} strokeWidth={2.2} className="text-indigo-600 shrink-0" />
                        <span>{item}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 size={9} strokeWidth={2.4} />
                        <span>LIVE</span>
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-lg bg-slate-50 text-center text-xs font-medium text-slate-400">
                    No individual inventory items linked yet.
                  </div>
                )}
              </div>
            </div>

            {/* Subcategories */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subcategories & Tiers:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategoryModal.subs && selectedCategoryModal.subs.length > 0 ? (
                  selectedCategoryModal.subs.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                      <Folder size={11} strokeWidth={2.2} className="text-indigo-500" />
                      <span>{s}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-medium text-slate-400 italic">No subcategories defined</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <a
                href="/client?tab=categories"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                <Layers size={13} strokeWidth={2.2} />
                <span>Open Categories Hub</span>
                <ArrowRight size={13} strokeWidth={2.2} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ClientPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { websites, selectedWebsiteId, setSelectedWebsiteId, selectedWebsite } = useWebsite() || {};
  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdminUser = Boolean(userRole && (userRole.includes("admin") || userRole === "superadmin" || userRole === "global_admin"));
  const canUseTickets = isAdminUser || hasModule(user, "tickets");
  const canUseCRM = isAdminUser || hasModule(user, "crm");
  const canUseReports = isAdminUser || hasModule(user, "reports");
  const canUseSecurity = isAdminUser || hasModule(user, "security");
  const canUseShortcuts = isAdminUser || hasModule(user, "shortcuts");
  const isExpired = user?.subscription?.status === "expired" || user?.subscription?.status === "suspended";
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = user?.role === "tax_consultant" ? "crm" : "overview";
  const tab = tabParam || defaultTab;

  const [analytics, setAnalytics] = useState({ activeVisitors: 0, activeChats: 0, trend: [], snapshots: [] });
  const [procurementStats, setProcurementStats] = useState(null);
  const [queuedSessions, setQueuedSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [reportRange, setReportRange] = useState(() => getDefaultReportRange());

  const socket = useSocket();

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    // purchase role has no access to chat routes — skip them entirely
    const hasChatAccess = !["purchase"].includes(user?.role);

    const fetchInitial = async () => {
      try {
        const sharedParams = new URLSearchParams();
        if (selectedWebsiteId) sharedParams.set("websiteId", selectedWebsiteId);

        const analyticsParams = new URLSearchParams(sharedParams);
        if (reportRange.startDate) analyticsParams.set("startDate", reportRange.startDate);
        if (reportRange.endDate) analyticsParams.set("endDate", reportRange.endDate);

        const analyticsQuery = analyticsParams.toString() ? `?${analyticsParams.toString()}` : "";
        const sharedQuery = sharedParams.toString() ? `?${sharedParams.toString()}` : "";

        const [anaRes, queRes, sesRes, webRes, procRes] = await Promise.all([
          api(`/api/analytics${analyticsQuery}`).catch(() => ({ activeVisitors: 0, activeChats: 0, trend: [], snapshots: [] })),
          hasChatAccess ? api(`/api/chat/queued${sharedQuery}`).catch(() => []) : Promise.resolve([]),
          hasChatAccess ? api(`/api/chat/sessions${sharedQuery}`).catch(() => []) : Promise.resolve([]),
          api("/api/websites").catch(() => []),
          api(`/api/procurement/stats${sharedQuery}`).catch(() => null)
        ]);
        if (!isMounted) return;
        if (anaRes) setAnalytics(anaRes);
        if (Array.isArray(queRes)) setQueuedSessions(queRes);
        if (Array.isArray(sesRes)) setSessions(sesRes);
        if (procRes) setProcurementStats(procRes);
        setError("");
      } catch (err) {
        if (!isMounted) return;
        console.warn("ClientPage sync warning:", err);
      }
    };
    fetchInitial();

    if (!socket || !hasChatAccess) return;

    socket.on("connect", () => {
      console.log("[Socket] Connected to backend server");
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
      toast.error("Connection to server lost. Some features may not work properly.");
    });

    const handleSessionUpdate = () => fetchInitial();

    socket.on("sessionUpdate", handleSessionUpdate);
    socket.on("stats:update", handleSessionUpdate);
    socket.on("data:change", handleSessionUpdate);
    socket.on("newSession", (session) => {
      // Only notify if it belongs to current filter
      if (!selectedWebsiteId || session.websiteId === selectedWebsiteId) {
        setQueuedSessions(prev => [session, ...prev]);
        NotificationService.notify("New Visitor", `${session.visitorId?.name || 'A user'} is waiting for support.`);
      }
    });

    return () => {
      isMounted = false;
      socket.off("connect");
      socket.off("connect_error");
      socket.off("sessionUpdate", handleSessionUpdate);
      socket.off("stats:update", handleSessionUpdate);
      socket.off("data:change", handleSessionUpdate);
      socket.off("newSession");
    };
  }, [user, socket, selectedWebsiteId, reportRange.startDate, reportRange.endDate]);

  const menuItems = isAdminUser
    ? [
      { label: "Dashboard", href: "/admin" },
      { label: "Clients", href: "/admin?tab=clients" },
      { label: "Websites", href: "/admin?tab=websites" },
      { label: "Agents", href: "/admin?tab=agents" },
      { label: "Chats", href: "/admin?tab=chats" },
      { label: "Tickets", href: "/admin?tab=tickets" },
      { label: "CRM", href: "/admin?tab=crm" },
      { label: "Customer Master", href: "/admin?tab=inventory-customer" },
      { label: "Risk Register", href: "/admin?tab=risk-register" },
      { label: "SLA & SLO Center", href: "/admin?tab=sla-center" },
      { label: "Observability Center", href: "/admin?tab=observability" },
      { label: "Developer Portal", href: "/admin?tab=developer-portal" },
      { label: "Integration Hub", href: "/admin?tab=enterprise-integrations" },
      { label: "Low-Code Studio", href: "/admin?tab=lowcode-studio" },
      { label: "Mission Control", href: "/admin?tab=mission-control" },
      { label: "Financial Center", href: "/admin?tab=financial-analytics" },
      {
        label: "Inventory",
        children: [
          { label: "Item Master", href: "/admin?tab=inventory-master" },
          { label: "Category Master", href: "/admin?tab=inventory-category" },
          { label: "Subcategory Master", href: "/admin?tab=inventory-subcategory" },
          { label: "Brand Master", href: "/admin?tab=inventory-brand" },
          { label: "Size Master", href: "/admin?tab=inventory-size" },
          { label: "Color Master", href: "/admin?tab=inventory-color" },
          { label: "Unit Master", href: "/admin?tab=inventory-unit" },
          { label: "Supplier Master", href: "/admin?tab=inventory-supplier" },
          { label: "Stock In", href: "/admin?tab=inventory-stock-in" },
          { label: "Stock Out", href: "/admin?tab=inventory-stock-out" },
          { label: "Adjustment", href: "/admin?tab=inventory-adjustment" }
        ]
      },
      {
        label: "Procurement (Purchase)",
        children: [
          { label: "Purchase Dashboard", href: "/purchase" },
          { label: "Purchase Orders", href: "/purchase?tab=procurement" },
          { label: "Purchase Requests", href: "/purchase?tab=requests" },
          { label: "Purchase Accounts", href: "/purchase?tab=accounts" }
        ]
      },
      {
        label: "Finance (Accounts)",
        children: [
          { label: "Finance Dashboard", href: "/accounts" },
          { label: "General Ledger", href: "/accounts?tab=ledger" },
          { label: "Finance Invoices", href: "/accounts?tab=invoices" },
          { label: "Subscriptions Revenue", href: "/accounts?tab=subscriptions" },
          { label: "Financial Intelligence", href: "/accounts?tab=intelligence" }
        ]
      },
      { label: "Sales Board", href: "/sales" },
      { label: "Agent Desk", href: "/agent" },
      { label: "Manager Board", href: "/manager" },
      { label: "Departments", href: "/admin?tab=departments" },
      { label: "Categories", href: "/admin?tab=categories" },
      { label: "Shortcuts", href: "/admin?tab=shortcuts" },
      { label: "Reports", href: "/admin?tab=reports" },
      { label: "Historical Archive", href: "/admin?tab=history" },
      { label: "Security", href: "/admin?tab=security" },
      { label: "Help Center", href: "/admin?tab=help-center" },
      { label: "Subscriptions", href: "/admin?tab=subscriptions" },
      { label: "Role Master", href: "/admin?tab=roles" }
    ]
    : [
      { label: "Dashboard", href: "/client" },
      { label: "Websites", href: "/client?tab=websites" },
      { label: "Integration Hub", href: "/client?tab=enterprise-integrations" },
      { label: "Billing", href: "/client?tab=billing" },
    ];

  if (userRole === "tax_consultant") {
    menuItems.length = 0;
    menuItems.push({ label: "CRM", href: "/tax-consultant?tab=crm" });
    menuItems.push({ label: "Customer Master", href: "/tax-consultant?tab=inventory-customer" });
  } else if (user?.role === "client") {
    menuItems.length = 0;
    // 1. Executive Command Center
    menuItems.push({ label: "Command Center", href: "/client" });

    // 2. Live Helpdesk & Communication
    if (hasModule(user, "chat")) {
      menuItems.push({ label: "Chats", href: "/client?tab=chats" });
      menuItems.push({ label: "Shortcuts", href: "/client?tab=shortcuts" });
      menuItems.push({ label: "Historical Archive", href: "/client?tab=history" });
    }
    if (hasModule(user, "tickets")) {
      menuItems.push({ label: "Tickets", href: "/client?tab=tickets" });
    }
    if (hasModule(user, "enterprise") || hasModule(user, "sla-center")) {
      menuItems.push({ label: "SLA & SLO Center", href: "/client?tab=sla-center" });
      menuItems.push({ label: "Risk Register", href: "/client?tab=risk-register" });
    }

    // 3. Multi-Brand & Websites
    menuItems.push({ label: "Websites", href: "/client?tab=websites" });

    // 4. AI & Automations
    if (hasModule(user, "flow-builder") || hasModule(user, "automation")) {
      menuItems.push({ label: "Flow Builder", href: "/client?tab=flow-builder" });
    }
    if (hasModule(user, "help-center") || hasModule(user, "service")) {
      menuItems.push({ label: "Help Center", href: "/client?tab=help-center" });
    }
    if (hasModule(user, "voice-logs") || hasModule(user, "automation")) {
      menuItems.push({ label: "AI Voice Logs", href: "/client?tab=voice-logs" });
    }

    // 5. Services & Operations
    if (hasModule(user, "categories") || hasModule(user, "service")) {
      menuItems.push({ label: "Categories", href: "/client?tab=categories" });
    }
    if (hasModule(user, "departments") || hasModule(user, "service")) {
      menuItems.push({ label: "Departments", href: "/client?tab=departments" });
    }
    if (hasModule(user, "inventory") || hasModule(user, "operations")) {
      menuItems.push({
        label: "Inventory",
        children: [
          { label: "Item Master", href: "/client?tab=inventory-master" },
          { label: "Category Master", href: "/client?tab=inventory-category" },
          { label: "Subcategory Master", href: "/client?tab=inventory-subcategory" },
          { label: "Brand Master", href: "/client?tab=inventory-brand" },
          { label: "Size Master", href: "/client?tab=inventory-size" },
          { label: "Color Master", href: "/client?tab=inventory-color" },
          { label: "Unit Master", href: "/client?tab=inventory-unit" },
          { label: "Supplier Master", href: "/client?tab=inventory-supplier" },
          { label: "Stock In", href: "/client?tab=inventory-stock-in" },
          { label: "Stock Out", href: "/client?tab=inventory-stock-out" },
          { label: "Adjustment", href: "/client?tab=inventory-adjustment" },
          { label: "Movement History", href: "/client?tab=inventory-history" }
        ]
      });
    }

    // 6. CRM & Customer Master
    if (hasModule(user, "crm")) menuItems.push({ label: "CRM Pipeline", href: "/client?tab=crm" });
    if (hasModule(user, "crm") || hasModule(user, "customer-master")) {
      menuItems.push({ label: "Customer Master", href: "/client?tab=inventory-customer" });
    }

    // 7. Team & RBAC
    menuItems.push({ label: "Agents", href: "/client?tab=agents" });
    if (hasModule(user, "security") || hasModule(user, "roles")) {
      menuItems.push({ label: "Role Master", href: "/client?tab=roles" });
    }

    // 8. Enterprise Integrations & Connectors
    menuItems.push({ label: "Integrations Hub", href: "/client?tab=enterprise-integrations" });

    // 9. Security, Governance & Billing
    if (hasModule(user, "security")) {
      menuItems.push({ label: "Security Center", href: "/client?tab=security" });
    }
    if (hasModule(user, "reports")) {
      menuItems.push({ label: "Reports", href: "/client?tab=reports" });
    }
    menuItems.push({ label: "Billing & Plans", href: "/client?tab=billing" });
  } else if (!isAdminUser) {
    menuItems.push({ label: "Agents", href: "/client?tab=agents" });
    if (hasPermission(user, PERMISSIONS.CHAT_VIEW)) menuItems.push({ label: "Chats", href: "/client?tab=chats" });
    if (canUseTickets && hasPermission(user, PERMISSIONS.TICKET_VIEW)) {
      menuItems.push({ label: "Tickets", href: "/client?tab=tickets" });
      menuItems.push({ label: "Departments", href: "/client?tab=departments" });
      menuItems.push({ label: "Categories", href: "/client?tab=categories" });
    }
    menuItems.push({ label: "Customer Master", href: "/client?tab=inventory-customer" });
    if (hasPermission(user, PERMISSIONS.CRM_VIEW) && canUseCRM) {
      menuItems.push({ label: "CRM", href: "/client?tab=crm" });
    }
    if (hasPermission(user, PERMISSIONS.CHAT_VIEW) && canUseShortcuts) {
      menuItems.push({ label: "Shortcuts", href: "/client?tab=shortcuts" });
    }
    if (hasPermission(user, PERMISSIONS.REPORTS_VIEW) && canUseReports) {
      menuItems.push({ label: "Reports", href: "/client?tab=reports" });
    }
    if (hasPermission(user, PERMISSIONS.SETTINGS_MANAGE) && canUseSecurity) {
      menuItems.push({ label: "Security", href: "/client?tab=security" });
    }
    if (hasPermission(user, "role.manage") || hasPermission(user, PERMISSIONS.SETTINGS_MANAGE)) {
      menuItems.push({ label: "Role Master", href: "/client?tab=roles" });
    }
  }


  let content = (
    <ClientOverview
      analytics={analytics}
      queuedSessions={queuedSessions}
      isExpired={isExpired}
      stripeCustomerId={user?.stripeCustomerId}
      procurementStats={procurementStats}
      websiteId={selectedWebsiteId}
      selectedWebsite={selectedWebsite}
      user={user}
    />
  );
  let title = user?.role === "admin" ? "Admin Command Center" : "Master Overview";
  let subtitle = user?.role === "admin" ? "Global ecosystem intelligence and control" : "Real-time operations dashboard";

  if (tab === "chats") {
    title = "Conversation Hub";
    subtitle = "Manage real-time agent interactions";
    content = <ConversationHub socket={socket} initialSessions={sessions} websiteId={selectedWebsiteId} userRole={user?.role || "client"} currentUser={user} />;
  }

  if (tab === "flow-builder" || tab === "flows") {
    title = "Visual Chatbot Decision Builder";
    subtitle = "Design automated decision tree chatbot flows visually for non-coders";
    content = <VisualFlowBuilder websiteId={selectedWebsiteId} />;
  }

  if (tab === "voice-logs" || tab === "voice-calls") {
    title = "AI Telephone Voice Agent";
    subtitle = "View telephone call logs, transcripts, and auto-generated tickets";
    content = <VoiceCallLogsTab websiteId={selectedWebsiteId} />;
  }

  if (tab === "clients") {
    title = "Client Ecosystem Control";
    subtitle = "Manage high-level client entities";
    content = <ClientManager />;
  }

  if (tab === "websites") {
    title = "Ecosystem Control";
    subtitle = "Manage registered domains and widget credentials";
    content = <WebsiteManager isExpired={isExpired} />;
  }

  if (tab === "agents") {
    title = "Personnel Command";
    subtitle = "Manage security cleared support personnel";
    content = <AgentManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "tickets") {
    title = "Ticket Management";
    subtitle = "Track, manage, and resolve visitor support tickets";
    content = <TicketManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "history") {
    title = "Historical Archive";
    subtitle = "Audit and review ecosystem-wide conversational history";
    content = <ConversationHistory websiteId={selectedWebsiteId} />;
  }

  if (tab === "reports" || tab === "analytics") {
    title = "Reports Center";
    subtitle = user?.role === "admin" ? "Global reporting across all clients and websites" : "Professional website-wise business reporting";
    content = <EnterpriseReportsCenter websiteId={selectedWebsiteId} />;
  }

  if (tab === "shortcuts") {
    title = "Canned Response Shortcuts";
    subtitle = "Manage platform-wide quick reply snippets";
    content = <CannedResponseManager />;
  }

  if (tab === "categories") {
    title = "Ecosystem Taxonomy";
    subtitle = "Define ticket categories and sub-tiers for efficient triaging";
    content = <CategoryManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "departments") {
    title = "Department Routing";
    subtitle = "Review departments, categories, and assigned staff";
    content = <DepartmentManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "inventory" || tab === "inventory-master") {
    title = "Inventory Master";
    subtitle = "Client and purchase controlled stock records for the selected website";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="master" />;
  }

  if (tab === "inventory-stock-in") {
    title = "Stock In";
    subtitle = "Receive and add stock into inventory";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="in" />;
  }

  if (tab === "inventory-stock-out") {
    title = "Stock Out";
    subtitle = "Issue and reduce stock from inventory";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="out" />;
  }

  if (tab === "inventory-adjustment") {
    title = "Inventory Adjustment";
    subtitle = "Correct stock balances with manual adjustment";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="adjust" />;
  }

  if (tab === "inventory-history") {
    title = "Inventory History";
    subtitle = "Track stock movements and audit trail";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="history" />;
  }

  if (tab === "inventory-category") {
    title = "Inventory Category Master";
    subtitle = "Manage item categories for structured inventory";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-category" />;
  }

  if (tab === "inventory-subcategory") {
    title = "Inventory Subcategory Master";
    subtitle = "Manage item subcategories for granular organization";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-subcategory" />;
  }

  if (tab === "inventory-brand") {
    title = "Inventory Brand Master";
    subtitle = "Manage item brands for catalog structure";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-brand" />;
  }

  if (tab === "inventory-size") {
    title = "Inventory Size Master";
    subtitle = "Manage item sizes for variant control";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-size" />;
  }

  if (tab === "inventory-color") {
    title = "Inventory Color Master";
    subtitle = "Manage item colors for variant control";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-color" />;
  }

  if (tab === "inventory-unit") {
    title = "Inventory Unit Master";
    subtitle = "Manage item measurement units";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-unit" />;
  }

  if (tab === "inventory-supplier") {
    title = "Inventory Supplier Master";
    subtitle = "Manage preferred item suppliers";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-supplier" />;
  }

  if (tab === "inventory-vat" || tab === "inventory-tax") {
    title = "Inventory Tax Master";
    subtitle = "Manage standard product tax slabs and exemption rates";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-tax" />;
  }

  if (tab === "crm") {
    title = "CRM Master Console";
    subtitle = "Strategic customer relationship management and intelligence";
    content = <CRMManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "inventory-customer") {
    title = "Customer Master Registry";
    subtitle = "Global management of purchase accounts and customer profiles";
    content = <CustomerManager websiteId={selectedWebsiteId} />;
  }

  const isComplianceEnabled = !selectedWebsite || !Array.isArray(selectedWebsite.enabledModules) || selectedWebsite.enabledModules.includes("compliance");

  if (!isComplianceEnabled && (tab === "inventory-vat" || tab === "inventory-tax")) {
    title = "Tax & Compliance Not Enabled";
    subtitle = "Tax & Compliance suite is currently disabled for this domain";
    content = (
      <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-white/10 text-center max-w-md mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Shield size={24} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Tax & Compliance Suite Disabled</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This module is disabled for the selected website ({selectedWebsite?.websiteName || selectedWebsite?.domain || "current website"}). Please select an active compliance domain or enable it in Website Settings.
        </p>
      </div>
    );
  }

  if (tab === "risk-register") {
    title = "Enterprise Risk Register";
    subtitle = "CTO & Compliance Risk Governance, Heat Matrices & Mitigation Controls";
    content = <RiskRegisterManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "financial-analytics") {
    title = "SaaS Financial Analytics & Cost Center";
    subtitle = "Super Admin & Business Owner Revenue, MRR/ARR, Unit Economics & Cost Profitability Controls";
    content = <SaaSFinancialCenter />;
  }

  if (tab === "sla-center") {
    title = "Enterprise SLA / SLO Management Center";
    subtitle = "Service Level Commitments, Warning Alerts & Automatic Breach Escalation Controls";
    content = <SlaManagementCenter websiteId={selectedWebsiteId} />;
  }

  if (tab === "observability") {
    title = "Enterprise Observability & Telemetry Center";
    subtitle = "Real-Time System Metrics, Distributed Audit Logs & Smart Alert Rules";
    content = <ObservabilityPlatform />;
  }

  if (tab === "developer-portal") {
    if (!isAdminUser) {
      title = "Access Restricted";
      subtitle = "Developer Portal & Engineering Hub is restricted to Superadmin platform engineering";
      content = (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[32px] border border-slate-200/80 dark:border-white/10 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto">
            <Lock size={32} />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Superadmin Access Only</h3>
          <p className="text-xs font-bold text-slate-400 leading-relaxed">
            The Developer Portal & Engineering Hub contains platform-wide database schemas, architecture standards, and server telemetry reserved exclusively for platform administrators.
          </p>
          <div className="pt-2">
            <a
              href="/client?tab=enterprise-integrations"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 transition-all shadow-md"
            >
              Go to Integration Hub
            </a>
          </div>
        </div>
      );
    } else {
      title = "Developer Portal & Engineering Hub";
      subtitle = "API Reference, Mongoose Schemas Explorer, Code Standards & Engineering Telemetry";
      content = <DeveloperPortalCenter />;
    }
  }

  if (tab === "enterprise-integrations" || tab === "enterprise-integration") {
    title = "Webhook Integration Hub";
    subtitle = "HMAC-SHA256 Signed Outbound Webhooks, Inbound Receivers & Delivery Telemetry";
    content = <EnterpriseIntegrationCenter websiteId={selectedWebsiteId} />;
  }

  if (tab === "lowcode-studio") {
    title = "Low-Code Visual Studio & Layout Builder";
    subtitle = "Drag & Drop Form Builder, Dashboard Creator, Component Palette & Live Multi-Device Viewport";
    content = <LowCodeStudioCenter />;
  }

  if (tab === "mission-control") {
    title = "Enterprise Mission Control Center";
    subtitle = "Master System Telemetry, Real-Time Service Health, Live Command Palette & Executive AI Insights";
    content = <MissionControlCenter websiteId={selectedWebsiteId} />;
  }

  if (tab === "security") {
    title = "Security Center";
    subtitle = "Two-factor authentication, audit logs, and webhook delivery visibility";
    content = <SecurityCenter websiteId={selectedWebsiteId} />;
  }

  if (tab === "help-center" || tab === "knowledge-base" || tab === "faq" || tab === "ai-training") {
    title = "AI Knowledge Base & Training Studio";
    subtitle = "Train AI Chatbots with verified company documents, FAQs, and crawl website URLs";
    content = <HelpCenterManager websiteId={selectedWebsiteId} />;
  }

  if (tab === "subscriptions") {
    title = "Ecosystem Revenue";
    subtitle = "Master subscription and billing control for all clients";
    content = <AdminSubscriptionManager />;
  }

  if (tab === "roles") {
    title = "Role Management Center";
    subtitle = "Configure and oversee organizational roles and authorization";
    content = <RoleManager />;
  }

  if (tab === "billing") {
    title = "Billing & Subscription";
    subtitle = "Manage your platform plan and invoices";
    content = <BillingPage />;
  }

  if (!isAdminUser && !hasModule(user, tab)) {
    title = "Plan Upgrade Required";
    subtitle = "This workspace is locked under your current subscription tier";
    content = (
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[32px] p-12 text-center text-white border border-indigo-500/30 shadow-2xl relative overflow-hidden my-6">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock size={32} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 block">Subscription Tier Lock</span>
          <h2 className="text-2xl font-black text-white">Upgrade to Access {String(tab || "").replace(/-/g, " ").toUpperCase()}</h2>
          <p className="text-sm font-medium text-slate-300 leading-relaxed">
            Your current plan (<span className="text-amber-400 font-bold uppercase">{user?.subscription?.plan || "Starter"}</span>) does not include this module. Upgrade your subscription to unlock this workspace immediately.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <a
              href="/client?tab=billing"
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
            >
              View Upgrade Plans
            </a>
            <a
              href="/client?tab=overview"
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Back to Overview
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Handle other tabs generically for now
  if (!["overview", "chats", "websites", "agents", "clients", "reports", "tickets", "shortcuts", "history", "categories", "departments", "crm", "security", "billing", "subscriptions", "roles", "inventory-customer", "flow-builder", "flows", "voice-logs", "voice-calls", "help-center", "inventory", "inventory-master", "inventory-stock-in", "inventory-stock-out", "inventory-adjustment", "inventory-history", "inventory-category", "inventory-subcategory", "inventory-brand", "inventory-size", "inventory-color", "inventory-unit", "inventory-supplier", "inventory-vat", "inventory-tax", "risk-register", "financial-analytics", "sla-center", "observability", "developer-portal", "enterprise-integrations", "enterprise-integration", "lowcode-studio", "mission-control"].includes(tab)) {
    content = (
      <div className="bg-white p-24 rounded-[40px] border border-slate-200/60 shadow-sm text-center">
        <div className="max-w-xs mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Globe className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Feature Coming Soon</h3>
          <p className="text-xs font-bold text-slate-400 leading-relaxed">The {tab} interface is being optimized for the new analytics engine. Stay tuned!</p>
        </div>
      </div>
    );
  }

  return (
    <Layout title={title} subtitle={subtitle} menuItems={menuItems}>
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-[13px] font-bold mb-8">
          {error}
        </div>
      )}
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Loading module...</div>}>
        {content}
      </Suspense>
    </Layout>
  );
}
