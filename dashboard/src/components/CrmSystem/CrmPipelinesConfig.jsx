import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  MoveUp,
  MoveDown,
  ShieldAlert,
  Download,
  Printer,
  RefreshCw
} from "lucide-react";
import { api } from "../../api/client.js";
import { useWebsite } from "../../context/WebsiteContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";
import ConfirmModal from "../ConfirmModal.jsx";

const DEFAULT_STAGES = [
  { key: "new", label: "New Lead", probability: 10, order: 0 },
  { key: "contacted", label: "Contacted", probability: 25, order: 1 },
  { key: "qualified", label: "Qualified", probability: 50, order: 2 },
  { key: "proposal", label: "Proposal Sent", probability: 75, order: 3 },
  { key: "negotiation", label: "Negotiation", probability: 90, order: 4 },
  { key: "won", label: "Closed Won", probability: 100, order: 5 },
  { key: "lost", label: "Closed Lost", probability: 0, order: 6 }
];

const DEFAULT_ENABLED_MODULES = ["crm", "operations", "finance", "service", "automation"];

const isValidWebsiteId = (id) =>
  Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

export default function CrmPipelinesConfig({ websiteId }) {
  const toast = useToast();
  const { selectedWebsite, setWebsites } = useWebsite();
  const activeWebsiteId = isValidWebsiteId(websiteId) ? websiteId : selectedWebsite?._id;

  const [enabledModules, setEnabledModules] = useState(() =>
    Array.isArray(selectedWebsite?.enabledModules) && selectedWebsite.enabledModules.length > 0
      ? selectedWebsite.enabledModules
      : DEFAULT_ENABLED_MODULES
  );

  useEffect(() => {
    if (Array.isArray(selectedWebsite?.enabledModules) && selectedWebsite.enabledModules.length > 0) {
      setEnabledModules(selectedWebsite.enabledModules);
    }
  }, [selectedWebsite?._id, selectedWebsite?.enabledModules]);

  const handleToggleModule = async (modId) => {
    const nextModules = enabledModules.includes(modId)
      ? enabledModules.filter((m) => m !== modId)
      : [...enabledModules, modId];
    setEnabledModules(nextModules);
    if (!isValidWebsiteId(activeWebsiteId)) return;
    try {
      const updated = await api(`/api/websites/${activeWebsiteId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabledModules: nextModules })
      });
      if (setWebsites && updated?._id) {
        setWebsites((prev) =>
          Array.isArray(prev)
            ? prev.map((w) => (w._id === updated._id ? { ...w, enabledModules: nextModules } : w))
            : prev
        );
      }
      toast?.success?.("Module entitlement updated");
    } catch (err) {
      console.error("Failed to save module entitlements:", err);
      toast?.error?.(err?.message || "Failed to update module entitlement");
    }
  };

  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [pipelineForm, setPipelineForm] = useState({ name: "", isDefault: false, stages: [] });
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const qs = isValidWebsiteId(websiteId) ? `?websiteId=${encodeURIComponent(websiteId)}` : "";
      const res = await api(`/api/crm/pipelines${qs}`);
      const list = Array.isArray(res) ? res : res?.pipelines || res?.data || [];
      setPipelines(list);
      setSelectedPipeline((prev) => {
        if (!list.length) return null;
        if (prev?._id) {
          const refreshed = list.find((p) => p._id === prev._id);
          if (refreshed) return refreshed;
        }
        return list[0];
      });
    } catch (err) {
      console.error(err);
      toast?.error?.(err?.message || "Failed to load pipelines");
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, [websiteId]);

  useEffect(() => {
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const handleOpenCreate = () => {
    setEditingPipeline(null);
    setPipelineForm({
      name: "",
      isDefault: pipelines.length === 0,
      stages: DEFAULT_STAGES.map((s) => ({ ...s }))
    });
    setShowModal(true);
  };

  const handleOpenEdit = (pipeline) => {
    setEditingPipeline(pipeline);
    setPipelineForm({
      name: pipeline.name || "",
      isDefault: Boolean(pipeline.isDefault),
      stages: Array.isArray(pipeline.stages)
        ? pipeline.stages.map((s, idx) => ({
            key: s.key || `stage_${idx}`,
            label: s.label || s.name || `Stage ${idx + 1}`,
            probability: s.probability ?? 50,
            order: s.order ?? idx
          }))
        : []
    });
    setShowModal(true);
  };

  const handleAddStage = () => {
    const newStage = {
      key: `custom_${Date.now()}`,
      label: "New Stage",
      probability: 50,
      order: pipelineForm.stages.length
    };
    setPipelineForm({
      ...pipelineForm,
      stages: [...pipelineForm.stages, newStage]
    });
  };

  const handleRemoveStage = (index) => {
    const nextStages = pipelineForm.stages
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, order: idx }));
    setPipelineForm({ ...pipelineForm, stages: nextStages });
  };

  const handleStageFieldChange = (index, field, val) => {
    const nextStages = [...pipelineForm.stages];
    nextStages[index] = { ...nextStages[index], [field]: val };
    setPipelineForm({ ...pipelineForm, stages: nextStages });
  };

  const moveStage = (index, direction) => {
    const nextStages = [...pipelineForm.stages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextStages.length) return;

    const temp = nextStages[index];
    nextStages[index] = nextStages[targetIndex];
    nextStages[targetIndex] = temp;
    nextStages.forEach((s, idx) => {
      s.order = idx;
    });

    setPipelineForm({ ...pipelineForm, stages: nextStages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!pipelineForm.stages.length) {
      toast?.error?.("At least one stage is required");
      return;
    }

    setSaving(true);
    const payload = {
      name: pipelineForm.name.trim(),
      isDefault: Boolean(pipelineForm.isDefault),
      stages: pipelineForm.stages.map((s, idx) => ({
        ...s,
        order: idx,
        probability: Math.min(100, Math.max(0, Number(s.probability) || 0))
      }))
    };
    if (isValidWebsiteId(activeWebsiteId)) {
      payload.websiteId = activeWebsiteId;
    }

    try {
      if (editingPipeline?._id) {
        await api(`/api/crm/pipelines/${editingPipeline._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Pipeline updated");
      } else {
        await api("/api/crm/pipelines", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Pipeline created");
      }
      setShowModal(false);
      await fetchPipelines();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to save pipeline");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (pId) => {
    try {
      await api(`/api/crm/pipelines/${pId}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true })
      });
      toast?.success?.("Default pipeline updated");
      await fetchPipelines();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to set default pipeline");
    }
  };

  const executeDeletePipeline = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await api(`/api/crm/pipelines/${deleteTarget._id}`, { method: "DELETE" });
      toast?.success?.("Pipeline deleted");
      setDeleteTarget(null);
      await fetchPipelines();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete pipeline");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedPipeline?.stages?.length) return;
    const data = selectedPipeline.stages.map((s, idx) => ({
      "Pipeline Name": selectedPipeline.name || "Pipeline",
      "Stage Key": s.key,
      "Stage Label": s.label,
      "Win Probability (%)": `${s.probability ?? 0}%`,
      "Order Index": s.order ?? idx
    }));
    exportToCSV(data, `Pipeline_Config_${(selectedPipeline.name || "Pipeline").replace(/\s+/g, "_")}`);
  };

  const handleExportPDF = () => {
    if (!selectedPipeline?.stages?.length) return;
    const data = selectedPipeline.stages.map((s, idx) => ({
      "Stage Key": s.key,
      "Stage Label": s.label,
      "Win Probability (%)": `${s.probability ?? 0}%`,
      Order: String(s.order ?? idx)
    }));
    exportToPDF(
      data,
      `Pipeline_Config_${(selectedPipeline.name || "Pipeline").replace(/\s+/g, "_")}`,
      `PIPELINE STAGE CONFIGURATION - ${(selectedPipeline.name || "PIPELINE").toUpperCase()}`
    );
  };

  return (
    <div className="space-y-3 bg-white">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2.5 border-slate-100">
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Configure Pipelines
          </h4>
          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
            Manage custom stages, win probabilities, and sales progression sequences
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportCSV}
            disabled={!selectedPipeline?.stages?.length}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export Pipeline Config to CSV"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!selectedPipeline?.stages?.length}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export Pipeline Config to PDF"
          >
            <Printer size={12} /> Export PDF
          </button>
          <button
            onClick={fetchPipelines}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
            title="Refresh pipelines"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
          >
            <Plus size={12} /> New Pipeline
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-wider">
          No custom pipelines configured yet
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Pipelines List */}
          <div className="space-y-2">
            <h5 className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
              Available Pipelines ({pipelines.length})
            </h5>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
              {pipelines.map((p) => {
                const isSelected = selectedPipeline?._id === p._id;
                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedPipeline(p)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-2 ${
                      isSelected
                        ? "bg-indigo-50/20 border-indigo-400 shadow-xs"
                        : "bg-white border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <h6 className="text-[11px] font-black text-slate-900 truncate">{p.name}</h6>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                        {p.stages?.length || 0} Stages
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.isDefault ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(p._id);
                          }}
                          className="text-[8.5px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(p);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Edit pipeline"
                      >
                        <Edit3 size={12} />
                      </button>
                      {!p.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(p);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="Delete pipeline"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Pipeline Stages Details */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
            {selectedPipeline ? (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h5 className="text-xs font-black text-slate-900">{selectedPipeline.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      Stage Flow Sequence ({selectedPipeline.stages?.length || 0} Stages)
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenEdit(selectedPipeline)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9.5px] font-black uppercase rounded-lg transition-all"
                  >
                    <Edit3 size={11} /> Edit Stages
                  </button>
                </div>
                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-0.5">
                  {selectedPipeline.stages?.map((stage, index) => (
                    <div
                      key={stage.key || index}
                      className="flex items-center justify-between px-3 py-2 bg-slate-50/70 border border-slate-100 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-700">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-[11px] font-black text-slate-800">{stage.label}</p>
                          <p className="text-[8.5px] font-bold text-indigo-600 uppercase tracking-wider">
                            Win Probability: {stage.probability ?? 0}%
                          </p>
                        </div>
                      </div>
                      <span className="text-[8.5px] font-black uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-500">
                        {stage.key}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400 font-bold text-[10px] uppercase tracking-wider gap-1.5">
                <ShieldAlert size={20} /> Select a pipeline to configure
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLIENT MODULE & FEATURE ENTITLEMENTS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-2.5 gap-2">
          <div>
            <span className="text-[8.5px] font-black uppercase tracking-widest text-indigo-600">
              Client Customization
            </span>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mt-0.5">
              Website Module &amp; Feature Entitlements
            </h4>
            <p className="text-[9.5px] font-medium text-slate-500 mt-0.5">
              Toggle enabled modules for the active website workspace
            </p>
          </div>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Feature Flag Manager
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <ModuleToggleCard
            id="crm"
            title="CRM & Sales"
            desc="Leads, Contacts, Companies, Deals, Calendar, Tasks"
            enabled={true}
            locked={true}
          />
          <ModuleToggleCard
            id="operations"
            title="Operations & Catalog"
            desc="Products, Service Catalog, Quotations, Sales Orders"
            enabled={enabledModules.includes("operations")}
            onToggle={() => handleToggleModule("operations")}
          />
          <ModuleToggleCard
            id="finance"
            title="Finance & Billing"
            desc="Financial P&L Center, Subscriptions, Invoices, Payments Ledger"
            enabled={enabledModules.includes("finance")}
            onToggle={() => handleToggleModule("finance")}
          />
          <ModuleToggleCard
            id="service"
            title="Service & Customer Care"
            desc="Unified Omnichannel Inbox, Canned Replies, Helpdesk, CSAT"
            enabled={enabledModules.includes("service")}
            onToggle={() => handleToggleModule("service")}
          />
          <ModuleToggleCard
            id="automation"
            title="Workflows & AI Platform"
            desc="Automated Workflows, Workflow Logs, AI Agent, BI Analytics"
            enabled={enabledModules.includes("automation")}
            onToggle={() => handleToggleModule("automation")}
          />
        </div>
      </div>

      {/* Create / Edit Pipeline Modal */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto"
              onClick={() => setShowModal(false)}
            />
            <div className="relative z-10 pointer-events-auto w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 shrink-0">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {editingPipeline ? "Edit Sales Pipeline" : "Create Sales Pipeline"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    Pipeline Name *
                  </label>
                  <input
                    required
                    value={pipelineForm.name}
                    onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                    className="w-full bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      Stages Setup ({pipelineForm.stages.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddStage}
                      className="text-[9px] font-black uppercase text-indigo-600 hover:underline"
                    >
                      + Add Custom Stage
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                    {pipelineForm.stages.map((stage, idx) => (
                      <div
                        key={stage.key || idx}
                        className="flex gap-1.5 items-center bg-slate-50/70 p-2 rounded-xl border border-slate-200/70"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveStage(idx, -1)}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
                          >
                            <MoveUp size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStage(idx, 1)}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-500"
                          >
                            <MoveDown size={10} />
                          </button>
                        </div>
                        <input
                          required
                          placeholder="Stage Label"
                          value={stage.label}
                          onChange={(e) => handleStageFieldChange(idx, "label", e.target.value)}
                          className="flex-1 bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-800"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="%"
                          required
                          value={stage.probability}
                          onChange={(e) =>
                            handleStageFieldChange(idx, "probability", Number(e.target.value))
                          }
                          className="w-14 bg-white rounded-lg border border-slate-200 px-2 py-1.5 text-[10.5px] font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> {saving ? "Saving…" : "Save Pipeline Configuration"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Pipeline"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this pipeline"}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={executeDeletePipeline}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ModuleToggleCard({ id, title, desc, enabled: initialEnabled, locked = false, badgeText, onToggle }) {
  const [localEnabled, setLocalEnabled] = useState(initialEnabled);
  const enabled = onToggle ? initialEnabled : localEnabled;

  return (
    <div
      className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
        enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200/60 opacity-65"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h5 className="text-[11px] font-black text-slate-900">{title}</h5>
          <p className="text-[9px] font-medium text-slate-500 mt-0.5 leading-snug">{desc}</p>
        </div>
        {locked ? (
          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded shrink-0">
            Required
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (onToggle ? onToggle(id) : setLocalEnabled(!localEnabled))}
            className={`w-9 h-4.5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
              enabled ? "bg-indigo-600 justify-end" : "bg-slate-300 justify-start"
            }`}
          >
            <span className="w-3.5 h-3.5 bg-white rounded-full shadow-xs" />
          </button>
        )}
      </div>
      {badgeText && (
        <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
          {badgeText}
        </span>
      )}
    </div>
  );
}
