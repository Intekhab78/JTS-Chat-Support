import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  GitFork, Plus, Save, Trash2, Sparkles, MessageSquare,
  HelpCircle, Ticket, UserCheck, ArrowRight, X, RefreshCw,
  Bot, UserPlus, Layers, ChevronRight, ChevronLeft,
  Send, CornerDownRight, Smartphone, BookOpen, CheckCircle2,
  AlertTriangle, Copy, Power, ArrowLeft, Zap, BarChart3, FileText, Clock, Sliders, ExternalLink, Bell
} from "lucide-react";
import { api, API_BASE } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import { COUNTRY_CODES } from "../constants/countryCodes.js";

function splitWhatsappNumber(full) {
  const digits = String(full || "").replace(/[^0-9]/g, "");
  if (!digits) return { code: "91", local: "" };
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  if (digits.length > 10) {
    const match = sorted.find((c) => digits.startsWith(c.code));
    if (match) return { code: match.code, local: digits.slice(match.code.length) };
  }
  return { code: "91", local: digits };
}

function getNodeBadge(type) {
  switch (type) {
    case "trigger":
      return { label: "Trigger", bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20", icon: Zap };
    case "question":
      return { label: "Question", bg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20", icon: HelpCircle };
    case "form":
      return { label: "Form", bg: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20", icon: FileText };
    case "business_hours":
      return { label: "Business Hours", bg: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20", icon: Clock };
    case "condition":
      return { label: "If / Else", bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20", icon: Sliders };
    case "ai_faq":
      return { label: "AI Knowledge", bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20", icon: Bot };
    case "lead_action":
      return { label: "CRM Lead", bg: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20", icon: UserPlus };
    case "ticket_action":
      return { label: "Auto Ticket", bg: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20", icon: Ticket };
    case "transfer_agent":
      return { label: "Live Agent", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20", icon: UserCheck };
    default:
      return { label: "Message", bg: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10", icon: MessageSquare };
  }
}

function makeBlankDraft() {
  return {
    name: "New Chatbot Flow",
    triggerKeyword: "hello",
    triggerType: "keyword",
    isActive: true,
    nodes: [
      {
        id: "node-start",
        type: "trigger",
        title: "Chat Trigger",
        content: "Welcome! How can we help you today?",
        options: [{ label: "Get Started", targetNodeId: "node-q1" }]
      },
      {
        id: "node-q1",
        type: "question",
        title: "Main Menu",
        content: "Please pick an option below:",
        options: [
          { label: "Sales & Pricing", targetNodeId: "node-lead" },
          { label: "Support Ticket", targetNodeId: "node-ticket" }
        ]
      },
      {
        id: "node-lead",
        type: "lead_action",
        title: "Capture CRM Lead",
        content: "Share your email and company name to receive our proposal.",
        options: []
      },
      {
        id: "node-ticket",
        type: "ticket_action",
        title: "Create Support Ticket",
        content: "Automatically creates a support ticket for your request.",
        options: []
      }
    ]
  };
}

export default function VisualFlowBuilder({ websiteId }) {
  const toast = useToast();
  const { websites } = useWebsite() || {};
  const activeWebsite = (websites || []).find((w) => String(w._id) === String(websiteId)) || null;
  const canvasRef = useRef(null);

  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [nodes, setNodes] = useState([]);
  const [flowName, setFlowName] = useState("");
  const [triggerKeyword, setTriggerKeyword] = useState("hello");
  const [triggerType, setTriggerType] = useState("keyword");
  const [triggerUrlPattern, setTriggerUrlPattern] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState("");
  const [waCountryCode, setWaCountryCode] = useState("91");
  const [waLocalNumber, setWaLocalNumber] = useState("");
  const [notifyCustomerWhatsapp, setNotifyCustomerWhatsapp] = useState(false);
  const [notifyWebhookUrl, setNotifyWebhookUrl] = useState("");
  const [showAlertsConfig, setShowAlertsConfig] = useState(false);
  const [showLiveWidgetModal, setShowLiveWidgetModal] = useState(false);
  const [sandboxKey, setSandboxKey] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [activeTab, setActiveTab] = useState("canvas"); // "canvas" | "diagram" | "simulator" | "templates" | "analytics"
  const [diagramZoom, setDiagramZoom] = useState(1);
  const [selectedDiagramNodeId, setSelectedDiagramNodeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Simulator state
  const [simMessages, setSimMessages] = useState([]);
  const [currentSimNodeId, setCurrentSimNodeId] = useState(null);
  const [simIsTyping, setSimIsTyping] = useState(false);
  const [simInput, setSimInput] = useState("");

  // DB Templates & Funnel Analytics state
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    loadFlows();
    loadTemplates();
  }, [websiteId]);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await api("/api/flows/templates");
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadAnalytics = async (flowId) => {
    if (!flowId) {
      setAnalytics(null);
      return;
    }
    setAnalyticsLoading(true);
    try {
      const data = await api(`/api/flows/${flowId}/executive-summary`);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const applyFlowToEditor = (flowObj, savedRecord = null) => {
    setSelectedFlow(savedRecord);
    setFlowName(flowObj.name || "Untitled Flow");
    setTriggerKeyword(flowObj.triggerKeyword || "hello");
    setTriggerType(flowObj.triggerType || "keyword");
    setTriggerUrlPattern(flowObj.triggerUrlPattern || "");
    setNotifyEmail(flowObj.notifyEmail || "");
    const parsedWa = splitWhatsappNumber(flowObj.notifyWhatsapp || "");
    setWaCountryCode(parsedWa.code);
    setWaLocalNumber(parsedWa.local);
    setNotifyWhatsapp(parsedWa.local ? `${parsedWa.code}${parsedWa.local}` : "");
    setNotifyCustomerWhatsapp(Boolean(flowObj.notifyCustomerWhatsapp));
    setNotifyWebhookUrl(flowObj.notifyWebhookUrl || "");
    setIsActive(flowObj.isActive !== undefined ? Boolean(flowObj.isActive) : true);
    const clonedNodes = JSON.parse(JSON.stringify(flowObj.nodes || []));
    setNodes(clonedNodes);
    resetSimulator(clonedNodes, flowObj.triggerKeyword || "hello");
  };

  const loadFlows = async (preferFlowId = null) => {
    if (!websiteId) {
      setFlows([]);
      setSelectedFlow(null);
      setNodes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/api/flows?websiteId=${encodeURIComponent(websiteId)}`);
      const flowList = Array.isArray(data) ? data : [];
      setFlows(flowList);

      if (flowList.length > 0) {
        const match = preferFlowId
          ? flowList.find((f) => String(f._id) === String(preferFlowId))
          : null;
        const target = match || flowList[0];
        applyFlowToEditor(target, target);
      } else {
        applyFlowToEditor(makeBlankDraft(), null);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load chatbot flows.");
      applyFlowToEditor(makeBlankDraft(), null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSavedFlow = (flowId) => {
    const found = flows.find((f) => String(f._id) === String(flowId));
    if (found) {
      applyFlowToEditor(found, found);
    }
  };

  const createNewFlow = () => {
    applyFlowToEditor(makeBlankDraft(), null);
    setActiveTab("canvas");
    toast.info("Blank draft ready. Customize steps and click Save Flow.");
  };

  const handleDuplicateFlow = () => {
    applyFlowToEditor(
      {
        name: `${flowName || "Chatbot Flow"} (Copy)`,
        triggerKeyword,
        triggerType,
        isActive: false,
        nodes
      },
      null
    );
    setActiveTab("canvas");
    toast.info("Duplicated as unsaved draft. Click Save Flow to store.");
  };

  const loadTemplate = (template) => {
    applyFlowToEditor(template, null);
    setActiveTab("canvas");
    toast.success(`Loaded template "${template.name}" as draft. Click Save Flow to publish.`);
  };

  const handleSaveAsTemplate = async () => {
    if (!flowName.trim() || nodes.length === 0) {
      return toast.error("Provide a flow name and at least one step.");
    }
    try {
      await api("/api/flows/templates", {
        method: "POST",
        body: JSON.stringify({
          name: flowName.trim(),
          description: `Custom template (${nodes.length} steps, trigger: ${triggerKeyword})`,
          industry: "Custom",
          triggerKeyword,
          triggerType,
          nodes
        })
      });
      toast.success("Saved current flow as reusable template!");
      await loadTemplates();
    } catch (err) {
      toast.error(err?.message || "Failed to save template.");
    }
  };

  const handleSave = async () => {
    if (!websiteId) return toast.error("Please select a website first.");
    if (!flowName.trim()) return toast.error("Flow name is required.");
    if (nodes.length === 0) return toast.error("Add at least one step before saving.");

    const normalizedKw = (triggerKeyword.trim() || "hello").toLowerCase();
    if (isActive && triggerType === "keyword") {
      const conflictingFlow = flows.find(
        (f) =>
          f.isActive &&
          String(f._id) !== String(selectedFlow?._id || "") &&
          (f.triggerType === "keyword" || !f.triggerType) &&
          String(f.triggerKeyword || "").trim().toLowerCase() === normalizedKw
      );
      if (conflictingFlow) {
        const proceed = window.confirm(
          `Another active flow "${conflictingFlow.name}" already uses trigger keyword "${normalizedKw}". Save anyway?`
        );
        if (!proceed) return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        websiteId,
        name: flowName.trim(),
        triggerKeyword: triggerKeyword.trim() || "hello",
        triggerType,
        triggerUrlPattern: triggerUrlPattern.trim(),
        notifyEmail: notifyEmail.trim(),
        notifyWhatsapp: notifyWhatsapp.trim(),
        notifyCustomerWhatsapp,
        notifyWebhookUrl: notifyWebhookUrl.trim(),
        isActive,
        nodes
      };

      let saved;
      if (selectedFlow?._id) {
        saved = await api(`/api/flows/${selectedFlow._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Flow updated.");
      } else {
        saved = await api("/api/flows", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("New flow saved and published.");
      }
      await loadFlows(saved?._id);
    } catch (err) {
      toast.error(err?.message || "Failed to save flow.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    const nextState = !isActive;
    setIsActive(nextState);
    if (!selectedFlow?._id) return;

    try {
      const updated = await api(`/api/flows/${selectedFlow._id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: nextState })
      });
      setSelectedFlow(updated);
      setFlows((prev) => prev.map((f) => (f._id === updated._id ? updated : f)));
      toast.success(nextState ? "Flow activated." : "Flow paused.");
    } catch (err) {
      setIsActive(!nextState);
      toast.error(err?.message || "Failed to update flow status.");
    }
  };

  const handleDeleteFlow = async () => {
    if (!selectedFlow?._id) {
      createNewFlow();
      return;
    }
    if (!window.confirm(`Delete saved flow "${selectedFlow.name}"?`)) return;

    try {
      await api(`/api/flows/${selectedFlow._id}`, { method: "DELETE" });
      toast.success("Flow deleted.");
      await loadFlows();
    } catch (err) {
      toast.error(err?.message || "Failed to delete flow.");
    }
  };

  // ── Node CRUD ──
  const addNode = (type) => {
    const newId = `node-${Date.now()}`;
    const configs = {
      question: {
        title: "Customer Question",
        content: "Choose one of the options below:",
        options: [
          { label: "Option 1", targetNodeId: "" },
          { label: "Option 2", targetNodeId: "" }
        ]
      },
      message: {
        title: "Bot Message",
        content: "Here is some helpful information for you.",
        options: [],
        nextNodeId: ""
      },
      form: {
        title: "Lead / Intake Form",
        content: "Please fill in your details below so our team can assist you:",
        options: [],
        submitLabel: "Submit Details",
        nextNodeId: "",
        formFields: [
          { key: "name", label: "Full Name", type: "text", placeholder: "Your name", required: true },
          { key: "email", label: "Work Email", type: "email", placeholder: "you@company.com", required: true },
          { key: "phone", label: "Phone / WhatsApp", type: "tel", placeholder: "+91 ...", required: false }
        ]
      },
      business_hours: {
        title: "Business Hours Check",
        content: "Checking if our team is currently online...",
        options: [],
        openTargetNodeId: "",
        closedTargetNodeId: ""
      },
      condition: {
        title: "Budget / Rule Check",
        content: "Routing based on customer input...",
        options: [],
        conditionConfig: {
          fieldKey: "budget",
          operator: "gt",
          value: "50000",
          trueTargetNodeId: "",
          falseTargetNodeId: ""
        }
      },
      ai_faq: {
        title: "AI Knowledge Resolution",
        content: "Ask your question and I will answer from our verified Knowledge Base.",
        options: [{ label: "Connect with Agent", targetNodeId: "" }]
      },
      lead_action: {
        title: "Capture CRM Lead",
        content: "Please share your name, work email, and phone number.",
        options: [{ label: "Continue", targetNodeId: "" }]
      },
      ticket_action: {
        title: "Auto-Create Ticket",
        content: "Logs a support ticket automatically with the visitor's details.",
        options: []
      },
      transfer_agent: {
        title: "Transfer to Live Agent",
        content: "Connecting visitor to an available live support agent.",
        options: []
      }
    };

    const cfg = configs[type] || { title: "New Step", content: "", options: [] };
    setNodes((prev) => [...prev, { id: newId, type, ...cfg }]);
    setTimeout(() => {
      canvasRef.current?.scrollBy({ left: 360, behavior: "smooth" });
    }, 50);
  };

  const updateNodeContent = (id, field, value) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const moveNode = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 1 || targetIdx >= nodes.length) return;
    setNodes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const addOptionToNode = (nodeId) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? { ...n, options: [...(n.options || []), { label: `Option ${(n.options?.length || 0) + 1}`, targetNodeId: "" }] }
          : n
      )
    );
  };

  const removeOptionFromNode = (nodeId, optIdx) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, options: (n.options || []).filter((_, i) => i !== optIdx) } : n
      )
    );
  };

  const deleteNode = (id) => {
    if (nodes.length <= 1) return toast.warning("Flow must contain at least one step.");
    setNodes((prev) =>
      prev
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          options: (n.options || []).map((o) => (o.targetNodeId === id ? { ...o, targetNodeId: "" } : o))
        }))
    );
  };

  // ── Flow Health Validator ──
  const flowHealth = useMemo(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    let unlinkedCount = 0;
    for (const n of nodes) {
      for (const opt of n.options || []) {
        if (!opt.targetNodeId || !nodeIds.has(opt.targetNodeId)) {
          unlinkedCount += 1;
        }
      }
    }
    return { unlinkedCount, isHealthy: unlinkedCount === 0 };
  }, [nodes]);

  // ── Simulator Engine ──
  const resetSimulator = (currentNodes = nodes, kw = triggerKeyword) => {
    const startNode = currentNodes.find((n) => n.type === "trigger") || currentNodes[0];
    if (!startNode) {
      setSimMessages([]);
      setCurrentSimNodeId(null);
      return;
    }
    setCurrentSimNodeId(startNode.id);
    setSimIsTyping(false);
    setSimMessages([
      {
        id: Date.now(),
        sender: "bot",
        text: startNode.content || `Flow triggered (${kw || "welcome"}).`,
        node: startNode
      }
    ]);
  };

  const pushBotNodeMessage = (targetNode) => {
    let prefix = "";
    if (targetNode.type === "ticket_action") prefix = "[Auto Ticket] ";
    else if (targetNode.type === "lead_action") prefix = "[CRM Lead] ";
    else if (targetNode.type === "transfer_agent") prefix = "[Live Agent Handoff] ";
    else if (targetNode.type === "ai_faq") prefix = "[AI Knowledge Mode] ";

    setSimMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: "bot",
        text: `${prefix}${targetNode.content}`,
        node: targetNode
      }
    ]);
  };

  const resolveSimNode = (targetNode, formVals = {}) => {
    let curr = targetNode;
    for (let i = 0; i < 5 && curr; i++) {
      if (curr.type === "business_hours") {
        const h = new Date().getHours();
        const isOpen = h >= 9 && h < 19;
        const nextId = isOpen ? curr.openTargetNodeId : curr.closedTargetNodeId;
        const next = nextId ? nodes.find((n) => n.id === nextId) : null;
        if (!next) break;
        curr = next;
      } else if (curr.type === "condition") {
        const cfg = curr.conditionConfig || {};
        const key = String(cfg.fieldKey || "budget").toLowerCase();
        const op = cfg.operator || "gt";
        const expected = String(cfg.value ?? "").trim();
        let actual = "";
        for (const [k, v] of Object.entries(formVals || {})) {
          if (k.toLowerCase() === key || k.toLowerCase().includes(key)) {
            actual = String(v ?? "");
            break;
          }
        }
        let passed = false;
        if (op === "gt" || op === "lt") {
          const aNum = parseFloat(actual.replace(/[,₹$\s]/g, ""));
          const eNum = parseFloat(expected.replace(/[,₹$\s]/g, ""));
          if (!Number.isNaN(aNum) && !Number.isNaN(eNum)) {
            passed = op === "gt" ? aNum > eNum : aNum < eNum;
          }
        } else if (op === "equals") {
          passed = actual.trim().toLowerCase() === expected.toLowerCase();
        } else {
          passed = actual.toLowerCase().includes(expected.toLowerCase());
        }
        const nextId = passed ? cfg.trueTargetNodeId : cfg.falseTargetNodeId;
        const next = nextId ? nodes.find((n) => n.id === nextId) : null;
        if (!next) break;
        curr = next;
      } else {
        break;
      }
    }
    return curr;
  };

  const handleSimFormSubmit = (formNode, values) => {
    const summary = (formNode.formFields || [])
      .map((f) => `${f.label}: ${values[f.key] || "—"}`)
      .join("\n");
    setSimMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: summary }]);
    const rawTarget = formNode.nextNodeId ? nodes.find((n) => n.id === formNode.nextNodeId) : null;
    const targetNode = resolveSimNode(rawTarget, values);
    if (targetNode) {
      setCurrentSimNodeId(targetNode.id);
      pushBotNodeMessage(targetNode);
    } else {
      setSimMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Thank you! Form details submitted. (Tip: Link 'After Submit -> Next Step' to CRM Lead or Auto Ticket.)"
        }
      ]);
    }
  };

  const handleSimOptionClick = (option) => {
    setSimMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: option.label }]);
    const rawTarget = nodes.find((n) => n.id === option.targetNodeId);
    const targetNode = resolveSimNode(rawTarget);

    if (targetNode) {
      setCurrentSimNodeId(targetNode.id);
      pushBotNodeMessage(targetNode);
    } else {
      setSimMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Branch end reached. Link this choice to another step in the canvas to continue."
        }
      ]);
    }
  };

  const handleSimTextSubmit = async (e) => {
    e.preventDefault();
    const text = simInput.trim();
    if (!text) return;
    setSimInput("");
    setSimMessages((prev) => [...prev, { id: Date.now(), sender: "user", text }]);

    const currentNode = nodes.find((n) => n.id === currentSimNodeId);

    // Check if user typed any of the comma-separated trigger keywords
    const simKeywords = String(triggerKeyword || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (simKeywords.some((kw) => text.toLowerCase().includes(kw)) && currentNode?.type !== "ai_faq") {
      const startNode = nodes.find((n) => n.type === "trigger") || nodes[0];
      if (startNode) {
        setCurrentSimNodeId(startNode.id);
        pushBotNodeMessage(startNode);
        return;
      }
    }

    // If on an AI Knowledge node (or any free-text question), query the real Knowledge Base RAG API!
    if (websiteId && (currentNode?.type === "ai_faq" || true)) {
      setSimIsTyping(true);
      try {
        const res = await api("/api/knowledge-base/query", {
          method: "POST",
          body: JSON.stringify({ websiteId, queryText: text })
        });
        setSimMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: res.answer || "No matching knowledge found.",
            meta: `${res.mode === "gemini_rag" ? "Gemini RAG" : res.mode === "local_rag" ? "KB Match" : "No Match"} · ${res.latencyMs || 0}ms`,
            node: currentNode
          }
        ]);
      } catch {
        setSimMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: "Could not reach Knowledge Base query endpoint.",
            node: currentNode
          }
        ]);
      } finally {
        setSimIsTyping(false);
      }
    }
  };

  if (!websiteId) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-10 text-center max-w-xl mx-auto my-6">
        <GitFork size={28} className="mx-auto text-indigo-500 mb-2" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Website Selected</h3>
        <p className="text-xs text-slate-500 mt-1">
          Select a website from the top-right switcher to view and build its chatbot decision flows.
        </p>
      </div>
    );
  }

  const nodeIdsSet = new Set(nodes.map((n) => n.id));

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {/* ── Top Header Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <GitFork size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate">
                Chatbot Decision Tree Builder
              </h2>
              {selectedFlow?._id ? (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {isActive ? "Active" : "Paused"}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                  Unsaved Draft
                </span>
              )}

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${flowHealth.isHealthy
                  ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20"
                  : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                }`}>
                {flowHealth.isHealthy ? (
                  <><CheckCircle2 size={10} /> All Branches Linked</>
                ) : (
                  <><AlertTriangle size={10} /> {flowHealth.unlinkedCount} Unlinked</>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              Build interactive decision trees, connect Knowledge Base AI nodes, and test live
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("canvas")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === "canvas"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
            >
              <Layers size={12} /> Visual Canvas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("diagram")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === "diagram"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
            >
              <GitFork size={12} /> Flow Diagram
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("simulator");
                resetSimulator();
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === "simulator"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
            >
              <Smartphone size={12} /> Test Simulator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === "templates"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
            >
              <BookOpen size={12} /> Templates
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("analytics");
                loadAnalytics(selectedFlow?._id);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${activeTab === "analytics"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
            >
              <BarChart3 size={12} /> Analytics
            </button>
          </div>

          <button
            type="button"
            onClick={createNewFlow}
            className="h-8 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus size={12} /> New
          </button>

          <button
            type="button"
            onClick={handleDuplicateFlow}
            title="Duplicate Flow"
            className="h-8 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-[10.5px] font-bold flex items-center gap-1 shrink-0"
          >
            <Copy size={12} />
          </button>

          <button
            type="button"
            onClick={handleToggleActive}
            title={isActive ? "Pause Flow" : "Activate Flow"}
            className={`h-8 px-2 rounded-xl border text-[10.5px] font-bold flex items-center gap-1 shrink-0 ${isActive
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300"
                : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-white/10 dark:text-slate-300"
              }`}
          >
            <Power size={12} />
          </button>

          {selectedFlow?._id && (
            <button
              type="button"
              onClick={handleDeleteFlow}
              title="Delete Saved Flow"
              className="h-8 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-500 border border-slate-200 dark:border-white/10 text-[10.5px] font-bold flex items-center gap-1 shrink-0"
            >
              <Trash2 size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAlertsConfig((v) => !v)}
            title="Email, WhatsApp & Webhook Alerts"
            className={`h-8 px-2 rounded-xl border text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${(notifyEmail || notifyWhatsapp || notifyCustomerWhatsapp || notifyWebhookUrl)
                ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300"
                : "bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-white/10 dark:text-slate-300"
              }`}
          >
            <Bell size={12} /> Alerts
          </button>

          {activeWebsite?.apiKey && (
            <button
              type="button"
              onClick={() => setShowLiveWidgetModal(true)}
              title="Test in Live Widget Sandbox"
              className="h-8 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 text-[10.5px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ExternalLink size={12} /> Live Widget
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10.5px] font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Save size={12} /> {isSaving ? "Saving..." : selectedFlow?._id ? "Update Flow" : "Save Flow"}
          </button>
        </div>
      </div>

      {/* ── Saved Flows Selector + Metadata Strip ── */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-2.5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
            Saved Flows ({flows.length})
          </label>
          <select
            value={selectedFlow?._id || ""}
            onChange={(e) => {
              if (e.target.value) handleSelectSavedFlow(e.target.value);
            }}
            disabled={loading || flows.length === 0}
            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          >
            {flows.length === 0 ? (
              <option value="">No saved flows yet (Draft)</option>
            ) : (
              <>
                {!selectedFlow?._id && <option value="">Unsaved Draft...</option>}
                {flows.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.isActive ? "● " : "○ "}{f.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Flow Name</label>
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            placeholder="e.g. Support Intake Bot"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
            {triggerType === "page_url" ? "Page URL Patterns (comma separated)" : "Trigger Keywords (comma separated)"}
          </label>
          {triggerType === "page_url" ? (
            <input
              type="text"
              value={triggerUrlPattern}
              onChange={(e) => setTriggerUrlPattern(e.target.value)}
              className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              placeholder="e.g. /pricing, /plans, /support"
            />
          ) : (
            <input
              type="text"
              value={triggerKeyword}
              onChange={(e) => setTriggerKeyword(e.target.value)}
              className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              placeholder="e.g. hello, hi, pricing, demo"
            />
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Trigger Condition</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="w-full h-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          >
            <option value="keyword">On Keyword Match</option>
            <option value="welcome">On Widget Open (Instant)</option>
            <option value="page_url">On Page URL Match (/pricing, /support)</option>
            <option value="delayed">After 10s Inactivity</option>
          </select>
        </div>
      </div>

      {showAlertsConfig && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/80 dark:border-amber-500/20 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1 block">
                Alert Email (Existing SMTP)
              </label>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="e.g. sales@yourcompany.com"
                className="w-full h-8 bg-white dark:bg-slate-900 border border-amber-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1 block">
                Team Alert WhatsApp (Meta API)
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={waCountryCode}
                  onChange={(e) => {
                    const nextCode = e.target.value;
                    setWaCountryCode(nextCode);
                    setNotifyWhatsapp(waLocalNumber ? `${nextCode}${waLocalNumber}` : "");
                  }}
                  className="h-8 max-w-[130px] bg-white dark:bg-slate-900 border border-amber-200 dark:border-white/10 rounded-lg px-1.5 text-[11px] font-bold outline-none focus:border-amber-500 cursor-pointer"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={`${c.iso}-${c.code}`} value={c.code}>
                      {c.iso} +{c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={waLocalNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, "");
                    setWaLocalNumber(clean);
                    setNotifyWhatsapp(clean ? `${waCountryCode}${clean}` : "");
                  }}
                  placeholder="6387725553"
                  className="w-full h-8 bg-white dark:bg-slate-900 border border-amber-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1 block">
                External Webhook URL (Optional)
              </label>
              <input
                type="url"
                value={notifyWebhookUrl}
                onChange={(e) => setNotifyWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/chatbot-lead"
                className="w-full h-8 bg-white dark:bg-slate-900 border border-amber-200 dark:border-white/10 rounded-lg px-2.5 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCustomerWhatsapp}
              onChange={(e) => setNotifyCustomerWhatsapp(e.target.checked)}
              className="rounded"
            />
            Also send automatic WhatsApp confirmation to customer (when Phone is submitted in Form)
          </label>
        </div>
      )}

      {/* ── VIEW 1: VISUAL CANVAS ── */}
      {activeTab === "canvas" && (
        <div className="space-y-2.5 w-full min-w-0">
          {/* Collapsible How It Works Guide */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 px-3.5 py-2 rounded-2xl border border-indigo-200/70 dark:border-indigo-500/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-800 dark:text-indigo-200">
                <BookOpen size={13} className="text-indigo-600 shrink-0" />
                <span>Quick Guide: How Flow Works & Goes Live</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:underline"
              >
                {showGuide ? "Hide Guide" : "Show 3-Step Guide"}
              </button>
            </div>
            {showGuide && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-500/20 text-[11px] text-slate-700 dark:text-slate-300">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-white/5">
                  <p className="font-bold text-indigo-700 dark:text-indigo-300">1. Design Steps</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Use <strong>Question</strong> for button groups, <strong>Form</strong> for lead details, and link each choice to a target step.</p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-white/5">
                  <p className="font-bold text-indigo-700 dark:text-indigo-300">2. Test in Simulator</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Open the <strong>Test Simulator</strong> tab above to click buttons, submit forms, and test Knowledge Base AI before publishing.</p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-white/5">
                  <p className="font-bold text-indigo-700 dark:text-indigo-300">3. Save & Set Active</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Keep the power toggle <strong>Active (Green)</strong> and click <strong>Save Flow</strong>. It runs automatically on your embedded widget.</p>
                </div>
              </div>
            )}
          </div>

          {/* Add Node Bar */}
          <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add Step:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => addNode("message")} className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-[11px] font-bold flex items-center gap-1">
                <MessageSquare size={12} /> Message
              </button>
              <button onClick={() => addNode("question")} className="h-7 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold flex items-center gap-1">
                <HelpCircle size={12} /> Question
              </button>
              <button onClick={() => addNode("form")} className="h-7 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/80 text-[11px] font-bold flex items-center gap-1">
                <FileText size={12} /> Form
              </button>
              <button onClick={() => addNode("business_hours")} className="h-7 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-[11px] font-bold flex items-center gap-1">
                <Clock size={12} /> Business Hours
              </button>
              <button onClick={() => addNode("condition")} className="h-7 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[11px] font-bold flex items-center gap-1">
                <Sliders size={12} /> If / Else
              </button>
              <button onClick={() => addNode("ai_faq")} className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold flex items-center gap-1">
                <Bot size={12} /> AI Knowledge
              </button>
              <button onClick={() => addNode("lead_action")} className="h-7 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 text-[11px] font-bold flex items-center gap-1">
                <UserPlus size={12} /> CRM Lead
              </button>
              <button onClick={() => addNode("ticket_action")} className="h-7 px-2.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/80 text-[11px] font-bold flex items-center gap-1">
                <Ticket size={12} /> Auto Ticket
              </button>
              <button onClick={() => addNode("transfer_agent")} className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-[11px] font-bold flex items-center gap-1">
                <UserCheck size={12} /> Live Agent
              </button>
            </div>
          </div>

          {/* Canvas Scroll Controls */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Decision Tree Canvas <span className="text-slate-400 lowercase font-medium">({nodes.length} steps)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => canvasRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1"
              >
                <ChevronLeft size={12} /> Left
              </button>
              <button
                type="button"
                onClick={() => canvasRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1"
              >
                Right <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Horizontal Node Canvas */}
          <div
            ref={canvasRef}
            className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-4 overflow-x-auto min-h-[420px]"
          >
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading chatbot flows...</div>
            ) : (
              <div className="flex items-start gap-4 min-w-max pb-2">
                {nodes.map((node, index) => {
                  const badge = getNodeBadge(node.type);
                  const BadgeIcon = badge.icon;
                  const incomingFrom = nodes.filter((other) => (
                    other.id !== node.id && (
                      (other.options || []).some((opt) => opt.targetNodeId === node.id)
                      || other.nextNodeId === node.id
                      || other.openTargetNodeId === node.id
                      || other.closedTargetNodeId === node.id
                      || other.offlineTargetNodeId === node.id
                      || other.conditionConfig?.trueTargetNodeId === node.id
                      || other.conditionConfig?.falseTargetNodeId === node.id
                    )
                  ));

                  return (
                    <div key={node.id} className="flex items-center gap-4">
                      <div className={`w-76 rounded-2xl bg-white dark:bg-slate-800 border shadow-xs p-3.5 space-y-2.5 ${node.type === "trigger"
                          ? "border-purple-300 ring-2 ring-purple-100 dark:ring-purple-900/20"
                          : incomingFrom.length === 0
                      ? "border-amber-300/90 dark:border-amber-500/30"
                      : "border-slate-200/90 dark:border-white/10"
                      }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${badge.bg}`}>
                            <BadgeIcon size={11} />
                            <span>{badge.label}</span>
                          </span>
                        </div>

                        {node.type !== "trigger" && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => moveNode(index, -1)}
                              disabled={index <= 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                              title="Move Left"
                            >
                              <ArrowLeft size={11} />
                            </button>
                            <button
                              onClick={() => moveNode(index, 1)}
                              disabled={index >= nodes.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                              title="Move Right"
                            >
                              <ArrowRight size={11} />
                            </button>
                            <button
                              onClick={() => deleteNode(node.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete Step"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>

                      {node.type !== "trigger" && (
                        <div className="flex flex-wrap items-center gap-1">
                          {incomingFrom.length > 0 ? (
                            incomingFrom.map((src) => (
                              <span
                                key={src.id}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20"
                              >
                                ← {src.title || "Step"}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                              ⚠ Unlinked (link from a previous step)
                            </span>
                          )}
                        </div>
                      )}

                      <div className="space-y-1.5">
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
                          rows={2}
                          className="w-full text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2 outline-none focus:border-indigo-500 resize-none leading-relaxed"
                          placeholder="Bot message at this step..."
                        />
                      </div>

                      {(node.type === "form") && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Form Fields:</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {[
                                { key: "name", label: "Name", type: "text", placeholder: "Your full name", required: true },
                                { key: "email", label: "Email", type: "email", placeholder: "you@company.com", required: true },
                                { key: "phone", label: "Phone", type: "tel", placeholder: "+91 ...", required: false },
                                { key: "company", label: "Company", type: "text", placeholder: "Company name", required: false },
                                { key: "budget", label: "Budget", type: "text", placeholder: "e.g. 75000", required: false },
                                { key: "requirement", label: "Requirement", type: "textarea", placeholder: "Project details...", required: true },
                                { key: "attachment", label: "Screenshot / PDF", type: "file", placeholder: "", required: false }
                              ].map((preset) => (
                                <button
                                  key={preset.key}
                                  type="button"
                                  onClick={() => {
                                    const existing = node.formFields || [];
                                    if (existing.some((f) => f.key === preset.key)) return;
                                    updateNodeContent(node.id, "formFields", [...existing, preset]);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-bold border border-violet-200/70"
                                >
                                  +{preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {(node.formFields || []).map((field, fIdx) => (
                              <div key={fIdx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => {
                                      const next = [...(node.formFields || [])];
                                      next[fIdx] = {
                                        ...next[fIdx],
                                        label: e.target.value,
                                        key: next[fIdx].key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_")
                                      };
                                      updateNodeContent(node.id, "formFields", next);
                                    }}
                                    placeholder="Field label..."
                                    className="w-full text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                                  />
                                  <select
                                    value={field.type || "text"}
                                    onChange={(e) => {
                                      const next = [...(node.formFields || [])];
                                      next[fIdx] = { ...next[fIdx], type: e.target.value };
                                      updateNodeContent(node.id, "formFields", next);
                                    }}
                                    className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-1.5 py-1 outline-none"
                                  >
                                    <option value="text">Text</option>
                                    <option value="email">Email</option>
                                    <option value="tel">Phone</option>
                                    <option value="textarea">Notes</option>
                                    <option value="select">Dropdown</option>
                                    <option value="file">File / Screenshot</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (node.formFields || []).filter((_, idx) => idx !== fIdx);
                                      updateNodeContent(node.id, "formFields", next);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 p-0.5"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                                {field.type === "select" && (
                                  <input
                                    type="text"
                                    value={(field.options || []).join(", ")}
                                    onChange={(e) => {
                                      const next = [...(node.formFields || [])];
                                      next[fIdx] = {
                                        ...next[fIdx],
                                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                                      };
                                      updateNodeContent(node.id, "formFields", next);
                                    }}
                                    placeholder="Options (comma separated: Web App, Mobile App, SaaS)"
                                    className="w-full text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                                  />
                                )}
                                <label className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.required !== false}
                                    onChange={(e) => {
                                      const next = [...(node.formFields || [])];
                                      next[fIdx] = { ...next[fIdx], required: e.target.checked };
                                      updateNodeContent(node.id, "formFields", next);
                                    }}
                                    className="rounded"
                                  />
                                  Required field
                                </label>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const existing = node.formFields || [];
                                updateNodeContent(node.id, "formFields", [
                                  ...existing,
                                  { key: `field_${existing.length + 1}`, label: `Custom Field ${existing.length + 1}`, type: "text", placeholder: "", required: false }
                                ]);
                              }}
                              className="w-full py-1 rounded-lg border border-dashed border-violet-300 dark:border-violet-500/30 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50/50"
                            >
                              + Add Custom Field
                            </button>
                          </div>

                          <div className="space-y-1 pt-1">
                            <input
                              type="text"
                              value={node.submitLabel || "Submit Details"}
                              onChange={(e) => updateNodeContent(node.id, "submitLabel", e.target.value)}
                              placeholder="Submit button text..."
                              className="w-full text-[11px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                            />
                            <div className="flex items-center gap-1">
                              <CornerDownRight size={11} className="text-violet-500 shrink-0" />
                              <select
                                value={node.nextNodeId || ""}
                                onChange={(e) => updateNodeContent(node.id, "nextNodeId", e.target.value)}
                                className="w-full text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none cursor-pointer"
                              >
                                <option value="">After Submit → End Flow (Auto-Save Lead)</option>
                                {nodes.filter((n) => n.id !== node.id).map((n) => (
                                  <option key={n.id} value={n.id}>
                                    After Submit → {n.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {(node.type === "transfer_agent") && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                          <label className="text-[10px] font-bold text-amber-600 block">
                            If All Agents Offline / Closed → Go To:
                          </label>
                          <select
                            value={node.offlineTargetNodeId || ""}
                            onChange={(e) => updateNodeContent(node.id, "offlineTargetNodeId", e.target.value)}
                            className="w-full text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                          >
                            <option value="">Smart Offline Menu (Leave Details / Ticket)</option>
                            {nodes.filter((n) => n.id !== node.id).map((n) => (
                              <option key={n.id} value={n.id}>→ {n.title}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {(node.type === "business_hours") && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time-Based Routing:</span>
                          <div className="space-y-1.5">
                            <div>
                              <label className="text-[10px] font-bold text-emerald-600 block mb-0.5">During Office Hours → Go To:</label>
                              <select
                                value={node.openTargetNodeId || ""}
                                onChange={(e) => updateNodeContent(node.id, "openTargetNodeId", e.target.value)}
                                className="w-full text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                              >
                                <option value="">Select open-hours step...</option>
                                {nodes.filter((n) => n.id !== node.id).map((n) => (
                                  <option key={n.id} value={n.id}>→ {n.title}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-amber-600 block mb-0.5">Night / Weekend (Closed) → Go To:</label>
                              <select
                                value={node.closedTargetNodeId || ""}
                                onChange={(e) => updateNodeContent(node.id, "closedTargetNodeId", e.target.value)}
                                className="w-full text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                              >
                                <option value="">Select after-hours step...</option>
                                {nodes.filter((n) => n.id !== node.id).map((n) => (
                                  <option key={n.id} value={n.id}>→ {n.title}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {(node.type === "condition") && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">If / Else Rule:</span>
                          <div className="grid grid-cols-3 gap-1">
                            <input
                              type="text"
                              value={node.conditionConfig?.fieldKey || "budget"}
                              onChange={(e) => updateNodeContent(node.id, "conditionConfig", { ...(node.conditionConfig || {}), fieldKey: e.target.value })}
                              placeholder="Field (budget)"
                              className="text-[10px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-1.5 py-1 outline-none"
                            />
                            <select
                              value={node.conditionConfig?.operator || "gt"}
                              onChange={(e) => updateNodeContent(node.id, "conditionConfig", { ...(node.conditionConfig || {}), operator: e.target.value })}
                              className="text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-1 py-1 outline-none"
                            >
                              <option value="gt">&gt; Greater</option>
                              <option value="lt">&lt; Less</option>
                              <option value="equals">= Equals</option>
                              <option value="contains">Contains</option>
                            </select>
                            <input
                              type="text"
                              value={node.conditionConfig?.value || ""}
                              onChange={(e) => updateNodeContent(node.id, "conditionConfig", { ...(node.conditionConfig || {}), value: e.target.value })}
                              placeholder="50000"
                              className="text-[10px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-1.5 py-1 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <select
                              value={node.conditionConfig?.trueTargetNodeId || ""}
                              onChange={(e) => updateNodeContent(node.id, "conditionConfig", { ...(node.conditionConfig || {}), trueTargetNodeId: e.target.value })}
                              className="w-full text-[11px] font-medium bg-emerald-50/40 dark:bg-slate-800 border border-emerald-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="">IF TRUE → Select step...</option>
                              {nodes.filter((n) => n.id !== node.id).map((n) => (
                                <option key={n.id} value={n.id}>IF TRUE → {n.title}</option>
                              ))}
                            </select>
                            <select
                              value={node.conditionConfig?.falseTargetNodeId || ""}
                              onChange={(e) => updateNodeContent(node.id, "conditionConfig", { ...(node.conditionConfig || {}), falseTargetNodeId: e.target.value })}
                              className="w-full text-[11px] font-medium bg-rose-50/40 dark:bg-slate-800 border border-rose-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="">ELSE → Select step...</option>
                              {nodes.filter((n) => n.id !== node.id).map((n) => (
                                <option key={n.id} value={n.id}>ELSE → {n.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {(node.type === "message") && (
                        <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Next Step (Optional):</span>
                          <div className="flex items-center gap-1">
                            <CornerDownRight size={11} className="text-slate-400 shrink-0" />
                            <select
                              value={node.nextNodeId || ""}
                              onChange={(e) => updateNodeContent(node.id, "nextNodeId", e.target.value)}
                              className="w-full text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none cursor-pointer"
                            >
                              <option value="">End after message</option>
                              {nodes.filter((n) => n.id !== node.id).map((n) => (
                                <option key={n.id} value={n.id}>
                                  → {n.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {(node.type === "question" || node.type === "trigger" || node.type === "ai_faq" || node.type === "lead_action" || node.type === "message") && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Branches:</span>
                            <button
                              onClick={() => addOptionToNode(node.id)}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              + Add Choice
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {(node.options || []).map((opt, optIdx) => {
                              const isBroken = !opt.targetNodeId || !nodeIdsSet.has(opt.targetNodeId);
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-xl border space-y-1 ${isBroken
                                      ? "bg-rose-50/40 border-rose-200 dark:bg-rose-500/5 dark:border-rose-500/20"
                                      : "bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-white/10"
                                    }`}
                                >
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={opt.label}
                                      onChange={(e) => {
                                        const newOpts = [...node.options];
                                        newOpts[optIdx] = { ...newOpts[optIdx], label: e.target.value };
                                        updateNodeContent(node.id, "options", newOpts);
                                      }}
                                      className="w-full text-[11px] font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                                      placeholder="Button label..."
                                    />
                                    <button
                                      onClick={() => removeOptionFromNode(node.id, optIdx)}
                                      className="text-slate-400 hover:text-rose-500 p-0.5"
                                      title="Remove choice"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <CornerDownRight size={11} className={isBroken ? "text-rose-500 shrink-0" : "text-indigo-500 shrink-0"} />
                                    <select
                                      value={opt.targetNodeId || ""}
                                      onChange={(e) => {
                                        const newOpts = [...node.options];
                                        newOpts[optIdx] = { ...newOpts[optIdx], targetNodeId: e.target.value };
                                        updateNodeContent(node.id, "options", newOpts);
                                      }}
                                      className="w-full text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none cursor-pointer"
                                    >
                                      <option value="">Select target step...</option>
                                      {nodes.filter((n) => n.id !== node.id).map((n) => (
                                        <option key={n.id} value={n.id}>
                                          → {n.title}
                                        </option>
                                      ))}
                                    </select>
                                    {isBroken && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newId = `node-${Date.now()}`;
                                          const newStep = {
                                            id: newId,
                                            type: "question",
                                            title: opt.label || "Next Step",
                                            content: `Follow-up for "${opt.label || "selection"}"`,
                                            options: []
                                          };
                                          setNodes((prev) =>
                                            prev
                                              .map((n) =>
                                                n.id === node.id
                                                  ? {
                                                    ...n,
                                                    options: n.options.map((o, idx) =>
                                                      idx === optIdx ? { ...o, targetNodeId: newId } : o
                                                    )
                                                  }
                                                  : n
                                              )
                                              .concat(newStep)
                                          );
                                          setTimeout(() => {
                                            canvasRef.current?.scrollBy({ left: 360, behavior: "smooth" });
                                          }, 50);
                                        }}
                                        title="Create & Link a New Step"
                                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shrink-0"
                                      >
                                        + New
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                      {
                    index < nodes.length - 1 && (
                      <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <ArrowRight size={13} />
                      </div>
                    )
                  }
                    </div>
            );
                })}
          </div>
            )}
        </div>
        </div>
  )
}

{/* ── VIEW 2: LIVE SIMULATOR ── */ }
{
  activeTab === "simulator" && (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone size={15} className="text-indigo-600" />
            Live Bot Flow Simulator
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Click quick-reply buttons to walk through your decision tree, or type a question to test live Knowledge Base RAG retrieval.
          </p>
        </div>

        <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 rounded-xl space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
          <p className="font-bold text-indigo-700 dark:text-indigo-300">Active Configuration:</p>
          <p>Flow: <strong>{flowName}</strong></p>
          <p>Trigger: <code>{triggerKeyword}</code> ({triggerType})</p>
          <p>Steps: <strong>{nodes.length}</strong></p>
        </div>

        <button
          onClick={() => resetSimulator()}
          className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <RefreshCw size={12} /> Restart Conversation
        </button>
      </div>

      <div className="lg:col-span-8 flex justify-center">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border-4 border-slate-800 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-[480px]">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">{flowName || "Automated Assistant"}</h4>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Simulator Active
                </span>
              </div>
            </div>
            <button onClick={() => resetSimulator()} className="p-1 text-slate-400 hover:text-white">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto bg-slate-50 dark:bg-slate-950">
            {simMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] space-y-1.5">
                  <div className={`p-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 rounded-tl-none"
                    }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.meta && (
                      <span className="block text-[9px] text-slate-400 mt-1 font-mono">{msg.meta}</span>
                    )}
                  </div>

                  {msg.sender === "bot" && msg.node?.options?.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {msg.node.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSimOptionClick(opt)}
                          className="w-full text-left px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[11px] font-bold flex items-center justify-between"
                        >
                          <span>{opt.label}</span>
                          <ChevronRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.sender === "bot" && msg.node?.type === "form" && msg.node?.formFields?.length > 0 && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const vals = {};
                        msg.node.formFields.forEach((f) => {
                          vals[f.key] = String(fd.get(f.key) || "").trim();
                        });
                        handleSimFormSubmit(msg.node, vals);
                      }}
                      className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl space-y-2 shadow-2xs"
                    >
                      {msg.node.formFields.map((f, fIdx) => (
                        <div key={fIdx} className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 block">
                            {f.label}{f.required !== false ? " *" : ""}
                          </label>
                          {f.type === "textarea" ? (
                            <textarea
                              name={f.key}
                              required={f.required !== false}
                              placeholder={f.placeholder || f.label}
                              rows={2}
                              className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                            />
                          ) : f.type === "select" && f.options?.length > 0 ? (
                            <select
                              name={f.key}
                              required={f.required !== false}
                              className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                            >
                              <option value="">Select {f.label}...</option>
                              {f.options.map((o, oi) => (
                                <option key={oi} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              name={f.key}
                              type={f.type || "text"}
                              required={f.required !== false}
                              placeholder={f.placeholder || f.label}
                              className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none"
                            />
                          )}
                        </div>
                      ))}
                      <button
                        type="submit"
                        className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold"
                      >
                        {msg.node.submitLabel || "Submit Details"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}

            {simIsTyping && (
              <div className="text-[11px] text-slate-400 italic px-2">Searching Knowledge Base...</div>
            )}
          </div>

          <form onSubmit={handleSimTextSubmit} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 flex gap-2">
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              placeholder={`Type "${triggerKeyword || "hello"}" or ask a question...`}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

{/* ── VIEW 3: DATABASE-BACKED TEMPLATES ── */ }
{
  activeTab === "templates" && (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
        <div>
          <h3 className="text-xs font-black text-slate-900 dark:text-white">Reusable Flow Templates</h3>
          <p className="text-[11px] text-slate-400">Loaded dynamically from MongoDB ({templates.length} available)</p>
        </div>
        <button
          type="button"
          onClick={handleSaveAsTemplate}
          className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1.5 hover:opacity-90"
        >
          <Plus size={12} /> Save Current Flow as Template
        </button>
      </div>

      {templatesLoading ? (
        <div className="py-10 text-center text-xs text-slate-400">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10">
          No templates found. Save your current flow as a template to reuse it across websites.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {templates.map((tmpl) => (
            <div key={tmpl._id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">{tmpl.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-2 py-0.5 rounded">
                        Trigger: "{tmpl.triggerKeyword}"
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">
                        {tmpl.industry || "General"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">{tmpl.nodes?.length || 0} Steps</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  {tmpl.isSystem ? "System Blueprint" : "Custom Template"}
                </span>
                <button
                  onClick={() => loadTemplate(tmpl)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <Sparkles size={12} /> Use Blueprint
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

{/* ── VIEW 4: REAL FUNNEL ANALYTICS ── */ }
{
  activeTab === "analytics" && (
    <div className="space-y-3">
      {!selectedFlow?._id ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-400">
          Save this flow first to start recording real visitor execution & funnel analytics.
        </div>
      ) : analyticsLoading ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-400">
          Loading funnel telemetry...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Flow Starts</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{analytics?.totalStarted || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Completion Rate</span>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{analytics?.conversionRate || 0}%</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Conversions</span>
              <p className="text-xl font-black text-indigo-600 mt-0.5">{analytics?.totalConversions || 0}</p>
              <span className="text-[10px] text-slate-400">
                {analytics?.leadConversions || 0} leads · {analytics?.ticketConversions || 0} tickets · {analytics?.aiResolutions || 0} AI
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Agent Transfers</span>
              <p className="text-xl font-black text-amber-600 mt-0.5">{analytics?.totalTransfers || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase text-slate-400">Drop-Offs</span>
              <p className="text-xl font-black text-rose-600 mt-0.5">{analytics?.totalDropoffs || 0}</p>
              <span className="text-[10px] text-slate-400">{analytics?.dropoffRate || 0}% drop-off rate</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Conversion Funnel</h4>
                <button
                  type="button"
                  onClick={() => loadAnalytics(selectedFlow._id)}
                  className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
              <div className="space-y-2.5">
                {(analytics?.funnel || []).map((stage, i) => {
                  const maxCount = Math.max(1, analytics?.totalStarted || 0);
                  const pct = Math.min(100, Math.round((stage.count / maxCount) * 100));
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-200">{stage.step}</span>
                        <span className="font-mono text-slate-500">{stage.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Top Clicked Choices & Step Visits</h4>
              <div className="space-y-1.5">
                {(analytics?.topClickedOptions || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No option clicks recorded yet.</p>
                ) : (
                  analytics.topClickedOptions.map((opt, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{opt.text}</span>
                      <span className="font-mono font-bold text-indigo-600">{opt.count} clicks</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
{
  /* ── VIEW 5: INTERACTIVE STEP-BY-STEP FLOW DIAGRAM ── */
  activeTab === "diagram" && (() => {
    const NODE_W = 240;
    const NODE_H = 112;
    const COL_GAP = 115;
    const ROW_GAP = 36;
    const PAD = 36;
    const TOP_PAD = 76;

    const getOutgoingEdges = (n) => {
      const list = [];
      (n.options || []).forEach((opt) => {
        if (opt.targetNodeId) list.push({ from: n.id, to: opt.targetNodeId, label: opt.label || "Option", kind: "option" });
      });
      if (n.nextNodeId) list.push({ from: n.id, to: n.nextNodeId, label: n.type === "form" ? "After Submit" : "Next", kind: "next" });
      if (n.openTargetNodeId) list.push({ from: n.id, to: n.openTargetNodeId, label: "Office Open", kind: "open" });
      if (n.closedTargetNodeId) list.push({ from: n.id, to: n.closedTargetNodeId, label: "After Hours", kind: "closed" });
      if (n.offlineTargetNodeId) list.push({ from: n.id, to: n.offlineTargetNodeId, label: "Offline Fallback", kind: "offline" });
      if (n.conditionConfig?.trueTargetNodeId) list.push({ from: n.id, to: n.conditionConfig.trueTargetNodeId, label: "If True", kind: "open" });
      if (n.conditionConfig?.falseTargetNodeId) list.push({ from: n.id, to: n.conditionConfig.falseTargetNodeId, label: "If False", kind: "closed" });
      return list;
    };

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const allEdges = [];
    nodes.forEach((n) => {
      getOutgoingEdges(n).forEach((e) => {
        if (nodeMap.has(e.to)) allEdges.push(e);
      });
    });

    const startNode = nodes.find((n) => n.type === "trigger") || nodes[0];
    const levelMap = new Map();
    if (startNode) {
      const queue = [{ id: startNode.id, level: 0 }];
      levelMap.set(startNode.id, 0);
      while (queue.length > 0) {
        const { id, level } = queue.shift();
        allEdges
          .filter((e) => e.from === id)
          .forEach((e) => {
            if (!levelMap.has(e.to)) {
              levelMap.set(e.to, level + 1);
              queue.push({ id: e.to, level: level + 1 });
            }
          });
      }
    }

    const columns = new Map();
    let maxLevel = 0;
    nodes.forEach((n) => {
      if (levelMap.has(n.id)) {
        const lvl = levelMap.get(n.id);
        maxLevel = Math.max(maxLevel, lvl);
        if (!columns.has(lvl)) columns.set(lvl, []);
        columns.get(lvl).push(n);
      }
    });
    const unlinkedNodes = nodes.filter((n) => !levelMap.has(n.id));
    if (unlinkedNodes.length > 0) {
      columns.set(maxLevel + 1, unlinkedNodes);
      maxLevel += 1;
    }

    const posMap = new Map();
    let maxRows = 1;
    columns.forEach((colNodes, lvl) => {
      maxRows = Math.max(maxRows, colNodes.length);
      colNodes.forEach((n, rowIdx) => {
        posMap.set(n.id, {
          x: PAD + lvl * (NODE_W + COL_GAP),
          y: TOP_PAD + rowIdx * (NODE_H + ROW_GAP),
          isUnlinked: !levelMap.has(n.id)
        });
      });
    });

    const svgW = Math.max(720, PAD * 2 + (maxLevel + 1) * NODE_W + maxLevel * COL_GAP);
    const svgH = Math.max(440, TOP_PAD + PAD + maxRows * NODE_H + Math.max(0, maxRows - 1) * ROW_GAP);
    const selectedNode = selectedDiagramNodeId ? nodeMap.get(selectedDiagramNodeId) : null;

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between flex-wrap gap-2 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <GitFork size={14} className="text-indigo-600" />
            <span className="text-xs font-extrabold text-slate-800 dark:text-white">
              Step-by-Step Flow Diagram
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20">
              {nodes.length} steps • {allEdges.length} connections
            </span>
            {unlinkedNodes.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {unlinkedNodes.length} unlinked
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDiagramZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              -
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 w-11 text-center">
              {Math.round(diagramZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setDiagramZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setDiagramZoom(1)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("canvas")}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1"
            >
              <Layers size={11} /> Edit Steps
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[600px] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:18px_18px] p-3">
          <div
            style={{
              width: `${svgW * diagramZoom}px`,
              height: `${svgH * diagramZoom}px`,
              position: "relative"
            }}
          >
            <div
              style={{
                width: `${svgW}px`,
                height: `${svgH}px`,
                transform: `scale(${diagramZoom})`,
                transformOrigin: "top left",
                position: "relative"
              }}
            >
              <svg
                width={svgW}
                height={svgH}
                className="absolute inset-0 pointer-events-none"
              >
                <defs>
                  <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,1 L7,4 L0,7 Z" fill="#94a3b8" />
                  </marker>
                  <marker id="flow-arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,1 L7,4 L0,7 Z" fill="#4f46e5" />
                  </marker>
                </defs>
                {allEdges.map((edge, idx) => {
                  const fromPos = posMap.get(edge.from);
                  const toPos = posMap.get(edge.to);
                  if (!fromPos || !toPos) return null;
                  const isBackEdge = toPos.x <= fromPos.x;
                  const x1 = fromPos.x + NODE_W;
                  const y1 = fromPos.y + NODE_H / 2;
                  const x2 = isBackEdge ? toPos.x + NODE_W / 2 : toPos.x;
                  const y2 = isBackEdge ? toPos.y : toPos.y + NODE_H / 2;
                  const dx = Math.max(55, Math.abs(x2 - x1) * 0.45);
                  const pathD = isBackEdge
                    ? `M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2} ${Math.min(y1, y2) - 55}, ${x2} ${y2}`
                    : `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  const isHighlighted = selectedDiagramNodeId && (edge.from === selectedDiagramNodeId || edge.to === selectedDiagramNodeId);
                  const strokeColor = isHighlighted
                    ? "#4f46e5"
                    : edge.kind === "open"
                      ? "#10b981"
                      : edge.kind === "closed" || edge.kind === "offline"
                        ? "#f59e0b"
                        : "#94a3b8";
                  const midX = (x1 + x2) / 2;
                  const midY = isBackEdge ? Math.max(18, Math.min(y1, y2) - 42) : (y1 + y2) / 2 - 8;

                  return (
                    <g key={`${edge.from}-${edge.to}-${idx}`}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isHighlighted ? 2.6 : 1.7}
                        strokeDasharray={isBackEdge ? "5,4" : undefined}
                        markerEnd={isHighlighted ? "url(#flow-arrow-active)" : "url(#flow-arrow)"}
                        opacity={selectedDiagramNodeId && !isHighlighted ? 0.3 : 0.9}
                      />
                      <rect
                        x={midX - Math.min(72, Math.max(36, edge.label.length * 3.6 + 8))}
                        y={midY - 9}
                        width={Math.min(144, Math.max(72, edge.label.length * 7.2 + 16))}
                        height={18}
                        rx={9}
                        fill="#ffffff"
                        stroke={strokeColor}
                        strokeWidth={1}
                        opacity={selectedDiagramNodeId && !isHighlighted ? 0.35 : 0.95}
                      />
                      <text
                        x={midX}
                        y={midY + 3.5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="700"
                        fill={isHighlighted ? "#4f46e5" : "#334155"}
                        opacity={selectedDiagramNodeId && !isHighlighted ? 0.35 : 1}
                      >
                        {edge.label.length > 20 ? `${edge.label.slice(0, 19)}…` : edge.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {nodes.map((node, index) => {
                const pos = posMap.get(node.id);
                if (!pos) return null;
                const badge = getNodeBadge(node.type);
                const BadgeIcon = badge.icon;
                const isSelected = selectedDiagramNodeId === node.id;

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedDiagramNodeId(isSelected ? null : node.id)}
                    style={{
                      position: "absolute",
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: `${NODE_W}px`,
                      height: `${NODE_H}px`
                    }}
                    className={`text-left rounded-2xl bg-white dark:bg-slate-800 border p-3 shadow-sm transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 ring-3 ring-indigo-500/20 shadow-md"
                        : pos.isUnlinked
                          ? "border-amber-400 ring-2 ring-amber-200/50"
                          : "border-slate-200 dark:border-white/10 hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${badge.bg}`}>
                        <BadgeIcon size={10} />
                        <span>#{index + 1} {badge.label}</span>
                      </span>
                      {pos.isUnlinked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Unlinked
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {node.title || "Untitled Step"}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                      {node.content || "No message configured"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {selectedNode && (
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-white/10 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-slate-700 dark:text-slate-200">
              <span className="font-extrabold">{selectedNode.title}</span>
              <span className="text-slate-400 mx-2">•</span>
              <span>{selectedNode.content || "No message"}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("canvas")}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700"
            >
              Open in Visual Canvas
            </button>
          </div>
        )}
      </div>
    );
  })()
}
{
  showLiveWidgetModal && activeWebsite?.apiKey && createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setShowLiveWidgetModal(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[84vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Live Widget Sandbox — {activeWebsite.websiteName}
            </h3>
            <p className="text-[11px] text-slate-500">
              Test your saved &amp; active flow with real Socket.IO, file uploads, CRM Lead &amp; Ticket creation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  Object.keys(localStorage).forEach((k) => {
                    if (k.startsWith("csw_") || k.includes("chat_session") || k.includes("visitor")) {
                      localStorage.removeItem(k);
                    }
                  });
                } catch { }
                setSandboxKey((k) => k + 1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1"
              title="Start a brand new visitor session"
            >
              <RefreshCw size={12} /> Reset Test Chat
            </button>
            <button
              type="button"
              onClick={() => setShowLiveWidgetModal(false)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors"
              title="Close Sandbox"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <iframe
          key={sandboxKey}
          title="Live Widget Sandbox"
          className="flex-1 w-full border-0 bg-slate-50"
          srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;padding:28px;color:#334155;background:#f8fafc;margin:0;} .box{max-width:460px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 4px 14px rgba(15,23,42,0.05);} h3{margin:0 0 8px;color:#0f172a;font-size:16px;} p{margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;} code{background:#f1f5f9;padding:2px 6px;border-radius:6px;font-size:12px;color:#4f46e5;font-weight:700;}</style></head><body><div class="box"><h3>Live Chat Widget Test Sandbox</h3><p>Click the chat launcher in the bottom-right corner to test your active Chatbot Flow live on <strong>${(activeWebsite.websiteName || "").replace(/</g, "&lt;")}</strong>.</p><p>Current trigger: <strong>${triggerType === "welcome" ? "Opens automatically on chat start" : triggerType === "page_url" ? `Page URL (${triggerUrlPattern || "/"})` : `Type <code>${(triggerKeyword || "hello").replace(/</g, "&lt;")}</code>`}</strong></p></div><script src="${API_BASE}/chat-widget.js" data-website-id="${activeWebsite.apiKey}"></script></body></html>`}
        />
      </div>
    </div>,
    document.body
  )
}
    </div >
  );
}
