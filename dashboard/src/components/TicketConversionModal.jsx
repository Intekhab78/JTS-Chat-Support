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
  const existingName = (session.visitorId?.name && session.visitorId?.name !== "Anonymous" && !session.visitorId?.name.startsWith("visitor_")) ? session.visitorId?.name : "";
  const existingEmail = session.visitorId?.email || "";

  const [visitorName, setVisitorName] = useState(existingName);
  const [visitorEmail, setVisitorEmail] = useState(existingEmail);
  const [subject, setSubject] = useState(`Support Request: ${existingName || session.websiteId?.websiteName || "Visitor"}`);
  const [priority, setPriority] = useState("medium");
  const [crmStage, setCrmStage] = useState("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = async () => {
    if (!visitorName.trim()) {
      setError("Visitor Name is required. Anonymous tickets are not allowed.");
      return;
    }

    if (!visitorEmail.trim() || !visitorEmail.includes("@")) {
      setError("A valid Visitor Email is required. Tickets cannot be generated without an email.");
      return;
    }

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
          subject: subject.trim(),
          priority,
          crmStage,
          visitorName: visitorName.trim(),
          visitorEmail: visitorEmail.trim()
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
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Name & Email are required for ticket generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-10 space-y-5 overflow-y-auto custom-scrollbar flex-1">
           {error && (
             <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl animate-in shake duration-500">
               ⚠️ {error}
             </div>
           )}

           {/* Visitor Name & Email Requirements */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                 Visitor Name <span className="text-rose-500">*</span>
               </label>
               <input 
                 value={visitorName}
                 onChange={(e) => setVisitorName(e.target.value)}
                 placeholder="e.g. Rahul Sharma"
                 className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                 required
               />
             </div>

             <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                 Visitor Email <span className="text-rose-500">*</span>
               </label>
               <input 
                 type="email"
                 value={visitorEmail}
                 onChange={(e) => setVisitorEmail(e.target.value)}
                 placeholder="visitor@example.com"
                 className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                 required
               />
             </div>
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                Case Subject <span className="text-rose-500">*</span>
              </label>
              <input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
              />
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Priority Level</label>
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setPriority(key)}
                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      priority === key 
                        ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-white/10 shadow-sm"
                        : "bg-slate-50 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">CRM Strategic Stage</label>
              <select 
                value={crmStage}
                onChange={(e) => setCrmStage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
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
