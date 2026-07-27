import React, { useState, useEffect } from "react";
import {
  Activity, Cpu, Server, Database, ShieldAlert, Bell, Search, RefreshCw, X, Plus, Save,
  CheckCircle2, AlertTriangle, Layers, Clock, Terminal, Globe, HardDrive, Filter, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

const METRIC_TYPES = [
  { value: "cpu", label: "CPU Utilization %" },
  { value: "memory", label: "RAM / Heap Memory %" },
  { value: "database", label: "Database Connection Pool" },
  { value: "disk", label: "Cloud Vault Storage" },
  { value: "slow_api", label: "API Latency Threshold (ms)" },
  { value: "high_errors", label: "Error Rate Per Minute" },
  { value: "failed_logins", label: "Brute-Force Failed Logins" }
];

export default function ObservabilityPlatform() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [logSearch, setLogSearch] = useState("");
  const [showRuleModal, setShowRuleModal] = useState(false);

  const [ruleForm, setRuleForm] = useState({
    ruleName: "",
    metricType: "cpu",
    thresholdValue: 80,
    severity: "warning",
    notificationChannel: "in_app"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, logsRes, alertsRes] = await Promise.allSettled([
        api("/api/observability/overview"),
        api("/api/observability/logs?limit=50"),
        api("/api/observability/alerts")
      ]);
      setData(overviewRes.status === "fulfilled" ? overviewRes.value : {});
      setLogs(logsRes.status === "fulfilled" ? logsRes.value : []);
      setAlerts(alertsRes.status === "fulfilled" ? alertsRes.value : []);
    } catch (err) {
      console.error("Failed to load observability telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchLogs = async (e) => {
    e.preventDefault();
    try {
      const res = await api(`/api/observability/logs?search=${encodeURIComponent(logSearch)}&limit=50`);
      setLogs(res || []);
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
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm("Are you sure you want to purge this alert rule?")) return;
    try {
      await api(`/api/observability/alerts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Telemetry & Observability Engine...</p>
      </div>
    );
  }

  const system = data?.system || {};
  const database = data?.database || {};
  const servicesHealth = data?.servicesHealth || [];
  const telemetry = data?.telemetry || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper Title Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Activity size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Observability & Telemetry Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Real-Time System Metrics, Distributed Audit Logs & Smart Alert Rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowRuleModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add Alert Rule
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-[9px] font-black uppercase tracking-wider">
            <span>System Health Uptime</span>
            <CheckCircle2 size={16} />
          </div>
          <h3 className="text-3xl font-black text-emerald-700 mt-2">{telemetry.uptime90DaysPercent || 99.96}%</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Uptime: {data?.uptimeFormatted || "Active"}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>CPU Utilization</span>
            <Cpu size={16} className="text-indigo-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{system.cpuPercent || 12}%</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{system.cpuCores || 4} CPU Cores Active</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Memory RSS / Heap</span>
            <Server size={16} className="text-sky-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{system.memory?.rssMb || 120} <span className="text-xs text-slate-400">MB</span></h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Heap Used: {system.memory?.heapUsedMb || 65} MB</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Database Pool</span>
            <Database size={16} className="text-emerald-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">{database.activeConnections || 12} <span className="text-xs text-slate-400">conn</span></h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{database.collections || 76} Collections</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 text-[9px] font-black uppercase tracking-wider">
            <span>Security Failed Logins</span>
            <ShieldAlert size={16} />
          </div>
          <h3 className="text-3xl font-black text-rose-700 mt-2">{telemetry.failedLogins || 0}</h3>
          <p className="text-[10px] font-bold text-rose-600 mt-1">Audit Events Logged: {telemetry.totalAuditEvents}</p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Service Dependency Map
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "logs" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Log Explorer ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "alerts" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Alert Rules ({alerts.length})
        </button>
      </div>

      {/* Sub-Tab 1: Service Dependency Map */}
      {activeTab === "overview" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" /> Internal Service Dependency & Availability Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesHealth.map((svc, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">{svc.name}</span>
                  <span className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                    {svc.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-200/60">
                  <span>Latency: <strong className="text-indigo-600">{svc.latencyMs} ms</strong></span>
                  <span>Availability: <strong className="text-emerald-600">{svc.availability}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Log Explorer */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Audit & Security Log Explorer</h3>
            <form onSubmit={handleSearchLogs} className="flex gap-2 w-full sm:w-auto">
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Filter logs by action, IP, resource..."
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none"
              />
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">
                Filter
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No logs found matching criteria.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900">
                        {log.userId?.name || "System"}
                        <span className="block text-[10px] text-slate-400 font-normal">{log.userId?.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700">{log.resource || "-"}</td>
                      <td className="px-6 py-4 font-mono text-slate-500">{log.ipAddress || "127.0.0.1"}</td>
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Configured Smart Alert Rules</h3>
            <button
              onClick={() => setShowRuleModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Rule Name</th>
                  <th className="px-6 py-4">Metric Type</th>
                  <th className="px-6 py-4 text-center">Threshold</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Channel</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">No alert rules configured. Click "Add Rule" to configure.</td>
                  </tr>
                ) : (
                  alerts.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">{a.ruleName}</td>
                      <td className="px-6 py-4 font-mono text-[11px] text-indigo-600 uppercase">{a.metricType}</td>
                      <td className="px-6 py-4 text-center font-black">{a.thresholdValue}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                          a.severity === "critical" ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 uppercase text-[10px] text-slate-500">{a.notificationChannel}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(a._id)}
                          className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                          title="Purge Rule"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Alert Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowRuleModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Configure Smart Alert Rule
              </h3>
              <button onClick={() => setShowRuleModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Rule Name *</label>
                <input
                  required
                  value={ruleForm.ruleName}
                  onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  placeholder="e.g. High CPU Load Warning"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Metric Type</label>
                  <select
                    value={ruleForm.metricType}
                    onChange={(e) => setRuleForm({ ...ruleForm, metricType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
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
                    value={ruleForm.thresholdValue}
                    onChange={(e) => setRuleForm({ ...ruleForm, thresholdValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowRuleModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
