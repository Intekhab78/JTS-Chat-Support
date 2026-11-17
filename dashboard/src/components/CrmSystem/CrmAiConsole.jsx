import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, Award, Terminal, Plus, RefreshCw, Sparkles, Play, X, Cpu, Edit3, Trash2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CrmAiConsole({ websiteId }) {
  const toast = useToast();
  const [prompts, setPrompts] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({ provider: "gemini", modelName: "gemini-1.5-flash", temperature: 0.7, maxTokens: 2048 });
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Forms
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [promptForm, setPromptForm] = useState({ name: "", category: "general", promptText: "", variablesInput: "" });

  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState(null);
  const [knowledgeForm, setKnowledgeForm] = useState({ name: "", content: "", type: "document" });

  const [testQuery, setTestQuery] = useState("");
  const [testResponse, setTestResponse] = useState(null);
  const [testingAgent, setTestingAgent] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promptRes, configRes, knowRes, logsRes] = await Promise.all([
        api(`/api/crm/ai/prompts?websiteId=${websiteId}`).catch(() => []),
        api(`/api/crm/ai/config?websiteId=${websiteId}`).catch(() => null),
        api(`/api/crm/ai/knowledge?websiteId=${websiteId}`).catch(() => []),
        api(`/api/crm/ai/usage?websiteId=${websiteId}`).catch(() => [])
      ]);

      setPrompts(Array.isArray(promptRes) ? promptRes : []);
      if (configRes && configRes.provider) setConfig(configRes);
      setKnowledge(Array.isArray(knowRes) ? knowRes : []);
      setLogs(Array.isArray(logsRes) ? logsRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await api(`/api/crm/ai/config`, {
        method: "POST",
        body: JSON.stringify({ ...config, websiteId })
      });
      toast.success("AI model configuration updated");
      if (res) setConfig(res);
    } catch (err) {
      toast.error(err.message || "Failed to update config");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    try {
      const variables = promptForm.variablesInput.split(",").map(v => v.trim()).filter(Boolean);
      if (editingPromptId) {
        await api(`/api/crm/ai/prompts/${editingPromptId}`, {
          method: "PUT",
          body: JSON.stringify({ ...promptForm, websiteId, variables })
        });
        toast.success("Prompt template updated");
      } else {
        await api(`/api/crm/ai/prompts`, {
          method: "POST",
          body: JSON.stringify({ ...promptForm, websiteId, variables })
        });
        toast.success("Prompt template added");
      }
      setShowPromptForm(false);
      setEditingPromptId(null);
      setPromptForm({ name: "", category: "general", promptText: "", variablesInput: "" });
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save prompt");
    }
  };

  const handleDeletePrompt = async (id) => {
    if (!window.confirm("Delete this prompt template?")) return;
    try {
      await api(`/api/crm/ai/prompts/${id}`, { method: "DELETE" });
      toast.success("Prompt deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete prompt");
    }
  };

  const handleCreateKnowledge = async (e) => {
    e.preventDefault();
    try {
      if (editingKnowledgeId) {
        await api(`/api/crm/ai/knowledge/${editingKnowledgeId}`, {
          method: "PUT",
          body: JSON.stringify({ ...knowledgeForm, websiteId })
        });
        toast.success("Knowledge source updated");
      } else {
        await api(`/api/crm/ai/knowledge`, {
          method: "POST",
          body: JSON.stringify({ ...knowledgeForm, websiteId })
        });
        toast.success("Knowledge source indexed");
      }
      setShowKnowledgeForm(false);
      setEditingKnowledgeId(null);
      setKnowledgeForm({ name: "", content: "", type: "document" });
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save knowledge");
    }
  };

  const handleDeleteKnowledge = async (id) => {
    if (!window.confirm("Delete this knowledge source?")) return;
    try {
      await api(`/api/crm/ai/knowledge/${id}`, { method: "DELETE" });
      toast.success("Knowledge source deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete knowledge source");
    }
  };

  const handleRunAgentTest = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setTestingAgent(true);
    try {
      const res = await api(`/api/crm/ai/query`, {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          queryText: testQuery,
          executeToolCalls: true
        })
      });
      setTestResponse(res);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Agent query failed");
    } finally {
      setTestingAgent(false);
    }
  };

  const totalCost = logs.reduce((acc, log) => acc + Number(log.cost || 0), 0);

  return (
    <div className="space-y-3">
      {/* Compact Top AI Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Cpu size={15} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">AI Platform & Agent Engine</h3>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
              {config.provider} • {config.modelName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[9px] font-extrabold uppercase text-slate-600">
            Runs: {logs.length}
          </span>
          <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[9px] font-extrabold uppercase text-emerald-700">
            Cost: ${totalCost.toFixed(4)}
          </span>
          <span className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[9px] font-extrabold uppercase text-indigo-700">
            Prompts: {prompts.length} • Docs: {knowledge.length}
          </span>
          <button
            type="button"
            onClick={fetchData}
            className="h-7 w-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center cursor-pointer"
            title="Refresh AI Platform Data"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Simulation Playground */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
        <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-indigo-500" /> AI Agent Simulator
        </h4>
        <form onSubmit={handleRunAgentTest} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask agent, e.g. 'Create a ticket for network downtime' or 'Register a customer lead'..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="flex-1 h-8 bg-slate-50 border border-slate-200 px-3 rounded-xl text-[11px] font-semibold text-slate-800 outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={testingAgent}
            className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-[9.5px] font-extrabold uppercase tracking-wider text-white rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <Play size={11} /> {testingAgent ? "Running..." : "Run"}
          </button>
        </form>

        {testResponse && (
          <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-[11px] font-medium text-slate-700 border border-slate-200/80">
            <div>
              <span className="text-[8.5px] font-extrabold uppercase text-slate-400">Agent Response</span>
              <p className="mt-0.5 leading-relaxed text-slate-800">{testResponse.text}</p>
            </div>
            {testResponse.actionTaken && (
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px]">
                <span className="text-[8.5px] font-extrabold uppercase block">Tool Call Executed</span>
                <p>Status: {testResponse.actionTaken.status}</p>
              </div>
            )}
            <div className="text-[8.5px] font-extrabold uppercase text-slate-400 flex gap-3">
              <span>Provider: {testResponse.provider}</span>
              <span>Cost: ${Number(testResponse.cost || 0).toFixed(5)}</span>
              <span>Latency: {testResponse.latencyMs}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* LLM Routing Rules */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center gap-1.5">
            <Settings size={13} className="text-indigo-500" /> LLM Routing Rules
          </h4>
          <form onSubmit={handleSaveConfig} className="space-y-2.5">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Provider Driver</label>
              <select
                value={config.provider}
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full h-8 bg-slate-50 border border-slate-200 px-2.5 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI GPT</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="ollama">Local LLM (Ollama)</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Model Name Identifier</label>
              <input
                value={config.modelName}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                className="w-full h-8 bg-slate-50 border border-slate-200 px-3 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
                  className="w-full h-8 bg-slate-50 border border-slate-200 px-2.5 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: Number(e.target.value) })}
                  className="w-full h-8 bg-slate-50 border border-slate-200 px-2.5 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              {savingConfig ? "Updating…" : "Update LLM Config"}
            </button>
          </form>
        </div>

        {/* Prompt Templates Library */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b pb-2 border-slate-100">
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={13} className="text-indigo-500" /> Prompt Library ({prompts.length})
            </h4>
            <button
              onClick={() => setShowPromptForm(true)}
              className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700 uppercase flex items-center gap-0.5 cursor-pointer"
            >
              <Plus size={11} /> Add Prompt
            </button>
          </div>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-0.5">
            {prompts.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Library is empty</p>
            ) : (
              prompts.map(p => (
                <div
                  key={p._id}
                  onClick={() => setTestQuery(p.promptText || "")}
                  className="p-2.5 bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 rounded-xl space-y-0.5 cursor-pointer transition-colors"
                  title="Click to load into simulator"
                >
                  <div className="flex justify-between items-center text-[8.5px] font-extrabold uppercase text-slate-400 gap-2">
                    <span className="text-indigo-600 truncate">{p.name}</span>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="mr-1">{p.category || "general"} • V{p.version || 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPromptId(p._id);
                          setPromptForm({
                            name: p.name || "",
                            category: p.category || "general",
                            promptText: p.promptText || "",
                            variablesInput: Array.isArray(p.variables) ? p.variables.join(", ") : ""
                          });
                          setShowPromptForm(true);
                        }}
                        className="p-1 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600"
                        title="Edit Prompt"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePrompt(p._id)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Delete Prompt"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10.5px] font-medium text-slate-700 truncate">{p.promptText}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RAG Knowledge Sources */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b pb-2 border-slate-100">
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={13} className="text-indigo-500" /> RAG Knowledge Index ({knowledge.length})
            </h4>
            <button
              onClick={() => setShowKnowledgeForm(true)}
              className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700 uppercase flex items-center gap-0.5 cursor-pointer"
            >
              <Plus size={11} /> Index Source
            </button>
          </div>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-0.5">
            {knowledge.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-wider">No articles indexed</p>
            ) : (
              knowledge.map(k => (
                <div key={k._id} className="p-2.5 border border-slate-200/80 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-extrabold text-slate-900 truncate">{k.name}</p>
                    <p className="text-[8.5px] font-semibold text-slate-400 uppercase mt-0.5">
                      {k.type || "document"} • Indexed
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKnowledgeId(k._id);
                        setKnowledgeForm({
                          name: k.name || "",
                          content: k.content || "",
                          type: k.type || "document"
                        });
                        setShowKnowledgeForm(true);
                      }}
                      className="p-1 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600"
                      title="Edit Knowledge Source"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKnowledge(k._id)}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                      title="Delete Knowledge Source"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Prompts Form Modal */}
      {showPromptForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => { setShowPromptForm(false); setEditingPromptId(null); }} />
          <form onSubmit={handleCreatePrompt} className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3.5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">{editingPromptId ? "Edit Prompt Template" : "Add Prompt Template"}</h3>
              <button type="button" onClick={() => { setShowPromptForm(false); setEditingPromptId(null); }} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={12} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prompt Name</label>
                <input required value={promptForm.name} onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                <input required value={promptForm.category} onChange={(e) => setPromptForm({ ...promptForm, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">System Instructions</label>
              <textarea required value={promptForm.promptText} onChange={(e) => setPromptForm({ ...promptForm, promptText: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-medium h-20 outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Variables (comma separated)</label>
              <input value={promptForm.variablesInput} onChange={(e) => setPromptForm({ ...promptForm, variablesInput: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider cursor-pointer">{editingPromptId ? "Update Prompt" : "Save Prompt"}</button>
          </form>
        </div>,
        document.body
      )}

      {/* Knowledge Form Modal */}
      {showKnowledgeForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => { setShowKnowledgeForm(false); setEditingKnowledgeId(null); }} />
          <form onSubmit={handleCreateKnowledge} className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3.5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">{editingKnowledgeId ? "Edit Knowledge Source" : "Index Knowledge Source"}</h3>
              <button type="button" onClick={() => { setShowKnowledgeForm(false); setEditingKnowledgeId(null); }} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={12} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Document Name</label>
                <input required value={knowledgeForm.name} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Doc Type</label>
                <select value={knowledgeForm.type} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-[11px] font-bold outline-none">
                  <option value="faq">FAQ</option>
                  <option value="document">Document</option>
                  <option value="product">Product Details</option>
                  <option value="policy">Corporate Policy</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Text Content</label>
              <textarea required value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-medium h-24 outline-none" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider cursor-pointer">{editingKnowledgeId ? "Update Source" : "Index Source"}</button>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
