import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Activity, Cpu, Server, Database, ShieldAlert, RefreshCw, X, Plus,
  CheckCircle2, Layers, Pause, Play
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { api } from "../api/client.js";

const METRIC_TYPES = [
  { value: "cpu", label: "CPU Utilization %" },
  { value: "memory", label: "RAM / Memory %" },
  { value: "database", label: "Database Connection Pool" },
  { value: "slow_api", label: "DB / API Latency (ms)" },
  { value: "high_errors", label: "Errors Per Minute" },
  { value: "failed_logins", label: "Failed Login Attempts" }
];

export default function ObservabilityPlatform() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [logSearch, setLogSearch] = useState("");
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    ruleName: "",
    metricType: "cpu",
    thresholdValue: 80,
    severity: "warning",
    notificationChannel: "in_app",
    webhookUrl: ""
  });

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [overviewRes, logsRes, alertsRes] = await Promise.allSettled([
        api("/api/observability/overview"),
        api("/api/observability/logs?limit=50"),
        api("/api/observability/alerts")
      ]);
      setData(overviewRes.status === "fulfilled" ? overviewRes.value : {});
      setLogs(logsRes.status === "fulfilled" && Array.isArray(logsRes.value) ? logsRes.value : []);
      setAlerts(alertsRes.status === "fulfilled" && Array.isArray(alertsRes.value) ? alertsRes.value : []);
    } catch (err) {
      console.error("Failed to load observability telemetry:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      fetchData({ silent: true });
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  const handleSearchLogs = async (e) => {
    e.preventDefault();
    try {
      const res = await api(`/api/observability/logs?search=${encodeURIComponent(logSearch)}&limit=50`);
      setLogs(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Log search failed:", err);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await api("/api/observability/alerts", {
        method: "POST",
        body: JSON.stringify(ruleForm)
      });
      setShowRuleModal(false);
      setRuleForm({
        ruleName: "",
        metricType: "cpu",
        thresholdValue: 80,
        severity: "warning",
        notificationChannel: "in_app",
        webhookUrl: ""
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm("Are you sure you want to delete this alert rule?")) return;
    try {
      await api(`/api/observability/alerts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loading Telemetry & Observability Engine...</p>
      </div>
    );
  }

  const system = data?.system || {};
  const database = data?.database || {};
  const servicesHealth = data?.servicesHealth || [];
  const telemetry = data?.telemetry || {};
  const evaluatedMap = Object.fromEntries((data?.evaluatedRules || []).map(r => [String(r._id), r]));

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Enterprise Observability & Telemetry Center</h2>
            <p className="text-[10px] font-medium text-slate-400">
              Real-Time System Metrics, Distributed Audit Logs & Smart Alert Rules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
            title="Toggle 15s Auto-Refresh"
          >
            {autoRefresh ? <Pause size={12} /> : <Play size={12} />}
            {autoRefresh ? "Live 15s" : "Paused"}
          </button>
          <button
            onClick={() => fetchData({ silent: true })}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button
            onClick={() => setShowRuleModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Alert Rule
          </button>
        </div>
      </div>

      {/* Compact KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-100">
          <div className="flex items-center justify-between text-emerald-700 text-[9px] font-black uppercase tracking-wider">
            <span>System Health</span>
            <CheckCircle2 size={14} />
          </div>
          <h3 className="text-xl font-black text-emerald-700 mt-1">{telemetry.healthScorePercent ?? 100}%</h3>
          <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Uptime: {data?.uptimeFormatted || "0s"}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[9px] font-black uppercase tracking-wider">
            <span>CPU Utilization</span>
            <Cpu size={14} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">{system.cpuPercent ?? 0}%</h3>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{system.cpuCores ?? 0} CPU Cores Active</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[9px] font-black uppercase tracking-wider">
            <span>Memory RSS / Heap</span>
            <Server size={14} className="text-sky-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            {system.memory?.rssMb ?? 0} <span className="text-[11px] font-bold text-slate-400">MB</span>
          </h3>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Heap Used: {system.memory?.heapUsedMb ?? 0} MB</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-[9px] font-black uppercase tracking-wider">
            <span>Database Pool</span>
            <Database size={14} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            {database.activeConnections ?? 0} <span className="text-[11px] font-bold text-slate-400">conn</span>
          </h3>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
            {database.collections ?? 0} Collections · {database.latencyMs ?? 0}ms
          </p>
        </div>

        <div className="bg-rose-50/80 p-3.5 rounded-xl border border-rose-100 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-700 text-[9px] font-black uppercase tracking-wider">
            <span>Failed Logins</span>
            <ShieldAlert size={14} />
          </div>
          <h3 className="text-xl font-black text-rose-700 mt-1">{telemetry.failedLogins ?? 0}</h3>
          <p className="text-[10px] font-semibold text-rose-600 mt-0.5">Audit Events: {telemetry.totalAuditEvents ?? 0}</p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 w-fit gap-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Service Dependency Map
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "logs" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Log Explorer ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "alerts" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Alert Rules ({alerts.length})
        </button>
      </div>

      {/* Sub-Tab 1: Service Dependency Map & Time-Series Charts */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100 flex items-center gap-1.5">
              <Layers size={15} className="text-indigo-600" /> Internal Service Dependency & Availability Health
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {servicesHealth.map((svc, i) => (
                <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-[11px] truncate">{svc.name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${
                      svc.status === "healthy"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                      {svc.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-1.5 border-t border-slate-200/60">
                    <span>Latency: <strong className="text-indigo-600">{svc.latencyMs} ms</strong></span>
                    <span className="truncate max-w-[140px]" title={svc.detail}>{svc.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">CPU & Memory Utilization (%)</h4>
                <span className="text-[10px] font-mono text-slate-400">{(data?.history || []).length} samples</span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.history || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                    <Area type="monotone" dataKey="cpuPercent" name="CPU %" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.18} strokeWidth={2} />
                    <Area type="monotone" dataKey="memoryPercent" name="Memory %" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">DB & Event Loop Latency (ms)</h4>
                <span className="text-[10px] font-mono text-slate-400">Real-time ms</span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.history || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "10px" }} />
                    <Area type="monotone" dataKey="dbLatencyMs" name="MongoDB Ping (ms)" stroke="#10b981" fill="#10b981" fillOpacity={0.18} strokeWidth={2} />
                    <Area type="monotone" dataKey="eventLoopLatencyMs" name="Event Loop (ms)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Log Explorer */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Audit & Security Log Explorer</h3>
            <form onSubmit={handleSearchLogs} className="flex gap-1.5 w-full sm:w-auto">
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Filter by action, IP, entity..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-indigo-500 flex-1 sm:w-56"
              />
              <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase">
                Filter
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Resource</th>
                  <th className="px-4 py-2.5">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">No logs found matching criteria.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-slate-900">{log.actorId?.name || log.actorName || "System"}</span>
                        {log.actorId?.email && (
                          <span className="block text-[10px] text-slate-400 font-normal">{log.actorId.email}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{log.entityType || log.resource || "-"}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{log.ipAddress || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Alert Rules */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Configured Smart Alert Rules</h3>
            <button
              onClick={() => setShowRuleModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm flex items-center gap-1"
            >
              <Plus size={12} /> Add Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-4 py-2.5">Rule Name</th>
                  <th className="px-4 py-2.5">Metric</th>
                  <th className="px-4 py-2.5 text-center">Threshold</th>
                  <th className="px-4 py-2.5 text-center">Live State</th>
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Channel</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      No alert rules configured. Click "Add Rule" to configure.
                    </td>
                  </tr>
                ) : (
                  alerts.map((a) => {
                    const evalState = evaluatedMap[String(a._id)];
                    return (
                      <tr key={a._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{a.ruleName}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-indigo-600 uppercase">{a.metricType}</td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold">{a.thresholdValue}</td>
                        <td className="px-4 py-2.5 text-center">
                          {evalState ? (
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                              evalState.triggered
                                ? "bg-rose-50 text-rose-600 border-rose-200"
                                : "bg-emerald-50 text-emerald-600 border-emerald-200"
                            }`}>
                              {evalState.triggered ? `Triggered (${evalState.currentVal})` : `OK (${evalState.currentVal})`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            a.severity === "critical"
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : a.severity === "info"
                              ? "bg-sky-50 text-sky-600 border border-sky-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          }`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 uppercase text-[10px] text-slate-500">{a.notificationChannel}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteRule(a._id)}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                            title="Delete Rule"
                          >
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Alert Rule Modal */}
      {showRuleModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowRuleModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Configure Smart Alert Rule
              </h3>
              <button onClick={() => setShowRuleModal(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Rule Name *</label>
                <input
                  required
                  value={ruleForm.ruleName}
                  onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  placeholder="e.g. High CPU Load Warning"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Metric Type</label>
                  <select
                    value={ruleForm.metricType}
                    onChange={(e) => setRuleForm({ ...ruleForm, metricType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    {METRIC_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Threshold Value</label>
                  <input
                    type="number"
                    required
                    value={ruleForm.thresholdValue}
                    onChange={(e) => setRuleForm({ ...ruleForm, thresholdValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Severity</label>
                  <select
                    value={ruleForm.severity}
                    onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Notification Channel</label>
                  <select
                    value={ruleForm.notificationChannel}
                    onChange={(e) => setRuleForm({ ...ruleForm, notificationChannel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="in_app">In-App</option>
                    <option value="email">Email</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>
              </div>

              {ruleForm.notificationChannel === "webhook" && (
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Webhook / Slack URL</label>
                  <input
                    type="url"
                    value={ruleForm.webhookUrl}
                    onChange={(e) => setRuleForm({ ...ruleForm, webhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowRuleModal(false)} className="px-4 py-2 text-slate-500 font-bold uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold uppercase text-[10px] rounded-xl shadow-sm hover:bg-indigo-700">
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
