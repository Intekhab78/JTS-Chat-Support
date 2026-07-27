import React, { useState, useEffect } from "react";
import {
  ShieldAlert, AlertTriangle, Plus, Search, Filter, RefreshCw, X, Save,
  CheckCircle2, Clock, MessageSquare, ChevronRight, User, Trash2, ArrowUpRight, TrendingUp, ShieldCheck
} from "lucide-react";
import { api } from "../api/client.js";

const CATEGORIES = [
  "Business Risk",
  "Technical Risk",
  "Security Risk",
  "Compliance Risk",
  "Operational Risk",
  "Financial Risk",
  "Infrastructure Risk"
];

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-amber-50 text-amber-700 border-amber-200" },
  in_mitigation: { label: "In Mitigation", color: "bg-sky-50 text-sky-700 border-sky-200" },
  accepted: { label: "Accepted", color: "bg-slate-100 text-slate-700 border-slate-200" },
  closed: { label: "Closed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
};

function getScoreBadge(score) {
  if (score >= 20) return { label: "Critical", color: "bg-rose-600 text-white" };
  if (score >= 15) return { label: "High", color: "bg-orange-500 text-white" };
  if (score >= 8) return { label: "Medium", color: "bg-amber-500 text-white" };
  return { label: "Low", color: "bg-emerald-600 text-white" };
}

export default function RiskRegisterManager({ websiteId }) {
  const [data, setData] = useState({ summary: {}, risks: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [selectedRiskDrawer, setSelectedRiskDrawer] = useState(null);
  const [newComment, setNewComment] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Security Risk",
    probability: 3,
    impact: 3,
    mitigationPlan: "",
    status: "open"
  });

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);
      if (categoryFilter) params.append("category", categoryFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await api(`/api/risks?${params.toString()}`);
      setData(res || { summary: {}, risks: [] });
    } catch (err) {
      console.error("Failed to load risk register:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [websiteId, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingRisk(null);
    setForm({
      title: "",
      description: "",
      category: "Security Risk",
      probability: 3,
      impact: 3,
      mitigationPlan: "",
      status: "open"
    });
    setShowModal(true);
  };

  const handleOpenEdit = (risk) => {
    setEditingRisk(risk);
    setForm({
      title: risk.title || "",
      description: risk.description || "",
      category: risk.category || "Security Risk",
      probability: risk.probability || 3,
      impact: risk.impact || 3,
      mitigationPlan: risk.mitigationPlan || "",
      status: risk.status || "open"
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRisk) {
        await api(`/api/risks/${editingRisk._id}`, {
          method: "PATCH",
          body: JSON.stringify(form)
        });
      } else {
        await api("/api/risks", {
          method: "POST",
          body: JSON.stringify({ ...form, websiteId })
        });
      }
      setShowModal(false);
      fetchRisks();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to purge this risk record?")) return;
    try {
      await api(`/api/risks/${id}`, { method: "DELETE" });
      fetchRisks();
      if (selectedRiskDrawer?._id === id) setSelectedRiskDrawer(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedRiskDrawer) return;
    try {
      const updated = await api(`/api/risks/${selectedRiskDrawer._id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment })
      });
      setSelectedRiskDrawer(updated);
      setNewComment("");
      fetchRisks();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper Title Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Risk Register</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            CTO & Compliance Risk Governance, Heat Matrices & Mitigation Controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRisks}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Log New Risk
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Logged</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{data.summary?.totalRisks || 0}</h3>
        </div>
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Critical Risks (Score ≥15)</p>
          <h3 className="text-2xl font-black text-rose-700 mt-1">{data.summary?.criticalRisks || 0}</h3>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-amber-600 tracking-wider">Active Open Risks</p>
          <h3 className="text-2xl font-black text-amber-700 mt-1">{data.summary?.openRisks || 0}</h3>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Resolved / Closed</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">{data.summary?.closedRisks || 0}</h3>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <p className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Avg Risk Exposure</p>
          <h3 className="text-2xl font-black text-indigo-700 mt-1">{data.summary?.avgRiskScore || 0} <span className="text-xs text-slate-400">/25</span></h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
          <input
            placeholder="Search risk title, mitigation plan, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
        >
          <option value="">All Risk Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_mitigation">In Mitigation</option>
          <option value="accepted">Accepted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Main Risk Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <th className="px-6 py-4">Risk Item</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">P × I Matrix</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading risk register...</td>
                </tr>
              ) : data.risks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No risk records found matching criteria.</td>
                </tr>
              ) : (
                data.risks.map((risk) => {
                  const badge = getScoreBadge(risk.riskScore);
                  const statusConf = STATUS_CONFIG[risk.status] || STATUS_CONFIG.open;
                  return (
                    <tr key={risk._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-black text-slate-900 truncate hover:text-indigo-600 cursor-pointer" onClick={() => setSelectedRiskDrawer(risk)}>
                          {risk.title}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{risk.description || "No description provided."}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {risk.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-[11px] font-mono">
                        Prob: <strong className="text-slate-900">{risk.probability}</strong> × Imp: <strong className="text-slate-900">{risk.impact}</strong>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-sm ${badge.color}`}>
                          {risk.riskScore} — {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-800">{risk.ownerId?.name || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedRiskDrawer(risk)}
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                            title="View Mitigation Details & Notes"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(risk)}
                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                            title="Edit Risk"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(risk._id)}
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                            title="Purge Risk"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log / Edit Risk Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" />
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  {editingRisk ? "Edit Risk Record" : "Log Enterprise Risk Item"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Risk Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Failure to comply with FTA Corporate Tax Filing deadline"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_mitigation">In Mitigation</option>
                    <option value="accepted">Accepted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Probability (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Impact (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.impact}
                    onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Mitigation Plan</label>
                <textarea
                  rows={3}
                  value={form.mitigationPlan}
                  onChange={(e) => setForm({ ...form, mitigationPlan: e.target.value })}
                  placeholder="Outline preventive controls, backup procedures, or policy changes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-rose-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-rose-700">
                  {editingRisk ? "Save Changes" : "Create Risk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Risk Details & Comments Side Drawer */}
      {selectedRiskDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedRiskDrawer(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{selectedRiskDrawer.category}</span>
                  <h3 className="text-lg font-black text-slate-900">{selectedRiskDrawer.title}</h3>
                </div>
                <button onClick={() => setSelectedRiskDrawer(null)} className="p-2 text-slate-400 hover:text-slate-900">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400">Risk Assessment</p>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">Probability</span>
                    <strong className="text-slate-900">{selectedRiskDrawer.probability} / 5</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">Impact</span>
                    <strong className="text-slate-900">{selectedRiskDrawer.impact} / 5</strong>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">Score</span>
                    <strong className="text-rose-600">{selectedRiskDrawer.riskScore}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400">Mitigation Strategy</h4>
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-xs font-bold text-slate-700 leading-relaxed">
                  {selectedRiskDrawer.mitigationPlan || "No mitigation plan documented yet."}
                </div>
              </div>

              {/* Discussion & Audit Log */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-400">Audit Comments & Discussion</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {(selectedRiskDrawer.comments || []).length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No notes logged yet.</p>
                  ) : (
                    selectedRiskDrawer.comments.map((c, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase">
                          <span>{c.authorName}</span>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-bold text-slate-800">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add audit note..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase">
                    Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
