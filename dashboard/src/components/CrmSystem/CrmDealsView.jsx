import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  DollarSign,
  Calendar,
  TrendingUp,
  Briefcase,
  Award,
  Download,
  Printer,
  RefreshCw
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { getCurrencySymbol } from "../../utils/currencyFormatter.js";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";
import ConfirmModal from "../ConfirmModal.jsx";

const DEFAULT_STAGES = [
  { key: "new", label: "New Lead", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "contacted", label: "Contacted", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "qualified", label: "Qualified", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "proposal", label: "Proposal", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "negotiation", label: "Negotiation", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "won", label: "Closed Won", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "lost", label: "Closed Lost", badge: "bg-rose-50 text-rose-700 border-rose-200" }
];

const isValidWebsiteId = (id) =>
  Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

export default function CrmDealsView({ websiteId }) {
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState("board");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Deletion Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState({
    dealName: "",
    dealValue: 0,
    expectedCloseDate: "",
    probability: 20,
    stage: "qualified",
    pipelineId: "",
    companyId: "",
    primaryContactId: "",
    priority: "medium",
    description: ""
  });

  const activePipeline = useMemo(() => {
    if (!pipelines.length) return null;
    return pipelines.find((p) => p._id === selectedPipelineId) || pipelines[0];
  }, [pipelines, selectedPipelineId]);

  const activeStages = useMemo(() => {
    if (activePipeline?.stages?.length) {
      return activePipeline.stages.map((s) => ({
        key: s.key || s.name?.toLowerCase().replace(/\s+/g, "_"),
        label: s.label || s.name || s.key,
        badge: s.badge || "bg-slate-100 text-slate-700 border-slate-200"
      }));
    }
    return DEFAULT_STAGES;
  }, [activePipeline]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (search.trim()) params.set("search", search.trim());
      if (isValidWebsiteId(websiteId)) params.set("websiteId", websiteId);
      const res = await api(`/api/crm/deals?${params.toString()}`);
      const list = Array.isArray(res) ? res : res?.deals || res?.data || [];
      setDeals(list);
    } catch (err) {
      console.error(err);
      toast?.error?.(err?.message || "Failed to load deals");
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const qs = isValidWebsiteId(websiteId) ? `?websiteId=${encodeURIComponent(websiteId)}` : "";
      const res = await api(`/api/crm/pipelines${qs}`);
      const list = Array.isArray(res) ? res : res?.pipelines || res?.data || [];
      setPipelines(list);
      if (list.length > 0 && !selectedPipelineId) {
        setSelectedPipelineId(list[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRelations = async () => {
    try {
      const qs = isValidWebsiteId(websiteId)
        ? `?websiteId=${encodeURIComponent(websiteId)}&limit=150`
        : "?limit=150";
      const [comRes, conRes] = await Promise.all([
        api(`/api/crm/companies${qs}`),
        api(`/api/crm/contacts${qs}`)
      ]);
      setCompanies(Array.isArray(comRes) ? comRes : comRes?.companies || comRes?.data || []);
      setContacts(Array.isArray(conRes) ? conRes : conRes?.contacts || conRes?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [search, websiteId]);

  useEffect(() => {
    fetchPipelines();
    fetchRelations();
  }, [websiteId]);

  useEffect(() => {
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (priorityFilter !== "all" && (d.priority || "medium").toLowerCase() !== priorityFilter) {
        return false;
      }
      if (selectedPipelineId && d.pipelineId && String(d.pipelineId?._id || d.pipelineId) !== selectedPipelineId) {
        return false;
      }
      return true;
    });
  }, [deals, priorityFilter, selectedPipelineId]);

  const metrics = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const totalValue = filteredDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
    const weightedForecast = filteredDeals.reduce(
      (sum, d) => sum + (Number(d.dealValue) || 0) * ((Number(d.probability) || 0) / 100),
      0
    );
    const wonValue = filteredDeals
      .filter((d) => ["won", "closed_won", "closed won"].includes((d.stage || "").toLowerCase()))
      .reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
    return { totalDeals, totalValue, weightedForecast, wonValue };
  }, [filteredDeals]);

  const handleOpenCreate = () => {
    setEditingDeal(null);
    setForm({
      dealName: "",
      dealValue: 0,
      expectedCloseDate: "",
      probability: 20,
      stage: activeStages[0]?.key || "qualified",
      pipelineId: activePipeline?._id || "",
      companyId: "",
      primaryContactId: "",
      priority: "medium",
      description: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (deal) => {
    setEditingDeal(deal);
    setForm({
      dealName: deal.dealName || "",
      dealValue: deal.dealValue || 0,
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split("T")[0] : "",
      probability: deal.probability ?? 20,
      stage: deal.stage || activeStages[0]?.key || "qualified",
      pipelineId: deal.pipelineId?._id || deal.pipelineId || activePipeline?._id || "",
      companyId: deal.companyId?._id || deal.companyId || "",
      primaryContactId: deal.primaryContactId?._id || deal.primaryContactId || "",
      priority: deal.priority || "medium",
      description: deal.description || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const payload = {
      dealName: form.dealName.trim(),
      dealValue: Number(form.dealValue) || 0,
      probability: Math.min(100, Math.max(0, Number(form.probability) || 0)),
      expectedCloseDate: form.expectedCloseDate || undefined,
      stage: form.stage,
      pipelineId: form.pipelineId || undefined,
      companyId: form.companyId || undefined,
      primaryContactId: form.primaryContactId || undefined,
      priority: form.priority || "medium",
      description: form.description.trim() || undefined
    };
    if (isValidWebsiteId(websiteId)) {
      payload.websiteId = websiteId;
    }

    try {
      if (editingDeal) {
        await api(`/api/crm/deals/${editingDeal._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Deal updated");
      } else {
        await api("/api/crm/deals", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Deal created");
      }
      setShowModal(false);
      await fetchDeals();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to save deal");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStage = async (id, nextStage) => {
    try {
      await api(`/api/crm/deals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: nextStage })
      });
      toast?.success?.(`Moved deal to ${nextStage.toUpperCase()}`);
      await fetchDeals();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to move deal");
    }
  };

  const confirmDelete = (id) => {
    setDeletingDealId(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!deletingDealId) return;
    setDeleting(true);
    try {
      await api(`/api/crm/deals/${deletingDealId}`, { method: "DELETE" });
      toast?.success?.("Deal deleted");
      await fetchDeals();
      setShowDeleteConfirm(false);
      setDeletingDealId(null);
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete deal");
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(val || 0);

  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, targetStage) => {
    const id = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text");
    if (id) {
      handleUpdateStage(id, targetStage);
    }
  };

  const handleExportCSV = () => {
    const sym = getCurrencySymbol();
    const data = filteredDeals.map((d) => ({
      "Deal Name": d.dealName || "—",
      [`Value (${sym})`]: Number(d.dealValue) || 0,
      Stage: (d.stage || "—").toUpperCase(),
      "Probability (%)": d.probability ?? 0,
      Priority: (d.priority || "medium").toUpperCase(),
      Company: d.companyId?.companyName || "—",
      "Expected Close": d.expectedCloseDate
        ? new Date(d.expectedCloseDate).toLocaleDateString()
        : "—"
    }));
    exportToCSV(data, `Deals_Pipeline_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const data = filteredDeals.map((d) => ({
      "Deal Name": d.dealName || "—",
      Value: formatCurrency(d.dealValue),
      Stage: (d.stage || "—").toUpperCase(),
      Company: d.companyId?.companyName || "—",
      Close: d.expectedCloseDate ? new Date(d.expectedCloseDate).toLocaleDateString() : "—"
    }));
    exportToPDF(data, `Deals_Pipeline_${new Date().toISOString().slice(0, 10)}`, "DEALS PIPELINE REPORT");
  };

  return (
    <div className="space-y-3 bg-white">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2.5 border-slate-100">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Deals &amp; Revenue Pipeline
          </h3>
          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
            Track active opportunities, stage progression, and weighted revenue forecast
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportCSV}
            disabled={filteredDeals.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredDeals.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
          >
            <Printer size={12} /> Export PDF
          </button>
          <button
            onClick={fetchDeals}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
            title="Refresh deals"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Compact KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Briefcase size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Active Deals
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.totalDeals} Deals</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Total Pipeline Value
            </span>
            <span className="text-sm font-black text-emerald-700">
              {formatCurrency(metrics.totalValue)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Weighted Forecast
            </span>
            <span className="text-sm font-black text-blue-700">
              {formatCurrency(metrics.weightedForecast)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Closed Won Revenue
            </span>
            <span className="text-sm font-black text-amber-700">
              {formatCurrency(metrics.wonValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Compact Action Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-xs flex flex-col lg:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals by title…"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          {pipelines.length > 1 && (
            <select
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none cursor-pointer"
            >
              {pipelines.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name || "Pipeline"}
                </option>
              ))}
            </select>
          )}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={`px-2.5 py-1 text-[9.5px] font-black uppercase rounded-md transition-all ${
                viewMode === "board" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 text-[9.5px] font-black uppercase rounded-md transition-all ${
                viewMode === "list" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500"
              }`}
            >
              List
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all"
          >
            <Plus size={12} /> Add Deal
          </button>
        </div>
      </div>

      {/* Loading / Views */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : viewMode === "list" ? (
        filteredDeals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-wider">
            No deals found
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Deal Name
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Value
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Stage
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Priority
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Company
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      Close Date
                    </th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px] font-semibold text-slate-700">
                  {filteredDeals.map((deal) => (
                    <tr key={deal._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900">{deal.dealName}</div>
                        {deal.primaryContactId?.displayName && (
                          <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                            {deal.primaryContactId.displayName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-black text-indigo-600">
                        {formatCurrency(deal.dealValue)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {deal.stage}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                            deal.priority === "high"
                              ? "bg-rose-50 text-rose-600"
                              : deal.priority === "low"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {deal.priority || "medium"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {deal.companyId?.companyName || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {deal.expectedCloseDate
                          ? new Date(deal.expectedCloseDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(deal)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                            title="Edit deal"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => confirmDelete(deal._id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all"
                            title="Delete deal"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Single-Row Horizontal Kanban Board */
        <div className="flex gap-2.5 overflow-x-auto pb-2">
          {activeStages.map((stage) => {
            const stageDeals = filteredDeals.filter(
              (d) => (d.stage || "").toLowerCase() === stage.key.toLowerCase()
            );
            const totalValue = stageDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);

            return (
              <div
                key={stage.key}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, stage.key)}
                className="flex flex-col bg-slate-50/70 border border-slate-200/70 p-2.5 rounded-xl w-[205px] shrink-0 min-h-[260px] max-h-[520px] space-y-2"
              >
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/70">
                  <div className="min-w-0">
                    <h5 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 truncate">
                      {stage.label}
                    </h5>
                    <p className="text-[9px] font-black text-indigo-600">
                      {formatCurrency(totalValue)}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-700 shrink-0">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                  {stageDeals.length === 0 ? (
                    <div className="py-6 text-center text-[9px] font-semibold text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      Drop deal here
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal._id}
                        draggable
                        onDragStart={(e) => onDragStart(e, deal._id)}
                        onClick={() => handleOpenEdit(deal)}
                        className="p-2.5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-sm hover:border-indigo-200 cursor-pointer transition-all space-y-2"
                      >
                        <div>
                          <h6 className="text-[11px] font-black text-slate-900 leading-tight hover:text-indigo-600 transition-colors line-clamp-2">
                            {deal.dealName}
                          </h6>
                          {deal.companyId?.companyName && (
                            <p className="text-[8.5px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider truncate">
                              {deal.companyId.companyName}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-[9.5px] font-bold text-slate-500">
                          <span className="text-indigo-600 font-black">
                            {formatCurrency(deal.dealValue)}
                          </span>
                          {deal.expectedCloseDate && (
                            <span className="flex items-center gap-0.5 text-[9px]">
                              <Calendar size={10} />
                              {new Date(deal.expectedCloseDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric"
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              deal.priority === "high"
                                ? "bg-rose-50 text-rose-600"
                                : deal.priority === "low"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {deal.priority || "medium"}
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleOpenEdit(deal)}
                              className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded transition-all"
                              title="Edit"
                            >
                              <Edit3 size={10} />
                            </button>
                            <button
                              onClick={() => confirmDelete(deal._id)}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded transition-all"
                              title="Delete"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto"
              onClick={() => setShowModal(false)}
            />
            <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 shrink-0">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {editingDeal ? "Edit Deal" : "Create Deal"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-2.5 overflow-y-auto flex-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    Deal Name *
                  </label>
                  <input
                    required
                    value={form.dealName}
                    onChange={(e) => setForm({ ...form, dealName: e.target.value })}
                    className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Deal Value ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.dealValue}
                      onChange={(e) => setForm({ ...form, dealValue: Number(e.target.value) })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Win Probability (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={form.probability}
                      onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Close Date
                    </label>
                    <input
                      type="date"
                      value={form.expectedCloseDate}
                      onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-2.5 py-2 text-[10.5px] font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Stage
                    </label>
                    <select
                      value={form.stage}
                      onChange={(e) => setForm({ ...form, stage: e.target.value })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-2 py-2 text-[10.5px] font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      {activeStages.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-2 py-2 text-[10.5px] font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Company
                    </label>
                    <select
                      value={form.companyId}
                      onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-2.5 py-2 text-[10.5px] font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">Select Company</option>
                      {companies.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Primary Contact
                    </label>
                    <select
                      value={form.primaryContactId}
                      onChange={(e) => setForm({ ...form, primaryContactId: e.target.value })}
                      className="w-full bg-slate-50 rounded-lg border border-slate-200 px-2.5 py-2 text-[10.5px] font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="">Select Contact</option>
                      {contacts.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.displayName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    Notes / Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-[10.5px] font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 mt-1"
                >
                  <Check size={14} /> {saving ? "Saving…" : editingDeal ? "Save Changes" : "Create Deal"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Deal"
        message="Are you sure you want to delete this deal permanently? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingDealId(null);
        }}
      />
    </div>
  );
}
