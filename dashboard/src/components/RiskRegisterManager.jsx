import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShieldAlert, AlertTriangle, Plus, Search, Filter, RefreshCw, X, Save, Download, Paperclip, ExternalLink,
  CheckCircle2, Clock, MessageSquare, ChevronRight, User, Trash2, ArrowUpRight, TrendingUp, ShieldCheck, Edit3
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
  const [data, setData] = useState({ summary: {}, owners: [], risks: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [selectedRiskDrawer, setSelectedRiskDrawer] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [matrixCellFilter, setMatrixCellFilter] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Security Risk",
    probability: 3,
    impact: 3,
    residualProbability: "",
    residualImpact: "",
    mitigationPlan: "",
    reviewDate: "",
    ownerId: "",
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
    const timer = setTimeout(() => {
      fetchRisks();
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [websiteId, categoryFilter, statusFilter, search]);

  const handleOpenCreate = () => {
    setEditingRisk(null);
    setForm({
      title: "",
      description: "",
      category: "Security Risk",
      probability: 3,
      impact: 3,
      residualProbability: "",
      residualImpact: "",
      mitigationPlan: "",
      reviewDate: "",
      ownerId: "",
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
      residualProbability: risk.residualProbability ?? "",
      residualImpact: risk.residualImpact ?? "",
      mitigationPlan: risk.mitigationPlan || "",
      reviewDate: risk.reviewDate ? new Date(risk.reviewDate).toISOString().slice(0, 10) : "",
      ownerId: risk.ownerId?._id || risk.ownerId || "",
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

  const handleUploadEvidence = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRiskDrawer) return;
    setUploadingEvidence(true);
    try {
      const fd = new FormData();
      fd.append("attachment", file);
      fd.append("name", file.name);
      const updated = await api(`/api/risks/${selectedRiskDrawer._id}/attachments`, {
        method: "POST",
        body: fd
      });
      setSelectedRiskDrawer(updated);
      fetchRisks();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingEvidence(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!selectedRiskDrawer) return;
    try {
      const updated = await api(`/api/risks/${selectedRiskDrawer._id}/attachments/${attachmentId}`, {
        method: "DELETE"
      });
      setSelectedRiskDrawer(updated);
      fetchRisks();
    } catch (err) {
      alert(err.message);
    }
  };

  const displayedRisks = matrixCellFilter
    ? (data.risks || []).filter(
      (r) => Number(r.probability) === matrixCellFilter.p && Number(r.impact) === matrixCellFilter.i
    )
    : data.risks || [];

  const isOverdueRisk = (risk) => {
    if (!risk?.reviewDate || risk.status === "closed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(risk.reviewDate) < today;
  };

  const handleExportCsv = () => {
    const rows = [
      ["Title", "Category", "Probability", "Impact", "Score", "Owner", "Status", "Review Date", "Overdue", "Mitigation Plan"],
      ...displayedRisks.map((r) => [
        r.title || "",
        r.category || "",
        r.probability || 0,
        r.impact || 0,
        r.riskScore || 0,
        r.ownerId?.name || "Unassigned",
        r.status || "open",
        r.reviewDate ? new Date(r.reviewDate).toISOString().slice(0, 10) : "",
        isOverdueRisk(r) ? "YES" : "NO",
        r.mitigationPlan || ""
      ])
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `Enterprise_Risk_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRisks}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 font-black text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1.5"
            title="Export Risk Register CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={15} /> Log New Risk
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

      {/* Interactive 5x5 Risk Heat Matrix */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">5×5 Risk Heat Matrix (Probability × Impact)</h3>
            <p className="text-[10px] text-slate-400">Click any cell to filter risks by exact likelihood & impact score.</p>
          </div>
          {matrixCellFilter && (
            <button
              onClick={() => setMatrixCellFilter(null)}
              className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase"
            >
              Clear Cell Filter (P{matrixCellFilter.p} × I{matrixCellFilter.i})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[420px] grid grid-cols-6 gap-1.5 text-center text-[10px]">
            <div className="font-black text-slate-400 uppercase flex items-center justify-center">P \ I</div>
            {[1, 2, 3, 4, 5].map((imp) => (
              <div key={imp} className="font-black text-slate-500 uppercase py-1">Impact {imp}</div>
            ))}
            {[5, 4, 3, 2, 1].map((prob) => (
              <React.Fragment key={prob}>
                <div className="font-black text-slate-500 uppercase flex items-center justify-center">Prob {prob}</div>
                {[1, 2, 3, 4, 5].map((imp) => {
                  const score = prob * imp;
                  const count = (data.risks || []).filter((r) => Number(r.probability) === prob && Number(r.impact) === imp).length;
                  const isSelected = matrixCellFilter?.p === prob && matrixCellFilter?.i === imp;
                  const cellTone =
                    score >= 20 ? "bg-rose-100 text-rose-800 border-rose-200" :
                      score >= 15 ? "bg-orange-100 text-orange-800 border-orange-200" :
                        score >= 8 ? "bg-amber-50 text-amber-800 border-amber-200" :
                          "bg-emerald-50 text-emerald-800 border-emerald-200";
                  return (
                    <button
                      type="button"
                      key={`${prob}-${imp}`}
                      onClick={() => setMatrixCellFilter(isSelected ? null : { p: prob, i: imp })}
                      className={`py-2 px-1 rounded-lg border font-bold transition-all ${cellTone} ${isSelected ? "ring-2 ring-slate-900 scale-[1.02]" : "hover:opacity-85"
                        }`}
                      title={`Probability ${prob} × Impact ${imp} = Score ${score} (${count} risks)`}
                    >
                      <span className="block text-[9px] opacity-70">{score}</span>
                      <span className="text-xs font-black">{count}</span>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
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
              ) : displayedRisks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No risk records found matching criteria.</td>
                </tr>
              ) : (
                displayedRisks.map((risk) => {
                  const badge = getScoreBadge(risk.riskScore);
                  const statusConf = STATUS_CONFIG[risk.status] || STATUS_CONFIG.open;
                  return (
                    <tr key={risk._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-slate-900 truncate hover:text-indigo-600 cursor-pointer" onClick={() => setSelectedRiskDrawer(risk)}>
                            {risk.title}
                          </p>
                          {isOverdueRisk(risk) && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                              Overdue
                            </span>
                          )}
                        </div>
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
                        {risk.residualRiskScore != null && (
                          <span className="block text-[9px] font-black text-emerald-600 mt-1">
                            Residual: {risk.residualRiskScore}/25
                          </span>
                        )}
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
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl p-4 border border-slate-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  {editingRisk ? "Edit Risk Record" : "Log Enterprise Risk Item"}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getScoreBadge((form.probability || 3) * (form.impact || 3)).color}`}>
                  Score: {(form.probability || 3) * (form.impact || 3)} ({getScoreBadge((form.probability || 3) * (form.impact || 3)).label})
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-900">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Risk Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Failure to meet primary customer service SLA uptime"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_mitigation">In Mitigation</option>
                    <option value="accepted">Accepted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Prob (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Description / Context</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe threat vector or compliance impact..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Mitigation Plan</label>
                  <textarea
                    rows={2}
                    value={form.mitigationPlan}
                    onChange={(e) => setForm({ ...form, mitigationPlan: e.target.value })}
                    placeholder="Outline preventive controls or backup procedures..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                <div>
                  <label className="text-[9px] font-black uppercase text-emerald-700 block mb-1">Residual Prob (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="Opt"
                    value={form.residualProbability}
                    onChange={(e) => setForm({ ...form, residualProbability: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-emerald-700 block mb-1">Residual Impact (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    placeholder="Opt"
                    value={form.residualImpact}
                    onChange={(e) => setForm({ ...form, residualImpact: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between px-2">
                  <div>
                    <span className="text-[9px] font-black uppercase text-emerald-700 block">Post-Control Residual Score</span>
                    <span className="text-[10px] text-slate-500">Target risk after mitigation</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-xs font-black text-emerald-700">
                    {form.residualProbability && form.residualImpact
                      ? `${Number(form.residualProbability) * Number(form.residualImpact)} / 25`
                      : "Not Set"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2.5 flex-1">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Risk Owner</label>
                    <select
                      value={form.ownerId}
                      onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="">Auto (Current User)</option>
                      {(data.owners || []).map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.name} ({o.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Next Review Date</label>
                    <input
                      type="date"
                      value={form.reviewDate}
                      onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 font-black uppercase text-[10px] hover:text-slate-800">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 bg-rose-600 text-white font-black uppercase text-[10px] rounded-xl shadow-sm hover:bg-rose-700">
                    {editingRisk ? "Save Changes" : "Create Risk"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Risk Details & Comments Modal */}
      {selectedRiskDrawer && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setSelectedRiskDrawer(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl p-4 border border-slate-200 shadow-2xl space-y-3">
            {/* Compact Header */}
            <div className="flex items-start justify-between gap-3 border-b pb-2.5 border-slate-100">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {selectedRiskDrawer.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${(STATUS_CONFIG[selectedRiskDrawer.status] || STATUS_CONFIG.open).color}`}>
                    {(STATUS_CONFIG[selectedRiskDrawer.status] || STATUS_CONFIG.open).label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getScoreBadge(selectedRiskDrawer.riskScore).color}`}>
                    Score {selectedRiskDrawer.riskScore} — {getScoreBadge(selectedRiskDrawer.riskScore).label}
                  </span>
                  {isOverdueRisk(selectedRiskDrawer) && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                      Review Overdue
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-slate-900 leading-snug">{selectedRiskDrawer.title}</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const riskToEdit = selectedRiskDrawer;
                    setSelectedRiskDrawer(null);
                    handleOpenEdit(riskToEdit);
                  }}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-colors flex items-center gap-1"
                >
                  <Edit3 size={11} /> Edit
                </button>
                <button onClick={() => setSelectedRiskDrawer(null)} className="p-1 text-slate-400 hover:text-slate-900">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Compact Assessment Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Probability</span>
                <strong className="text-slate-900">{selectedRiskDrawer.probability} / 5</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Impact</span>
                <strong className="text-slate-900">{selectedRiskDrawer.impact} / 5</strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Inherent → Residual</span>
                <strong className="text-rose-600">
                  {selectedRiskDrawer.riskScore}/25
                  {selectedRiskDrawer.residualRiskScore != null && (
                    <span className="text-emerald-600"> → {selectedRiskDrawer.residualRiskScore}/25</span>
                  )}
                </strong>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Next Review</span>
                <strong className="text-indigo-600 text-[11px]">
                  {selectedRiskDrawer.reviewDate ? new Date(selectedRiskDrawer.reviewDate).toLocaleDateString() : "Not set"}
                </strong>
              </div>
            </div>

            {/* Side-by-Side Context & Mitigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <h4 className="text-[9px] font-black uppercase text-slate-400">Description & Context</h4>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px] font-semibold text-slate-700 leading-relaxed min-h-[56px]">
                  {selectedRiskDrawer.description || "No description provided."}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-[9px] font-black uppercase text-slate-400">Mitigation Strategy</h4>
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-[11px] font-bold text-slate-700 leading-relaxed min-h-[56px]">
                  {selectedRiskDrawer.mitigationPlan || "No mitigation plan documented yet."}
                </div>
              </div>
            </div>

            {/* Evidence & Proof Attachments */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black uppercase text-slate-400">
                  Compliance Evidence & Proof ({(selectedRiskDrawer.attachments || []).length})
                </h4>
                <label className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-[10px] font-black uppercase cursor-pointer border border-slate-200 flex items-center gap-1 transition-colors">
                  <Paperclip size={11} />
                  {uploadingEvidence ? "Uploading..." : "Attach Evidence"}
                  <input
                    type="file"
                    disabled={uploadingEvidence}
                    onChange={handleUploadEvidence}
                    className="hidden"
                  />
                </label>
              </div>
              {(selectedRiskDrawer.attachments || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRiskDrawer.attachments.map((att) => (
                    <div
                      key={att._id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                    >
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-indigo-600 flex items-center gap-1"
                      >
                        <ExternalLink size={10} /> {att.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att._id)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Remove attachment"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Comments & Discussion */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-[9px] font-black uppercase text-slate-400">
                Audit Comments & Discussion ({(selectedRiskDrawer.comments || []).length})
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {(selectedRiskDrawer.comments || []).length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-1">No notes logged yet.</p>
                ) : (
                  selectedRiskDrawer.comments.map((c, i) => (
                    <div key={i} className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase">
                        <span>{c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="font-bold text-slate-800">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add audit note..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-400"
                />
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase transition-colors">
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
