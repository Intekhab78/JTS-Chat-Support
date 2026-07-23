import React, { useRef, useEffect, useCallback } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { api } from "../../../api/client.js";
import { convertReactFlowToDict, convertDictToReactFlow } from "../utils/graphConverter.js";
import { getLayoutedElements } from "../utils/autoLayout.js";
import {
  Save,
  Undo,
  Redo,
  Play,
  Network,
  Download,
  Upload,
  LayoutGrid,
  Check,
  ShieldCheck,
  ShieldX,
  History,
  Clock,
  LayoutTemplate,
  HelpCircle,
  Bug
} from "lucide-react";

export function FlowToolbar({ onUpdate }) {
  const fileInputRef = useRef(null);

  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const website = useFlowStore((s) => s.website);
  const flowId = useFlowStore((s) => s.flowId);
  const isPublished = useFlowStore((s) => s.isPublished);
  const setIsPublished = useFlowStore((s) => s.setIsPublished);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const historyIndex = useFlowStore((s) => s.historyIndex);
  const history = useFlowStore((s) => s.history);
  const saving = useFlowStore((s) => s.saving);
  const saveSuccess = useFlowStore((s) => s.saveSuccess);
  const lastSavedAt = useFlowStore((s) => s.lastSavedAt);
  const setShowDiagnostics = useFlowStore((s) => s.setShowDiagnostics);
  const setShowSimulator = useFlowStore((s) => s.setShowSimulator);
  const setShowVersionHistory = useFlowStore((s) => s.setShowVersionHistory);
  const validation = useFlowStore((s) => s.validation);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Save Flow Handler
  const handleSave = useCallback(async () => {
    // Publish protection: block save ONLY if flow is set to Published and has errors
    if (isPublished && !validation.isValid) {
      const errorList = validation.errors.map((e) => `• ${e.message}`).join("\n");
      alert(`Cannot publish flow — ${validation.errors.length} validation error(s) found:\n\n${errorList}\n\nTip: You can switch to Draft mode to save your work while resolving errors.`);
      setShowDiagnostics(true);
      return;
    }

    useFlowStore.setState({ saving: true });

    try {
      const nodesDict = convertReactFlowToDict(nodes, edges);
      let res;
      let targetFlowId = flowId;

      if (targetFlowId) {
        res = await api(`/api/flows/${targetFlowId}`, {
          method: "PATCH",
          body: JSON.stringify({ nodes: nodesDict, isPublished }),
        });
      } else {
        res = await api(`/api/flows`, {
          method: "POST",
          body: JSON.stringify({
            websiteId: website._id,
            name: "Custom Website Flow",
            nodes: nodesDict,
            isPublished
          }),
        });
        targetFlowId = res._id;
        await api(`/api/flows/${targetFlowId}/activate`, { method: "POST" });
      }

      const timeStr = new Date().toLocaleTimeString();
      const updatedWeb = await api(`/api/websites/${website._id}`);
      useFlowStore.setState({
        website: updatedWeb,
        flowId: targetFlowId,
        saving: false,
        saveSuccess: true,
        isDirty: false,
        lastSavedAt: timeStr
      });

      if (onUpdate) onUpdate(updatedWeb);

      setTimeout(() => useFlowStore.setState({ saveSuccess: false }), 3000);
    } catch (err) {
      alert("Failed to save flow: " + err.message);
      useFlowStore.setState({ saving: false });
    }
  }, [validation, nodes, edges, flowId, isPublished, website, onUpdate, setShowDiagnostics]);

  const handleAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, "LR");
    useFlowStore.setState({ nodes: layoutedNodes, edges: layoutedEdges });
    useFlowStore.getState().recordHistory(layoutedNodes, layoutedEdges);
  }, [nodes, edges]);

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+C, Ctrl+V)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const selectedId = useFlowStore.getState().selectedNodeId;
        if (selectedId) useFlowStore.getState().copyNode(selectedId);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        useFlowStore.getState().pasteNode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, undo, redo, handleSave]);

  const handleExportJSON = () => {
    const dict = convertReactFlowToDict(nodes, edges);
    const jsonStr = JSON.stringify({ name: website?.websiteName || "Flow", nodes: dict }, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow_${website?._id || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedDict = parsed.nodes || parsed;
        const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(importedDict);
        useFlowStore.setState({ nodes: rfNodes, edges: rfEdges });
        useFlowStore.getState().recordHistory(rfNodes, rfEdges);
        alert("Flow imported successfully!");
      } catch (err) {
        alert("Invalid JSON flow file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-16 border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl px-5 flex items-center justify-between z-20 select-none shadow-xs">
      {/* Brand & Status */}
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
          <Network size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {website?.websiteName || "Website"} Flow Engine
            </h2>
            <button
              onClick={() => setIsPublished(!isPublished)}
              title="Click to toggle Draft / Published status"
              className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                isPublished
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {isPublished ? "Published" : "Draft"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold tracking-tight mt-0.5">
            <span>Visual Conversational Workflow Builder</span>
            {lastSavedAt && (
              <span className="text-slate-400 flex items-center gap-1 font-mono">
                · <Clock size={10} /> Saved {lastSavedAt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-white/5 backdrop-blur-md">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-25"
        >
          <Undo size={15} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-25"
        >
          <Redo size={15} />
        </button>
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700/80 mx-1" />
        <button
          onClick={handleAutoLayout}
          title="Auto-arrange graph layout"
          className="px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <LayoutGrid size={14} className="text-indigo-500" /> Auto Layout
        </button>
        <div className="w-px h-5 bg-slate-300 dark:bg-slate-700/80 mx-1" />
        <button
          onClick={() => setShowVersionHistory(true)}
          title="View Version History & Restore Snapshots"
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <History size={15} />
        </button>
        <button
          onClick={() => setShowSimulator(true)}
          title="Launch Interactive Chatbot Simulator"
          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md shadow-indigo-500/20"
        >
          <Play size={13} fill="currentColor" /> Test Simulator
        </button>
        <button
          onClick={() => useFlowStore.setState({ showTemplatesModal: true })}
          title="Browse & Import Pre-built Chatbot Flow Templates"
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          <LayoutTemplate size={15} />
        </button>
        <button
          onClick={() => useFlowStore.setState({ showHelpDrawer: true })}
          title="Open Help & Documentation Center (50 FAQ Articles, Guides)"
          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleExportJSON}
          title="Export Flow JSON"
          className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-slate-200/60 dark:border-slate-800"
        >
          <Download size={16} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import Flow JSON"
          className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-slate-200/60 dark:border-slate-800"
        >
          <Upload size={16} />
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />

        <button
          onClick={() => setShowDiagnostics(true)}
          title="View Graph Diagnostics & Health Report"
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
            validation.isValid
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20 animate-pulse"
          }`}
        >
          {validation.isValid ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
          <span>{validation.isValid ? "Flow Healthy" : `${validation.errors.length} Errors`}</span>
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          title="Save Flow to Engine (Ctrl+S)"
          className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saveSuccess ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {saveSuccess ? "Saved!" : "Save Flow"}
        </button>
      </div>
    </div>
  );
}
