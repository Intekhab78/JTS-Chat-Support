import React, { useState, useEffect } from "react";
import {
  Compass, ShieldCheck, Activity, Cpu, Server, Zap, Sparkles, RefreshCw, X,
  Search, Command, Play, AlertTriangle, ArrowUpRight, CheckCircle2, Layers, Globe
} from "lucide-react";
import { api } from "../api/client.js";

export default function MissionControlCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/mission-control/telemetry");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load mission control telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    try {
      await api("/api/mission-control/generate-ai-summary", { method: "POST" });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleExecuteCommand = async (cmdKey) => {
    try {
      await api("/api/mission-control/command-palette", {
        method: "POST",
        body: JSON.stringify({ commandKey: cmdKey })
      });
      setShowCommandPalette(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Mission Control Cockpit...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const serviceMap = data?.serviceMap || {};
  const doc = data?.doc || {};
  const alerts = doc?.activeAlerts || [];
  const feed = doc?.activityFeed || [];
  const aiSummary = doc?.aiExecutiveSummary || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-rose-600 to-indigo-600 text-white rounded-xl">
              <Compass size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Mission Control Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Master System Telemetry, Real-Time Service Health, Live Command Palette & Executive AI Insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-mono text-xs font-bold flex items-center gap-2 border border-slate-200 transition-colors"
          >
            <Command size={14} /> Press Ctrl + K
          </button>

          <button
            onClick={handleGenerateAi}
            disabled={generatingAi}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {generatingAi ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generatingAi ? "Analyzing..." : "Generate AI Insights"}
          </button>
        </div>
      </div>

      {/* C-Suite Cockpit Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Master C-Suite Mission Control</span>
            <h3 className="text-xl font-black text-white mt-1">System & Business Health Engine</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.overallHealth}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Monthly MRR Run Rate</span>
            <strong className="text-white font-bold">{summary.mrr}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Annual ARR Run Rate</span>
            <strong className="text-emerald-400 font-bold">{summary.arr}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Tax & Audit Readiness</span>
            <strong className="text-indigo-400 font-bold">{summary.complianceScore}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Critical Incidents</span>
            <strong className="text-rose-400 font-bold">0 ACTIVE</strong>
          </div>
        </div>
      </div>

      {/* Executive AI Insights & Recommendations Card */}
      <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-8 rounded-3xl border border-indigo-800/60 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
          <Sparkles size={16} /> Executive AI Intelligence Analysis
        </div>
        <p className="text-sm font-bold leading-relaxed text-indigo-100">{aiSummary.summaryText}</p>

        <div className="pt-3 border-t border-indigo-900/80 space-y-2">
          <span className="text-[9px] font-black uppercase text-indigo-300">AI Recommendations</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(aiSummary.recommendations || []).map((rec, i) => (
              <div key={i} className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-800/60 text-xs font-bold text-slate-200">
                • {rec}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Map Grid */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
          <Server size={18} className="text-indigo-600" /> Active Platform Micro-Services Health Map
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
          {Object.entries(serviceMap).map(([svc, status]) => (
            <div key={svc} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <span className="capitalize text-slate-600">{svc.replace(/([A-Z])/g, " $1")}</span>
              <span className="font-black text-emerald-600 font-mono text-[10px]">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowCommandPalette(false)} />
          <div className="relative w-full max-w-xl bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b pb-3 border-slate-800">
              <Search size={18} className="text-indigo-400" />
              <input
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Type a command or module name..."
                className="w-full bg-transparent text-sm font-mono outline-none text-white placeholder-slate-500"
              />
              <button onClick={() => setShowCommandPalette(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <button
                onClick={() => handleExecuteCommand("trigger_smoke_tests")}
                className="w-full p-3 bg-slate-800 hover:bg-indigo-600 rounded-xl text-left transition-colors flex items-center justify-between"
              >
                <span>Run Release Pre-Flight Smoke Test Suite</span>
                <Play size={14} />
              </button>
              <button
                onClick={() => handleExecuteCommand("flush_pwa_cache")}
                className="w-full p-3 bg-slate-800 hover:bg-indigo-600 rounded-xl text-left transition-colors flex items-center justify-between"
              >
                <span>Sync PWA Offline Mutation Queue</span>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
