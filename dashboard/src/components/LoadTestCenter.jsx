import React, { useState, useEffect } from "react";
import {
  Zap, Play, Activity, Cpu, Server, Database, TrendingUp, AlertTriangle, Layers,
  RefreshCw, Download, Trash2, Clock, CheckCircle2, ShieldCheck, HelpCircle, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

const PRESET_PROFILES = [
  { value: "100", label: "100 Users", count: 100 },
  { value: "500", label: "500 Users", count: 500 },
  { value: "1000", label: "1,000 Users", count: 1000 },
  { value: "5000", label: "5,000 Users", count: 5000 },
  { value: "10000", label: "10,000 Users", count: 10000 },
  { value: "50000", label: "50,000 Users", count: 50000 },
  { value: "100000", label: "100,000 Users", count: 100000 }
];

export default function LoadTestCenter() {
  const [data, setData] = useState({ history: [], capacityForecast: {} });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState("1000");
  const [customUsers, setCustomUsers] = useState(1000);
  const [durationSec, setDurationSec] = useState(15);
  const [targetEndpoint, setTargetEndpoint] = useState("/api/health");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/load-testing/history");
      setData(res || { history: [], capacityForecast: {} });
    } catch (err) {
      console.error("Failed to load load testing history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileChange = (val) => {
    setSelectedProfile(val);
    const found = PRESET_PROFILES.find(p => p.value === val);
    if (found) setCustomUsers(found.count);
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setRunning(true);
    try {
      await api("/api/load-testing/run", {
        method: "POST",
        body: JSON.stringify({
          testName: `${customUsers.toLocaleString()} Users Load Simulation`,
          profile: selectedProfile,
          concurrentUsers: customUsers,
          durationSeconds: durationSec,
          targetEndpoint
        })
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteRun = async (id) => {
    if (!confirm("Purge this test result from history?")) return;
    try {
      await api(`/api/load-testing/history/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Load Testing & Capacity Engine...</p>
      </div>
    );
  }

  const history = data.history || [];
  const latestRun = history[0] || {};
  const forecast = data.capacityForecast || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Zap size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Load Testing & Capacity Planning Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Synthetic In-App Micro-Benchmarks, Stress Simulations & Infrastructure Scaling Recommendations
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors w-fit"
          title="Refresh History"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Test Execution Control Panel Card */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-slate-800">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-white">Synthetic Load Simulation Launcher</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Evaluate Node.js event loop throughput under traffic stress</p>
          </div>
          <button
            onClick={handleRunSimulation}
            disabled={running}
            className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {running ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
            {running ? "Simulating Traffic..." : "Launch Load Test"}
          </button>
        </div>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs font-bold">
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Predefined Traffic Profile</label>
            <select
              value={selectedProfile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-white font-black"
            >
              {PRESET_PROFILES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Simulated Concurrent Users</label>
            <input
              type="number"
              value={customUsers}
              onChange={(e) => setCustomUsers(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-white font-black"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Test Duration (Seconds)</label>
            <input
              type="number"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-white font-black"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Target API Endpoint</label>
            <select
              value={targetEndpoint}
              onChange={(e) => setTargetEndpoint(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none text-white font-black"
            >
              <option value="/api/health">/api/health (Health Route)</option>
              <option value="/api/crm/customers">/api/crm/customers (CRM List)</option>
              <option value="/api/users/me">/api/users/me (User Profile)</option>
            </select>
          </div>
        </form>
      </div>

      {/* Latest Benchmark Results Card */}
      {latestRun.testName && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Latest Execution Benchmark</span>
              <h3 className="text-base font-black text-slate-900 mt-1">{latestRun.testName}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">{new Date(latestRun.createdAt).toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Simulated Throughput</span>
              <strong className="text-2xl font-black text-indigo-600 mt-1 block">{latestRun.requestsPerSecond} <span className="text-xs text-slate-400">RPS</span></strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Avg Response Time</span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">{latestRun.avgResponseTimeMs} <span className="text-xs text-slate-400">ms</span></strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Min / Max Latency</span>
              <strong className="text-sm font-black text-slate-800 mt-2 block">{latestRun.minResponseTimeMs}ms / {latestRun.maxResponseTimeMs}ms</strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Peak CPU Load</span>
              <strong className="text-2xl font-black text-slate-900 mt-1 block">{latestRun.peakCpuPercent}%</strong>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Error Rate</span>
              <strong className="text-2xl font-black text-emerald-600 mt-1 block">{latestRun.errorRatePercent}%</strong>
            </div>
          </div>

          {/* Automated Bottlenecks & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-2">
              <h4 className="text-xs font-black uppercase text-amber-800 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Detected Bottlenecks
              </h4>
              <ul className="space-y-1 text-xs font-bold text-slate-700">
                {(latestRun.bottlenecksDetected || []).map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 space-y-2">
              <h4 className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1.5">
                <ShieldCheck size={14} /> Scaling Recommendations
              </h4>
              <ul className="space-y-1 text-xs font-bold text-slate-700">
                {(latestRun.scalingRecommendations || []).map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Historical Test Executions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Historical Load Test Executions</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{history.length} Test Runs Saved</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <th className="px-6 py-4">Test Name</th>
                <th className="px-6 py-4 text-center">Users</th>
                <th className="px-6 py-4 text-center">RPS</th>
                <th className="px-6 py-4 text-center">Avg Latency</th>
                <th className="px-6 py-4 text-center">Peak CPU</th>
                <th className="px-6 py-4 text-center">Peak RAM</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No load test runs logged. Launch a test above.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {item.testName}
                      <span className="block text-[10px] text-slate-400 font-normal">{new Date(item.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-indigo-600">{item.concurrentUsers}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{item.requestsPerSecond} req/s</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">{item.avgResponseTimeMs} ms</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{item.peakCpuPercent}%</td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{item.peakMemoryMb} MB</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteRun(item._id)}
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                        title="Delete Result"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
