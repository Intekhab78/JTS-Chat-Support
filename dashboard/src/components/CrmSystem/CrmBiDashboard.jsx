import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, Plus, ShieldAlert, Download, Printer, BarChart2, DollarSign, Activity, AlertTriangle, Trash2, RefreshCw, X } from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";
import { useToast } from "../../context/ToastContext.jsx";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";

const DEFAULT_PRESET_WIDGETS = [
  { id: "w_pipeline", title: "Total Pipeline Value", type: "kpi", metric: "pipeline" },
  { id: "w_conversion", title: "Lead Conversion Rate", type: "kpi", metric: "conversion" },
  { id: "w_won_deals", title: "Won Deals Count", type: "kpi", metric: "won_deals" },
  { id: "w_total_leads", title: "Total Leads Count", type: "kpi", metric: "total_leads" }
];

export default function CrmBiDashboard({ websiteId }) {
  const toast = useToast();
  const [metrics, setMetrics] = useState({
    crm: { totalLeads: 0, wonDeals: 0, pipelineValue: 0, conversionRate: 0 },
    support: { totalTickets: 0, openTickets: 0, escalatedTickets: 0 },
    finance: { collectionsSum: 0, mrrEstimate: 0, arrEstimate: 0 },
    ai: { totalAiCost: 0 }
  });

  const [customWidgets, setCustomWidgets] = useState(DEFAULT_PRESET_WIDGETS);
  const [customAlerts, setCustomAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showWidgetForm, setShowWidgetForm] = useState(false);
  const [widgetForm, setWidgetForm] = useState({ title: "", type: "kpi", metric: "pipeline" });

  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ name: "", metric: "revenue", operator: "gt", value: 0, emailInput: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricRes, dbRes, alertRes] = await Promise.all([
        api(`/api/crm/bi/metrics?websiteId=${websiteId}`).catch(() => null),
        api(`/api/crm/bi/dashboards?websiteId=${websiteId}`).catch(() => []),
        api(`/api/crm/bi/alerts?websiteId=${websiteId}`).catch(() => [])
      ]);

      if (metricRes) setMetrics(metricRes);
      if (Array.isArray(dbRes) && dbRes[0]?.widgets?.length > 0) {
        setCustomWidgets(dbRes[0].widgets);
      }
      setCustomAlerts(Array.isArray(alertRes) ? alertRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleAddWidgetDirect = async (title, metric, type = "kpi") => {
    const newW = { id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title, metric, type };
    const updated = [...customWidgets, newW];
    setCustomWidgets(updated);

    try {
      await api(`/api/crm/bi/dashboards`, {
        method: "POST",
        body: JSON.stringify({ name: "Primary Dashboard", widgets: updated, websiteId })
      });
      toast.success("Widget added");
    } catch {
      // keep local state if endpoint unavailable
    }
  };

  const handleRemoveWidget = async (widgetId) => {
    const updated = customWidgets.filter(w => w.id !== widgetId);
    setCustomWidgets(updated);

    api(`/api/crm/bi/dashboards`, {
      method: "POST",
      body: JSON.stringify({ name: "Primary Dashboard", widgets: updated, websiteId })
    }).catch(() => { });
  };

  const handleCreateWidget = async (e) => {
    e.preventDefault();
    if (!widgetForm.title.trim()) return;
    await handleAddWidgetDirect(widgetForm.title.trim(), widgetForm.metric, widgetForm.type);
    setWidgetForm({ title: "", type: "kpi", metric: "pipeline" });
    setShowWidgetForm(false);
  };

  const handleAddAlertDirect = async (name, metric, operator, value, emails = []) => {
    try {
      const saved = await api(`/api/crm/bi/alerts`, {
        method: "POST",
        body: JSON.stringify({ name, metric, operator, value, notificationEmails: emails, websiteId })
      });
      if (saved && saved._id) {
        setCustomAlerts(prev => [...prev, saved]);
      } else {
        fetchData();
      }
      toast.success("Threshold alert saved");
    } catch (err) {
      toast.error(err.message || "Failed to save alert");
    }
  };

  const handleRemoveAlert = async (alertId) => {
    setCustomAlerts(prev => prev.filter(a => a._id !== alertId));
    api(`/api/crm/bi/alerts/${alertId}`, { method: "DELETE" }).catch(() => { });
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    const emails = alertForm.emailInput.split(",").map(s => s.trim()).filter(Boolean);
    await handleAddAlertDirect(alertForm.name, alertForm.metric, alertForm.operator, alertForm.value, emails);
    setAlertForm({ name: "", metric: "revenue", operator: "gt", value: 0, emailInput: "" });
    setShowAlertForm(false);
  };

  const handleExportCSV = () => {
    const sym = getCurrencySymbol();
    const data = [
      { "Metric Group": "CRM", "KPI Name": "Total Leads", "Value": metrics.crm.totalLeads || 0 },
      { "Metric Group": "CRM", "KPI Name": "Won Deals", "Value": metrics.crm.wonDeals || 0 },
      { "Metric Group": "CRM", "KPI Name": `Pipeline Value (${sym})`, "Value": metrics.crm.pipelineValue || 0 },
      { "Metric Group": "CRM", "KPI Name": "Conversion Rate (%)", "Value": `${metrics.crm.conversionRate || 0}%` },
      { "Metric Group": "Support", "KPI Name": "Total Tickets", "Value": metrics.support.totalTickets || 0 },
      { "Metric Group": "Support", "KPI Name": "Open Tickets", "Value": metrics.support.openTickets || 0 },
      { "Metric Group": "Support", "KPI Name": "Escalated Tickets", "Value": metrics.support.escalatedTickets || 0 },
      { "Metric Group": "Finance", "KPI Name": `Total Collections (${sym})`, "Value": metrics.finance.collectionsSum || 0 },
      { "Metric Group": "Finance", "KPI Name": `MRR Estimate (${sym})`, "Value": metrics.finance.mrrEstimate || 0 },
      { "Metric Group": "Finance", "KPI Name": `ARR Estimate (${sym})`, "Value": metrics.finance.arrEstimate || 0 },
      { "Metric Group": "AI Platform", "KPI Name": "Total Cost ($)", "Value": `$${(metrics.ai.totalAiCost || 0).toFixed(5)}` }
    ];
    exportToCSV(data, `BI_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const sym = getCurrencySymbol();
    const data = [
      { "Category": "CRM Sales", "Metric Name": `Total Pipeline Value (${sym})`, "Value": formatCurrency(metrics.crm.pipelineValue || 0) },
      { "Category": "CRM Sales", "Metric Name": "Lead Conversion Rate (%)", "Value": `${metrics.crm.conversionRate || 0}%` },
      { "Category": "CRM Sales", "Metric Name": "Total Won Deals", "Value": String(metrics.crm.wonDeals || 0) },
      { "Category": "CRM Sales", "Metric Name": "Total Leads Logged", "Value": String(metrics.crm.totalLeads || 0) },
      { "Category": "Customer Support", "Metric Name": "Total SLA Tickets", "Value": String(metrics.support.totalTickets || 0) },
      { "Category": "Customer Support", "Metric Name": "Open SLA Tickets", "Value": String(metrics.support.openTickets || 0) },
      { "Category": "Customer Support", "Metric Name": "Escalated Tickets", "Value": String(metrics.support.escalatedTickets || 0) },
      { "Category": "Finance Ledger", "Metric Name": `Total Collections (${sym})`, "Value": formatCurrency(metrics.finance.collectionsSum || 0) },
      { "Category": "Finance Ledger", "Metric Name": `MRR Estimate (${sym})`, "Value": formatCurrency(metrics.finance.mrrEstimate || 0) },
      { "Category": "Finance Ledger", "Metric Name": `ARR Estimate (${sym})`, "Value": formatCurrency(metrics.finance.arrEstimate || 0) }
    ];
    exportToPDF(data, `BI_Analytics_${new Date().toISOString().slice(0, 10)}`, "BUSINESS INTELLIGENCE & ANALYTICS REPORT");
  };

  const pipelineVal = Number(metrics.crm.pipelineValue || 0);
  const convRate = Number(metrics.crm.conversionRate || 0);
  const predictedRevenue = Math.round(pipelineVal * (convRate / 100));
  const wonDealsCount = Number(metrics.crm.wonDeals || 0);

  return (
    <div className="space-y-3">
      {/* Compact Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <BarChart2 size={15} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Enterprise Analytics & BI</h3>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Real-time multi-tenant intelligence board</p>
          </div>
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto flex-wrap justify-end">
          <button
            onClick={fetchData}
            className="h-7 w-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            title="Refresh BI Metrics"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowWidgetForm(true)}
            className="h-7 px-2.5 border border-slate-200 hover:bg-slate-50 text-[9px] font-extrabold uppercase text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus size={11} /> Add Widget
          </button>
          <button
            onClick={handleExportCSV}
            className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9px] font-extrabold uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><Activity size={15} /></div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Conversion Rate</span>
            <span className="text-sm font-extrabold text-slate-900">{convRate}%</span>
            <span className="text-[9px] font-semibold text-indigo-600 block">{wonDealsCount} Deals Won</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><DollarSign size={15} /></div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Total SaaS MRR</span>
            <span className="text-sm font-extrabold text-slate-900">{formatCurrency(metrics.finance.mrrEstimate || 0)}</span>
            <span className="text-[9px] font-semibold text-slate-400 block">ARR: {formatCurrency(metrics.finance.arrEstimate || 0)}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0"><ShieldAlert size={15} /></div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Escalated Tickets</span>
            <span className="text-sm font-extrabold text-slate-900">{metrics.support.escalatedTickets || 0}</span>
            <span className="text-[9px] font-semibold text-slate-400 block">Open: {metrics.support.openTickets || 0}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0"><TrendingUp size={15} /></div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">AI Token Cost</span>
            <span className="text-sm font-extrabold text-slate-900">${(metrics.ai.totalAiCost || 0).toFixed(4)}</span>
            <span className="text-[9px] font-semibold text-slate-400 block">Live Usage Spend</span>
          </div>
        </div>
      </div>

      {/* Real Pipeline-Weighted Forecast Banner */}
      <div className="bg-white text-slate-900 border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg flex items-center justify-center shrink-0">
          <Activity size={16} />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-extrabold uppercase text-indigo-600 tracking-wider">Weighted Pipeline Forecast</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px] font-extrabold uppercase border border-indigo-200/70">
                {convRate}% Win Rate
              </span>
            </div>
            <p className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 mt-0.5 tabular-nums">
              {formatCurrency(predictedRevenue)}
              <span className="text-[10.5px] text-slate-500 font-medium ml-2">
                projected from {formatCurrency(pipelineVal)} open pipeline
              </span>
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-[8.5px] font-bold uppercase text-slate-400">Closed Won Deals</p>
            <p className="text-xs font-extrabold text-emerald-600">{wonDealsCount} Deals</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Custom Widgets + Threshold Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Custom Widgets Section */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center gap-1.5">
            <BarChart2 size={13} className="text-indigo-500" /> Custom Dashboard Layout ({customWidgets.length})
          </h4>

          {customWidgets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {customWidgets.map((w) => {
                const getWidgetValue = () => {
                  if (w.metric === "pipeline") return { label: formatCurrency(metrics.crm.pipelineValue || 0), color: "text-indigo-600" };
                  if (w.metric === "conversion") return { label: `${metrics.crm.conversionRate || 0}%`, color: "text-emerald-600" };
                  if (w.metric === "won_deals") return { label: `${metrics.crm.wonDeals || 0} Won Deals`, color: "text-indigo-600" };
                  if (w.metric === "total_leads") return { label: `${metrics.crm.totalLeads || 0} Total Leads`, color: "text-slate-900" };
                  if (w.metric === "revenue") return { label: formatCurrency(metrics.finance.collectionsSum || 0), color: "text-slate-900" };
                  if (w.metric === "tickets") return { label: `${metrics.support.totalTickets || 0} Tickets`, color: "text-amber-600" };
                  if (w.metric === "ai_cost") return { label: `$${(metrics.ai.totalAiCost || 0).toFixed(4)}`, color: "text-slate-900" };
                  return { label: "—", color: "text-slate-400" };
                };
                const { label, color } = getWidgetValue();

                const handleWidgetExportCSV = () => {
                  exportToCSV([{ Widget: w.title, Metric: w.metric, Value: label }], `Widget_${w.title.replace(/\s+/g, "_")}`);
                };

                return (
                  <div key={w.id} className="p-3.5 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-2 hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-slate-700 truncate">{w.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="bg-indigo-50 text-indigo-600 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-indigo-100">{w.type || "kpi"}</span>
                        <button
                          onClick={handleWidgetExportCSV}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded cursor-pointer"
                          title="Export Widget CSV"
                        >
                          <Download size={11} />
                        </button>
                        <button
                          onClick={() => handleRemoveWidget(w.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded cursor-pointer"
                          title="Remove Widget"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    <div className="py-1.5">
                      <p className={`text-lg font-extrabold tabular-nums ${color}`}>{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-slate-400 font-bold text-[10.5px] uppercase tracking-wider">No widgets pinned. Add one below.</p>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <button onClick={() => handleAddWidgetDirect("Total Pipeline Value", "pipeline")} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-[9.5px] font-extrabold uppercase hover:bg-indigo-100 cursor-pointer">+ Pipeline Value</button>
                <button onClick={() => handleAddWidgetDirect("Lead Conversion Rate", "conversion")} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[9.5px] font-extrabold uppercase hover:bg-emerald-100 cursor-pointer">+ Conversion Rate</button>
                <button onClick={() => handleAddWidgetDirect("Total Leads Count", "total_leads")} className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[9.5px] font-extrabold uppercase hover:bg-slate-200 cursor-pointer">+ Total Leads</button>
              </div>
            </div>
          )}
        </div>

        {/* Threshold Alerts Panel */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b pb-2 border-slate-100">
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-rose-500" /> Threshold Alerts ({customAlerts.length})
            </h4>
            <button onClick={() => setShowAlertForm(true)} className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700 uppercase flex items-center gap-0.5 cursor-pointer">
              <Plus size={11} /> Add Rule
            </button>
          </div>

          <div className="space-y-2">
            {customAlerts.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">No threshold alerts configured.</p>
                <button
                  onClick={() => handleAddAlertDirect("High Escalated Tickets Warning", "tickets", "gt", 5)}
                  className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-extrabold uppercase cursor-pointer"
                >
                  + Preset Ticket Alert
                </button>
              </div>
            ) : (
              customAlerts.map(al => (
                <div key={al._id} className="px-3 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-extrabold text-slate-900 truncate">{al.name}</p>
                    <p className="text-[8.5px] font-semibold text-slate-400 uppercase mt-0.5">
                      {al.metric} {al.operator === "gt" ? ">" : "<"} {al.value}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] font-extrabold uppercase bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded">active</span>
                    <button
                      onClick={() => handleRemoveAlert(al._id)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Remove Rule"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Widget Form Modal */}
      {showWidgetForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowWidgetForm(false)} />
          <form onSubmit={handleCreateWidget} className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3.5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Add Dashboard Widget</h3>
              <button type="button" onClick={() => setShowWidgetForm(false)} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={12} /></button>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Widget Title</label>
              <input required placeholder="e.g. Pipeline Value" value={widgetForm.title} onChange={(e) => setWidgetForm({ ...widgetForm, title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Widget Type</label>
                <select value={widgetForm.type} onChange={(e) => setWidgetForm({ ...widgetForm, type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-[11px] font-bold outline-none">
                  <option value="kpi">KPI Card</option>
                  <option value="chart">Visual Chart</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Metric Source</label>
                <select value={widgetForm.metric} onChange={(e) => setWidgetForm({ ...widgetForm, metric: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-[11px] font-bold outline-none">
                  <option value="pipeline">Total Pipeline Value</option>
                  <option value="conversion">Conversion Rate (%)</option>
                  <option value="total_leads">Total Leads Count</option>
                  <option value="won_deals">Won Deals Count</option>
                  <option value="revenue">Total Collections</option>
                  <option value="tickets">Helpdesk Tickets</option>
                  <option value="ai_cost">AI Token Spend</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider cursor-pointer">Create Widget</button>
          </form>
        </div>,
        document.body
      )}

      {/* Alert Form Modal */}
      {showAlertForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowAlertForm(false)} />
          <form onSubmit={handleCreateAlert} className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3.5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Configure Threshold Alert</h3>
              <button type="button" onClick={() => setShowAlertForm(false)} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={12} /></button>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alert Name</label>
              <input required placeholder="e.g. Low Conversion Warning" value={alertForm.name} onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Metric</label>
                <select value={alertForm.metric} onChange={(e) => setAlertForm({ ...alertForm, metric: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-2 py-2 rounded-lg text-[10.5px] font-bold outline-none">
                  <option value="revenue">Revenue</option>
                  <option value="tickets">Open Tickets</option>
                  <option value="conversion">Conversion %</option>
                  <option value="ai_cost">AI Spend</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Condition</label>
                <select value={alertForm.operator} onChange={(e) => setAlertForm({ ...alertForm, operator: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-2 py-2 rounded-lg text-[10.5px] font-bold outline-none">
                  <option value="gt">&gt; Above</option>
                  <option value="lt">&lt; Below</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Limit</label>
                <input type="number" required value={alertForm.value} onChange={(e) => setAlertForm({ ...alertForm, value: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-[11px] font-bold outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Alert Emails (comma-separated)</label>
              <input value={alertForm.emailInput} onChange={(e) => setAlertForm({ ...alertForm, emailInput: e.target.value })} placeholder="ops@company.com" className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider cursor-pointer">Save Alert Rule</button>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
