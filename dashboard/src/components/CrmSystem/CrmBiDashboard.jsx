import React, { useState, useEffect } from "react";
import { TrendingUp, Plus, ShieldAlert, Award, FileText, Download, BarChart2, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmBiDashboard({ websiteId }) {
  const [metrics, setMetrics] = useState({
    crm: { totalLeads: 0, wonDeals: 0, pipelineValue: 0, conversionRate: 0 },
    support: { totalTickets: 0, openTickets: 0, escalatedTickets: 0 },
    finance: { collectionsSum: 0, mrrEstimate: 0, arrEstimate: 0 },
    ai: { totalAiCost: 0 }
  });
  const [dashboards, setDashboards] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showWidgetForm, setShowWidgetForm] = useState(false);
  const [widgetForm, setWidgetForm] = useState({ title: "Custom Widget", type: "kpi", chartType: "bar", metric: "revenue" });

  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ name: "", metric: "revenue", operator: "gt", value: 0, emailInput: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const metricRes = await api(`/api/crm/bi/metrics?websiteId=${websiteId}`);
      if (metricRes) setMetrics(metricRes);

      const dbRes = await api(`/api/crm/bi/dashboards?websiteId=${websiteId}`);
      setDashboards(dbRes || []);

      const alertRes = await api(`/api/crm/bi/alerts?websiteId=${websiteId}`);
      setAlerts(alertRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleCreateWidget = async (e) => {
    e.preventDefault();
    try {
      const currentDb = dashboards[0] || { name: "Primary Dashboard", widgets: [] };
      const updatedWidgets = [...(currentDb.widgets || []), { ...widgetForm, id: `w_${Date.now()}` }];

      await api(`/api/crm/bi/dashboards`, {
        method: "POST",
        body: JSON.stringify({
          name: currentDb.name,
          widgets: updatedWidgets,
          websiteId
        })
      });

      setShowWidgetForm(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
      const emails = alertForm.emailInput.split(",").map(em => em.trim()).filter(Boolean);
      await api(`/api/crm/bi/alerts`, {
        method: "POST",
        body: JSON.stringify({ ...alertForm, emails, websiteId })
      });
      setShowAlertForm(false);
      setAlertForm({ name: "", metric: "revenue", operator: "gt", value: 0, emailInput: "" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ["Metric Group", "KPI Name", "Value"],
      ["CRM", "Total Leads", metrics.crm.totalLeads],
      ["CRM", "Won Deals", metrics.crm.wonDeals],
      ["CRM", "Pipeline Value ($)", metrics.crm.pipelineValue],
      ["CRM", "Conversion Rate (%)", `${metrics.crm.conversionRate}%`],
      ["Support", "Total Tickets", metrics.support.totalTickets],
      ["Support", "Open Tickets", metrics.support.openTickets],
      ["Support", "Escalated Tickets", metrics.support.escalatedTickets],
      ["Finance", "Total Collections ($)", metrics.finance.collectionsSum],
      ["Finance", "MRR Estimate ($)", metrics.finance.mrrEstimate],
      ["Finance", "ARR Estimate ($)", metrics.finance.arrEstimate],
      ["AI Platform", "Total Cost ($)", `$${metrics.ai.totalAiCost.toFixed(5)}`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BI_Report_${websiteId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-3 border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Enterprise Analytics & BI</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Real-time Multi-tenant Intelligence Board</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowWidgetForm(true)}
            className="flex-1 sm:flex-initial py-3 px-5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase text-slate-700 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Add Widget
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial py-3 px-5 bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-32 bg-slate-50 border rounded-3xl" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border p-6 rounded-[32px] flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Activity size={24} /></div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Conversion Rate</span>
                <p className="text-2xl font-black text-slate-900">{metrics.crm.conversionRate}%</p>
                <span className="text-[8px] font-bold text-slate-400 uppercase">{metrics.crm.wonDeals} deals won</span>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-[32px] flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total SaaS MRR</span>
                <p className="text-2xl font-black text-slate-900">${metrics.finance.mrrEstimate}</p>
                <span className="text-[8px] font-bold text-slate-400 uppercase">ARR: ${metrics.finance.arrEstimate}</span>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-[32px] flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><ShieldAlert size={24} /></div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Escalated Tickets</span>
                <p className="text-2xl font-black text-slate-900">{metrics.support.escalatedTickets}</p>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Open: {metrics.support.openTickets}</span>
              </div>
            </div>

            <div className="bg-white border p-6 rounded-[32px] flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><TrendingUp size={24} /></div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">AI Token Cost</span>
                <p className="text-2xl font-black text-slate-900">${metrics.ai.totalAiCost.toFixed(4)}</p>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Observability enabled</span>
              </div>
            </div>
          </div>

          {/* Interactive Widgets & Alert grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widgets Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><BarChart2 size={14} className="text-indigo-500" /> Custom Dashboard Layout</h4>
                
                {dashboards[0]?.widgets?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dashboards[0].widgets.map((w) => (
                      <div key={w.id} className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                          <span>{w.title}</span>
                          <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{w.type}</span>
                        </div>
                        <div className="text-center py-6">
                          {w.metric === "revenue" && <p className="text-2xl font-black text-slate-800">${metrics.finance.collectionsSum}</p>}
                          {w.metric === "tickets" && <p className="text-2xl font-black text-slate-800">{metrics.support.totalTickets} Tickets</p>}
                          {w.metric === "ai_cost" && <p className="text-2xl font-black text-slate-800">${metrics.ai.totalAiCost.toFixed(5)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">Add widgets to customize your primary dashboard layout.</p>
                )}
              </div>
            </div>

            {/* Threshold Alerts Settings */}
            <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={14} className="text-rose-500" /> Threshold Alerts</h4>
                  <button onClick={() => setShowAlertForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Plus size={12} /> Add Rule</button>
                </div>

                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-6">No threshold alerts.</p>
                  ) : (
                    alerts.map(al => (
                      <div key={al._id} className="p-3 bg-slate-50/50 border rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-slate-800">{al.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Metric: {al.metric} {al.operator === "gt" ? ">" : "<"} {al.value}</p>
                        </div>
                        <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">active</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Form Modal */}
      {showWidgetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowWidgetForm(false)} />
          <form onSubmit={handleCreateWidget} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Add Dashboard Widget</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Widget Title</label>
              <input required value={widgetForm.title} onChange={(e) => setWidgetForm({ ...widgetForm, title: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Widget Type</label>
                <select value={widgetForm.type} onChange={(e) => setWidgetForm({ ...widgetForm, type: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="kpi">KPI Card</option>
                  <option value="chart">Visual Chart</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Metric Source</label>
                <select value={widgetForm.metric} onChange={(e) => setWidgetForm({ ...widgetForm, metric: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="revenue">Total Collections</option>
                  <option value="tickets">Helpdesk Tickets</option>
                  <option value="ai_cost">AI Token Spend</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Create Widget</button>
          </form>
        </div>
      )}

      {/* Alert Form Modal */}
      {showAlertForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAlertForm(false)} />
          <form onSubmit={handleCreateAlert} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Configure Threshold Alert</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Alert Name</label>
              <input required value={alertForm.name} onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Metric</label>
                <select value={alertForm.metric} onChange={(e) => setAlertForm({ ...alertForm, metric: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="revenue">Revenue</option>
                  <option value="tickets">Open Tickets</option>
                  <option value="ai_cost">AI Token Spend</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Limit Value</label>
                <input type="number" required value={alertForm.value} onChange={(e) => setAlertForm({ ...alertForm, value: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Alert Emails (comma-separated)</label>
              <input value={alertForm.emailInput} onChange={(e) => setAlertForm({ ...alertForm, emailInput: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Alert Rule</button>
          </form>
        </div>
      )}
    </div>
  );
}
