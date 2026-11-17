import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Clock, ShieldCheck, AlertTriangle, Plus, RefreshCw, X, Pencil,
  Activity, Trash2, Award, AlertCircle, CheckCircle2, Search, ExternalLink
} from "lucide-react";
import { api } from "../api/client.js";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

export default function SlaManagementCenter({ websiteId }) {
  const [, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [riskSearch, setRiskSearch] = useState("");
  const [riskTypeFilter, setRiskTypeFilter] = useState("ALL");
  const [riskStatusFilter, setRiskStatusFilter] = useState("ALL");
  const [riskPage, setRiskPage] = useState(1);
  const RISK_PAGE_SIZE = 8;

  const [form, setForm] = useState({
    name: "",
    description: "",
    priority: "Medium",
    customerType: "All",
    serviceType: "All",
    responseTimeTargetHours: 2,
    resolutionTimeTargetHours: 24,
    warningThresholdPercent: 75,
    escalationThresholdPercent: 100,
    businessHoursOnly: true,
    status: "active"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);

      const [overviewRes, policiesRes] = await Promise.all([
        api(`/api/sla-center/overview?${params.toString()}`),
        api(`/api/sla-center/policies?${params.toString()}`)
      ]);

      setData(overviewRes || {});
      setPolicies(Array.isArray(policiesRes) ? policiesRes : []);
    } catch (err) {
      console.error("Failed to load SLA center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setForm({
      name: "",
      description: "",
      priority: "Medium",
      customerType: "All",
      serviceType: "All",
      responseTimeTargetHours: 2,
      resolutionTimeTargetHours: 24,
      warningThresholdPercent: 75,
      escalationThresholdPercent: 100,
      businessHoursOnly: true,
      status: "active"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (policy) => {
    setEditingPolicy(policy);
    setForm({
      name: policy.name || "",
      description: policy.description || "",
      priority: policy.priority || "Medium",
      customerType: policy.customerType || "All",
      serviceType: policy.serviceType || "All",
      responseTimeTargetHours: policy.responseTimeTargetHours ?? 2,
      resolutionTimeTargetHours: policy.resolutionTimeTargetHours ?? 24,
      warningThresholdPercent: policy.warningThresholdPercent ?? 75,
      escalationThresholdPercent: policy.escalationThresholdPercent ?? 100,
      businessHoursOnly: policy.businessHoursOnly !== undefined ? policy.businessHoursOnly : true,
      status: policy.status || "active"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPolicy) {
        await api(`/api/sla-center/policies/${editingPolicy._id}`, {
          method: "PATCH",
          body: JSON.stringify(form)
        });
      } else {
        await api("/api/sla-center/policies", {
          method: "POST",
          body: JSON.stringify({ ...form, websiteId })
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePolicy = async (id) => {
    if (!confirm("Are you sure you want to delete this SLA Policy?")) return;
    try {
      await api(`/api/sla-center/policies/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loading SLA & SLO Center...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const atRiskItems = data?.atRiskItems || [];

  const complianceRate = summary.slaCompliancePercent ?? 100;
  const totalTracked = summary.totalServices ?? 0;
  const warningCount = summary.warningSla ?? 0;
  const breachedCount = summary.breachedSla ?? 0;
  const avgResolution = summary.avgResolutionTimeHours ?? 0;
  const avgFirstResp = summary.avgFirstResponseTimeHours ?? 0;
  const firstRespTarget = summary.firstResponseTargetHours ?? 2;
  const resolutionTarget = summary.resolutionTargetHours ?? 24;
  const sloAvail = summary.sloAvailabilityAchieved ?? 100;
  const sloAvailTarget = summary.sloAvailabilityTarget ?? 99.9;
  const liveCsatPercent = summary.liveCsatPercent ?? null;
  const csatFeedbackCount = summary.csatFeedbackCount ?? 0;
  const sloCsatTarget = summary.sloCsatTarget ?? 95;

  const filteredRiskItems = atRiskItems.filter((item) => {
    if (riskTypeFilter !== "ALL" && item.type !== riskTypeFilter) return false;
    if (riskStatusFilter !== "ALL" && item.status !== riskStatusFilter) return false;
    if (!riskSearch.trim()) return true;
    const q = riskSearch.toLowerCase();
    return (
      String(item.ref || "").toLowerCase().includes(q) ||
      String(item.title || "").toLowerCase().includes(q) ||
      String(item.type || "").toLowerCase().includes(q)
    );
  });

  const totalRiskPages = Math.max(1, Math.ceil(filteredRiskItems.length / RISK_PAGE_SIZE));
  const safeRiskPage = Math.min(riskPage, totalRiskPages);
  const pagedRiskItems = filteredRiskItems.slice(
    (safeRiskPage - 1) * RISK_PAGE_SIZE,
    safeRiskPage * RISK_PAGE_SIZE
  );

  const navigateToItem = (item) => {
    const tab = item.type === "Ticket" ? "tickets" : "inventory-customer";
    const nextParams = { tab };
    if (item.entityId) {
      nextParams[item.type === "Ticket" ? "ticketId" : "customerId"] = String(item.entityId);
    }
    setSearchParams(nextParams);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Compact Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Enterprise SLA / SLO Management Center</h2>
            <p className="text-[10px] font-medium text-slate-400">
              Service Level Commitments, Warning Alerts & Breach Escalation Controls
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            title="Refresh SLA Metrics"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Create SLA Policy
          </button>
        </div>
      </div>

      {/* Compact Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between text-emerald-700 text-[9px] font-black uppercase tracking-wider">
            <span>SLA Compliance</span>
            <ShieldCheck size={14} />
          </div>
          <h3 className="text-xl font-black text-emerald-700 mt-1">{complianceRate}%</h3>
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Target: ≥ {sloCsatTarget}%</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[9px] font-black uppercase tracking-wider">
            <span>Tracked Items</span>
            <Activity size={14} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">{totalTracked}</h3>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Tickets & Services</p>
        </div>

        <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-100">
          <div className="flex items-center justify-between text-amber-700 text-[9px] font-black uppercase tracking-wider">
            <span>Warning SLA</span>
            <AlertCircle size={14} />
          </div>
          <h3 className="text-xl font-black text-amber-700 mt-1">{warningCount}</h3>
          <p className="text-[10px] font-semibold text-amber-600 mt-0.5">Approaching Deadline</p>
        </div>

        <div className="bg-rose-50/80 p-3.5 rounded-xl border border-rose-100">
          <div className="flex items-center justify-between text-rose-700 text-[9px] font-black uppercase tracking-wider">
            <span>Breached SLA</span>
            <AlertTriangle size={14} />
          </div>
          <h3 className="text-xl font-black text-rose-700 mt-1">{breachedCount}</h3>
          <p className="text-[10px] font-semibold text-rose-600 mt-0.5">Exceeded Target</p>
        </div>

        <div className="bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-100 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-indigo-700 text-[9px] font-black uppercase tracking-wider">
            <span>Avg Resolution</span>
            <Clock size={14} />
          </div>
          <h3 className="text-xl font-black text-indigo-700 mt-1">
            {avgResolution} <span className="text-[11px] font-bold text-indigo-500">hrs</span>
          </h3>
          <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">Avg 1st Resp: {avgFirstResp}h</p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit gap-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
        >
          SLA Performance & SLO
        </button>
        <button
          onClick={() => setActiveTab("policies")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${activeTab === "policies" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
        >
          Configured SLA Policies ({policies.length})
        </button>
      </div>

      {/* Sub-Tab 1: Overview & SLO Performance */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Service Level Objectives (SLO) Targets Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100 flex items-center gap-1.5">
              <Award size={15} className="text-indigo-600" /> Service Level Objectives (SLO) Achievement Matrix
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">SLA Availability Rate</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-slate-900">{sloAvail}%</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Target: {sloAvailTarget}%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Live CSAT vs SLO Target</span>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-black ${liveCsatPercent === null
                      ? "text-slate-500"
                      : liveCsatPercent >= sloCsatTarget
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}>
                    {liveCsatPercent !== null ? `${liveCsatPercent}%` : "No Data"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    Target: ≥ {sloCsatTarget}% ({csatFeedbackCount})
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Avg First Response</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-indigo-600">{avgFirstResp} hrs</span>
                  <span className="text-[10px] text-slate-500 font-bold">Target: &lt; {firstRespTarget}h</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Avg Resolution Time</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-black text-slate-900">{avgResolution} hrs</span>
                  <span className="text-[10px] text-slate-500 font-bold">Target: &lt; {resolutionTarget}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live At-Risk & Breached SLA Queue */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5 mr-1">
                  <AlertTriangle size={14} className="text-amber-500" /> Live SLA Warning & Breach Queue ({filteredRiskItems.length})
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  {[
                    { key: "ALL", label: "All Types" },
                    { key: "Ticket", label: "Tickets" },
                    { key: "Account", label: "Accounts" },
                    { key: "Service", label: "Services" }
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { setRiskTypeFilter(t.key); setRiskPage(1); }}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${riskTypeFilter === t.key
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <select
                  value={riskStatusFilter}
                  onChange={(e) => { setRiskStatusFilter(e.target.value); setRiskPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="breached">Breached</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
              <div className="relative w-full lg:w-56">
                <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={riskSearch}
                  onChange={(e) => { setRiskSearch(e.target.value); setRiskPage(1); }}
                  placeholder="Search client, ticket, task..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-semibold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {filteredRiskItems.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center gap-1.5">
                <CheckCircle2 size={22} className="text-emerald-500" />
                <p className="text-xs font-bold text-slate-600">
                  {atRiskItems.length === 0
                    ? "All active tickets and services are within SLA targets."
                    : "No SLA items matched your search or filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Reference</th>
                      <th className="px-4 py-2.5">Subject / Task</th>
                      <th className="px-4 py-2.5">Elapsed / Target</th>
                      <th className="px-4 py-2.5">SLA Status</th>
                      <th className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                    {pagedRiskItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2 text-[10px] font-bold uppercase text-slate-500">{item.type}</td>
                        <td className="px-4 py-2 font-mono text-[11px] font-bold text-slate-900">{item.ref}</td>
                        <td className="px-4 py-2 max-w-xs truncate">{item.title}</td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-600">{item.elapsedLabel}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${item.status === "breached"
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => navigateToItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-[9px] font-black uppercase transition-all"
                          >
                            Open <ExternalLink size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalRiskPages > 1 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>
                      Showing {(safeRiskPage - 1) * RISK_PAGE_SIZE + 1}–{Math.min(safeRiskPage * RISK_PAGE_SIZE, filteredRiskItems.length)} of {filteredRiskItems.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={safeRiskPage <= 1}
                        onClick={() => setRiskPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold disabled:opacity-40 hover:bg-slate-100"
                      >
                        Prev
                      </button>
                      <span className="px-2 text-[10px] font-mono font-bold text-slate-700">
                        {safeRiskPage} / {totalRiskPages}
                      </span>
                      <button
                        disabled={safeRiskPage >= totalRiskPages}
                        onClick={() => setRiskPage((p) => Math.min(totalRiskPages, p + 1))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold disabled:opacity-40 hover:bg-slate-100"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: SLA Policies Management */}
      {activeTab === "policies" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Configured Enterprise SLA Policies</h3>
            <button
              onClick={handleOpenCreate}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm flex items-center gap-1"
            >
              <Plus size={12} /> Add Policy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-4 py-2.5">Policy Name</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5 text-center">1st Response</th>
                  <th className="px-4 py-2.5 text-center">Resolution</th>
                  <th className="px-4 py-2.5 text-center">Warning</th>
                  <th className="px-4 py-2.5">Schedule</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                      No SLA policies created yet. Click "Add Policy" to configure targets.
                    </td>
                  </tr>
                ) : (
                  policies.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.description || "Default Policy Rule"}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${p.priority === "Critical" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                            p.priority === "High" ? "bg-orange-50 text-orange-600 border border-orange-200" :
                              "bg-indigo-50 text-indigo-600 border border-indigo-200"
                          }`}>
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-900">{p.responseTimeTargetHours}h</td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-900">{p.resolutionTimeTargetHours}h</td>
                      <td className="px-4 py-2.5 text-center text-amber-600 font-bold">{p.warningThresholdPercent}%</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {p.businessHoursOnly ? "9AM-6PM Mon-Fri" : "24/7 Calendar"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${p.status === "active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                          {p.status || "active"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            title="Edit Policy"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p._id)}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                            title="Delete Policy"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingPolicy ? "Edit SLA Policy" : "Configure New SLA Policy"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Policy Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Critical Support Ticket Priority SLA"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of SLA scope & escalation rule"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Priority Tier</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">1st Response Target (Hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.responseTimeTargetHours}
                    onChange={(e) => setForm({ ...form, responseTimeTargetHours: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Resolution Target (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.resolutionTimeTargetHours}
                    onChange={(e) => setForm({ ...form, resolutionTimeTargetHours: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Warning Threshold (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={form.warningThresholdPercent}
                    onChange={(e) => setForm({ ...form, warningThresholdPercent: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Escalation Threshold (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="200"
                    value={form.escalationThresholdPercent}
                    onChange={(e) => setForm({ ...form, escalationThresholdPercent: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(form.businessHoursOnly)}
                  onChange={(e) => setForm({ ...form, businessHoursOnly: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] font-semibold text-slate-600">Apply during Business Hours only (9 AM – 6 PM Mon–Fri)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 font-bold uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold uppercase text-[10px] rounded-xl shadow-sm hover:bg-indigo-700">
                  {editingPolicy ? "Save Changes" : "Create Policy"}
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
