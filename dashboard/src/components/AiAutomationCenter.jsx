import React, { useState, useEffect } from "react";
import {
  Sparkles, Cpu, Layers, BookOpen, FileText, Zap, Play, RefreshCw, X, Plus, Save,
  CheckCircle2, AlertTriangle, ShieldCheck, Search, Filter, HelpCircle, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

export default function AiAutomationCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

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

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise AI & Knowledge Intelligence Center...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const providerAbstraction = data?.providerAbstraction || {};
  const config = data?.config || {};
  const promptTemplates = config?.promptTemplates || [];
  const automationRules = config?.automationRules || [];
  const knowledgeArticles = config?.knowledgeArticles || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl">
              <Sparkles size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">AI Readiness, Automation & Knowledge Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Provider Abstraction Layer, Prompt Library, Workflow Rule Engine & Document Intelligence Interfaces
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh AI Status"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowPromptModal(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add Prompt Template
          </button>
        </div>
      </div>

      {/* AI Readiness Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-8 rounded-3xl border border-indigo-900 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-indigo-900/60">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">Enterprise AI Infrastructure</span>
            <h3 className="text-xl font-black text-white mt-1">LLM & OCR Provider Abstraction Layer</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            {summary.aiReadinessScore}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">LLM Service Layer</span>
            <strong className="text-emerald-400 font-bold">READY (Abstracted)</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">OCR Parser Adapter</span>
            <strong className="text-purple-400 font-bold">READY (Abstracted)</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">PII Data Masking</span>
            <strong className="text-emerald-400 font-bold">ENABLED (Pre-Filter)</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Active Prompts</span>
            <strong className="text-sky-400 font-bold">{summary.promptsCount} Templates</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Prompt Library Templates</span>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">{promptTemplates.length}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">System & Business Prompts</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Workflow Rules</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{automationRules.length}</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Event-Driven Triggers Active</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Knowledge SOP Articles</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{knowledgeArticles.length}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Tax & Compliance SOPs</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">OCR Parsing Engine</span>
          <h3 className="text-2xl font-black text-purple-600 mt-1">READY</h3>
          <p className="text-[10px] font-bold text-purple-600 mt-1">TRN & Trade License Extractor</p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Prompt Library ({promptTemplates.length})
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "automation" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Workflow Automation Engine ({automationRules.length})
        </button>
        <button
          onClick={() => setActiveTab("ocr")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "ocr" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          OCR & Document Intelligence
        </button>
      </div>

      {/* Sub-Tab 1: Prompt Library */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Prompt Library & Templates</h3>
            <button
              onClick={() => setShowPromptModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Prompt
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {promptTemplates.map((p, i) => (
              <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">{p.name}</span>
                  <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-200">
                    {p.category}
                  </span>
                </div>
                <p className="text-xs font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-700">{p.template}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Workflow Automation */}
      {activeTab === "automation" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" /> Event-Driven Workflow Automation Rules
          </h3>

          <div className="space-y-3">
            {automationRules.map((rule, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-xs">{rule.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Trigger: {rule.triggerEvent} | Action: {rule.actionType}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-[9px] font-black uppercase">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: OCR & Document Intelligence */}
      {activeTab === "ocr" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4 border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Document Intelligence & OCR Extractor Simulator</h3>
              <p className="text-[10px] text-slate-400 font-bold">Simulate automated Trade License & TRN field extraction</p>
            </div>
            <button
              onClick={handleSimulateOcr}
              disabled={ocrRunning}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {ocrRunning ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              {ocrRunning ? "Parsing Document..." : "Simulate OCR Extraction"}
            </button>
          </div>

          {ocrResult && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs animate-in zoom-in-95 duration-200">
              <span className="text-[9px] font-black uppercase text-purple-400 block">OCR Parser Output (Parsed Mock Response)</span>
              <pre className="text-emerald-400 whitespace-pre-wrap">{JSON.stringify(ocrResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPromptModal(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Configure Prompt Template
              </h3>
              <button onClick={() => setShowPromptModal(false)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePrompt} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Prompt Name *</label>
                <input
                  required
                  value={promptForm.name}
                  onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                  placeholder="e.g. Executive VAT Summary Prompt"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Prompt Template Text *</label>
                <textarea
                  required
                  rows={3}
                  value={promptForm.template}
                  onChange={(e) => setPromptForm({ ...promptForm, template: e.target.value })}
                  placeholder="Summarize compliance filing status for {{customerName}}..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowPromptModal(false)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
