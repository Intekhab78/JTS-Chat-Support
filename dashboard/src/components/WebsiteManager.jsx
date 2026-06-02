import { useState, useEffect } from "react";
import { Globe, Plus, Trash2, Copy, Check, Settings, Code, Palette, X } from "lucide-react";
import { api, API_BASE } from "../api/client.js";
import WidgetCustomizer from "./WidgetCustomizer.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";

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
    awayMessage: "Hello! We're currently offline, but if you leave a message, we'll get back to you shortly.",
    quickReplies: [],
    isActive: true,
    businessHours: createDefaultBusinessHours(),
    webhooks: []
  });
  const [customizingWebsite, setCustomizingWebsite] = useState(null);
  const [page, setPage] = useState(1);

  const fetchWebsites = async () => {
    try {
      const data = await api("/api/websites");
      setWebsites(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
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
      awayMessage: "Hello! We're currently offline, but if you leave a message, we'll get back to you shortly.",
      quickReplies: [],
      isActive: true,
      businessHours: createDefaultBusinessHours(),
      webhooks: []
    });
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
      awayMessage: website.awayMessage || "Hello! We're currently offline, but if you leave a message, we'll get back to you shortly.",
      quickReplies: website.quickReplies || [],
      isActive: website.isActive !== false,
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
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-5 z-10 w-[280px] pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{ filter: data.isActive ? 'none' : 'grayscale(1) opacity(0.6)' }}>
          <div className="w-full bg-white dark:bg-slate-950 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-[32px] overflow-hidden border border-slate-100 dark:border-white/5 flex flex-col transform transition-all hover:-translate-y-2 origin-bottom-right">
            {/* Widget Header */}
            <div className="p-6 transition-colors relative h-20 flex flex-col justify-center" style={{ backgroundColor: data.primaryColor }}>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <h5 className="text-white text-[13px] font-black drop-shadow-md uppercase tracking-tight">{data.websiteName || 'New Brand'}</h5>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <p className="text-white/80 text-[10px] font-bold">Agents Active</p>
              </div>
            </div>
            {/* Widget Messages */}
            <div className="p-5 bg-[#f8fafc] dark:bg-black/30 space-y-4 min-h-[160px] border-b border-indigo-50/10 transition-colors">
              <div className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] text-white shadow-xl transition-all shrink-0 border border-white/10" style={{ backgroundColor: data.primaryColor }}>
                  {data.launcherIcon}
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 p-3.5 rounded-2xl rounded-tl-sm text-[11px] text-slate-700 dark:text-slate-200 shadow-sm leading-relaxed font-bold">
                  {data.awayMessage || 'Initiating support protocol...'}
                </div>
              </div>
            </div>
            {/* Widget Input Mock */}
            <div className="p-5 bg-white dark:bg-slate-950 flex gap-3 items-center transition-colors">
              <div className="flex-1 bg-slate-50 dark:bg-black/20 rounded-xl p-3 text-[10px] text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-white/5 font-bold">Type a message...</div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xl transition-all" style={{ backgroundColor: data.primaryColor }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </div>
            </div>
          </div>

          {/* Launcher Button */}
          <div className="w-14 h-14 rounded-[22px] shadow-2xl flex items-center justify-center text-2xl text-white transition-all hover:scale-110 hover:shadow-indigo-500/20 duration-500 border-2 border-white dark:border-slate-800" style={{ backgroundColor: data.primaryColor }}>
            <span className="drop-shadow-lg">{data.launcherIcon}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (customizingWebsite) {
    return (
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h3 className="heading-md dark:text-white">Design Synthesis: {customizingWebsite.websiteName}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Live branding engine for distributed widget deployment.</p>
          </div>
          <button
            onClick={() => setCustomizingWebsite(null)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-950 hover:text-white transition-all shadow-sm"
          >
            Return to Fleet
          </button>
        </div>
        <WidgetCustomizer
          website={customizingWebsite}
          onUpdate={(updated) => {
            setCustomizingWebsite(updated);
            fetchWebsites();
          }}
        />
      </div>
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

      {isAdding && (
        <form onSubmit={handleSubmit} className="premium-card p-10 md:p-16 animate-in zoom-in-95 duration-700 overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 transition-colors">
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
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="small-label dark:text-slate-400">Auto-Responder Signal</label>
                    <textarea
                      value={formData.awayMessage}
                      onChange={(e) => setFormData({ ...formData, awayMessage: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4.5 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all h-[155px] resize-none text-slate-600 dark:text-slate-300 shadow-inner leading-relaxed"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Quick Replies Section */}
              <div className="pt-10 border-t border-slate-50 dark:border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="small-label dark:text-slate-400">Quick Replies & Auto-Responders</label>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Predefined pills that visitors can click to send/get info.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, quickReplies: [...formData.quickReplies, { text: "", autoResponse: "" }] })}
                    className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    Add Pillar
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.quickReplies.map((qr, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-6 bg-slate-50 dark:bg-black/20 rounded-[28px] border border-slate-100 dark:border-white/5 group relative animate-in slide-in-from-right-2 duration-300">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Button Text (Visitor Sees)</span>
                          <input
                            value={qr.text}
                            onChange={(e) => {
                              const newQR = [...formData.quickReplies];
                              newQR[idx].text = e.target.value;
                              setFormData({ ...formData, quickReplies: newQR });
                            }}
                            placeholder="e.g. Pricing Details?"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-[11px] font-black outline-none focus:border-indigo-500 transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Auto-Response (System Replies) — Optional</span>
                          <textarea
                            value={qr.autoResponse}
                            onChange={(e) => {
                              const newQR = [...formData.quickReplies];
                              newQR[idx].autoResponse = e.target.value;
                              setFormData({ ...formData, quickReplies: newQR });
                            }}
                            placeholder="e.g. Our basic plan starts at $29/mo..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:border-indigo-500 transition-all shadow-sm h-20 resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newQR = formData.quickReplies.filter((_, i) => i !== idx);
                          setFormData({ ...formData, quickReplies: newQR });
                        }}
                        className="mt-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {formData.quickReplies.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[32px]">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No interactive pillars defined.</p>
                    </div>
                  )}
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
                      className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4.5 text-xl font-black focus:border-indigo-500/50 outline-none transition-all text-center shadow-inner"
                      placeholder="💬"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="small-label dark:text-slate-400">System State</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      className={`w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${formData.isActive
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-red-500 text-white shadow-red-500/20"
                        }`}
                    >
                      {formData.isActive ? "Online" : "Paused"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-50 dark:border-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="small-label dark:text-slate-400">Business Hours</label>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Offline form appears automatically when closed.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      businessHours: { ...formData.businessHours, enabled: !formData.businessHours?.enabled }
                    })}
                    className={`rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest ${formData.businessHours?.enabled ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
                  >
                    {formData.businessHours?.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input
                    value={formData.businessHours?.timezone || "Asia/Kolkata"}
                    onChange={(e) => setFormData({
                      ...formData,
                      businessHours: { ...formData.businessHours, timezone: e.target.value }
                    })}
                    className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-black"
                    placeholder="Timezone, e.g. Asia/Kolkata"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={formData.businessHours?.monday?.open || "09:00"}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessHours: {
                          ...formData.businessHours,
                          monday: { ...(formData.businessHours?.monday || {}), open: e.target.value, isOpen: true }
                        }
                      })}
                      className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-4 text-xs font-black"
                    />
                    <input
                      type="time"
                      value={formData.businessHours?.monday?.close || "17:00"}
                      onChange={(e) => setFormData({
                        ...formData,
                        businessHours: {
                          ...formData.businessHours,
                          monday: { ...(formData.businessHours?.monday || {}), close: e.target.value, isOpen: true }
                        }
                      })}
                      className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-4 text-xs font-black"
                    />
                  </div>
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
              <div className="flex flex-wrap gap-4 relative z-10 shrink-0">
                <button
                  onClick={() => setCustomizingWebsite(website)}
                  className="px-8 py-4.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/10 flex items-center gap-3 hover:scale-105 active:scale-95"
                >
                  <Palette size={16} /> Design System
                </button>
                <button
                  onClick={() => handleEdit(website)}
                  className="px-8 py-4.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-950 dark:hover:bg-black hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/5 flex items-center gap-3 hover:scale-105 active:scale-95"
                >
                  <Settings size={16} /> Configure
                </button>
                <button
                  type="button"
                  disabled
                  title="Website deletion is not available from this screen yet."
                  className="p-4.5 bg-red-50 dark:bg-red-500/5 text-red-400 rounded-2xl transition-all shadow-sm border border-red-100 dark:border-red-500/10 cursor-not-allowed opacity-60"
                >
                  <Trash2 size={18} />
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
                      {`<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${API_BASE}/chat-widget.js";\n    s.setAttribute("data-api-key", "${website.apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${API_BASE}/chat-widget.js";\n    s.setAttribute("data-api-key", "${website.apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`, website._id)}
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
