import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Code, CheckCircle2, Search, RefreshCw, Copy, Play, X, Key, Plus,
  Download, Database, ShieldCheck, Trash2, Ban, Check, Terminal
} from "lucide-react";
import { api, getApiBase } from "../api/client.js";

const METHOD_FILTERS = ["ALL", "GET", "POST", "PATCH", "PUT", "DELETE"];
const AVAILABLE_SCOPES = ["read", "write", "webhooks", "admin"];

export default function DeveloperPortalCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [apis, setApis] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [apiSearch, setApiSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [schemaSearch, setSchemaSearch] = useState("");
  const [copiedPath, setCopiedPath] = useState("");

  // Try-It-Out Drawer State
  const [tryEndpoint, setTryEndpoint] = useState(null);
  const [pathParamValues, setPathParamValues] = useState({});
  const [queryStr, setQueryStr] = useState("");
  const [authMode, setAuthMode] = useState("session_jwt");
  const [customToken, setCustomToken] = useState("");
  const [bodyJson, setBodyJson] = useState("{\n  \n}");
  const [executing, setExecuting] = useState(false);
  const [tryResult, setTryResult] = useState(null);

  // Schema Detail Modal State
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [fieldSearch, setFieldSearch] = useState("");

  // API Key Creation Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: "", scopes: ["read"], rateLimitLimit: 1000 });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [savingKey, setSavingKey] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [overviewRes, apisRes, keysRes] = await Promise.all([
        api("/api/developer-portal/overview"),
        api("/api/developer-portal/apis"),
        api("/api/developer-portal/api-keys").catch(() => [])
      ]);
      setData(overviewRes || {});
      setApis(Array.isArray(apisRes) ? apisRes : []);
      setApiKeys(Array.isArray(keysRes) ? keysRes : []);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load developer portal data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (text, key = text) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(key);
    setTimeout(() => setCopiedPath(""), 1800);
  };

  const openTryDrawer = (ep) => {
    const initialParams = {};
    (ep.pathParams || []).forEach((p) => {
      initialParams[p] = "";
    });
    setTryEndpoint(ep);
    setPathParamValues(initialParams);
    setQueryStr("");
    setAuthMode(ep.auth === "Public" ? "none" : ep.auth.includes("API Key") ? "api_key" : "session_jwt");
    setCustomToken("");
    setBodyJson(ep.hasBody ? "{\n  \n}" : "");
    setTryResult(null);
  };

  const handleExecuteRequest = async () => {
    if (!tryEndpoint) return;
    setExecuting(true);
    setTryResult(null);

    let resolvedPath = tryEndpoint.path;
    for (const [k, v] of Object.entries(pathParamValues)) {
      resolvedPath = resolvedPath.replace(`:${k}`, encodeURIComponent(v || `:${k}`));
    }
    const cleanQuery = queryStr.trim().replace(/^\?/, "");
    const activeBase = await getApiBase();
    const finalUrl = `${activeBase}${resolvedPath}${cleanQuery ? `?${cleanQuery}` : ""}`;

    const headers = { "Content-Type": "application/json" };
    if (authMode === "session_jwt") {
      const sessionToken = localStorage.getItem("dashboard_token") || localStorage.getItem("token");
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    } else if (authMode === "custom_jwt" && customToken.trim()) {
      headers.Authorization = `Bearer ${customToken.trim()}`;
    } else if (authMode === "api_key" && customToken.trim()) {
      headers["x-api-key"] = customToken.trim();
    }

    const fetchOpts = { method: tryEndpoint.method, headers, credentials: "include" };
    if (tryEndpoint.hasBody && bodyJson.trim()) {
      try {
        JSON.parse(bodyJson);
        fetchOpts.body = bodyJson;
      } catch (parseErr) {
        setExecuting(false);
        setTryResult({
          ok: false,
          status: 0,
          latencyMs: 0,
          body: `Invalid JSON Body: ${parseErr.message}`
        });
        return;
      }
    }

    const t0 = performance.now();
    try {
      const res = await fetch(finalUrl, fetchOpts);
      const latencyMs = Math.max(1, Math.round(performance.now() - t0));
      const rawText = await res.text();
      let formatted = rawText;
      try {
        formatted = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // Keep plain text
      }
      setTryResult({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        latencyMs,
        url: finalUrl,
        body: formatted || "(Empty response body)"
      });
    } catch (err) {
      setTryResult({
        ok: false,
        status: 0,
        statusText: "NETWORK_ERROR",
        latencyMs: Math.round(performance.now() - t0),
        url: finalUrl,
        body: err.message || "Request failed"
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleOpenSchema = async (modelName) => {
    setSchemaLoading(true);
    setFieldSearch("");
    setSelectedSchema({ name: modelName, loading: true });
    try {
      const detail = await api(`/api/developer-portal/schemas/${encodeURIComponent(modelName)}`);
      setSelectedSchema(detail);
    } catch (err) {
      setSelectedSchema({ name: modelName, error: err.message });
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleDownloadOpenApi = async () => {
    try {
      const spec = await api("/api/developer-portal/openapi.json");
      const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jts-crm-openapi-3.0.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Failed to export OpenAPI spec");
    }
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    setSavingKey(true);
    try {
      const created = await api("/api/developer-portal/api-keys", {
        method: "POST",
        body: JSON.stringify(keyForm)
      });
      setNewlyCreatedKey(created);
      setShowKeyModal(false);
      setKeyForm({ name: "", scopes: ["read"], rateLimitLimit: 1000 });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingKey(false);
    }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm("Revoke this API key? Active integrations using it will stop working.")) return;
    try {
      await api(`/api/developer-portal/api-keys/${id}/revoke`, { method: "PATCH" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!confirm("Permanently delete this API key?")) return;
    try {
      await api(`/api/developer-portal/api-keys/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleScope = (scope) => {
    setKeyForm((prev) => {
      const exists = prev.scopes.includes(scope);
      const next = exists ? prev.scopes.filter((s) => s !== scope) : [...prev.scopes, scope];
      return { ...prev, scopes: next.length ? next : ["read"] };
    });
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loading Developer Portal & Engineering Hub...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const schemasList = data?.schemasList || [];
  const envConfigMasked = data?.envConfigMasked || {};
  const metrics = data?.engineeringMetrics || {};

  const filteredApis = apis.filter((a) => {
    if (methodFilter !== "ALL" && a.method !== methodFilter) return false;
    if (!apiSearch) return true;
    const q = apiSearch.toLowerCase();
    return (
      a.path.toLowerCase().includes(q) ||
      (a.description || "").toLowerCase().includes(q) ||
      (a.category || "").toLowerCase().includes(q) ||
      (a.auth || "").toLowerCase().includes(q)
    );
  });

  const filteredSchemas = schemasList.filter((s) => {
    if (!schemaSearch) return true;
    const q = schemaSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.collectionName.toLowerCase().includes(q);
  });

  const filteredFields = (selectedSchema?.fields || []).filter((f) => {
    if (!fieldSearch) return true;
    const q = fieldSearch.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 text-white rounded-xl">
            <Code size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Developer Portal & Engineering Hub</h2>
            <p className="text-[10px] font-medium text-slate-400">
              Live OpenAPI Explorer, Interactive Request Runner, Mongoose Schemas & API Key Vault
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadOpenApi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
            title="Download live OpenAPI 3.0 JSON"
          >
            <Download size={12} /> OpenAPI 3.0
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors w-fit"
            title="Refresh Engineering Metrics"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Compact White Stack Banner */}
      <div className="bg-white text-slate-900 p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">Enterprise Engineering Stack · Admin Only</span>
            <h3 className="text-sm font-black text-slate-900 mt-0.5">JTS CRM Backend Architecture {summary.version || "v1.0.0"}</h3>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase w-fit">
            {summary.productionStatus || "ACTIVE"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px] font-mono">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Build Bundle</span>
            <strong className="text-emerald-600 font-bold">{summary.buildStatus || "-"}</strong>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Registered APIs</span>
            <strong className="text-indigo-600 font-bold">{summary.apiStatus || "-"}</strong>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Database Models</span>
            <strong className="text-emerald-600 font-bold">{summary.dbStatus || "-"}</strong>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[8px] font-black uppercase text-slate-500 block mb-0.5">Runtime Engine</span>
            <strong className="text-sky-600 font-bold">{summary.runtimeStatus || "-"}</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 w-fit gap-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          API Explorer ({apis.length})
        </button>
        <button
          onClick={() => setActiveTab("schemas")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "schemas" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Schema Explorer ({schemasList.length})
        </button>
        <button
          onClick={() => setActiveTab("apikeys")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "apikeys" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          API Keys & Rate Limits ({apiKeys.length})
        </button>
        <button
          onClick={() => setActiveTab("standards")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${
            activeTab === "standards" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Runtime & Environment
        </button>
      </div>

      {/* Sub-Tab 1: Live API Explorer */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide mr-2">Live Express API Catalog</h3>
              {METHOD_FILTERS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border transition-all ${
                    methodFilter === m
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-64">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={apiSearch}
                onChange={(e) => setApiSearch(e.target.value)}
                placeholder="Search endpoints by path, module, auth..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-semibold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Endpoint Path</th>
                  <th className="px-4 py-2.5">Module</th>
                  <th className="px-4 py-2.5">Middleware Auth</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                {filteredApis.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">No API routes matched your filter.</td>
                  </tr>
                ) : (
                  filteredApis.map((apiItem, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${
                          apiItem.method === "GET" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          apiItem.method === "POST" ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                          apiItem.method === "DELETE" ? "bg-rose-50 text-rose-600 border-rose-200" :
                          "bg-amber-50 text-amber-600 border-amber-200"
                        }`}>
                          {apiItem.method}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono font-bold text-slate-900">{apiItem.path}</td>
                      <td className="px-4 py-2 uppercase text-[10px] text-slate-500 font-bold">{apiItem.category}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          apiItem.auth === "Public"
                            ? "bg-slate-50 text-slate-600 border-slate-200"
                            : apiItem.auth.includes("Webhook")
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : apiItem.auth.includes("API Key")
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                          {apiItem.auth}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openTryDrawer(apiItem)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1"
                            title="Interactive Try It Out"
                          >
                            <Play size={10} /> Try
                          </button>
                          <button
                            onClick={() => handleCopy(apiItem.path, `${apiItem.method}-${apiItem.path}`)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-all"
                            title="Copy Path"
                          >
                            {copiedPath === `${apiItem.method}-${apiItem.path}` ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Schema Explorer */}
      {activeTab === "schemas" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="border-b pb-3 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Registered Mongoose Models ({filteredSchemas.length} / {schemasList.length})
              </h3>
              <p className="text-[10px] text-slate-400">Click any model card to inspect full fields, types, enums, references & indexes.</p>
            </div>
            <div className="relative w-full sm:w-60">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={schemaSearch}
                onChange={(e) => setSchemaSearch(e.target.value)}
                placeholder="Filter models or collections..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-semibold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredSchemas.map((s, i) => (
              <button
                key={i}
                onClick={() => handleOpenSchema(s.name)}
                className="text-left bg-slate-50 hover:bg-indigo-50/40 p-3 rounded-xl border border-slate-200/70 hover:border-indigo-300 space-y-1.5 transition-all group"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold text-slate-900 group-hover:text-indigo-700 text-xs truncate">{s.name}</span>
                  <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">{s.collectionName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-1.5 border-t border-slate-200/60">
                  <span>Fields: <strong className="text-slate-800">{s.fieldCount}</strong></span>
                  <span>Indexes: <strong className="text-emerald-600">{s.indexesCount}</strong></span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: API Keys & Rate Limits */}
      {activeTab === "apikeys" && (
        <div className="space-y-3">
          {newlyCreatedKey?.rawKey && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-black text-emerald-900 uppercase">
                  New API Key Created: {newlyCreatedKey.name}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Copy this key now — for security reasons, it will not be shown in full again.
                </p>
                <code className="block bg-white border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-900 break-all">
                  {newlyCreatedKey.rawKey}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(newlyCreatedKey.rawKey, "new-key")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
                >
                  {copiedPath === "new-key" ? <Check size={12} /> : <Copy size={12} />}
                  {copiedPath === "new-key" ? "Copied" : "Copy Key"}
                </button>
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Scoped Developer API Keys</h3>
                <p className="text-[10px] text-slate-400">Manage external API credentials, permission scopes, and hourly rate limits.</p>
              </div>
              <button
                onClick={() => setShowKeyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
              >
                <Plus size={12} /> Generate API Key
              </button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Key size={24} className="mx-auto text-slate-300" />
                <p className="text-xs font-black text-slate-700 uppercase">No Developer API Keys Yet</p>
                <p className="text-[11px] text-slate-400">Generate a scoped API key with custom hourly rate limits for external integrations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Key (Masked)</th>
                      <th className="px-4 py-2.5">Scopes</th>
                      <th className="px-4 py-2.5">Rate Limit</th>
                      <th className="px-4 py-2.5">Usage</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {apiKeys.map((k) => (
                      <tr key={k._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{k.name}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{k.keyMasked}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(k.scopes || ["read"]).map((s) => (
                              <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold uppercase">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{k.rateLimitLimit} / hr</td>
                        <td className="px-4 py-2.5 font-mono text-slate-600">{k.requestCount || 0} reqs</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            k.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                          {k.status === "active" && (
                            <button
                              onClick={() => handleRevokeKey(k._id)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white rounded-lg border border-amber-200 transition-colors"
                              title="Revoke Key"
                            >
                              <Ban size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(k._id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg border border-rose-200 transition-colors"
                            title="Delete Key"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Runtime & Environment */}
      {activeTab === "standards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100">
              Live Engineering Telemetry
            </h3>
            <div className="space-y-2 text-[11px] font-semibold">
              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                <span className="text-slate-600">Registered Express Routes</span>
                <span className="font-black text-indigo-600">{metrics.registeredRoutesCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                <span className="text-slate-600">Mongoose Schemas Loaded</span>
                <span className="font-black text-emerald-600">{metrics.mongooseModelsCount ?? 0}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                <span className="text-slate-600">Backend NPM Dependencies</span>
                <span className="font-black text-slate-900">{metrics.packageDependenciesCount ?? 0} packages</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                <span className="text-slate-600">Express / Mongoose Versions</span>
                <span className="font-mono font-bold text-slate-900">{metrics.expressVersion} / {metrics.mongooseVersion}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                <span className="text-slate-600">V8 Heap Usage</span>
                <span className="font-mono font-bold text-slate-900">{metrics.heapMemoryMb || "-"}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100">
              Masked Server Environment
            </h3>
            <div className="space-y-2 text-[11px] font-mono">
              {Object.entries(envConfigMasked).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500">{k}</span>
                  <span className="font-bold text-slate-900">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Swagger-Style Try-It-Out Request Runner */}
      {tryEndpoint && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setTryEndpoint(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <Terminal size={16} className="text-indigo-600 shrink-0" />
                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase">
                  {tryEndpoint.method}
                </span>
                <code className="text-xs font-mono font-bold text-slate-900 truncate">{tryEndpoint.path}</code>
              </div>
              <button onClick={() => setTryEndpoint(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold uppercase">Module: {tryEndpoint.category}</span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">Detected Auth: {tryEndpoint.auth}</span>
              </div>

              {(tryEndpoint.pathParams || []).length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">Path Parameters</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tryEndpoint.pathParams.map((p) => (
                      <div key={p} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-[11px] font-mono font-bold text-indigo-600">:{p}</span>
                        <input
                          value={pathParamValues[p] || ""}
                          onChange={(e) => setPathParamValues((prev) => ({ ...prev, [p]: e.target.value }))}
                          placeholder={`Enter ${p}...`}
                          className="bg-transparent text-xs font-mono text-slate-900 outline-none flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Query Parameters</label>
                  <input
                    value={queryStr}
                    onChange={(e) => setQueryStr(e.target.value)}
                    placeholder="e.g. limit=10&search=test"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Authentication</label>
                  <select
                    value={authMode}
                    onChange={(e) => setAuthMode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="session_jwt">Use Current Admin Session JWT</option>
                    <option value="custom_jwt">Custom Bearer Token</option>
                    <option value="api_key">Website API Key (x-api-key)</option>
                    <option value="none">No Auth Header</option>
                  </select>
                </div>
              </div>

              {(authMode === "custom_jwt" || authMode === "api_key") && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    {authMode === "api_key" ? "X-API-Key Value" : "Bearer Token"}
                  </label>
                  <input
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="Paste token or API key..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {tryEndpoint.hasBody && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={5}
                    value={bodyJson}
                    onChange={(e) => setBodyJson(e.target.value)}
                    className="w-full bg-slate-950 text-emerald-300 border border-slate-800 rounded-xl p-3 text-xs font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleExecuteRequest}
                  disabled={executing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Play size={13} /> {executing ? "Executing..." : "Execute Live Request"}
                </button>
              </div>

              {tryResult && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        tryResult.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        HTTP {tryResult.status} {tryResult.statusText}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{tryResult.latencyMs}ms</span>
                    </div>
                    <button
                      onClick={() => handleCopy(tryResult.body, "try-res")}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Copy size={11} /> {copiedPath === "try-res" ? "Copied" : "Copy Response"}
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono max-h-60 overflow-auto leading-relaxed">
                    {tryResult.body}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Mongoose Schema Field Inspector */}
      {selectedSchema && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedSchema(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">{selectedSchema.name}</h3>
                {selectedSchema.collectionName && (
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {selectedSchema.collectionName}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedSchema(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {schemaLoading ? (
                <div className="py-12 text-center text-xs font-bold text-slate-400">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-600" />
                  Inspecting Mongoose Schema...
                </div>
              ) : selectedSchema.error ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">{selectedSchema.error}</div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600">
                      {selectedSchema.fieldCount} Fields · {selectedSchema.indexesCount} Indexes
                    </span>
                    <div className="relative w-full sm:w-60">
                      <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Search field or type..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-semibold outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400">
                          <th className="px-3 py-2">Field</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Constraints</th>
                          <th className="px-3 py-2">Ref / Enum / Default</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {filteredFields.map((f) => (
                          <tr key={f.name} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{f.name}</td>
                            <td className="px-3 py-2">
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono font-bold">
                                {f.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 space-x-1">
                              {f.required && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[9px] font-black uppercase">Required</span>}
                              {f.unique && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-black uppercase">Unique</span>}
                              {f.indexed && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black uppercase">Indexed</span>}
                              {!f.required && !f.unique && !f.indexed && <span className="text-slate-400 text-[10px]">Optional</span>}
                            </td>
                            <td className="px-3 py-2 text-[10px] font-mono text-slate-600 space-y-0.5">
                              {f.ref && <div>ref: <strong className="text-indigo-600">{f.ref}</strong></div>}
                              {f.enumValues && <div>enum: [{f.enumValues.join(", ")}]</div>}
                              {f.defaultValue !== null && <div>default: {f.defaultValue}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(selectedSchema.indexes || []).length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-500">MongoDB Compound & Field Indexes</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSchema.indexes.map((idx, idxNum) => (
                          <span key={idxNum} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700">
                            {JSON.stringify(idx.keys)} {idx.unique ? "(unique)" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Generate Developer API Key */}
      {showKeyModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowKeyModal(false)}>
          <form onSubmit={handleCreateApiKey} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" />
                <h3 className="text-xs font-black uppercase text-slate-900">Generate Scoped API Key</h3>
              </div>
              <button type="button" onClick={() => setShowKeyModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Key Name</label>
                <input
                  required
                  value={keyForm.name}
                  onChange={(e) => setKeyForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. ERP Sync Worker Key"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">Permission Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SCOPES.map((sc) => {
                    const active = keyForm.scopes.includes(sc);
                    return (
                      <button
                        type="button"
                        key={sc}
                        onClick={() => toggleScope(sc)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        {sc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Hourly Rate Limit (Requests / Hour)</label>
                <input
                  type="number"
                  min={10}
                  max={1000000}
                  value={keyForm.rateLimitLimit}
                  onChange={(e) => setKeyForm((prev) => ({ ...prev, rateLimitLimit: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  {savingKey ? "Generating..." : "Create API Key"}
                </button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
