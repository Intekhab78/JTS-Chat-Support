import React, { useState, useEffect } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import {
  Trash,
  Plus,
  Edit2,
  Check,
  Network,
  AlertCircle,
  AlertTriangle,
  Settings2,
  ShieldAlert,
  BarChart3,
  Eye,
  TrendingDown,
  CheckCircle2,
  MousePointerClick,
  History,
  Sliders,
  Sparkles
} from "lucide-react";

export function NodeInspector() {
  const [activeTab, setActiveTab] = useState("properties"); // "properties" | "logic" | "validation" | "analytics" | "history"

  const nodes = useFlowStore((s) => s.nodes);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const renameNodeId = useFlowStore((s) => s.renameNodeId);
  const addOptionToNode = useFlowStore((s) => s.addOptionToNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const validation = useFlowStore((s) => s.validation);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeData = selectedNode?.data || {};

  const [isEditingId, setIsEditingId] = useState(false);
  const [tempId, setTempId] = useState(selectedNodeId || "");

  useEffect(() => {
    setTempId(selectedNodeId || "");
    setIsEditingId(false);
  }, [selectedNodeId]);

  if (!selectedNode) {
    return (
      <div className="w-96 border-l border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 p-6 flex flex-col items-center justify-center text-slate-400 text-center select-none font-sans">
        <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/60 mb-3 shadow-xs">
          <Network size={36} className="opacity-30" />
        </div>
        <p className="text-xs uppercase font-black tracking-widest text-slate-500">No Node Selected</p>
        <p className="text-[11px] opacity-70 mt-1 max-w-xs leading-relaxed">Select any node card on the visual canvas grid or left sidebar to configure its properties & logic.</p>
      </div>
    );
  }

  const allNodeIds = nodes.map((n) => n.id);
  const nodeErrors = validation.errors.filter((e) => e.node === selectedNodeId);
  const nodeWarnings = validation.warnings.filter((w) => w.node === selectedNodeId);

  const stats = useFlowStore.getState().analytics?.nodeStats?.[selectedNodeId];
  const visits = stats?.visits || 0;
  const dropOffs = stats?.dropOffs || 0;
  const completions = visits > 0 ? visits - dropOffs : 0;
  const completionRate = visits > 0 ? Math.round((completions / visits) * 100) : 100;

  const handleRenameSubmit = () => {
    if (tempId && tempId !== selectedNodeId) {
      renameNodeId(selectedNodeId, tempId.trim());
    }
    setIsEditingId(false);
  };

  const NodeSelectorDropdown = ({ value, onChange, placeholder = "Select target node..." }) => (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500"
    >
      <option value="">-- {placeholder} --</option>
      {allNodeIds.map((id) => (
        <option key={id} value={id}>
          {id} ({nodes.find((n) => n.id === id)?.data.type || "node"})
        </option>
      ))}
    </select>
  );

  return (
    <div className="w-96 border-l border-slate-200/80 dark:border-white/5 bg-white dark:bg-slate-950 flex flex-col h-full overflow-hidden select-none font-sans">
      {/* Inspector Header */}
      <div className="p-4 border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          {isEditingId && selectedNodeId !== "root" ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempId}
                onChange={(e) => setTempId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                }}
                onBlur={handleRenameSubmit}
                className="bg-slate-100 dark:bg-slate-800 text-xs font-black px-2 py-1 rounded-lg outline-none text-slate-800 dark:text-white"
                autoFocus
              />
              <button onClick={handleRenameSubmit} className="p-1 bg-indigo-600 text-white rounded-md">
                <Check size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm truncate">
                {selectedNodeId}
              </h3>
              {selectedNodeId !== "root" && (
                <button
                  onClick={() => setIsEditingId(true)}
                  className="text-slate-400 hover:text-indigo-600 p-1"
                  title="Rename Node ID"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={nodeData.type || "message"}
            onChange={(e) => updateNodeData(selectedNodeId, { type: e.target.value })}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 outline-none cursor-pointer"
          >
            <option value="message">MESSAGE</option>
            <option value="button_group">BUTTON GROUP</option>
            <option value="form">FORM</option>
            <option value="action">ACTION</option>
            <option value="condition">CONDITION</option>
            <option value="delay">DELAY</option>
            <option value="webhook">WEBHOOK</option>
            <option value="ai_response">AI AGENT</option>
          </select>
          {selectedNodeId !== "root" && (
            <button
              onClick={() => deleteNode(selectedNodeId)}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
              title="Delete Node"
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation Bar (Properties, Logic, Validation, Analytics, History) */}
      <div className="flex border-b border-slate-200/80 dark:border-white/5 bg-slate-50/60 dark:bg-slate-900/60 p-1.5 gap-1">
        <button
          onClick={() => setActiveTab("properties")}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "properties"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Settings2 size={12} /> Props
        </button>
        <button
          onClick={() => setActiveTab("logic")}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "logic"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Sliders size={12} /> Logic
        </button>
        <button
          onClick={() => setActiveTab("validation")}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "validation"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <ShieldAlert size={12} />
          {nodeErrors.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "analytics"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <BarChart3 size={12} /> Stats
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === "history"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <History size={12} /> History
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Properties Tab */}
        {activeTab === "properties" && (
          <div className="space-y-4">
            {/* Bot Message Text */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Bot Reply Message
              </label>
              <textarea
                value={nodeData.message || ""}
                onChange={(e) => updateNodeData(selectedNodeId, { message: e.target.value })}
                placeholder="Enter bot message text..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Next Transition if no options */}
            {(!nodeData.options || nodeData.options.length === 0) && nodeData.type !== "condition" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Default Next Node
                </label>
                <NodeSelectorDropdown
                  value={nodeData.next}
                  onChange={(val) => updateNodeData(selectedNodeId, { next: val })}
                />
              </div>
            )}

            {/* Quick Reply Buttons Section */}
            {(nodeData.type === "message" || nodeData.type === "button_group") && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Quick Reply Buttons ({nodeData.options?.length || 0})
                  </label>
                  <button
                    onClick={() => addOptionToNode(selectedNodeId)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Button
                  </button>
                </div>

                <div className="space-y-3">
                  {(nodeData.options || []).map((opt, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Button #{idx + 1}</span>
                        <button
                          onClick={() => {
                            const newOpts = nodeData.options.filter((_, i) => i !== idx);
                            updateNodeData(selectedNodeId, { options: newOpts });
                          }}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash size={12} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={opt.text || ""}
                        onChange={(e) => {
                          const newOpts = [...nodeData.options];
                          newOpts[idx].text = e.target.value;
                          updateNodeData(selectedNodeId, { options: newOpts });
                        }}
                        placeholder="Button Label Text..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      />

                      <NodeSelectorDropdown
                        value={opt.next}
                        onChange={(val) => {
                          const newOpts = [...nodeData.options];
                          newOpts[idx].next = val;
                          updateNodeData(selectedNodeId, { options: newOpts });
                        }}
                        placeholder="Target Node..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Fields Section */}
            {nodeData.type === "form" && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Form Input Fields ({nodeData.fields?.length || 0})
                  </label>
                  <button
                    onClick={() => {
                      const fields = nodeData.fields ? [...nodeData.fields] : [];
                      fields.push({ name: `field_${fields.length + 1}`, type: "text", label: "New Input", required: true });
                      updateNodeData(selectedNodeId, { fields });
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {(nodeData.fields || []).map((f, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Field #{idx + 1}</span>
                        <button
                          onClick={() => {
                            const newFields = nodeData.fields.filter((_, i) => i !== idx);
                            updateNodeData(selectedNodeId, { fields: newFields });
                          }}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash size={12} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={f.label || ""}
                        onChange={(e) => {
                          const newFields = [...nodeData.fields];
                          newFields[idx].label = e.target.value;
                          newFields[idx].name = e.target.value.toLowerCase().replace(/\s+/g, "_");
                          updateNodeData(selectedNodeId, { fields: newFields });
                        }}
                        placeholder="Field Label (e.g. Work Email)..."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      />

                      <select
                        value={f.type || "text"}
                        onChange={(e) => {
                          const newFields = [...nodeData.fields];
                          newFields[idx].type = e.target.value;
                          updateNodeData(selectedNodeId, { fields: newFields });
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none"
                      >
                        <option value="text">Short Text</option>
                        <option value="email">Email Address</option>
                        <option value="number">Phone / Number</option>
                        <option value="textarea">Long Textarea</option>
                        <option value="dropdown">Dropdown Select</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    After Submit Go To Node
                  </label>
                  <NodeSelectorDropdown
                    value={nodeData.next}
                    onChange={(val) => updateNodeData(selectedNodeId, { next: val })}
                    placeholder="Select next node..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logic Tab */}
        {activeTab === "logic" && (
          <div className="space-y-4">
            {/* Condition Settings */}
            {nodeData.type === "condition" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Condition Rule Type
                  </label>
                  <select
                    value={nodeData.conditionType || "agents_online"}
                    onChange={(e) => updateNodeData(selectedNodeId, { conditionType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="agents_online">IF Live Agents Online</option>
                    <option value="business_open">IF Business Hours Open</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    IF TRUE Target Node
                  </label>
                  <NodeSelectorDropdown
                    value={nodeData.trueNext}
                    onChange={(val) => updateNodeData(selectedNodeId, { trueNext: val })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                    ELSE (FALSE) Target Node
                  </label>
                  <NodeSelectorDropdown
                    value={nodeData.falseNext}
                    onChange={(val) => updateNodeData(selectedNodeId, { falseNext: val })}
                  />
                </div>
              </div>
            )}

            {/* Action Settings */}
            {nodeData.type === "action" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Action Execution Type
                  </label>
                  <select
                    value={nodeData.actionType || "escalate"}
                    onChange={(e) => updateNodeData(selectedNodeId, { actionType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="escalate">Escalate to Live Agent</option>
                    <option value="create_lead">Create CRM Lead</option>
                    <option value="create_ticket">Create Support Ticket</option>
                    <option value="create_callback_request">Schedule Phone Callback</option>
                  </select>
                </div>

                {nodeData.actionType === "escalate" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Target Department
                    </label>
                    <input
                      type="text"
                      value={nodeData.department || ""}
                      onChange={(e) => updateNodeData(selectedNodeId, { department: e.target.value })}
                      placeholder="Department (e.g. Technical Support)..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === "validation" && (
          <div className="space-y-3">
            {nodeErrors.length === 0 && nodeWarnings.length === 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> Node logic is 100% valid and healthy.
              </div>
            )}

            {nodeErrors.map((err, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-semibold space-y-1">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                  <AlertCircle size={14} /> Critical Error
                </div>
                <p>{err.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <Eye size={12} className="text-indigo-500" /> Impressions
                </div>
                <div className="text-base font-black text-slate-800 dark:text-white mt-1">{visits}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Completion
                </div>
                <div className="text-base font-black text-slate-800 dark:text-white mt-1">{completionRate}%</div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 font-medium space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
              <History size={14} className="text-indigo-500" /> Revision Stack Active
            </div>
            <p className="text-[11px] leading-relaxed">All edits to [{selectedNodeId}] are tracked in the 25-step Undo history stack. Use Ctrl+Z to undo changes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
