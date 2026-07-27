import React, { useState, useEffect } from "react";
import {
  Boxes, Plus, RefreshCw, X, Trash2, CheckCircle2, Code, Layers, FileText,
  Database, Terminal, ArrowRight, ShieldCheck, ChevronRight, Sliders
} from "lucide-react";
import { api } from "../api/client.js";

export default function CustomCrmModuleCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const [moduleForm, setModuleForm] = useState({
    moduleKey: "",
    moduleName: "",
    description: "",
    fields: [
      { fieldKey: "title", fieldName: "Item Title", fieldType: "text", required: true },
      { fieldKey: "category", fieldName: "Category", fieldType: "text", required: false }
    ]
  });

  const [recordDataInput, setRecordDataInput] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/custom-crm-modules/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load custom modules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateModule = async (e) => {
    e.preventDefault();
    try {
      await api("/api/custom-crm-modules/modules", {
        method: "POST",
        body: JSON.stringify(moduleForm)
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!selectedModule) return;
    try {
      await api(`/api/custom-crm-modules/modules/${selectedModule._id}/records`, {
        method: "POST",
        body: JSON.stringify({ recordData: recordDataInput })
      });
      setShowRecordModal(false);
      setRecordDataInput({});
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteModule = async (id) => {
    if (!confirm("Purge this custom CRM module and all generated REST APIs?")) return;
    try {
      await api(`/api/custom-crm-modules/modules/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Custom CRM Module Engine & Code Generator...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const modules = data?.modules || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl">
              <Boxes size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Custom CRM Module & REST API Code Generator</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Build Custom Tables, Auto-Generate REST APIs, Role-Based Access Control & Navigation Items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Modules"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Build Custom CRM Module
          </button>
        </div>
      </div>

      {/* Module Generator Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Custom Module Architecture</span>
            <h3 className="text-xl font-black text-white mt-1">Zero-Code REST API & Schema Code Generator</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.engineStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Custom CRM Modules</span>
            <strong className="text-white font-bold">{summary.totalCustomModules} Dynamic Modules</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Auto-Generated REST APIs</span>
            <strong className="text-emerald-400 font-bold">{summary.autoGeneratedApis} Endpoints Live</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Custom Records Stored</span>
            <strong className="text-indigo-400 font-bold">{summary.totalCustomRecordsCount} Records</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Auto Menu Injector</span>
            <strong className="text-amber-400 font-bold">ACTIVE</strong>
          </div>
        </div>
      </div>

      {/* Modules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((m) => (
          <div key={m._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Key: {m.moduleKey}
                </span>
                <button onClick={() => handleDeleteModule(m._id)} className="text-slate-400 hover:text-rose-600 p-1">
                  <Trash2 size={14} />
                </button>
              </div>

              <h4 className="text-base font-black text-slate-900">{m.moduleName}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{m.description}</p>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] flex items-center justify-between">
                <span>Generated API: {m.apiEndpoint}</span>
                <span className="text-slate-400">[GET / POST]</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => { setSelectedModule(m); setShowRecordModal(true); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Record
              </button>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                {(m.records || []).length} Records Enrolled
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Build Custom CRM Module</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Module Key (Snake_Case) *</label>
                <input
                  required
                  value={moduleForm.moduleKey}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleKey: e.target.value })}
                  placeholder="e.g. corporate_assets_vault"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Module Title *</label>
                <input
                  required
                  value={moduleForm.moduleName}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleName: e.target.value })}
                  placeholder="e.g. Corporate IT Asset Vault"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-black"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Description</label>
                <input
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  placeholder="Describe module business workflow..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-emerald-700">
                  Generate Module & REST API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Creator Modal */}
      {showRecordModal && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowRecordModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-emerald-600">Dynamic Record Intake</span>
                <h3 className="text-base font-black text-slate-900">{selectedModule.moduleName}</h3>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-4 text-xs font-bold">
              {(selectedModule.fields || []).map((f) => (
                <div key={f.fieldKey}>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                    {f.fieldName} {f.required && "*"}
                  </label>
                  <input
                    required={f.required}
                    type={f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text"}
                    value={recordDataInput[f.fieldKey] || ""}
                    onChange={(e) => setRecordDataInput({ ...recordDataInput, [f.fieldKey]: e.target.value })}
                    placeholder={`Enter ${f.fieldName}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowRecordModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-emerald-700">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
