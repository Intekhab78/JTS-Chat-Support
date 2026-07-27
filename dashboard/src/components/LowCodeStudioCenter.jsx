import React, { useState, useEffect } from "react";
import {
  Layout, Monitor, Tablet, Smartphone, Download, Upload, Plus, RefreshCw, X, Trash2,
  CheckCircle2, Code, Layers, FileText, Check, Eye, Settings, Sliders
} from "lucide-react";
import { api } from "../api/client.js";

const COMPONENT_PALETTE = [
  { type: "text", label: "Text / Heading Label", icon: "Type" },
  { type: "input", label: "Text Input Field", icon: "Input" },
  { type: "select", label: "Dropdown Select Menu", icon: "List" },
  { type: "checkbox", label: "Checkbox Field", icon: "CheckSquare" },
  { type: "date", label: "Date Picker", icon: "Calendar" },
  { type: "table", label: "Data Grid Table", icon: "Grid" },
  { type: "chart", label: "Analytics Chart Widget", icon: "BarChart" },
  { type: "kanban", label: "Kanban Pipeline Board", icon: "Columns" },
  { type: "file_upload", label: "File Attachment Upload", icon: "Upload" }
];

export default function LowCodeStudioCenter() {
  const [deviceViewport, setDeviceViewport] = useState("desktop");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    pageName: "",
    pageType: "dashboard"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/lowcode-studio/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load studio overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePage = async (e) => {
    e.preventDefault();
    try {
      await api("/api/lowcode-studio/pages", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePage = async (id) => {
    if (!confirm("Purge this custom studio page definition?")) return;
    try {
      await api(`/api/lowcode-studio/pages/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Visual Studio & Component Engine...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const pages = data?.pages || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl">
              <Layout size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Low-Code Visual Studio & Layout Builder</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Drag & Drop Form Builder, Dashboard Creator, Component Palette & Live Multi-Device Viewport
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Device Viewport Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDeviceViewport("desktop")}
              className={`p-2 rounded-lg transition-colors ${deviceViewport === "desktop" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
              title="Desktop Viewport"
            >
              <Monitor size={16} />
            </button>
            <button
              onClick={() => setDeviceViewport("tablet")}
              className={`p-2 rounded-lg transition-colors ${deviceViewport === "tablet" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
              title="Tablet Viewport (768px)"
            >
              <Tablet size={16} />
            </button>
            <button
              onClick={() => setDeviceViewport("mobile")}
              className={`p-2 rounded-lg transition-colors ${deviceViewport === "mobile" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone size={16} />
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> New Custom Layout
          </button>
        </div>
      </div>

      {/* Primary Studio Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Visual Component Studio</span>
            <h3 className="text-xl font-black text-white mt-1">Multi-Device Live Preview & Schema Engine</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.sdkStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Custom Studio Layouts</span>
            <strong className="text-white font-bold">{summary.totalPages} Pages Created</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Published Live</span>
            <strong className="text-emerald-400 font-bold">{summary.publishedPages} Published</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Drag-Drop Palette</span>
            <strong className="text-indigo-400 font-bold">{summary.availableDragDropComponents} Components</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Active Viewport</span>
            <strong className="text-amber-400 font-bold uppercase">{deviceViewport} MODE</strong>
          </div>
        </div>
      </div>

      {/* Component Palette Strip */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Drag & Drop Component Palette</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {COMPONENT_PALETTE.map((comp, i) => (
            <div
              key={i}
              className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-xl text-center cursor-grab transition-all hover:shadow-sm group"
            >
              <span className="text-[10px] font-black uppercase text-slate-700 group-hover:text-indigo-600 block">{comp.label}</span>
              <span className="text-[8px] font-mono text-slate-400 uppercase">[{comp.type}]</span>
            </div>
          ))}
        </div>
      </div>

      {/* Studio Pages & Live Device Canvas Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Pages List */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Custom Studio Pages</h3>
          <div className="space-y-3">
            {pages.map((p) => (
              <div
                key={p._id}
                onClick={() => setSelectedPage(p)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedPage?._id === p._id ? "bg-indigo-50 border-indigo-300 shadow-md" : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase bg-indigo-100 text-indigo-700">
                    {p.pageType}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePage(p._id); }}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h4 className="text-xs font-black text-slate-900 mt-2">{p.pageName}</h4>
                <p className="text-[10px] font-mono text-slate-400 mt-1">{(p.layoutComponents || []).length} Components Configured</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Viewport Canvas */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className={`bg-white rounded-3xl border border-slate-200 shadow-xl p-8 transition-all duration-300 w-full ${
            deviceViewport === "mobile" ? "max-w-[375px]" : deviceViewport === "tablet" ? "max-w-[768px]" : "max-w-full"
          }`}>
            <div className="border-b pb-4 mb-6 border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-600">Live Device Canvas ({deviceViewport})</span>
                <h4 className="text-sm font-black text-slate-900">{selectedPage?.pageName || "Select a layout page to preview"}</h4>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[9px] font-black uppercase">
                Interactive Preview
              </span>
            </div>

            <div className="space-y-4">
              {(selectedPage?.layoutComponents || COMPONENT_PALETTE.slice(0, 4)).map((comp, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 block">{comp.label}</label>

                  {comp.componentType === "input" && (
                    <input readOnly placeholder={comp.props?.placeholder || "Text input field..."} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  )}

                  {comp.componentType === "select" && (
                    <select disabled className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      {(comp.props?.options || ["Option 1", "Option 2"]).map((opt, oIdx) => (
                        <option key={oIdx}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {comp.componentType === "file_upload" && (
                    <div className="border-2 border-dashed border-slate-200 bg-white p-4 rounded-xl text-center">
                      <Upload size={16} className="mx-auto text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-500">Drop files or click to upload</span>
                    </div>
                  )}

                  {comp.componentType === "chart" && (
                    <div className="h-24 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 flex items-center justify-center font-mono text-[10px] text-indigo-600 font-bold">
                      [Chart Analytics Canvas Simulator]
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Create Custom Low-Code Page</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Page Title *</label>
                <input
                  required
                  value={form.pageName}
                  onChange={(e) => setForm({ ...form, pageName: e.target.value })}
                  placeholder="e.g. Executive Corporate Tax Form"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Page Type</label>
                <select
                  value={form.pageType}
                  onChange={(e) => setForm({ ...form, pageType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                >
                  <option value="dashboard">Executive Dashboard</option>
                  <option value="form">Data Intake Form</option>
                  <option value="report">Custom Analytics Report</option>
                  <option value="kanban">Kanban Pipeline</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Save Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
