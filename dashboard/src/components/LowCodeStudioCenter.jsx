import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Layout,
  Monitor,
  Tablet,
  Smartphone,
  Download,
  Upload,
  Plus,
  RefreshCw,
  X,
  Trash2,
  CheckCircle2,
  Code,
  Layers,
  FileText,
  Check,
  Eye,
  Settings,
  Sliders,
  Type,
  FormInput,
  ListOrdered,
  CheckSquare,
  Calendar,
  Table,
  BarChart2,
  Columns,
  UploadCloud,
  Search,
  Sparkles
} from "lucide-react";
import { api } from "../api/client.js";

const COMPONENT_PALETTE = [
  { type: "text", label: "Heading Label", icon: Type },
  { type: "input", label: "Text Input", icon: FormInput },
  { type: "select", label: "Dropdown Select", icon: ListOrdered },
  { type: "checkbox", label: "Checkbox Field", icon: CheckSquare },
  { type: "date", label: "Date Picker", icon: Calendar },
  { type: "table", label: "Data Grid", icon: Table },
  { type: "chart", label: "Analytics Chart", icon: BarChart2 },
  { type: "kanban", label: "Kanban Board", icon: Columns },
  { type: "file_upload", label: "File Attachment", icon: UploadCloud }
];

export default function LowCodeStudioCenter() {
  const [deviceViewport, setDeviceViewport] = useState("desktop");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    pageName: "",
    pageType: "dashboard"
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/lowcode-studio/overview");
      setData(res || {});
      if (res?.pages?.length > 0 && !selectedPage) {
        setSelectedPage(res.pages[0]);
      }
    } catch (err) {
      console.error("Failed to load studio overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Modal scroll lock & Escape key
  useEffect(() => {
    if (showCreateModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setShowCreateModal(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showCreateModal]);

  const handleCreatePage = async (e) => {
    e.preventDefault();
    try {
      await api("/api/lowcode-studio/pages", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setShowCreateModal(false);
      setForm({ pageName: "", pageType: "dashboard" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePage = async (id) => {
    if (!confirm("Purge this custom studio page definition?")) return;
    try {
      await api(`/api/lowcode-studio/pages/${id}`, { method: "DELETE" });
      if (selectedPage?._id === id) setSelectedPage(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportPage = async (pageId, pageName) => {
    try {
      const res = await api(`/api/lowcode-studio/pages/${pageId}/export`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${pageName || "layout"}-schema.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to export layout schema: " + err.message);
    }
  };

  const summary = data?.summary || {};
  const pages = data?.pages || [];

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const q = searchQuery.toLowerCase();
    return pages.filter(p =>
      p.pageName?.toLowerCase().includes(q) ||
      p.pageType?.toLowerCase().includes(q)
    );
  }, [pages, searchQuery]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Loading Visual Studio & Component Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* ── Control Header Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <Layout size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Low-Code Visual Studio
              </h3>
              <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-[8px] font-black rounded-md uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {summary.sdkStatus || "ENGINE READY"}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Drag & Drop Form Builder, Dashboard Creator, Component Palette & Live Viewport
            </p>
          </div>
        </div>

        {/* Viewport Switcher & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          {/* Device Viewport Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 shrink-0">
            <button
              onClick={() => setDeviceViewport("desktop")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                deviceViewport === "desktop"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Desktop Viewport (100%)"
            >
              <Monitor size={13} />
            </button>
            <button
              onClick={() => setDeviceViewport("tablet")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                deviceViewport === "tablet"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Tablet Viewport (768px)"
            >
              <Tablet size={13} />
            </button>
            <button
              onClick={() => setDeviceViewport("mobile")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                deviceViewport === "mobile"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Mobile Viewport (375px)"
            >
              <Smartphone size={13} />
            </button>
          </div>

          <button
            onClick={fetchData}
            title="Refresh Studio"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            New Custom Layout
          </button>
        </div>
      </div>

      {/* ── Compact Telemetry Strip ──────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800/80 rounded-2xl p-2.5 text-white shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">Custom Layouts</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[10px] font-mono font-bold text-indigo-300">{summary.totalPages || pages.length} Pages Created</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">Published Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-400">{summary.publishedPages || pages.length} Published Live</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">Palette Components</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-[10px] font-mono font-bold text-purple-300">{summary.availableDragDropComponents || COMPONENT_PALETTE.length} Blocks</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">Active Viewport</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">{deviceViewport} MODE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Component Palette Strip (Micro Chips) ───────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">
            Drag & Drop Component Palette ({COMPONENT_PALETTE.length})
          </span>
          <span className="text-[8px] font-medium text-slate-400">Available to insert into layouts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1.5">
          {COMPONENT_PALETTE.map((comp, i) => {
            const Icon = comp.icon;
            return (
              <div
                key={i}
                className="p-1.5 px-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 cursor-grab flex items-center gap-1.5 transition-all select-none group"
              >
                <div className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 shrink-0">
                  <Icon size={11} />
                </div>
                <div className="min-w-0">
                  <span className="text-[8.5px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">
                    {comp.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Studio Workspace: Left Pages List + Right Live Canvas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Left Column: Custom Pages List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              Custom Layout Pages ({filteredPages.length})
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus size={10} /> Add
            </button>
          </div>

          {/* Search bar inside left column */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter pages..."
              className="w-full pl-7 pr-2.5 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-lg text-[9.5px] font-medium outline-none focus:border-indigo-400 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-0.5 custom-scrollbar">
            {filteredPages.map((p) => {
              const isSelected = selectedPage?._id === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedPage(p)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 shadow-xs ring-1 ring-indigo-500/20"
                      : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/10 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="px-1.5 py-0.2 rounded-md text-[7.5px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200">
                      {p.pageType}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExportPage(p._id, p.pageName); }}
                        title="Export JSON Schema"
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePage(p._id); }}
                        title="Delete Page"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {p.pageName}
                  </h4>
                  <p className="text-[8.5px] font-mono text-slate-400 mt-0.5">
                    {(p.layoutComponents || []).length} Components Configured
                  </p>
                </div>
              );
            })}

            {filteredPages.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-[9px] font-bold">
                No custom layout pages found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Viewport Canvas */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-3.5 transition-all duration-300 w-full ${
            deviceViewport === "mobile" ? "max-w-[360px]" : deviceViewport === "tablet" ? "max-w-[680px]" : "max-w-full"
          }`}>
            {/* Canvas Header */}
            <div className="border-b pb-2 mb-3 border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Live Device Canvas ({deviceViewport})
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedPage?.pageName || "Select a layout page to preview"}
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md text-[8px] font-black uppercase">
                Interactive Preview
              </span>
            </div>

            {/* Canvas Form / Component Renderings */}
            <div className="space-y-2.5">
              {(selectedPage?.layoutComponents && selectedPage.layoutComponents.length > 0 
                ? selectedPage.layoutComponents 
                : COMPONENT_PALETTE.slice(0, 4)
              ).map((comp, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50/70 dark:bg-white/[0.02] rounded-xl border border-slate-200/60 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                      {comp.label}
                    </label>
                    <span className="text-[7.5px] font-mono text-slate-400 uppercase">
                      [{comp.componentType || comp.type}]
                    </span>
                  </div>

                  {(comp.componentType === "input" || comp.type === "input") && (
                    <input 
                      readOnly 
                      placeholder={comp.props?.placeholder || "Enter value..."} 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-slate-800 dark:text-slate-200" 
                    />
                  )}

                  {(comp.componentType === "select" || comp.type === "select") && (
                    <select disabled className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                      {(comp.props?.options || ["Select standard option...", "Corporate Plan", "Retail Plan"]).map((opt, oIdx) => (
                        <option key={oIdx}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {(comp.componentType === "checkbox" || comp.type === "checkbox") && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300" />
                      <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Acknowledge agreement terms</span>
                    </label>
                  )}

                  {(comp.componentType === "date" || comp.type === "date") && (
                    <input 
                      type="date" 
                      readOnly 
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300" 
                    />
                  )}

                  {(comp.componentType === "file_upload" || comp.type === "file_upload") && (
                    <div className="border border-dashed border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 p-2.5 rounded-lg text-center">
                      <UploadCloud size={14} className="mx-auto text-slate-400 mb-0.5" />
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Drag files here or click to upload</span>
                    </div>
                  )}

                  {(comp.componentType === "chart" || comp.type === "chart") && (
                    <div className="h-16 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center font-mono text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">
                      [Chart Analytics Canvas Simulator]
                    </div>
                  )}

                  {(comp.componentType === "table" || comp.type === "table") && (
                    <div className="rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-[9px] font-mono">
                      <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 font-bold text-slate-600 dark:text-slate-300">
                        <span>ID</span>
                        <span>Record</span>
                        <span>Status</span>
                      </div>
                      <div className="grid grid-cols-3 bg-white dark:bg-slate-900 p-1 border-t border-slate-100 dark:border-white/5 text-slate-500">
                        <span>#1001</span>
                        <span>Client Registry</span>
                        <span className="text-emerald-500 font-bold">Active</span>
                      </div>
                    </div>
                  )}

                  {(comp.componentType === "text" || comp.type === "text") && (
                    <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-snug">
                      Custom form field instruction or descriptive content for user guidance.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Modal via createPortal ────────────────────── */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowCreateModal(false)} 
          />
          <div className="relative z-10 my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs text-white shrink-0">
                  <Layout size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Create Custom Low-Code Page
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Design forms, dashboards & reports
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePage} className="p-4 space-y-3 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Page Title *</label>
                <input
                  required
                  value={form.pageName}
                  onChange={(e) => setForm({ ...form, pageName: e.target.value })}
                  placeholder="e.g. Executive Corporate Tax Form"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Page Type</label>
                <select
                  value={form.pageType}
                  onChange={(e) => setForm({ ...form, pageType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all dark:text-white cursor-pointer"
                >
                  <option value="dashboard">Executive Dashboard</option>
                  <option value="form">Data Intake Form</option>
                  <option value="report">Custom Analytics Report</option>
                  <option value="kanban">Kanban Pipeline Board</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  Save Page
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
