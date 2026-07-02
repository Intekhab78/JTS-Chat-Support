import React, { useState, useEffect } from "react";
import { Terminal, Plus, ShieldCheck, Key, Globe, Activity, RefreshCw, Layers, CheckCircle, XCircle } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmDeveloperConsole({ websiteId }) {
  const [keys, setKeys] = useState([]);
  const [apps, setApps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: "Primary Integration Key" });

  const [showAppForm, setShowAppForm] = useState(false);
  const [appForm, setAppForm] = useState({ name: "", redirectUri: "https://localhost:8080/callback", scopeInput: "crm:read" });

  const [testWebhook, setTestWebhook] = useState({ url: "", eventName: "lead_created" });
  const [triggeringWebhook, setTriggeringWebhook] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const keysRes = await api(`/api/crm/integration/keys?websiteId=${websiteId}`);
      setKeys(keysRes || []);

      const appsRes = await api(`/api/crm/integration/oauth?websiteId=${websiteId}`);
      setApps(appsRes || []);

      const logsRes = await api(`/api/crm/integration/webhooks?websiteId=${websiteId}`);
      setLogs(logsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) fetchData();
  }, [websiteId]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const newKey = await api(`/api/crm/integration/keys`, {
        method: "POST",
        body: JSON.stringify({ name: keyForm.name, websiteId })
      });
      alert(`API Key Generated: ${newKey.key}\nKeep this safe! It won't be shown again.`);
      setShowKeyForm(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRevokeKey = async (id) => {
    try {
      await api(`/api/crm/integration/keys/revoke/${id}`, { method: "POST" });
      alert("API Key revoked successfully.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    try {
      const scopes = appForm.scopeInput.split(",").map(s => s.trim()).filter(Boolean);
      await api(`/api/crm/integration/oauth`, {
        method: "POST",
        body: JSON.stringify({ name: appForm.name, redirectUri: appForm.redirectUri, scopes, websiteId })
      });
      setShowAppForm(false);
      setAppForm({ name: "", redirectUri: "https://localhost:8080/callback", scopeInput: "crm:read" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTriggerTestWebhook = async (e) => {
    e.preventDefault();
    if (!testWebhook.url.trim()) return;

    setTriggeringWebhook(true);
    try {
      await api(`/api/crm/integration/webhooks/trigger`, {
        method: "POST",
        body: JSON.stringify({ ...testWebhook, websiteId })
      });
      alert("Sandbox Outbound Signed Webhook dispatched successfully!");
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setTriggeringWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5"><Terminal size={14} className="text-indigo-500" /> Developer Hub</h3>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Developer Platform Console</span>
      </div>

      {/* Sandbox Test */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5"><Activity size={14} className="text-indigo-500" /> Webhook Sandbox Tester</h4>
        <form onSubmit={handleTriggerTestWebhook} className="flex gap-2">
          <input
            required
            type="url"
            placeholder="Payload Dispatch URL e.g. https://webhook.site/..."
            value={testWebhook.url}
            onChange={(e) => setTestWebhook({ ...testWebhook, url: e.target.value })}
            className="flex-1 bg-slate-50 border px-4 py-3 rounded-2xl text-xs font-bold"
          />
          <select value={testWebhook.eventName} onChange={(e) => setTestWebhook({ ...testWebhook, eventName: e.target.value })} className="bg-slate-50 border px-4 py-3 rounded-2xl text-xs font-bold">
            <option value="lead_created">Lead Created</option>
            <option value="deal_won">Deal Won</option>
            <option value="invoice_paid">Invoice Paid</option>
          </select>
          <button type="submit" disabled={triggeringWebhook} className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center gap-1">
            {triggeringWebhook ? "Firing..." : "Trigger Hub"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Key size={14} className="text-indigo-500" /> API Keys Registry</h4>
            <button onClick={() => setShowKeyForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-0.5"><Plus size={12} /> Add Key</button>
          </div>
          <div className="space-y-3">
            {keys.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No active API keys</p>
            ) : (
              keys.map(k => (
                <div key={k._id} className="p-4 border rounded-2xl flex justify-between items-center text-xs font-bold">
                  <div>
                    <p className="text-[10px] font-black text-slate-800">{k.name}</p>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5">Key: {k.key.slice(0, 15)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${k.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{k.status}</span>
                    {k.status === "active" && (
                      <button onClick={() => handleRevokeKey(k._id)} className="text-rose-500 hover:text-rose-600">Revoke</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* OAuth Apps */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5"><Layers size={14} className="text-indigo-500" /> OAuth Apps</h4>
            <button onClick={() => setShowAppForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-0.5"><Plus size={12} /> Add App</button>
          </div>
          <div className="space-y-3">
            {apps.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No client apps registered</p>
            ) : (
              apps.map(a => (
                <div key={a._id} className="p-4 border rounded-2xl space-y-2 text-xs font-bold">
                  <div className="flex justify-between">
                    <h5 className="text-[10px] font-black text-slate-800">{a.name}</h5>
                    <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{a.scopes.join(", ")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-mono">
                    <p>Client ID: {a.clientId}</p>
                    <p>Redirect: {a.redirectUri}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Webhooks logs */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5"><Globe size={14} className="text-indigo-500" /> Webhook Deliveries</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-slate-600">
            <thead>
              <tr className="border-b text-[8px] font-black uppercase text-slate-400">
                <th className="py-2">Event</th>
                <th className="py-2">Target URL</th>
                <th className="py-2 text-center">Status</th>
                <th className="py-2 text-center">Status Code</th>
                <th className="py-2 text-right font-mono">Latency</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400 text-[10px] font-black uppercase">No webhook deliveries audited</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 font-mono">{log.eventName}</td>
                    <td className="py-3 text-slate-400">{log.url}</td>
                    <td className="py-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${log.status === "sent" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-center">{log.httpStatus}</td>
                    <td className="py-3 text-right text-indigo-600">{log.latencyMs}ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Modal */}
      {showKeyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowKeyForm(false)} />
          <form onSubmit={handleCreateKey} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Generate API Key</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Key Label Name</label>
              <input required value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Generate Live Key</button>
          </form>
        </div>
      )}

      {/* OAuth App Modal */}
      {showAppForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAppForm(false)} />
          <form onSubmit={handleCreateApp} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Register Client App</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">App Name</label>
              <input required value={appForm.name} onChange={(e) => setAppForm({ ...appForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">OAuth Redirect Callback URI</label>
              <input required value={appForm.redirectUri} onChange={(e) => setAppForm({ ...appForm, redirectUri: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scopes (comma-separated)</label>
              <input value={appForm.scopeInput} onChange={(e) => setAppForm({ ...appForm, scopeInput: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Register Client</button>
          </form>
        </div>
      )}
    </div>
  );
}
