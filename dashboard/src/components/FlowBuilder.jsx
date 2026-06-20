import React, { useState, useEffect, useMemo } from "react";
import { Network, Plus, Trash, ArrowRight, Save, LayoutTemplate, AlertCircle, Check, ChevronRight, MessageSquare, ListTree, Zap, FileText, Bot, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { api } from "../api/client.js";

// Basic default if empty
const DEFAULT_FLOW = {
  nodes: {
    root: {
      type: "message",
      message: "Hi 👋 How can we help you today?",
      options: [
        { text: "Support", next: "support" }
      ]
    },
    support: {
      type: "action",
      actionType: "escalate",
      department: "Technical Support"
    }
  }
};

export default function FlowBuilder({ website, onUpdate }) {
  const [flow, setFlow] = useState(DEFAULT_FLOW);
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // Real-time flow validation
  const validation = useMemo(() => {
    const nodes = flow.nodes || {};
    const allNodeIds = new Set(Object.keys(nodes));
    const errors = [];
    const warnings = [];

    if (!nodes.root) {
      errors.push({ code: "MISSING_ROOT", message: "Flow has no root node" });
    } else {
      if (!nodes.root.options || nodes.root.options.length === 0) {
        errors.push({ code: "EMPTY_ROOT_OPTIONS", message: "Root node has no buttons — visitors will see a blank widget" });
      }
      if (!nodes.root.message) {
        warnings.push({ code: "MISSING_ROOT_MESSAGE", message: "Root node has no welcome message" });
      }
    }

    // Check all node options for broken links
    Object.entries(nodes).forEach(([id, node]) => {
      (node.options || []).forEach(opt => {
        if (opt.next && !allNodeIds.has(opt.next)) {
          errors.push({ code: "BROKEN_LINK", message: `"${id}" → "${opt.text}" links to missing node "${opt.next}"`, node: id });
        }
      });
      if (node.next && !allNodeIds.has(node.next)) {
        errors.push({ code: "BROKEN_NEXT", message: `"${id}" next field links to missing node "${node.next}"`, node: id });
      }
    });

    // Orphan detection
    const referenced = new Set(["root"]);
    Object.values(nodes).forEach(n => {
      (n.options || []).forEach(o => { if (o.next) referenced.add(o.next); });
      if (n.next) referenced.add(n.next);
      if (n.trueNext) referenced.add(n.trueNext);
      if (n.falseNext) referenced.add(n.falseNext);
    });
    allNodeIds.forEach(id => {
      if (!referenced.has(id)) warnings.push({ code: "ORPHAN_NODE", message: `Node "${id}" is not linked from any other node`, node: id });
    });

    return { isValid: errors.length === 0, errors, warnings };
  }, [flow]);

  useEffect(() => {
    if (website?.activeFlowId?.nodes) {
      setFlow(website.activeFlowId);
      api(`/api/flows/${website.activeFlowId._id}/analytics`)
        .then(setAnalytics)
        .catch(err => console.warn("Failed to load flow analytics:", err));
    } else if (website?.botFlow?.nodes) {
      // Fallback to legacy botFlow
      setFlow({ nodes: website.botFlow.nodes });
    }
  }, [website]);

  const handleSave = async () => {
    // Publish protection: block save if flow is invalid
    if (validation.errors.length > 0) {
      const errorList = validation.errors.map(e => `• ${e.message}`).join("\n");
      alert(`Cannot save flow — ${validation.errors.length} error(s) found:\n\n${errorList}`);
      return;
    }
    setSaving(true);
    try {
      let flowId = website?.activeFlowId?._id;
      let res;
      if (flowId) {
        // Update existing flow
        res = await api(`/api/flows/${flowId}`, {
          method: "PATCH",
          body: JSON.stringify({ nodes: flow.nodes }),
        });
      } else {
        // Create new flow and attach
        res = await api(`/api/flows`, {
          method: "POST",
          body: JSON.stringify({
            websiteId: website._id,
            name: "Custom Website Flow",
            nodes: flow.nodes,
            isPublished: true
          }),
        });
        flowId = res._id;
        await api(`/api/flows/${flowId}/activate`, { method: "POST" });
        
        // Refresh website object
        const updatedWeb = await api(`/api/websites/${website._id}`);
        if (onUpdate) onUpdate(updatedWeb);
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save flow: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addNode = () => {
    const newId = `node_${Date.now()}`;
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      draft.nodes[newId] = { type: "message", message: "New Node", options: [] };
      return draft;
    });
    setSelectedNodeId(newId);
  };

  const deleteNode = (nodeId) => {
    if (nodeId === "root") return alert("Cannot delete root node.");
    if (!window.confirm(`Delete node ${nodeId}?`)) return;
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      delete draft.nodes[nodeId];
      return draft;
    });
    setSelectedNodeId("root");
  };

  const updateNode = (nodeId, field, value) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      draft.nodes[nodeId][field] = value;
      return draft;
    });
  };

  const addOption = (nodeId) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      const newNextId = `node_${Date.now()}`;
      if (!draft.nodes[nodeId].options) draft.nodes[nodeId].options = [];
      draft.nodes[nodeId].options.push({ text: "New Option", next: newNextId });
      draft.nodes[newNextId] = { type: "message", message: "New Node Message", options: [] };
      return draft;
    });
  };

  const removeOption = (nodeId, index) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      draft.nodes[nodeId].options.splice(index, 1);
      return draft;
    });
  };

  const updateOption = (nodeId, index, field, value) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      draft.nodes[nodeId].options[index][field] = value;
      return draft;
    });
  };

  const addFormField = (nodeId) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      if (!draft.nodes[nodeId].fields) draft.nodes[nodeId].fields = [];
      draft.nodes[nodeId].fields.push({ name: `field_${Date.now()}`, type: "text", label: "New Field", required: true });
      return draft;
    });
  };

  const updateFormField = (nodeId, index, field, value) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      draft.nodes[nodeId].fields[index][field] = value;
      return draft;
    });
  };

  const removeFormField = (nodeId, index) => {
    setFlow((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      draft.nodes[nodeId].fields.splice(index, 1);
      return draft;
    });
  };

  const selectedNode = flow.nodes?.[selectedNodeId];

  // Helper to determine icon based on node type
  const getNodeIcon = (node) => {
    if (node.type === "message") return <MessageSquare size={14} className="text-blue-500" />;
    if (node.type === "button_group") return <ListTree size={14} className="text-purple-500" />;
    if (node.type === "action") return <Zap size={14} className="text-orange-500" />;
    if (node.type === "form") return <FileText size={14} className="text-green-500" />;
    if (node.type === "condition") return <Network size={14} className="text-red-500" />;
    return <Bot size={14} className="text-slate-500" />;
  };

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">
      
      {/* Sidebar: Tree Viewer */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Network size={16} className="text-indigo-500" />
              Dynamic Flow
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Validation badge */}
            <button
              onClick={() => setShowDiagnostics(d => !d)}
              title={validation.isValid ? "Flow is valid" : `${validation.errors.length} error(s)`}
              className={`p-1.5 rounded-lg transition-all ${
                validation.isValid
                  ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                  : "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
              }`}
            >
              {validation.isValid ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
            </button>
            <button onClick={addNode} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200">
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          {Object.keys(flow.nodes || {}).map((nodeId) => {
            // Check if this node has validation errors
            const hasError = validation.errors.some(e => e.node === nodeId);
            const hasWarning = validation.warnings.some(w => w.node === nodeId);

            // Heatmap calculation
            const stats = analytics?.nodeStats?.[nodeId];
            const visits = stats?.visits || 0;
            const dropOffs = stats?.dropOffs || 0;
            const rate = visits > 0 ? (dropOffs / visits) * 150 : 0; // scaled for visibility

            let heatBorderClass = "border-transparent";
            let heatDotClass = "";
            if (visits > 0) {
              const actualRate = (dropOffs / visits) * 100;
              if (actualRate > 40) {
                heatBorderClass = "border-rose-200 dark:border-rose-800/40 bg-rose-50/10 dark:bg-rose-950/10";
                heatDotClass = "w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse";
              } else if (actualRate >= 15) {
                heatBorderClass = "border-amber-200 dark:border-amber-800/40 bg-amber-50/10 dark:bg-amber-950/10";
                heatDotClass = "w-1.5 h-1.5 rounded-full bg-amber-500";
              } else {
                heatBorderClass = "border-emerald-250 dark:border-emerald-800/40 bg-emerald-50/10 dark:bg-emerald-950/10";
                heatDotClass = "w-1.5 h-1.5 rounded-full bg-emerald-500";
              }
            }

            return (
              <button
                key={nodeId}
                onClick={() => setSelectedNodeId(nodeId)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all border ${
                  selectedNodeId === nodeId
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : hasError
                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400"
                    : hasWarning
                    ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                    : `${heatBorderClass} text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800`
                }`}
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  {getNodeIcon(flow.nodes[nodeId])}
                  <div className="flex flex-col truncate">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{nodeId}</span>
                    <span className="text-[9px] truncate opacity-70 mt-0.5 flex items-center gap-1.5">
                      <span>{flow.nodes[nodeId].type}</span>
                      {analytics?.nodeStats?.[nodeId] && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 shrink-0">
                          (👁️ {analytics.nodeStats[nodeId].visits || 0}
                          {heatDotClass && <span className={heatDotClass} title={`Drop-off Rate: ${Math.round((dropOffs / visits) * 100)}%`} />})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasError && <AlertCircle size={11} className="text-red-500" />}
                  {!hasError && hasWarning && <AlertTriangle size={11} className="text-amber-500" />}
                  <ChevronRight size={12} className="opacity-50" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Node Editor */}
      <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col bg-white dark:bg-slate-900">
        {selectedNode ? (
          <div className="flex-1 flex flex-col p-6 lg:p-8 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
               <div>
                 <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                   {selectedNodeId}
                   {selectedNodeId !== "root" && (
                     <button onClick={() => deleteNode(selectedNodeId)} className="text-red-400 hover:text-red-600 p-1">
                       <Trash size={14} />
                     </button>
                   )}
                 </h2>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure node behavior</p>
               </div>
               <button
                 onClick={handleSave}
                 disabled={saving}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
               >
                 {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : success ? <Check size={14} /> : <Save size={14} />}
                  {success ? "Saved!" : "Save Engine"}
                </button>
             </div>

             {/* Inline validation summary */}
             {(validation.errors.length > 0 || validation.warnings.length > 0) && (
               <div className={`mx-0 mt-0 px-4 py-2.5 border-b flex flex-col gap-1 ${
                 validation.errors.length > 0
                   ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
                   : "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30"
               }`}>
                 {validation.errors.map((e, i) => (
                   <div key={i} className="flex items-start gap-2 text-[10px] font-bold text-red-700 dark:text-red-400">
                     <AlertCircle size={10} className="shrink-0 mt-0.5" />
                     {e.message}
                   </div>
                 ))}
                 {validation.warnings.map((w, i) => (
                   <div key={i} className="flex items-start gap-2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                     <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                     {w.message}
                   </div>
                 ))}
               </div>
             )}

             {/* Node Routing Analytics Card */}
             {analytics?.nodeStats?.[selectedNodeId] && (
               <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 p-4 rounded-2xl flex items-center justify-around gap-4 text-center shrink-0">
                 <div>
                   <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total Visits</span>
                   <span className="text-sm font-black text-slate-800 dark:text-white">{analytics.nodeStats[selectedNodeId].visits || 0}</span>
                 </div>
                 <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                 <div>
                   <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Drop-Offs</span>
                   <span className={`text-sm font-black ${analytics.nodeStats[selectedNodeId].dropOffs > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                     {analytics.nodeStats[selectedNodeId].dropOffs || 0}
                     {analytics.nodeStats[selectedNodeId].visits > 0 && (
                       <span className="text-[9px] font-bold ml-1">
                         ({Math.round((analytics.nodeStats[selectedNodeId].dropOffs / analytics.nodeStats[selectedNodeId].visits) * 100)}%)
                       </span>
                     )}
                   </span>
                 </div>
               </div>
             )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Basic Details */}
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Node Type</label>
                  <select
                    value={selectedNode.type || "message"}
                    onChange={(e) => updateNode(selectedNodeId, "type", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="message">Message (Text)</option>
                    <option value="button_group">Button Group (Options)</option>
                    <option value="form">Form (Lead/Ticket Collection)</option>
                    <option value="action">Action (Background Execution)</option>
                    <option value="condition">Condition (IF/THEN Logic)</option>
                  </select>
                </div>

                {(selectedNode.type !== "action" && selectedNode.type !== "condition") && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Bot Message</label>
                    <textarea
                      value={selectedNode.message || ""}
                      onChange={(e) => updateNode(selectedNodeId, "message", e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none min-h-[100px]"
                      placeholder="Enter the message the bot will send..."
                    />
                  </div>
                )}

                {selectedNode.type === "action" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Action Logic</label>
                      <select
                        value={selectedNode.actionType || "escalate"}
                        onChange={(e) => updateNode(selectedNodeId, "actionType", e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                      >
                        <option value="escalate">Escalate to Live Agent</option>
                        <option value="create_lead">Create CRM Lead</option>
                        <option value="create_ticket">Create Support Ticket</option>
                        <option value="create_callback_request">Create Callback Request</option>
                      </select>
                    </div>
                    {selectedNode.actionType === "escalate" && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Target Department</label>
                        <input
                          type="text"
                          value={selectedNode.department || ""}
                          onChange={(e) => updateNode(selectedNodeId, "department", e.target.value)}
                          placeholder="e.g. Sales, Technical Support"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Next Node (Success)</label>
                      <input
                        type="text"
                        value={selectedNode.next || ""}
                        onChange={(e) => updateNode(selectedNodeId, "next", e.target.value)}
                        placeholder="ID of the next node..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-600 outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === "condition" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Condition Logic</label>
                      <select
                        value={selectedNode.conditionType || "agents_online"}
                        onChange={(e) => updateNode(selectedNodeId, "conditionType", e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                      >
                        <option value="agents_online">IF Agents are Online</option>
                        <option value="business_open">IF Business Hours Open</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-500">THEN (True) Go To</label>
                      <input
                        type="text"
                        value={selectedNode.trueNext || ""}
                        onChange={(e) => updateNode(selectedNodeId, "trueNext", e.target.value)}
                        placeholder="Node ID..."
                        className="w-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-700/50 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-700 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-rose-500">ELSE (False) Go To</label>
                      <input
                        type="text"
                        value={selectedNode.falseNext || ""}
                        onChange={(e) => updateNode(selectedNodeId, "falseNext", e.target.value)}
                        placeholder="Node ID..."
                        className="w-full bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-700/50 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-700 outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Node Specific Data */}
              <div className="space-y-5">
                
                {/* Form Fields Editor */}
                {selectedNode.type === "form" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 mb-0">Form Fields</label>
                      <button onClick={() => addFormField(selectedNodeId)} className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                        + Add Field
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(selectedNode.fields || []).map((f, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 shadow-sm relative space-y-3">
                          <button onClick={() => removeFormField(selectedNodeId, idx)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                            <Trash size={14} />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3 pr-6">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-slate-400">Label</label>
                              <input 
                                type="text" value={f.label} onChange={(e) => updateFormField(selectedNodeId, idx, "label", e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent" placeholder="e.g. Full Name"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-slate-400">Variable Name</label>
                              <input 
                                type="text" value={f.name} onChange={(e) => updateFormField(selectedNodeId, idx, "name", e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent text-indigo-600 font-mono" placeholder="e.g. full_name"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-bold text-slate-400">Type</label>
                              <select 
                                value={f.type} onChange={(e) => updateFormField(selectedNodeId, idx, "type", e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent"
                              >
                                <option value="text">Short Text</option>
                                <option value="textarea">Long Text</option>
                                <option value="email">Email</option>
                                <option value="number">Number</option>
                                <option value="dropdown">Dropdown</option>
                              </select>
                            </div>
                            <div className="space-y-1 flex items-end pb-1">
                              <label className="text-[10px] font-bold flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={f.required} onChange={(e) => updateFormField(selectedNodeId, idx, "required", e.target.checked)} />
                                Required Field
                              </label>
                            </div>
                          </div>
                          {f.type === "dropdown" && (
                            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                              <label className="text-[9px] uppercase font-bold text-slate-400">Options (Comma Separated)</label>
                              <input 
                                type="text" value={(f.options || []).join(", ")} onChange={(e) => updateFormField(selectedNodeId, idx, "options", e.target.value.split(",").map(s=>s.trim()))}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent" placeholder="Option 1, Option 2"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      {(!selectedNode.fields || selectedNode.fields.length === 0) && (
                        <p className="text-xs text-slate-400 text-center py-4 border-2 border-dashed rounded-xl border-slate-200">No form fields added yet.</p>
                      )}
                    </div>
                    
                    <div className="space-y-1.5 pt-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">After Submit, Go To:</label>
                      <input
                        type="text"
                        value={selectedNode.next || ""}
                        onChange={(e) => updateNode(selectedNodeId, "next", e.target.value)}
                        placeholder="Node ID..."
                        className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-700/50 rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-700 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Routing Options Editor */}
                {(selectedNode.type === "message" || selectedNode.type === "button_group") && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 mb-0">Action Buttons</label>
                      <button onClick={() => addOption(selectedNodeId)} className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                        + Add Button
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(selectedNode.options || []).map((opt, idx) => (
                        <div key={idx} className="flex flex-col gap-2 bg-white dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 relative shadow-sm">
                          <button onClick={() => removeOption(selectedNodeId, idx)} className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-500">
                            <Trash size={14} />
                          </button>
                          <div className="pr-6">
                            <div className="flex items-center justify-between gap-2 mb-2 border-b border-slate-100 dark:border-slate-700 pb-1">
                              <input
                                type="text" value={opt.text} onChange={(e) => updateOption(selectedNodeId, idx, "text", e.target.value)}
                                placeholder="Button Text" className="w-full text-xs font-bold bg-transparent outline-none"
                              />
                              {analytics?.nodeStats?.[selectedNodeId]?.clicks?.[opt.text] !== undefined && (
                                <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap">
                                  🖱️ {analytics.nodeStats[selectedNodeId].clicks[opt.text]} clicks
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase font-bold text-slate-400 whitespace-nowrap">Goes To ➔</span>
                              <input
                                type="text" value={opt.next} onChange={(e) => updateOption(selectedNodeId, idx, "next", e.target.value)}
                                placeholder="Next Node ID" className="w-full text-xs font-bold text-indigo-600 bg-indigo-50 p-1.5 rounded"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!selectedNode.options || selectedNode.options.length === 0) && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">If No Buttons, Next Node:</label>
                          <input
                            type="text"
                            value={selectedNode.next || ""}
                            onChange={(e) => updateNode(selectedNodeId, "next", e.target.value)}
                            placeholder="Node ID (leave blank to end chat)"
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                          />
                          <label className="flex items-center gap-2 mt-4 text-xs font-bold text-slate-600">
                            <input type="checkbox" checked={selectedNode.isSolution} onChange={(e) => updateNode(selectedNodeId, "isSolution", e.target.checked)} />
                            Mark as Solution (Shows Close Chat/Talk to Agent)
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <LayoutTemplate size={48} className="mb-4 opacity-20" />
            <h3 className="text-sm font-black uppercase tracking-widest">No Node Selected</h3>
            <p className="text-xs mt-2 opacity-70">Select a node from the sidebar.</p>
          </div>
        )}
      </div>

      {/* Flow Tree Diagnostic Panel */}
      {showDiagnostics && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowDiagnostics(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                  {validation.isValid ? <ShieldCheck size={16} className="text-emerald-500" /> : <ShieldX size={16} className="text-red-500" />}
                  Flow Tree Validation
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">
                  {validation.errors.length} Errors · {validation.warnings.length} Warnings · {Object.keys(flow.nodes || {}).length} Nodes
                </p>
              </div>
              <button onClick={() => setShowDiagnostics(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Flow Tree View */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Flow Tree</p>
                <div className="space-y-2 font-mono text-xs">
                  {Object.entries(flow.nodes || {}).map(([id, node]) => {
                    const hasError = validation.errors.some(e => e.node === id);
                    const hasWarning = validation.warnings.some(w => w.node === id);
                    return (
                      <div key={id} className={`p-3 rounded-xl border ${ 
                        hasError ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/30"
                        : hasWarning ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30"
                        : "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {hasError ? <AlertCircle size={10} className="text-red-500 shrink-0" />
                            : hasWarning ? <AlertTriangle size={10} className="text-amber-500 shrink-0" />
                            : <Check size={10} className="text-emerald-500 shrink-0" />}
                          <span className={`font-black uppercase text-[11px] ${ hasError ? "text-red-700 dark:text-red-400" : hasWarning ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-200"}`}>
                            {id}
                          </span>
                          <span className="text-[9px] text-slate-400 ml-auto">{node.type}</span>
                        </div>
                        {(node.options || []).map((opt, i) => {
                          const allIds = new Set(Object.keys(flow.nodes || {}));
                          const isLinked = allIds.has(opt.next);
                          return (
                            <div key={i} className="ml-4 flex items-center gap-2 text-[10px] mt-1">
                              <span className="text-slate-400">├─</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{opt.text}</span>
                              <span className="text-slate-400">→</span>
                              <span className={`font-bold ${isLinked ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {opt.next || "—"}
                                {!isLinked && " ⚠ BROKEN"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Error List */}
              {validation.errors.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Errors (must fix to publish)</p>
                  <div className="space-y-1.5">
                    {validation.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-800/30">
                        <AlertCircle size={12} className="shrink-0 mt-0.5" />{e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Warnings</p>
                  <div className="space-y-1.5">
                    {validation.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-800/30">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />{w.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {validation.isValid && (
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={16} /> Flow is valid and ready to publish.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
