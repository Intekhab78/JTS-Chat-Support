import React, { useState, useEffect, useMemo } from "react";
import {
  GitFork, Plus, Save, Trash2, Play, Sparkles, MessageSquare,
  HelpCircle, Ticket, UserCheck, ArrowRight, Check, X, RefreshCw,
  Bot, UserPlus, Eye, Layers, Zap, Settings2, FileText, ChevronRight,
  Send, CornerDownRight, Smartphone, BookOpen, CheckCircle2, AlertCircle
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

// Pre-configured Industry Templates
const PREBUILT_TEMPLATES = [
  {
    id: "uae-tax-bot",
    name: "UAE Corporate Tax & Invoicing Bot",
    triggerKeyword: "tax",
    description: "Qualifies visitors for Corporate Tax, VAT filings, and invoicing services.",
    nodes: [
      {
        id: "node-start",
        type: "trigger",
        title: "Chat Trigger",
        content: "Triggered when visitor opens chat or types 'tax'",
        options: [{ label: "Start Qualification", targetNodeId: "node-q1" }]
      },
      {
        id: "node-q1",
        type: "question",
        title: "Service Requirement",
        content: "Welcome to JTS UAE Tax Desk! Which service are you looking for today?",
        options: [
          { label: "Corporate Tax Registration", targetNodeId: "node-lead-tax" },
          { label: "VAT Return Filing", targetNodeId: "node-lead-vat" },
          { label: "Talk to Tax Consultant", targetNodeId: "node-transfer-agent" }
        ]
      },
      {
        id: "node-lead-tax",
        type: "lead_action",
        title: "Corporate Tax Lead Capture",
        content: "Please share your email and company name to receive our Corporate Tax Compliance Package.",
        options: [{ label: "Generate Quotation", targetNodeId: "node-ticket" }]
      },
      {
        id: "node-lead-vat",
        type: "lead_action",
        title: "VAT Filing Consultation",
        content: "Our team files quarterly VAT returns. Enter your details to get an instant quote.",
        options: [{ label: "Connect with Specialist", targetNodeId: "node-transfer-agent" }]
      },
      {
        id: "node-transfer-agent",
        type: "transfer_agent",
        title: "Route to Senior Consultant",
        content: "Routing chat to our available Senior Tax Specialist in Dubai operations.",
        options: []
      },
      {
        id: "node-ticket",
        type: "ticket_action",
        title: "Auto-Create High Priority Ticket",
        content: "Ticket auto-logged under 'Tax Consultation' with 15-min SLA callback.",
        options: []
      }
    ]
  },
  {
    id: "support-sla-bot",
    name: "24/7 Support & Ticket Triage Bot",
    triggerKeyword: "help",
    description: "Automates issue categorization, SLA tagging, and human escalations.",
    nodes: [
      {
        id: "node-start",
        type: "trigger",
        title: "Support Intake",
        content: "Triggered on keyword 'help' or after 5s on support page",
        options: [{ label: "Begin Triage", targetNodeId: "node-q1" }]
      },
      {
        id: "node-q1",
        type: "question",
        title: "Issue Category",
        content: "Hello! How can our support team assist you today?",
        options: [
          { label: "Technical Bug / Error", targetNodeId: "node-ticket-bug" },
          { label: "Billing & Invoice Query", targetNodeId: "node-ticket-billing" },
          { label: "General Questions", targetNodeId: "node-ai-faq" }
        ]
      },
      {
        id: "node-ai-faq",
        type: "ai_faq",
        title: "AI Knowledge Resolution",
        content: "Checking knowledge base articles and instant resolution answers...",
        options: [{ label: "Still Need Human Agent", targetNodeId: "node-transfer" }]
      },
      {
        id: "node-ticket-bug",
        type: "ticket_action",
        title: "Log Critical Bug Ticket",
        content: "Auto-assigns ticket to Engineering Level-2 with High Priority.",
        options: []
      },
      {
        id: "node-ticket-billing",
        type: "ticket_action",
        title: "Log Accounts Ticket",
        content: "Assigns ticket to Finance Department for invoice verification.",
        options: []
      },
      {
        id: "node-transfer",
        type: "transfer_agent",
        title: "Transfer to Live Agent",
        content: "Transferring visitor to the next available support executive.",
        options: []
      }
    ]
  }
];

export default function VisualFlowBuilder({ websiteId }) {
  const toast = useToast();
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [flowName, setFlowName] = useState("");
  const [triggerKeyword, setTriggerKeyword] = useState("hello");
  const [triggerType, setTriggerType] = useState("keyword");
  const [activeTab, setActiveTab] = useState("canvas"); // "canvas" | "simulator" | "templates"
  const [isSaving, setIsSaving] = useState(false);

  // Simulator State
  const [simMessages, setSimMessages] = useState([]);
  const [currentSimNodeId, setCurrentSimNodeId] = useState(null);
  const [simIsTyping, setSimIsTyping] = useState(false);

  useEffect(() => {
    loadFlows();
  }, [websiteId]);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const data = await api(`/api/flows?websiteId=${websiteId || ""}`);
      const flowList = Array.isArray(data) ? data : [];
      setFlows(flowList);
      if (flowList.length > 0) {
        selectFlow(flowList[0]);
      } else {
        loadTemplate(PREBUILT_TEMPLATES[0]);
      }
    } catch (err) {
      console.error("Failed to load flows:", err);
      loadTemplate(PREBUILT_TEMPLATES[0]);
    } finally {
      setLoading(false);
    }
  };

  const selectFlow = (flow) => {
    setSelectedFlow(flow);
    setFlowName(flow.name || "Untitled Flow");
    setTriggerKeyword(flow.triggerKeyword || "hello");
    setTriggerType(flow.triggerType || "keyword");
    setNodes(flow.nodes || []);
    resetSimulator(flow.nodes || []);
  };

  const createNewFlow = () => {
    setSelectedFlow(null);
    setFlowName("New Chatbot Automation Flow");
    setTriggerKeyword("hello");
    setTriggerType("keyword");
    setNodes([
      {
        id: "node-start",
        type: "trigger",
        title: "Chat Trigger",
        content: "Triggered when visitor opens chat widget or types trigger keyword.",
        options: [{ label: "Start Conversation", targetNodeId: "node-q1" }]
      },
      {
        id: "node-q1",
        type: "question",
        title: "Service Inquiry",
        content: "Welcome to JTS Support! How can we assist your business today?",
        options: [
          { label: "Consultation & Pricing", targetNodeId: "node-lead" },
          { label: "Technical Support", targetNodeId: "node-ticket" }
        ]
      },
      {
        id: "node-lead",
        type: "lead_action",
        title: "Lead Capture",
        content: "Please provide your contact info to receive our custom proposal.",
        options: []
      },
      {
        id: "node-ticket",
        type: "ticket_action",
        title: "Create Ticket",
        content: "Automatically logs a ticket for urgent resolution.",
        options: []
      }
    ]);
    toast.info("Created new flow template. Customize and click Save Flow.");
  };

  const loadTemplate = (template) => {
    setSelectedFlow(null);
    setFlowName(template.name);
    setTriggerKeyword(template.triggerKeyword);
    setNodes(JSON.parse(JSON.stringify(template.nodes)));
    resetSimulator(template.nodes);
    toast.success(`Loaded template: "${template.name}"`);
    setActiveTab("canvas");
  };

  const handleSave = async () => {
    if (!flowName.trim()) {
      toast.error("Flow name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        websiteId,
        name: flowName,
        triggerKeyword,
        triggerType,
        nodes,
        isActive: true
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
        toast.success("New Chatbot Flow published!");
        setSelectedFlow(created);
      }
      loadFlows();
    } catch (err) {
      toast.error("Failed to save flow: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addNode = (type) => {
    const newId = `node-${Date.now()}`;
    const configs = {
      question: {
        title: "Customer Question & Options",
        content: "Enter your question here for the visitor to choose an option...",
        options: [
          { label: "Option 1", targetNodeId: "" },
          { label: "Option 2", targetNodeId: "" }
        ]
      },
      ai_faq: {
        title: "AI Knowledge Resolution",
        content: "Searches corporate knowledge base and answers automatically with AI.",
        options: [{ label: "Connect with Agent", targetNodeId: "" }]
      },
      lead_action: {
        title: "Capture CRM Lead",
        content: "Collects visitor full name, work email, and phone into CRM Leads.",
        options: [{ label: "Thank You & Finish", targetNodeId: "" }]
      },
      ticket_action: {
        title: "Auto-Create Support Ticket",
        content: "Automatically logs a ticket under selected department with priority.",
        options: []
      },
      transfer_agent: {
        title: "Transfer to Live Agent",
        content: "Transfers the chat directly into active agent queue.",
        options: []
      }
    };

    const config = configs[type] || { title: "New Step", content: "Bot action", options: [] };

    const newNode = {
      id: newId,
      type,
      title: config.title,
      content: config.content,
      options: config.options
    };

    setNodes(prev => [...prev, newNode]);
    toast.success(`Added ${config.title}`);
  };

  const updateNodeContent = (id, field, value) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const addOptionToNode = (nodeId) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          options: [...(n.options || []), { label: `Option ${(n.options?.length || 0) + 1}`, targetNodeId: "" }]
        };
      }
      return n;
    }));
  };

  const removeOptionFromNode = (nodeId, optIdx) => {
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          options: n.options.filter((_, idx) => idx !== optIdx)
        };
      }
      return n;
    }));
  };

  const deleteNode = (id) => {
    if (nodes.length <= 1) {
      toast.warning("Flow must contain at least one step.");
      return;
    }
    setNodes(prev => prev.filter(n => n.id !== id));
  };

  // ── Simulator Engine ──
  const resetSimulator = (currentNodes = nodes) => {
    const startNode = currentNodes.find(n => n.type === "trigger") || currentNodes[0];
    if (!startNode) return;

    setSimMessages([]);
    setSimIsTyping(true);
    setCurrentSimNodeId(startNode.id);

    setTimeout(() => {
      setSimIsTyping(false);
      setSimMessages([
        {
          id: 1,
          sender: "bot",
          text: startNode.content || "Hello! How can I assist you?",
          node: startNode
        }
      ]);
    }, 400);
  };

  const handleSimOptionClick = (option) => {
    // Add user selection message
    setSimMessages(prev => [
      ...prev,
      { id: Date.now(), sender: "user", text: option.label }
    ]);

    const targetNode = nodes.find(n => n.id === option.targetNodeId);

    setSimIsTyping(true);
    setTimeout(() => {
      setSimIsTyping(false);
      if (targetNode) {
        setCurrentSimNodeId(targetNode.id);
        let botText = targetNode.content;
        if (targetNode.type === "ticket_action") {
          botText = `🎫 [Ticket Created]: ${targetNode.content}`;
        } else if (targetNode.type === "lead_action") {
          botText = `📋 [CRM Lead Captured]: ${targetNode.content}`;
        } else if (targetNode.type === "transfer_agent") {
          botText = `👤 [Transferring]: ${targetNode.content}`;
        }

        setSimMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: botText,
            node: targetNode
          }
        ]);
      } else {
        setSimMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: "✅ Flow reached end of branch. You can connect this option to another step in the canvas."
          }
        ]);
      }
    }, 600);
  };

  const getNodeBadge = (type) => {
    switch (type) {
      case "trigger":
        return { label: "Trigger Step", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: Zap };
      case "question":
        return { label: "Question & Choices", bg: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: HelpCircle };
      case "ai_faq":
        return { label: "AI Knowledge Resolution", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Bot };
      case "lead_action":
        return { label: "CRM Lead Capture", bg: "bg-teal-50 text-teal-700 border-teal-200", icon: UserPlus };
      case "ticket_action":
        return { label: "Auto Ticket Action", bg: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: Ticket };
      case "transfer_agent":
        return { label: "Transfer to Agent", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: UserCheck };
      default:
        return { label: "Action Step", bg: "bg-slate-50 text-slate-700 border-slate-200", icon: MessageSquare };
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <GitFork size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Chatbot Decision Tree Builder</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Design automated interactive decision trees & AI routing visually</p>
          </div>
        </div>

        {/* View Switcher & Primary Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("canvas")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "canvas" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Layers size={14} /> Visual Canvas
            </button>
            <button
              onClick={() => {
                setActiveTab("simulator");
                resetSimulator();
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "simulator" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <Smartphone size={14} /> Test Bot Simulator
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "templates" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <BookOpen size={14} /> Templates
            </button>
          </div>

          <button
            onClick={createNewFlow}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus size={14} /> New Flow
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? "Saving..." : "Save Flow"}
          </button>
        </div>
      </div>

      {/* ── Flow Metadata Strip ── */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Flow Name</label>
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. UAE Tax & Accounting Intake Bot"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Trigger Keyword</label>
          <input
            type="text"
            value={triggerKeyword}
            onChange={(e) => setTriggerKeyword(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. hello, pricing, vat, support"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Trigger Condition</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="keyword">On Keyword Match (User types keyword)</option>
            <option value="welcome">On Widget Open (Instant Welcome Greeting)</option>
            <option value="delayed">After 10 Seconds Inactivity</option>
          </select>
        </div>
      </div>

      {/* ── Active View Rendering ── */}
      {activeTab === "canvas" && (
        <div className="space-y-3">
          {/* Node Library Action Strip */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Add Decision Node:</span>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => addNode("question")}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <HelpCircle size={13} /> Question & Choices
              </button>

              <button
                onClick={() => addNode("ai_faq")}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Bot size={13} /> AI Knowledge Node
              </button>

              <button
                onClick={() => addNode("lead_action")}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <UserPlus size={13} /> Capture CRM Lead
              </button>

              <button
                onClick={() => addNode("ticket_action")}
                className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Ticket size={13} /> Auto Ticket Action
              </button>

              <button
                onClick={() => addNode("transfer_agent")}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <UserCheck size={13} /> Transfer to Agent
              </button>
            </div>
          </div>

          {/* ── Interactive Horizontal Visual Canvas ── */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-5 overflow-x-auto custom-scrollbar min-h-[460px]">
            <div className="flex items-start gap-6 min-w-max pb-4">
              {nodes.map((node, index) => {
                const badge = getNodeBadge(node.type);
                const BadgeIcon = badge.icon;

                return (
                  <div key={node.id} className="flex items-center gap-6">
                    {/* Node Card */}
                    <div className={`w-80 rounded-2xl bg-white dark:bg-slate-800 border shadow-md p-4 space-y-3 transition-all hover:shadow-lg ${
                      node.type === "trigger"
                        ? "border-purple-300 ring-2 ring-purple-100 dark:ring-purple-900/20"
                        : node.type === "question"
                          ? "border-indigo-300"
                          : node.type === "ticket_action"
                            ? "border-cyan-300"
                            : node.type === "lead_action"
                              ? "border-teal-300"
                              : "border-slate-200 dark:border-white/10"
                    }`}>
                      {/* Node Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${badge.bg}`}>
                            <BadgeIcon size={12} />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        {node.type !== "trigger" && (
                          <button
                            onClick={() => deleteNode(node.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                            title="Delete Step"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Title & Bot Message Content */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={node.title}
                          onChange={(e) => updateNodeContent(node.id, "title", e.target.value)}
                          className="w-full font-bold text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500"
                          placeholder="Step title..."
                        />

                        <textarea
                          value={node.content}
                          onChange={(e) => updateNodeContent(node.id, "content", e.target.value)}
                          rows={3}
                          className="w-full text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 outline-none focus:border-indigo-500 resize-none"
                          placeholder="What will the bot say to the visitor at this step?"
                        />
                      </div>

                      {/* Options / Decision Branches */}
                      {(node.type === "question" || node.type === "trigger" || node.type === "ai_faq" || node.type === "lead_action") && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Reply Choices:</span>
                            <button
                              onClick={() => addOptionToNode(node.id)}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              + Add Choice
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(node.options || []).map((opt, optIdx) => (
                              <div key={optIdx} className="p-2.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/10 space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <input
                                    type="text"
                                    value={opt.label}
                                    onChange={(e) => {
                                      const newOpts = [...node.options];
                                      newOpts[optIdx].label = e.target.value;
                                      updateNodeContent(node.id, "options", newOpts);
                                    }}
                                    className="w-full text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                                    placeholder="Option button text..."
                                  />
                                  <button
                                    onClick={() => removeOptionFromNode(node.id, optIdx)}
                                    className="text-slate-400 hover:text-rose-500 p-1"
                                    title="Remove option"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <CornerDownRight size={12} className="text-indigo-500 shrink-0" />
                                  <select
                                    value={opt.targetNodeId || ""}
                                    onChange={(e) => {
                                      const newOpts = [...node.options];
                                      newOpts[optIdx].targetNodeId = e.target.value;
                                      updateNodeContent(node.id, "options", newOpts);
                                    }}
                                    className="w-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none cursor-pointer"
                                  >
                                    <option value="">Branch to Next Step...</option>
                                    {nodes.filter(n => n.id !== node.id).map(n => (
                                      <option key={n.id} value={n.id}>
                                        Step: {n.title}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Visual Connector Arrow */}
                    {index < nodes.length - 1 && (
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm shrink-0">
                        <ArrowRight size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Test Bot Simulator View ── */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Simulator Controls */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-600" />
                Live Bot Flow Simulator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Test how real website visitors will interact with your automated chatbot decision tree.
              </p>
            </div>

            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-indigo-700 dark:text-indigo-300">💡 Testing Tips:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>Click any quick-reply button in the chat box to test branching.</li>
                <li>Check ticket creation or lead capture logic live.</li>
                <li>Click "Restart Simulator" anytime to test from Step #1.</li>
              </ul>
            </div>

            <button
              onClick={() => resetSimulator()}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw size={13} /> Restart Simulator
            </button>
          </div>

          {/* Simulated Smartphone Chat Screen */}
          <div className="lg:col-span-8 flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border-4 border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[520px]">
              {/* Phone Header */}
              <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                    🤖
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">JTS Automated Assistant</h4>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                    </span>
                  </div>
                </div>

                <button onClick={() => resetSimulator()} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                {simMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] space-y-2`}>
                      <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 rounded-tl-none"
                      }`}>
                        {msg.text}
                      </div>

                      {/* Render Clickable Quick Reply Options */}
                      {msg.sender === "bot" && msg.node?.options && msg.node.options.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          {msg.node.options.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleSimOptionClick(opt)}
                              className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 flex items-center justify-between group"
                            >
                              <span>{opt.label}</span>
                              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {simIsTyping && (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-2.5 rounded-2xl rounded-tl-none w-16 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pre-built Templates Library ── */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PREBUILT_TEMPLATES.map(tmpl => (
            <div key={tmpl.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tmpl.name}</h3>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                    Trigger: "{tmpl.triggerKeyword}"
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400">{tmpl.nodes.length} Steps</span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">{tmpl.description}</p>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Ready to deploy</span>
                </div>

                <button
                  onClick={() => loadTemplate(tmpl)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles size={13} /> Load Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
