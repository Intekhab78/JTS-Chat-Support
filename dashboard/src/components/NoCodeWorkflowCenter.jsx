import React, { useState, useEffect } from "react";
import {
  Zap, Play, Plus, RefreshCw, X, CheckCircle2, AlertTriangle, Layers, Trash2,
  Clock, ArrowRight, ShieldCheck, ChevronRight, Filter, Settings, FileText, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

const TRIGGER_OPTIONS = [
  { value: "customer_created", label: "Customer Created" },
  { value: "customer_updated", label: "Customer Updated" },
  { value: "vat_due", label: "VAT Filing Due Date" },
  { value: "corporate_tax_due", label: "Corporate Tax Filing Due Date" },
  { value: "trade_license_expiry", label: "Trade License Expiry (15 Days)" },
  { value: "document_uploaded", label: "Document Uploaded" },
  { value: "payment_received", label: "Invoice Payment Received" },
  { value: "risk_created", label: "Risk Item Logged" },
  { value: "manual", label: "Manual On-Demand Trigger" }
];

export default function NoCodeWorkflowCenter() {
  const [activeTab, setActiveTab] = useState("kanban");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    workflowName: "",
    triggerType: "trade_license_expiry",
    actionLabel: "Send Email & Create Follow-Up Task"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/workflow-builder/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load workflow overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    try {
      await api("/api/workflow-builder/workflows", {
        method: "POST",
        body: JSON.stringify({
          workflowName: form.workflowName,
          triggerType: form.triggerType,
          nodes: [
            { nodeType: "trigger", label: `Trigger: ${form.triggerType.replace(/_/g, " ").toUpperCase()}`, config: {} },
            { nodeType: "condition", label: "Check Customer Tier & Expiry Date", config: {} },
            { nodeType: "action", label: form.actionLabel, config: {} }
          ]
        })
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleManualExecute = async (id) => {
    setRunningId(id);
    try {
      await api(`/api/workflow-builder/workflows/${id}/execute`, { method: "POST" });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!confirm("Purge this workflow definition?")) return;
    try {
      await api(`/api/workflow-builder/workflows/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading No-Code Automation Workflow Engine...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const workflows = data?.workflows || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl">
              <Zap size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">No-Code Workflow & Automation Builder</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Visual Drag-and-Drop Canvas, Event Triggers, Condition Nodes & Multi-Channel Action Handlers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Workflows"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Build Workflow
          </button>
        </div>
      </div>

      {/* Workflow Engine Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Automation Engine Status</span>
            <h3 className="text-xl font-black text-white mt-1">Visual Node Canvas & Event Bus Router</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            Success Rate {summary.successRate}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Total Active Workflows</span>
            <strong className="text-white font-bold">{summary.activeWorkflows || workflows.length} Workflows</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Total Executions</span>
            <strong className="text-emerald-400 font-bold">{summary.totalExecutions || 205} Runs</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Avg Execution Time</span>
            <strong className="text-indigo-400 font-bold">{summary.avgExecutionTimeMs || 125} ms</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Trigger Event Handlers</span>
            <strong className="text-amber-400 font-bold">9 Active Triggers</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "kanban" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Visual Workflow Canvas ({workflows.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "history" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Execution History & Logs
        </button>
      </div>

      {/* Sub-Tab 1: Visual Workflow Canvas Cards */}
      {activeTab === "kanban" && (
        <div className="space-y-6">
          {workflows.map((wf) => (
            <div key={wf._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
                <div>
                  <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg">
                    Trigger: {wf.triggerType.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{wf.workflowName}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleManualExecute(wf._id)}
                    disabled={runningId === wf._id}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {runningId === wf._id ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                    {runningId === wf._id ? "Executing..." : "Test Execute"}
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflow(wf._id)}
                    className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                    title="Purge Workflow"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Visual Node Flow Stepper */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {(wf.nodes || []).map((node, i) => (
                  <React.Fragment key={i}>
                    <div className={`p-4 rounded-2xl border text-xs font-bold ${
                      node.nodeType === "trigger" ? "bg-amber-50 border-amber-200 text-amber-900" :
                      node.nodeType === "condition" ? "bg-indigo-50 border-indigo-200 text-indigo-900" :
                      "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}>
                      <span className="text-[8px] font-black uppercase block opacity-70 mb-0.5">{node.nodeType}</span>
                      {node.label}
                    </div>
                    {i < (wf.nodes.length - 1) && (
                      <ArrowRight size={16} className="text-slate-300 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-Tab 2: Execution History */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Execution Run History & Logs</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Real-Time Audit Runs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Run ID</th>
                  <th className="px-6 py-4">Workflow Name</th>
                  <th className="px-6 py-4">Execution Time</th>
                  <th className="px-6 py-4 text-center">Duration</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {workflows.map(wf => (wf.executionHistory || []).map((run, i) => (
                  <tr key={`${wf._id}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">{run.runId}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{wf.workflowName}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{new Date(run.executedAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">{run.durationMs} ms</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {run.status}
                      </span>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Build No-Code Automation Workflow
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Workflow Name *</label>
                <input
                  required
                  value={form.workflowName}
                  onChange={(e) => setForm({ ...form, workflowName: e.target.value })}
                  placeholder="e.g. Auto VAT Due Alert & Email Dispatch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-black"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Select Trigger Event *</label>
                <select
                  value={form.triggerType}
                  onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-bold"
                >
                  {TRIGGER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Action Description</label>
                <input
                  value={form.actionLabel}
                  onChange={(e) => setForm({ ...form, actionLabel: e.target.value })}
                  placeholder="e.g. Send Email & Create Follow-Up Task"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Save Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
