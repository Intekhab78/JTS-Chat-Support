import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Zap, 
  DollarSign, 
  PieChart, 
  Layers, 
  Activity,
  ChevronRight,
  TrendingDown,
  ArrowUpRight,
  User,
  X,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Building,
  Sparkles,
  ArrowRight,
  CheckSquare,
  FileText
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

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, [websiteId]);

  const openDrillDown = async (stageKey, title) => {
    setDrawerConfig({ stageKey, title });
    setDrawerLoading(true);
    setDrawerSearch("");
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
      setDrawerLeads(filtered.length > 0 ? filtered : rawLeads);
    } catch (err) {
      console.error("Failed to load drilldown leads", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  if (loading) return (
    <div className="p-20 text-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculating performance vectors...</p>
    </div>
  );

  if (!stats) return null;

  const { summary, pipeline, topLeads = [], interactions = [], sources = [], tasks = [], lostReasons = [] } = stats;

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Top Level KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Pipeline Value" 
          value={formatCurrency(summary.totalPipelineValue || 0)} 
          icon={<DollarSign size={20} />}
          subValue={`${summary.totalLeads || 0} Active Leads`}
          color="bg-indigo-600"
          onClick={() => openDrillDown("all", "All Active Pipeline Leads")}
        />
        <KpiCard 
          label="Conversion Rate" 
          value={`${summary.conversionRate || 0}%`} 
          icon={<Target size={20} />}
          subValue="Closed Won vs Total"
          color="bg-emerald-500"
          onClick={() => openDrillDown("won", "Closed Won Opportunities")}
        />
        <KpiCard 
          label="Avg Deal Size" 
          value={formatCurrency(summary.averageDealSize || 0)} 
          icon={<TrendingUp size={20} />}
          subValue="Revenue per lead"
          color="bg-violet-500"
          onClick={() => openDrillDown("all", "Deal Value Analytics")}
        />
        <KpiCard 
          label="Won Revenue" 
          value={formatCurrency(summary.wonRevenue || 0)} 
          icon={<Zap size={20} />}
          subValue="Total realized income"
          color="bg-amber-500"
          onClick={() => openDrillDown("won", "Realized Won Revenue Leads")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ── Pipeline Distribution & Interactive Stage Bars ── */}
        <div className="xl:col-span-2 bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-6">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pipeline Maturity & Stage Drilldown</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Click any stage bar to inspect matching leads in real-time</p>
              </div>
              <BarChart3 className="text-slate-300" size={24} />
           </div>
           
           <div className="space-y-5 pt-2">
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
                      className="w-full text-left space-y-2 group p-2.5 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                    >
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-600 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${stage === 'won' ? 'bg-emerald-500' : stage === 'lost' ? 'bg-rose-400' : 'bg-indigo-500'}`} />
                            {stageLabels[stage] || stage}
                          </span>
                          <span className="text-slate-900 font-extrabold flex items-center gap-3">
                            <span>{data.count} Leads</span>
                            <span className="text-indigo-600 font-black">{formatCurrency(data.totalValue || 0)}</span>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                          </span>
                       </div>
                       <div className="h-3.5 bg-slate-100/80 rounded-full overflow-hidden border border-slate-100 p-0.5">
                          <div 
                             className={`h-full rounded-full transition-all duration-1000 ${
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

        {/* ── Activity Fuel & Productivity gauge ── */}
        <div className="bg-slate-950 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-500/10 relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 p-12 opacity-10">
              <Activity size={140} />
           </div>
           
           <div>
             <h3 className="text-sm font-black uppercase tracking-tight relative z-10">Activity Fuel</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Last 30 days interaction log</p>
             
             <div className="mt-8 space-y-6 relative z-10">
                {['call', 'meeting', 'manual_email'].map(type => {
                   const count = interactions.find(i => i._id === type)?.count || 0;
                   return (
                      <div key={type} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                         <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400">
                               {type === 'call' ? <Phone size={18} /> : type === 'meeting' ? <User size={18} /> : <Mail size={18} />}
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-tight">{type.replace('_', ' ')}s</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{count > 0 ? 'Consistent performance' : 'Action needed'}</p>
                            </div>
                         </div>
                         <span className="text-xl font-black text-white">{count}</span>
                      </div>
                   );
                })}
             </div>
           </div>

           <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10 relative z-10 space-y-1.5">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Growth Intelligence</p>
              <p className="text-[11px] font-medium leading-relaxed text-slate-300">Increasing customer touchpoints by 15% directly increases deal closing probability by 22%.</p>
           </div>
        </div>
      </div>

      {/* ── Additional Analytics: Lead Sources & Lost Reasons ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lead Source Breakdown */}
        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Lead Source Distribution</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Acquisition channels & revenue generated</p>
            </div>
            <PieChart className="text-slate-300" size={24} />
          </div>

          <div className="space-y-4">
            {sources.length === 0 ? (
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center py-8">No source telemetry captured yet</p>
            ) : (
              sources.map(src => {
                const totalSrcVal = sources.reduce((a, b) => a + (b.totalValue || 0), 0);
                const pct = totalSrcVal > 0 ? ((src.totalValue || 0) / totalSrcVal) * 100 : 0;

                return (
                  <div key={src._id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="uppercase text-slate-800 tracking-wide">{src._id || "Direct / Organic"}</span>
                      <span className="text-indigo-600">{formatCurrency(src.totalValue || 0)} <span className="text-slate-400 font-bold text-[10px]">({src.count} leads)</span></span>
                    </div>
                    <div className="h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 5)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Task Velocity & Loss Intelligence */}
        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Follow-up Task Execution</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending vs Completed Customer Activities</p>
            </div>
            <CheckSquare className="text-slate-300" size={24} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Completed</p>
              <p className="text-2xl font-black text-emerald-900">{tasks.find(t => t._id === "completed")?.count || 0}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">In Progress</p>
              <p className="text-2xl font-black text-amber-900">{tasks.find(t => t._id === "in_progress")?.count || 0}</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center space-y-1">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Open Due</p>
              <p className="text-2xl font-black text-indigo-900">{tasks.find(t => t._id === "open")?.count || 0}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deal Loss Prevention Analysis</h4>
            {lostReasons.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No lost deal reasons logged</p>
            ) : (
              lostReasons.map(lr => (
                <div key={lr._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black">
                  <span className="text-slate-700 capitalize">{lr._id}</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-[10px] border border-rose-100">{lr.count} Deals Lost</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Top Deals Table ── */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
         <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">High-Impact Opportunities</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Top leads ranked by potential deal value</p>
            </div>
            <ArrowUpRight className="text-slate-300" size={24} />
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50">
                     <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Entity</th>
                     <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Stage</th>
                     <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Potential Value</th>
                     <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {topLeads.map(lead => (
                     <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                 <User size={14} />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{lead.name}</p>
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lead.companyName || "No Company"}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                              {lead.pipelineStage}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-indigo-600 text-xs">
                           {formatCurrency(lead.leadValue || 0)}
                        </td>
                        <td className="px-8 py-5 text-right">
                           <button 
                              onClick={() => onViewLead(lead)}
                              className="w-10 h-10 flex items-center justify-center rounded-2xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                           >
                              <ChevronRight size={18} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* ── Interactive Drill-down Drawer ── */}
      {drawerConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Drilldown Telemetry</p>
                <h3 className="text-lg font-black tracking-tight">{drawerConfig.title}</h3>
              </div>
              <button
                onClick={() => setDrawerConfig(null)}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Search Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  placeholder="Filter leads in this stage by name, company, email, phone..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Drawer Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {drawerLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching matching leads...</p>
                </div>
              ) : filteredDrawerLeads.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-wider">No matching leads in this stage</p>
                </div>
              ) : (
                filteredDrawerLeads.map(lead => (
                  <div key={lead._id} className="p-5 rounded-3xl border border-slate-100 bg-white hover:border-indigo-200 transition-all shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                          {lead.name?.charAt(0)?.toUpperCase() || "L"}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{lead.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lead.companyName || "Individual Customer"}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-600">{formatCurrency(lead.leadValue || 0)}</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-600">
                          {lead.pipelineStage}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                      {lead.email && <div className="truncate">✉️ {lead.email}</div>}
                      {lead.phone && <div>📞 {lead.phone}</div>}
                      {lead.ownerId?.name && <div>👤 Agent: {lead.ownerId.name}</div>}
                      {lead.createdAt && <div>📅 {new Date(lead.createdAt).toLocaleDateString()}</div>}
                    </div>

                    <button
                      onClick={() => {
                        setDrawerConfig(null);
                        onViewLead(lead);
                      }}
                      className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      View & Manage Lead <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
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
        className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative cursor-pointer"
      >
         <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${color} opacity-[0.03] group-hover:scale-150 transition-transform duration-700`} />
         <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg`}>
               {icon}
            </div>
         </div>
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</h4>
         <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
         <p className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1.5 uppercase tracking-widest">
            {subValue}
         </p>
      </div>
   );
}
