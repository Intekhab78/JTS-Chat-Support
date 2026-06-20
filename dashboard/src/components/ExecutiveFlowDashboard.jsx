import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, ArrowDownRight, UserCheck, PhoneCall, Layers, FileText, CheckCircle2 } from "lucide-react";

export default function ExecutiveFlowDashboard({ websiteId }) {
  const toast = useToast();
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!websiteId) return;
    api(`/api/flows/website/${websiteId}`)
      .then((data) => {
        setFlows(data);
        if (data.length > 0) {
          const active = data.find(f => f.isPublished) || data[0];
          setSelectedFlowId(active._id);
        }
      })
      .catch((err) => toast.error("Failed to load website flows: " + err.message));
  }, [websiteId]);

  useEffect(() => {
    if (!selectedFlowId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    api(`/api/flows/${selectedFlowId}/executive-summary`)
      .then(setSummary)
      .catch((err) => toast.error("Failed to fetch executive summary: " + err.message))
      .finally(() => setLoading(false));
  }, [selectedFlowId]);

  if (!websiteId) {
    return (
      <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center text-slate-400">
        <p className="text-[11px] font-black uppercase tracking-widest leading-none">Select a website context to view flow analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[32px] shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Conversion Funnel</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Select bot flow configuration to analyze customer drop-offs</p>
        </div>
        <select
          value={selectedFlowId}
          onChange={(e) => setSelectedFlowId(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/10 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider px-5 py-3 rounded-2xl outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Choose a Flow</option>
          {flows.map((f) => (
            <option key={f._id} value={f._id}>
              {f.name} {f.isPublished ? "★ Active" : ""}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {summary && !loading && (
        <div className="space-y-8">
          {/* Executive Overview KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[32px] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Layers size={20} />
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Total Runs</span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{summary.totalStarted}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[32px] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Conversions</span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{summary.totalConversions} ({summary.conversionRate}%)</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[32px] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <PhoneCall size={20} />
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Escalated to Agent</span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{summary.totalTransfers}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[32px] shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ArrowDownRight size={20} />
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-0.5">Total Drop-offs</span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{summary.totalDropoffs} ({summary.dropoffRate}%)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Visual Funnel Representation */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[36px] shadow-sm flex flex-col">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-6">Interactive Conversion Funnel</span>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summary.funnel}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="step" tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Clicked Options & Engagement Hotspots */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[36px] shadow-sm space-y-6">
              <div>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Ecosystem Hotspots</span>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Most Picked Path Options</h4>
              </div>

              <div className="space-y-4">
                {summary.topClickedOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350">{opt.text}</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">{opt.count} clicks</span>
                  </div>
                ))}
                {summary.topClickedOptions.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-10">No options clicks recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Node drop-off heatmap table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[36px] shadow-sm">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Node Engagement Breakdown & Stall Warnings</span>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-150 dark:border-white/5">
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Node ID</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Visits</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Drop-offs</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Drop-off Rate</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ecosystem Temperature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {Object.entries(summary.nodeVisits || {}).map(([nodeId, visits]) => {
                    const dropoffs = summary.nodeDropoffs[nodeId] || 0;
                    const rate = visits > 0 ? ((dropoffs / visits) * 100).toFixed(1) : 0;
                    const numericRate = parseFloat(rate);
                    
                    let tempClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
                    let tempLabel = "Green (Normal)";
                    if (numericRate > 40) {
                      tempClass = "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 animate-pulse";
                      tempLabel = "Red (Critical Churn)";
                    } else if (numericRate >= 15) {
                      tempClass = "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20";
                      tempLabel = "Yellow (Stall Warning)";
                    }

                    return (
                      <tr key={nodeId} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 text-[11px] font-black text-slate-900 dark:text-white">{nodeId}</td>
                        <td className="py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{visits}</td>
                        <td className="py-4 text-xs font-bold text-slate-700 dark:text-slate-300">{dropoffs}</td>
                        <td className="py-4 text-xs font-black text-slate-900 dark:text-white">{rate}%</td>
                        <td className="py-4 text-right">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${tempClass}`}>
                            {tempLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
