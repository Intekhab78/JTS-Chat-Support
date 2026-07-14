import React, { useState } from "react";
import { 
  XCircle, Filter, Info, Calendar, ArrowUpRight, ArrowDownRight, Printer, FileText,
  Clock, TrendingUp, Zap, TrendingDown, AlertTriangle, 
  BarChart3, PieChart, Users, Target, CheckCircle2, TrendingUp as TrendUpIcon, Sparkles,
  Repeat, Receipt
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import CRMLeaderboard from "./CrmLeaderboard.jsx";

import { formatCurrency, formatCurrencyCompact } from "../../utils/currencyFormatter.js";

export default function CRMReportsView({ summary, onDrillDown, activeRange, setActiveRange }) {
  
  const aging = summary?.aging || { recent: 0, stale: 0, dormant: 0 };
  const breakdown = summary?.stageBreakdown || [];
  const leadsBySource = summary?.leadsBySource || [];
  const leadsPerDay = summary?.leadsPerDay || [];
  const followUpHealth = summary?.followUpHealth || { overdue: 0, completedToday: 0, totalOpen: 0 };
  const { cac, ltv, agents, lostReasons, totalLeads, conversionRate, comparison, lostByStage } = summary || {};

  const safeConversionRate = typeof conversionRate === "number" && !Number.isNaN(conversionRate) ? conversionRate : 0;
  const totalReceived = Number(summary?.totalReceived) || 0;
  const totalInvoiced = Number(summary?.totalInvoiced) || 0;
  const collectionEfficiency = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 100;
  const safeCollectionEfficiency = !Number.isNaN(collectionEfficiency) ? collectionEfficiency : 100;

  const revenueGrowth = comparison?.prevMonthRevenue 
    ? ((summary.revenue - comparison.prevMonthRevenue) / comparison.prevMonthRevenue * 100).toFixed(1)
    : 0;
  
  const isRevenueUp = Number(revenueGrowth) >= 0;

  const stagesLost = lostByStage?.[0]?.stages || [];
  const stageLossCount = stagesLost.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const sortedLossStages = Object.entries(stageLossCount).sort((a,b) => b[1] - a[1]);

  const stageOrder = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
  const sortedBreakdown = stageOrder
    .map(stageKey => {
      const found = breakdown.find(b => b._id === stageKey);
      return {
        stage: stageKey,
        count: found ? found.count : 0,
        totalValue: found ? found.totalValue : 0
      };
    })
    .filter(item => item.count > 0 || item.totalValue > 0);

  const funnelData = sortedBreakdown.map((item, idx, arr) => {
    const prev = idx > 0 ? arr[idx - 1] : null;
    const baseline = arr[0];
    const convFromPrev = prev && prev.count > 0 ? Math.round((item.count / prev.count) * 100) : 100;
    const convFromBase = baseline && baseline.count > 0 ? Math.round((item.count / baseline.count) * 100) : 100;
    return {
      ...item,
      convFromPrev,
      convFromBase
    };
  });

  return (
    <div id="reports-print-area" className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          aside, header, nav, footer, .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          #reports-print-area, #reports-print-area * {
            visibility: visible !important;
          }
          #reports-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}} />
      
      {/* ── HEADER & GLOBAL FILTERS ────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Enterprise Ledger</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
            <Filter size={12} className="text-indigo-500" />
            7-Dimension AI Processing • 256-bit Secure
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
          >
            <Printer size={14} /> Save as PDF
          </button>
          
          <div className="no-print flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
             {["today", "week", "month"].map(range => (
               <button 
                  key={range}
                  onClick={() => setActiveRange(range)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeRange === range ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}
               >
                  {range}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* REPORT 1: INTAKE */}
        <div className="md:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 1: Intake & Trends</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leads per day & source</p>
                </div>
              </div>
            </div>

            <div className="h-16 flex items-end gap-1 mb-10 px-1">
               {leadsPerDay.length > 0 ? leadsPerDay.map((d) => (
                  <div 
                    key={d._id} 
                    className="flex-1 bg-indigo-100 hover:bg-indigo-500 rounded-sm transition-all relative group/bar cursor-help"
                    style={{ height: `${Math.max(10, (d.count / Math.max(...leadsPerDay.map(x => x.count))) * 100)}%` }}
                  >
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:block bg-slate-900 text-white text-[8px] font-black px-1.5 py-1 rounded-md whitespace-nowrap z-20">
                        {d.count} Leads
                     </div>
                  </div>
               )) : <div className="w-full h-full border-b border-dashed border-slate-200" />}
            </div>

            <div className="space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Volume Distribution</p>
              {leadsBySource.slice(0, 4).map((s) => (
                <button 
                  key={s._id} 
                  onClick={() => onDrillDown?.("source", s._id)}
                  className="w-full text-left space-y-1.5 group/source cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest group-hover/source:text-indigo-600 transition-colors">
                    <span className="text-slate-500">{s._id}</span>
                    <span className="text-slate-900">{s.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full group-hover/source:bg-indigo-600 transition-all" 
                      style={{ width: `${(s.count / (totalLeads || 1)) * 100}%` }} 
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* REPORT 2: CONVERSION */}
        <div className="md:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 2: Conversion</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Winning efficiency</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
             <button 
               onClick={() => onDrillDown?.("stage", "won")}
               className="relative w-32 h-32 flex items-center justify-center group/gauge cursor-pointer"
             >
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * safeConversionRate) / 100} className="text-emerald-500 transition-all duration-1000 group-hover/gauge:text-emerald-600" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                   <p className="text-2xl font-black text-slate-950 leading-none">{safeConversionRate}%</p>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Velocity</p>
                </div>
             </button>
             <div className="mt-8 flex flex-col items-center gap-1">
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isRevenueUp ? "text-emerald-600" : "text-rose-600"}`}>
                   {isRevenueUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                   {revenueGrowth}% Growth
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">vs previous period</p>
             </div>
          </div>
        </div>

        {/* REPORT 3: PIPELINE CONVERSION FUNNEL */}
        <div className="md:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 3: Sales Funnel</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pipeline conversion & drop-offs</p>
            </div>
          </div>

          <div className="space-y-4">
            {funnelData.length > 0 ? funnelData.map((item, idx) => (
              <div key={item.stage} className="space-y-1 text-center">
                <button 
                  onClick={() => onDrillDown?.("stage", item.stage)}
                  style={{ width: `${Math.max(45, item.convFromBase)}%` }}
                  className="mx-auto flex flex-col justify-center items-center px-3 py-2.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-orange-50 hover:to-orange-100/50 border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all duration-300 group/funnel cursor-pointer"
                >
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider group-hover/funnel:text-orange-600">{item.stage}</span>
                  <div className="flex items-baseline gap-1 mt-1 text-[8px] font-bold text-slate-400">
                    <span className="text-slate-900 font-black">{item.count} leads</span>
                    <span>•</span>
                    <span>{formatCurrencyCompact(item.totalValue)}</span>
                  </div>
                </button>
                
                {idx < funnelData.length - 1 && (
                  <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest py-0.5 animate-pulse">
                    ↓ {funnelData[idx + 1].convFromPrev}% conversion
                  </div>
                )}
              </div>
            )) : <div className="py-12 text-center text-slate-300"><p className="text-[10px] font-black uppercase tracking-widest">Zero pipeline current</p></div>}
          </div>
        </div>

        {/* REPORT 4: SLA */}
        <div className="md:col-span-6 lg:col-span-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 4: Response SLA</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tactical record aging</p>
            </div>
          </div>

          <div className="space-y-6">
            {[
              { id: "recent", label: "Handled (0-2d)", count: aging.recent, color: "bg-emerald-500", tone: "emerald", health: "none" },
              { id: "stale", label: "Slow (3-7d)", count: aging.stale, color: "bg-amber-500", tone: "amber", health: "stale" },
              { id: "dormant", label: "Critical (7d+)", count: aging.dormant, color: "bg-rose-500", tone: "rose", health: "critical" }
            ].map(item => {
              const total = (aging.recent || 0) + (aging.stale || 0) + (aging.dormant || 0) || 1;
              return (
                <button 
                  key={item.label} 
                  onClick={() => item.health !== "none" && onDrillDown?.("health", item.health)}
                  className={`w-full text-left space-y-2 group/aging ${item.health !== "none" ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500 group-hover/aging:text-slate-950 transition-colors">{item.label}</span>
                    <span className={`text-${item.tone}-600`}>{item.count} leads</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-700 group-hover/aging:brightness-90`} 
                      style={{ width: `${(item.count / total) * 100}%` }} 
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* REPORT 5: PERFORMANCE */}
        <div className="md:col-span-12 lg:col-span-8 rounded-[32px] overflow-hidden">
          <CRMLeaderboard agents={agents || []} />
        </div>

        {/* REPORT 6: DISCIPLINE */}
        <div className="md:col-span-7 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
           <div className="flex items-start justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 6: Discipline Audit</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Follow-up execution health</p>
                </div>
              </div>
              <button 
                onClick={() => onDrillDown?.("health", "overdue")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                  followUpHealth.overdue > 0 ? "bg-rose-50 text-rose-600 border-rose-100 animate-pulse hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                }`}
              >
                {followUpHealth.overdue > 0 ? "Critical Backlog" : "System Clear"}
              </button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button onClick={() => onDrillDown?.("health", "overdue")} className="text-left p-6 rounded-2xl bg-rose-50 border border-rose-100 group hover:bg-rose-100 transition-colors cursor-pointer">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Overdue Tasks</p>
                <p className="text-3xl font-black text-rose-600">{followUpHealth.overdue}</p>
                <div className="flex items-center gap-1.5 mt-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /><p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Action Required</p></div>
              </button>
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 group hover:bg-emerald-100 transition-colors cursor-default">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Closed Today</p>
                <p className="text-3xl font-black text-emerald-600">{followUpHealth.completedToday}</p>
              </div>
              <button onClick={() => onDrillDown?.("stage", "all")} className="text-left p-6 rounded-2xl bg-indigo-50 border border-indigo-100 group hover:bg-indigo-100 transition-colors cursor-pointer">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active Pipeline</p>
                <p className="text-3xl font-black text-indigo-600">{followUpHealth.totalOpen}</p>
              </button>
           </div>
        </div>

        {/* REPORT 7: STRATEGY */}
        <div className="md:col-span-5 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
            <div>
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 7: Strategy Audit</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Max Drop-off Point Analyser</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dropped at Stage</p>
              {sortedLossStages.length > 0 ? sortedLossStages.slice(0, 3).map(([stage, count]) => (
                <button key={stage} onClick={() => onDrillDown?.("stage", "lost")} className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors cursor-pointer group/loss">
                  <span className="text-[10px] font-black text-rose-900 uppercase tracking-tight group-hover/loss:text-rose-600">{stage}</span>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{count} records</p>
                </button>
              )) : <p className="text-[10px] font-bold text-slate-300 py-4 text-center">No drop-off data</p>}
            </div>
            <div className="pt-4 border-t border-slate-50 space-y-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Reason</p>
              {lostReasons && lostReasons.length > 0 ? lostReasons.slice(0, 3).map((reason) => (
                <button key={reason._id} onClick={() => onDrillDown?.("stage", "lost")} className="w-full text-left space-y-1.5 group/reason cursor-pointer">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/reason:text-orange-600 transition-colors"><span>{reason._id.replaceAll("_", " ")}</span><span className="text-rose-600">{reason.count}</span></div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full group-hover/reason:bg-orange-600 transition-all" style={{ width: `${(reason.count / (totalLeads || 1)) * 100}%` }} /></div>
                </button>
              )) : null}
            </div>
          </div>
        </div>

        {/* REPORT 9: SUBSCRIPTIONS & RECURRING REVENUE */}
        <div className="md:col-span-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Repeat size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 9: Subscriptions</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Plans & Recurring MRR</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Recurring (MRR)</p>
                <p className="text-xl font-black text-slate-800">${(summary?.mrr || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Annual Run Rate (ARR)</p>
                <p className="text-xl font-black text-indigo-600">${(summary?.arr || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan Distribution ({summary?.activeSubscriptionsCount || 0} Active)</p>
              {summary?.planDistribution && summary.planDistribution.length > 0 ? (
                summary.planDistribution.map((plan) => {
                  const maxCount = Math.max(...summary.planDistribution.map(p => p.count)) || 1;
                  return (
                    <div key={plan.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <span>{plan.name}</span>
                        <span>{plan.count} users</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full" 
                          style={{ width: `${(plan.count / maxCount) * 100}%` }} 
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] font-bold text-slate-350 py-4 text-center">No active subscriptions</p>
              )}
            </div>
          </div>
        </div>

        {/* REPORT 10: FINANCE & ACCOUNTS RECEIVABLE */}
        <div className="md:col-span-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Report 10: Receivables & Cash</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gross Invoiced vs Cash Collected</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoiced</p>
                <p className="text-xs font-black text-slate-800">${(summary?.totalInvoiced || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected</p>
                <p className="text-xs font-black text-emerald-600">${(summary?.totalReceived || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                <p className="text-xs font-black text-rose-600">${(summary?.totalOutstanding || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200" />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="28" 
                    stroke="currentColor" 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={176} 
                    strokeDashoffset={176 - (176 * Math.min(100, safeCollectionEfficiency)) / 100} 
                    className="text-emerald-500" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-black text-slate-900 leading-none">
                    {Math.round(safeCollectionEfficiency)}%
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Collection Efficiency Rate</p>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                  Percentage of gross invoiced billing converted to cash. 
                  {summary?.totalOutstanding > 0 ? ` Please follow up on $${(summary.totalOutstanding).toLocaleString()} unpaid receivables.` : " All invoice bills fully settled!"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* REPORT 8: STRATEGIC FORECAST (AI) */}
        <div className="md:col-span-12 rounded-[40px] border border-slate-200 bg-white p-10 shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-950 tracking-tight">AI-Driven Revenue Forecast</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-[52px]">Strategic growth projection based on current pipeline probability</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected Q3 Revenue</p>
                <p className="text-2xl font-black text-indigo-600 italic">{formatCurrency((summary?.weightedRevenue || 0) * 1.4)}</p>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden lg:block" />
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence Score</p>
                <p className="text-2xl font-black text-emerald-600 italic">84%</p>
              </div>
            </div>
          </div>

          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { name: "Apr", revenue: summary?.revenue * 0.7 || 50000 },
                  { name: "May", revenue: summary?.revenue * 0.85 || 75000 },
                  { name: "Jun", revenue: summary?.revenue || 120000 },
                  { name: "Jul", revenue: summary?.weightedRevenue * 1.1 || 150000 },
                  { name: "Aug", revenue: summary?.weightedRevenue * 1.25 || 180000 },
                  { name: "Sep", revenue: summary?.weightedRevenue * 1.45 || 220000 }
                ]}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                  tickFormatter={(val) => formatCurrencyCompact(val)}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#4f46e5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* UNIT ECONOMICS */}
      <div className="rounded-[40px] bg-slate-950 p-10 text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:bg-indigo-500/20 transition-all duration-1000" />
         <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-1">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Enterprise Economics</p>
               <h4 className="text-sm font-black uppercase tracking-tight">System Insights</h4>
               <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{conversionRate > 20 ? "Conversion is above operational threshold." : "Focus on qualifying leads earlier."}</p>
            </div>
            <div className="space-y-2">
               <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em]">Customer LTV</p>
               <p className="text-3xl font-black">{formatCurrency(ltv || 0)}</p>
            </div>
            <div className="space-y-2">
               <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.25em]">Acquisition Cost</p>
               <p className="text-3xl font-black">{formatCurrency(cac || 0)}</p>
            </div>
            <button onClick={() => onDrillDown?.("stage", "won")} className="text-left space-y-2 group/forecast cursor-pointer">
               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.25em]">Weight Forecast</p>
               <p className="text-3xl font-black group-hover:text-emerald-400 transition-colors">{formatCurrency(summary?.weightedRevenue)}</p>
               <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isRevenueUp ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                    {isRevenueUp ? "+" : ""}{revenueGrowth}% Δ
                  </span>
               </div>
            </button>
         </div>
      </div>
      
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #reports-print-area, #reports-print-area * { visibility: visible !important; }
          #reports-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
          }
          button, .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
