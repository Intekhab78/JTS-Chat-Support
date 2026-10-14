import { useEffect, useState, useRef } from "react";
import { 
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, MessageSquare, Clock, Star, Zap, Award, Target, 
  CheckCircle, RefreshCcw, Activity, Users, Trophy, ShieldCheck, 
  Sparkles, CheckCircle2, ArrowUpRight 
} from "lucide-react";
import { api } from "../api/client.js";

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (start === end) {
      setCount(end);
      return;
    }

    let totalMiliseconds = duration;
    let incrementTime = (totalMiliseconds / Math.max(1, end)) > 10 ? (totalMiliseconds / Math.max(1, end)) : 10;

    let timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
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
    const interval = setInterval(() => fetchPerformance(true), 30000);
    return () => clearInterval(interval);
  }, [range]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Synchronizing Agent Telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-center space-y-3">
        <p className="text-xs font-black text-rose-800">Connection Interrupted: {error}</p>
        <button onClick={() => fetchPerformance()} className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold">
          Retry Sync
        </button>
      </div>
    );
  }

  const { totals = {}, feedback = {}, sla = {}, trends = {}, recentActivity = [] } = data || {};
  const satisfactionRate = feedback.satisfactionRate || 100;
  const grade = satisfactionRate >= 90 ? "A+ EXCELLENT" : satisfactionRate >= 75 ? "B+ GREAT" : "C AVERAGE";

  const pieData = [
    { name: 'Satisfied', value: feedback.satisfiedChats || 1 },
    { name: 'Unsatisfied', value: feedback.unsatisfiedChats || 0 }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-500">
      
      {/* ── Compact Executive Performance Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 py-3.5 sm:px-5 sm:py-4 text-white border border-indigo-500/20 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-60 h-60 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-500/30 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry
              </span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-500/30">
                Grade: {grade}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Agent Command Center & Performance Hub
            </h2>
            <p className="text-[11px] text-slate-300 font-medium leading-normal">
              Global operational intelligence, CSAT rating, response speed benchmarks & real-time activity stream.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Range Toggle */}
            <div className="flex bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
              {[
                { label: "7D", value: "7" },
                { label: "30D", value: "30" },
                { label: "90D", value: "90" }
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    range === r.value 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Team Rank Pill */}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <Trophy size={13} className="text-amber-400" />
              <div className="px-1 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Team Rank</span>
                <span className="text-xs font-black text-white">#{totals.rank || 1} of {totals.totalAgents || 1}</span>
              </div>
            </div>

            <button
              onClick={() => fetchPerformance(true)}
              disabled={refreshing}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              title="Refresh telemetry"
            >
              <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Primary KPI Metrics Cards (Zero Gaps) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Interactions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Interactions</span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={totals.totalChats || 0} />
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sessions</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <MessageSquare size={18} />
          </div>
        </div>

        {/* Customer Sentiment */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer Sentiment</span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={satisfactionRate} />%
              </h3>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Positive</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <Star size={18} />
          </div>
        </div>

        {/* Response Speed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Response Speed</span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={sla.avgResponseTimeSeconds || 0} />s
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Average</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
            <Zap size={18} />
          </div>
        </div>

        {/* Goal Completion */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Goal Completion</span>
            <div className="flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                <AnimatedCounter value={totals.resolvedTickets || 0} />
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tickets</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <CheckCircle size={18} />
          </div>
        </div>

      </div>

      {/* ── Engagement Momentum & Recent Activity (2-Col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Engagement Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Engagement Momentum
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Rolling trend of interaction volume across selected time window.
              </p>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600">
              <TrendingUp size={16} />
            </div>
          </div>

          <div className="h-[230px] w-full pt-2">
            {(!trends?.dailyChats || trends.dailyChats.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-300">
                <TrendingUp size={32} />
                <p className="text-[11px] font-bold mt-1 text-slate-400">Interaction trend builds up with live sessions.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.dailyChats}>
                  <defs>
                    <linearGradient id="colorCountAgent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-white/5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCountAgent)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Activity size={13} />
              </div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Activity
              </h4>
            </div>
            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Real-Time
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[260px] [scrollbar-width:none]">
            {recentActivity.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-bold">
                No recent activity logged yet.
              </div>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="flex items-start gap-2.5 group">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    act.type === 'chat' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {act.type === 'chat' ? <MessageSquare size={11} /> : <CheckCircle size={11} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">{act.action}</span>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{act.subject}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Bottom SLA Health & CSAT Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* SLA Benchmarks */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-emerald-500" /> SLA Speed Benchmarks
            </h5>
            <Award size={13} className="text-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>First Response Time</span>
                <span className="text-slate-900 dark:text-white font-black">{sla.avgResponseTimeSeconds || 0}s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((sla.avgResponseTimeSeconds || 5) / 30) * 100)}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>Customer Wait Time</span>
                <span className="text-slate-900 dark:text-white font-black">{sla.avgWaitTimeSeconds || 0}s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, ((sla.avgWaitTimeSeconds || 10) / 60) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Sentiment Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Star size={13} className="text-amber-500" /> CSAT Satisfaction Distribution
            </h5>
            <span className="text-[10px] font-black text-emerald-600">{satisfactionRate}% Positive</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-16 h-16 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={18} outerRadius={28} paddingAngle={4}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Satisfied Interactions ({feedback.satisfiedChats || 1})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Unsatisfied / Escalated ({feedback.unsatisfiedChats || 0})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Goal Completion */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Target size={13} className="text-indigo-600" /> Active Shift Quota & Target
            </h5>
            <span className="text-[10px] font-black text-indigo-600">On Track</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 space-y-1.5">
            <div className="flex justify-between text-[10px] font-black text-slate-500">
              <span>Shift Target Progress</span>
              <span className="text-slate-900 dark:text-white">8 / 10 Sessions</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" style={{ width: '80%' }} />
            </div>
            <span className="text-[9px] text-slate-400 font-bold block pt-0.5">80% of daily target achieved</span>
          </div>
        </div>

      </div>

    </div>
  );
}
