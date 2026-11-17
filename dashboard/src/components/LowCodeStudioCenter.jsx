import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Layout,
  Monitor,
  Tablet,
  Smartphone,
  Download,
  Plus,
  RefreshCw,
  X,
  Trash2,
  CheckCircle2,
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
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  Wrench,
  Inbox,
  Globe,
  Settings2,
  Send
} from "lucide-react";
import { api } from "../api/client.js";

const COMPONENT_PALETTE = [
  { type: "text", label: "Heading Label", icon: Type, defaultProps: { description: "Section guidance or instructions." } },
  { type: "input", label: "Text Input", icon: FormInput, defaultProps: { name: "field_input", placeholder: "Enter value...", required: false } },
  { type: "select", label: "Dropdown Select", icon: ListOrdered, defaultProps: { name: "field_select", options: ["Option A", "Option B", "Option C"], required: false } },
  { type: "checkbox", label: "Checkbox Field", icon: CheckSquare, defaultProps: { name: "field_agree", description: "I confirm these details are accurate", checked: false } },
  { type: "date", label: "Date Picker", icon: Calendar, defaultProps: { name: "field_date", required: false } },
  { type: "file_upload", label: "File Attachment", icon: UploadCloud, defaultProps: { name: "attachment", accept: "*" } },
  { type: "chart", label: "Analytics Chart", icon: BarChart2, defaultProps: { dataSource: "invoices", chartType: "bar" } },
  { type: "table", label: "Data Grid", icon: Table, defaultProps: { dataSource: "customers" } },
  { type: "kanban", label: "Kanban Board", icon: Columns, defaultProps: { dataSource: "tickets" } }
];

const DATA_SOURCES = [
  { value: "customers", label: "Customers & Leads" },
  { value: "tickets", label: "Support Tickets" },
  { value: "invoices", label: "Billing Invoices" },
  { value: "deals", label: "CRM Deals" },
  { value: "risks", label: "Risk Register" },
  { value: "submissions", label: "Form Submissions" }
];

export default function LowCodeStudioCenter() {
  const [deviceViewport, setDeviceViewport] = useState("desktop");
  const [canvasMode, setCanvasMode] = useState("build"); // build | preview | submissions
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedPageId, setSelectedPageId] = useState(null);
  const [draftPage, setDraftPage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingCompIdx, setEditingCompIdx] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Live data cache keyed by source
  const [liveDataMap, setLiveDataMap] = useState({});
  const [loadingLive, setLoadingLive] = useState(false);

  // Interactive form preview state
  const [formAnswers, setFormAnswers] = useState({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [submitBanner, setSubmitBanner] = useState(null);

  // Submissions tab state
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Create/Page Settings Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    pageName: "",
    pageType: "form",
    targetEntity: "lead",
    submitButtonText: "Submit Request",
    successMessage: "Thank you! Your submission has been received.",
    isPublished: true
  });

  const fetchData = useCallback(async (preserveSelection = true) => {
    setLoading(true);
    try {
      const res = await api("/api/lowcode-studio/overview");
      const pagesList = res?.pages || [];
      setData(res || {});

      if (pagesList.length > 0) {
        const current = preserveSelection && selectedPageId
          ? pagesList.find(p => p._id === selectedPageId)
          : null;
        const target = current || pagesList[0];
        setSelectedPageId(target._id);
        setDraftPage(JSON.parse(JSON.stringify(target)));
        setHasUnsavedChanges(false);
      } else {
        setSelectedPageId(null);
        setDraftPage(null);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error("Failed to load studio overview:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPageId]);

  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load live data for any chart/table/kanban blocks in the active page
  const loadLiveSourcesForPage = useCallback(async (page) => {
    if (!page?.layoutComponents) return;
    const sourcesNeeded = new Set();
    page.layoutComponents.forEach(c => {
      if (["chart", "table", "kanban"].includes(c.componentType)) {
        const src = c.props?.dataSource || (c.componentType === "chart" ? "invoices" : c.componentType === "kanban" ? "tickets" : "customers");
        sourcesNeeded.add(src);
      }
    });
    if (sourcesNeeded.size === 0) return;

    setLoadingLive(true);
    try {
      const entries = await Promise.all(
        Array.from(sourcesNeeded).map(async (src) => {
          const res = await api(`/api/lowcode-studio/live-data?source=${encodeURIComponent(src)}`);
          return [src, res];
        })
      );
      setLiveDataMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    } catch (err) {
      console.error("Failed to load live component data:", err);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    if (draftPage) {
      loadLiveSourcesForPage(draftPage);
    }
  }, [draftPage?._id, draftPage?.layoutComponents?.length, loadLiveSourcesForPage]);

  const loadSubmissionsForPage = useCallback(async (pageId) => {
    if (!pageId) return;
    setLoadingSubmissions(true);
    try {
      const res = await api(`/api/lowcode-studio/pages/${pageId}/submissions`);
      setSubmissions(res?.submissions || []);
    } catch (err) {
      console.error("Failed to load submissions:", err);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    if (canvasMode === "submissions" && draftPage?._id) {
      loadSubmissionsForPage(draftPage._id);
    }
  }, [canvasMode, draftPage?._id, loadSubmissionsForPage]);

  // Modal scroll lock & Escape key
  useEffect(() => {
    if (!showCreateModal) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setShowCreateModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [showCreateModal]);

  const selectPage = (page) => {
    setSelectedPageId(page._id);
    setDraftPage(JSON.parse(JSON.stringify(page)));
    setHasUnsavedChanges(false);
    setEditingCompIdx(null);
    setFormAnswers({});
    setSubmitBanner(null);
  };

  const handleCreatePage = async (e) => {
    e.preventDefault();
    try {
      const created = await api("/api/lowcode-studio/pages", {
        method: "POST",
        body: JSON.stringify(createForm)
      });
      setShowCreateModal(false);
      setCreateForm({
        pageName: "",
        pageType: "form",
        targetEntity: "lead",
        submitButtonText: "Submit Request",
        successMessage: "Thank you! Your submission has been received.",
        isPublished: true
      });
      setSelectedPageId(created._id);
      await fetchData(false);
      if (created?._id) {
        setSelectedPageId(created._id);
        setDraftPage(JSON.parse(JSON.stringify(created)));
      }
    } catch (err) {
      alert(err.message || "Failed to create page");
    }
  };

  const handleSaveLayout = async () => {
    if (!draftPage?._id) return;
    setSaving(true);
    try {
      const updated = await api(`/api/lowcode-studio/pages/${draftPage._id}`, {
        method: "PUT",
        body: JSON.stringify({
          pageName: draftPage.pageName,
          pageType: draftPage.pageType,
          targetEntity: draftPage.targetEntity,
          submitButtonText: draftPage.submitButtonText,
          successMessage: draftPage.successMessage,
          layoutComponents: draftPage.layoutComponents,
          isPublished: draftPage.isPublished
        })
      });
      setDraftPage(JSON.parse(JSON.stringify(updated)));
      setHasUnsavedChanges(false);
      await fetchData(true);
    } catch (err) {
      alert(err.message || "Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!draftPage?._id) return;
    const nextState = !draftPage.isPublished;
    setSaving(true);
    try {
      const updated = await api(`/api/lowcode-studio/pages/${draftPage._id}`, {
        method: "PUT",
        body: JSON.stringify({ isPublished: nextState })
      });
      setDraftPage(prev => ({ ...prev, isPublished: updated.isPublished }));
      await fetchData(true);
    } catch (err) {
      alert(err.message || "Failed to update publish status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (id) => {
    if (!confirm("Delete this custom studio page definition?")) return;
    try {
      await api(`/api/lowcode-studio/pages/${id}`, { method: "DELETE" });
      if (selectedPageId === id) {
        setSelectedPageId(null);
        setDraftPage(null);
      }
      await fetchData(false);
    } catch (err) {
      alert(err.message || "Failed to delete page");
    }
  };

  const handleExportPage = async (pageId, pageName) => {
    try {
      const res = await api(`/api/lowcode-studio/pages/${pageId}/export`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
      const a = document.createElement("a");
      a.setAttribute("href", dataStr);
      a.setAttribute("download", `${pageName || "layout"}-schema.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to export layout schema: " + err.message);
    }
  };

  const addComponentToPage = (paletteItem) => {
    if (!draftPage) return;
    const idx = (draftPage.layoutComponents || []).length + 1;
    const newComp = {
      componentType: paletteItem.type,
      label: `${paletteItem.label} ${idx}`,
      props: {
        ...paletteItem.defaultProps,
        name: paletteItem.defaultProps?.name ? `${paletteItem.defaultProps.name}_${idx}` : `field_${idx}`
      }
    };
    const nextComponents = [...(draftPage.layoutComponents || []), newComp];
    setDraftPage({ ...draftPage, layoutComponents: nextComponents });
    setHasUnsavedChanges(true);
    setEditingCompIdx(nextComponents.length - 1);
    if (canvasMode !== "build") setCanvasMode("build");
    if (["chart", "table", "kanban"].includes(paletteItem.type)) {
      loadLiveSourcesForPage({ ...draftPage, layoutComponents: nextComponents });
    }
  };

  const moveComponent = (index, direction) => {
    if (!draftPage) return;
    const list = [...(draftPage.layoutComponents || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(targetIdx, 0, item);
    setDraftPage({ ...draftPage, layoutComponents: list });
    setHasUnsavedChanges(true);
    setEditingCompIdx(targetIdx);
  };

  const removeComponent = (index) => {
    if (!draftPage) return;
    const list = [...(draftPage.layoutComponents || [])];
    list.splice(index, 1);
    setDraftPage({ ...draftPage, layoutComponents: list });
    setHasUnsavedChanges(true);
    if (editingCompIdx === index) setEditingCompIdx(null);
  };

  const updateComponentProp = (index, patch) => {
    if (!draftPage) return;
    const list = [...(draftPage.layoutComponents || [])];
    const current = list[index];
    if (!current) return;
    list[index] = {
      ...current,
      ...patch,
      props: patch.props ? { ...(current.props || {}), ...patch.props } : current.props
    };
    setDraftPage({ ...draftPage, layoutComponents: list });
    setHasUnsavedChanges(true);
    if (patch.props?.dataSource) {
      loadLiveSourcesForPage({ ...draftPage, layoutComponents: list });
    }
  };

  const handleInteractiveFormSubmit = async (e) => {
    e.preventDefault();
    if (!draftPage?._id) return;
    if (!draftPage.isPublished) {
      setSubmitBanner({ type: "error", text: "Publish this page first to test live form submissions." });
      return;
    }
    setSubmittingForm(true);
    setSubmitBanner(null);
    try {
      const res = await api(`/api/lowcode-studio/public/forms/${draftPage.slug || draftPage._id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: formAnswers })
      });
      setSubmitBanner({
        type: "success",
        text: `${res.message || "Submitted!"} (${res.conversionStatus || "saved"})`
      });
      setFormAnswers({});
      await fetchData(true);
    } catch (err) {
      setSubmitBanner({ type: "error", text: err.message || "Submission failed" });
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleDeleteSubmission = async (submissionId) => {
    if (!confirm("Delete this submission record?")) return;
    try {
      await api(`/api/lowcode-studio/submissions/${submissionId}`, { method: "DELETE" });
      await loadSubmissionsForPage(draftPage._id);
      await fetchData(true);
    } catch (err) {
      alert(err.message || "Failed to delete submission");
    }
  };

  const summary = data?.summary || {};
  const pages = data?.pages || [];

  const filteredPages = useMemo(() => {
    return pages.filter(p => {
      if (typeFilter !== "all" && p.pageType !== typeFilter) return false;
      if (statusFilter === "published" && !p.isPublished) return false;
      if (statusFilter === "draft" && p.isPublished) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.pageName?.toLowerCase().includes(q) ||
          p.pageType?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pages, searchQuery, typeFilter, statusFilter]);

  const hasFormInputs = useMemo(() => {
    return (draftPage?.layoutComponents || []).some(c =>
      ["input", "select", "checkbox", "date", "file_upload"].includes(c.componentType)
    );
  }, [draftPage]);

  if (loading && !data) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
        <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[11px] font-semibold text-slate-500">
          Loading Low-Code Studio & Live Engine...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Clean White Header ───────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Layout size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                Low-Code Visual Studio
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {summary.sdkStatus || "LOW_CODE_ENGINE_READY"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Build dynamic intake forms, live data dashboards, and interactive layouts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Device Viewport Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            {[
              { id: "desktop", icon: Monitor, title: "Desktop (100%)" },
              { id: "tablet", icon: Tablet, title: "Tablet (680px)" },
              { id: "mobile", icon: Smartphone, title: "Mobile (360px)" }
            ].map(vp => {
              const Icon = vp.icon;
              return (
                <button
                  key={vp.id}
                  onClick={() => setDeviceViewport(vp.id)}
                  title={vp.title}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    deviceViewport === vp.id
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon size={13} />
                </button>
              );
            })}
          </div>

          <button
            onClick={() => fetchData(true)}
            title="Refresh Studio"
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus size={14} />
            New Layout
          </button>
        </div>
      </div>

      {/* ── Clean White KPI Strip ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Custom Layouts
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900">{summary.totalPages ?? pages.length}</span>
            <span className="text-[10px] text-slate-500">{summary.draftPages || 0} drafts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Published Live
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-emerald-600">{summary.publishedPages ?? 0}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Active endpoints</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Form Submissions
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-indigo-600">{summary.totalSubmissionsReceived ?? 0}</span>
            <span className="text-[10px] text-slate-500">Saved in DB</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Active Viewport
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900 uppercase">{deviceViewport}</span>
            <span className="text-[10px] text-slate-500">{COMPONENT_PALETTE.length} palette blocks</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Component Palette ────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Component Palette ({COMPONENT_PALETTE.length})
          </span>
          <span className="text-[10px] text-slate-400">
            Click or drag any block onto the canvas to insert
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1.5">
          {COMPONENT_PALETTE.map((comp) => {
            const Icon = comp.icon;
            return (
              <button
                key={comp.type}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", comp.type)}
                onClick={() => addComponentToPage(comp)}
                disabled={!draftPage}
                title={draftPage ? `Add ${comp.label} to ${draftPage.pageName}` : "Select or create a page first"}
                className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-all text-left group"
              >
                <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 shrink-0">
                  <Icon size={11} />
                </div>
                <span className="text-[11px] font-medium text-slate-700 group-hover:text-indigo-700 truncate">
                  {comp.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Workspace: Pages List + Live Canvas ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Left Sidebar: Pages List & Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Layout Pages ({filteredPages.length})
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages or slug..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none"
              >
                <option value="all">All Types</option>
                <option value="form">Form</option>
                <option value="dashboard">Dashboard</option>
                <option value="report">Report</option>
                <option value="kanban">Kanban</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 outline-none"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5">
            {filteredPages.map((p) => {
              const isSelected = draftPage?._id === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => selectPage(p)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-400"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-100 text-indigo-700">
                        {p.pageType}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                          p.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExportPage(p._id, p.pageName); }}
                        title="Export JSON Schema"
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePage(p._id); }}
                        title="Delete Page"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-900 truncate">{p.pageName}</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>{(p.layoutComponents || []).length} blocks</span>
                    <span>{p.submissionCount || 0} submissions</span>
                  </div>
                </div>
              );
            })}

            {filteredPages.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No layout pages match your filter. Click <strong>+ Add</strong> to create one.
              </div>
            )}
          </div>
        </div>

        {/* Right Workspace: Builder / Live Preview / Submissions */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {!draftPage ? (
            <div className="w-full bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
              <Layout size={28} className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No layout selected</p>
              <p className="text-[11px] text-slate-400">
                Create a new form or dashboard layout to start building.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                + New Layout
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData("text/plain");
                const found = COMPONENT_PALETTE.find(c => c.type === type);
                if (found) addComponentToPage(found);
              }}
              className={`bg-white rounded-xl border border-slate-200 p-3.5 transition-all duration-200 w-full ${
                deviceViewport === "mobile"
                  ? "max-w-[360px]"
                  : deviceViewport === "tablet"
                  ? "max-w-[680px]"
                  : "max-w-full"
              }`}
            >
              {/* Canvas Toolbar */}
              <div className="border-b border-slate-100 pb-2.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      {deviceViewport} Canvas
                    </span>
                    {draftPage.slug && (
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        /public/forms/{draftPage.slug}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                    {draftPage.pageName}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Mode Switcher */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {[
                      { id: "build", label: "Build", icon: Wrench },
                      { id: "preview", label: "Live Preview", icon: Eye },
                      { id: "submissions", label: `Submissions (${draftPage.submissionCount || 0})`, icon: Inbox }
                    ].map(m => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setCanvasMode(m.id)}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                            canvasMode === m.id
                              ? "bg-white text-indigo-600 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Icon size={11} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleTogglePublish}
                    disabled={saving}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 cursor-pointer ${
                      draftPage.isPublished
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Globe size={11} />
                    {draftPage.isPublished ? "Published" : "Draft"}
                  </button>

                  {hasUnsavedChanges && (
                    <button
                      onClick={handleSaveLayout}
                      disabled={saving}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Save size={11} />
                      {saving ? "Saving..." : "Save Layout"}
                    </button>
                  )}
                </div>
              </div>

              {/* ── MODE 1: BUILDER ────────────────────────────── */}
              {canvasMode === "build" && (
                <div className="space-y-2">
                  {(draftPage.layoutComponents || []).length === 0 ? (
                    <div className="py-10 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      This layout is empty. Click or drag any block from the Component Palette above to insert it.
                    </div>
                  ) : (
                    (draftPage.layoutComponents || []).map((comp, idx) => {
                      const isEditing = editingCompIdx === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border transition-all ${
                            isEditing ? "border-indigo-400 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-mono uppercase text-slate-600">
                                {comp.componentType}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {comp.label}
                              </span>
                              {comp.props?.required && (
                                <span className="text-[10px] font-bold text-rose-500">*</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveComponent(idx, -1)}
                                disabled={idx === 0}
                                title="Move Up"
                                className="p-1 rounded hover:bg-white text-slate-500 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveComponent(idx, 1)}
                                disabled={idx === draftPage.layoutComponents.length - 1}
                                title="Move Down"
                                className="p-1 rounded hover:bg-white text-slate-500 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCompIdx(isEditing ? null : idx)}
                                title="Configure Block"
                                className={`p-1 rounded cursor-pointer ${
                                  isEditing ? "bg-indigo-600 text-white" : "hover:bg-white text-slate-500"
                                }`}
                              >
                                <Settings2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeComponent(idx)}
                                title="Remove Block"
                                className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Inline Property Editor */}
                          {isEditing && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                  Block Label
                                </label>
                                <input
                                  value={comp.label || ""}
                                  onChange={(e) => updateComponentProp(idx, { label: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400"
                                />
                              </div>

                              {["input", "select", "checkbox", "date", "file_upload"].includes(comp.componentType) && (
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                    Field Key (API Name)
                                  </label>
                                  <input
                                    value={comp.props?.name || ""}
                                    onChange={(e) => updateComponentProp(idx, { props: { name: e.target.value } })}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-indigo-400"
                                  />
                                </div>
                              )}

                              {comp.componentType === "input" && (
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                    Placeholder
                                  </label>
                                  <input
                                    value={comp.props?.placeholder || ""}
                                    onChange={(e) => updateComponentProp(idx, { props: { placeholder: e.target.value } })}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400"
                                  />
                                </div>
                              )}

                              {comp.componentType === "select" && (
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                    Options (comma-separated)
                                  </label>
                                  <input
                                    value={(comp.props?.options || []).join(", ")}
                                    onChange={(e) =>
                                      updateComponentProp(idx, {
                                        props: { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }
                                      })
                                    }
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400"
                                  />
                                </div>
                              )}

                              {comp.componentType === "text" && (
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                    Instruction Text
                                  </label>
                                  <input
                                    value={comp.props?.description || ""}
                                    onChange={(e) => updateComponentProp(idx, { props: { description: e.target.value } })}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-400"
                                  />
                                </div>
                              )}

                              {["chart", "table", "kanban"].includes(comp.componentType) && (
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                                    Live MongoDB Data Source
                                  </label>
                                  <select
                                    value={comp.props?.dataSource || (comp.componentType === "chart" ? "invoices" : comp.componentType === "kanban" ? "tickets" : "customers")}
                                    onChange={(e) => updateComponentProp(idx, { props: { dataSource: e.target.value } })}
                                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none"
                                  >
                                    {DATA_SOURCES.map(ds => (
                                      <option key={ds.value} value={ds.value}>{ds.label}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {["input", "select", "date", "checkbox"].includes(comp.componentType) && (
                                <label className="flex items-center gap-1.5 cursor-pointer pt-3">
                                  <input
                                    type="checkbox"
                                    checked={!!comp.props?.required}
                                    onChange={(e) => updateComponentProp(idx, { props: { required: e.target.checked } })}
                                    className="rounded text-indigo-600"
                                  />
                                  <span className="text-[11px] font-medium text-slate-700">Required Field</span>
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── MODE 2: LIVE INTERACTIVE PREVIEW ───────────── */}
              {canvasMode === "preview" && (
                <form onSubmit={handleInteractiveFormSubmit} className="space-y-3">
                  {submitBanner && (
                    <div
                      className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                        submitBanner.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-rose-50 border-rose-200 text-rose-700"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>{submitBanner.text}</span>
                    </div>
                  )}

                  {(draftPage.layoutComponents || []).length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Add blocks in Build mode to preview live data and forms.
                    </div>
                  ) : (
                    (draftPage.layoutComponents || []).map((comp, idx) => {
                      const fieldKey = comp.props?.name || `field_${idx}`;
                      const dataSource =
                        comp.props?.dataSource ||
                        (comp.componentType === "chart" ? "invoices" : comp.componentType === "kanban" ? "tickets" : "customers");
                      const live = liveDataMap[dataSource];

                      return (
                        <div key={idx} className="p-3 bg-slate-50/60 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-800">
                              {comp.label}
                              {comp.props?.required && <span className="text-rose-500 ml-0.5">*</span>}
                            </label>
                            {["chart", "table", "kanban"].includes(comp.componentType) && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Source: {dataSource}
                              </span>
                            )}
                          </div>

                          {comp.componentType === "text" && (
                            <p className="text-xs text-slate-600">
                              {comp.props?.description || "Informational block"}
                            </p>
                          )}

                          {comp.componentType === "input" && (
                            <input
                              type={comp.props?.type || "text"}
                              required={!!comp.props?.required}
                              value={formAnswers[fieldKey] || ""}
                              onChange={(e) => setFormAnswers(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              placeholder={comp.props?.placeholder || "Enter value..."}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                            />
                          )}

                          {comp.componentType === "select" && (
                            <select
                              required={!!comp.props?.required}
                              value={formAnswers[fieldKey] || ""}
                              onChange={(e) => setFormAnswers(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                            >
                              <option value="">Select an option...</option>
                              {(comp.props?.options || []).map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {comp.componentType === "checkbox" && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                required={!!comp.props?.required}
                                checked={!!formAnswers[fieldKey]}
                                onChange={(e) => setFormAnswers(prev => ({ ...prev, [fieldKey]: e.target.checked }))}
                                className="rounded text-indigo-600"
                              />
                              <span className="text-xs text-slate-700">
                                {comp.props?.description || comp.label}
                              </span>
                            </label>
                          )}

                          {comp.componentType === "date" && (
                            <input
                              type="date"
                              required={!!comp.props?.required}
                              value={formAnswers[fieldKey] || ""}
                              onChange={(e) => setFormAnswers(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                            />
                          )}

                          {comp.componentType === "file_upload" && (
                            <input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFormAnswers(prev => ({ ...prev, [fieldKey]: `${file.name} (${Math.round(file.size / 1024)} KB)` }));
                                }
                              }}
                              className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-200 file:text-xs file:bg-white"
                            />
                          )}

                          {comp.componentType === "chart" && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                              {loadingLive && !live ? (
                                <p className="text-[11px] text-slate-400">Loading live chart metrics...</p>
                              ) : (live?.chartSeries || []).length === 0 ? (
                                <p className="text-[11px] text-slate-400">No records in {dataSource} yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {(() => {
                                    const maxVal = Math.max(...live.chartSeries.map(s => Number(s.value) || 0), 1);
                                    return live.chartSeries.map((pt, pIdx) => {
                                      const pct = Math.max(4, Math.round(((Number(pt.value) || 0) / maxVal) * 100));
                                      return (
                                        <div key={pIdx} className="space-y-0.5">
                                          <div className="flex justify-between text-[11px]">
                                            <span className="font-medium text-slate-700">{pt.label}</span>
                                            <span className="font-mono text-slate-600">{Number(pt.value).toLocaleString()}</span>
                                          </div>
                                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-indigo-600 rounded-full transition-all"
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              )}
                            </div>
                          )}

                          {comp.componentType === "table" && (
                            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                              {loadingLive && !live ? (
                                <p className="p-3 text-[11px] text-slate-400">Loading live table rows...</p>
                              ) : (live?.tableRows || []).length === 0 ? (
                                <p className="p-3 text-[11px] text-slate-400">No records in {dataSource} yet.</p>
                              ) : (
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <tr>
                                      {(live.tableColumns || []).map((col, cIdx) => (
                                        <th key={cIdx} className="px-2.5 py-1.5 font-semibold">{col}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {live.tableRows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-50/50">
                                        <td className="px-2.5 py-1.5 font-mono text-slate-700 truncate max-w-[140px]">{row.id}</td>
                                        <td className="px-2.5 py-1.5 text-slate-800 truncate max-w-[180px]">{row.col2}</td>
                                        <td className="px-2.5 py-1.5 text-slate-600 uppercase text-[10px]">{row.col3}</td>
                                        <td className="px-2.5 py-1.5">
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium uppercase">
                                            {row.col4}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}

                          {comp.componentType === "kanban" && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {(live?.kanbanColumns || []).map((col, kIdx) => (
                                <div key={kIdx} className="bg-white border border-slate-200 rounded-lg p-2 space-y-1.5">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                    <span className="text-[10px] font-bold uppercase text-slate-700">{col.stage}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{col.items.length}</span>
                                  </div>
                                  {col.items.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 py-2 text-center">Empty</p>
                                  ) : (
                                    col.items.map((item) => (
                                      <div key={item.id} className="p-1.5 bg-slate-50 border border-slate-200/80 rounded text-[11px]">
                                        <p className="font-medium text-slate-800 truncate">{item.title}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{item.meta}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {hasFormInputs && (
                    <button
                      type="submit"
                      disabled={submittingForm}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send size={12} />
                      {submittingForm ? "Submitting..." : draftPage.submitButtonText || "Submit Form"}
                    </button>
                  )}
                </form>
              )}

              {/* ── MODE 3: SAVED SUBMISSIONS ──────────────────── */}
              {canvasMode === "submissions" && (
                <div className="space-y-2">
                  {loadingSubmissions ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading submissions...</div>
                  ) : submissions.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No submissions recorded for this page yet. Test it in <strong>Live Preview</strong>!
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="px-2.5 py-2 font-semibold">Submitted Answers</th>
                            <th className="px-2.5 py-2 font-semibold">Conversion</th>
                            <th className="px-2.5 py-2 font-semibold">Date</th>
                            <th className="px-2.5 py-2 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {submissions.map((sub) => (
                            <tr key={sub._id} className="hover:bg-slate-50/50">
                              <td className="px-2.5 py-2 text-slate-800 max-w-[280px]">
                                <div className="space-y-0.5">
                                  {Object.entries(sub.answers || {}).map(([k, v]) => (
                                    <div key={k} className="truncate">
                                      <span className="font-mono text-slate-500">{k}:</span>{" "}
                                      <span>{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2.5 py-2">
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold uppercase">
                                  {sub.conversionStatus}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 text-slate-500">
                                {new Date(sub.createdAt).toLocaleString()}
                              </td>
                              <td className="px-2.5 py-2 text-right">
                                <button
                                  onClick={() => handleDeleteSubmission(sub._id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Delete submission"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Custom Page Modal (Portal) ────────────────── */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-3 sm:p-6 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative z-10 my-auto bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Layout size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Create Low-Code Page</h3>
                  <p className="text-[10px] text-slate-500">Forms, dashboards, reports & Kanban views</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Page Title *</label>
                <input
                  required
                  value={createForm.pageName}
                  onChange={(e) => setCreateForm({ ...createForm, pageName: e.target.value })}
                  placeholder="e.g. Client Onboarding Intake"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Page Type</label>
                  <select
                    value={createForm.pageType}
                    onChange={(e) => setCreateForm({ ...createForm, pageType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="form">Data Intake Form</option>
                    <option value="dashboard">Live Dashboard</option>
                    <option value="report">Analytics Report</option>
                    <option value="kanban">Kanban Board</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">On Submit Create</label>
                  <select
                    value={createForm.targetEntity}
                    onChange={(e) => setCreateForm({ ...createForm, targetEntity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="lead">CRM Lead</option>
                    <option value="ticket">Support Ticket</option>
                    <option value="none">Save Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Submit Button Text</label>
                <input
                  value={createForm.submitButtonText}
                  onChange={(e) => setCreateForm({ ...createForm, submitButtonText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.isPublished}
                  onChange={(e) => setCreateForm({ ...createForm, isPublished: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span className="text-xs text-slate-700 font-medium">Publish live immediately</span>
              </label>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-lg cursor-pointer"
                >
                  Create Page
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg cursor-pointer"
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
