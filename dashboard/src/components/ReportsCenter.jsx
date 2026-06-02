import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, Globe, Users, Clock3, BadgeCheck, TrendingUp, Building2, Trophy, Activity, FileText, Sparkles, ShieldCheck, Target, ArrowRight } from "lucide-react";
import { API_BASE } from "../api/client.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";

const REPORT_COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

function MetricCard({ label, value, hint, accent }) {
  return (
    <article className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em]">{label}</p>
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${accent} opacity-90`} />
      </div>
      <div className="space-y-1">
        <h3 className="text-3xl font-black tracking-tight text-slate-950">{value}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hint}</p>
      </div>
    </article>
  );
}

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}

function presetToRange(preset) {
  const end = new Date();
  const start = new Date();
  if (preset === "today") {
    return { startDate: formatDateInput(end), endDate: formatDateInput(end) };
  }
  if (preset === "30d") {
    start.setDate(end.getDate() - 29);
    return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
  }
  start.setDate(end.getDate() - 6);
  return { startDate: formatDateInput(start), endDate: formatDateInput(end) };
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function gradeFromScore(score) {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Stable";
  if (score >= 40) return "Watch";
  return "Critical";
}

export default function ReportsCenter({ analytics = {}, selectedWebsiteId = "", isAdmin = false, reportRange, onRangeChange }) {
  const [websitePage, setWebsitePage] = useState(1);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const totals = analytics.totals || {};
  const feedback = analytics.feedback || {};
  const sla = analytics.sla || {};
  const websites = analytics.websites || [];
  const leaderboard = analytics.leaderboard || [];
  const dailyChats = analytics.trends?.dailyChats || [];
  const monthlyVisitors = analytics.trends?.monthlyVisitors || [];
  const hourlySnapshots = analytics.trends?.hourly || [];
  const topCountries = analytics.topCountries || [];

  const feedbackBreakdown = useMemo(() => ([
    { name: "Satisfied", value: feedback.satisfiedChats || 0 },
    { name: "Unsatisfied", value: feedback.unsatisfiedChats || 0 }
  ]).filter((item) => item.value > 0), [feedback]);

  const websiteRows = useMemo(() => websites.map((website, index) => ({
    id: website._id,
    name: website.websiteName,
    domain: website.domain,
    accent: REPORT_COLORS[index % REPORT_COLORS.length]
  })), [websites]);

  useEffect(() => {
    setWebsitePage(1);
  }, [websiteRows.length, selectedWebsiteId, reportRange?.preset, reportRange?.startDate, reportRange?.endDate]);

  useEffect(() => {
    setLeaderboardPage(1);
  }, [leaderboard.length, selectedWebsiteId, reportRange?.preset, reportRange?.startDate, reportRange?.endDate]);

  const paginatedWebsiteRows = useMemo(() => getPaginationMeta(websiteRows, websitePage), [websiteRows, websitePage]);
  const paginatedLeaderboard = useMemo(() => getPaginationMeta(leaderboard, leaderboardPage), [leaderboard, leaderboardPage]);

  const exportReports = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedWebsiteId) params.set("websiteId", selectedWebsiteId);
      if (reportRange?.startDate) params.set("startDate", reportRange.startDate);
      if (reportRange?.endDate) params.set("endDate", reportRange.endDate);
      const query = params.toString();
      const response = await fetch(`${API_BASE}/api/analytics/export/csv${query ? `?${query}` : ""}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dashboard_token")}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to generate reports export");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `reports_${selectedWebsiteId || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert(error.message || "Unable to export reports right now.");
    }
  };

  const printReport = () => {
    window.print();
  };

  const activeMeta = analytics.meta || {};
  const isCustomMode = reportRange?.preset === "custom";
  const rangeChats = totals.dailyChats || 0;
  const resolvedTickets = totals.resolvedTickets || 0;
  const totalFeedback = feedback.totalFeedback || 0;
  const feedbackCoverage = rangeChats ? (totalFeedback / rangeChats) * 100 : 0;
  const ticketResolutionRate = rangeChats ? (resolvedTickets / rangeChats) * 100 : 0;
  const liveLoadPerAgent = totals.agents ? (totals.liveSessions || 0) / totals.agents : 0;
  const waitScore = 100 - Math.min(100, ((sla.avgWaitTimeSeconds || 0) / 120) * 100);
  const responseScore = 100 - Math.min(100, ((sla.avgResponseTimeSeconds || 0) / 60) * 100);
  const handleScore = 100 - Math.min(100, ((sla.avgHandleTimeMinutes || 0) / 30) * 100);
  const serviceScore = Math.round(((feedback.satisfactionRate || 0) + waitScore + responseScore + handleScore) / 4);
  const serviceGrade = gradeFromScore(serviceScore);

  const narrative = serviceScore >= 85
    ? "Service quality is operating at a high standard. Response speed, satisfaction, and closure behavior are aligned well in this reporting window."
    : serviceScore >= 65
      ? "Performance is stable, but there is still room to improve consistency in response speed, ticket closure, or feedback capture."
      : "This report shows visible pressure on delivery. Focus on queue balancing, first-response speed, and stronger support closure discipline.";

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <section className="rounded-[40px] border border-slate-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#172554_40%,#115e59_100%)] text-white p-10 md:p-12 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.75)] overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_28%)]" />
        <div className="relative z-10 space-y-8">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8">
            <div className="space-y-4 max-w-4xl">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Executive Reports</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Professional Operations Intelligence</h2>
              <p className="text-sm font-bold text-slate-200 leading-relaxed">
                {isAdmin
                  ? "A consolidated reporting workspace for operational health, service delivery, customer sentiment, and team performance across all managed websites."
                  : selectedWebsiteId
                    ? "A focused website-level report with service quality, traffic, ticket outcomes, and team performance in one real-world dashboard."
                    : "A complete client-side reporting workspace combining website scope, operational health, growth, and support performance in one place."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={exportReports}
                className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-white text-slate-950 hover:bg-cyan-50 font-black text-[10px] uppercase tracking-[0.22em] transition-all shadow-lg"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={printReport}
                className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-black text-[10px] uppercase tracking-[0.22em] transition-all backdrop-blur-xl"
              >
                <FileText size={16} />
                Print Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Service Score</p>
              <p className="text-4xl font-black mt-2">{serviceScore}</p>
              <p className="text-[11px] font-bold text-slate-200 mt-1">{serviceGrade} operating condition</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Range Chats</p>
              <p className="text-4xl font-black mt-2">{formatNumber(rangeChats)}</p>
              <p className="text-[11px] font-bold text-slate-200 mt-1">Measured across the selected window</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Satisfaction</p>
              <p className="text-4xl font-black mt-2">{formatPercent(feedback.satisfactionRate || 0)}</p>
              <p className="text-[11px] font-bold text-slate-200 mt-1">Customer feedback health</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Live Load / Agent</p>
              <p className="text-4xl font-black mt-2">{liveLoadPerAgent.toFixed(1)}</p>
              <p className="text-[11px] font-bold text-slate-200 mt-1">Current session pressure</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200/70 bg-white p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.22em]">Date Range</p>
            <h3 className="text-xl font-black text-slate-950">Report Window Control</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {activeMeta.startDate && activeMeta.endDate
                ? `${new Date(activeMeta.startDate).toLocaleDateString()} to ${new Date(activeMeta.endDate).toLocaleDateString()}`
                : "Choose a period for dynamic reports"}
            </p>
          </div>
          <div className="flex flex-col lg:flex-row gap-4 w-full xl:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "today", label: "Today" },
                { key: "7d", label: "7 Days" },
                { key: "30d", label: "30 Days" },
                { key: "custom", label: "Custom" }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    if (option.key === "custom") {
                      onRangeChange({
                        ...reportRange,
                        preset: "custom",
                        startDate: reportRange.startDate || formatDateInput(new Date()),
                        endDate: reportRange.endDate || formatDateInput(new Date())
                      });
                      return;
                    }
                    onRangeChange({
                      preset: option.key,
                      ...presetToRange(option.key)
                    });
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                    reportRange?.preset === option.key ? "bg-slate-950 text-white shadow-lg" : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={reportRange?.startDate || ""}
                onChange={(e) => onRangeChange({ ...reportRange, preset: "custom", startDate: e.target.value })}
                disabled={!isCustomMode}
                className={`border rounded-2xl px-4 py-3 text-xs font-bold outline-none transition-all ${
                  isCustomMode
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              />
              <input
                type="date"
                value={reportRange?.endDate || ""}
                onChange={(e) => onRangeChange({ ...reportRange, preset: "custom", endDate: e.target.value })}
                disabled={!isCustomMode}
                className={`border rounded-2xl px-4 py-3 text-xs font-bold outline-none transition-all ${
                  isCustomMode
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard label="Live Sessions" value={formatNumber(totals.liveSessions || 0)} hint="Current active and queued load" accent="from-indigo-500 to-violet-500" />
        <MetricCard label="Range Chats" value={formatNumber(totals.dailyChats || 0)} hint="Conversations in selected window" accent="from-cyan-500 to-sky-500" />
        <MetricCard label="Total Visitors" value={formatNumber(totals.totalVisitors || 0)} hint="Lifetime visitor volume" accent="from-emerald-500 to-teal-500" />
        <MetricCard label="Resolved Tickets" value={formatNumber(totals.resolvedTickets || 0)} hint="Resolved in selected window" accent="from-amber-500 to-orange-500" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-8">
        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Executive Summary</p>
              <h3 className="text-2xl font-black text-slate-950">Operational Reading</h3>
            </div>
            <Sparkles className="text-cyan-500" size={20} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Feedback Coverage</p>
              <p className="text-3xl font-black text-slate-950">{formatPercent(feedbackCoverage)}</p>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">Share of chat volume that produced measurable feedback.</p>
            </div>
            <div className="rounded-[26px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Resolution Rate</p>
              <p className="text-3xl font-black text-slate-950">{formatPercent(ticketResolutionRate)}</p>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">Resolved support outcomes against the same report window volume.</p>
            </div>
            <div className="rounded-[26px] border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Live Load</p>
              <p className="text-3xl font-black text-slate-950">{liveLoadPerAgent.toFixed(1)}</p>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">Average concurrent pressure per active support person.</p>
            </div>
          </div>
          <div className="rounded-[30px] bg-slate-950 text-white p-7 border border-slate-900">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck size={18} className="text-cyan-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">Report Insight</p>
            </div>
            <p className="text-sm font-bold text-slate-200 leading-relaxed">{narrative}</p>
          </div>
        </div>

        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Scorecard</p>
              <h3 className="text-2xl font-black text-slate-950">Performance Grade</h3>
            </div>
            <Target className="text-indigo-500" size={20} />
          </div>
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#eff6ff_0%,#ecfeff_100%)] border border-cyan-100 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">Overall Service Score</p>
            <div className="flex items-end justify-between gap-4 mt-3">
              <p className="text-5xl font-black text-slate-950">{serviceScore}</p>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700">{serviceGrade}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Agents</p>
              <p className="text-2xl font-black text-slate-950 mt-1">{formatNumber(totals.agents || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Websites</p>
              <p className="text-2xl font-black text-slate-950 mt-1">{formatNumber(totals.websites || 0)}</p>
            </div>
          </div>
          <div className="rounded-[26px] border border-slate-100 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Current Window</p>
            <p className="text-sm font-bold text-slate-600 mt-2 leading-relaxed">
              {activeMeta.startDate && activeMeta.endDate
                ? `This report covers ${new Date(activeMeta.startDate).toLocaleDateString()} through ${new Date(activeMeta.endDate).toLocaleDateString()}.`
                : "Choose a date window to generate the reporting period."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Traffic Trend</p>
              <h3 className="text-xl font-black text-slate-950">Daily Conversation Volume</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChats}>
                <defs>
                  <linearGradient id="reportsDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#eef2ff" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "18px", border: "none", boxShadow: "0 20px 60px rgba(15,23,42,0.12)", fontSize: "11px", fontWeight: 800 }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fill="url(#reportsDaily)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Sentiment</p>
              <h3 className="text-xl font-black text-slate-950">{feedback.satisfactionRate || 0}% Satisfaction</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BadgeCheck size={20} />
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feedbackBreakdown.length ? feedbackBreakdown : [{ name: "No Data", value: 1 }]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={8}
                  stroke="none"
                >
                  {(feedbackBreakdown.length ? feedbackBreakdown : [{ name: "No Data", value: 1 }]).map((_, index) => (
                    <Cell key={index} fill={feedbackBreakdown.length ? REPORT_COLORS[index % REPORT_COLORS.length] : "#e2e8f0"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "18px", border: "none", boxShadow: "0 20px 60px rgba(15,23,42,0.12)", fontSize: "11px", fontWeight: 800 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Satisfied</p>
              <p className="text-2xl font-black text-slate-950 mt-1">{feedback.satisfiedChats || 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unsatisfied</p>
              <p className="text-2xl font-black text-slate-950 mt-1">{feedback.unsatisfiedChats || 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SLA Health</p>
              <h3 className="text-xl font-black text-slate-950">Service Commitments</h3>
            </div>
            <Clock3 className="text-indigo-500" size={20} />
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Average Wait</p>
              <p className="text-3xl font-black text-slate-950 mt-2">{sla.avgWaitTimeSeconds || 0}s</p>
              <div className="w-full h-2.5 bg-white rounded-full border border-slate-100 overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${clampPercent(100 - ((sla.avgWaitTimeSeconds || 0) / 60) * 100)}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">First Response</p>
              <p className="text-3xl font-black text-slate-950 mt-2">{sla.avgResponseTimeSeconds || 0}s</p>
              <div className="w-full h-2.5 bg-white rounded-full border border-slate-100 overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500" style={{ width: `${clampPercent(100 - ((sla.avgResponseTimeSeconds || 0) / 30) * 100)}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Handle Time</p>
              <p className="text-3xl font-black text-slate-950 mt-2">{sla.avgHandleTimeMinutes || 0}m</p>
              <div className="w-full h-2.5 bg-white rounded-full border border-slate-100 overflow-hidden mt-4">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${clampPercent(100 - ((sla.avgHandleTimeMinutes || 0) / 15) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visitor Growth</p>
              <h3 className="text-xl font-black text-slate-950">Monthly Acquisition Trend</h3>
            </div>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVisitors}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#eef2ff" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "18px", border: "none", boxShadow: "0 20px 60px rgba(15,23,42,0.12)", fontSize: "11px", fontWeight: 800 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {monthlyVisitors.map((_, index) => (
                    <Cell key={index} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regional Footprint</p>
              <h3 className="text-xl font-black text-slate-950">Top Traffic Countries</h3>
            </div>
            <Globe className="text-cyan-500" size={20} />
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCountries} layout="vertical">
                <CartesianGrid strokeDasharray="5 5" horizontal={false} stroke="#eef2ff" />
                <XAxis type="number" hide />
                <YAxis dataKey="country" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#94a3b8" }} width={90} />
                <Tooltip contentStyle={{ borderRadius: "18px", border: "none", boxShadow: "0 20px 60px rgba(15,23,42,0.12)", fontSize: "11px", fontWeight: 800 }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {topCountries.map((_, index) => (
                    <Cell key={index} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Pattern</p>
              <h3 className="text-xl font-black text-slate-950">24h Operational Snapshot</h3>
            </div>
            <Users className="text-violet-500" size={20} />
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlySnapshots}>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#eef2ff" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: "18px", border: "none", boxShadow: "0 20px 60px rgba(15,23,42,0.12)", fontSize: "11px", fontWeight: 800 }} />
                <Line type="monotone" dataKey="visitors" stroke="#14b8a6" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="chats" stroke="#6366f1" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#f59e0b" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Website Breakdown</p>
              <h3 className="text-xl font-black text-slate-950">{isAdmin ? "All Managed Websites" : "Website-wise Visibility"}</h3>
            </div>
            <Building2 className="text-indigo-500" size={20} />
          </div>
          <div className="space-y-4">
            {websiteRows.length > 0 ? paginatedWebsiteRows.pageItems.map((website) => (
              <div key={website.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl text-white font-black flex items-center justify-center shadow-lg" style={{ backgroundColor: website.accent }}>
                    {website.name?.[0]?.toUpperCase() || "W"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-950 uppercase tracking-tight truncate">{website.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{website.domain}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedWebsiteId === website.id ? "Active Filter" : "Included"}</span>
              </div>
            )) : (
              <div className="rounded-[28px] border-2 border-dashed border-slate-200 p-10 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No websites available in this report scope</p>
              </div>
            )}
          </div>
          <PaginationControls
            currentPage={paginatedWebsiteRows.currentPage}
            totalPages={paginatedWebsiteRows.totalPages}
            totalItems={paginatedWebsiteRows.totalItems}
            itemLabel="websites"
            onPageChange={setWebsitePage}
          />
        </div>

        <div className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Team Performance</p>
              <h3 className="text-xl font-black text-slate-950">Leaderboard Snapshot</h3>
            </div>
            <Trophy className="text-amber-500" size={20} />
          </div>
          <div className="space-y-4">
            {leaderboard.length > 0 ? paginatedLeaderboard.pageItems.map((agent, index) => (
              <div key={agent._id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black shadow-lg">
                    {(paginatedLeaderboard.currentPage - 1) * 10 + index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-950 uppercase tracking-tight truncate">{agent.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">{agent.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">{formatNumber(agent.chatsHandled || 0)}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{Math.round(agent.avgHandleSeconds || 0)}s avg</p>
                </div>
              </div>
            )) : (
              <div className="rounded-[28px] border-2 border-dashed border-slate-200 p-10 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Not enough performance data yet</p>
              </div>
            )}
          </div>
          <PaginationControls
            currentPage={paginatedLeaderboard.currentPage}
            totalPages={paginatedLeaderboard.totalPages}
            totalItems={paginatedLeaderboard.totalItems}
            itemLabel="team members"
            onPageChange={setLeaderboardPage}
          />
        </div>
      </section>

      <section className="rounded-[36px] border border-slate-200/70 bg-white p-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Report Actions</p>
            <h3 className="text-2xl font-black text-slate-950">Export, Review, And Share</h3>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.22em]">
            <ArrowRight size={14} />
            Built from live analytics data
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">CSV Export</p>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">Download structured reporting data for audits, Excel analysis, finance review, or external BI tools.</p>
            <button type="button" onClick={exportReports} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
              <Download size={14} />
              Export Current Window
            </button>
          </div>
          <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Print / PDF</p>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">Generate a clean browser print view and save it as PDF for management, clients, or board reporting.</p>
            <button type="button" onClick={printReport} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              <FileText size={14} />
              Print This Report
            </button>
          </div>
          <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-6 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Executive View</p>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">This page now combines growth, service levels, customer sentiment, team ranking, and website scope into one professional report.</p>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <Sparkles size={14} />
              Ready for real-world review
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
