import React, { useState, useEffect } from "react";
import {
  Share2, Key, Globe, Layers, RefreshCw, X, Plus, Save, CheckCircle2, AlertTriangle,
  Zap, Link2, ShieldCheck, Database, HardDrive, MessageSquare, ArrowUpRight
} from "lucide-react";
import { api } from "../api/client.js";

const CATEGORY_TABS = [
  { key: "all", label: "All Connectors" },
  { key: "productivity", label: "Productivity & Email" },
  { key: "storage", label: "Cloud Storage" },
  { key: "communication", label: "Messaging & Meetings" },
  { key: "finance_erp", label: "Finance & ERP" },
  { key: "automation", label: "Webhooks & Zapier" }
];

export default function EnterpriseIntegrationCenter() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [webhookUrlInput, setWebhookUrlInput] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/enterprise-integrations/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load integration hub data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!selectedConnector) return;

    try {
      await api(`/api/enterprise-integrations/connect/${selectedConnector._id}`, {
        method: "POST",
        body: JSON.stringify({
          status: "connected",
          apiKey: apiKeyInput,
          webhookUrl: webhookUrlInput
        })
      });
      setSelectedConnector(null);
      setApiKeyInput("");
      setWebhookUrlInput("");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRetrySync = async (id) => {
    try {
      await api(`/api/enterprise-integrations/retry-sync/${id}`, { method: "POST" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Integration Hub & Connector Architecture...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const connectors = data?.connectors || [];

  const filteredConnectors = connectors.filter(c => {
    if (activeCategory === "all") return true;
    return c.category === activeCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Share2 size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Integration Hub & Connector Catalog</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Third-Party SaaS Connectors, OAuth 2.0 Management, Inbound/Outbound Webhooks & ERP Architecture
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors w-fit"
          title="Refresh Connectors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Primary Integration Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Enterprise Connector Architecture</span>
            <h3 className="text-xl font-black text-white mt-1">Unified OAuth 2.0 & Webhook Event Router</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            Webhooks Health {summary.webhookHealthScore}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Supported Connectors</span>
            <strong className="text-white font-bold">{summary.totalSupportedConnectors} Integrations</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Active Connected</span>
            <strong className="text-emerald-400 font-bold">{summary.connectedCount} Live</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Configured Ready</span>
            <strong className="text-indigo-400 font-bold">{summary.configuredCount} Connectors</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Sync Retry Queue</span>
            <strong className="text-sky-400 font-bold">{summary.totalPendingSync} Queued Items</strong>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit overflow-x-auto">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
              activeCategory === cat.key ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Connector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredConnectors.map((c) => (
          <div key={c._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                  c.status === "connected" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}>
                  {c.status}
                </span>
                <span className="text-[9px] font-mono text-indigo-600 uppercase font-black">{c.authType}</span>
              </div>

              <h4 className="text-sm font-black text-slate-900">{c.connectorName}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category: {c.category.replace(/_/g, " ")}</p>

              {c.lastSyncAt && (
                <p className="text-[10px] font-mono text-slate-500">Last Synced: {new Date(c.lastSyncAt).toLocaleString()}</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedConnector(c)}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase transition-all flex-1 text-center"
              >
                Configure Settings
              </button>

              {c.status === "connected" && (
                <button
                  onClick={() => handleRetrySync(c._id)}
                  className="p-2 bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                  title="Trigger Manual Sync"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedConnector(null)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-600">Connector Credentials Configuration</span>
                <h3 className="text-base font-black text-slate-900">{selectedConnector.connectorName}</h3>
              </div>
              <button onClick={() => setSelectedConnector(null)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">API Key / Secret Token</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter secret token or API key..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Webhook Endpoint URL</label>
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://api.enterprise.com/webhooks/v1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedConnector(null)} className="px-5 py-3 text-slate-500 font-black uppercase text-[10px]">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-indigo-700">
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
