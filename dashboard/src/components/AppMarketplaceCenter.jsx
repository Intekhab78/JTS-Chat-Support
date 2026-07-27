import React, { useState, useEffect } from "react";
import {
  Package, Star, Download, ShieldCheck, RefreshCw, X, CheckCircle2, AlertTriangle,
  Zap, Code, Layers, Power, Cpu, Globe, ArrowUpRight, FileCode, Check
} from "lucide-react";
import { api } from "../api/client.js";

export default function AppMarketplaceCenter() {
  const [activeTab, setActiveTab] = useState("storefront");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api("/api/app-marketplace/overview");
      setData(res || {});
    } catch (err) {
      console.error("Failed to load marketplace overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInstall = async (id) => {
    try {
      await api(`/api/app-marketplace/plugins/${id}/install`, { method: "POST" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await api(`/api/app-marketplace/plugins/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ isActive: !currentActive })
      });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUninstall = async (id) => {
    if (!confirm("Uninstall this extension plugin?")) return;
    try {
      await api(`/api/app-marketplace/plugins/${id}/uninstall`, { method: "POST" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading App Marketplace & Plugin Architecture Engine...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const plugins = data?.plugins || [];

  const installedPlugins = plugins.filter(p => p.isInstalled);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl">
              <Package size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise App Marketplace & Plugin Architecture</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Sandboxed Extension SDK, Plugin Engine Lifecycle & Marketplace Ecosystem
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors w-fit"
          title="Refresh Storefront"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Primary Telemetry Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-800">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Plugin Engine Architecture</span>
            <h3 className="text-xl font-black text-white mt-1">Sandboxed Extension SDK {summary.sdkVersion}</h3>
          </div>
          <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase">
            Engine Health {summary.pluginEngineHealth}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Available Marketplace Apps</span>
            <strong className="text-white font-bold">{summary.totalAvailablePlugins} Plugins</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Installed Plugins</span>
            <strong className="text-purple-400 font-bold">{summary.installedPluginsCount} Active Installs</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Active Running Hooks</span>
            <strong className="text-emerald-400 font-bold">{summary.activePluginsCount} Running</strong>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Available Updates</span>
            <strong className="text-amber-400 font-bold">{summary.availableUpdates} Update Available</strong>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("storefront")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "storefront" ? "bg-purple-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          App Storefront ({plugins.length})
        </button>
        <button
          onClick={() => setActiveTab("installed")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "installed" ? "bg-purple-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Installed Plugins ({installedPlugins.length})
        </button>
        <button
          onClick={() => setActiveTab("sdk")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === "sdk" ? "bg-purple-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Plugin SDK & Manifest Specs
        </button>
      </div>

      {/* Sub-Tab 1: App Storefront Grid */}
      {activeTab === "storefront" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plugins.map((p) => (
            <div key={p._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase bg-purple-50 text-purple-600 border border-purple-200">
                    {p.category.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold font-mono">
                    <Star size={12} fill="currentColor" /> {p.rating}
                  </div>
                </div>

                <h4 className="text-sm font-black text-slate-900">{p.pluginName}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                  <span>Author: <strong className="text-slate-700">{p.author}</strong></span>
                  <span>Version: <strong className="text-indigo-600">{p.version}</strong></span>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2">
                {p.isInstalled ? (
                  <div className="w-full flex items-center justify-between bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase border border-emerald-200">
                    <span className="flex items-center gap-1.5"><Check size={14} /> Installed</span>
                    <button
                      onClick={() => handleToggleActive(p._id, p.isActive)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${p.isActive ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
                    >
                      {p.isActive ? "ACTIVE" : "OFF"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleInstall(p._id)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Install Plugin
                  </button>
                )}
                <button
                  onClick={() => setSelectedPlugin(p)}
                  className="p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                  title="View Manifest & Permissions"
                >
                  <Code size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-Tab 2: Installed Plugins Engine Control */}
      {activeTab === "installed" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Installed Plugins Engine Lifecycle & Health</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sandboxed Execution Hooks</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Plugin Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Version</th>
                  <th className="px-6 py-4">Engine Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {installedPlugins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No plugins installed. Browse App Storefront to install.</td>
                  </tr>
                ) : (
                  installedPlugins.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">{p.pluginName}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-200">
                          {p.category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{p.version}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                          p.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {p.isActive ? "RUNNING" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleActive(p._id, p.isActive)}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleUninstall(p._id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          Uninstall
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Plugin SDK Specification */}
      {activeTab === "sdk" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100 flex items-center gap-2">
            <FileCode size={18} className="text-purple-600" /> JTS Enterprise Sandboxed Plugin SDK v1.0.0 Specifications
          </h3>

          <div className="bg-slate-900 text-emerald-400 p-6 rounded-2xl font-mono text-xs overflow-x-auto space-y-2">
            <p className="text-slate-400">// plugin.manifest.json</p>
            <pre>{`{
  "pluginKey": "custom_analytics_extension",
  "version": "1.0.0",
  "permissions": ["CRM_READ", "ANALYTICS_QUERY"],
  "apiHooks": ["ON_CUSTOMER_CREATE", "ON_VAT_CALCULATE"],
  "uiHooks": ["DASHBOARD_CARD", "CUSTOMER_TAB"]
}`}</pre>
          </div>
        </div>
      )}

      {/* Manifest Modal */}
      {selectedPlugin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedPlugin(null)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <span className="text-[9px] font-black uppercase text-purple-600">Plugin Manifest Inspector</span>
                <h3 className="text-base font-black text-slate-900">{selectedPlugin.pluginName}</h3>
              </div>
              <button onClick={() => setSelectedPlugin(null)} className="p-2 text-slate-400 hover:text-slate-900">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-700">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Declared Permissions</span>
                <div className="flex flex-wrap gap-2">
                  {(selectedPlugin.manifest?.permissions || []).map((perm, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-mono text-[10px]">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">API Event Hooks</span>
                <div className="flex flex-wrap gap-2">
                  {(selectedPlugin.manifest?.apiHooks || []).map((hook, i) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-mono text-[10px]">
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
