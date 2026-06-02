import { useState, useEffect } from "react";
import { Check, Layout as LayoutIcon, Palette, MessageSquare, AlertCircle, Sparkles } from "lucide-react";
import { api } from "../api/client.js";

export default function WidgetCustomizer({ website, onUpdate }) {
  const [config, setConfig] = useState({
    primaryColor: website?.primaryColor || "#6366f1",
    position: website?.position || "right",
    welcomeMessage: website?.welcomeMessage || "Hi there!",
    launcherIcon: website?.launcherIcon || "💬",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api(`/api/websites/${website._id}/widget-config`, {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save config: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-4 duration-700">
      {/* Settings Form */}
      <div className="premium-card p-10 space-y-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 transition-colors">
        <div className="flex flex-col gap-1.5">
          <h3 className="heading-md dark:text-white">Aesthetic Intelligence</h3>
          <p className="small-label dark:text-slate-500">Configure how the primary neural interface appears to your visitors.</p>
        </div>

        <div className="space-y-8">
          {/* Color Picker */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <Palette size={16} className="text-indigo-500" /> Brand Color Vector
            </label>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-black/20 p-4 rounded-[28px] border-2 border-slate-100 dark:border-white/5 shadow-inner">
              <div className="relative group">
                 <input
                   type="color"
                   value={config.primaryColor}
                   onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                   className="w-14 h-14 rounded-2xl cursor-pointer border-none bg-transparent overflow-hidden"
                 />
                 <div className="absolute inset-0 rounded-2xl border-2 border-white/20 pointer-events-none group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex-1 space-y-1">
                 <input
                   type="text"
                   value={config.primaryColor}
                   onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                   className="w-full bg-transparent border-none text-sm font-black font-mono tracking-tighter text-slate-900 dark:text-white outline-none"
                   placeholder="#HEXVAL"
                 />
                 <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">Primary Cryptographic Color</p>
              </div>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <LayoutIcon size={16} className="text-indigo-500" /> Spatial Positioning
            </label>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-black/20 p-2 rounded-[28px] border-2 border-slate-100 dark:border-white/5 shadow-inner">
              {["left", "right"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setConfig({ ...config, position: pos })}
                  className={`py-4.5 rounded-[22px] text-[10px] font-black uppercase tracking-[0.25em] border-2 transition-all duration-500 ${
                    config.position === pos
                      ? "bg-slate-950 dark:bg-indigo-600 text-white border-slate-950 dark:border-white/10 shadow-2xl scale-100"
                      : "bg-transparent text-slate-400 dark:text-slate-700 border-transparent hover:text-slate-600 dark:hover:text-slate-400"
                  }`}
                >
                  {pos} Alignment
                </button>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <MessageSquare size={16} className="text-indigo-500" /> Initialization Sequence
            </label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[28px] px-8 py-6 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500/50 outline-none transition-all min-h-[140px] resize-none shadow-inner leading-relaxed placeholder:text-slate-200 dark:placeholder:text-slate-800"
              placeholder="How can we help you today?"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.4em] py-6 rounded-[28px] shadow-2xl shadow-indigo-500/10 transition-all flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : success ? (
             <><Check size={18} className="text-emerald-400" /> Config Initialized</>
          ) : (
             <><Sparkles size={18} /> Apply Visual Identity</>
          )}
        </button>
      </div>

      {/* Live Preview */}
      <div className="relative bg-slate-50 dark:bg-black/40 rounded-[64px] border-4 border-dashed border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center p-12 overflow-hidden min-h-[600px] transition-colors">
        <div className="absolute top-10 left-10 flex items-center gap-3 bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl shadow-xl border border-slate-100 dark:border-white/5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-600">Simulated Synthesis</span>
        </div>

        {/* Mock App Context */}
        <div className="w-full space-y-8 opacity-10 dark:opacity-5 pointer-events-none scale-90 translate-y-10">
          <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded-full w-3/4" />
          <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded-full w-1/2" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-48 bg-slate-400 dark:bg-slate-600 rounded-[40px]" />
            <div className="h-48 bg-slate-400 dark:bg-slate-600 rounded-[40px]" />
          </div>
          <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded-full w-2/3" />
        </div>

        {/* Mock Widget */}
        <div 
          className="absolute bottom-12 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] rounded-[40px] overflow-hidden flex flex-col w-[320px] h-[480px] bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 group hover:scale-[1.02]"
          style={{ [config.position]: "40px" }}
        >
          <div className="p-7 flex items-center gap-4 text-white relative h-24 flex flex-col justify-center" style={{ background: config.primaryColor }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10 w-full">
               <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-lg border border-white/20">{config.launcherIcon}</div>
               <div className="flex flex-col min-w-0">
                 <span className="text-[14px] font-black uppercase tracking-tight leading-none mb-1 truncate">{website?.websiteName || 'Unknown Entity'}</span>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-[9px] font-black opacity-80 uppercase tracking-widest">Protocol Active</span>
                 </div>
               </div>
            </div>
          </div>
          <div className="flex-1 p-8 space-y-6 bg-[#f8fafc] dark:bg-black/20 transition-colors">
             <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-3 duration-1000">
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[12px] shadow-lg border border-white/10 text-white" style={{ background: config.primaryColor }}>
                   {config.launcherIcon}
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-700 dark:text-slate-300 rounded-[22px] rounded-tl-none border border-slate-100 dark:border-white/5 shadow-sm leading-relaxed">
                  {config.welcomeMessage}
                </div>
             </div>
          </div>
          <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-50 dark:border-white/5 flex gap-3 transition-colors">
            <div className="flex-1 h-12 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner" />
            <div className="w-12 h-12 rounded-2xl shadow-xl transition-all border border-white/10" style={{ background: config.primaryColor }} />
          </div>
        </div>
        
        {/* Launcher preview under the widget */}
        <div 
          className="absolute bottom-[-10px] w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-2xl text-white transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] border-2 border-white dark:border-slate-800"
          style={{ [config.position]: "40px", backgroundColor: config.primaryColor, transform: 'translateY(-20px)' }}
        >
           <span className="drop-shadow-lg">{config.launcherIcon}</span>
        </div>
      </div>
    </div>
  );
}
