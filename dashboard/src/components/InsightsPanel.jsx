import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { exportToCSV } from "../utils/exportUtils.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  DollarSign,
  PieChart,
  Activity,
  ChevronRight,
  ArrowUpRight,
  User,
  X,
  Search,
  Phone,
  Mail,
  ArrowRight,
  CheckSquare,
  RefreshCw,
  Download
} from "lucide-react";

export default function InsightsPanel({ websiteId, onViewLead }) {
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Drill-down Drawer State
  const [drawerConfig, setDrawerConfig] = useState(null); // { stageKey, title }
  const [drawerLeads, setDrawerLeads] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerPage, setDrawerPage] = useState(1);
  const [topLeadsPage, setTopLeadsPage] = useState(1);

  const loadStats = async () => {
    setLoading(true);
    try {
      const query = websiteId ? `?websiteId=${websiteId}` : "";
      const data = await api(`/api/analytics/sales${query}`);
      setStats(data);
    } catch (err) {
      console.error("Failed to load sales analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [websiteId]);

  const openDrillDown = async (stageKey, title) => {
    setDrawerConfig({ stageKey, title });
    setDrawerLoading(true);
    setDrawerSearch("");
    setDrawerPage(1);
    try {
      const stageParam = stageKey && stageKey !== "all" ? `&pipelineStage=${stageKey}` : "";
      const query = websiteId ? `?websiteId=${websiteId}&limit=1000&view=all${stageParam}` : `?limit=1000&view=all${stageParam}`;
      const res = await api(`/api/crm/customers${query}`);
      const rawLeads = Array.isArray(res) ? res : res.customers || res.data || [];
      
      const filtered = rawLeads.filter(l => {
        if (stageKey === "all") return true;
        const pStage = String(l.pipelineStage || "").toLowerCase().trim();
        const sKey = String(stageKey || "").toLowerCase().trim();

        if (sKey === "contacted") return pStage === "contacted";
        if (sKey === "new") return pStage === "new";
        if (sKey === "qualified") return pStage === "qualified";
        if (sKey === "negotiation") return pStage === "negotiation";
        if (sKey === "proposal_sent" || sKey === "proposal") return pStage === "proposal_sent" || pStage === "proposal";
        if (sKey === "won") return pStage === "won" || pStage === "closed_won" || pStage === "closed won";
        if (sKey === "lost") return pStage === "lost" || pStage === "closed_lost" || pStage === "closed lost";

        return pStage === sKey;
      });
      setDrawerLeads(filtered);
    } catch (err) {
      console.error("Failed to load drilldown leads", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
      <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculating performance vectors...</p>
    </div>
  );

  if (!stats) return null;

  const { summary, pipeline, topLeads = [], interactions = [], sources = [], tasks = [], lostReasons = [] } = stats;
  const totalInteractions = interactions.reduce((sum, i) => sum + (i.count || 0), 0);
  const openTasksCount = tasks.find(t => t._id === "open")?.count || 0;
  const growthInsight = summary.totalLeads === 0
    ? "No active leads captured for this website yet. Promote chat visitors or add leads to start tracking conversion velocity."
    : totalInteractions === 0
    ? `You have ${summary.totalLeads} active leads with 0 logged calls, meetings, or emails in the last 30 days. Start logging touchpoints to improve conversion.`
    : `${totalInteractions} customer touchpoints logged in the last 30 days across ${summary.totalLeads} leads (${summary.conversionRate || 0}% conversion, ${openTasksCount} open tasks).`;

  const handleExportInsightsCSV = () => {
    const rows = (topLeads || []).map((lead) => ({
      "Lead": lead.name || "-",
      "Company": lead.companyName || "-",
      "Stage": lead.pipelineStage || "-",
      "Potential Value": lead.leadValue || 0
    }));
    exportToCSV(rows, `Sales_Insights_${new Date().toISOString().slice(0, 10)}`);
  };

  const filteredDrawerLeads = drawerLeads.filter(l => {
    if (!drawerSearch.trim()) return true;
    const q = drawerSearch.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.companyName?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Compact Toolbar */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200/80 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
            Real-time Sales Telemetry ({summary.totalLeads || 0} Leads)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportInsightsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={loadStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Top Level KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Pipeline Value"
          value={formatCurrency(summary.totalPipelineValue || 0)}
          icon={<DollarSign size={16} />}
          subValue={`${summary.totalLeads || 0} Active Leads`}
          color="bg-indigo-600"
          onClick={() => openDrillDown("all", "All Active Pipeline Leads")}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${summary.conversionRate || 0}%`}
          icon={<Target size={16} />}
          subValue="Closed Won vs Total"
          color="bg-emerald-500"
          onClick={() => openDrillDown("won", "Closed Won Opportunities")}
        />
        <KpiCard
          label="Avg Deal Size"
          value={formatCurrency(summary.averageDealSize || 0)}
          icon={<TrendingUp size={16} />}
          subValue="Revenue per lead"
          color="bg-violet-500"
          onClick={() => openDrillDown("all", "Deal Value Analytics")}
        />
        <KpiCard
          label="Won Revenue"
          value={formatCurrency(summary.wonRevenue || 0)}
          icon={<Zap size={16} />}
          subValue="Total realized income"
          color="bg-amber-500"
          onClick={() => openDrillDown("won", "Realized Won Revenue Leads")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Pipeline Distribution & Interactive Stage Bars ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Pipeline Maturity & Stage Drilldown</h3>
                 <p className="text-[10px] font-medium text-slate-400 mt-0.5">Click any stage bar to inspect matching leads in real-time</p>
              </div>
              <BarChart3 className="text-slate-300" size={18} />
           </div>

           <div className="space-y-2">
              {["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"].map(stage => {
                 const data = pipeline.find(p => p._id === stage || (stage === "proposal" && (p._id === "proposal" || p._id === "proposal_sent"))) || { count: 0, totalValue: 0 };
                 const percentage = summary.totalLeads > 0 ? (data.count / summary.totalLeads) * 100 : 0;
                 const stageLabels = {
                   new: "New Lead",
                   contacted: "Contacted",
                   qualified: "Qualified",
                   proposal: "Proposal Sent",
                   proposal_sent: "Proposal Sent",
                   negotiation: "Negotiation",
                   won: "Closed Won",
                   lost: "Closed Lost"
                 };

                 return (
                    <button
                      key={stage}
                      onClick={() => openDrillDown(stage, `${stageLabels[stage] || stage} Leads`)}
                      className="w-full text-left space-y-1.5 group p-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                    >
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="text-slate-600 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${stage === 'won' ? 'bg-emerald-500' : stage === 'lost' ? 'bg-rose-400' : 'bg-indigo-500'}`} />
                            {stageLabels[stage] || stage}
                          </span>
                          <span className="text-slate-900 font-extrabold flex items-center gap-2.5">
                            <span>{data.count} Leads</span>
                            <span className="text-indigo-600 font-black">{formatCurrency(data.totalValue || 0)}</span>
                            <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                          </span>
                       </div>
                       <div className="h-2.5 bg-slate-100/80 rounded-full overflow-hidden border border-slate-100 p-0.5">
                          <div
                             className={`h-full rounded-full transition-all duration-700 ${
                                stage === 'won' ? 'bg-emerald-500' : stage === 'lost' ? 'bg-rose-400' : 'bg-indigo-600'
                             }`}
                             style={{ width: `${Math.max(percentage, 3)}%` }}
                          />
                       </div>
                    </button>
                 );
              })}
           </div>
        </div>

        {/* ── Activity Fuel & Productivity gauge (White Theme) ── */}
        <div className="bg-white rounded-2xl p-4 text-slate-900 border border-slate-200/80 shadow-sm flex flex-col justify-between">
           <div>
             <div className="flex items-center justify-between">
               <div>
                 <h3 className="text-xs font-black uppercase tracking-tight text-slate-900">Activity Fuel</h3>
                 <p className="text-[10px] font-medium text-slate-400 mt-0.5">Last 30 days interaction log</p>
               </div>
               <Activity size={16} className="text-indigo-500" />
             </div>

             <div className="mt-4 space-y-2.5">
                {['call', 'meeting', 'manual_email'].map(type => {
                   const count = interactions.find(i => i._id === type)?.count || 0;
                   return (
                      <div key={type} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                         <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                               {type === 'call' ? <Phone size={14} /> : type === 'meeting' ? <User size={14} /> : <Mail size={14} />}
                            </div>
                            <div>
                               <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">{type.replace('_', ' ')}s</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{count > 0 ? 'Active' : 'No Logs'}</p>
                            </div>
                         </div>
                         <span className="text-lg font-black text-slate-900">{count}</span>
                      </div>
                   );
                })}
             </div>
           </div>

           <div className="mt-4 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-1">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Live Telemetry Insight</p>
              <p className="text-[11px] font-medium leading-snug text-slate-600">{growthInsight}</p>
           </div>
        </div>
      </div>

      {/* ── Additional Analytics: Lead Sources & Lost Reasons ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Lead Source Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Lead Source Distribution</h3>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Acquisition channels & revenue generated</p>
            </div>
            <PieChart className="text-slate-300" size={18} />
          </div>

          <div className="space-y-2.5">
            {sources.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center py-6">No source telemetry captured yet</p>
            ) : (
              sources.map(src => {
                const totalSrcVal = sources.reduce((a, b) => a + (b.totalValue || 0), 0);
                const pct = totalSrcVal > 0 ? ((src.totalValue || 0) / totalSrcVal) * 100 : 0;

                return (
                  <div key={src._id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="uppercase text-slate-800 tracking-wide">{src._id || "Direct / Organic"}</span>
                      <span className="text-indigo-600">{formatCurrency(src.totalValue || 0)} <span className="text-slate-400 font-bold text-[10px]">({src.count} leads)</span></span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 5)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Task Velocity & Loss Intelligence */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Follow-up Task Execution</h3>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Pending vs Completed Customer Activities</p>
            </div>
            <CheckSquare className="text-slate-300" size={18} />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-0.5">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Completed</p>
              <p className="text-xl font-black text-emerald-900">{tasks.find(t => t._id === "completed")?.count || 0}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center space-y-0.5">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">In Progress</p>
              <p className="text-xl font-black text-amber-900">{tasks.find(t => t._id === "in_progress")?.count || 0}</p>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center space-y-0.5">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Open Due</p>
              <p className="text-xl font-black text-indigo-900">{openTasksCount}</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Deal Loss Prevention Analysis</h4>
            {lostReasons.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center py-3">No lost deal reasons logged</p>
            ) : (
              lostReasons.map(lr => (
                <div key={lr._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-black">
                  <span className="text-slate-700 capitalize">{lr._id}</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[9px] border border-rose-100">{lr.count} Deals Lost</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Top Deals Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
         <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">High-Impact Opportunities</h3>
               <p className="text-[10px] font-medium text-slate-400 mt-0.5">Top leads ranked by potential deal value</p>
            </div>
            <ArrowUpRight className="text-slate-300" size={18} />
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/70">
                     <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Lead Entity</th>
                     <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Stage</th>
                     <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Potential Value</th>
                     <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {topLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        No opportunities available for this website yet
                      </td>
                    </tr>
                  ) : getPaginationMeta(topLeads, topLeadsPage, 8).pageItems.map(lead => (
                     <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                           <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                 <User size={12} />
                              </div>
                              <div>
                                 <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{lead.name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lead.companyName || "No Company"}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                           <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-indigo-100">
                              {lead.pipelineStage}
                           </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-indigo-600 text-[11px]">
                           {formatCurrency(lead.leadValue || 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                           <button
                              onClick={() => onViewLead && onViewLead(lead)}
                              className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                           >
                              <ChevronRight size={15} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {topLeads.length > 0 && (() => {
           const pagedTop = getPaginationMeta(topLeads, topLeadsPage, 8);
           return (
             <div className="px-4 py-2.5 border-t border-slate-100">
               <PaginationControls
                 currentPage={pagedTop.currentPage}
                 totalPages={pagedTop.totalPages}
                 totalItems={pagedTop.totalItems}
                 itemLabel="leads"
                 onPageChange={setTopLeadsPage}
               />
             </div>
           );
         })()}
      </div>

      {/* ── Interactive Drill-down Drawer ── */}
      {drawerConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white text-slate-900">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Drilldown Telemetry</p>
                <h3 className="text-sm font-black tracking-tight">{drawerConfig.title}</h3>
              </div>
              <button
                onClick={() => setDrawerConfig(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Search Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => { setDrawerSearch(e.target.value); setDrawerPage(1); }}
                  placeholder="Filter leads in this stage by name, company, email, phone..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {drawerLoading ? (
                <div className="py-12 text-center space-y-2.5">
                  <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching matching leads...</p>
                </div>
              ) : filteredDrawerLeads.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">No matching leads in this stage</p>
                </div>
              ) : (
                getPaginationMeta(filteredDrawerLeads, drawerPage, 8).pageItems.map(lead => (
                  <div key={lead._id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-200 transition-all shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                          {lead.name?.charAt(0)?.toUpperCase() || "L"}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">{lead.name}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{lead.companyName || "Individual Customer"}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-indigo-600">{formatCurrency(lead.leadValue || 0)}</p>
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[8px] font-black uppercase tracking-wider text-slate-600">
                          {lead.pipelineStage}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
                      {lead.email && <div className="truncate">{lead.email}</div>}
                      {lead.phone && <div>{lead.phone}</div>}
                      {lead.ownerId?.name && <div>Agent: {lead.ownerId.name}</div>}
                      {lead.createdAt && <div>{new Date(lead.createdAt).toLocaleDateString()}</div>}
                    </div>

                    <button
                      onClick={() => {
                        setDrawerConfig(null);
                        onViewLead && onViewLead(lead);
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      View & Manage Lead <ArrowRight size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {!drawerLoading && filteredDrawerLeads.length > 0 && (() => {
              const pagedDrawer = getPaginationMeta(filteredDrawerLeads, drawerPage, 8);
              return (
                <div className="p-3 border-t border-slate-100 bg-white">
                  <PaginationControls
                    currentPage={pagedDrawer.currentPage}
                    totalPages={pagedDrawer.totalPages}
                    totalItems={pagedDrawer.totalItems}
                    itemLabel="leads"
                    onPageChange={setDrawerPage}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}

function KpiCard({ label, value, icon, subValue, color, onClick }) {
   return (
      <div
        onClick={onClick}
        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden relative cursor-pointer"
      >
         <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</h4>
            <div className={`w-8 h-8 rounded-xl ${color} text-white flex items-center justify-center shadow-sm`}>
               {icon}
            </div>
         </div>
         <p className="text-xl font-black text-slate-900 tracking-tight">{value}</p>
         <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            {subValue}
         </p>
      </div>
   );
}
