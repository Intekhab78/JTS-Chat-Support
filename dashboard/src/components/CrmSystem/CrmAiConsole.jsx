import React, { useState, useEffect } from "react";
import { Cpu, Settings, Award, Terminal, Plus, RefreshCw, Eye, Sparkles, TrendingUp, AlertTriangle, Play } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmAiConsole({ websiteId }) {
  const [prompts, setPrompts] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({ provider: "gemini", modelName: "gemini-1.5-flash", temperature: 0.7, maxTokens: 2048 });
  const [loading, setLoading] = useState(true);

  // Forms
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [promptForm, setPromptForm] = useState({ name: "", category: "general", promptText: "", variablesInput: "" });

  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ name: "", content: "", type: "document" });

  const [testQuery, setTestQuery] = useState("");
  const [testResponse, setTestResponse] = useState(null);
  const [testingAgent, setTestingAgent] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const promptRes = await api(`/api/crm/ai/prompts?websiteId=${websiteId}`);
      setPrompts(promptRes || []);

      const configRes = await api(`/api/crm/ai/config?websiteId=${websiteId}`);
      if (configRes) setConfig(configRes);

      const knowRes = await api(`/api/crm/ai/knowledge?websiteId=${websiteId}`);
      setKnowledge(knowRes || []);

      const logsRes = await api(`/api/crm/ai/usage?websiteId=${websiteId}`);
      setLogs(logsRes || []);
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
    try {
      const res = await api(`/api/crm/ai/config`, {
        method: "POST",
        body: JSON.stringify({ ...config, websiteId })
      });
      alert("AI Model configuration updated.");
      setConfig(res);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    try {
      const variables = promptForm.variablesInput.split(",").map(v => v.trim()).filter(Boolean);
      await api(`/api/crm/ai/prompts`, {
        method: "POST",
        body: JSON.stringify({ ...promptForm, websiteId, variables })
      });
      setShowPromptForm(false);
      setPromptForm({ name: "", category: "general", promptText: "", variablesInput: "" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateKnowledge = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/ai/knowledge`, {
        method: "POST",
        body: JSON.stringify({ ...knowledgeForm, websiteId })
      });
      setShowKnowledgeForm(false);
      setKnowledgeForm({ name: "", content: "", type: "document" });
      fetchData();
    } catch (err) {
      alert(err.message);
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
      alert(err.message);
    } finally {
      setTestingAgent(false);
    }
  };

  const totalCost = logs.reduce((acc, log) => acc + (log.cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Simulation Playgrounds */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-500" /> AI Agent Simulator</h4>
        <form onSubmit={handleRunAgentTest} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask agent, e.g. 'Create a ticket for network downtime' or 'Register a customer lead'..."
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="flex-1 bg-slate-50 border px-4 py-3 rounded-2xl text-xs font-bold"
          />
          <button type="submit" disabled={testingAgent} className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center gap-1">
            {testingAgent ? "Querying..." : <Play size={12} />} Run
          </button>
        </form>

        {testResponse && (
          <div className="bg-slate-50 p-6 rounded-2xl space-y-4 text-xs font-bold text-slate-700 border border-slate-100">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400">Agent LLM Response</span>
              <p className="mt-1 leading-relaxed">{testResponse.text}</p>
            </div>
            {testResponse.actionTaken && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl">
                <span className="text-[9px] font-black uppercase block">Secure Tool Call Executed</span>
                <p className="mt-0.5">Function: {testResponse.actionTaken.status} successfully executed.</p>
              </div>
            )}
            <div className="text-[8px] font-black uppercase text-slate-400 flex gap-4">
              <span>Provider: {testResponse.provider}</span>
              <span>Cost: ${testResponse.cost?.toFixed(5)}</span>
              <span>Latency: {testResponse.latencyMs}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Configurations */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><Settings size={14} className="text-indigo-500" /> LLM Routing Rules</h4>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Provider Driver</label>
              <select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI GPT</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="ollama">Local LLM (Ollama)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Model Name Identifier</label>
              <input value={config.modelName} onChange={(e) => setConfig({ ...config, modelName: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Temperature</label>
                <input type="number" step="0.1" value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Max Tokens</label>
                <input type="number" value={config.maxTokens} onChange={(e) => setConfig({ ...config, maxTokens: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase rounded-2xl transition-all">Update LLM Config</button>
          </form>
        </div>

        {/* Prompt Templates Library */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Terminal size={14} className="text-indigo-500" /> Prompt Library</h4>
            <button onClick={() => setShowPromptForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Plus size={12} /> Add Prompt</button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {prompts.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">Library is empty</p>
            ) : (
              prompts.map(p => (
                <div key={p._id} className="p-3 bg-slate-50/50 border rounded-xl space-y-1 text-xs font-bold text-slate-600">
                  <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                    <span>{p.name}</span>
                    <span>V{p.version}</span>
                  </div>
                  <p className="text-slate-800 truncate">{p.promptText}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RAG Knowledge sources */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Award size={14} className="text-indigo-500" /> RAG Knowledge Index</h4>
            <button onClick={() => setShowKnowledgeForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Plus size={12} /> Index Source</button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {knowledge.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No articles indexed</p>
            ) : (
              knowledge.map(k => (
                <div key={k._id} className="p-3 border rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-800">{k.name}</p>
                    <p className="text-[8px] text-slate-400 uppercase mt-0.5">{k.type} • Semantic Embeddings generated</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Prompts Form Modal */}
      {showPromptForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPromptForm(false)} />
          <form onSubmit={handleCreatePrompt} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Add Prompt Template</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prompt Name</label>
                <input required value={promptForm.name} onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</label>
                <input required value={promptForm.category} onChange={(e) => setPromptForm({ ...promptForm, category: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Prompt System Instructions</label>
              <textarea required value={promptForm.promptText} onChange={(e) => setPromptForm({ ...promptForm, promptText: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold h-24" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Template variables (comma separated)</label>
              <input value={promptForm.variablesInput} onChange={(e) => setPromptForm({ ...promptForm, variablesInput: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Prompt Template</button>
          </form>
        </div>
      )}

      {/* Knowledge Form Modal */}
      {showKnowledgeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowKnowledgeForm(false)} />
          <form onSubmit={handleCreateKnowledge} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Index Knowledge Source</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Document Name</label>
                <input required value={knowledgeForm.name} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Doc Type</label>
                <select value={knowledgeForm.type} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, type: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="faq">FAQ</option>
                  <option value="document">Document</option>
                  <option value="product">Product Details</option>
                  <option value="policy">Corporate Policy</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Text Content</label>
              <textarea required value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold h-32" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Index & Generate Embeddings</button>
          </form>
        </div>
      )}
    </div>
  );
}
