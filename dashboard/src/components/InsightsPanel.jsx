import { useState, useEffect } from "react";
import { api } from "../api/client.js";
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
  User
} from "lucide-react";

export default function InsightsPanel({ onViewLead }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api("/api/analytics/sales");
        setStats(data);
      } catch (err) {
        console.error("Failed to load sales analytics", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="p-20 text-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculating performance vectors...</p>
    </div>
  );

  if (!stats) return null;

  const { summary, pipeline, topLeads, interactions } = stats;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* ── Top Level KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Pipeline Value" 
          value={`INR ${summary.totalPipelineValue.toLocaleString()}`} 
          icon={<DollarSign size={20} />}
          subValue={`${summary.totalLeads} Active Leads`}
          color="bg-indigo-600"
        />
        <KpiCard 
          label="Conversion Rate" 
          value={`${summary.conversionRate}%`} 
          icon={<Target size={20} />}
          subValue="Closed Won vs Total"
          color="bg-emerald-500"
        />
        <KpiCard 
          label="Avg Deal Size" 
          value={`INR ${summary.averageDealSize.toLocaleString()}`} 
          icon={<TrendingUp size={20} />}
          subValue="Revenue per lead"
          color="bg-violet-500"
        />
        <KpiCard 
          label="Won Revenue" 
          value={`INR ${summary.wonRevenue.toLocaleString()}`} 
          icon={<Zap size={20} />}
          subValue="Total realized income"
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ── Pipeline Distribution ── */}
        <div className="xl:col-span-2 bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Pipeline Maturity</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Lead volume distribution by stage</p>
              </div>
              <BarChart3 className="text-slate-200" size={24} />
           </div>
           
           <div className="space-y-6">
              {["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"].map(stage => {
                 const data = pipeline.find(p => p._id === stage) || { count: 0, totalValue: 0 };
                 const percentage = summary.totalLeads > 0 ? (data.count / summary.totalLeads) * 100 : 0;
                 
                 return (
                    <div key={stage} className="space-y-2">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-500">{stage}</span>
                          <span className="text-slate-900">{data.count} Leads <span className="text-slate-300 ml-2">(INR {data.totalValue.toLocaleString()})</span></span>
                       </div>
                       <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                          <div 
                             className={`h-full rounded-full transition-all duration-1000 delay-300 ${
                                stage === 'won' ? 'bg-emerald-400' : stage === 'lost' ? 'bg-slate-300' : 'bg-indigo-500'
                             }`}
                             style={{ width: `${percentage}%` }}
                          />
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* ── Activity Score ── */}
        <div className="bg-slate-950 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Activity size={120} />
           </div>
           
           <h3 className="text-sm font-black uppercase tracking-tight relative z-10">Activity Fuel</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Last 30 days interaction log</p>
           
           <div className="mt-10 space-y-8 relative z-10">
              {['call', 'meeting', 'manual_email'].map(type => {
                 const count = interactions.find(i => i._id === type)?.count || 0;
                 return (
                    <div key={type} className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                             {type === 'call' ? <BarChart3 size={18} /> : type === 'meeting' ? <PieChart size={18} /> : <Zap size={18} />}
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase tracking-tight">{type.replace('_', ' ')}s</p>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{count > 0 ? 'Consistent performance' : 'Action needed'}</p>
                          </div>
                       </div>
                       <span className="text-xl font-black">{count}</span>
                    </div>
                 );
              })}
           </div>

           <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/5 relative z-10">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Pro Tip</p>
              <p className="text-[11px] font-medium leading-relaxed text-slate-300">Increasing your meeting volume by 15% correlates with a 22% higher conversion rate.</p>
           </div>
        </div>
      </div>

      {/* ── Top Deals Table ── */}
      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
         <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">High-Impact Deals</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Top 5 leads by potential revenue</p>
            </div>
            <ArrowUpRight className="text-slate-200" size={24} />
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
                        <td className="px-8 py-5 text-right font-black text-slate-900 text-xs">
                           INR {lead.leadValue.toLocaleString()}
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

    </div>
  );
}

function KpiCard({ label, value, icon, subValue, color }) {
   return (
      <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative">
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
