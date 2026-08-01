import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Globe, Plus, Trash2, Copy, Check, Settings, Code, Palette, X, Network, DollarSign, Lock } from "lucide-react";
import { api, getApiBase } from "../api/client.js";
import WidgetCustomizer from "./WidgetCustomizer.jsx";
import FlowBuilder from "./FlowBuilder.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { CURRENCY_MASTER, DEFAULT_CURRENCY_SETTINGS } from "../constants/currencies.js";
import { useCurrency } from "../context/CurrencyContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const COLOR_PRESETS = [
  { primary: "#6366f1", accent: "#4f46e5", name: "Indigo" },
  { primary: "#3b82f6", accent: "#2563eb", name: "Blue" },
  { primary: "#10b981", accent: "#059669", name: "Emerald" },
  { primary: "#f59e0b", accent: "#d97706", name: "Amber" },
  { primary: "#ef4444", accent: "#dc2828", name: "Rose" },
  { primary: "#8b5cf6", accent: "#7c3aed", name: "Purple" },
  { primary: "#ec4899", accent: "#db2777", name: "Pink" },
  { primary: "#0f172a", accent: "#020617", name: "Slate" }
];

const DEFAULT_BUSINESS_HOURS = {
  enabled: false,
  timezone: "Asia/Kolkata",
  monday: { isOpen: true, open: "09:00", close: "17:00" },
  tuesday: { isOpen: true, open: "09:00", close: "17:00" },
  wednesday: { isOpen: true, open: "09:00", close: "17:00" },
  thursday: { isOpen: true, open: "09:00", close: "17:00" },
  friday: { isOpen: true, open: "09:00", close: "17:00" },
  saturday: { isOpen: false, open: "09:00", close: "17:00" },
  sunday: { isOpen: false, open: "09:00", close: "17:00" }
};

function createDefaultBusinessHours() {
  return JSON.parse(JSON.stringify(DEFAULT_BUSINESS_HOURS));
}

export default function WebsiteManager() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    websiteName: "",
    domain: "",
    primaryColor: "#6366f1",
    accentColor: "#f59e0b",
    launcherIcon: "💬",
    welcomeMessage: "Hi there! How can we help you today?",
    isActive: true,
    enableChat: true,
    enableLeadGeneration: true,
    enableTicketing: true,
    enableKnowledgeBase: true,
    enableLiveAgent: true,
    enableAutomation: true,
    businessHours: createDefaultBusinessHours(),
    webhooks: []
  });
  const [customizingWebsite, setCustomizingWebsite] = useState(null);
  const [buildingFlowWebsite, setBuildingFlowWebsite] = useState(null);
  const [localizingWebsite, setLocalizingWebsite] = useState(null);
  const [page, setPage] = useState(1);
  const [widgetBaseUrl, setWidgetBaseUrl] = useState("");
  const { refreshCurrency } = useCurrency();
  const { refreshWebsites } = useWebsite() || {};
  const { user } = useAuth() || {};
  const isAdmin = user?.role === "admin";

  const fetchWebsites = async () => {
    try {
      const data = await api("/api/websites");
      setWebsites(data);
      if (refreshWebsites) refreshWebsites();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
    getApiBase().then(setWidgetBaseUrl);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [websites.length]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      websiteName: "",
      domain: "",
      primaryColor: "#6366f1",
      accentColor: "#f59e0b",
      launcherIcon: "💬",
      welcomeMessage: "Hi there! How can we help you today?",
      isActive: true,
      enableChat: true,
      enableLeadGeneration: true,
      enableTicketing: true,
      enableKnowledgeBase: true,
      enableLiveAgent: true,
      enableAutomation: true,
      enabledModules: ["crm", "operations", "finance", "compliance", "service", "automation"],
      businessHours: createDefaultBusinessHours(),
      webhooks: []
    });
  };

  const handleDeleteWebsite = async (website) => {
    if (!window.confirm(`Are you sure you want to delete "${website.websiteName || website.domain}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api(`/api/websites/${website._id}`, { method: "DELETE" });
      fetchWebsites();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (website) => {
    setEditingId(website._id);
    setFormData({
      websiteName: website.websiteName || "",
      domain: website.domain || "",
      primaryColor: website.primaryColor || "#6366f1",
      accentColor: website.accentColor || "#f59e0b",
      launcherIcon: website.launcherIcon || "💬",
      welcomeMessage: website.welcomeMessage || "Hi there! How can we help you today?",
      isActive: website.isActive !== false,
      enableChat: website.enableChat !== false,
      enableLeadGeneration: website.enableLeadGeneration !== false,
      enableTicketing: website.enableTicketing !== false,
      enableKnowledgeBase: website.enableKnowledgeBase !== false,
      enableLiveAgent: website.enableLiveAgent !== false,
      enableAutomation: website.enableAutomation !== false,
      enabledModules: website.enabledModules || ["crm", "operations", "finance", "compliance", "service", "automation"],
      businessHours: website.businessHours || createDefaultBusinessHours(),
      webhooks: website.webhooks || []
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api(`/api/websites/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(formData)
        });
      } else {
        await api("/api/websites", {
          method: "POST",
          body: JSON.stringify(formData)
        });
      }
      handleCancel();
      fetchWebsites();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-6">
      <div className="w-12 h-12 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Multi-Domain Network...</p>
    </div>
  );

  const PreviewWidget = ({ data }) => (
    <div className="hidden lg:flex flex-col h-full w-full bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 rounded-[40px] relative overflow-hidden pt-8 px-8 transition-colors">
      <div className="space-y-2 mb-6">
        <h4 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] text-center">Real-Time Synthesis</h4>
      </div>
      <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t border-x border-slate-200 dark:border-white/5 relative overflow-hidden flex flex-col transition-colors">
        {/* Browser Chrome */}
        <div className="p-4 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50 shadow-inner"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/50 shadow-inner"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/50 shadow-inner"></div>
          <div className="ml-4 bg-white dark:bg-black/30 px-4 py-2 rounded-xl text-[9px] font-black text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5 w-1/2 flex items-center gap-2 tracking-tight">
            <Globe size={11} className="text-slate-300 dark:text-slate-700" /> {data.domain || 'yourdomain.com'}
          </div>
        </div>
        {/* Page Content Ghost */}
        <div className="p-10 space-y-5 opacity-20 flex-1">
          <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-3 w-4/6 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        </div>

        {/* Live Chat Widget */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3.5 z-10 w-[220px] pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{ filter: data.isActive ? 'none' : 'grayscale(1) opacity(0.6)' }}>
          <div className="w-full bg-white dark:bg-slate-950 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] rounded-[24px] overflow-hidden border border-slate-100 dark:border-white/5 flex flex-col transform transition-all hover:-translate-y-1 origin-bottom-right">
            {/* Widget Header */}
            <div className="p-4 transition-colors relative h-16 flex flex-col justify-center" style={{ backgroundColor: data.primaryColor }}>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <h5 className="text-white text-[11px] font-black drop-shadow-md uppercase tracking-tight truncate">{data.websiteName || 'New Brand'}</h5>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                <p className="text-white/80 text-[8px] font-bold">Agents Active</p>
              </div>
            </div>
            {/* Widget Messages */}
            <div className="p-4 bg-[#f8fafc] dark:bg-black/30 space-y-3 min-h-[110px] border-b border-indigo-50/10 transition-colors">
              <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] text-white shadow-lg transition-all shrink-0 border border-white/10" style={{ backgroundColor: data.primaryColor }}>
                  {data.launcherIcon}
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 p-2.5 rounded-xl rounded-tl-sm text-[10px] text-slate-700 dark:text-slate-200 shadow-sm leading-relaxed font-bold">
                  Initiating support protocol...
                </div>
              </div>
            </div>
            {/* Widget Input Mock */}
            <div className="p-3 bg-white dark:bg-slate-950 flex gap-2 items-center transition-colors">
              <div className="flex-1 bg-slate-50 dark:bg-black/20 rounded-lg p-2 text-[9px] text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-white/5 font-bold">Type a message...</div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-lg transition-all" style={{ backgroundColor: data.primaryColor }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </div>
            </div>
          </div>

          {/* Launcher Button */}
          <div className="w-12 h-12 rounded-[16px] shadow-xl flex items-center justify-center text-xl text-white transition-all hover:scale-110 duration-500 border-2 border-white dark:border-slate-800 shrink-0 animate-in zoom-in duration-500" style={{ backgroundColor: data.primaryColor }}>
            <span className="drop-shadow-lg">{data.launcherIcon}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (customizingWebsite) {
    return (
      <div className="space-y-10 animate-in fade-in duration-1000">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="heading-xl dark:text-white">Design System</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Customizing <span className="text-indigo-500">{customizingWebsite.websiteName}</span></p>
          </div>
          <button
            onClick={() => setCustomizingWebsite(null)}
            className="w-14 h-14 rounded-[24px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-100 dark:hover:border-red-500/20 transition-all hover:rotate-90 hover:scale-110 shadow-sm"
          >
            <X size={24} />
          </button>
        </div>
        <WidgetCustomizer
          website={customizingWebsite}
          onUpdate={(updated) => {
            setWebsites(websites.map(w => w._id === updated._id ? updated : w));
            setCustomizingWebsite(updated);
          }}
        />
      </div>
    );
  }

  if (buildingFlowWebsite) {
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Flow Builder</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-3">
              Configure Bot Routing for <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{buildingFlowWebsite.websiteName}</span>
            </span>
          </div>
          <button
            onClick={() => setBuildingFlowWebsite(null)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shadow-xs"
            title="Close Flow Builder"
          >
            <X size={18} />
          </button>
        </div>
        <FlowBuilder
          website={buildingFlowWebsite}
          onUpdate={(updated) => {
            setWebsites(websites.map(w => w._id === updated._id ? updated : w));
            setBuildingFlowWebsite(updated);
          }}
        />
      </div>
    );
  }

  if (localizingWebsite) {
    return (
      <LocalizationModal
        website={localizingWebsite}
        onClose={() => setLocalizingWebsite(null)}
        onSaved={(updatedWebsite) => {
          setWebsites(prev => prev.map(w => w._id === updatedWebsite._id ? updatedWebsite : w));
          setLocalizingWebsite(null);
          refreshCurrency();
        }}
      />
    );
  }

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-1.5">
          <h3 className="heading-md dark:text-white">Multi-Domain Ecosystem</h3>
          <p className="small-label dark:text-slate-500">Securely monitor registered domains and manage cryptographic widget credentials.</p>
        </div>
        <button
          onClick={() => isAdding ? handleCancel() : setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
        >
          {isAdding ? <X size={18} /> : <Plus size={18} />}
          {isAdding ? "Cancel Operation" : "Deploy New Terminal"}
        </button>
      </div>

      {isAdding && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 lg:p-10 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto" onClick={handleCancel} />
          <div className="relative z-10 pointer-events-auto w-full max-w-6xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-slate-100 dark:border-white/5 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-black/20">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingId ? `Configure Website: ${formData.websiteName || formData.domain}` : "Deploy New Terminal"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  Manage domain credentials, module entitlements & widget settings
                </p>
              </div>
              <button type="button" onClick={handleCancel} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 md:p-12 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Left Segment: Form Inputs */}
                <div className="lg:col-span-7 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <label className="small-label dark:text-slate-400">Terminal Identity (Name)</label>
                        <input
                          value={formData.websiteName}
                          onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4.5 text-xs font-black focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 dark:text-white shadow-inner"
                          placeholder="Platform Alpha"
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="small-label dark:text-slate-400">Domain Authority (URL)</label>
                        <input
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4.5 text-xs font-black focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 dark:text-white shadow-inner"
                          placeholder="alpha.enterprise.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="small-label dark:text-slate-400">Primary Color Vector</label>
                      <div className="flex flex-wrap gap-3">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setFormData({ ...formData, primaryColor: preset.primary, accentColor: preset.accent })}
                            className={`w-11 h-11 rounded-2xl border-[4px] transition-all hover:scale-110 active:scale-90 ${formData.primaryColor === preset.primary ? 'border-slate-900 dark:border-white scale-110 shadow-2xl' : 'border-transparent dark:border-white/5 shadow-sm'}`}
                            style={{ backgroundColor: preset.primary }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="small-label dark:text-slate-400">Launcher Icon</label>
                        <input
                          value={formData.launcherIcon}
                          onChange={(e) => setFormData({ ...formData, launcherIcon: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4.5 text-xs font-black text-center"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="small-label dark:text-slate-400">Status</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                          className={`w-full py-4.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${formData.isActive ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' : 'bg-rose-50 text-rose-600 border-2 border-rose-200'}`}
                        >
                          {formData.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="small-label dark:text-slate-400">Welcome Message Prompt</label>
                    <textarea
                      value={formData.welcomeMessage}
                      onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl p-6 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all"
                    />
                  </div>

                  <div className="pt-10 border-t border-slate-50 dark:border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="small-label dark:text-slate-400 flex items-center gap-2">
                          Enterprise Modules & Navigation Features
                          {!isAdmin && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-500/20">
                              <Lock size={10} /> Superadmin Managed
                            </span>
                          )}
                        </label>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          {isAdmin 
                            ? "Enable or disable specific modules for this domain (e.g. Turn OFF UAE Compliance Suite for pure Product Sales clients)."
                            : "SaaS Enterprise Module Entitlements are locked & configured by your Superadmin based on your subscription plan."
                          }
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: "enableChat", label: "Live Chat Widget" },
                        { key: "enableLeadGeneration", label: "Lead Gen (CRM)" },
                        { key: "enableTicketing", label: "Helpdesk Tickets" },
                        { key: "enableKnowledgeBase", label: "Help Center" },
                        { module: "compliance", label: "UAE Compliance Suite (VAT)" },
                        { module: "finance", label: "Finance & Invoicing" },
                        { module: "operations", label: "Operations & Catalog" },
                        { module: "service", label: "Service & Care Inbox" },
                        { module: "automation", label: "Workflows & AI Platform" },
                      ].map((feat) => {
                        const isModule = !!feat.module;
                        const isEnabled = isModule 
                          ? (formData.enabledModules || []).includes(feat.module)
                          : !!formData[feat.key];

                        const isLockedForClient = isModule && !isAdmin;

                        const toggleFunc = () => {
                          if (isLockedForClient) return;
                          if (isModule) {
                            const current = formData.enabledModules || ["crm", "operations", "finance", "compliance", "service", "automation"];
                            const next = current.includes(feat.module)
                              ? current.filter(m => m !== feat.module)
                              : [...current, feat.module];
                            setFormData({ ...formData, enabledModules: next });
                          } else {
                            setFormData({ ...formData, [feat.key]: !formData[feat.key] });
                          }
                        };

                        return (
                          <button
                            key={feat.key || feat.module}
                            type="button"
                            disabled={isLockedForClient}
                            onClick={toggleFunc}
                            className={`flex flex-col items-start gap-3 p-4 rounded-[20px] border-2 transition-all relative ${isLockedForClient ? 'cursor-not-allowed opacity-75' : 'hover:scale-[1.02]'} ${isEnabled ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60'}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                              {isLockedForClient && <Lock size={12} className="text-slate-400" />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isEnabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {feat.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-50 dark:border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="small-label dark:text-slate-400">Webhooks</label>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Receive `ticket.created`, `ticket.updated`, `chat.closed`, and `chat.assigned` events.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, webhooks: [...(formData.webhooks || []), { url: "", secret: "", events: ["ticket.created"] }] })}
                        className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        Add Webhook
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(formData.webhooks || []).map((hook, idx) => (
                        <div key={idx} className="rounded-[28px] border border-slate-100 p-5 dark:border-white/5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              value={hook.url}
                              onChange={(e) => {
                                const webhooks = [...formData.webhooks];
                                webhooks[idx] = { ...webhooks[idx], url: e.target.value };
                                setFormData({ ...formData, webhooks });
                              }}
                              placeholder="https://example.com/webhooks/support"
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-bold"
                            />
                            <input
                              value={hook.secret || ""}
                              onChange={(e) => {
                                const webhooks = [...formData.webhooks];
                                webhooks[idx] = { ...webhooks[idx], secret: e.target.value };
                                setFormData({ ...formData, webhooks });
                              }}
                              placeholder="Signing secret"
                              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-bold"
                            />
                          </div>
                          <input
                            value={(hook.events || []).join(", ")}
                            onChange={(e) => {
                              const webhooks = [...formData.webhooks];
                              webhooks[idx] = { ...webhooks[idx], events: e.target.value.split(",").map(v => v.trim()).filter(Boolean) };
                              setFormData({ ...formData, webhooks });
                            }}
                            placeholder="ticket.created, ticket.updated"
                            className="mt-4 w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-50 dark:border-white/5">
                    <button type="submit" className="w-full bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.4em] py-6 rounded-[24px] shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-4">
                      <Check size={20} />
                      {editingId ? "Update Configuration" : "Finalize Ecosystem Deployment"}
                    </button>
                  </div>
                </div>

                {/* Right Segment: Live Preview */}
                <div className="lg:col-span-5 h-[640px]">
                  <PreviewWidget data={formData} />
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-8 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest shadow-xl animate-in shake duration-500">
          Neural Interface Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-10">
        {getPaginationMeta(websites, page).pageItems.map((website) => (
          <div key={website._id} className={`premium-card p-0 overflow-hidden group hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] transition-all duration-700 bg-white dark:bg-slate-900 border-2 ${website.isActive !== false ? 'border-transparent dark:border-white/5 hover:border-indigo-100 dark:hover:border-indigo-500/30' : 'border-slate-100 dark:border-white/5 opacity-70 grayscale hover:grayscale-0'}`}>
            <div className="p-10 border-b border-slate-50 dark:border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-8 relative transition-colors">
              {website.isActive === false && <div className="absolute inset-0 bg-slate-50/40 dark:bg-black/40 z-0"></div>}

              <div className="flex items-center gap-8 relative z-10 transition-transform group-hover:translate-x-1 duration-500">
                <div
                  className="w-20 h-20 rounded-[28px] flex items-center justify-center text-4xl shadow-2xl transition-all group-hover:rotate-6 shrink-0 border border-white/10"
                  style={{ backgroundColor: website.primaryColor, color: '#fff' }}
                >
                  <Globe size={32} />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-4">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{website.websiteName}</h4>
                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-lg shadow-sm ${website.isActive !== false ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {website.isActive !== false ? 'Live' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                      {website.domain}
                    </p>
                    {website.managerId?.name && (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                        <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-black px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg uppercase tracking-widest">
                          Master: {website.managerId.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 relative z-10 shrink-0">
                <button
                  onClick={async () => {
                    try {
                      // Fetch fully-populated website (with activeFlowId.nodes) before opening Flow Builder
                      const populated = await api(`/api/websites/${website._id}`);
                      setBuildingFlowWebsite(populated);
                    } catch {
                      // Fallback to existing data if fetch fails
                      setBuildingFlowWebsite(website);
                    }
                  }}
                  className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/10 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Network size={15} /> Flow Builder
                </button>
                <button
                  onClick={() => setLocalizingWebsite(website)}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/5 flex items-center gap-2 hover:scale-105 active:scale-95 hover:border-emerald-600"
                >
                  <DollarSign size={15} /> Currency
                </button>
                <button
                  onClick={() => setCustomizingWebsite(website)}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-950 dark:hover:bg-black hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/5 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Palette size={15} /> Design
                </button>
                <button
                  onClick={() => handleEdit(website)}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-950 dark:hover:bg-black hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/5 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <Settings size={15} /> Configure
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteWebsite(website)}
                  title="Delete Website"
                  className="p-3 bg-red-50 hover:bg-red-600 dark:bg-red-500/10 dark:hover:bg-red-600 text-red-500 hover:text-white rounded-2xl transition-all shadow-sm border border-red-200 dark:border-red-500/20 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-10 bg-slate-50/30 dark:bg-black/10 grid grid-cols-1 xl:grid-cols-12 gap-12 items-start relative z-10 transition-colors">
              <div className="xl:col-span-8 space-y-5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Quantum Deployment Snippet</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse delay-75"></div>
                    <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse delay-150"></div>
                  </div>
                </div>
                <div className="relative group/copy">
                  <div className="bg-[#0f172a] dark:bg-black border border-slate-800 dark:border-white/5 rounded-[32px] p-8 font-mono text-[12px] leading-relaxed flex items-start gap-8 pr-20 shadow-2xl relative overflow-hidden transition-all group-hover/copy:border-indigo-500/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60"></div>
                    <div className="text-slate-700/50 select-none hidden sm:block text-right pt-[2px] font-black">01<br />02<br />03<br />04<br />05<br />06<br />07</div>
                    <div className="text-indigo-100/90 whitespace-pre-wrap break-all w-full overflow-x-auto selection:bg-indigo-500/40 tracking-tight">
                      {`<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${widgetBaseUrl}/chat-widget.js";\n    s.setAttribute("data-api-key", "${website.apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${widgetBaseUrl}/chat-widget.js";\n    s.setAttribute("data-api-key", "${website.apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`, website._id)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-indigo-600 text-white rounded-2xl backdrop-blur-xl shadow-2xl hover:scale-110 active:scale-90 transition-all outline-none border border-white/10 flex items-center justify-center group-hover/copy:bg-indigo-500"
                  >
                    {copiedId === website._id ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>

              <div className="xl:col-span-4 grid grid-cols-2 xl:grid-cols-1 gap-6 h-full">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-4 hover:-translate-y-1 transition-all flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Secret Key
                  </span>
                  <div className="bg-slate-50 dark:bg-black/20 px-5 py-3 rounded-xl border border-slate-100 dark:border-white/5 font-mono text-[11px] font-black text-slate-900 dark:text-indigo-300 truncate tracking-tight">
                    {website.apiKey}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-4 hover:-translate-y-1 transition-all flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-pink-500"></div> Icon State
                  </span>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-all border-2 border-white dark:border-slate-800 shrink-0" style={{ backgroundColor: website.primaryColor, color: '#fff' }}>
                      <span className="drop-shadow-lg">{website.launcherIcon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Verified</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase truncate">Protocol Asset</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {websites.length === 0 && !isAdding && (
          <div className="p-40 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[64px] text-center space-y-8 bg-slate-50/30 dark:bg-white/5 transition-colors">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-10"></div>
              <div className="absolute inset-4 bg-indigo-500/10 rounded-full animate-pulse"></div>
              <Globe size={48} className="text-indigo-600 dark:text-indigo-400 relative z-10" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Ecosystem Vacuum</h3>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">No active domains detected. Register a terminal to begin multi-website support deployment.</p>
            </div>
          </div>
        )}
      </div>
      <PaginationControls
        currentPage={getPaginationMeta(websites, page).currentPage}
        totalPages={getPaginationMeta(websites, page).totalPages}
        totalItems={getPaginationMeta(websites, page).totalItems}
        itemLabel="websites"
        onPageChange={setPage}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Localization Modal
// ─────────────────────────────────────────────────────────────────────────────
function formatPreview(settings, amount = 123456.78) {
  const s = { ...DEFAULT_CURRENCY_SETTINGS, ...settings };
  const dp = Number(s.decimalPlaces ?? 2);
  const fixed = amount.toFixed(dp);
  const [intPart, decPart] = fixed.split(".");
  const sep = s.thousandSeparator ?? ",";
  let intFormatted = intPart;
  if (sep) {
    const isIndian = s.currencyCode === "INR" && sep === ",";
    if (isIndian) {
      if (intPart.length > 3) {
        const last3 = intPart.slice(-3);
        const rest = intPart.slice(0, -3);
        intFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
      }
    } else {
      intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    }
  }
  const ds = s.decimalSeparator ?? ".";
  const numStr = dp > 0 ? `${intFormatted}${ds}${decPart}` : intFormatted;
  const sym = s.currencySymbol ?? "₹";
  return s.symbolPosition === "after" ? `${numStr} ${sym}` : `${sym} ${numStr}`;
}

function LocalizationModal({ website, onClose, onSaved }) {
  const [settings, setSettings] = useState({
    ...DEFAULT_CURRENCY_SETTINGS,
    ...(website.currencySettings || {})
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCurrencySelect = (e) => {
    const selected = CURRENCY_MASTER.find(c => c.code === e.target.value);
    if (!selected) return;
    setSettings(prev => ({
      ...prev,
      currency:          selected.name,
      currencyCode:      selected.code,
      currencySymbol:    selected.symbol,
      symbolPosition:    selected.position || "before",
      decimalPlaces:     selected.decimalPlaces,
      thousandSeparator: selected.thousandSep,
      decimalSeparator:  selected.decimalSep,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await api(`/api/websites/${website._id}`, {
        method: "PATCH",
        body: JSON.stringify({ currencySettings: settings })
      });
      setSuccess(true);
      setTimeout(() => onSaved(updated), 800);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-500/50 dark:text-white transition-all";
  const preview = formatPreview(settings);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
              <DollarSign size={20} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Currency &amp; Localization</h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-[52px]">
            Configuring <span className="text-emerald-500">{website.websiteName}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-14 h-14 rounded-[24px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all hover:rotate-90 hover:scale-110 shadow-sm"
        >
          <X size={24} />
        </button>
      </div>

      {/* Live Preview Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[32px] p-8 text-white shadow-xl shadow-emerald-200/40 flex items-center justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70 mb-1">Live Preview</p>
          <p className="text-4xl font-black tracking-tight">{preview}</p>
          <p className="text-[10px] font-bold opacity-60 mt-2 uppercase tracking-widest">{settings.currencyCode} · {settings.currency}</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Symbol</p>
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-3xl font-black border border-white/20">
            {settings.currencySymbol}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 p-8 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Currency Master</p>

          {/* Currency Picker */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Currency</label>
            <select
              className={inp}
              value={settings.currencyCode}
              onChange={handleCurrencySelect}
            >
              {CURRENCY_MASTER.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
              <option value="">— Custom —</option>
            </select>
          </div>

          {/* Currency Name */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Currency Name</label>
            <input
              className={inp}
              value={settings.currency}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              placeholder="e.g. Indian Rupee"
            />
          </div>

          {/* Symbol + Code row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Symbol</label>
              <input
                className={inp}
                value={settings.currencySymbol}
                onChange={e => setSettings(s => ({ ...s, currencySymbol: e.target.value }))}
                placeholder="₹"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Currency Code</label>
              <input
                className={inp}
                value={settings.currencyCode}
                onChange={e => setSettings(s => ({ ...s, currencyCode: e.target.value.toUpperCase() }))}
                placeholder="INR"
                maxLength={5}
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 p-8 shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">Formatting Rules</p>

          {/* Symbol Position */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Symbol Position</label>
            <div className="flex gap-3">
              {[
                { v: "before", label: "Before Amount", example: "₹100" },
                { v: "after",  label: "After Amount",  example: "100₹" }
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, symbolPosition: opt.v }))}
                  className={`flex-1 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${settings.symbolPosition === opt.v ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100 hover:border-emerald-300"}`}
                >
                  {opt.label}
                  <span className="block text-[8px] mt-1 opacity-70">{opt.example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Decimal Places */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Decimal Places</label>
            <div className="flex gap-3">
              {[0, 2, 3].map(dp => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, decimalPlaces: dp }))}
                  className={`flex-1 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${settings.decimalPlaces === dp ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100 hover:border-emerald-300"}`}
                >
                  {dp}
                </button>
              ))}
            </div>
          </div>

          {/* Separators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thousand Sep.</label>
              <select
                className={inp}
                value={settings.thousandSeparator}
                onChange={e => setSettings(s => ({ ...s, thousandSeparator: e.target.value }))}
              >
                <option value=",">, (comma)</option>
                <option value=".">. (period)</option>
                <option value=" ">  (space)</option>
                <option value="">(none)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Decimal Sep.</label>
              <select
                className={inp}
                value={settings.decimalSeparator}
                onChange={e => setSettings(s => ({ ...s, decimalSeparator: e.target.value }))}
              >
                <option value=".">. (period)</option>
                <option value=",">, (comma)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-white/5 p-8 shadow-sm">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-5">Quick Currency Presets</p>
        <div className="flex flex-wrap gap-3">
          {CURRENCY_MASTER.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSettings({
                currency:          c.name,
                currencyCode:      c.code,
                currencySymbol:    c.symbol,
                symbolPosition:    c.position || "before",
                decimalPlaces:     c.decimalPlaces,
                thousandSeparator: c.thousandSep,
                decimalSeparator:  c.decimalSep,
              })}
              className={`px-4 py-2.5 rounded-2xl border-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${settings.currencyCode === c.code ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100" : "bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-white/5 hover:border-emerald-300"}`}
            >
              <span className="text-sm">{c.symbol}</span> {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Errors / Success */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-6 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
          <Check size={16} /> Currency settings saved! Updating across CRM...
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 py-5 rounded-[24px] border-2 border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
          ) : success ? (
            <><Check size={16} /> Saved Successfully</>
          ) : (
            <><DollarSign size={16} /> Save Currency Settings</>
          )}
        </button>
      </div>
    </div>
  );
}
