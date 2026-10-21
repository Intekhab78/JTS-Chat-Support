import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Cpu,
  Layers,
  BookOpen,
  FileText,
  Zap,
  Play,
  RefreshCw,
  X,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Filter,
  HelpCircle,
  ArrowUpRight,
  Copy,
  Check,
  ScanLine,
  Sliders,
  Code2,
  Lock,
  Tag
} from "lucide-react";
import { api } from "../api/client.js";

export default function AiAutomationCenter() {
  const [activeTab, setActiveTab] = useState("prompts");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptForm, setPromptForm] = useState({
    name: "",
    category: "business",
    template: "",
    variables: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/ai-automation/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load AI automation readiness data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Modal scroll lock & Escape key
  useEffect(() => {
    if (showPromptModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setShowPromptModal(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showPromptModal]);

  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    try {
      await api("/api/ai-automation/prompts", {
        method: "POST",
        body: JSON.stringify({
          ...promptForm,
          variables: promptForm.variables.split(",").map(v => v.trim()).filter(Boolean)
        })
      });
      setShowPromptModal(false);
      setPromptForm({ name: "", category: "business", template: "", variables: "" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSimulateOcr = async () => {
    setOcrRunning(true);
    try {
      const res = await api("/api/ai-automation/ocr-extract-placeholder", {
        method: "POST",
        body: JSON.stringify({ documentType: "UAE Trade License & TRN Certificate" })
      });
      setOcrResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setOcrRunning(false);
    }
  };

  const handleCopyTemplate = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const summary = data?.summary || {};
  const config = data?.config || {};
  const promptTemplates = config?.promptTemplates || [];
  const automationRules = config?.automationRules || [];
  const knowledgeArticles = config?.knowledgeArticles || [];

  // Filtered Prompt Templates
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return promptTemplates;
    const q = searchQuery.toLowerCase();
    return promptTemplates.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.template?.toLowerCase().includes(q)
    );
  }, [promptTemplates, searchQuery]);

  // Filtered Automation Rules
  const filteredRules = useMemo(() => {
    if (!searchQuery.trim()) return automationRules;
    const q = searchQuery.toLowerCase();
    return automationRules.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.triggerEvent?.toLowerCase().includes(q) ||
      r.actionType?.toLowerCase().includes(q)
    );
  }, [automationRules, searchQuery]);

  // Filtered Knowledge Articles
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return knowledgeArticles;
    const q = searchQuery.toLowerCase();
    return knowledgeArticles.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [knowledgeArticles, searchQuery]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Synchronizing Enterprise AI Hub...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* ── Control Header Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <Sparkles size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                AI Readiness & OCR Hub
              </h3>
              <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-[8px] font-black rounded-md uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {summary.aiReadinessScore || "100% READY"}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Provider Abstraction Layer, Prompt Repository, Workflow Engine & Document OCR
            </p>
          </div>
        </div>

        {/* Search, Refresh & Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-44">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI hub..."
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-medium text-slate-700 dark:text-slate-200 outline-none focus:bg-white focus:border-indigo-400 transition-all placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={fetchData}
            title="Refresh AI Status"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={() => setShowPromptModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            Add Prompt
          </button>
        </div>
      </div>

      {/* ── High-Tech Infrastructure Strip (Compact) ───────── */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-2xl p-3 text-white shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-indigo-900/60">
          <div className="flex items-center gap-1.5">
            <Cpu size={13} className="text-purple-400" />
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300">
              Enterprise Provider Abstraction Layer
            </span>
          </div>
          <span className="text-[8px] font-mono text-slate-400 uppercase">
            Active Engine: {summary.activeLlmProvider || "Abstraction API"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">LLM Layer</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-400">Ready (Abstracted)</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">OCR Parser</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span className="text-[10px] font-mono font-bold text-purple-400">Ready (Abstracted)</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">PII Masking</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-cyan-400">Enabled (Pre-Filter)</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2">
            <span className="text-[7.5px] font-black uppercase text-slate-400 block tracking-wider">Active Prompts</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[10px] font-mono font-bold text-indigo-300">{summary.promptsCount || promptTemplates.length} Templates</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Compact KPI Metrics Strip ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Prompt Templates</span>
            <h4 className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{promptTemplates.length}</h4>
            <p className="text-[8px] font-medium text-slate-400">System & Business</p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText size={13} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Automation Rules</span>
            <h4 className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{automationRules.length}</h4>
            <p className="text-[8px] font-medium text-emerald-600">Event Triggers Active</p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Zap size={13} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Knowledge SOPs</span>
            <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{knowledgeArticles.length}</h4>
            <p className="text-[8px] font-medium text-slate-400">Compliance & Tax</p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center shrink-0">
            <BookOpen size={13} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">OCR Extractor</span>
            <h4 className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1">READY</h4>
            <p className="text-[8px] font-medium text-purple-500">TRN & Trade License</p>
          </div>
          <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ScanLine size={13} />
          </div>
        </div>
      </div>

      {/* ── Segmented Sub-Tabs ───────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("prompts")}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === "prompts"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          Prompt Library ({promptTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === "automation"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          Automation Engine ({automationRules.length})
        </button>
        <button
          onClick={() => setActiveTab("sops")}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === "sops"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          Knowledge SOPs ({knowledgeArticles.length})
        </button>
        <button
          onClick={() => setActiveTab("ocr")}
          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === "ocr"
              ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          OCR & Document Intelligence
        </button>
      </div>

      {/* ── Sub-Tab 1: Prompt Library ────────────────────────── */}
      {activeTab === "prompts" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Prompt Library Templates ({filteredPrompts.length})
              </h4>
            </div>
            <button
              onClick={() => setShowPromptModal(true)}
              className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus size={11} /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredPrompts.map((p, i) => (
              <div
                key={i}
                className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-xl p-2.5 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">{p.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                      {p.category}
                    </span>
                    <button
                      onClick={() => handleCopyTemplate(p.template, i)}
                      title="Copy template"
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                    >
                      {copiedIndex === i ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800/80 rounded-lg p-2 border border-slate-200/60 dark:border-white/10 font-mono text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                  {p.template}
                </div>

                {p.variables && p.variables.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase">Vars:</span>
                    {p.variables.map((v, vIdx) => (
                      <span key={vIdx} className="px-1 py-0.2 bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[8px] font-mono rounded">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredPrompts.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-[10px] font-bold">
              No matching prompt templates found.
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Tab 2: Workflow Automation ───────────────────── */}
      {activeTab === "automation" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Event-Driven Workflow Automation Rules ({filteredRules.length})
              </h4>
            </div>
            <span className="text-[8px] font-mono text-slate-400 uppercase">
              Condition & Action Engine
            </span>
          </div>

          <div className="space-y-1.5">
            {filteredRules.map((rule, i) => (
              <div
                key={i}
                className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-indigo-300 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-[11px] font-black text-slate-900 dark:text-white truncate">{rule.name}</h5>
                    <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[7.5px] font-black rounded uppercase border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">Event: {rule.triggerEvent}</span>
                    <span>•</span>
                    <span>Condition: {rule.condition || "Always"}</span>
                    <span>•</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">Action: {rule.actionType}</span>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sliders size={11} />
                </div>
              </div>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-[10px] font-bold">
              No workflow rules registered.
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Tab 3: Knowledge SOPs ────────────────────────── */}
      {activeTab === "sops" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <BookOpen size={13} className="text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Corporate Knowledge Articles & Compliance SOPs ({filteredArticles.length})
              </h4>
            </div>
            <span className="text-[8px] font-mono text-slate-400 uppercase">
              Verified Knowledge Base
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredArticles.map((art, i) => (
              <div
                key={i}
                className="bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-xl p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-[11px] font-black text-slate-900 dark:text-white truncate">{art.title}</h5>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-[8px] font-bold uppercase shrink-0">
                    {art.category || "SOP"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                  {art.content}
                </p>
                {art.tags && art.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {art.tags.map((t, tIdx) => (
                      <span key={tIdx} className="px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 text-[8px] font-bold text-slate-500">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-[10px] font-bold">
              No SOP articles found.
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Tab 4: OCR & Document Intelligence ──────────── */}
      {activeTab === "ocr" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-white/5">
            <div>
              <div className="flex items-center gap-1.5">
                <ScanLine size={13} className="text-purple-600" />
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Document Intelligence & OCR Simulator
                </h4>
              </div>
              <p className="text-[9px] font-bold text-slate-400">
                Simulate automated UAE Trade License & TRN field extraction engine
              </p>
            </div>
            <button
              onClick={handleSimulateOcr}
              disabled={ocrRunning}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {ocrRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
              {ocrRunning ? "Parsing Document..." : "Simulate OCR Extraction"}
            </button>
          </div>

          {ocrResult ? (
            <div className="space-y-2.5">
              <span className="text-[8px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
                OCR Parsed Entity Metadata
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(ocrResult.extractedData || {}).map(([key, val]) => (
                  <div key={key} className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10">
                    <span className="text-[7.5px] font-black text-slate-400 uppercase block tracking-wider">
                      {key.replace(/([A-Z])/g, " $1")}
                    </span>
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                      {String(val)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Raw JSON viewer */}
              <details className="mt-2 text-[9px] font-mono text-slate-500">
                <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold select-none hover:underline">
                  View Raw JSON Payload
                </summary>
                <div className="mt-1.5 bg-slate-950 text-emerald-400 p-2.5 rounded-xl border border-slate-800 overflow-x-auto text-[9px]">
                  <pre>{JSON.stringify(ocrResult, null, 2)}</pre>
                </div>
              </details>
            </div>
          ) : (
            <div className="py-6 text-center bg-slate-50/50 dark:bg-white/[0.01] rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <ScanLine size={18} className="text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Ready for Extraction
              </p>
              <p className="text-[8px] text-slate-400 mt-0.5">
                Click "Simulate OCR Extraction" above to test automated parsing of Trade Licenses and TRN numbers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Add Prompt Modal via createPortal ────────────────── */}
      {showPromptModal && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setShowPromptModal(false)}
          />
          <div className="relative z-10 my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">

            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs text-white shrink-0">
                  <FileText size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Deploy Prompt Template
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Standardized LLM instruction templates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePrompt} className="p-4 space-y-3 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Prompt Name *</label>
                <input
                  required
                  value={promptForm.name}
                  onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                  placeholder="e.g. Executive VAT Summary Prompt"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Category</label>
                <select
                  value={promptForm.category}
                  onChange={(e) => setPromptForm({ ...promptForm, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all dark:text-white cursor-pointer"
                >
                  <option value="business">business</option>
                  <option value="email">email</option>
                  <option value="compliance">compliance</option>
                  <option value="support">support</option>
                  <option value="system">system</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Template Text (with variables) *</label>
                <textarea
                  required
                  rows={3}
                  value={promptForm.template}
                  onChange={(e) => setPromptForm({ ...promptForm, template: e.target.value })}
                  placeholder="Summarize compliance filing requirements for {{customerName}} with Trade License {{tradeLicenseNo}}..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-[11px] font-mono outline-none focus:border-indigo-500 transition-all dark:text-white placeholder:text-slate-400 resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Variables (Comma Separated)</label>
                <input
                  value={promptForm.variables}
                  onChange={(e) => setPromptForm({ ...promptForm, variables: e.target.value })}
                  placeholder="customerName, tradeLicenseNo, dueDate"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono outline-none focus:border-indigo-500 transition-all dark:text-white placeholder:text-slate-400"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Save size={13} /> Save Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
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
