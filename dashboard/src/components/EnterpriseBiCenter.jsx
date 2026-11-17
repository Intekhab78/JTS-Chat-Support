import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp, RefreshCw, Plus, X, Trash2, ArrowUpRight,
  Calendar, AlertCircle, LayoutGrid, Mail
} from "lucide-react";
import { api } from "../api/client.js";
import { useCurrency } from "../context/CurrencyContext.jsx";

const WIDGET_CATALOG = [
  { widgetKey: "pipeline_revenue", widgetName: "CRM Pipeline & Won Revenue", chartType: "area", desc: "Real-time pipeline value & closed-won revenue" },
  { widgetKey: "support_sla_health", widgetName: "Support SLA & Resolution Index", chartType: "heatmap", desc: "Ticket resolution rate & service readiness" },
  { widgetKey: "sales_funnel", widgetName: "Deal Acquisition Funnel Conversion", chartType: "funnel", desc: "Closed-won conversion ratio across CRM deals" },
  { widgetKey: "cohort_retention", widgetName: "Subscription Cohort Retention Rate", chartType: "cohort", desc: "Active & renewed subscription ratio" },
  { widgetKey: "total_customers", widgetName: "Active Customer Footprint", chartType: "kpi_card", desc: "Total enrolled customer accounts" }
];

export default function EnterpriseBiCenter({ onDataLoaded }) {
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [showDashModal, setShowDashModal] = useState(false);
  const [dashForm, setDashForm] = useState({
    dashboardName: "",
    dashboardType: "executive",
    selectedKeys: ["pipeline_revenue", "sales_funnel", "cohort_retention"]
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    reportName: "",
    frequency: "weekly",
    recipientEmails: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api("/api/enterprise-bi/overview");
      setData(res || {});
    } catch (err) {
      setErrorMsg(err?.message || "Failed to load Enterprise BI overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDashboard = async (e) => {
    e.preventDefault();
    if (!dashForm.dashboardName.trim()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const widgets = WIDGET_CATALOG.filter((w) => dashForm.selectedKeys.includes(w.widgetKey)).map((w) => ({
        widgetKey: w.widgetKey,
        widgetName: w.widgetName,
        chartType: w.chartType,
        metricValue: "Live"
      }));

      await api("/api/enterprise-bi/dashboards", {
        method: "POST",
        body: JSON.stringify({
          dashboardName: dashForm.dashboardName.trim(),
          dashboardType: dashForm.dashboardType,
          widgets
        })
      });
      setShowDashModal(false);
      setDashForm({
        dashboardName: "",
        dashboardType: "executive",
        selectedKeys: ["pipeline_revenue", "sales_funnel", "cohort_retention"]
      });
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.message || "Failed to create BI dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDashboard = async (id) => {
    setBusyId(id);
    setErrorMsg("");
    try {
      await api(`/api/enterprise-bi/dashboards/${id}`, { method: "DELETE" });
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.message || "Failed to delete BI dashboard");
    } finally {
      setBusyId(null);
    }
  };

  const handleScheduleReport = async (e) => {
    e.preventDefault();
    if (!scheduleForm.reportName.trim()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await api("/api/enterprise-bi/schedule-report", {
        method: "POST",
        body: JSON.stringify({
          reportName: scheduleForm.reportName.trim(),
          frequency: scheduleForm.frequency,
          recipientEmails: scheduleForm.recipientEmails
        })
      });
      setShowScheduleModal(false);
      setScheduleForm({ reportName: "", frequency: "weekly", recipientEmails: "" });
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.message || "Failed to schedule executive digest");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (dashboardId, reportId) => {
    setBusyId(reportId);
    setErrorMsg("");
    try {
      await api(`/api/enterprise-bi/schedule-report/${dashboardId}/${reportId}`, { method: "DELETE" });
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.message || "Failed to remove scheduled report");
    } finally {
      setBusyId(null);
    }
  };

  const toggleWidgetKey = (key) => {
    setDashForm((prev) => ({
      ...prev,
      selectedKeys: prev.selectedKeys.includes(key)
        ? prev.selectedKeys.filter((k) => k !== key)
        : [...prev.selectedKeys, key]
    }));
  };

  const summary = data?.summary || {};
  const metrics = data?.metrics || {};
  const dashboards = data?.dashboards || [];
  const scheduledReports = data?.scheduledReports || [];
  const engineHealthy = summary.engineStatus === "HEALTHY";

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading Enterprise Business Intelligence Engine...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <TrendingUp size={17} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-tight">
              Enterprise Business Intelligence & Executive Cockpit
            </h2>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Revenue Forecasting, Cohort Analysis, Sales Funnel & Scheduled Executive Digests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold uppercase tracking-wider transition"
          >
            <Calendar size={13} /> Schedule Digest
          </button>
          <button
            onClick={() => setShowDashModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-sm transition"
          >
            <Plus size={13} /> New Dashboard
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Primary BI Telemetry Banner */}
      <div className="bg-white rounded-2xl p-4 text-slate-900 shadow-sm border border-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
              Executive BI Analytics Cockpit
            </div>
            <h3 className="text-base font-black tracking-tight mt-0.5 text-slate-900">
              Real-Time Revenue, Funnel & Operations Intelligence
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${engineHealthy
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
          >
            Engine: {summary.engineStatus || "UNKNOWN"}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
              CRM Pipeline Value
            </div>
            <div className="text-xs font-black text-emerald-600 mt-0.5">
              {metrics.pipelineValueAmount !== undefined ? formatCurrency(metrics.pipelineValueAmount) : (metrics.pipelineValue || formatCurrency(0))}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Won: {metrics.wonRevenueAmount !== undefined ? formatCurrency(metrics.wonRevenueAmount) : (metrics.wonRevenue || formatCurrency(0))} ({metrics.totalDeals ?? 0} Deals)
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
              Estimated MRR / ARR
            </div>
            <div className="text-xs font-black text-slate-900 mt-0.5">
              {metrics.estimatedMrrAmount !== undefined ? `${formatCurrency(metrics.estimatedMrrAmount)} / mo` : (metrics.estimatedMrr || `${formatCurrency(0)} / mo`)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Annualized: {metrics.wonRevenueAmount !== undefined ? `${formatCurrency(metrics.wonRevenueAmount)} / yr` : (metrics.arrRunRate || `${formatCurrency(0)} / yr`)}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
              Support SLA Resolution
            </div>
            <div className="text-xs font-black text-sky-600 mt-0.5">
              {metrics.slaHealthScore || "0%"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {metrics.totalCustomers ?? 0} Active Customers
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
              Subscription Retention
            </div>
            <div className="text-xs font-black text-amber-600 mt-0.5">
              {metrics.retentionRate || "0%"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Deal Win Rate: {metrics.funnelConversion || "0%"}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm w-fit">
        {[
          { id: "overview", label: `Executive Dashboards (${dashboards.length})` },
          { id: "widgets", label: `Widget Library (${WIDGET_CATALOG.length})` },
          { id: "digests", label: `Scheduled Digests (${scheduledReports.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-Tab 1: Executive Dashboard Widgets */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {dashboards.map((dash) => (
            <div key={dash._id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-600">
                    {dash.dashboardType} Dashboard
                  </span>
                  <h3 className="text-xs font-black text-slate-900">{dash.dashboardName}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {dash.isDefault ? (
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-md text-[9px] font-black uppercase">
                      Default Executive Layout
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDeleteDashboard(dash._id)}
                      disabled={busyId === dash._id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete Dashboard"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(dash.widgets || []).map((w, idx) => (
                  <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">
                      {w.widgetName}
                    </span>
                    <strong className="text-sm font-black text-slate-900 block">
                      {w.metricValue || "0"}
                    </strong>
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[9px] font-mono text-indigo-600 font-bold">
                      <span>TYPE: {(w.chartType || "metric").toUpperCase()}</span>
                      <ArrowUpRight size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-Tab 2: Widget Library */}
      {activeTab === "widgets" && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-100">
            <LayoutGrid size={14} className="text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Available BI Widget Library & Live Visualization Engines
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {WIDGET_CATALOG.map((w) => (
              <div key={w.widgetKey} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">{w.widgetName}</span>
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-mono uppercase">
                    {w.chartType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Scheduled Digests */}
      {activeTab === "digests" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-2.5">Report Name</th>
                  <th className="px-4 py-2.5">Dashboard</th>
                  <th className="px-4 py-2.5">Frequency</th>
                  <th className="px-4 py-2.5">Recipients</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {scheduledReports.map((rep) => (
                  <tr key={rep._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{rep.reportName}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">{rep.dashboardName}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-black uppercase">
                        {rep.frequency}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-600">
                      {(rep.recipientEmails || []).length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={11} className="text-slate-400" />
                          {rep.recipientEmails.join(", ")}
                        </span>
                      ) : (
                        <span className="text-slate-400">Workspace Admins</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteReport(rep.dashboardId, rep._id)}
                        disabled={busyId === rep._id}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 disabled:opacity-40"
                        title="Remove Schedule"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {scheduledReports.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-xs text-slate-400">
                      No scheduled executive digests yet. Click "Schedule Digest" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create BI Dashboard Modal */}
      {showDashModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowDashModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Create BI Dashboard</h3>
                <p className="text-[10px] font-semibold text-slate-400">Configure custom executive KPI views</p>
              </div>
              <button onClick={() => setShowDashModal(false)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateDashboard} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Dashboard Name *</label>
                <input
                  required
                  value={dashForm.dashboardName}
                  onChange={(e) => setDashForm({ ...dashForm, dashboardName: e.target.value })}
                  placeholder="Q4 Revenue & Funnel Board"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Dashboard Type</label>
                <select
                  value={dashForm.dashboardType}
                  onChange={(e) => setDashForm({ ...dashForm, dashboardType: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="executive">Executive</option>
                  <option value="revenue">Revenue</option>
                  <option value="sales">Sales</option>
                  <option value="kpi">KPI</option>
                  <option value="branch">Branch</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Include Live Widgets</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                  {WIDGET_CATALOG.map((w) => (
                    <label key={w.widgetKey} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dashForm.selectedKeys.includes(w.widgetKey)}
                        onChange={() => toggleWidgetKey(w.widgetKey)}
                      />
                      <span className="font-semibold">{w.widgetName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDashModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase shadow-sm"
                >
                  {submitting ? "Saving..." : "Save Dashboard"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Digest Modal */}
      {showScheduleModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Schedule Executive Digest</h3>
                <p className="text-[10px] font-semibold text-slate-400">Automate recurring BI summary reports</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleScheduleReport} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Report Name *</label>
                <input
                  required
                  value={scheduleForm.reportName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, reportName: e.target.value })}
                  placeholder="Weekly Executive Pipeline Digest"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Frequency</label>
                <select
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Recipient Emails (comma-separated)
                </label>
                <input
                  value={scheduleForm.recipientEmails}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, recipientEmails: e.target.value })}
                  placeholder="exec@company.com, ops@company.com"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase shadow-sm"
                >
                  {submitting ? "Scheduling..." : "Save Schedule"}
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
