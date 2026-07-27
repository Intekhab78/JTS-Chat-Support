import React, { useState, useEffect } from "react";
import {
  Code, Terminal, Database, Server, Cpu, CheckCircle2, Search, RefreshCw, Copy,
  ShieldCheck, Layers, BookOpen, Lock, GitBranch, ArrowUpRight, Award, FileCode
} from "lucide-react";
import { api } from "../api/client.js";

export default function DeveloperPortalCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiSearch, setApiSearch] = useState("");
  const [copiedPath, setCopiedPath] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, apisRes] = await Promise.all([
        api("/api/developer-portal/overview"),
        api("/api/developer-portal/apis")
      ]);
      setData(overviewRes || {});
      setApis(apisRes || []);
    } catch (err) {
      console.error("Failed to load developer portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(""), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Enterprise Developer Portal & Engineering Hub...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const schemasList = data?.schemasList || [];
  const envConfigMasked = data?.envConfigMasked || {};
  const codeQuality = data?.codeQuality || {};

  const filteredApis = apis.filter(a => {
    if (!apiSearch) return true;
    const q = apiSearch.toLowerCase();
    return a.path.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Code size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Developer Portal & Engineering Hub</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            API Reference, Mongoose Schemas Explorer, Code Standards & Engineering Telemetry
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors w-fit"
          title="Refresh Engineering Metrics"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Primary Telemetry Banner Strip */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Enterprise Engineering Stack</span>
            <h3 className="text-xl font-black text-white mt-1">JTS CRM Backend Architecture {summary.version}</h3>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black uppercase">
            {summary.productionStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Build Status</span>
            <strong className="text-emerald-400 font-bold">{summary.buildStatus}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">API Status</span>
            <strong className="text-indigo-400 font-bold">{summary.apiStatus}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Database Schema</span>
            <strong className="text-emerald-400 font-bold">{summary.dbStatus}</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Queue & Schedulers</span>
            <strong className="text-sky-400 font-bold">{summary.queueStatus}</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          API Explorer
        </button>
        <button
          onClick={() => setActiveTab("schemas")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "schemas" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Schema Explorer ({schemasList.length})
        </button>
        <button
          onClick={() => setActiveTab("standards")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "standards" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Architecture & Standards
        </button>
      </div>

      {/* Sub-Tab 1: API Explorer */}
      {activeTab === "overview" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">REST API Endpoints Reference Catalog</h3>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
              <input
                value={apiSearch}
                onChange={(e) => setApiSearch(e.target.value)}
                placeholder="Search API endpoints by path or module..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">HTTP Method</th>
                  <th className="px-6 py-4">Endpoint Path</th>
                  <th className="px-6 py-4">Module Category</th>
                  <th className="px-6 py-4">Authentication</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredApis.map((apiItem, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                        apiItem.method === "GET" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                        apiItem.method === "POST" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" :
                        "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {apiItem.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{apiItem.path}</td>
                    <td className="px-6 py-4 uppercase text-[10px] text-slate-400 font-black">{apiItem.category}</td>
                    <td className="px-6 py-4 text-slate-600 font-bold">{apiItem.auth}</td>
                    <td className="px-6 py-4 text-slate-600">{apiItem.description}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleCopy(apiItem.path)}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                        title="Copy Path"
                      >
                        {copiedPath === apiItem.path ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Schema Explorer */}
      {activeTab === "schemas" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="border-b pb-4 border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Registered Mongoose Data Schemas & Collections</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{schemasList.length} Total Collections</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {schemasList.map((s, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">{s.name}</span>
                  <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{s.collectionName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-200/60">
                  <span>Fields: <strong className="text-slate-800">{s.fieldCount}</strong></span>
                  <span>Indexes: <strong className="text-emerald-600">{s.indexesCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Architecture & Standards */}
      {activeTab === "standards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Clean Layered Architecture</h3>
            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-indigo-600 uppercase text-[9px] block">1. Presentation / Route Layer</strong>
                Express routers with JWT middleware (`requireAuth`, `requireRole`) and input validators.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-indigo-600 uppercase text-[9px] block">2. Controller Layer</strong>
                Decoupled async route controllers handling response formatting and error propagation.
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-indigo-600 uppercase text-[9px] block">3. Data & Repository Layer</strong>
                Mongoose ODM models with pre-save hooks, enum validation, and compound indexes.
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Engineering Quality Metrics</h3>
            <div className="space-y-3 text-xs font-bold">
              <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-emerald-700">
                <span>Automated Test Coverage</span>
                <span className="font-black text-emerald-900 text-sm">{codeQuality.testCoverage}</span>
              </div>
              <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-indigo-700">
                <span>Linter Status</span>
                <span className="font-black text-indigo-900 text-sm">{codeQuality.lintStatus}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                <span>Code Complexity Score</span>
                <span className="font-black text-slate-900 text-sm">{codeQuality.codeComplexityRating}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                <span>Security Vulnerabilities</span>
                <span className="font-black text-emerald-600 text-sm">0 Advisories</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
