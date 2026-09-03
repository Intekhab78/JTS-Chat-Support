import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router-dom";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell, LineChart, Line
} from 'recharts';
import {
  Users, Globe, Headphones, MessageSquare, LayoutDashboard, Search, Bell, Menu, X, Trash2, Send, Paperclip, AlertTriangle
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import StatCard from "../components/StatCard.jsx";
import WebsiteManager from "../components/WebsiteManager.jsx";
import AgentManager from "../components/AgentManager.jsx";
import ClientManager from "../components/ClientManager.jsx";
import ConversationHub from "../components/ConversationHub.jsx";
import TicketManager from "../components/TicketManager.jsx";
import ConversationHistory from "../components/ConversationHistory.jsx";
import CannedResponseManager from "../components/CannedResponseManager.jsx";
import CategoryManager from "../components/CategoryManager.jsx";
import { useToast } from "../context/ToastContext.jsx";
import DepartmentManager from "../components/DepartmentManager.jsx";
import CRMManager from "../components/CRMManager.jsx";
import SecurityCenter from "../components/SecurityCenter.jsx";
import HelpCenterManager from "../components/KnowledgeBaseManager.jsx";
import EnterpriseReportsCenter from "../components/EnterpriseReportsCenter.jsx";
import RoleManager from "../components/RoleManager.jsx";
import AdminSubscriptionManager from "../components/AdminSubscriptionManager.jsx";
import InventoryManager from "../components/InventoryManager.jsx";
import CustomerManager from "../components/CustomerManager.jsx";
import BillingPage from "./BillingPage.jsx";
import ExecutiveFlowDashboard from "../components/ExecutiveFlowDashboard.jsx";
import VatFilingDashboard from "../components/CrmSystem/VatFilingDashboard.jsx";
import CorporateTaxDashboard from "../components/CrmSystem/CorporateTaxDashboard.jsx";
import TradeLicenseDashboard from "../components/CrmSystem/TradeLicenseDashboard.jsx";
import ComplianceReportsHub from "../components/CrmSystem/ComplianceReportsHub.jsx";
import TaxConsultantDashboard from "../components/CrmSystem/TaxConsultantDashboard.jsx";
import AdminOverdueFollowupsCard from "../components/CrmSystem/AdminOverdueFollowupsCard.jsx";
import RiskRegisterManager from "../components/RiskRegisterManager.jsx";
import SaaSFinancialCenter from "../components/SaaSFinancialCenter.jsx";
import SlaManagementCenter from "../components/SlaManagementCenter.jsx";
import ObservabilityPlatform from "../components/ObservabilityPlatform.jsx";
import LoadTestCenter from "../components/LoadTestCenter.jsx";
import ReleaseManagementCenter from "../components/ReleaseManagementCenter.jsx";
import DeveloperPortalCenter from "../components/DeveloperPortalCenter.jsx";
import ProductManagementCenter from "../components/ProductManagementCenter.jsx";
import AiAutomationCenter from "../components/AiAutomationCenter.jsx";
import ComplianceGovernanceCenter from "../components/ComplianceGovernanceCenter.jsx";
import MobileReadinessCenter from "../components/MobileReadinessCenter.jsx";
import EnterpriseIntegrationCenter from "../components/EnterpriseIntegrationCenter.jsx";
import NoCodeWorkflowCenter from "../components/NoCodeWorkflowCenter.jsx";
import AppMarketplaceCenter from "../components/AppMarketplaceCenter.jsx";
import LowCodeStudioCenter from "../components/LowCodeStudioCenter.jsx";
import CustomCrmModuleCenter from "../components/CustomCrmModuleCenter.jsx";
import EnterpriseBiCenter from "../components/EnterpriseBiCenter.jsx";
import MultiOrganizationCenter from "../components/MultiOrganizationCenter.jsx";
import MissionControlCenter from "../components/MissionControlCenter.jsx";
import VisualFlowBuilder from "../components/VisualFlowBuilder.jsx";
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
  return (
    <div className="h-[280px] w-full min-w-0 overflow-hidden relative" style={{ minHeight: '280px' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={280} debounce={50}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
            cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
          />
          <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityChart({ data = [] }) {
  return (
    <div className="h-[280px] w-full min-w-0 overflow-hidden relative" style={{ minHeight: '280px' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={280} debounce={50}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} stroke="#94a3b8" />
          <Tooltip
            cursor={{ fill: '#f8fafb' }}
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={index % 2 === 0 ? "#6366f1" : "#94a3b8"} fillOpacity={index % 2 === 0 ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SnapshotChart({ data = [] }) {
  return (
    <div className="h-[320px] w-full min-w-0 mt-6 overflow-hidden relative" style={{ minHeight: '320px' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={320} debounce={50}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '900' }}
          />
          <Line type="monotone" dataKey="chats" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="visitors" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="resolutions" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} />
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

const ClientOverview = ({ analytics, queuedSessions, isExpired, stripeCustomerId, procurementStats }) => {
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const isNewAccount = isExpired && !stripeCustomerId;
  const chartData = analytics.trends?.dailyChats || [];
  const snapshotData = analytics.trends?.hourly?.map(s => ({
    label: s.time,
    visitors: s.visitors,
    chats: s.chats,
    resolutions: s.resolved
  })) || [];

  const { formatCurrency } = useCurrency();

  return (
    <div className="space-y-10">
      {isExpired && (
        <div className={`border p-6 rounded-3xl flex items-center gap-6 animate-in slide-in-from-top-4 ${isNewAccount ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className={`w-10 h-10 text-white rounded-xl flex items-center justify-center shrink-0 ${isNewAccount ? 'bg-indigo-500' : 'bg-rose-500'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-[11px] font-black uppercase tracking-tight ${isNewAccount ? 'text-indigo-900' : 'text-rose-900'}`}>
              {isNewAccount ? "Complete Platform Setup" : "Ecosystem Suspended"}
            </h4>
            <p className={`text-[10px] font-bold truncate ${isNewAccount ? 'text-indigo-600' : 'text-rose-600'}`}>
              {isNewAccount ? "Welcome! Please buy a plan to activate your master support modules." : "Your subscription has expired. Advanced modules are locked until renewal."}
            </p>
          </div>
          <a href="/client?tab=billing" className={`px-5 py-2 text-white rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isNewAccount ? 'bg-indigo-600' : 'bg-rose-600'}`}>
            {isNewAccount ? "Buy a Plan" : "Resolve Access"}
          </a>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Live Visitors" value={analytics.totals?.liveSessions || 0} trend="+12% from last hour" color="indigo" />
        <StatCard label="Total Today" value={analytics.totals?.dailyChats || 0} trend="Daily volume" color="orange" />
        <StatCard label="Queued" value={queuedSessions.length} trend="Waiting for agent" color="rose" />
        <StatCard label="Avg Wait" value={(analytics.sla?.avgWaitTimeSeconds || 0) + "s"} trend="Response SLA" color="emerald" />
      </div>

      {procurementStats && (
        <section className="bg-white/50 backdrop-blur-xl border border-white/20 p-8 rounded-[36px] shadow-sm animate-in fade-in duration-1000">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1">Procurement Pulse</h3>
              <p className="text-xl font-black text-slate-900 tracking-tight">Active spending & inventory health</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Procurement Spend</p>
                <p className="text-lg font-black text-slate-900">{formatCurrency(procurementStats.totalSpend)}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Low Stock Alerts</p>
                <h4 className={`text-2xl font-black ${procurementStats.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {procurementStats.lowStockCount}
                </h4>
              </div>
              <div className={`p-3 rounded-xl ${procurementStats.lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} group-hover:scale-110 transition-transform`}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Suppliers</p>
                <h4 className="text-2xl font-black text-slate-900">
                  {procurementStats.topSuppliers?.length || 0}
                </h4>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total POs</p>
                <h4 className="text-2xl font-black text-slate-900">
                  {procurementStats.statusDistribution?.reduce((acc, s) => acc + s.count, 0) || 0}
                </h4>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                <BarChart size={20} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AUTOMATIC CATEGORY ANALYTICS DASHBOARDS SECTION (BOSS REQUIREMENT) */}
      <section className="bg-white p-8 rounded-[36px] border border-slate-200/70 shadow-sm space-y-6 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black uppercase tracking-wider">
                ⚡ AUTO-GENERATED DASHBOARDS
              </span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                🟢 5 Categories Mapped
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Category Analytics & Intelligence Hub</h3>
            <p className="text-xs text-slate-400 font-bold">Auto-generated category dashboards mapping items, subcategories & live operations. Click any category card to inspect full analytics.</p>
          </div>
          <a href="/client?tab=inventory-category" className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-md shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
            Manage Categories
          </a>
        </div>

        {/* Category Search & Quick Filter Bar */}
        <div className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
          <Search size={16} className="text-slate-400 ml-2" />
          <input
            type="text"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Quick search category or subcategory..."
            className="flex-1 bg-transparent text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400"
          />
          {categorySearch && (
            <button onClick={() => setCategorySearch("")} className="text-[10px] font-black text-slate-400 hover:text-slate-600 px-2">
              CLEAR
            </button>
          )}
        </div>

        {/* Category Dashboards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: "PRO Services", subs: ["Visa Stamping", "Emirates ID"], items: 1, itemNames: ["VIP Express Visa Processing (PRO-ALR-VIP-3201)"], val: "10,000 AED", color: "indigo" },
            { name: "Trade License", subs: ["License Renewals", "Amendments"], items: 1, itemNames: ["TRADE LICENSE RENEWAL (TRA-ALR-TRA-4894)"], val: "10,000 AED", color: "purple" },
            { name: "VAT Registration & Filing", subs: ["VAT Filing", "Returns"], items: 1, itemNames: ["VAT REGISTRATION & FILING ANNUAL (VAT-ALR-VAT-2586)"], val: "25,000 AED", color: "emerald" },
            { name: "Corporate Tax Filing", subs: ["Tax Returns", "Ledger"], items: 2, itemNames: ["CORPORATE TAX FILING (COR-ALR-COR-8777)", "CORPORATE TAX REGISTRATION"], val: "95,000 AED", color: "cyan" },
            { name: "Other Govt. Services", subs: ["MOFA Attestation"], items: 1, itemNames: ["MOFA DOCUMENT ATTESTATION"], val: "15,000 AED", color: "amber" }
          ]
            .filter(cat => {
              if (!categorySearch.trim()) return true;
              const q = categorySearch.toLowerCase();
              return cat.name.toLowerCase().includes(q) || cat.subs.some(s => s.toLowerCase().includes(q));
            })
            .map((cat, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedCategoryModal(cat)}
                className="p-6 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-4 hover:border-indigo-400 hover:bg-white transition-all group hover:shadow-lg cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black shadow-sm group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                      📊
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{cat.name}</h4>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                        Dashboard Active ↗
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Mapped Subcategories:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subs.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[9px] font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs font-black text-slate-900 border-t border-slate-200/50">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Category Mapped Items:</span>
                  <span className="text-indigo-600 font-extrabold flex items-center gap-1">
                    {cat.items} Mapped Item <span className="text-[10px]">➔</span>
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* CATEGORY DASHBOARD ANALYTICS MODAL */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl bg-white rounded-[32px] p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-black">
                  📊
                </div>
                <div>
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    🟢 Auto-Generated Dashboard Active
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-0.5">
                    {selectedCategoryModal.name} Analytics
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCategoryModal(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Mapped Items</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{selectedCategoryModal.items} Mapped Items</p>
              </div>
              <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Category Valuation</p>
                <p className="text-2xl font-black text-indigo-900 mt-1">{selectedCategoryModal.val}</p>
              </div>
            </div>

            {/* Mapped Item Names List */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped Items List:</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedCategoryModal.itemNames?.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                      📦 {item}
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                      LIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped Subcategories & Tiers:</p>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryModal.subs.map((s, i) => (
                  <span key={i} className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5">
                    📁 {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs font-black text-emerald-900">
              <span>Operational Status:</span>
              <span className="bg-emerald-600 text-white px-3 py-1 rounded-xl text-[10px] uppercase tracking-wider">
                Realtime Auto-Sync Enabled
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <a 
                href="/client?tab=inventory-master" 
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
              >
                View Mapped Items in Inventory ➔
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm space-y-8 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Traffic Evolution</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Real-time visitor counts</p>
            </div>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Live Updates</div>
          </div>
          <TrafficChart data={chartData} />
        </div>
        <div className="bg-white p-10 rounded-3xl border border-slate-200/60 shadow-sm space-y-8 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Peak Volume Distribution</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Chat requests by hour</p>
            </div>
            <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest">Static Mode</div>
          </div>
          <ActivityChart data={chartData} />
        </div>
      </div>

      <div className="bg-white p-12 rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden relative group min-w-0">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Command Center <span className="text-indigo-600 italic">Core Dynamics</span></h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-md leading-relaxed">Cross-referencing visitors, active conversations, and resolution rates in 24-hour window.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Chats</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Visitors</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Solved</span></div>
          </div>
        </div>
        <SnapshotChart data={snapshotData} />
      </div>

      <section className="bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_45%,#0f766e_100%)] rounded-[40px] border border-slate-900/20 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.8)] overflow-hidden text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.22),transparent_28%)]" />
        <div className="relative z-10 p-10 md:p-12 space-y-10">
          <div className="max-w-3xl space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">System Workflow</p>
            <h3 className="text-3xl font-black tracking-tight">Visitor to Ticket to CRM</h3>
            <p className="text-sm font-bold text-slate-200 leading-relaxed">
              This is the operating map for your team. Support issues become tickets, lead conversations move through CRM, and managers oversee the whole lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            {workflowStages.map((stage, index) => (
              <article
                key={stage.title}
                className="relative rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 min-h-[260px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stage.accent} flex items-center justify-center text-sm font-black shadow-2xl mb-5`}>
                  0{index + 1}
                </div>
                <div className="space-y-2 mb-5">
                  <h4 className="text-sm font-black uppercase tracking-tight">{stage.title}</h4>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 leading-relaxed">{stage.subtitle}</p>
                </div>
                <div className="space-y-3">
                  {stage.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.7)] mt-1.5 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-100 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
                {index < workflowStages.length - 1 ? (
                  <div className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 border border-white/10 items-center justify-center text-cyan-200 font-black">
                    ›
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-[28px] bg-white/6 border border-white/10 p-6 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-200">Support Route</p>
              <p className="text-sm font-black">Visitor chat {"->"} Agent {"->"} Ticket {"->"} Resolution</p>
              <p className="text-[11px] font-bold text-slate-300 leading-relaxed">Use this path for technical problems, complaints, follow-up issues, and anything that needs SLA tracking.</p>
            </div>
            <div className="rounded-[28px] bg-white/6 border border-white/10 p-6 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-200">Sales Route</p>
              <p className="text-sm font-black">Visitor chat {"->"} Sales {"->"} CRM stage {"->"} Customer</p>
              <p className="text-[11px] font-bold text-slate-300 leading-relaxed">Use this path for pricing, demos, qualification, opportunity tracking, and business follow-up.</p>
            </div>
            <div className="rounded-[28px] bg-white/6 border border-white/10 p-6 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-rose-200">Role Rule</p>
              <p className="text-sm font-black">Sales edits CRM. Agent works tickets. Manager supervises. Client oversees.</p>
              <p className="text-[11px] font-bold text-slate-300 leading-relaxed">This keeps support work and customer relationship work separate, which makes the whole system much easier to manage.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function ClientPage() {
  const { user } = useAuth();
  const { websites, selectedWebsiteId, setSelectedWebsiteId, selectedWebsite } = useWebsite() || {};
  const toast = useToast();
  const canUseTickets = user?.role === "admin" || user?.role === "client" || hasModule(user, "tickets");
  const canUseCRM = user?.role === "admin" || user?.role === "client" || hasModule(user, "crm");
  const canUseReports = user?.role === "admin" || user?.role === "client" || hasModule(user, "reports");
  const canUseSecurity = user?.role === "admin" || user?.role === "client" || hasModule(user, "security");
  const canUseShortcuts = user?.role === "admin" || user?.role === "client" || hasModule(user, "shortcuts");
  const isExpired = user?.subscription?.status === "expired" || user?.subscription?.status === "suspended";
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = user?.role === "tax_consultant" ? "tax-consultant-dashboard" : "overview";
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

  const userRole = String(user?.role || "").trim().toLowerCase();
  const isAdminUser = !userRole || userRole.includes("admin") || userRole === "superadmin" || userRole === "global_admin";

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
      { label: "VAT Compliance", href: "/admin?tab=vat-compliance" },
      { label: "Corporate Tax", href: "/admin?tab=corporate-tax" },
      { label: "Trade License", href: "/admin?tab=trade-license" },
      { label: "Compliance Reports", href: "/admin?tab=compliance-reports" },
      { label: "Risk Register", href: "/admin?tab=risk-register" },
      { label: "SLA & SLO Center", href: "/admin?tab=sla-center" },
      { label: "Observability Center", href: "/admin?tab=observability" },
      { label: "Load & Capacity Center", href: "/admin?tab=load-testing" },
      { label: "Release Center", href: "/admin?tab=release-management" },
      { label: "Developer Portal", href: "/admin?tab=developer-portal" },
      { label: "Product & Roadmap", href: "/admin?tab=product-management" },
      { label: "AI & Automation Center", href: "/admin?tab=ai-automation" },
      { label: "Compliance Governance", href: "/admin?tab=compliance-governance" },
      { label: "Mobile Center", href: "/admin?tab=mobile-readiness" },
      { label: "Integration Hub", href: "/admin?tab=enterprise-integrations" },
      { label: "Workflow Builder", href: "/admin?tab=workflow-builder" },
      { label: "App Marketplace", href: "/admin?tab=app-marketplace" },
      { label: "Low-Code Studio", href: "/admin?tab=lowcode-studio" },
      { label: "Custom Modules", href: "/admin?tab=custom-crm-modules" },
      { label: "Enterprise BI", href: "/admin?tab=enterprise-bi" },
      { label: "Multi-Org Center", href: "/admin?tab=multi-organization" },
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
      { label: "Flow Analytics", href: "/admin?tab=flow-analytics" },
      { label: "Historical Archive", href: "/admin?tab=history" },
      { label: "Security", href: "/admin?tab=security" },
      { label: "Help Center", href: "/admin?tab=help-center" },
      { label: "Subscriptions", href: "/admin?tab=subscriptions" },
      { label: "Role Master", href: "/admin?tab=roles" }
    ]
    : [
      { label: "Dashboard", href: "/client" },
      { label: "Websites", href: "/client?tab=websites" },
      { label: "Billing", href: "/client?tab=billing" },
    ];

  if (userRole === "tax_consultant") {
    menuItems.length = 0;
    menuItems.push({ label: "Dashboard", href: "/tax-consultant?tab=tax-consultant-dashboard" });
    menuItems.push({ label: "VAT Compliance", href: "/tax-consultant?tab=vat-compliance" });
    menuItems.push({ label: "Corporate Tax", href: "/tax-consultant?tab=corporate-tax" });
    menuItems.push({ label: "Trade License", href: "/tax-consultant?tab=trade-license" });
    menuItems.push({ label: "Compliance Reports", href: "/tax-consultant?tab=compliance-reports" });
    menuItems.push({ label: "CRM", href: "/tax-consultant?tab=crm" });
    menuItems.push({ label: "Customer Master", href: "/tax-consultant?tab=inventory-customer" });
  } else if (user?.role === "client") {
    menuItems.push({ label: "Agents", href: "/client?tab=agents" });
    menuItems.push({ label: "Chats", href: "/client?tab=chats" });
    menuItems.push({ label: "Tickets", href: "/client?tab=tickets" });
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
        { label: "Adjustment", href: "/client?tab=inventory-adjustment" }
      ]
    });
    menuItems.push({ label: "Customer Master", href: "/client?tab=inventory-customer" });
    menuItems.push({ label: "CRM", href: "/client?tab=crm" });
    menuItems.push({ label: "Flow Builder", href: "/client?tab=flow-builder" });
    menuItems.push({ label: "AI Voice Logs", href: "/client?tab=voice-logs" });
    menuItems.push({ label: "Departments", href: "/client?tab=departments" });
    menuItems.push({ label: "Categories", href: "/client?tab=categories" });
    menuItems.push({ label: "Shortcuts", href: "/client?tab=shortcuts" });
    menuItems.push({ label: "Reports", href: "/client?tab=reports" });
    menuItems.push({ label: "History", href: "/client?tab=history" });
    menuItems.push({ label: "Security", href: "/client?tab=security" });
    menuItems.push({ label: "Role Master", href: "/client?tab=roles" });
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


  let content = <ClientOverview analytics={analytics} queuedSessions={queuedSessions} isExpired={isExpired} stripeCustomerId={user?.stripeCustomerId} procurementStats={procurementStats} />;
  let title = user?.role === "admin" ? "Admin Command Center" : "Master Overview";
  let subtitle = user?.role === "admin" ? "Global ecosystem intelligence and control" : "Real-time operations dashboard";

  if (tab === "chats") {
    title = "Conversation Hub";
    subtitle = "Manage real-time agent interactions";
    content = <ConversationHub socket={socket} initialSessions={sessions} websiteId={selectedWebsiteId} currentUser={user} />;
  }

  if (tab === "flow-analytics") {
    title = "Executive Flow Analytics";
    subtitle = "Aggregated funnel performance, conversion tracking, and drop-off hotspots";
    content = <ExecutiveFlowDashboard websiteId={selectedWebsiteId} />;
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
    title = "Inventory VAT Master";
    subtitle = "Manage UAE FTA VAT rates, 5% standard rate, zero rated, and exempt slabs";
    content = <InventoryManager websiteId={selectedWebsiteId} activeTab="inventory-vat" />;
  }

  if (tab === "tax-consultant-dashboard") {
    title = "Tax Consultant Command Center";
    subtitle = "Clean, task-oriented daily client follow-ups and compliance management";
    content = (
      <div className="space-y-8">
        <TaxConsultantDashboard websiteId={selectedWebsiteId} />
        {(userRole === "admin" || userRole === "manager") && <AdminOverdueFollowupsCard />}
      </div>
    );
  }

  if (tab === "crm") {
    title = "CRM Master Console";
    subtitle = "Strategic customer relationship management and intelligence";
    content = (
      <div className="space-y-8">
        {(userRole === "admin" || userRole === "manager") && <AdminOverdueFollowupsCard />}
        <CRMManager websiteId={selectedWebsiteId} />
      </div>
    );
  }

  if (tab === "inventory-customer") {
    title = "Customer Master Registry";
    subtitle = "Global management of purchase accounts and customer profiles";
    content = <CustomerManager websiteId={selectedWebsiteId} />;
  }

  const isComplianceEnabled = !selectedWebsite || !Array.isArray(selectedWebsite.enabledModules) || selectedWebsite.enabledModules.includes("compliance");

  if (!isComplianceEnabled && (tab === "vat-compliance" || tab === "corporate-tax" || tab === "trade-license" || tab === "compliance-reports" || tab === "tax-consultant-dashboard" || tab === "inventory-vat" || tab === "inventory-tax")) {
    title = "Tax & Compliance Not Enabled";
    subtitle = "UAE Tax & Compliance suite is currently disabled for this domain";
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
  } else {
    if (tab === "vat-compliance") {
      title = "VAT Compliance Management";
      subtitle = "Track and process monthly and quarterly VAT return filings";
      content = <VatFilingDashboard websiteId={selectedWebsiteId} />;
    }

    if (tab === "corporate-tax") {
      title = "Corporate Tax Compliance";
      subtitle = "Monitor Corporate Tax filing deadlines and live countdown timers";
      content = <CorporateTaxDashboard websiteId={selectedWebsiteId} />;
    }

    if (tab === "trade-license") {
      title = "Trade License Renewal Hub";
      subtitle = "5-tier color-coded alert bucket monitoring to prevent state DED fines";
      content = <TradeLicenseDashboard websiteId={selectedWebsiteId} />;
    }

    if (tab === "compliance-reports") {
      title = "Compliance Reports Hub";
      subtitle = "Export PDF, Excel, and CSV compliance intelligence reports";
      content = <ComplianceReportsHub websiteId={selectedWebsiteId} />;
    }
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

  if (tab === "load-testing") {
    title = "Load Testing & Capacity Planning Center";
    subtitle = "Synthetic In-App Micro-Benchmarks, Stress Simulations & Infrastructure Scaling Recommendations";
    content = <LoadTestCenter />;
  }

  if (tab === "release-management") {
    title = "Production Readiness & Release Management Center";
    subtitle = "Go-Live Pre-Flight Checklists, Multi-Stage Approval Workflows, Smoke Testing & Rollback Safety Controls";
    content = <ReleaseManagementCenter />;
  }

  if (tab === "developer-portal") {
    title = "Developer Portal & Engineering Hub";
    subtitle = "API Reference, Mongoose Schemas Explorer, Code Standards & Engineering Telemetry";
    content = <DeveloperPortalCenter />;
  }

  if (tab === "product-management") {
    title = "Product Management & Strategic Roadmap Center";
    subtitle = "Vision Milestones, Feature Backlog Kanban, Voting Portal & Feature Flag Control Center";
    content = <ProductManagementCenter />;
  }

  if (tab === "ai-automation") {
    title = "AI Readiness, Automation & Knowledge Center";
    subtitle = "Provider Abstraction Layer, Prompt Library, Workflow Rule Engine & Document Intelligence Interfaces";
    content = <AiAutomationCenter />;
  }

  if (tab === "compliance-governance") {
    title = "Enterprise Compliance & Governance Center";
    subtitle = "Global Compliance Frameworks (GDPR, UAE PDPL, SOC 2, ISO 27001), DSAR Data Subject Portal & Retention Rules";
    content = <ComplianceGovernanceCenter />;
  }

  if (tab === "mobile-readiness") {
    title = "Mobile Readiness & PWA Architecture Center";
    subtitle = "Progressive Web App (PWA), Offline Caching & Sync Queue, Biometrics & Native Hardware Hooks";
    content = <MobileReadinessCenter />;
  }

  if (tab === "enterprise-integrations") {
    title = "Enterprise Integration Hub & Connector Catalog";
    subtitle = "Third-Party SaaS Connectors, OAuth 2.0 Management, Inbound/Outbound Webhooks & ERP Architecture";
    content = <EnterpriseIntegrationCenter />;
  }

  if (tab === "workflow-builder") {
    title = "No-Code Workflow & Automation Builder";
    subtitle = "Visual Drag-and-Drop Canvas, Event Triggers, Condition Nodes & Multi-Channel Action Handlers";
    content = <NoCodeWorkflowCenter />;
  }

  if (tab === "app-marketplace") {
    title = "Enterprise App Marketplace & Plugin Architecture";
    subtitle = "Sandboxed Extension SDK, Plugin Engine Lifecycle & Marketplace Ecosystem";
    content = <AppMarketplaceCenter />;
  }

  if (tab === "lowcode-studio") {
    title = "Low-Code Visual Studio & Layout Builder";
    subtitle = "Drag & Drop Form Builder, Dashboard Creator, Component Palette & Live Multi-Device Viewport";
    content = <LowCodeStudioCenter />;
  }

  if (tab === "custom-crm-modules") {
    title = "Custom CRM Module & REST API Code Generator";
    subtitle = "Build Custom Tables, Auto-Generate REST APIs, Role-Based Access Control & Navigation Items";
    content = <CustomCrmModuleCenter />;
  }

  if (tab === "enterprise-bi") {
    title = "Enterprise Business Intelligence & Executive Cockpit";
    subtitle = "Revenue Forecasting, Cohort Analysis, Heatmaps, Sales Funnel & Scheduled Executive Digests";
    content = <EnterpriseBiCenter />;
  }

  if (tab === "multi-organization") {
    title = "Multi-Organization & Holding Group Platform";
    subtitle = "Holding Companies, Regional Subsidiaries, Shared Resource Policies & Consolidated Billing";
    content = <MultiOrganizationCenter />;
  }

  if (tab === "mission-control") {
    title = "Enterprise Mission Control Center";
    subtitle = "Master System Telemetry, Real-Time Service Health, Live Command Palette & Executive AI Insights";
    content = <MissionControlCenter />;
  }

  if (tab === "security") {
    title = "Security Center";
    subtitle = "Two-factor authentication, audit logs, and webhook delivery visibility";
    content = <SecurityCenter />;
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

  if (user?.role !== "admin") {
    if ((tab === "tickets" || tab === "departments" || tab === "categories") && !canUseTickets) {
      title = "Plan Upgrade Required";
      subtitle = "Your current package does not include the ticket workspace";
      content = (
        <div className="rounded-[40px] border border-amber-100 bg-amber-50 p-12 text-center">
          <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Standard plan required</h3>
          <p className="mt-3 text-sm font-bold text-amber-700">Upgrade from Basic to Standard or Pro to unlock tickets, departments, and categories.</p>
        </div>
      );
    }

    if (tab === "crm" && !canUseCRM) {
      title = "Plan Upgrade Required";
      subtitle = "Your current package does not include CRM";
      content = (
        <div className="rounded-[40px] border border-emerald-100 bg-emerald-50 p-12 text-center">
          <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Pro plan required</h3>
          <p className="mt-3 text-sm font-bold text-emerald-700">Upgrade to Pro to unlock CRM, lead pipeline, follow-up tasks, and sales workflow.</p>
        </div>
      );
    }

    if ((tab === "reports" || tab === "analytics") && !canUseReports) {
      title = "Plan Upgrade Required";
      subtitle = "Your current package does not include reports";
      content = (
        <div className="rounded-[40px] border border-sky-100 bg-sky-50 p-12 text-center">
          <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight">Reporting not included</h3>
          <p className="mt-3 text-sm font-bold text-sky-700">Upgrade to Standard or Pro to unlock reports and analytics exports.</p>
        </div>
      );
    }

    if (tab === "security" && !canUseSecurity) {
      title = "Plan Upgrade Required";
      subtitle = "Your current package does not include the full security center";
      content = (
        <div className="rounded-[40px] border border-violet-100 bg-violet-50 p-12 text-center">
          <h3 className="text-lg font-black text-violet-900 uppercase tracking-tight">Security add-on required</h3>
          <p className="mt-3 text-sm font-bold text-violet-700">Enable the security package to access audit logs and advanced protection tools.</p>
        </div>
      );
    }
  }

  // Handle other tabs generically for now
  if (!["overview", "tax-consultant-dashboard", "chats", "websites", "agents", "clients", "reports", "tickets", "shortcuts", "history", "categories", "departments", "crm", "security", "billing", "subscriptions", "roles", "inventory-customer", "flow-analytics", "flow-builder", "flows", "voice-logs", "voice-calls", "help-center", "inventory", "inventory-master", "inventory-stock-in", "inventory-stock-out", "inventory-adjustment", "inventory-history", "inventory-category", "inventory-subcategory", "inventory-brand", "inventory-size", "inventory-color", "inventory-unit", "inventory-supplier", "inventory-vat", "inventory-tax", "vat-compliance", "corporate-tax", "trade-license", "compliance-reports", "risk-register", "financial-analytics", "sla-center", "observability", "load-testing", "release-management", "developer-portal", "product-management", "ai-automation", "compliance-governance", "mobile-readiness", "enterprise-integrations", "workflow-builder", "app-marketplace", "lowcode-studio", "custom-crm-modules", "enterprise-bi", "multi-organization", "mission-control"].includes(tab)) {
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
      {content}
    </Layout>
  );
}
