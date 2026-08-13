import { useState, useEffect } from "react";
import {
  GitFork, Plus, Save, Trash2, Play, Sparkles, MessageSquare,
  HelpCircle, Ticket, UserCheck, ArrowRight, Check, X, RefreshCw
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export default function VisualFlowBuilder({ websiteId }) {
  const toast = useToast();
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [flowName, setFlowName] = useState("");
  const [triggerKeyword, setTriggerKeyword] = useState("hello");

  useEffect(() => {
    loadFlows();
  }, [websiteId]);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const data = await api(`/api/flows?websiteId=${websiteId || ""}`);
      setFlows(Array.isArray(data) ? data : []);
      if (data && data.length > 0) {
        selectFlow(data[0]);
      } else {
        createNewFlowState();
      }
    } catch (err) {
      console.error("Failed to load flows:", err);
    } finally {
      setLoading(false);
    }
  };

  const createNewFlowState = () => {
    setSelectedFlow(null);
    setFlowName("New Chatbot Automation Flow");
    setTriggerKeyword("hello");
    setNodes([
      {
        id: "node-start",
        type: "trigger",
        title: "⚡ Live Chat Start Trigger",
        content: "Triggered when user opens the widget",
        position: { x: 50, y: 100 },
        options: [{ label: "Proceed to Greeting", targetNodeId: "node-q1" }]
      },
      {
        id: "node-q1",
        type: "question",
        title: "❓ Service Inquiry Question",
        content: "Welcome to JTS Support! How can we assist your business today?",
        position: { x: 350, y: 100 },
        options: [
          { label: "Book ERP Consultation", targetNodeId: "node-action-sales" },
          { label: "Raise Support Ticket", targetNodeId: "node-action-ticket" }
        ]
      },
      {
        id: "node-action-ticket",
        type: "ticket_action",
        title: "🎫 Auto-Create SLA Support Ticket",
        content: "Automatically logs a ticket for urgent resolution",
        position: { x: 680, y: 180 },
        options: []
      }
    ]);
  };

  const selectFlow = (flow) => {
    setSelectedFlow(flow);
    setFlowName(flow.name);
    setTriggerKeyword(flow.triggerKeyword || "hello");
    setNodes(flow.nodes || []);
  };

  const handleSave = async () => {
    if (!flowName.trim()) {
      toast.error("Flow name is required");
      return;
    }

    try {
      const payload = {
        websiteId,
        name: flowName,
        triggerKeyword,
        nodes
      };

      if (selectedFlow?._id) {
        const updated = await api(`/api/flows/${selectedFlow._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Chatbot Flow saved successfully!");
        setSelectedFlow(updated);
      } else {
        const created = await api("/api/flows", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("New Chatbot Flow created!");
        setSelectedFlow(created);
      }
      loadFlows();
    } catch (err) {
      toast.error("Failed to save flow: " + err.message);
    }
  };

  const addNode = (type) => {
    const newId = `node-${Date.now()}`;
    const titles = {
      question: "❓ Decision Question",
      options: "🔘 Button Choice Group",
      ticket_action: "🎫 Auto Ticket Action",
      transfer_agent: "👤 Transfer to Agent"
    };

    const newNode = {
      id: newId,
      type,
      title: titles[type] || "New Node",
      content: type === "question" ? "Enter your bot question here..." : "Automated action executed.",
      position: { x: 200 + nodes.length * 50, y: 150 },
      options: type === "question" || type === "options" ? [{ label: "Option 1", targetNodeId: "" }] : []
    };

    setNodes([...nodes, newNode]);
  };

  const updateNodeContent = (id, field, value) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const addOptionToNode = (nodeId) => {
    setNodes(nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          options: [...(n.options || []), { label: `Option ${(n.options?.length || 0) + 1}`, targetNodeId: "" }]
        };
      }
      return n;
    }));
  };

  const deleteNode = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              🎨 NON-CODER VISUAL CANVAS
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Visual Chatbot Decision Tree Builder</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={createNewFlowState}
            className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Flow
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
          >
            <Save size={16} /> Save Canvas Flow
          </button>
        </div>
      </div>

      {/* Flow Settings Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
        <label className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flow Title</span>
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500"
            placeholder="e.g. Lead Qualification Chatbot"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trigger Keyword</span>
          <input
            type="text"
            value={triggerKeyword}
            onChange={(e) => setTriggerKeyword(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500"
            placeholder="e.g. hello, support, pricing"
          />
        </label>
      </div>

      {/* Node Palette Tools */}
      <div className="flex items-center gap-3 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Add Decision Node:</span>
        <button
          onClick={() => addNode("question")}
          className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
        >
          <HelpCircle size={14} /> Question Node
        </button>
        <button
          onClick={() => addNode("ticket_action")}
          className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
        >
          <Ticket size={14} /> Auto Ticket Node
        </button>
        <button
          onClick={() => addNode("transfer_agent")}
          className="px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
        >
          <UserCheck size={14} /> Transfer Agent Node
        </button>
      </div>

      {/* VISUAL CANVAS GRID */}
      <div className="min-h-[500px] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] bg-slate-100/60 rounded-[36px] border border-slate-200/80 p-8 overflow-x-auto">
        <div className="flex items-start gap-8 min-w-max pb-8">
          {nodes.map((node, index) => (
            <div
              key={node.id}
              className={`w-80 rounded-[32px] bg-white border shadow-xl p-6 space-y-4 relative animate-in zoom-in-95 duration-300 ${
                node.type === "trigger"
                  ? "border-indigo-400 ring-4 ring-indigo-50"
                  : node.type === "ticket_action"
                  ? "border-emerald-400 ring-4 ring-emerald-50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Step #{index + 1}</span>
                {node.type !== "trigger" && (
                  <button onClick={() => deleteNode(node.id)} className="text-slate-300 hover:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={node.title}
                  onChange={(e) => updateNodeContent(node.id, "title", e.target.value)}
                  className="w-full font-black text-sm text-slate-900 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                />

                <textarea
                  value={node.content}
                  onChange={(e) => updateNodeContent(node.id, "content", e.target.value)}
                  rows={3}
                  className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:border-indigo-500 resize-none"
                  placeholder="Bot message / instructions..."
                />
              </div>

              {/* Options & Connections */}
              {(node.type === "question" || node.type === "trigger" || node.type === "options") && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connect Options:</span>
                    <button
                      onClick={() => addOptionToNode(node.id)}
                      className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                    >
                      + Add Option
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(node.options || []).map((opt, optIdx) => (
                      <div key={optIdx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const newOpts = [...node.options];
                            newOpts[optIdx].label = e.target.value;
                            updateNodeContent(node.id, "options", newOpts);
                          }}
                          className="w-full text-xs font-black text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none"
                          placeholder="Option Button Label"
                        />
                        <select
                          value={opt.targetNodeId || ""}
                          onChange={(e) => {
                            const newOpts = [...node.options];
                            newOpts[optIdx].targetNodeId = e.target.value;
                            updateNodeContent(node.id, "options", newOpts);
                          }}
                          className="w-full text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                        >
                          <option value="">Select Next Connected Node...</option>
                          {nodes.filter(n => n.id !== node.id).map(n => (
                            <option key={n.id} value={n.id}>{n.title}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connecting Arrow */}
              {index < nodes.length - 1 && (
                <div className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 text-white items-center justify-center shadow-md z-10">
                  <ArrowRight size={12} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
