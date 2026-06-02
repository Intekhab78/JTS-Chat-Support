import React, { useEffect, useState } from "react";
import { X, BarChart, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { API_BASE } from "../../api/client.js";
import { formatCurrency } from "./CrmUIComponents.jsx";

function formatSecondsToReadable(sec) {
  if (!sec) return "0s";
  const days = Math.floor(sec / (3600 * 24));
  const hours = Math.floor((sec % (3600 * 24)) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function CrmWinReports({ websiteId = "", preset = "month", onClose = () => {} }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalRevenue: 0, deals: 0, avgConversionSeconds: 0 });
  const [series, setSeries] = useState([]);

  function computeRange(p) {
    const end = new Date();
    const start = new Date();
    if (p === "today") {
      return { startDate: end.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
    }
    if (p === "week") {
      start.setDate(end.getDate() - 6);
      return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
    }
    // month
    start.setDate(end.getDate() - 29);
    return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
  }

  useEffect(() => {
    let mounted = true;
    async function fetchReports() {
      setLoading(true);
      try {
        const range = computeRange(preset);
        const params = new URLSearchParams();
        if (websiteId) params.set("websiteId", websiteId);
        params.set("startDate", range.startDate);
        params.set("endDate", range.endDate);
        const res = await fetch(`${API_BASE}/api/crm/reports?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("dashboard_token")}` }
        });
        if (!res.ok) throw new Error("Failed to load CRM reports");
        const json = await res.json();
        if (mounted) setData(json);
        // also fetch timeseries (days derived from preset)
        try {
          const days = preset === "today" ? 1 : preset === "week" ? 7 : 30;
          const tsParams = new URLSearchParams();
          if (websiteId) tsParams.set("websiteId", websiteId);
          tsParams.set("days", String(days));
          const tsRes = await fetch(`${API_BASE}/api/crm/reports/won-timeseries?${tsParams.toString()}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("dashboard_token")}` }
          });
          if (tsRes.ok) {
            const js = await tsRes.json();
            if (mounted) setSeries(js.series || []);
          }
        } catch (e) {
          console.error("timeseries fetch failed", e);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchReports();
    return () => { mounted = false; };
  }, [websiteId, preset]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl p-6 shadow-lg z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">CRM Insights</h3>
          <button onClick={onClose} className="text-slate-500"><X size={18} /></button>
        </div>
          <div className="mt-4 bg-white rounded-xl border p-4">
            <p className="text-xs font-black text-slate-400 uppercase mb-2">Won Revenue (time-series)</p>
            <div style={{ width: "100%", height: 200 }}>
              {series && series.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                    <YAxis tickFormatter={(v) => `${v}`} />
                    <Tooltip formatter={(v) => new Intl.NumberFormat().format(v)} />
                    <Line dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-slate-400">No data for selected period</div>
              )}
            </div>
          </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-black text-slate-400 uppercase">Won Revenue</p>
              <p className="text-2xl font-black mt-2 text-slate-900">{formatCurrency(data.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">Period: {preset}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-black text-slate-400 uppercase">Deals Closed</p>
              <p className="text-2xl font-black mt-2 text-slate-900">{data.deals || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Count</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-black text-slate-400 uppercase">Avg Conversion Time</p>
              <p className="text-2xl font-black mt-2 text-slate-900">{formatSecondsToReadable(data.avgConversionSeconds)}</p>
              <p className="text-xs text-slate-500 mt-1">Lead → Won</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
