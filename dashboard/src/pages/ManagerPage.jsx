import React, { useState, useEffect } from "react";
import ConversationHub from "../components/ConversationHub.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { X, MessageSquare, Globe, Users, Ticket, TrendingUp, Package, AlertTriangle, Clock, ArrowUpRight, ShieldCheck, CheckCircle2, Activity, UserCheck, RefreshCw, Search } from "lucide-react";
import Layout from "../components/Layout.jsx";
import StatCard from "../components/StatCard.jsx";
import CRMManager from "../components/CRMManager.jsx";
import TicketManager from "../components/TicketManager.jsx";
import PaginationControls from "../components/PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasModule } from "../utils/planAccess.js";
import ManagerCrmReports from "../components/ManagerCrmReports.jsx";
import CustomerManager from "../components/CustomerManager.jsx";
import InventoryManager from "../components/InventoryManager.jsx";
import PurchaseProcurementTab from "../components/PurchaseProcurementTab.jsx";
import EnterpriseReportsCenter from "../components/EnterpriseReportsCenter.jsx";
import CrmInvoicesView from "../components/CrmSystem/CrmInvoicesView.jsx";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";

import { useWebsite } from "../context/WebsiteContext.jsx";

export default function ManagerPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const { websites, selectedWebsiteId, setSelectedWebsiteId } = useWebsite();
  const [analytics, setAnalytics] = useState(null);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [streamsPage, setStreamsPage] = useState(1);
  const [websitesPage, setWebsitesPage] = useState(1);
  const [agentsPage, setAgentsPage] = useState(1);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("all");
  const [teamStatusFilter, setTeamStatusFilter] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [reportRange, setReportRange] = useState({ preset: "7d" });
  const [lastSynced, setLastSynced] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const canUseTickets = hasModule(user, "tickets");
  const canUseCRM = hasModule(user, "crm");
  const canUseReports = hasModule(user, "reports");

  async function load(filters = {}) {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      const activeWebsite = filters.websiteId || selectedWebsiteId;
      if (activeWebsite) params.set("websiteId", activeWebsite);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const sessionParams = activeWebsite ? `?websiteId=${activeWebsite}` : "";
      const [analyticsData, agentData, sessionData] = await Promise.all([
        api(`/api/analytics?${params.toString()}`),
        api(`/api/users/agents${sessionParams}`),
        api(`/api/chat/sessions${sessionParams}`)
      ]);
      setAnalytics(analyticsData);
      const rawAgents = Array.isArray(agentData) ? agentData : (agentData?.agents || agentData?.users || []);
      const filteredAgents = activeWebsite
        ? rawAgents.filter((a) => !a.websiteIds?.length || a.websiteIds.some((w) => String(w?._id || w) === String(activeWebsite)))
        : rawAgents;
      setAgents(filteredAgents);
      setSessions(Array.isArray(sessionData) ? sessionData : (sessionData?.sessions || []));
      setLastSynced(new Date());
    } catch (err) {
      console.error("Failed to load manager data:", err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load({
      websiteId: selectedWebsiteId,
      startDate: reportRange.startDate,
      endDate: reportRange.endDate
    });
  }, [selectedWebsiteId, reportRange.startDate, reportRange.endDate]);

  const menuItems = [
    { label: "Overview", href: "/manager" },
    ...(hasPermission(user, PERMISSIONS.CHAT_VIEW) ? [{ label: "Chats", href: "/manager?tab=chats" }] : []),
  ];

  if (hasPermission(user, PERMISSIONS.CRM_VIEW) && canUseCRM) {
    menuItems.push({ label: "CRM", href: "/manager?tab=crm" });
  }

  if (hasPermission(user, PERMISSIONS.TEAM_VIEW)) {
    menuItems.push({ label: "My Team", href: "/manager?tab=team" });
  }

  if (hasPermission(user, PERMISSIONS.REPORTS_VIEW) && canUseReports) {
    menuItems.push({ label: "Reports", href: "/manager?tab=reports" });
  }

  if (hasPermission(user, PERMISSIONS.TICKET_VIEW)) {
    menuItems.push({ label: "Tickets", href: "/manager?tab=tickets" });
  }

  if (hasPermission(user, PERMISSIONS.INVENTORY_VIEW)) {
    menuItems.push({ label: "Inventory", href: "/manager?tab=inventory" });
  }

  if (hasPermission(user, PERMISSIONS.PURCHASE_MANAGE) || hasPermission(user, PERMISSIONS.PURCHASE_VIEW)) {
    menuItems.push({ label: "Procurement", href: "/manager?tab=procurement" });
  }

  if (hasPermission(user, PERMISSIONS.INVOICE_VIEW) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE)) {
    menuItems.push({ label: "Invoices", href: "/manager?tab=invoices" });
  }

  if (canUseCRM && hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    menuItems.push({ label: "Customer Master", href: "/manager?tab=customer-master" });
  }

  if ((tab === "crm" || tab === "customer-master") && !canUseCRM) {
    return (
      <Layout menuItems={menuItems} title="Plan Upgrade Required" subtitle="CRM is available on Pro only">
        <div className="rounded-[40px] border border-emerald-100 bg-emerald-50 p-12 text-center">
          <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Pro plan required</h3>
          <p className="mt-3 text-sm font-bold text-emerald-700">Upgrade this client to Pro to unlock CRM supervision for managers.</p>
        </div>
      </Layout>
    );
  }

  /* ── CRM Tab ── */
  if (tab === "crm") {
    return (
      <Layout
        menuItems={menuItems}
        title="CRM Master Console"
        subtitle="Strategic customer relationship intelligence"
      >
        <CRMManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (tab === "customer-master") {
    return (
      <Layout
        menuItems={menuItems}
        title="Customer Master Registry"
        subtitle="Global management of customer profiles and accounts"
      >
        <CustomerManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  /* ── Chats Tab ── */
  if (tab === "chats") {
    return (
      <Layout
        menuItems={menuItems}
        title="Live Conversation Hub"
        subtitle="Real-time oversight and handling of visitor chats"
      >
        <ConversationHub
          socket={socket}
          initialSessions={sessions}
          websiteId={selectedWebsiteId}
          userRole={user?.role || "manager"}
          currentUser={user}
        />
      </Layout>
    );
  }

  /* ── Tickets Tab ── */
  if (tab === "tickets") {
    return (
      <Layout
        menuItems={menuItems}
        title="Ticket Management"
        subtitle="Oversight of all support inquiries and live sessions"
      >
        <TicketManager isAdmin={false} websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  /* ── Inventory Tab ── */
  if (tab === "inventory") {
    return (
      <Layout
        menuItems={menuItems}
        title="Inventory Registry"
        subtitle="Manage SKU levels and stock movements"
      >
        <InventoryManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  /* ── Procurement Tab ── */
  if (tab === "procurement") {
    return (
      <Layout
        menuItems={menuItems}
        title="Procurement Workspace"
        subtitle="Supplier relationships and purchase orders"
      >
        <PurchaseProcurementTab websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (tab === "invoices") {
    return (
      <Layout
        menuItems={menuItems}
        title="Invoice Management"
        subtitle="Create, edit, delete and manage customer invoices"
      >
        <CrmInvoicesView websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  /* ── Live Streams Tab (Legacy / Redirect) ── */
  if (tab === "streams") {
    const paginatedSessions = getPaginationMeta(sessions, streamsPage);
    return (
      <Layout
        menuItems={menuItems}
        title="Live Stream Monitor"
        subtitle="Real-time oversight of all concurrent visitor sessions"
      >
        <section className="premium-card p-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <h3 className="heading-md">Active Sessions</h3>
            <p className="small-label opacity-60 mt-1">Monitoring {sessions.length} total sessions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-5 small-label">Website</th>
                  <th className="px-10 py-5 small-label">Visitor</th>
                  <th className="px-10 py-5 small-label">Status</th>
                  <th className="px-10 py-5 small-label">Assigned Agent</th>
                  <th className="px-10 py-5 small-label">CRN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-16 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      No active sessions right now
                    </td>
                  </tr>
                ) : paginatedSessions.pageItems.map((session) => (
                  <tr key={session._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-5 text-xs font-black text-slate-900 uppercase tracking-tight">
                      {session.websiteId?.websiteName}
                    </td>
                    <td className="px-10 py-5 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                      {session.visitorId?.visitorId}
                    </td>
                    <td className="px-10 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${session.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        session.status === "queued" ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black shadow-sm shadow-indigo-200">
                          {session.assignedAgent?.name?.[0] || "Q"}
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                          {session.assignedAgent?.name || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      {session.crn ? (
                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded tracking-widest">
                          {session.crn}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-slate-50 bg-white">
            <PaginationControls
              currentPage={paginatedSessions.currentPage}
              totalPages={paginatedSessions.totalPages}
              totalItems={paginatedSessions.totalItems}
              itemLabel="sessions"
              onPageChange={setStreamsPage}
            />
          </div>
        </section>
      </Layout>
    );
  }

  const agentDrawer = selectedAgent && createPortal(
    <>
      <div
        className="fixed inset-0 bg-slate-950/20 z-99"
        onClick={() => setSelectedAgent(null)}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-full md:w-120 bg-white border-l border-slate-200 z-100 shadow-[0_0_40px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-right-full duration-300 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between bg-linear-to-r from-slate-50/90 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-base shadow-md shrink-0">
              {selectedAgent.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1 truncate">{selectedAgent.name}</h3>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate">{selectedAgent.role}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedAgent(null)}
            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <section>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Profile Details</p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Email Address</p>
                <p className="text-[11px] font-bold text-slate-900 truncate" title={selectedAgent.email}>{selectedAgent.email}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Department</p>
                <p className="text-[11px] font-bold text-slate-900 capitalize truncate">{selectedAgent.department || "General Support"}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Current Status</p>
                  <p className="text-[11px] font-bold text-slate-900">{selectedAgent.isOnline ? "Online & Active" : "Offline"}</p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${selectedAgent.isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`} />
              </div>
            </div>
          </section>

          <section>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Live Workload</p>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-indigo-500 flex items-center justify-center shadow-sm shrink-0">
                <MessageSquare size={16} />
              </div>
              <div>
                <p className="text-lg font-black text-indigo-600 leading-none">{selectedAgent.activeChats || 0}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-indigo-400 mt-1">Active Chats Handled</p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Assigned Routing Domains</p>
            <div className="space-y-2">
              {(!selectedAgent.websiteIds || selectedAgent.websiteIds.length === 0) ? (
                <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-4 rounded-xl border border-dashed border-slate-200 text-center uppercase tracking-wider">No domains assigned.</p>
              ) : selectedAgent.websiteIds.map((website) => (
                <div key={website._id || website} className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">
                    <Globe size={13} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{website.websiteName || website.domain || website}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>,
    document.body
  );

  /* ── My Team Tab ── */
  if (tab === "team") {
    const teamRoles = Array.from(new Set(agents.map(a => a.role).filter(Boolean))).sort();
    const filteredTeam = agents.filter((a) => {
      if (teamRoleFilter !== "all" && a.role !== teamRoleFilter) return false;
      if (teamStatusFilter === "online" && !a.isOnline) return false;
      if (teamStatusFilter === "offline" && a.isOnline) return false;
      if (teamSearch.trim()) {
        const q = teamSearch.toLowerCase();
        if (!a.name?.toLowerCase().includes(q) && !a.email?.toLowerCase().includes(q) && !a.role?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
    const paginatedAgents = getPaginationMeta(filteredTeam, agentsPage);
    return (
      <>
        <Layout
          menuItems={menuItems}
          title="My Team"
          subtitle="Manage and monitor your team members"
        >
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Personnel Roster</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                  Showing {filteredTeam.length} of {agents.length} active support personnel
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={teamSearch}
                    onChange={(e) => { setTeamSearch(e.target.value); setAgentsPage(1); }}
                    placeholder="Search name, email..."
                    className="pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 w-44"
                  />
                </div>
                <select
                  value={teamRoleFilter}
                  onChange={(e) => { setTeamRoleFilter(e.target.value); setAgentsPage(1); }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Roles</option>
                  {teamRoles.map((r) => (
                    <option key={r} value={r}>{r.toUpperCase()}</option>
                  ))}
                </select>
                <select
                  value={teamStatusFilter}
                  onChange={(e) => { setTeamStatusFilter(e.target.value); setAgentsPage(1); }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
                <button
                  onClick={() => load()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredTeam.length === 0 ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-8 text-center">No personnel matching filters.</p>
              ) : paginatedAgents.pageItems.map((agent) => (
                <div key={agent._id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                      {agent.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{agent.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{agent.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 justify-end">
                    <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg uppercase tracking-wider hidden sm:inline-block">{agent.role}</span>
                    <div className={`w-2 h-2 shrink-0 rounded-full ${agent.isOnline ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`} title={agent.isOnline ? "Online" : "Offline"} />
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="px-2.5 py-1 text-[9px] font-black tracking-wider uppercase border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white rounded-lg transition-all"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <PaginationControls
                currentPage={paginatedAgents.currentPage}
                totalPages={paginatedAgents.totalPages}
                totalItems={paginatedAgents.totalItems}
                itemLabel="personnel"
                onPageChange={setAgentsPage}
              />
            </div>
          </section>
        </Layout>
        {agentDrawer}
      </>
    );
  }

  /* ── Reports Tab ── */
  if (tab === "reports") {
    if (!canUseReports) {
      return (
        <Layout menuItems={menuItems} title="Plan Upgrade Required" subtitle="Reports are available on higher plans">
          <div className="rounded-[40px] border border-sky-100 bg-sky-50 p-12 text-center">
            <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight">Reporting not included</h3>
            <p className="mt-3 text-sm font-bold text-sky-700">Upgrade this client plan to unlock manager reporting and performance analytics.</p>
          </div>
        </Layout>
      );
    }
    return (
      <Layout
        menuItems={menuItems}
        title="Reports"
        subtitle="Comprehensive operational intelligence"
      >
        <div className="space-y-4">
          <EnterpriseReportsCenter />
        </div>
      </Layout>
    );
  }

  /* ── Overview Tab (Executive Operations Command Center) ── */
  const satisfactionRate = analytics?.feedback?.satisfactionRate ?? 0;
  const avgResponseTimeSec = analytics?.sla?.avgResponseTimeSeconds ?? 0;
  const leaderboardData = analytics?.leaderboard || [];
  const teamPersonnel = agents.filter(a => a.role !== "user" && a.role !== "customer");
  const onlineAgentsCount = teamPersonnel.filter(a => a.isOnline).length;
  const offlineAgentsCount = teamPersonnel.length - onlineAgentsCount;
  const unassignedQueueCount = sessions.filter(s => !s.assignedAgent && s.status !== "closed").length;
  const liveActiveSessionsCount = sessions.filter(s => s.status === "active").length;
  const openTicketsCount = analytics?.totals?.openTickets ?? 0;

  const applyRangePreset = (preset) => {
    const now = new Date();
    const start = new Date(now);
    if (preset === "today") start.setHours(0, 0, 0, 0);
    else if (preset === "30d") start.setDate(now.getDate() - 30);
    else start.setDate(now.getDate() - 7);
    setReportRange({ preset, startDate: start.toISOString(), endDate: now.toISOString() });
  };

  return (
    <>
      <Layout
        menuItems={menuItems}
        title="Manager Command Center"
        subtitle="Operational oversight, team workload supervision, and SLA performance intelligence"
      >
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* 0. Compact Range & Sync Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200/80 px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Operations Scope</span>
              {unassignedQueueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchParams({ tab: "chats" })}
                  className="ml-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  {unassignedQueueCount} Unassigned Waiting &rarr;
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                {[
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7D" },
                  { id: "30d", label: "30D" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyRangePreset(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${(reportRange.preset || "7d") === opt.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => load({ websiteId: selectedWebsiteId, startDate: reportRange.startDate, endDate: reportRange.endDate })}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
                title="Refresh Overview"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* 1. Top Executive KPI Stat Cards (6 Cards) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              onClick={() => hasPermission(user, PERMISSIONS.TEAM_VIEW) && setSearchParams({ tab: "team" })}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Team Online Roster</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{teamPersonnel.length} Personnel</h4>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                  {onlineAgentsCount} Online | {offlineAgentsCount} Offline
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
            </div>

            <div
              onClick={() => hasPermission(user, PERMISSIONS.TICKET_VIEW) && setSearchParams({ tab: "tickets" })}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Support Desk Health</p>
                <h4 className="text-xl font-black text-emerald-600 mt-0.5">{analytics?.totals?.resolvedTickets ?? 0} Resolved</h4>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                  {openTicketsCount} Open / Pending Tickets
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Ticket size={18} />
              </div>
            </div>

            <div
              onClick={() => hasPermission(user, PERMISSIONS.CHAT_VIEW) && setSearchParams({ tab: "chats" })}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-200 transition-all flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Live Chat Operations</p>
                <h4 className="text-xl font-black text-indigo-600 mt-0.5">{liveActiveSessionsCount} Active Chats</h4>
                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                  {sessions.length} Total &middot; {unassignedQueueCount} Unassigned
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <MessageSquare size={18} />
              </div>
            </div>

            <div
              onClick={() => hasPermission(user, PERMISSIONS.REPORTS_VIEW) && canUseReports && setSearchParams({ tab: "reports" })}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between cursor-pointer"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CSAT Satisfaction Score</p>
                <h4 className="text-xl font-black text-emerald-600 mt-0.5">{satisfactionRate}% CSAT</h4>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                  {analytics?.feedback?.satisfiedChats ?? 0} Positive Reviews
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">First Response Time (FRT)</p>
                <h4 className="text-xl font-black text-slate-900 mt-0.5">{avgResponseTimeSec}s Avg Speed</h4>
                <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                  SLA Speed Target &lt;60s
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Managed Websites</p>
                <h4 className="text-xl font-black text-purple-600 mt-0.5">{websites.length} Domains</h4>
                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1.5">
                  Ecosystem Operational Scope
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Globe size={18} />
              </div>
            </div>
          </section>

          {/* 2. Team Roster Supervision & Workload Table */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Team Workload Supervision</h3>
                  <p className="text-[10px] font-medium text-slate-400">Live agent status, active assignments & quick inspection</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => load()}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                    title="Refresh Overview"
                  >
                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => setSearchParams({ tab: "team" })}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-1"
                  >
                    Full Roster <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Personnel Member</th>
                      <th className="pb-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="pb-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Workload</th>
                      <th className="pb-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Rating</th>
                      <th className="pb-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Live Status</th>
                      <th className="pb-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamPersonnel.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[11px] font-bold text-slate-400">No personnel members assigned yet.</td>
                      </tr>
                    ) : teamPersonnel.slice(0, 6).map((agent) => (
                      <tr key={agent._id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shadow-sm shrink-0">
                              {agent.name?.[0]?.toUpperCase() || "A"}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase">{agent.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{agent.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-black uppercase tracking-wider border border-slate-200">
                            {agent.role}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-black text-slate-800">
                            {agent.activeChats || 0} / {agent.maxWorkload || 5}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {agent.ratingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70 text-[9px] font-black">
                              &#9733; {agent.avgRating} ({agent.ratingCount})
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${agent.isOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${agent.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
                            {agent.isOnline ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedAgent(agent)}
                            className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 rounded-lg text-[9px] font-black uppercase transition-all"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Team Leaderboard & Top Performers */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Top Performance Leaderboard</h3>
                    <p className="text-[10px] font-medium text-slate-400">Agent resolution volume & efficiency</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {leaderboardData.length === 0 ? (
                    <div className="py-6 text-center text-[11px] font-bold text-slate-400">
                      Leaderboard data populating on resolution activity.
                    </div>
                  ) : leaderboardData.slice(0, 4).map((member, index) => (
                    <div key={member._id || index} className="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shadow-sm ${index === 0 ? "bg-amber-400 text-amber-950" : index === 1 ? "bg-slate-300 text-slate-800" : "bg-orange-300 text-orange-950"
                          }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase">{member.name}</p>
                          <p className="text-[9px] font-semibold text-slate-400">{member.chatsHandled || 0} Resolved Sessions</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">
                        {index === 0 ? "Top Performer" : `#${index + 1} Active`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Queue & SLA Watch (Fills right column cleanly) */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Queue &amp; SLA Watch</h4>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${unassignedQueueCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                      {unassignedQueueCount > 0 ? "Needs Attention" : "Queue Clear"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSearchParams({ tab: "chats" })}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Unassigned Chats</span>
                      <span className="text-sm font-black text-slate-900">{unassignedQueueCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ tab: "tickets" })}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 text-left transition-colors cursor-pointer"
                    >
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Open Tickets</span>
                      <span className="text-sm font-black text-slate-900">{openTicketsCount}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" /> Oversight Active
                </span>
                <span>{lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live"}</span>
              </div>
            </div>
          </section>

          {/* 4. Supervised Workspaces Shortcuts */}
          <section className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className="mb-3 pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Supervised Workspace Modules</h3>
              <p className="text-[10px] font-medium text-slate-400">Direct navigation to active operational centers</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hasPermission(user, PERMISSIONS.CRM_VIEW) && (
                <button
                  onClick={() => setSearchParams({ tab: "crm" })}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">CRM & Deals</p>
                      <p className="text-[9px] font-medium text-slate-400">Pipeline Supervision</p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              )}

              {hasPermission(user, PERMISSIONS.TICKET_VIEW) && (
                <button
                  onClick={() => setSearchParams({ tab: "tickets" })}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-sky-600">
                      <Ticket size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">Ticket Nexus</p>
                      <p className="text-[9px] font-medium text-slate-400">Support Inquiries & SLAs</p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              )}

              {hasPermission(user, PERMISSIONS.CRM_VIEW) && (
                <button
                  onClick={() => setSearchParams({ tab: "inventory" })}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-rose-600">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">Inventory & POs</p>
                      <p className="text-[9px] font-medium text-slate-400">Stock SKUs & Orders</p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              )}

              {hasPermission(user, PERMISSIONS.REPORTS_VIEW) && (
                <button
                  onClick={() => setSearchParams({ tab: "reports" })}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-xl flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                      <Activity size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">BI & Analytics</p>
                      <p className="text-[9px] font-medium text-slate-400">Enterprise Reports</p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              )}
            </div>
          </section>
        </div>
      </Layout>
      {agentDrawer}
    </>
  );
}
