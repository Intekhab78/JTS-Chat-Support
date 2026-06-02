import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Download, Globe, TrendingUp, Award } from "lucide-react";
import { API_BASE } from "../api/client.js";

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function DetailedAnalytics({ analytics }) {
  const leaderboard = analytics.leaderboard || [];
  const topCountries = analytics.topCountries || [];
  const feedback = analytics.feedback || { satisfactionRate: 0, satisfiedChats: 0, unsatisfiedChats: 0 };

  const pieData = [
    { name: 'Satisfied', value: feedback.satisfiedChats },
    { name: 'Unsatisfied', value: feedback.unsatisfiedChats }
  ].filter(d => d.value > 0);

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analytics/export/csv`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("dashboard_token")}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to authenticate or generate report");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Intelligence_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to generate and download intelligence report.");
    }
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h3 className="heading-md dark:text-white">Intelligence Reports</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Deep-dive into operational performance and user satisfaction.</p>
         </div>
         <button 
           onClick={handleExport}
           className="bg-slate-930 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100/10 flex items-center justify-center gap-3"
         >
           <Download size={16} />
           Export CSV Data
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <div className="premium-card p-8 space-y-4 border-l-4 border-l-indigo-500">
            <span className="small-label">Total Ecosystem Visitors</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{analytics.totals?.totalVisitors || 0}</h4>
               <span className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">All-time Traffic</span>
            </div>
         </div>
         <div className="premium-card p-8 space-y-4 border-l-4 border-l-emerald-500">
            <span className="small-label">Active Engagement</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{analytics.totals?.liveSessions || 0}</h4>
               <span className="text-[10px] text-emerald-500 font-black mb-1.5 uppercase tracking-wider">Live Now</span>
            </div>
         </div>
         <div className="premium-card p-8 space-y-4 border-l-4 border-l-purple-500">
            <span className="small-label">Tickets Resolved</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{analytics.totals?.resolvedTickets || 0}</h4>
               <span className="text-[10px] text-purple-500 font-black mb-1.5 uppercase tracking-wider">Closure Count</span>
            </div>
         </div>
         <div className="premium-card p-8 space-y-4 border-l-4 border-l-amber-500">
            <span className="small-label">Satisfaction Health</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{feedback.satisfactionRate}%</h4>
               <span className="text-[10px] text-amber-500 font-black mb-1.5 uppercase tracking-wider">Sentiment Index</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="premium-card p-8 space-y-4">
            <span className="small-label font-black text-slate-400">Average Wait Time</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{analytics.sla?.avgWaitTimeSeconds || 0}s</h4>
               <span className="text-[10px] text-emerald-500 font-black mb-1.5 uppercase tracking-wider">Target: &lt;60s</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
               <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(100, (analytics.sla?.avgWaitTimeSeconds / 60) * 100)}%` }}></div>
            </div>
         </div>
         <div className="premium-card p-8 space-y-4">
            <span className="small-label font-black text-slate-400">Initial Response SLA</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{analytics.sla?.avgResponseTimeSeconds || 0}s</h4>
               <span className="text-[10px] text-emerald-500 font-black mb-1.5 uppercase tracking-wider">Target: &lt;30s</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
               <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, (analytics.sla?.avgResponseTimeSeconds / 30) * 100)}%` }}></div>
            </div>
         </div>
         <div className="premium-card p-8 space-y-4">
            <span className="small-label font-black text-slate-400">Resolution Velocity</span>
            <div className="flex items-end gap-3">
               <h4 className="text-3xl font-black text-slate-900 dark:text-white">{analytics.sla?.avgHandleTimeMinutes || 0}m</h4>
               <span className="text-[10px] text-amber-500 font-black mb-1.5 uppercase tracking-wider">Target: &lt;15m</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
               <div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min(100, (analytics.sla?.avgHandleTimeMinutes / 15) * 100)}%` }}></div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Feedback Chart */}
         <div className="premium-card p-10 flex flex-col items-center justify-center space-y-8 bg-white dark:bg-slate-900 transition-colors">
            <div className="text-center">
               <span className="small-label">Satisfaction Score</span>
               <h4 className="text-4xl font-black text-slate-900 dark:text-white mt-3 tracking-tighter">{feedback.satisfactionRate}%</h4>
            </div>
            <div className="h-[220px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={pieData.length ? pieData : [{ name: 'No Data', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                     >
                        {pieData.length ? pieData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        )) : <Cell fill="#f1f5f9" className="dark:fill-white/5" />}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px', fontWeight: '900' }}
                     />
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping opacity-20"></div>
               </div>
            </div>
            <div className="flex gap-8 justify-center w-full">
               <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Satisfied ({feedback.satisfiedChats})</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Unsatisfied ({feedback.unsatisfiedChats})</span>
               </div>
            </div>
         </div>

         {/* Leaderboard */}
         <div className="lg:col-span-2 premium-card p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900 transition-colors">
            <div className="p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-slate-50/20 dark:bg-black/10">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-xl">
                     <Award className="text-indigo-500" size={20} />
                  </div>
                  <h3 className="heading-md dark:text-white">Agent Leaderboard</h3>
               </div>
               <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Performance Ranking</span>
            </div>
            <div className="flex-1 overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50/30 dark:bg-white/5">
                        <th className="p-6 small-label">Agent Identity</th>
                        <th className="p-6 small-label text-center">Volume</th>
                        <th className="p-6 small-label text-center">Avg Handle</th>
                        <th className="p-6 small-label text-right">Momentum</th>
                     </tr>
                  </thead>
                  <tbody>
                     {leaderboard.map((agent, i) => (
                        <tr key={agent._id} className="border-t border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                           <td className="p-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-slate-950 dark:bg-black text-white flex items-center justify-center font-black text-xs uppercase shadow-lg group-hover:scale-110 transition-transform border border-white/5">
                                    {agent.name.split(" ").map(n => n[0]).join("")}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[150px] tracking-tight">{agent.name}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate max-w-[150px]">{agent.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="p-6 text-center">
                              <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-3 py-1.5 rounded-xl">{agent.chatsHandled}</span>
                           </td>
                           <td className="p-6 text-center">
                              <span className="text-xs font-black text-slate-400 dark:text-slate-500 font-mono italic">{Math.round(agent.avgHandleSeconds || 0)}s</span>
                           </td>
                           <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                 {Array.from({ length: 5 }).map((_, star) => (
                                    <div key={star} className={`w-2 h-2 rounded-full transition-all duration-500 ${star < 5 - i ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                 ))}
                              </div>
                           </td>
                        </tr>
                     ))}
                     {leaderboard.length === 0 && (
                        <tr>
                           <td colSpan="4" className="p-20 text-center">
                              <div className="space-y-3">
                                 <Award size={32} className="text-slate-200 dark:text-slate-800 mx-auto" />
                                 <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">Insufficient data for ranking.</p>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Geography */}
         <div className="premium-card p-10 space-y-10 bg-white dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between">
               <div className="space-y-1.5">
                  <h3 className="heading-md dark:text-white">Global Footprint</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Traffic distribution by origin.</p>
               </div>
               <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <Globe className="text-emerald-500" size={24} />
               </div>
            </div>
            <div className="h-[320px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCountries} layout="vertical">
                     <CartesianGrid strokeDasharray="6 6" horizontal={false} stroke="#f1f5f9" className="dark:stroke-white/5" />
                     <XAxis type="number" hide />
                     <YAxis dataKey="country" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} width={90} />
                     <Tooltip 
                        cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px', fontWeight: '900' }}
                     />
                     <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
                        {topCountries.map((_, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Trends */}
         <div className="premium-card p-10 space-y-10 bg-white dark:bg-slate-900 transition-colors">
            <div className="flex items-center justify-between">
               <div className="space-y-1.5">
                  <h3 className="heading-md dark:text-white">Acquisition Momentum</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Monthly visitor growth.</p>
               </div>
               <div className="p-3 bg-indigo-500/10 rounded-xl">
                  <TrendingUp className="text-indigo-500" size={24} />
               </div>
            </div>
            <div className="h-[320px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.trends?.monthlyVisitors || []}>
                     <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" className="dark:stroke-white/5" />
                     <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                     <Tooltip 
                        cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px', fontWeight: '900' }}
                     />
                     <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={48} shadow={{ color: 'rgba(99,102,241,0.3)', blur: 10 }} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
