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
      autoCreateVoiceTicket: false,
      voiceSettings: {
        gender: "female",
        speed: 1.0,
        pitch: 1.0,
        alertPhoneNumber: "",
        enableWhatsAppAlerts: true,
        enableSmsAlerts: true
      },
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
      autoCreateVoiceTicket: website.autoCreateVoiceTicket || false,
      voiceSettings: website.voiceSettings || {
        gender: "female",
        speed: 1.0,
        pitch: 1.0,
        alertPhoneNumber: "",
        enableWhatsAppAlerts: true,
        enableSmsAlerts: true
      },
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

  const PreviewWidget = ({ data }) => {
    const [previewMode, setPreviewMode] = useState("widget");

    return (
      <div className="hidden lg:flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 rounded-xl relative overflow-hidden p-2.5 transition-colors">
        {/* Top Header bar with status and mode switcher */}
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-[8.5px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Real-Time Synthesis
            </h4>
          </div>
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-md text-[8px] font-bold">
            <button
              type="button"
              onClick={() => setPreviewMode("widget")}
              className={`px-1.5 py-0.5 rounded transition-all ${previewMode === "widget" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
            >
              Widget
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("launcher")}
              className={`px-1.5 py-0.5 rounded transition-all ${previewMode === "launcher" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
            >
              Bubble
            </button>
          </div>
        </div>

        {/* Browser Mockup Window */}
        <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200/80 dark:border-white/10 relative overflow-hidden flex flex-col transition-colors min-h-[360px]">
          {/* Browser Chrome Navbar */}
          <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            </div>
            <div className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-[8.5px] font-mono text-slate-500 border border-slate-200/60 dark:border-white/10 flex-1 max-w-[180px] flex items-center gap-1 truncate">
              <Globe size={9} className="text-slate-400 shrink-0" />
              <span className="truncate">{data.domain || 'yourdomain.com'}</span>
            </div>
            <div className="w-8"></div>
          </div>

          {/* Browser Content (Realistic Mock Webpage to remove empty gaps) */}
          <div className="p-3 space-y-2.5 flex-1 overflow-hidden select-none opacity-85">
            {/* Header Ghost */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded bg-indigo-500" />
                <div className="w-12 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="w-6 h-1 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="w-8 h-2.5 rounded bg-slate-900 dark:bg-white/80" />
              </div>
            </div>

            {/* Hero Section */}
            <div className="space-y-1.5 pt-0.5">
              <div className="w-16 h-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800" />
              <div className="w-36 h-2.5 rounded bg-slate-800 dark:bg-white/90" />
              <div className="w-28 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
              <div className="flex gap-1.5 pt-1">
                <div className="w-10 h-3 rounded bg-indigo-600" />
                <div className="w-10 h-3 rounded border border-slate-200 dark:border-slate-700" />
              </div>
            </div>

            {/* 2-Card Feature Grid */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div className="p-1.5 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 space-y-1">
                <div className="w-2.5 h-2.5 rounded bg-emerald-500/20" />
                <div className="w-14 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
                <div className="w-10 h-1 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="p-1.5 rounded-md border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 space-y-1">
                <div className="w-2.5 h-2.5 rounded bg-indigo-500/20" />
                <div className="w-14 h-1.5 rounded bg-slate-300 dark:bg-slate-700" />
                <div className="w-10 h-1 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 pt-1 text-[7.5px] font-bold text-slate-400">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                <span>99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-indigo-500" />
                <span>24/7 AI Support</span>
              </div>
            </div>
          </div>

          {/* Live Chat Widget / Launcher in Bottom Right */}
          <div
            className="absolute bottom-2 right-2 z-10 transition-all duration-300"
            style={{ filter: data.isActive ? 'none' : 'grayscale(1) opacity(0.6)' }}
          >
            {previewMode === "widget" ? (
              <div className="w-[215px] bg-white dark:bg-slate-950 shadow-xl rounded-xl overflow-hidden border border-slate-200/80 dark:border-white/10 flex flex-col animate-in zoom-in-95 duration-200">
                {/* Widget Header */}
                <div
                  className="px-2.5 py-2 transition-colors relative flex items-center justify-between"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/15 to-transparent pointer-events-none"></div>
                  <div className="flex items-center gap-1.5 relative z-10 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center text-[10px] text-white shadow-xs shrink-0 border border-white/20">
                      {data.launcherIcon}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-white text-[9.5px] font-black drop-shadow-xs uppercase tracking-tight truncate">
                        {data.websiteName || 'New Brand'}
                      </h5>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                        <p className="text-white/85 text-[7px] font-bold">Agents Active</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("launcher")}
                    className="relative z-10 text-white/80 hover:text-white text-[10px] font-bold px-1"
                    title="Minimize"
                  >
                    ─
                  </button>
                </div>

                {/* Widget Messages */}
                <div className="p-2 bg-[#f8fafc] dark:bg-black/30 space-y-1.5 border-b border-indigo-50/10 transition-colors">
                  <div className="flex items-start gap-1.5">
                    <div
                      className="w-4 h-4 rounded-md flex items-center justify-center text-[8px] text-white shadow-xs shrink-0 mt-0.5"
                      style={{ backgroundColor: data.primaryColor }}
                    >
                      {data.launcherIcon}
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 p-1.5 rounded-lg rounded-tl-none text-[8.5px] text-slate-700 dark:text-slate-200 shadow-2xs font-medium leading-snug">
                      {data.welcomeMessage || "Hi there! How can we help you today?"}
                    </div>
                  </div>
                  {/* Quick suggestion chips */}
                  <div className="flex flex-wrap gap-1 pl-5">
                    <span className="px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                      💬 Talk to Agent
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                      🎫 New Ticket
                    </span>
                  </div>
                </div>

                {/* Widget Input Mock */}
                <div className="p-1.5 bg-white dark:bg-slate-950 flex gap-1.5 items-center transition-colors">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-md px-2 py-1 text-[8px] text-slate-400 border border-slate-100 dark:border-white/5 font-medium">
                    Type a message...
                  </div>
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white shadow-xs shrink-0"
                    style={{ backgroundColor: data.primaryColor }}
                  >
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewMode("widget")}
                className="w-9 h-9 rounded-xl shadow-lg flex items-center justify-center text-sm text-white border border-white dark:border-slate-800 transition-transform hover:scale-110 active:scale-95 animate-in zoom-in-95 duration-200"
                style={{ backgroundColor: data.primaryColor }}
                title="Click to open widget preview"
              >
                <span className="drop-shadow-xs">{data.launcherIcon}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (customizingWebsite) {
    return (
      <div className="space-y-3.5 animate-in fade-in duration-300">
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Palette size={14} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Widget Design System</h2>
              <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                Customizing <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{customizingWebsite.websiteName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setCustomizingWebsite(null)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
            title="Close Customizer"
          >
            <X size={15} />
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
    <div className="space-y-3.5 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 shadow-xs">
        <div className="space-y-0.5">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Globe size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Multi-Domain Ecosystem</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">Securely monitor registered domains and manage cryptographic widget credentials.</p>
        </div>
        <button
          onClick={() => isAdding ? handleCancel() : setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          {isAdding ? <X size={13} /> : <Plus size={13} />}
          {isAdding ? "Cancel Operation" : "Deploy New Terminal"}
        </button>
      </div>

      {isAdding && createPortal(
        <div className="fixed inset-0 z-[9999] p-2 sm:p-4 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto" onClick={handleCancel} />
          <div className="relative z-10 pointer-events-auto w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200/80 dark:border-white/10 shrink-0 bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Globe size={14} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {editingId ? `Configure Website: ${formData.websiteName || formData.domain}` : "Deploy New Terminal"}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Manage domain credentials, module entitlements &amp; widget settings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3.5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                {/* Left Segment: Form Inputs */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Terminal Identity (Name)</label>
                      <input
                        value={formData.websiteName}
                        onChange={(e) => setFormData({ ...formData, websiteName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:text-white"
                        placeholder="Platform Alpha"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Domain Authority (URL)</label>
                      <input
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:text-white"
                        placeholder="alpha.enterprise.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Primary Color Vector</label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setFormData({ ...formData, primaryColor: preset.primary, accentColor: preset.accent })}
                            className={`w-6 h-6 rounded-lg border-2 transition-all hover:scale-110 ${formData.primaryColor === preset.primary ? 'border-slate-900 dark:border-white scale-110 shadow-sm' : 'border-transparent'}`}
                            style={{ backgroundColor: preset.primary }}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Launcher Icon</label>
                        <input
                          value={formData.launcherIcon}
                          onChange={(e) => setFormData({ ...formData, launcherIcon: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-center dark:text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Status</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                          className={`w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${formData.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'}`}
                        >
                          {formData.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">Welcome Message Prompt</label>
                    <textarea
                      value={formData.welcomeMessage}
                      onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg p-2 text-xs font-medium focus:border-indigo-500 outline-none transition-all dark:text-white resize-none"
                    />
                  </div>

                  {/* Enterprise Modules */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                          Enterprise Modules &amp; Entitlements
                          {!isAdmin && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-500/20">
                              <Lock size={9} /> Managed
                            </span>
                          )}
                        </label>
                        <p className="text-[8.5px] text-slate-400">
                          {isAdmin 
                            ? "Configure active modules for this domain terminal."
                            : "Enterprise entitlements configured by your superadmin."
                          }
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: "enableChat", label: "Live Chat Widget" },
                        { key: "enableLeadGeneration", label: "Lead Gen (CRM)" },
                        { key: "enableTicketing", label: "Helpdesk Tickets" },
                        { key: "enableKnowledgeBase", label: "Help Center" },
                        { module: "compliance", label: "UAE Compliance (VAT)" },
                        { module: "finance", label: "Finance & Invoicing" },
                        { module: "operations", label: "Operations & Catalog" },
                        { module: "service", label: "Service & Care Inbox" },
                        { module: "automation", label: "Workflows & AI" },
                      ]
                      .filter((feat) => {
                        const isModule = !!feat.module;
                        const isEnabled = isModule 
                          ? (formData.enabledModules || []).includes(feat.module)
                          : (formData[feat.key] !== false);

                        if (!isAdmin && isModule && !isEnabled) {
                          return false;
                        }
                        return true;
                      })
                      .map((feat) => {
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
                            className={`flex items-center justify-between gap-1.5 p-2 rounded-lg border transition-all text-left ${isLockedForClient ? 'cursor-not-allowed opacity-75' : 'hover:scale-[1.01]'} ${isEnabled ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/10 opacity-60'}`}
                          >
                            <span className={`text-[9px] font-black uppercase tracking-wider truncate ${isEnabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {feat.label}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {isLockedForClient && <Lock size={10} className="text-slate-400" />}
                              <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Voice Call Ticketing Strategy */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                    <div>
                      <h4 className="text-[9.5px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎙️</span> AI Voice Call Ticketing Strategy
                      </h4>
                      <p className="text-[8.5px] text-slate-400">
                        Control whether every AI voice call creates a ticket or only on human action.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, autoCreateVoiceTicket: false })}
                        className={`p-2 rounded-lg border text-left transition-all ${!formData.autoCreateVoiceTicket ? 'bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500/40 shadow-xs' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/10 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            🎯 Smart Intent Mode
                          </span>
                          {!formData.autoCreateVoiceTicket && <Check size={12} className="text-indigo-600" />}
                        </div>
                        <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-snug">
                          Tickets created ONLY when human action / quotation requested.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, autoCreateVoiceTicket: true })}
                        className={`p-2 rounded-lg border text-left transition-all ${formData.autoCreateVoiceTicket ? 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-500/40 shadow-xs' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/10 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            🎫 Always Create Tickets
                          </span>
                          {formData.autoCreateVoiceTicket && <Check size={12} className="text-amber-600" />}
                        </div>
                        <p className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-snug">
                          Automatically generates a support ticket for EVERY voice call.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Voice Customization & Alerts */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div>
                      <h4 className="text-[9.5px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔊</span> AI Voice Persona &amp; Mobile Alerts
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Voice Persona</label>
                        <select
                          value={formData.voiceSettings?.gender || "female"}
                          onChange={(e) => setFormData({ ...formData, voiceSettings: { ...formData.voiceSettings, gender: e.target.value } })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                        >
                          <option value="female">👧 Natural Female</option>
                          <option value="male">👨 Professional Male</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Speech Speed</label>
                        <select
                          value={formData.voiceSettings?.speed || 1.0}
                          onChange={(e) => setFormData({ ...formData, voiceSettings: { ...formData.voiceSettings, speed: parseFloat(e.target.value) } })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                        >
                          <option value={0.85}>🐢 0.85x (Calm)</option>
                          <option value={1.0}>⚡ 1.0x (Normal)</option>
                          <option value={1.15}>🚀 1.15x (Fast)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Alert Phone</label>
                        <input
                          type="text"
                          placeholder="+971-50-9876543"
                          value={formData.voiceSettings?.alertPhoneNumber || ""}
                          onChange={(e) => setFormData({ ...formData, voiceSettings: { ...formData.voiceSettings, alertPhoneNumber: e.target.value } })}
                          className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10">
                        <input
                          type="checkbox"
                          checked={formData.voiceSettings?.enableWhatsAppAlerts !== false}
                          onChange={(e) => setFormData({ ...formData, voiceSettings: { ...formData.voiceSettings, enableWhatsAppAlerts: e.target.checked } })}
                          className="rounded text-emerald-500"
                        />
                        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">📲 WhatsApp Alerts</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10">
                        <input
                          type="checkbox"
                          checked={formData.voiceSettings?.enableSmsAlerts !== false}
                          onChange={(e) => setFormData({ ...formData, voiceSettings: { ...formData.voiceSettings, enableSmsAlerts: e.target.checked } })}
                          className="rounded text-indigo-500"
                        />
                        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">💬 SMS Text Alerts</span>
                      </label>
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Webhooks</label>
                        <p className="text-[8.5px] text-slate-400">Receive real-time ticket and chat events.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, webhooks: [...(formData.webhooks || []), { url: "", secret: "", events: ["ticket.created"] }] })}
                        className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                      >
                        Add Webhook
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(formData.webhooks || []).map((hook, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200/80 dark:border-white/10 p-2.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-800/40">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={hook.url}
                              onChange={(e) => {
                                const webhooks = [...formData.webhooks];
                                webhooks[idx] = { ...webhooks[idx], url: e.target.value };
                                setFormData({ ...formData, webhooks });
                              }}
                              placeholder="https://example.com/webhooks"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                            />
                            <input
                              value={hook.secret || ""}
                              onChange={(e) => {
                                const webhooks = [...formData.webhooks];
                                webhooks[idx] = { ...webhooks[idx], secret: e.target.value };
                                setFormData({ ...formData, webhooks });
                              }}
                              placeholder="Signing secret"
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
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
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-lg shadow-xs transition-all flex items-center justify-center gap-2">
                      <Check size={14} />
                      <span>{editingId ? "Update Configuration" : "Finalize Ecosystem Deployment"}</span>
                    </button>
                  </div>
                </div>

                {/* Right Segment: Live Preview */}
                <div className="lg:col-span-5 h-[460px]">
                  <PreviewWidget data={formData} />
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs">
          Neural Interface Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {getPaginationMeta(websites, page).pageItems.map((website) => (
          <div key={website._id} className={`rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 transition-all ${website.isActive !== false ? 'hover:border-indigo-400/50 dark:hover:border-indigo-500/30' : 'opacity-70 grayscale hover:grayscale-0'}`}>
            
            {/* Card Header Bar */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 relative transition-colors">
              {website.isActive === false && <div className="absolute inset-0 bg-slate-50/40 dark:bg-black/40 z-0" />}

              <div className="flex items-center gap-3 relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 border border-white/10"
                  style={{ backgroundColor: website.primaryColor, color: '#fff' }}
                >
                  <Globe size={18} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug truncate">
                      {website.websiteName}
                    </h4>
                    <span className={`px-1.5 py-0.2 text-[8.5px] font-black uppercase tracking-wider rounded ${website.isActive !== false ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {website.isActive !== false ? 'Live' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1 truncate">
                      {website.domain}
                    </p>
                    {website.managerId?.name && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className="text-[8.5px] text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-500/20 rounded uppercase tracking-wider">
                          Master: {website.managerId.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 relative z-10 shrink-0">
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
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1"
                >
                  <Network size={12} />
                  <span>Flow Builder</span>
                </button>

                <button
                  onClick={() => setLocalizingWebsite(website)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-xs border border-slate-200/80 dark:border-white/10 flex items-center gap-1"
                >
                  <DollarSign size={12} />
                  <span>Currency</span>
                </button>

                <button
                  onClick={() => setCustomizingWebsite(website)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-wider hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 transition-all shadow-xs border border-slate-200/80 dark:border-white/10 flex items-center gap-1"
                >
                  <Palette size={12} />
                  <span>Design</span>
                </button>

                <button
                  onClick={() => handleEdit(website)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-wider hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 transition-all shadow-xs border border-slate-200/80 dark:border-white/10 flex items-center gap-1"
                >
                  <Settings size={12} />
                  <span>Configure</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteWebsite(website)}
                  title="Delete Website"
                  className="p-1.5 bg-red-50 hover:bg-red-600 dark:bg-red-950/30 dark:hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all shadow-xs border border-red-200/60 dark:border-red-500/20 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Snippet & Keys Body */}
            <div className="p-3 sm:p-3.5 bg-slate-50/50 dark:bg-black/10 grid grid-cols-1 xl:grid-cols-12 gap-3 items-start relative z-10 transition-colors">
              
              {/* Snippet Block */}
              <div className="xl:col-span-8 space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quantum Deployment Snippet</span>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse delay-150" />
                  </div>
                </div>
                
                <div className="relative group/copy">
                  <div className="bg-[#0f172a] dark:bg-black border border-slate-800 dark:border-white/5 rounded-xl p-3 sm:p-3.5 font-mono text-[10px] sm:text-[10.5px] leading-relaxed flex items-start gap-3 pr-12 shadow-md relative overflow-hidden transition-all group-hover/copy:border-indigo-500/50">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60" />
                    <div className="text-slate-600 select-none hidden sm:block text-right pt-[1px] font-black text-[9px] leading-relaxed">
                      01<br />02<br />03<br />04<br />05<br />06<br />07
                    </div>
                    <div className="text-indigo-100/90 whitespace-pre-wrap break-all w-full overflow-x-auto selection:bg-indigo-500/40 tracking-tight font-medium">
                      {`<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${widgetBaseUrl}/chat-widget.js";\n    s.setAttribute("data-website-id", "${website.apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${widgetBaseUrl}/chat-widget.js";\n    s.setAttribute("data-website-id", "${website.apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`, website._id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-indigo-600 text-white rounded-lg backdrop-blur-md shadow-md hover:scale-105 active:scale-95 transition-all outline-none border border-white/10 flex items-center justify-center group-hover/copy:bg-indigo-500"
                    title="Copy Snippet"
                  >
                    {copiedId === website._id ? <Check size={14} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Secret Key & Icon State Column */}
              <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2 h-full">
                {/* Secret Key */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Secret Key
                  </span>
                  <div className="bg-slate-50 dark:bg-black/20 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/5 font-mono text-[10px] font-bold text-slate-800 dark:text-indigo-300 truncate tracking-tight select-all">
                    {website.apiKey}
                  </div>
                </div>

                {/* Icon State */}
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Icon State
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg shadow-xs flex items-center justify-center text-sm border border-white/10 shrink-0" style={{ backgroundColor: website.primaryColor, color: '#fff' }}>
                      <span className="drop-shadow-xs">{website.launcherIcon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Verified</p>
                      <p className="text-[8.5px] text-slate-400 dark:text-slate-500 font-bold uppercase truncate">Protocol Asset</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}

        {websites.length === 0 && !isAdding && (
          <div className="py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center space-y-2 bg-slate-50/30 dark:bg-white/5">
            <Globe size={28} className="text-indigo-600 dark:text-indigo-400 mx-auto" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">No Active Domains</h3>
            <p className="text-[10px] text-slate-400 max-w-sm mx-auto">Register a terminal to begin multi-website support deployment.</p>
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

  const inp = "w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors";
  const preview = formatPreview(settings);

  return (
    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <DollarSign size={15} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Currency &amp; Localization
            </h2>
            <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
              Configuring <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{website.websiteName}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
          title="Close Localization"
        >
          <X size={15} />
        </button>
      </div>

      {/* Live Preview Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3.5 sm:p-4 text-white shadow-sm flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-[8.5px] font-black uppercase tracking-wider opacity-80">Live Preview</p>
          <p className="text-xl sm:text-2xl font-black tracking-tight">{preview}</p>
          <p className="text-[9.5px] font-bold opacity-80 uppercase tracking-wider">{settings.currencyCode} · {settings.currency}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[8px] font-black uppercase tracking-wider opacity-80 mb-1">Symbol</p>
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg font-black border border-white/20">
            {settings.currencySymbol}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column: Currency Master */}
        <div className="space-y-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-3.5 shadow-xs">
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Currency Master</p>

          {/* Currency Picker */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Select Currency</label>
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
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Currency Name</label>
            <input
              className={inp}
              value={settings.currency}
              onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
              placeholder="e.g. UAE Dirham"
            />
          </div>

          {/* Symbol + Code row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Symbol</label>
              <input
                className={inp}
                value={settings.currencySymbol}
                onChange={e => setSettings(s => ({ ...s, currencySymbol: e.target.value }))}
                placeholder="د.إ"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Currency Code</label>
              <input
                className={inp}
                value={settings.currencyCode}
                onChange={e => setSettings(s => ({ ...s, currencyCode: e.target.value.toUpperCase() }))}
                placeholder="AED"
                maxLength={5}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Formatting Rules */}
        <div className="space-y-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-3.5 shadow-xs">
          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Formatting Rules</p>

          {/* Symbol Position */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Symbol Position</label>
            <div className="flex gap-2">
              {[
                { v: "before", label: "Before Amount", example: "₹100" },
                { v: "after",  label: "After Amount",  example: "100₹" }
              ].map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, symbolPosition: opt.v }))}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-[9.5px] font-black uppercase tracking-wider transition-all ${settings.symbolPosition === opt.v ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200/80 dark:border-white/10 hover:border-emerald-300"}`}
                >
                  {opt.label}
                  <span className="block text-[8px] mt-0.5 opacity-80 normal-case font-medium">{opt.example}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Decimal Places */}
          <div className="space-y-1">
            <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Decimal Places</label>
            <div className="flex gap-2">
              {[0, 2, 3].map(dp => (
                <button
                  key={dp}
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, decimalPlaces: dp }))}
                  className={`flex-1 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${settings.decimalPlaces === dp ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200/80 dark:border-white/10 hover:border-emerald-300"}`}
                >
                  {dp}
                </button>
              ))}
            </div>
          </div>

          {/* Separators */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Thousand Sep.</label>
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
            <div className="space-y-1">
              <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Decimal Sep.</label>
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-3.5 shadow-xs space-y-2">
        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Quick Currency Presets</p>
        <div className="flex flex-wrap gap-1.5">
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
              className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${settings.currencyCode === c.code ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-emerald-300"}`}
            >
              <span className="font-bold">{c.symbol}</span>
              <span>{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Errors / Success Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-bold">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
          <Check size={14} /> <span>Currency settings saved! Updating across CRM...</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {saving ? (
            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> <span>Saving...</span></>
          ) : success ? (
            <><Check size={13} /> <span>Saved Successfully</span></>
          ) : (
            <><DollarSign size={13} /> <span>Save Currency Settings</span></>
          )}
        </button>
      </div>
    </div>
  );
}
