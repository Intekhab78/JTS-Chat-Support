import { useEffect, useState, useRef } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, MessageSquare, Clock, Star, Zap, Award, Target, CheckCircle, RefreshCcw, Activity, Users, Trophy } from "lucide-react";
import { api } from "../api/client.js";

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

function AnimatedCounter({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) {
      setCount(end);
      return;
    }

    let totalMiliseconds = duration;
    let incrementTime = (totalMiliseconds / end) > 10 ? (totalMiliseconds / end) : 10;

    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function AgentPerformanceView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [range, setRange] = useState("30"); // Default 30 days

  const fetchPerformance = async (isSilent = false, days = range) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const result = await api(`/api/analytics/agent?startDate=${new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString()}`);
      setData(result);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(() => fetchPerformance(true), 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [range]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-indigo-200" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Synchronizing Real-Time Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-card p-10 text-center space-y-4 border-red-100 bg-red-50/30">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm animate-bounce">
          <Zap size={32} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase">Sync Interrupted</h3>
          <p className="text-xs font-bold text-red-600 mt-1">{error}</p>
        </div>
        <button onClick={() => fetchPerformance()} className="px-8 py-3 bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200">Re-establish Connection</button>
      </div>
    );
  }

  const { totals, feedback, sla, trends, recentActivity } = data;
  const pieData = [
    { name: 'Satisfied', value: feedback.satisfiedChats },
    { name: 'Unsatisfied', value: feedback.unsatisfiedChats }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      {/* Top Header & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="heading-md dark:text-white">Agent Command Center</h3>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              Live Sync
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Global operational intelligence & performance metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5">
            {[
              { label: "7D", value: "7" },
              { label: "30D", value: "30" },
              { label: "90D", value: "90" }
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  range === r.value 
                    ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm" 
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Synchronized</p>
            <p className="text-[10px] font-bold text-slate-600">{lastSync.toLocaleTimeString()}</p>
          </div>
          <button 
            onClick={() => fetchPerformance(true)}
            disabled={refreshing}
            className={`p-3 rounded-2xl border border-slate-100 bg-white shadow-sm hover:bg-slate-50 transition-all ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={16} className="text-slate-400" />
          </button>
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 px-6 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <Award size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Performance</p>
              <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {feedback.satisfactionRate >= 90 ? "A+ EXCELLENT" : 
                 feedback.satisfactionRate >= 75 ? "B+ GREAT" : 
                 feedback.satisfactionRate >= 50 ? "C AVERAGE" : 
                 feedback.totalFeedback === 0 ? "NEW AGENT" : "D IMPROVING"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-6 py-3 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <Trophy size={16} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Rank</p>
              <p className="text-xs font-black text-white">#{totals.rank} of {totals.totalAgents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="premium-card p-8 space-y-4 border-l-4 border-l-indigo-500 group hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="small-label text-slate-400 group-hover:text-indigo-500 transition-colors">Total Interactions</span>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MessageSquare size={14} className="text-indigo-500" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h4 className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              <AnimatedCounter value={totals.totalChats} />
            </h4>
            <span className="text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Sessions</span>
          </div>
        </div>
        <div className="premium-card p-8 space-y-4 border-l-4 border-l-emerald-500 group hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="small-label text-slate-400 group-hover:text-emerald-500 transition-colors">Customer Sentiment</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Star size={14} className="text-emerald-500" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h4 className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              <AnimatedCounter value={feedback.satisfactionRate} />%
            </h4>
            <span className="text-[10px] text-emerald-500 font-black mb-1.5 uppercase tracking-wider">Positive</span>
          </div>
        </div>
        <div className="premium-card p-8 space-y-4 border-l-4 border-l-purple-500 group hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="small-label text-slate-400 group-hover:text-purple-500 transition-colors">Response Speed</span>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Zap size={14} className="text-purple-500" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h4 className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              <AnimatedCounter value={sla.avgResponseTimeSeconds} />s
            </h4>
            <span className="text-[10px] text-purple-500 font-black mb-1.5 uppercase tracking-wider">Average</span>
          </div>
        </div>
        <div className="premium-card p-8 space-y-4 border-l-4 border-l-amber-500 group hover:translate-y-[-4px] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="small-label text-slate-400 group-hover:text-amber-500 transition-colors">Goal Completion</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <CheckCircle size={14} className="text-amber-500" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <h4 className="text-4xl font-black text-slate-900 dark:text-white leading-none">
              <AnimatedCounter value={totals.resolvedTickets} />
            </h4>
            <span className="text-[10px] text-amber-500 font-black mb-1.5 uppercase tracking-wider">Tickets</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Workload Trends */}
        <div className="lg:col-span-8 premium-card p-10 space-y-10 bg-white dark:bg-slate-900 transition-colors">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <h3 className="heading-md dark:text-white">Engagement Momentum</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">7-day rolling window of interaction volume.</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <TrendingUp className="text-indigo-500" size={24} />
            </div>
          </div>
          <div className="h-[350px] w-full flex items-center justify-center">
            {trends.dailyChats.length === 0 ? (
              <div className="flex flex-col items-center gap-4 opacity-30">
                <TrendingUp size={48} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Insufficient momentum data for this period.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends.dailyChats}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" className="dark:stroke-white/5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 60px rgba(0,0,0,0.18)', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '16px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorCount)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-4 premium-card p-0 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Activity size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Activity</h3>
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Real-Time</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-h-[400px]">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 opacity-40 text-center space-y-3">
                <Users size={32} className="text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-widest">No activity detected yet.</p>
              </div>
            ) : recentActivity.map((act, i) => (
              <div key={i} className="flex gap-4 group cursor-default">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white dark:border-white/5 transition-transform group-hover:scale-110 ${
                    act.type === 'chat' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {act.type === 'chat' ? <MessageSquare size={14} /> : <CheckCircle size={14} />}
                  </div>
                  {i < recentActivity.length - 1 && (
                    <div className="absolute top-10 bottom-[-24px] left-1/2 w-px bg-slate-100 dark:bg-white/5 -translate-x-1/2" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{act.action}</p>
                    <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold truncate tracking-tight">{act.subject}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                      act.status === 'closed' || act.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>{act.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SLA Health */}
        <div className="premium-card p-8 space-y-8 shadow-sm border border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
                <Clock size={16} />
              </div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">SLA Performance</h3>
            </div>
            <Award size={16} className="text-emerald-500" />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Initial Response</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{sla.avgResponseTimeSeconds}s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(100, (sla.avgResponseTimeSeconds / 30) * 100)}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wait Time SLA</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{sla.avgWaitTimeSeconds}s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(100, (sla.avgWaitTimeSeconds / 60) * 100)}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resolution Speed</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{sla.avgHandleTimeMinutes}m</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min(100, (sla.avgHandleTimeMinutes / 15) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Distribution */}
        <div className="premium-card p-10 flex flex-col items-center justify-center space-y-8 bg-white dark:bg-slate-900 transition-colors">
          <div className="text-center">
            <span className="small-label">Satisfaction Metrics</span>
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
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 60px rgba(0,0,0,0.15)', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px', fontWeight: '900' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping opacity-20"></div>
            </div>
          </div>
          <div className="flex gap-4 w-full">
            <div className="flex-1 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Satisfied</p>
              <p className="text-sm font-black text-indigo-600">{feedback.satisfiedChats}</p>
            </div>
            <div className="flex-1 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Unsatisfied</p>
              <p className="text-sm font-black text-amber-600">{feedback.unsatisfiedChats}</p>
            </div>
          </div>
        </div>

        {/* Goals & Achievement */}
        <div className="premium-card p-10 bg-slate-950 text-white overflow-hidden relative flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-indigo-400" />
              <h3 className="text-sm font-black uppercase tracking-tight">Active Milestone</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed">Achieve <span className="text-white">3,000 resolved interactions</span> this quarter to unlock the "Elite Support" badge.</p>
            
            <div className="pt-4 space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
                <span className="text-[10px] font-black text-indigo-400">85% Complete</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="relative z-10 pt-8 flex items-center justify-between border-t border-white/5 mt-6">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center shadow-lg">
                  <Award size={14} className={i === 1 ? "text-amber-400" : i === 2 ? "text-slate-400" : "text-indigo-400"} />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-slate-950 flex items-center justify-center shadow-lg text-[8px] font-black">+4</div>
            </div>
            <button className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors">View All Badges →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
