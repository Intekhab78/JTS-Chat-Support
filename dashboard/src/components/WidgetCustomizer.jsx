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
  const [previewOpen, setPreviewOpen] = useState(true);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api(`/api/websites/${website._id}`, {
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 animate-in slide-in-from-bottom-2 duration-300">
      {/* Settings Form */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="space-y-0.5">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Aesthetic Intelligence
          </h3>
          <p className="text-[9.5px] text-slate-400 font-medium">
            Configure how the primary neural interface appears to your visitors.
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Color Picker */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
              <Palette size={12} className="text-indigo-500" /> Brand Color Vector
            </label>
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200/80 dark:border-white/10">
              <div className="relative group shrink-0">
                <div
                  className="w-8 h-8 rounded-lg shadow-xs border border-black/10 cursor-pointer transition-transform group-hover:scale-105"
                  style={{ backgroundColor: config.primaryColor }}
                />
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Pick Color"
                />
              </div>
              <div className="flex-1 space-y-0.5">
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-full bg-transparent border-none text-xs font-black font-mono tracking-tight text-slate-900 dark:text-white outline-none"
                  placeholder="#HEXVAL"
                />
                <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Primary Cryptographic Color</p>
              </div>
            </div>
          </div>

          {/* Spatial Position */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
              <LayoutIcon size={12} className="text-indigo-500" /> Spatial Positioning
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/80 dark:border-white/10">
              {["left", "right"].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setConfig({ ...config, position: pos })}
                  className={`py-1.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all ${
                    config.position === pos
                      ? "bg-slate-950 dark:bg-indigo-600 text-white shadow-xs"
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {pos} Alignment
                </button>
              ))}
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
              <MessageSquare size={12} className="text-indigo-500" /> Initialization Sequence
            </label>
            <textarea
              value={config.welcomeMessage}
              onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none transition-all min-h-[72px] resize-none leading-relaxed placeholder:text-slate-400"
              placeholder="How can we help you today?"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-slate-950 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-2 rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {saving ? (
            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> <span>Saving...</span></>
          ) : success ? (
            <><Check size={14} className="text-emerald-400" /> <span>Config Initialized</span></>
          ) : (
            <><Sparkles size={14} /> <span>Apply Visual Identity</span></>
          )}
        </button>
      </div>

      {/* Live Preview */}
      <div className="lg:col-span-7 relative bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border-2 border-dashed border-slate-200/80 dark:border-white/10 flex flex-col p-3 overflow-hidden min-h-[380px] transition-colors">
        {/* Preview Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md shadow-xs border border-slate-200/80 dark:border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Simulated Synthesis</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-md text-[8px] font-bold">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className={`px-1.5 py-0.5 rounded transition-all ${previewOpen ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
            >
              Open Widget
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className={`px-1.5 py-0.5 rounded transition-all ${!previewOpen ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-600"}`}
            >
              Launcher Bubble
            </button>
          </div>
        </div>

        {/* Mock App Background Ghost (Filled, compact, realistic to eliminate dead gaps) */}
        <div className="w-full space-y-2 opacity-20 pointer-events-none select-none flex-1 p-2">
          {/* Top header bar */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-300 dark:border-slate-700">
            <div className="w-20 h-2 bg-slate-400 dark:bg-slate-600 rounded" />
            <div className="flex gap-2">
              <div className="w-8 h-1.5 bg-slate-300 dark:bg-slate-700 rounded" />
              <div className="w-8 h-1.5 bg-slate-300 dark:bg-slate-700 rounded" />
            </div>
          </div>
          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 space-y-1">
              <div className="w-12 h-1.5 bg-slate-400 dark:bg-slate-600 rounded" />
              <div className="w-16 h-2.5 bg-slate-600 dark:bg-slate-400 rounded" />
            </div>
            <div className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 space-y-1">
              <div className="w-12 h-1.5 bg-slate-400 dark:bg-slate-600 rounded" />
              <div className="w-16 h-2.5 bg-slate-600 dark:bg-slate-400 rounded" />
            </div>
          </div>
          {/* Activity lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-5/6" />
            <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-4/6" />
            <div className="h-1.5 bg-slate-300 dark:bg-slate-700 rounded w-3/6" />
          </div>
        </div>

        {/* Interactive Mock Widget / Launcher */}
        <div
          className="absolute bottom-3 transition-all duration-300 z-10"
          style={{ [config.position]: "16px" }}
        >
          {previewOpen ? (
            <div className="shadow-xl rounded-xl overflow-hidden flex flex-col w-[240px] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-2.5 flex items-center justify-between text-white relative transition-colors" style={{ backgroundColor: config.primaryColor }}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
                <div className="flex items-center gap-2 relative z-10 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center text-xs shadow-xs border border-white/20 shrink-0">
                    {config.launcherIcon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5 truncate drop-shadow-xs">
                      {website?.websiteName || 'Unknown Entity'}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      <span className="text-[7px] font-bold opacity-85 uppercase tracking-wider">Protocol Active</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="relative z-10 text-white/80 hover:text-white text-[10px] font-bold px-1"
                  title="Minimize"
                >
                  ─
                </button>
              </div>

              {/* Message Area */}
              <div className="p-2.5 space-y-2 bg-[#f8fafc] dark:bg-black/20 transition-colors">
                <div className="flex gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] shadow-xs text-white" style={{ backgroundColor: config.primaryColor }}>
                    {config.launcherIcon}
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 text-[9px] font-bold text-slate-700 dark:text-slate-300 rounded-lg rounded-tl-none border border-slate-200/80 dark:border-white/10 shadow-2xs leading-snug">
                    {config.welcomeMessage}
                  </div>
                </div>
                {/* Quick Action Chips */}
                <div className="flex flex-wrap gap-1 pl-6">
                  <span className="px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                    💬 Live Chat
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs">
                    🎫 Support
                  </span>
                </div>
              </div>

              {/* Input Bar */}
              <div className="p-2 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 flex gap-1.5 transition-colors">
                <div className="flex-1 h-7 bg-slate-50 dark:bg-black/20 rounded-md border border-slate-200/80 dark:border-white/10 text-[8px] text-slate-400 flex items-center px-2">Type a message...</div>
                <div className="w-7 h-7 rounded-md shadow-xs flex items-center justify-center text-white shrink-0" style={{ backgroundColor: config.primaryColor }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-9 h-9 rounded-xl shadow-lg flex items-center justify-center text-sm text-white border border-white dark:border-slate-800 transition-transform hover:scale-110 active:scale-95 animate-in zoom-in-95 duration-200"
              style={{ backgroundColor: config.primaryColor }}
              title="Click to open widget preview"
            >
              <span className="drop-shadow-xs">{config.launcherIcon}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
