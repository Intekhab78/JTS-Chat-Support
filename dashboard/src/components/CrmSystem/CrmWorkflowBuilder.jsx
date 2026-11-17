import React, { useState, useEffect } from "react";
import { Plus, Play, Settings, RefreshCw, GitBranch, Mail, Trash2, Pencil, Power, X, Sparkles } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_updated", label: "Lead Updated" },
  { value: "deal_won", label: "Deal Won" },
  { value: "invoice_overdue", label: "Invoice Overdue" },
  { value: "subscription_renewed", label: "Subscription Renewed" }
];

const TEMPLATES = [
  {
    name: "Lead Follow-up Alert",
    trigger: "lead_created",
    nodes: [
      { id: "node_1", type: "start", config: {}, next: ["node_2"] },
      { id: "node_2", type: "condition", config: { field: "pipelineStage", operator: "equals", value: "new" }, next: ["node_3"] },
      { id: "node_3", type: "action", config: { actionType: "send_email", emailSubject: "Follow up with new Lead" }, next: ["node_4"] },
      { id: "node_4", type: "end", config: {}, next: [] }
    ]
  },
  {
    name: "Billing Renewal Notice",
    trigger: "subscription_renewed",
    nodes: [
      { id: "node_1", type: "start", config: {}, next: ["node_2"] },
      { id: "node_2", type: "action", config: { actionType: "send_email", emailSubject: "Subscription Renewal Notice" }, next: ["node_3"] },
      { id: "node_3", type: "end", config: {}, next: [] }
    ]
  }
];

export default function CrmWorkflowBuilder({ websiteId }) {
  const toast = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowTrigger, setWorkflowTrigger] = useState("lead_created");
  const [nodes, setNodes] = useState([]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/workflows?websiteId=${websiteId}`);
      setWorkflows(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [websiteId]);

  const resetForm = () => {
    setEditingId(null);
    setWorkflowName("");
    setWorkflowTrigger("lead_created");
    setNodes([]);
  };

  const loadTemplate = (tpl) => {
    setEditingId(null);
    setWorkflowName(tpl.name);
    setWorkflowTrigger(tpl.trigger);
    setNodes(tpl.nodes.map(n => ({ ...n, config: { ...(n.config || {}) }, next: [...(n.next || [])] })));
  };

  const loadWorkflowForEdit = (w) => {
    setEditingId(w._id);
    setWorkflowName(w.name || "");
    setWorkflowTrigger(w.trigger || "lead_created");
    setNodes((w.nodes || []).map(n => ({ ...n, config: { ...(n.config || {}) }, next: [...(n.next || [])] })));
  };

  const handleAddNewNode = (type) => {
    const newId = `node_${Date.now().toString().slice(-5)}`;
    const newNode = {
      id: newId,
      type,
      config:
        type === "condition"
          ? { field: "pipelineStage", operator: "equals", value: "new" }
          : type === "action"
          ? { actionType: "send_email", emailSubject: "" }
          : {},
      next: []
    };

    if (nodes.length > 0) {
      const updated = nodes.map((n, idx) =>
        idx === nodes.length - 1 ? { ...n, next: [...(n.next || []), newId] } : n
      );
      setNodes([...updated, newNode]);
    } else {
      setNodes([newNode]);
    }
  };

  const updateNodeConfig = (nodeId, key, val) => {
    setNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, config: { ...(n.config || {}), [key]: val } } : n))
    );
  };

  const removeNode = (nodeId) => {
    setNodes(prev =>
      prev
        .filter(n => n.id !== nodeId)
        .map(n => ({ ...n, next: (n.next || []).filter(id => id !== nodeId) }))
    );
  };

  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    if (!workflowName.trim()) return;
    setSaving(true);

    try {
      const payload = {
        name: workflowName.trim(),
        trigger: workflowTrigger,
        nodes: nodes.length > 0 ? nodes : [{ id: "start", type: "start", config: {}, next: [] }],
        websiteId
      };

      if (editingId) {
        await api(`/api/crm/workflows/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Workflow rule updated");
      } else {
        await api(`/api/crm/workflows`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Workflow rule saved");
      }

      resetForm();
      fetchWorkflows();
    } catch (err) {
      toast.error(err.message || "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (w) => {
    try {
      await api(`/api/crm/workflows/${w._id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !w.isActive })
      });
      toast.success(`Workflow ${!w.isActive ? "activated" : "paused"}`);
      fetchWorkflows();
    } catch (err) {
      toast.error(err.message || "Failed to update workflow");
    }
  };

  const handleTriggerManually = async (w) => {
    try {
      await api(`/api/crm/workflows/trigger/${w._id}`, { method: "POST" });
      toast.success(`Executed "${w.name}"`);
    } catch (err) {
      toast.error(err.message || "Execution failed");
    }
  };

  const handleDeleteWorkflow = async (id) => {
    try {
      await api(`/api/crm/workflows/${id}`, { method: "DELETE" });
      if (editingId === id) resetForm();
      toast.success("Workflow deleted");
      fetchWorkflows();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <GitBranch size={15} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Visual Automation Workflows</h3>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
              No-code trigger, condition & action rules
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase">
            {workflows.length} Rule{workflows.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={fetchWorkflows}
            className="h-7 w-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center cursor-pointer"
            title="Refresh Workflows"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Creator / Editor Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
              {editingId ? "Edit Workflow Rule" : "Create Workflow Rule"}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[9px] font-extrabold text-slate-500 hover:text-slate-800 uppercase flex items-center gap-1 cursor-pointer"
              >
                <X size={11} /> Cancel Edit
              </button>
            )}
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 flex flex-wrap gap-1.5 items-center">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 flex items-center gap-1 mr-1">
              <Sparkles size={10} className="text-indigo-500" /> Quick Start:
            </span>
            {TEMPLATES.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loadTemplate(t)}
                className="py-1 px-2.5 bg-white border border-slate-200 hover:border-indigo-300 text-[9.5px] font-bold uppercase text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                {t.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveWorkflow} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Workflow Name</label>
                <input
                  required
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full h-8 bg-slate-50 border border-slate-200 px-3 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400"
                  placeholder="e.g. Lead Engagement Alert"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Event Trigger</label>
                <select
                  value={workflowTrigger}
                  onChange={(e) => setWorkflowTrigger(e.target.value)}
                  className="w-full h-8 bg-slate-50 border border-slate-200 px-2.5 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 cursor-pointer"
                >
                  {TRIGGER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Flow Nodes Constructor */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Flow Nodes Constructor</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddNewNode("condition")}
                  className="h-7 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[9.5px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <GitBranch size={11} /> + Condition
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewNode("action")}
                  className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[9.5px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Mail size={11} /> + Action
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewNode("end")}
                  className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9.5px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={11} /> End Node
                </button>
              </div>
            </div>

            {/* Editable Nodes Canvas */}
            {nodes.length > 0 && (
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 max-h-[240px] overflow-y-auto">
                {nodes.map((node, idx) => (
                  <div key={node.id} className="p-2.5 bg-white border border-slate-200/80 rounded-lg shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-extrabold text-slate-400">#{idx + 1}</span>
                        <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          node.type === "condition" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          node.type === "action" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {node.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNode(node.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Remove node"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {node.type === "condition" && (
                      <div className="grid grid-cols-3 gap-1.5">
                        <input
                          value={node.config?.field || ""}
                          onChange={(e) => updateNodeConfig(node.id, "field", e.target.value)}
                          placeholder="Field"
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-semibold outline-none"
                        />
                        <select
                          value={node.config?.operator || "equals"}
                          onChange={(e) => updateNodeConfig(node.id, "operator", e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-semibold outline-none"
                        >
                          <option value="equals">equals</option>
                          <option value="not_equals">not equals</option>
                          <option value="contains">contains</option>
                        </select>
                        <input
                          value={node.config?.value || ""}
                          onChange={(e) => updateNodeConfig(node.id, "value", e.target.value)}
                          placeholder="Value"
                          className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-semibold outline-none"
                        />
                      </div>
                    )}

                    {node.type === "action" && (
                      <div className="grid grid-cols-3 gap-1.5">
                        <select
                          value={node.config?.actionType || "send_email"}
                          onChange={(e) => updateNodeConfig(node.id, "actionType", e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[10px] font-semibold outline-none"
                        >
                          <option value="send_email">Send Email</option>
                          <option value="create_task">Create Task</option>
                          <option value="webhook">Webhook</option>
                        </select>
                        <input
                          value={node.config?.actionType === "webhook" ? (node.config?.webhookUrl || "") : (node.config?.emailSubject || "")}
                          onChange={(e) => updateNodeConfig(node.id, node.config?.actionType === "webhook" ? "webhookUrl" : "emailSubject", e.target.value)}
                          placeholder={node.config?.actionType === "webhook" ? "https://..." : "Subject / Task title"}
                          className="col-span-2 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-semibold outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
            >
              {saving ? "Saving…" : editingId ? "Update Workflow Rule" : "Save Workflow Rule"}
            </button>
          </form>
        </div>

        {/* Right Configured Rules Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider border-b pb-2.5 border-slate-100 flex items-center gap-1.5">
            <Settings size={13} className="text-indigo-500" /> Configured Automation Rules
          </h4>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => <div key={n} className="h-14 bg-slate-50 rounded-xl animate-pulse" />)}
            </div>
          ) : workflows.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-[10px] font-bold uppercase tracking-wider">No configured workflows yet</p>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
              {workflows.map(w => (
                <div key={w._id} className="p-3 border border-slate-200/80 rounded-xl flex justify-between items-center gap-2 hover:border-indigo-200 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h5 className="text-[11px] font-extrabold text-slate-900 truncate">{w.name}</h5>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase shrink-0 ${
                        w.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {w.isActive ? "active" : "paused"}
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">
                      Trigger: {w.trigger} • {w.nodes?.length || 0} Nodes
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTriggerManually(w)}
                      className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center cursor-pointer"
                      title="Run Now"
                    >
                      <Play size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(w)}
                      className="w-6 h-6 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                      title={w.isActive ? "Pause Rule" : "Activate Rule"}
                    >
                      <Power size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => loadWorkflowForEdit(w)}
                      className="w-6 h-6 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center cursor-pointer"
                      title="Edit Rule"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWorkflow(w._id)}
                      className="w-6 h-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
