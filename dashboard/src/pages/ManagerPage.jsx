import React, { useState, useEffect } from "react";
import ConversationHub from "../components/ConversationHub.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { X, MessageSquare, Globe } from "lucide-react";
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

      const [analyticsData, websiteData, agentData, sessionData] = await Promise.all([
        api(`/api/analytics?${params.toString()}`),
        api("/api/websites"),
        api("/api/users/agents"),
        api("/api/chat/sessions")
      ]);
      setAnalytics(analyticsData);
      setWebsites(websiteData);
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

  const WebsiteScopeSelector = () => (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-4xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Globe size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Context Scope</p>
          <h4 className="text-sm font-black text-slate-900">
            {websites.find(w => w._id === selectedWebsiteId)?.websiteName || "All Managed Websites"}
          </h4>
        </div>
      </div>
      <div className="flex items-center gap-2 pr-2">
        <select
          value={selectedWebsiteId}
          onChange={(e) => setSelectedWebsiteId(e.target.value)}
          className="rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-200 outline-none hover:bg-white dark:hover:bg-slate-800 transition-all appearance-none cursor-pointer"
        >
          <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold">Global View (All)</option>
          {websites.map(w => (
            <option key={w._id} value={w._id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold">{w.websiteName}</option>
          ))}
        </select>
      </div>
    </div>
  );

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
        <WebsiteScopeSelector />
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
        <WebsiteScopeSelector />
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
        <WebsiteScopeSelector />
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
        <WebsiteScopeSelector />
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
        <WebsiteScopeSelector />
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

  /* ── Overview Tab (default) ── */
  return (
    <Layout
      menuItems={menuItems}
      title="Operations Overview"
      subtitle="Monitoring and analytical oversight dashboard"
    >
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
        {(() => {
          const paginatedWebsites = getPaginationMeta(websites, websitesPage);
          return (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <StatCard label="Linked Websites" value={analytics?.totals?.websites ?? websites.length} />
                <StatCard label="Active Personnel" value={analytics?.totals?.agents ?? agents.length} />
                <StatCard label="Concurrent Sessions" value={analytics?.totals?.liveSessions ?? sessions.length} color="indigo" />
              </section>

              {/* Websites registry */}
              <section className="premium-card p-0 overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                  <h3 className="heading-md">System Registry</h3>
                  <p className="small-label opacity-60 mt-1">Authorized domain connections and embed scripts</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                  {websites.length === 0 ? (
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest col-span-2 py-8 text-center">
                      No websites registered yet.
                    </p>
                  ) : paginatedWebsites.pageItems.map((website) => (
                    <article key={website._id} className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:border-indigo-100 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-lg shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">🌐</div>
                          <div>
                            <strong className="text-xs font-black text-slate-950 uppercase tracking-tight block">{website.websiteName}</strong>
                            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{website.domain}</span>
                          </div>
                        </div>
                        <code className="text-[9px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{website.apiKey}</code>
                      </div>
                      <div className="relative">
                        <textarea readOnly value={website.embedScript} rows={3} className="w-full bg-slate-950 text-indigo-300 font-mono text-[9px] p-5 rounded-2xl border border-slate-800 outline-none resize-none shadow-inner leading-relaxed" />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-white/5 backdrop-blur-sm rounded text-[8px] font-black text-slate-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Copy</div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="px-8 pb-8">
                  <PaginationControls
                    currentPage={paginatedWebsites.currentPage}
                    totalPages={paginatedWebsites.totalPages}
                    totalItems={paginatedWebsites.totalItems}
                    itemLabel="websites"
                    onPageChange={setWebsitesPage}
                  />
                </div>
              </section>
            </>
          );
        })()}
      </div>
    </Layout>
  );
}
