import { useState } from "react";
import { X, Ticket, AlertTriangle, Tag, CheckCheck, Activity } from "lucide-react";
import { api } from "../api/client.js";

const PRIORITY_CONFIG = {
  low:    { label: "Low",    color: "bg-slate-50 text-slate-500", icon: "●" },
  medium: { label: "Medium", color: "bg-blue-50 text-blue-600",   icon: "▲" },
  high:   { label: "High",   color: "bg-orange-50 text-orange-600", icon: "▲▲" },
  urgent: { label: "Urgent", color: "bg-red-50 text-red-600",      icon: "⚡" }
};

const CRM_STAGE_CONFIG = {
  none:         { label: "Standard Support", icon: "🛠️" },
  lead:         { label: "New Lead",        icon: "✨" },
  qualified:    { label: "Qualified",       icon: "💎" },
  opportunity:  { label: "Opportunity",     icon: "🚀" },
  proposal:     { label: "Proposal Sent",   icon: "📄" },
  negotiation:  { label: "Negotiation",    icon: "🤝" },
  won:          { label: "Deal Won",        icon: "🏆" }
};

export default function TicketConversionModal({ session, onClose, onSuccess }) {
  const [subject, setSubject] = useState(`Support Request: ${session.visitorId?.name || session.visitorId?.visitorId || "Anonymous"}`);
  const [priority, setPriority] = useState("medium");
  const [crmStage, setCrmStage] = useState("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = async () => {
    if (!subject.trim()) {
      setError("Please enter a subject for the ticket.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api("/api/tickets/convert", {
        method: "POST",
        body: JSON.stringify({
          sessionId: session._id,
          subject,
          priority,
          crmStage
        })
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to convert chat to ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-100 dark:border-white/5 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 md:px-10 py-5 md:py-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Ticket size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">Bridge to Ticket</h3>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Initialize secondary resolution protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar flex-1">
           {error && (
             <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[11px] font-black uppercase tracking-widest rounded-2xl animate-in shake duration-500">
               {error}
             </div>
           )}

           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">Case Subject</label>
              <input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all dark:text-white"
              />
           </div>

           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">Priority Vector</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setPriority(key)}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                      priority === key 
                        ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-white/10 shadow-lg"
                        : "bg-slate-50 dark:bg-white/5 text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
           </div>

           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1">CRM Strategic Stage</label>
              <select 
                value={crmStage}
                onChange={(e) => setCrmStage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none uppercase tracking-widest"
              >
                {Object.entries(CRM_STAGE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key} className="dark:bg-slate-900">{cfg.icon} {cfg.label}</option>
                ))}
              </select>
           </div>
        </div>

        <div className="px-6 md:px-10 pb-6 md:pb-10 pt-4 shrink-0">
          <button
            onClick={handleConvert}
            disabled={saving}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><CheckCheck size={18} /> Materialize Ticket</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
