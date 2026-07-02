import React, { useState, useEffect } from "react";
import { Plus, Check, Play, Settings, RefreshCw, GitBranch, Mail, Globe } from "lucide-react";
import { api } from "../../api/client.js";

const TEMPLATES = [
  {
    name: "Lead Follow-up Alert",
    trigger: "lead_created",
    nodes: [
      { id: "node_1", type: "start", config: {}, next: ["node_2"] },
      { id: "node_2", type: "condition", config: { field: "pipelineStage", operator: "equals", value: "new" }, next: ["node_3", "node_4"] },
      { id: "node_3", type: "action", config: { actionType: "send_email", emailSubject: "Follow up with new Lead" }, next: ["node_5"] },
      { id: "node_4", type: "action", config: { actionType: "webhook", webhookUrl: "https://api.externalcrm.com/alert" }, next: ["node_5"] },
      { id: "node_5", type: "end", config: {}, next: [] }
    ]
  },
  {
    name: "Billing Renewal Notice",
    trigger: "subscription_renewed",
    nodes: [
      { id: "node_1", type: "start", config: {}, next: ["node_2"] },
      { id: "node_2", type: "action", config: { actionType: "send_email", emailSubject: "Your Subscription Renewed Successfully!" }, next: ["node_3"] },
      { id: "node_3", type: "end", config: {}, next: [] }
    ]
  }
];

export default function CrmWorkflowBuilder({ websiteId }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkflow, setActiveWorkflow] = useState(null);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowTrigger, setWorkflowTrigger] = useState("lead_created");
  const [nodes, setNodes] = useState([]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/workflows?websiteId=${websiteId}`);
      setWorkflows(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [websiteId]);

  const loadTemplate = (tpl) => {
    setWorkflowName(tpl.name);
    setWorkflowTrigger(tpl.trigger);
    setNodes(tpl.nodes);
  };

  const handleAddNewNode = (type) => {
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type,
      config: type === "condition" ? { field: "pipelineStage", operator: "equals", value: "new" } :
              type === "action" ? { actionType: "send_email", emailSubject: "Custom Automation Alert" } : {},
      next: []
    };
    
    // Link previous last node next property
    if (nodes.length > 0) {
      const updatedNodes = [...nodes];
      updatedNodes[updatedNodes.length - 1].next.push(newId);
      setNodes([...updatedNodes, newNode]);
    } else {
      setNodes([newNode]);
    }
  };

  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    if (!workflowName.trim()) return;

    try {
      const payload = {
        name: workflowName,
        trigger: workflowTrigger,
        nodes: nodes.length > 0 ? nodes : [{ id: "start", type: "start", next: [] }],
        websiteId
      };

      await api(`/api/crm/workflows`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setWorkflowName("");
      setNodes([]);
      alert("Workflow automation rule saved successfully!");
      fetchWorkflows();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Visual Automation Workflows</h3>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">No-Code Logic Editor</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Create Workflow Rule</h4>
          
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
            <span className="text-[9px] font-black uppercase text-slate-400 mr-2">Use Template:</span>
            {TEMPLATES.map((t, idx) => (
              <button
                key={idx}
                onClick={() => loadTemplate(t)}
                className="py-1.5 px-3 bg-white border hover:bg-slate-50 text-[9px] font-black uppercase text-slate-600 rounded-xl"
              >
                {t.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleSaveWorkflow} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Workflow Name</label>
                <input required value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" placeholder="e.g. Lead Engagement Alert" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Event Trigger</label>
                <select value={workflowTrigger} onChange={(e) => setWorkflowTrigger(e.target.value)} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="lead_created">Lead Created</option>
                  <option value="lead_updated">Lead Updated</option>
                  <option value="subscription_renewed">Subscription Renewed</option>
                </select>
              </div>
            </div>

            {/* Node Creator Actions */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Flow Nodes Constructor</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => handleAddNewNode("condition")} className="py-2 px-4 bg-amber-50 text-amber-600 border border-amber-200/50 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5"><GitBranch size={12} /> + Condition Node</button>
                <button type="button" onClick={() => handleAddNewNode("action")} className="py-2 px-4 bg-indigo-50 text-indigo-600 border border-indigo-200/50 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5"><Mail size={12} /> + Action Node</button>
                <button type="button" onClick={() => handleAddNewNode("end")} className="py-2 px-4 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5"> + End Node</button>
              </div>
            </div>

            {/* Nodes visualization */}
            {nodes.length > 0 && (
              <div className="p-6 bg-slate-50 rounded-2xl space-y-4 max-h-[300px] overflow-y-auto">
                {nodes.map((node, idx) => (
                  <div key={node.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded mr-2">{node.type}</span>
                      <span className="text-xs font-black text-slate-800">{node.id}</span>
                      {node.type === "condition" && <p className="text-[10px] text-slate-400 mt-1 font-bold">Check if "{node.config?.field}" {node.config?.operator} "{node.config?.value}"</p>}
                      {node.type === "action" && <p className="text-[10px] text-slate-400 mt-1 font-bold">Action type: {node.config?.actionType} ({node.config?.emailSubject || node.config?.webhookUrl})</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-indigo-100 transition-all">Save Workflow Rule</button>
          </form>
        </div>

        {/* Right Active Workflows list */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><Settings size={14} className="text-indigo-500" /> Configured Automation Rules</h4>
          {loading ? (
            <p className="text-center py-6 text-slate-400 text-xs font-bold">Loading...</p>
          ) : workflows.length === 0 ? (
            <p className="text-center py-10 text-slate-400 text-[10px] font-black uppercase tracking-wider">No active workflows</p>
          ) : (
            <div className="space-y-3">
              {workflows.map(w => (
                <div key={w._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                  <div>
                    <h5 className="text-xs font-black text-slate-800">{w.name}</h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Trigger: {w.trigger} • Nodes: {w.nodes?.length || 0}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${w.isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{w.isActive ? "active" : "inactive"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
