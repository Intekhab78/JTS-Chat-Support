import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Check, X, MoveUp, MoveDown, Layout, ShieldAlert } from "lucide-react";
import { api } from "../../api/client.js";

const DEFAULT_STAGES = [
  { key: "new", label: "New Lead", probability: 10, order: 0, color: "bg-violet-50 text-violet-600 border-violet-100" },
  { key: "contacted", label: "Contacted", probability: 25, order: 1, color: "bg-sky-50 text-sky-600 border-sky-100" },
  { key: "qualified", label: "Qualified", probability: 50, order: 2, color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "proposal", label: "Proposal Sent", probability: 75, order: 3, color: "bg-amber-50 text-amber-600 border-amber-100" },
  { key: "negotiation", label: "Negotiation", probability: 90, order: 4, color: "bg-orange-50 text-orange-600 border-orange-100" },
  { key: "won", label: "Closed Won", probability: 100, order: 5, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { key: "lost", label: "Closed Lost", probability: 0, order: 6, color: "bg-red-50 text-red-500 border-red-100" }
];

export default function CrmPipelinesConfig({ websiteId }) {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [pipelineForm, setPipelineForm] = useState({ name: "", isDefault: false, stages: [] });
  const [showModal, setShowModal] = useState(false);

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/pipelines?websiteId=${websiteId}`);
      setPipelines(res || []);
      if (res && res.length > 0) {
        setSelectedPipeline(res[0]);
      } else {
        setSelectedPipeline(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) fetchPipelines();
  }, [websiteId]);

  const handleOpenCreate = () => {
    setPipelineForm({
      name: "",
      isDefault: pipelines.length === 0,
      stages: [...DEFAULT_STAGES]
    });
    setShowModal(true);
  };

  const handleAddStage = () => {
    const newStage = {
      key: `custom_${Date.now()}`,
      label: "New Stage",
      probability: 50,
      order: pipelineForm.stages.length,
      color: "bg-slate-50 text-slate-600 border-slate-100"
    };
    setPipelineForm({
      ...pipelineForm,
      stages: [...pipelineForm.stages, newStage]
    });
  };

  const handleRemoveStage = (index) => {
    const nextStages = pipelineForm.stages.filter((_, i) => i !== index);
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
    
    // Swap
    const temp = nextStages[index];
    nextStages[index] = nextStages[targetIndex];
    nextStages[targetIndex] = temp;

    // Recalculate orders
    nextStages.forEach((s, idx) => {
      s.order = idx;
    });

    setPipelineForm({ ...pipelineForm, stages: nextStages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pipelineForm.stages.length) {
      alert("At least one stage is required.");
      return;
    }

    try {
      await api("/api/crm/pipelines", {
        method: "POST",
        body: JSON.stringify({
          ...pipelineForm,
          websiteId
        })
      });
      setShowModal(false);
      fetchPipelines();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetDefault = async (pId) => {
    try {
      await api(`/api/crm/pipelines/${pId}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true })
      });
      fetchPipelines();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePipeline = async (pId) => {
    if (!confirm("Are you sure you want to delete this pipeline?")) return;
    try {
      await api(`/api/crm/pipelines/${pId}`, { method: "DELETE" });
      fetchPipelines();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Configure Pipelines</h4>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Manage custom stages and sales progression sequences.</p>
        </div>
        <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
          <Plus size={14} /> New Pipeline
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-xs uppercase tracking-widest">No custom pipelines setup yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipelines list */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Pipelines</h5>
            <div className="space-y-3">
              {pipelines.map((p) => (
                <div
                  key={p._id}
                  onClick={() => setSelectedPipeline(p)}
                  className={`p-5 rounded-[24px] border transition-all cursor-pointer flex justify-between items-center ${selectedPipeline?._id === p._id ? "bg-indigo-50/20 border-indigo-200 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"}`}
                >
                  <div>
                    <h6 className="text-xs font-black text-slate-900">{p.name}</h6>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{p.stages?.length || 0} Stages</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isDefault ? (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Default</span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleSetDefault(p._id); }} className="text-[9px] font-black text-slate-400 hover:text-slate-700 bg-slate-50 border px-2 py-0.5 rounded uppercase">Set Default</button>
                    )}
                    {!p.isDefault && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePipeline(p._id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Pipeline Stages Details */}
          <div className="lg:col-span-2 bg-white border border-slate-250/60 rounded-[30px] p-6 space-y-6">
            {selectedPipeline ? (
              <>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <h5 className="text-sm font-black text-slate-900">{selectedPipeline.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Stage Flow</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedPipeline.stages?.map((stage, index) => (
                    <div key={stage.key} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-slate-200/50 rounded-lg text-xs font-black text-slate-700">{index + 1}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800">{stage.label}</p>
                          <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mt-0.5">Win Probability: {stage.probability}%</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase bg-white border border-slate-200/60 px-2.5 py-1 rounded-xl text-slate-500">{stage.key}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-bold text-xs uppercase tracking-widest gap-2">
                <ShieldAlert size={24} /> Select a pipeline to configure
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Create Sales Pipeline</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pipeline Name</label>
              <input
                required
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stages Setup</label>
                <button type="button" onClick={handleAddStage} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Add Custom Stage</button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {pipelineForm.stages.map((stage, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => moveStage(idx, -1)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><MoveUp size={11} /></button>
                      <button type="button" onClick={() => moveStage(idx, 1)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><MoveDown size={11} /></button>
                    </div>
                    <input
                      required
                      placeholder="Stage Label"
                      value={stage.label}
                      onChange={(e) => handleStageFieldChange(idx, "label", e.target.value)}
                      className="flex-1 bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold"
                    />
                    <input
                      type="number"
                      placeholder="%"
                      required
                      value={stage.probability}
                      onChange={(e) => handleStageFieldChange(idx, "probability", Number(e.target.value))}
                      className="w-16 bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-center"
                    />
                    <button type="button" onClick={() => handleRemoveStage(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-4.5 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <Check size={16} /> Save Pipeline Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
