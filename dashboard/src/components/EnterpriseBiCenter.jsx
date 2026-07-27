import React, { useState, useEffect } from "react";
import {
  TrendingUp, BarChart2, PieChart, Users, DollarSign, ShieldCheck, RefreshCw,
  Calendar, Layers, Filter, Plus, Save, Download, ArrowUpRight, Grid, Layout
} from "lucide-react";
import { api } from "../api/client.js";

export default function EnterpriseBiCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/enterprise-bi/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load BI overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Business Intelligence Engine...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const metrics = data?.metrics || {};
  const dashboards = data?.dashboards || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Business Intelligence & Executive Cockpit</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Revenue Forecasting, Cohort Analysis, Heatmaps, Sales Funnel & Scheduled Executive Digests
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors w-fit"
          title="Refresh Telemetry"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Primary BI Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">Executive BI Analytics Cockpit</span>
            <h3 className="text-xl font-black text-white mt-1">Real-Time Revenue & Compliance Intelligence</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.engineStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">MRR Growth Forecast</span>
            <strong className="text-emerald-400 font-bold">{metrics.mrrForecast}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">ARR Run Rate</span>
            <strong className="text-white font-bold">{metrics.arrForecast}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Compliance Health Index</span>
            <strong className="text-sky-400 font-bold">{metrics.complianceScore}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">12-Mo Cohort Retention</span>
            <strong className="text-amber-400 font-bold">{metrics.retentionRate}</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Executive BI Dashboard ({dashboards.length})
        </button>
        <button
          onClick={() => setActiveTab("widgets")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "widgets" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Widget Library & Chart Palette
        </button>
      </div>

      {/* Sub-Tab 1: Executive Dashboard Widgets */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {dashboards.map((dash) => (
            <div key={dash._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div>
                  <span className="text-[9px] font-black uppercase text-indigo-600">{dash.dashboardType} Dashboard</span>
                  <h3 className="text-base font-black text-slate-900">{dash.dashboardName}</h3>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-[9px] font-black uppercase">
                  Default Executive Layout
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(dash.widgets || []).map((w, idx) => (
                  <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{w.widgetName}</span>
                    <strong className="text-xl font-black text-slate-900 block">{w.metricValue}</strong>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[9px] font-mono text-indigo-600 font-bold">
                      <span>Type: {w.chartType.toUpperCase()}</span>
                      <ArrowUpRight size={14} />
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
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">
            Available BI Widget Library & Visualization Engines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-700">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="font-black text-slate-900 block">MRR Growth Area Chart</span>
              <span className="text-[10px] text-slate-400 font-normal">12-Month recurring revenue forecast</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="font-black text-slate-900 block">Sales Funnel Converter</span>
              <span className="text-[10px] text-slate-400 font-normal">Lead conversion rate tracking</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="font-black text-slate-900 block">Compliance Heatmap Grid</span>
              <span className="text-[10px] text-slate-400 font-normal">UAE VAT & Corporate Tax readiness</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="font-black text-slate-900 block">Cohort Retention Matrix</span>
              <span className="text-[10px] text-slate-400 font-normal">Monthly client retention analysis</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
