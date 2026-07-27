import React, { useState, useEffect } from "react";
import {
  Compass, ThumbsUp, ToggleLeft, ToggleRight, Plus, RefreshCw, X, CheckCircle2,
  AlertTriangle, Layers, Target, Flag, Sparkles, Filter, Users, ArrowUpRight, ArrowRight, Trash2
} from "lucide-react";
import { api } from "../api/client.js";

const STATUS_COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "testing", label: "QA & Testing" },
  { key: "released", label: "Released" }
];

export default function ProductManagementCenter() {
  const [activeTab, setActiveTab] = useState("kanban");
  const [data, setData] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    module: "CRM Core",
    category: "core",
    priority: "high",
    businessValue: "high",
    status: "planned",
    targetVersion: "v1.2.0"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, featuresRes] = await Promise.all([
        api("/api/product-management/overview"),
        api("/api/product-management/features")
      ]);
      setData(overviewRes || {});
      setFeatures(featuresRes || []);
    } catch (err) {
      console.error("Failed to load product management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFeature = async (e) => {
    e.preventDefault();
    try {
      await api("/api/product-management/features", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to create feature");
    }
  };

  const handleVote = async (id) => {
    try {
      await api(`/api/product-management/features/${id}/vote`, { method: "POST" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMoveStatus = async (id, currentStatus) => {
    const statusOrder = ["backlog", "planned", "in_progress", "testing", "released"];
    const currIdx = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currIdx + 1) % statusOrder.length];
    try {
      await api(`/api/product-management/features/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to update feature status");
    }
  };

  const handleDeleteFeature = async (id, title) => {
    if (!confirm(`Are you sure you want to delete feature "${title}"?`)) return;
    try {
      await api(`/api/product-management/features/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to delete feature");
    }
  };

  const handleToggleFlag = async (id, currentVal) => {
    try {
      await api(`/api/product-management/features/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatureFlagEnabled: !currentVal })
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Product Management & Strategic Roadmap Center...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const vision = data?.productVision || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Compass size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Product Management & Strategic Roadmap Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Vision Milestones, Feature Backlog Kanban, Voting Portal & Feature Flag Control Center
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Roadmap"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add Feature Request
          </button>
        </div>
      </div>

      {/* Product Vision & Milestone Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl border border-indigo-800/80 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-indigo-800/60">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Product Vision Statement</span>
            <h3 className="text-lg font-black text-white mt-0.5">{vision.vision}</h3>
          </div>
          <div className="bg-indigo-600/30 border border-indigo-500/40 p-3 rounded-2xl text-center shrink-0">
            <span className="text-[8px] font-black uppercase text-indigo-300 block">Product Health Index</span>
            <strong className="text-2xl font-black text-emerald-400">{vision.productHealthScore}%</strong>
          </div>
        </div>

        <p className="text-xs font-bold text-slate-300 leading-relaxed max-w-4xl">{vision.mission}</p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Product Features</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{summary.totalFeatures || features.length}</h3>
          <p className="text-[10px] font-bold text-indigo-600 mt-1">{summary.releasedCount || 0} Released to Production</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">In-Development & Testing</span>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">{summary.inProgressCount || 0}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Target Version {vision.targetVersion}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Backlog & Planned</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{(summary.backlogCount || 0) + (summary.plannedCount || 0)}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Prioritized Features</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Feature Flags</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{summary.activeFeatureFlags || 0}</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Beta Toggles Active</p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "kanban" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Roadmap Kanban Board
        </button>
        <button
          onClick={() => setActiveTab("flags")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "flags" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Feature Flags & Beta Toggles
        </button>
      </div>

      {/* Sub-Tab 1: Roadmap Kanban Board */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => {
            const colFeatures = features.filter(f => f.status === col.key);
            return (
              <div key={col.key} className="bg-slate-50 p-4 rounded-3xl border border-slate-200/80 space-y-3 shrink-0 min-w-[250px]">
                <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                  <span className="text-xs font-black uppercase text-slate-900">{col.label}</span>
                  <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full border text-slate-600">{colFeatures.length}</span>
                </div>

                <div className="space-y-3">
                  {colFeatures.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-slate-200 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">No Features</p>
                    </div>
                  ) : colFeatures.map((feat) => (
                    <div key={feat._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{feat.category}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVote(feat._id)}
                            className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <ThumbsUp size={12} /> {feat.votesCount || 0}
                          </button>
                          <button
                            onClick={() => handleDeleteFeature(feat._id, feat.title)}
                            className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                            title="Delete Feature"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">{feat.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold line-clamp-2">{feat.description || "Enterprise SaaS feature enhancement."}</p>
                      
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                        <span>Target: {feat.targetVersion || "v1.2.0"}</span>
                        <button
                          onClick={() => handleMoveStatus(feat._id, feat.status)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-wider"
                          title="Advance to Next Stage"
                        >
                          Next <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Tab 2: Feature Flags */}
      {activeTab === "flags" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Feature Flags & Remote Runtime Beta Toggles</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{features.length} Flags Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Feature Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Target Release</th>
                  <th className="px-6 py-4 text-center">Status Flag</th>
                  <th className="px-6 py-4 text-right">Toggle Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {features.map((feat) => (
                  <tr key={feat._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">{feat.title}</td>
                    <td className="px-6 py-4 uppercase text-[10px] text-indigo-600 font-black">{feat.category}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">{feat.targetVersion}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                        feat.isFeatureFlagEnabled ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {feat.isFeatureFlagEnabled ? "ENABLED (LIVE)" : "DISABLED"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleFlag(feat._id, feat.isFeatureFlagEnabled)}
                        className="p-1.5 text-indigo-600 hover:text-indigo-900 transition-all"
                        title="Toggle Feature Flag"
                      >
                        {feat.isFeatureFlagEnabled ? <ToggleRight size={28} className="text-emerald-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Feature Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Submit Product Feature Request
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFeature} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Feature Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Automated E-Invoicing Integration"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    <option value="core">Core CRM</option>
                    <option value="compliance">VAT & Compliance</option>
                    <option value="finance">Finance & Billing</option>
                    <option value="observability">Observability</option>
                    <option value="governance">Governance</option>
                    <option value="ai">AI Automation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Initial Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="testing">QA & Testing</option>
                    <option value="released">Released</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Target Version</label>
                  <input
                    value={form.targetVersion}
                    onChange={(e) => setForm({ ...form, targetVersion: e.target.value })}
                    placeholder="e.g. v1.2.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Feature requirements and business goals..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Create Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
