import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Compass, Server, Sparkles, RefreshCw, X, Search, Command,
  Play, AlertTriangle, AlertCircle, CheckCircle2, Activity, ArrowRight, Radio
} from "lucide-react";
import { api } from "../api/client.js";

export default function MissionControlCenter({ websiteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const q = websiteId ? `?websiteId=${websiteId}` : "";
      const res = await api(`/api/mission-control/telemetry${q}`);
      setData(res || {});
    } catch (err) {
      setErrorMsg(err?.message || "Failed to load mission control telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, websiteId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const q = websiteId ? `?websiteId=${websiteId}` : "";
      const aiRes = await api(`/api/mission-control/generate-ai-summary${q}`, { method: "POST" });
      if (aiRes) {
        setData((prev) => ({
          ...(prev || {}),
          doc: {
            ...(prev?.doc || {}),
            aiExecutiveSummary: aiRes
          }
        }));
      }
      setStatusMsg(
        aiRes?.provider === "gemini"
          ? "Executive AI insights generated via Gemini AI."
          : "Executive AI insights refreshed."
      );
    } catch (err) {
      setErrorMsg(err?.message || "Failed to generate AI insights");
    } finally {
      setGeneratingAi(false);
    }
  };

  const navigateToTab = (tabName) => {
    if (!tabName) return;
    setShowCommandPalette(false);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabName);
    window.location.href = url.toString();
  };

  const handleExecuteCommand = async (cmd) => {
    setErrorMsg("");
    setStatusMsg("");
    if (cmd.tab) {
      navigateToTab(cmd.tab);
      return;
    }
    try {
      if (cmd.key === "refresh_telemetry") {
        setShowCommandPalette(false);
        await fetchData();
        setStatusMsg("System telemetry refreshed.");
        return;
      }
      const res = await api("/api/mission-control/command-palette", {
        method: "POST",
        body: JSON.stringify({ commandKey: cmd.key })
      });
      setShowCommandPalette(false);
      setStatusMsg(res?.message || `Executed command: ${cmd.key}`);
      await fetchData();
    } catch (err) {
      setErrorMsg(err?.message || "Command execution failed");
    }
  };

  const summary = data?.summary || {};
  const serviceMap = data?.serviceMap || {};
  const doc = data?.doc || {};
  const sysHealth = doc?.systemHealth || {};
  const alerts = doc?.activeAlerts || [];
  const feed = doc?.activityFeed || [];
  const aiSummary = doc?.aiExecutiveSummary || {};
  const healthy = summary.overallHealth === "HEALTHY";

  const memPct = Number(sysHealth.memoryPercent || 0);
  const cpuPct = Number(sysHealth.cpuPercent || 0);
  const dbPing = sysHealth.dbLatencyMs;

  const getBarColor = (pct) => {
    if (pct >= 85) return "bg-rose-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse bg-white rounded-2xl border border-slate-200">
        Loading Enterprise Mission Control Cockpit...
      </div>
    );
  }

  const commands = [
    { key: "refresh_telemetry", label: "Refresh Live System Telemetry", icon: RefreshCw },
    { key: "run_diagnostics", label: "Run Live DB Ping & System Diagnostics", icon: Play },
    { key: "nav_sla", label: "Open SLA & SLO Management Center", tab: "sla-center", icon: ArrowRight },
    { key: "nav_obs", label: "Open Observability & Telemetry Center", tab: "observability", icon: ArrowRight },
    { key: "nav_fin", label: "Open SaaS Financial & Cost Center", tab: "financial-analytics", icon: ArrowRight },
    { key: "nav_risk", label: "Open Enterprise Risk Register", tab: "risk-register", icon: ArrowRight },
    { key: "nav_int", label: "Open Enterprise Integration Hub", tab: "enterprise-integrations", icon: ArrowRight },
    { key: "nav_tickets", label: "Open Support Tickets Queue", tab: "tickets", icon: ArrowRight }
  ].filter(
    (cmd) =>
      !commandSearch.trim() ||
      cmd.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
      cmd.key.includes(commandSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Compact White Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Compass size={16} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-tight">
              Enterprise Mission Control Center
            </h2>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Master System Telemetry, Real-Time Service Health, Command Palette & Executive Insights
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title="Toggle 30-second live auto-refresh"
          >
            <Radio size={12} className={autoRefresh ? "animate-pulse text-emerald-600" : ""} />
            {autoRefresh ? "Live (30s)" : "Auto-Refresh"}
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition"
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowCommandPalette(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 border border-slate-200 transition"
          >
            <Command size={12} /> Palette (Ctrl+Shift+K)
          </button>
          <button
            onClick={handleGenerateAi}
            disabled={generatingAi}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition"
          >
            <Sparkles size={12} className={generatingAi ? "animate-spin" : ""} />
            {generatingAi ? "Analyzing..." : "Generate AI Insights"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700">
            <X size={13} />
          </button>
        </div>
      )}

      {statusMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span className="font-medium">{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg("")} className="text-emerald-500 hover:text-emerald-700">
            <X size={13} />
          </button>
        </div>
      )}

      {/* White C-Suite Cockpit Telemetry Card */}
      <div className="bg-white text-slate-900 p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
              Master C-Suite Mission Control
            </div>
            <h3 className="text-sm font-black tracking-tight text-slate-900 mt-0.5">
              System & Business Health Engine
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {dbPing !== null && dbPing !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                DB Ping: {dbPing}ms
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                healthy
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              Engine: {summary.overallHealth || "UNKNOWN"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => navigateToTab("financial-analytics")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 text-left transition"
          >
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider flex items-center justify-between">
              <span>30d Payment MRR</span>
              <ArrowRight size={10} className="text-slate-400" />
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">{summary.mrr || "$0"}</div>
          </button>

          <button
            type="button"
            onClick={() => navigateToTab("financial-analytics")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 text-left transition"
          >
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider flex items-center justify-between">
              <span>Annual ARR Run Rate</span>
              <ArrowRight size={10} className="text-slate-400" />
            </div>
            <div className="text-base font-black text-emerald-600 mt-0.5">{summary.arr || "$0"}</div>
          </button>

          <button
            type="button"
            onClick={() => navigateToTab("sla-center")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 text-left transition"
          >
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider flex items-center justify-between">
              <span>Support SLA Resolution</span>
              <ArrowRight size={10} className="text-slate-400" />
            </div>
            <div className="text-base font-black text-indigo-600 mt-0.5">{summary.slaScore || "0%"}</div>
          </button>

          <button
            type="button"
            onClick={() => navigateToTab("tickets")}
            className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/80 text-left transition"
          >
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider flex items-center justify-between">
              <span>Urgent Incidents & Risks</span>
              <ArrowRight size={10} className="text-slate-400" />
            </div>
            <div className={`text-base font-black mt-0.5 ${(summary.activeAlertsCount ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {summary.activeAlertsCount ?? 0} ACTIVE
            </div>
          </button>
        </div>

        {/* Visual System Resource Threshold Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
              <span>Server Memory Utilization</span>
              <span className="font-mono font-black text-slate-900">{memPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getBarColor(memPct)}`} style={{ width: `${Math.min(100, memPct)}%` }} />
            </div>
          </div>

          <div className="bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
              <span>Node CPU Load</span>
              <span className="font-mono font-black text-slate-900">{cpuPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${getBarColor(cpuPct)}`} style={{ width: `${Math.min(100, cpuPct)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* White Executive AI Insights & Recommendations Card */}
      <div className="bg-white text-slate-900 p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-indigo-600 text-[11px] font-black uppercase tracking-wider">
            <Sparkles size={13} /> Executive AI Intelligence Analysis
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[9px] font-black uppercase text-indigo-600">
              {aiSummary.provider === "gemini" ? "Gemini AI" : "Rule-Based"}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700">
              Risk Score: {aiSummary.riskScore ?? 0}/100
            </span>
          </div>
        </div>
        <p className="text-xs font-medium leading-relaxed text-slate-700">
          {aiSummary.summaryText || "Click 'Generate AI Insights' to synthesize live operational telemetry."}
        </p>

        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <span className="text-[9px] font-black uppercase text-slate-400">Actionable Recommendations</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(aiSummary.recommendations || []).map((rec, i) => (
              <div
                key={i}
                className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px] text-slate-700 leading-snug"
              >
                • {rec}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Map Grid */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
          <Server size={14} className="text-indigo-600" />
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Active Platform Micro-Services Health Map
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
          {Object.entries(serviceMap).map(([svc, status]) => {
            const isWarn = String(status).includes("Failed") || String(status).includes("DEGRADED");
            return (
              <div
                key={svc}
                className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
              >
                <span className="capitalize text-[10px] font-bold text-slate-600 truncate">
                  {svc.replace(/([A-Z])/g, " $1")}
                </span>
                <span className={`font-black font-mono text-[10px] shrink-0 ${isWarn ? "text-rose-600" : "text-emerald-600"}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Alerts & Audit Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
            <AlertTriangle size={14} className="text-amber-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              System Alerts ({alerts.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {alerts.map((al, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigateToTab(al.targetTab)}
                className="w-full p-2 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 flex items-start justify-between gap-2 text-[11px] text-left transition"
              >
                <div>
                  <span className="font-bold text-slate-800">{al.sourceModule}:</span>{" "}
                  <span className="text-slate-600">{al.message}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      al.alertLevel === "critical"
                        ? "bg-rose-100 text-rose-700"
                        : al.alertLevel === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {al.alertLevel}
                  </span>
                  {al.targetTab && <ArrowRight size={11} className="text-slate-400" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
            <Activity size={14} className="text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recent Audit Feed ({feed.length})
            </h3>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {feed.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-3 text-center">No recent audit events logged.</p>
            ) : (
              feed.map((item, i) => (
                <div
                  key={i}
                  className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="font-mono font-bold text-slate-700 truncate">{item.action}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* White Command Palette Modal (Portal) */}
      {showCommandPalette &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 p-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowCommandPalette(false)}
            />
            <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-2xl p-4 border border-slate-200 shadow-2xl space-y-3">
              <div className="flex items-center gap-2.5 border-b pb-2.5 border-slate-100">
                <Search size={15} className="text-indigo-600" />
                <input
                  autoFocus
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  placeholder="Type a command or jump to module..."
                  className="w-full bg-transparent text-xs font-mono outline-none text-slate-900 placeholder-slate-400"
                />
                <button onClick={() => setShowCommandPalette(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs font-mono max-h-72 overflow-y-auto">
                {commands.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">No matching commands.</p>
                ) : (
                  commands.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.key}
                        onClick={() => handleExecuteCommand(cmd)}
                        className="w-full px-3 py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-xl text-left transition-colors flex items-center justify-between text-[11px] border border-slate-200/70"
                      >
                        <span>{cmd.label}</span>
                        <Icon size={13} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
