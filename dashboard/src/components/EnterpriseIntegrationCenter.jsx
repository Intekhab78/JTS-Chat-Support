import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Webhook, RefreshCw, X, Plus, Search, Power, Send, Copy, Check,
  Trash2, Eye, EyeOff, RotateCcw, Activity, ArrowDownLeft, ArrowUpRight, ShieldCheck, Zap
} from "lucide-react";
import { api, API_BASE } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const SUB_TABS = [
  { key: "endpoints", label: "Outbound Endpoints" },
  { key: "logs", label: "Delivery Logs" },
  { key: "inbound", label: "Inbound Receiver" },
  { key: "platform", label: "Platform Channels" }
];

const FALLBACK_EVENTS = [
  "ticket.created",
  "ticket.resolved",
  "lead.created",
  "deal.won",
  "invoice.paid",
  "chat.started",
  "customer.created"
];

export default function EnterpriseIntegrationCenter({ websiteId }) {
  const { showToast } = useToast() || {};
  const [activeTab, setActiveTab] = useState("endpoints");
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal state (null = closed, "new" = create, object = edit)
  const [modalEndpoint, setModalEndpoint] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedEvents, setSelectedEvents] = useState(["ticket.created", "lead.created", "invoice.paid"]);
  const [saving, setSaving] = useState(false);

  // Utility states
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [copiedId, setCopiedId] = useState("");
  const [testingId, setTestingId] = useState("");
  const [retryingId, setRetryingId] = useState("");
  const [inboundTestingId, setInboundTestingId] = useState("");
  const [pingResults, setPingResults] = useState({});

  const notify = (msg, type = "success") => {
    if (showToast) showToast(msg, type);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api(`/api/enterprise-integrations/overview${websiteId ? `?websiteId=${websiteId}` : ""}`);
      setData(res || {});
    } catch (err) {
      setErrorMsg(err.message || "Failed to load webhook hub.");
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  useEffect(() => {
    if (!modalEndpoint) return;
    if (modalEndpoint === "new") {
      setNameInput("");
      setDescInput("");
      setWebhookUrlInput("");
      setApiKeyInput("");
      setSelectedEvents(["ticket.created", "lead.created", "invoice.paid"]);
    } else {
      setNameInput(modalEndpoint.connectorName || "");
      setDescInput(modalEndpoint.settings?.description || "");
      setWebhookUrlInput(modalEndpoint.settings?.webhookUrl || "");
      setApiKeyInput("");
      setSelectedEvents(
        Array.isArray(modalEndpoint.settings?.events) && modalEndpoint.settings.events.length > 0
          ? modalEndpoint.settings.events
          : ["ticket.created", "lead.created"]
      );
    }

    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setModalEndpoint(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalEndpoint]);

  const copyText = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(key);
    notify("Copied to clipboard");
    setTimeout(() => setCopiedId(""), 1800);
  };

  const toggleEvent = (evt) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  };

  const handleSaveEndpoint = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalEndpoint === "new") {
        await api("/api/enterprise-integrations/webhooks", {
          method: "POST",
          body: JSON.stringify({
            connectorName: nameInput,
            description: descInput,
            webhookUrl: webhookUrlInput,
            apiKey: apiKeyInput || undefined,
            events: selectedEvents
          })
        });
        notify("Webhook endpoint created");
      } else {
        await api(`/api/enterprise-integrations/connect/${modalEndpoint._id}`, {
          method: "POST",
          body: JSON.stringify({
            status: webhookUrlInput.trim() ? "connected" : "disconnected",
            connectorName: nameInput,
            description: descInput,
            webhookUrl: webhookUrlInput,
            apiKey: apiKeyInput || undefined,
            events: selectedEvents
          })
        });
        notify("Webhook endpoint updated");
      }
      setModalEndpoint(null);
      fetchData();
    } catch (err) {
      notify(err.message || "Failed to save webhook", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateSecret = async (endpoint) => {
    if (!confirm(`Regenerate signing secret for "${endpoint.connectorName}"? Existing receivers will need the new secret.`)) return;
    try {
      await api(`/api/enterprise-integrations/connect/${endpoint._id}`, {
        method: "POST",
        body: JSON.stringify({ regenerateSecret: true })
      });
      notify("Signing secret regenerated");
      fetchData();
    } catch (err) {
      notify(err.message || "Failed to regenerate secret", "error");
    }
  };

  const handleDisconnect = async (endpoint) => {
    const nextStatus = endpoint.status === "connected" ? "disconnected" : "connected";
    try {
      await api(`/api/enterprise-integrations/connect/${endpoint._id}`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus })
      });
      notify(nextStatus === "connected" ? "Webhook enabled" : "Webhook paused");
      fetchData();
    } catch (err) {
      notify(err.message || "Failed to update status", "error");
    }
  };

  const handleDelete = async (endpoint) => {
    if (!confirm(`Delete webhook "${endpoint.connectorName}"?`)) return;
    try {
      await api(`/api/enterprise-integrations/webhooks/${endpoint._id}`, { method: "DELETE" });
      notify("Webhook endpoint deleted");
      fetchData();
    } catch (err) {
      notify(err.message || "Failed to delete webhook", "error");
    }
  };

  const showPingResult = (endpointId, result) => {
    setPingResults((prev) => ({ ...prev, [endpointId]: result }));
    setTimeout(() => {
      setPingResults((prev) => {
        const next = { ...prev };
        delete next[endpointId];
        return next;
      });
    }, 3000);
  };

  const handleTestPing = async (endpoint) => {
    setTestingId(endpoint._id);
    try {
      const eventType = endpoint.settings?.events?.[0] || "webhook.test";
      const res = await api(`/api/enterprise-integrations/test/${endpoint._id}`, {
        method: "POST",
        body: JSON.stringify({ eventType })
      });
      showPingResult(endpoint._id, {
        ok: Boolean(res?.ok),
        httpStatus: res?.httpStatus,
        latencyMs: res?.latencyMs,
        error: res?.error,
        responseSnippet: res?.responseSnippet
      });
      if (res?.ok) {
        notify(`Delivered HTTP ${res.httpStatus} (${res.latencyMs}ms)`);
      } else {
        notify(res?.error || `Delivery failed (HTTP ${res?.httpStatus || "ERR"})`, "error");
      }
      fetchData();
    } catch (err) {
      showPingResult(endpoint._id, {
        ok: false,
        error: err.message || "Test delivery failed"
      });
      notify(err.message || "Test delivery failed", "error");
    } finally {
      setTestingId("");
    }
  };

  const handleRetry = async (connectorId, deliveryId = null) => {
    const key = deliveryId || connectorId;
    setRetryingId(key);
    try {
      const res = await api(`/api/enterprise-integrations/retry-sync/${connectorId}`, {
        method: "POST",
        body: JSON.stringify(deliveryId ? { deliveryId } : {})
      });
      notify(`Retry complete: ${res?.succeeded || 0} succeeded, ${res?.failed || 0} failed`, res?.failed > 0 ? "error" : "success");
      fetchData();
    } catch (err) {
      notify(err.message || "Retry failed", "error");
    } finally {
      setRetryingId("");
    }
  };

  const handleTestInbound = async (endpoint) => {
    setInboundTestingId(endpoint._id);
    try {
      const base = API_BASE || window.location.origin;
      const url = `${base}/api/enterprise-integrations/inbound/${endpoint._id}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": endpoint.settings?.signingSecret || "",
          "X-JTS-Event": "inbound.test_ping"
        },
        body: JSON.stringify({
          event: "inbound.test_ping",
          source: "JTS Integration Hub Console",
          timestamp: new Date().toISOString()
        })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.message || `HTTP ${resp.status}`);
      notify("Inbound test event received & logged");
      fetchData();
    } catch (err) {
      notify(err.message || "Inbound test failed", "error");
    } finally {
      setInboundTestingId("");
    }
  };

  if (loading && !data) {
    return (
      <div className="py-12 text-center">
        <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loading Webhook Integration Hub...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const connectors = data?.connectors || [];
  const deliveryLogs = data?.deliveryLogs || [];
  const platformWebhooks = data?.platformWebhooks || [];
  const availableEvents = data?.availableEvents || FALLBACK_EVENTS;
  const baseApiUrl = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");

  const filteredEndpoints = connectors.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.connectorName || "").toLowerCase().includes(q) ||
      (c.settings?.webhookUrl || "").toLowerCase().includes(q) ||
      (c.settings?.description || "").toLowerCase().includes(q)
    );
  });

  const filteredLogs = deliveryLogs.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.connectorName || "").toLowerCase().includes(q) ||
      (l.eventType || "").toLowerCase().includes(q) ||
      (l.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Webhook size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Webhook Integration Hub</h2>
            <p className="text-[10px] font-medium text-slate-400">
              HMAC-SHA256 Signed Outbound Webhooks, Inbound Receivers & Delivery Logs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalEndpoint("new")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs transition-colors"
          >
            <Plus size={12} /> Add Endpoint
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Compact 4-Card KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white text-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Active Endpoints</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <strong className="text-base font-black text-emerald-600">{summary.connectedCount ?? 0}</strong>
            <span className="text-[10px] font-mono text-slate-400">/ {connectors.length} total</span>
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Webhook Health</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <strong className="text-base font-black text-slate-900">{summary.webhookHealthScore || "—"}</strong>
            <span className="text-[10px] font-bold text-emerald-600">SLA</span>
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Delivered OK</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <strong className="text-base font-black text-indigo-600">{summary.totalSynced ?? 0}</strong>
            <span className="text-[10px] font-bold text-slate-400">HTTP 2xx</span>
          </div>
        </div>

        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Failed / Retry Queue</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <strong className={`text-base font-black ${(summary.totalPendingSync || 0) > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {summary.totalPendingSync ?? 0}
            </strong>
            <span className="text-[10px] font-bold text-slate-400">Pending</span>
          </div>
        </div>
      </div>

      {/* Compact Sub-Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 p-1 bg-slate-100/80 border border-slate-200/70 rounded-lg w-fit">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === t.key
                  ? "bg-white text-indigo-600 shadow-xs border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
              {t.key === "logs" && deliveryLogs.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded text-[9px]">
                  {deliveryLogs.length}
                </span>
              )}
              {t.key === "platform" && platformWebhooks.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded text-[9px]">
                  {platformWebhooks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "logs" ? "Filter logs or event..." : "Search endpoints..."}
            className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1 text-[11px] font-semibold outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TAB 1: OUTBOUND ENDPOINTS */}
      {activeTab === "endpoints" && (
        <div className="space-y-2.5">
          {filteredEndpoints.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <Webhook size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-black text-slate-700 uppercase">No Webhook Endpoints Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Add Endpoint" to register an outbound HTTP webhook.</p>
            </div>
          ) : (
            filteredEndpoints.map((ep) => {
              const secret = ep.settings?.signingSecret || "";
              const isRevealed = Boolean(revealedSecrets[ep._id]);
              const failedCount = (ep.syncQueue || []).filter((q) => q.status === "failed" || q.status === "pending").length;
              const events = ep.settings?.events || [];

              return (
                <div key={ep._id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          ep.status === "connected"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {ep.status === "connected" ? "Active" : "Paused"}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 truncate">{ep.connectorName}</h4>
                        {ep.lastSyncAt && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Last activity: {new Date(ep.lastSyncAt).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {ep.settings?.description && (
                        <p className="text-[11px] text-slate-500">{ep.settings.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-700 truncate max-w-md">
                          {ep.settings?.webhookUrl || "No target URL configured yet"}
                        </span>
                        {ep.settings?.webhookUrl && (
                          <button
                            onClick={() => copyText(ep.settings.webhookUrl, `url-${ep._id}`)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Copy URL"
                          >
                            {copiedId === `url-${ep._id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleTestPing(ep)}
                        disabled={!ep.settings?.webhookUrl || testingId === ep._id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white disabled:opacity-40 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      >
                        <Send size={11} /> {testingId === ep._id ? "Pinging..." : "Test Ping"}
                      </button>

                      {failedCount > 0 && (
                        <button
                          onClick={() => handleRetry(ep._id)}
                          disabled={retryingId === ep._id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                        >
                          <RotateCcw size={11} /> Retry ({failedCount})
                        </button>
                      )}

                      <button
                        onClick={() => setModalEndpoint(ep)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      >
                        Configure
                      </button>

                      <button
                        onClick={() => handleDisconnect(ep)}
                        disabled={!ep.settings?.webhookUrl}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                          ep.status === "connected"
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                        }`}
                        title={ep.status === "connected" ? "Pause Webhook" : "Enable Webhook"}
                      >
                        <Power size={12} />
                      </button>

                      {connectors.length > 1 && (
                        <button
                          onClick={() => handleDelete(ep)}
                          className="p-1.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Endpoint"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline 3-second Test Ping Result Box */}
                  {pingResults[ep._id] && (
                    <div className={`px-3 py-2 rounded-lg border text-[11px] font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
                      pingResults[ep._id].ok
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-black">{pingResults[ep._id].ok ? "✓" : "✕"}</span>
                        <span className="truncate">
                          {pingResults[ep._id].ok
                            ? `Payload delivered successfully (HTTP ${pingResults[ep._id].httpStatus} • ${pingResults[ep._id].latencyMs}ms)`
                            : `Delivery failed: ${pingResults[ep._id].error || `HTTP ${pingResults[ep._id].httpStatus || "ERR"}`}`}
                        </span>
                      </div>
                      <button
                        onClick={() => setPingResults((prev) => {
                          const next = { ...prev };
                          delete next[ep._id];
                          return next;
                        })}
                        className="opacity-60 hover:opacity-100 shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {/* Bottom Meta Row: Signing Secret + Subscribed Events */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 mr-1">Events:</span>
                      {events.length > 0 ? events.map((ev) => (
                        <span key={ev} className="px-1.5 py-0.5 bg-indigo-50/70 text-indigo-700 border border-indigo-100 rounded text-[9px] font-mono font-semibold">
                          {ev}
                        </span>
                      )) : (
                        <span className="text-[10px] text-slate-400">All events</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 w-fit">
                      <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                      <span className="text-slate-500">Secret:</span>
                      <span className="text-slate-800 font-bold">
                        {isRevealed ? (secret || "Not set") : (ep.settings?.apiKeyMasked || "••••••••")}
                      </span>
                      {secret && (
                        <>
                          <button
                            onClick={() => setRevealedSecrets((prev) => ({ ...prev, [ep._id]: !prev[ep._id] }))}
                            className="text-slate-400 hover:text-slate-700 ml-1"
                            title={isRevealed ? "Hide" : "Reveal"}
                          >
                            {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => copyText(secret, `sec-${ep._id}`)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Copy Secret"
                          >
                            {copiedId === `sec-${ep._id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleRegenerateSecret(ep)}
                        className="text-[9px] font-sans font-bold text-indigo-600 hover:underline ml-1"
                      >
                        Rotate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: DELIVERY LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center">
              <Activity size={22} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-black text-slate-700 uppercase">No Webhook Deliveries Recorded Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Configure an endpoint and click "Test Ping" or trigger an inbound webhook.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Direction</th>
                    <th className="py-2 px-3">Endpoint</th>
                    <th className="py-2 px-3">Event</th>
                    <th className="py-2 px-3">HTTP</th>
                    <th className="py-2 px-3">Latency</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Detail</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {log.queuedAt ? new Date(log.queuedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.direction === "inbound"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}>
                          {log.direction === "inbound" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {log.direction || "outbound"}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800">{log.connectorName}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-indigo-600">{log.eventType}</td>
                      <td className="py-2 px-3 font-mono text-[10px] font-bold">
                        {log.httpStatus ? (
                          <span className={log.httpStatus >= 200 && log.httpStatus < 300 ? "text-emerald-600" : "text-rose-600"}>
                            {log.httpStatus}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                        {log.latencyMs != null ? `${log.latencyMs}ms` : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                          log.status === "synced"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : log.status === "failed"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px] text-slate-500 max-w-xs truncate font-mono" title={log.lastError || log.responseSnippet}>
                        {log.lastError || log.responseSnippet || "OK"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {log.direction !== "inbound" && log.status !== "synced" && (
                          <button
                            onClick={() => handleRetry(log.connectorId, log._id)}
                            disabled={retryingId === log._id}
                            className="px-2 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded text-[9px] font-bold uppercase transition-colors"
                          >
                            {retryingId === log._id ? "..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INBOUND RECEIVER */}
      {activeTab === "inbound" && (
        <div className="space-y-3">
          {connectors.map((ep) => {
            const inboundUrl = `${baseApiUrl}/api/enterprise-integrations/inbound/${ep._id}`;
            const secret = ep.settings?.signingSecret || "";
            const curlCmd = `curl -X POST "${inboundUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Webhook-Secret: ${secret}" \\\n  -H "X-JTS-Event: crm.lead_sync" \\\n  -d '{"event":"crm.lead_sync","leadName":"Acme Corp"}'`;

            return (
              <div key={ep._id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{ep.connectorName} — Inbound Receiver</h4>
                    <p className="text-[10px] text-slate-400">External systems can POST JSON payloads directly to this endpoint using your signing secret.</p>
                  </div>
                  <button
                    onClick={() => handleTestInbound(ep)}
                    disabled={inboundTestingId === ep._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors w-fit"
                  >
                    <ArrowDownLeft size={12} /> {inboundTestingId === ep._id ? "Sending..." : "Send Test Inbound Event"}
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-[11px]">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black">POST</span>
                  <span className="text-slate-700 truncate flex-1">{inboundUrl}</span>
                  <button onClick={() => copyText(inboundUrl, `in-${ep._id}`)} className="text-slate-400 hover:text-indigo-600">
                    {copiedId === `in-${ep._id}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase text-slate-400">Sample cURL Request</span>
                    <button onClick={() => copyText(curlCmd, `curl-${ep._id}`)} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      {copiedId === `curl-${ep._id}` ? <Check size={11} /> : <Copy size={11} />} Copy cURL
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed">
                    {curlCmd}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: PLATFORM CHANNELS (STRIPE, RAZORPAY, WHATSAPP) */}
      {activeTab === "platform" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {platformWebhooks.map((pw) => {
            const fullUrl = `${baseApiUrl}${pw.endpointPath}`;
            return (
              <div key={pw.key} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      pw.configured
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : pw.partial
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {pw.configured ? "Configured" : pw.partial ? "Partial / Fallback" : "Keys Missing"}
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase text-indigo-600">{pw.key}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900">{pw.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{pw.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-[10px]">
                    <span className="text-slate-700 truncate flex-1" title={fullUrl}>{fullUrl}</span>
                    <button onClick={() => copyText(fullUrl, `pw-${pw.key}`)} className="text-slate-400 hover:text-indigo-600 shrink-0" title="Copy Webhook URL">
                      {copiedId === `pw-${pw.key}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Environment Keys</span>
                    {pw.envChecks.map((ec) => (
                      <div key={ec.key} className="flex items-center justify-between text-[10px] font-mono bg-slate-50/70 px-2 py-1 rounded border border-slate-100">
                        <span className="text-slate-600 truncate">{ec.key}</span>
                        <span className={`font-bold ${ec.set ? "text-emerald-600" : "text-amber-600"}`}>
                          {ec.set ? "SET" : (ec.fallbackNote || "MISSING")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                  {pw.events.map((ev) => (
                    <span key={ev} className="px-1.5 py-0.5 bg-indigo-50/70 text-indigo-700 border border-indigo-100 rounded text-[9px] font-mono font-semibold">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalEndpoint && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setModalEndpoint(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl space-y-3.5 z-10">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-indigo-600 block">
                  {modalEndpoint === "new" ? "New Webhook Endpoint" : "Configure Webhook Endpoint"}
                </span>
                <h3 className="text-xs font-black text-slate-900">
                  {modalEndpoint === "new" ? "Create Outbound & Inbound Webhook" : modalEndpoint.connectorName}
                </h3>
              </div>
              <button onClick={() => setModalEndpoint(null)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEndpoint} className="space-y-3 text-xs">
              {modalEndpoint !== "new" && modalEndpoint?.connectorKey === "jts_meet" && (
                <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-indigo-600" />
                    <span className="text-[10px] font-black uppercase text-indigo-700">JTS Meet Helper</span>
                    <a
                      href="https://meet.jtsmiddleeast.com/#admin"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      Admin <ArrowUpRight size={11} />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
                      const defaultUrl = isLocal ? "http://localhost:4000/api/integrations/webhook" : "https://meet.jtsmiddleeast.com/api/integrations/webhook";
                      setWebhookUrlInput(defaultUrl);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase"
                  >
                    Auto Fill JTS Meet URL
                  </button>
                </div>
              )}

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Endpoint Name *</label>
                <input
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. CRM Lead Sync Webhook"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Description</label>
                <input
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Optional note about where these events go..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Target Outbound URL</label>
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://your-server.com/api/webhooks/jts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                  Signing Secret (Optional — auto-generated if blank)
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={modalEndpoint !== "new" ? "Leave blank to keep existing secret" : "whsec_... (optional)"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1.5">Subscribed Events</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableEvents.map((evt) => {
                    const active = selectedEvents.includes(evt);
                    return (
                      <button
                        type="button"
                        key={evt}
                        onClick={() => toggleEvent(evt)}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        {evt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEndpoint(null)}
                  className="px-3.5 py-1.5 text-slate-500 hover:text-slate-800 font-bold uppercase text-[10px] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : modalEndpoint === "new" ? "Create Endpoint" : "Save & Connect"}
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
