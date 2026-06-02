import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasModule } from "../utils/planAccess.js";
import { apiCache } from "../utils/cache.js";
import CrmReportsView from "./CrmSystem/CrmReportsView.jsx";
import { formatCurrency } from "./CrmSystem/CrmUIComponents.jsx";

function formatSecondsToReadable(sec) {
  if (!sec) return "0m";
  const total = Math.max(0, Number(sec) || 0);
  const days = Math.floor(total / (3600 * 24));
  const hours = Math.floor((total % (3600 * 24)) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function computeDateRange(preset) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  if (preset === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (preset === "week") {
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    // month (current month)
    start.setFullYear(end.getFullYear(), end.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0]
  };
}

export default function ManagerCrmReports({ websites = [], websiteId: externalWebsiteId }) {
  const { user } = useAuth();
  const canUseCRM = hasModule(user, "crm");

  const resolvedWebsites = useMemo(() => (Array.isArray(websites) ? websites : []), [websites]);

  const [websiteId, setWebsiteId] = useState("");
  const [activeRange, setActiveRange] = useState("month");
  const [summary, setSummary] = useState({});
  const [winStats, setWinStats] = useState({ totalRevenue: 0, deals: 0, avgConversionSeconds: 0 });
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (externalWebsiteId !== undefined) {
      setWebsiteId(externalWebsiteId);
    }
  }, [externalWebsiteId]);

  useEffect(() => {
    if (websiteId || externalWebsiteId) return;
    if (resolvedWebsites.length === 1 && resolvedWebsites[0]?._id) {
      setWebsiteId(resolvedWebsites[0]._id);
    }
  }, [resolvedWebsites, websiteId, externalWebsiteId]);

  useEffect(() => {
    if (!canUseCRM) return;

    let mounted = true;
    async function loadReports() {
      setLoading(true);
      setError("");
      try {
        const summaryCacheKey = `mgr_crm_reports_summary_${user?._id || "anon"}_${websiteId || "all"}_${activeRange}`;
        const winCacheKey = `mgr_crm_reports_win_${user?._id || "anon"}_${websiteId || "all"}_${activeRange}`;
        const seriesCacheKey = `mgr_crm_reports_series_${user?._id || "anon"}_${websiteId || "all"}_${activeRange}`;

        const cachedSummary = apiCache.get(summaryCacheKey);
        const cachedWin = apiCache.get(winCacheKey);
        const cachedSeries = apiCache.get(seriesCacheKey);

        const range = computeDateRange(activeRange);
        const days = activeRange === "today" ? 1 : activeRange === "week" ? 7 : 30;

        const summaryPromise = cachedSummary
          ? Promise.resolve({ summary: cachedSummary })
          : (() => {
              const params = new URLSearchParams();
              if (websiteId) params.set("websiteId", websiteId);
              params.set("range", activeRange);
              params.set("limit", "1");
              params.set("page", "1");
              return api(`/api/crm?${params.toString()}`);
            })();

        const winPromise = cachedWin
          ? Promise.resolve(cachedWin)
          : (() => {
              const params = new URLSearchParams();
              if (websiteId) params.set("websiteId", websiteId);
              params.set("startDate", range.startDate);
              params.set("endDate", range.endDate);
              return api(`/api/crm/reports?${params.toString()}`);
            })();

        const seriesPromise = cachedSeries
          ? Promise.resolve(cachedSeries)
          : (() => {
              const params = new URLSearchParams();
              if (websiteId) params.set("websiteId", websiteId);
              params.set("days", String(days));
              return api(`/api/crm/reports/won-timeseries?${params.toString()}`);
            })();

        const [summaryRes, winRes, seriesRes] = await Promise.all([summaryPromise, winPromise, seriesPromise]);

        const nextSummary = summaryRes?.summary || {};
        const nextWin = {
          totalRevenue: Number(winRes?.totalRevenue || 0),
          deals: Number(winRes?.deals || 0),
          avgConversionSeconds: Number(winRes?.avgConversionSeconds || 0)
        };
        const nextSeries = Array.isArray(seriesRes?.series) ? seriesRes.series : [];

        apiCache.set(summaryCacheKey, nextSummary, 5 * 60 * 1000);
        apiCache.set(winCacheKey, nextWin, 5 * 60 * 1000);
        apiCache.set(seriesCacheKey, { series: nextSeries }, 5 * 60 * 1000);

        if (!mounted) return;
        setSummary(nextSummary);
        setWinStats(nextWin);
        setRevenueSeries(nextSeries);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Unable to load CRM reports right now.");
        setSummary({});
        setWinStats({ totalRevenue: 0, deals: 0, avgConversionSeconds: 0 });
        setRevenueSeries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReports();
    return () => {
      mounted = false;
    };
  }, [activeRange, canUseCRM, user?._id, websiteId]);

  if (!canUseCRM) {
    return (
      <div className="rounded-[40px] border border-emerald-100 bg-emerald-50 p-12 text-center">
        <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Pro plan required</h3>
        <p className="mt-3 text-sm font-bold text-emerald-700">Upgrade this client to Pro to unlock CRM analytics in manager reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="premium-card p-0 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="heading-md">CRM Analysis & Reports</h3>
            <p className="small-label opacity-60 mt-1">Pipeline health, revenue, conversions, and follow-up discipline</p>
          </div>

          {!externalWebsiteId && (
            <div className="flex items-center gap-3">
              <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 flex items-center justify-center border-r border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Website</span>
                </div>
                <select
                  value={websiteId}
                  onChange={(e) => setWebsiteId(e.target.value)}
                  className="bg-transparent px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:bg-slate-50 transition-all appearance-none"
                >
                  <option value="">All Websites</option>
                  {resolvedWebsites.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.websiteName || w.domain || "Website"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 rounded-[28px] border border-rose-100 bg-rose-50 px-8 py-5 text-[11px] font-black uppercase tracking-widest text-rose-700 shadow-xl">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-[11px] font-black uppercase tracking-widest">
              Loading CRM reports...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Won Revenue</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{formatCurrency(winStats.totalRevenue)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Period: {activeRange}</p>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deals Closed</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{winStats.deals || 0}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Period: {activeRange}</p>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avg Conversion</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{formatSecondsToReadable(winStats.avgConversionSeconds)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lead → Won</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Leads</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{summary?.totalLeads || 0}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Conversion: {summary?.conversionRate || 0}%</p>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pipeline Value</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{formatCurrency(summary?.pipelineValue || 0)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Weighted: {formatCurrency(summary?.weightedRevenue || 0)}</p>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Follow-ups</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">{summary?.followUpHealth?.overdue || 0}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Overdue tasks</p>
                </div>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm mb-10">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Won Revenue Trend</p>
                    <p className="text-sm font-black text-slate-950 mt-1">Daily revenue (last {activeRange === "today" ? 1 : activeRange === "week" ? 7 : 30} days)</p>
                  </div>
                </div>
                <div style={{ width: "100%", height: 220 }}>
                  {revenueSeries.length > 0 ? (
                    <ResponsiveContainer>
                      <LineChart data={revenueSeries}>
                        <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} />
                        <YAxis tickFormatter={(v) => `${v}`} />
                        <Tooltip formatter={(v) => new Intl.NumberFormat().format(Number(v || 0))} />
                        <Line dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      No revenue data for selected period
                    </div>
                  )}
                </div>
              </div>

              <CrmReportsView summary={summary} activeRange={activeRange} setActiveRange={setActiveRange} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
