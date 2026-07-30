import React, { useState, useEffect } from "react";
import ConversationHub from "../components/ConversationHub.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { X, MessageSquare, Globe, Users, Ticket, TrendingUp, Package, AlertTriangle, Clock, ArrowUpRight, ShieldCheck, CheckCircle2, Activity, UserCheck } from "lucide-react";
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
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [reportRange, setReportRange] = useState({ preset: "7d" });
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const canUseTickets = hasModule(user, "tickets");
  const canUseCRM = hasModule(user, "crm");
  const canUseReports = hasModule(user, "reports");

  async function load(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.websiteId || selectedWebsiteId) params.set("websiteId", filters.websiteId || selectedWebsiteId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const [analyticsData, agentData, sessionData] = await Promise.all([
        api(`/api/analytics?${params.toString()}`),
        api("/api/users/agents"),
        api("/api/chat/sessions")
      ]);
      setAnalytics(analyticsData);
      setAgents(agentData);
      setSessions(sessionData);
    } catch (err) {
      console.error("Failed to load manager data:", err);
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

  if (hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    menuItems.push({ label: "Inventory", href: "/manager?tab=inventory" });
    menuItems.push({ label: "Procurement", href: "/manager?tab=procurement" });
    menuItems.push({ label: "Customer Master", href: "/manager?tab=customer-master" });
  }

  if (tab === "crm" && !canUseCRM) {
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

  /* ── My Team Tab ── */
  if (tab === "team") {
    const paginatedAgents = getPaginationMeta(agents, agentsPage);
    return (
      <>
        <Layout
          menuItems={menuItems}
          title="My Team"
          subtitle="Manage and monitor your team members"
        >
          <section className="premium-card p-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30 w-full flex items-center justify-between">
              <div>
                <h3 className="heading-md">Personnel Roster</h3>
                <p className="small-label opacity-60 mt-1">View active support personnel under your oversight</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {agents.length === 0 ? (
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest py-10 text-center">No personnel assigned yet.</p>
              ) : paginatedAgents.pageItems.map((agent) => (
                <div key={agent._id} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-200">
                      {agent.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{agent.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{agent.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 min-w-30 justify-end">
                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-widest hidden sm:inline-block">{agent.role}</span>
                    <div className={`w-2 h-2 shrink-0 rounded-full ${agent.isOnline ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`} title={agent.isOnline ? "Online" : "Offline"} />
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="ml-2 px-3 py-1.5 text-[9px] font-black tracking-widest uppercase border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white rounded-xl transition-all shadow-sm"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-8 pb-8">
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

        {/* ── Agent Details Drawer ── */}
        {selectedAgent && createPortal(
          <>
            <div
              className="fixed inset-0 bg-slate-950/20 z-99"
              onClick={() => setSelectedAgent(null)}
            />
            <div className="fixed inset-y-0 right-0 w-full max-w-full md:w-120 bg-white border-l border-slate-200 z-100 shadow-[0_0_40px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-right-full duration-400 flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-linear-to-r from-slate-50/90 to-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200 shrink-0">
                    {selectedAgent.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1 truncate">{selectedAgent.name}</h3>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate">{selectedAgent.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                {/* Profile Details */}
                <section>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">🔹 Profile Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2 sm:col-span-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Email Address</p>
                      <p className="text-xs font-bold text-slate-900 truncate" title={selectedAgent.email}>{selectedAgent.email}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2 sm:col-span-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Department</p>
                      <p className="text-xs font-bold text-slate-900 capitalize truncate">{selectedAgent.department || "General Support"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Status</p>
                        <p className="text-xs font-bold text-slate-900">{selectedAgent.isOnline ? "Online & Active" : "Offline"}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${selectedAgent.isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"}`} />
                    </div>
                  </div>
                </section>

                {/* Workload */}
                <section>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">🔹 Live Workload</p>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white text-indigo-500 flex items-center justify-center shadow-sm shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="text-xl font-black text-indigo-600 leading-none">{selectedAgent.activeChats || 0}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-1">Active Chats Handled</p>
                    </div>
                  </div>
                </section>

                {/* Assigned Websites */}
                <section>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">🔹 Assigned Routing Domains</p>
                  <div className="space-y-3">
                    {(!selectedAgent.websiteIds || selectedAgent.websiteIds.length === 0) ? (
                      <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-5 py-6 rounded-2xl border border-dashed border-slate-200 text-center uppercase tracking-widest">No domains assigned.</p>
                    ) : selectedAgent.websiteIds.map((website) => (
                      <div key={website._id || website} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                          <Globe size={14} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{website.websiteName || website.domain || website}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>
            </div>
          </>,
          document.body
        )}
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
        <div className="space-y-10">
          <EnterpriseReportsCenter />
        </div>
      </Layout>
    );
  }

  /* ── Overview Tab (Executive Operations Command Center) ── */
  const satisfactionRate = analytics?.feedback?.satisfactionRate ?? 100;
  const avgResponseTimeSec = analytics?.sla?.avgResponseTimeSeconds ?? 45;
  const leaderboardData = analytics?.leaderboard || [];

  return (
    <Layout
      menuItems={menuItems}
      title="Manager Command Center"
      subtitle="Operational oversight, team workload supervision, and SLA performance intelligence"
    >
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
        {/* 1. Top Executive KPI Stat Cards (6 Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Online Roster</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">{agents.length} Personnel</h4>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                🟢 {agents.filter(a => a.isOnline).length} Online | ⚪ {agents.filter(a => !a.isOnline).length} Offline
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={22} />
            </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Desk Health</p>
              <h4 className="text-2xl font-black text-emerald-600 mt-1">{analytics?.totals?.resolvedTickets ?? 0} Resolved</h4>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                Today's Resolved Tickets
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Ticket size={22} />
            </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Chat Operations</p>
              <h4 className="text-2xl font-black text-indigo-600 mt-1">{sessions.length} Active Sessions</h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                Concurrent Monitoring
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CSAT Satisfaction Score</p>
              <h4 className="text-2xl font-black text-emerald-600 mt-1">{satisfactionRate}% CSAT</h4>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                {analytics?.feedback?.satisfiedChats ?? 0} Positive Customer Reviews
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Response Time (FRT)</p>
              <h4 className="text-2xl font-black text-slate-900 mt-1">{avgResponseTimeSec}s Avg Speed</h4>
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                SLA Speed Target &lt;60s
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={22} />
            </div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Managed Websites</p>
              <h4 className="text-2xl font-black text-purple-600 mt-1">{websites.length} Domains</h4>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full inline-block mt-2">
                Ecosystem Operational Scope
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Globe size={22} />
            </div>
          </div>
        </section>

        {/* 2. Team Roster Supervision & Workload Table */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Team Workload Supervision</h3>
                <p className="text-[11px] font-semibold text-slate-400">Live agent status, active assignments & quick inspection</p>
              </div>
              <button 
                onClick={() => setSearchParams({ tab: "team" })}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-1.5"
              >
                Full Roster <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Personnel Member</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Live Status</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs font-bold text-slate-400">No personnel members assigned yet.</td>
                    </tr>
                  ) : agents.slice(0, 5).map((agent) => (
                    <tr key={agent._id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                            {agent.name?.[0]?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{agent.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-slate-200">
                          {agent.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          agent.isOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
                          {agent.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => setSelectedAgent(agent)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
                        >
                          Inspect Roster
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Team Leaderboard & Top Performers */}
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Top Performance Leaderboard</h3>
                  <p className="text-[11px] font-semibold text-slate-400">Agent resolution volume & efficiency</p>
                </div>
              </div>

              <div className="space-y-4">
                {leaderboardData.length === 0 ? (
                  <div className="py-8 text-center text-xs font-bold text-slate-400">
                    Leaderboard data populating on resolution activity.
                  </div>
                ) : leaderboardData.slice(0, 4).map((member, index) => (
                  <div key={member._id || index} className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shadow-sm ${
                        index === 0 ? "bg-amber-400 text-amber-950" : index === 1 ? "bg-slate-300 text-slate-800" : "bg-orange-300 text-orange-950"
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase">{member.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{member.chatsHandled || 0} Resolved Sessions</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg uppercase">
                      Top Rated
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" /> Operational Oversight Active
              </span>
              <span>v2.5 Enterprise</span>
            </div>
          </div>
        </section>

        {/* 4. Supervised Workspaces Shortcuts */}
        <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Supervised Workspace Modules</h3>
            <p className="text-[11px] font-semibold text-slate-400">Direct navigation to active operational centers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hasPermission(user, PERMISSIONS.CRM_VIEW) && (
              <button 
                onClick={() => setSearchParams({ tab: "crm" })}
                className="p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-purple-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">CRM & Deals</p>
                    <p className="text-[10px] font-semibold text-slate-400">Pipeline Supervision</p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            )}

            {hasPermission(user, PERMISSIONS.TICKET_VIEW) && (
              <button 
                onClick={() => setSearchParams({ tab: "tickets" })}
                className="p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-sky-600">
                    <Ticket size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">Ticket Nexus</p>
                    <p className="text-[10px] font-semibold text-slate-400">Support Inquiries & SLAs</p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            )}

            {hasPermission(user, PERMISSIONS.CRM_VIEW) && (
              <button 
                onClick={() => setSearchParams({ tab: "inventory" })}
                className="p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-rose-600">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">Inventory & POs</p>
                    <p className="text-[10px] font-semibold text-slate-400">Stock SKUs & Orders</p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            )}

            {hasPermission(user, PERMISSIONS.REPORTS_VIEW) && (
              <button 
                onClick={() => setSearchParams({ tab: "reports" })}
                className="p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between group transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl shadow-sm text-emerald-600">
                    <Activity size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase group-hover:text-indigo-600 transition-colors">BI & Analytics</p>
                    <p className="text-[10px] font-semibold text-slate-400">Enterprise Reports</p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
