import React, { useState } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import {
  MessageSquare,
  ListTree,
  FileText,
  Zap,
  Network,
  Clock,
  Globe,
  Bot,
  Plus,
  Search,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  Flag,
  Code
} from "lucide-react";

const PALETTE_CATEGORIES = [
  {
    category: "Conversation",
    items: [
      { type: "message", label: "Message", description: "Text reply with buttons", icon: MessageSquare, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
      { type: "button_group", label: "Button Group", description: "Choice menu options", icon: ListTree, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" }
    ]
  },
  {
    category: "Data Collection",
    items: [
      { type: "form", label: "Form Collection", description: "Collect lead & ticket inputs", icon: FileText, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" }
    ]
  },
  {
    category: "Logic",
    items: [
      { type: "condition", label: "Condition", description: "IF / THEN rules branching", icon: Network, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40" },
      { type: "delay", label: "Delay Timer", description: "Pause flow seconds", icon: Clock, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40" }
    ]
  },
  {
    category: "Automation",
    items: [
      { type: "action", label: "Action Logic", description: "Escalate or sync CRM lead", icon: Zap, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
      { type: "webhook", label: "Webhook", description: "Trigger external HTTP endpoint", icon: Globe, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" },
      { type: "api_request", label: "API Request", description: "Custom REST payload call", icon: Code, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40" }
    ]
  },
  {
    category: "AI",
    items: [
      { type: "ai_response", label: "AI Agent", description: "LLM knowledge base answer", icon: Bot, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/40" }
    ]
  },
  {
    category: "Ending",
    items: [
      { type: "end", label: "End Flow", description: "Terminate conversation branch", icon: Flag, color: "text-slate-500 bg-slate-100 dark:bg-slate-800" }
    ]
  }
];

export function NodeSidebar() {
  const [activeTab, setActiveTab] = useState("nodes"); // "nodes" | "palette"
  const [search, setSearch] = useState("");

  const nodes = useFlowStore((s) => s.nodes);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const addNode = useFlowStore((s) => s.addNode);
  const setShowDiagnostics = useFlowStore((s) => s.setShowDiagnostics);
  const validation = useFlowStore((s) => s.validation);

  const filteredNodes = nodes.filter(
    (n) =>
      n.id.toLowerCase().includes(search.toLowerCase()) ||
      (n.data.type || "").toLowerCase().includes(search.toLowerCase()) ||
      (n.data.message || "").toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-80 border-r border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col h-full overflow-hidden select-none font-sans">
      {/* Header Tabs */}
      <div className="p-3 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl w-full">
          <button
            onClick={() => setActiveTab("nodes")}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "nodes"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Active Graph ({nodes.length})
          </button>
          <button
            onClick={() => setActiveTab("palette")}
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "palette"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Node Library
          </button>
        </div>

        {/* Validation Shield Badge */}
        <button
          onClick={() => setShowDiagnostics(true)}
          title={validation.isValid ? "Flow Valid" : `${validation.errors.length} Errors`}
          className={`p-2 rounded-xl transition-all shrink-0 ${
            validation.isValid
              ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-400 animate-pulse"
          }`}
        >
          {validation.isValid ? <ShieldCheck size={16} /> : <ShieldX size={16} />}
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-200/80 dark:border-white/10">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search node library or canvas graph..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-medium shadow-xs"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === "nodes" && (
          <div className="space-y-1.5">
            {filteredNodes.map((node) => {
              const id = node.id;
              const hasError = validation.errors.some((e) => e.node === id);
              const hasWarning = validation.warnings.some((w) => w.node === id);
              const isSelected = selectedNodeId === id;

              return (
                <div
                  key={id}
                  onClick={() => setSelectedNodeId(id)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {node.data.type}
                    </span>
                    <span className="text-xs truncate font-bold">{id}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {hasError && <AlertCircle size={14} className="text-red-500" />}
                    {!hasError && hasWarning && <AlertTriangle size={14} className="text-amber-500" />}
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "palette" && (
          <div className="space-y-4">
            {PALETTE_CATEGORIES.map((cat) => (
              <div key={cat.category} className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                  {cat.category}
                </div>
                <div className="space-y-1.5">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, item.type)}
                        onClick={() => addNode(item.type)}
                        className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${item.color}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                              {item.label}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {item.description}
                            </div>
                          </div>
                        </div>
                        <Plus size={14} className="text-slate-400 group-hover:text-indigo-600 transition-all" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
