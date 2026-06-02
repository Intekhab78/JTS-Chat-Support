import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "../api/client.js";

const STATUS_STEPS = ["open", "in_progress", "waiting", "resolved", "closed"];

const STATUS_CONFIG = {
  open:         { label: "Open",        desc: "Your ticket has been received and is awaiting assignment.",   color: "#6366f1", bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
  in_progress:  { label: "In Progress", desc: "An agent is reviewing your request and will update you soon.", color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  waiting:      { label: "Waiting",     desc: "We are waiting on a response or internal action before progressing this ticket.", color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  pending:      { label: "In Progress", desc: "An agent is reviewing your request and will update you soon.", color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  resolved:     { label: "Resolved",    desc: "Your issue has been resolved. Please let us know if you need more help.", color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  closed:       { label: "Closed",      desc: "This ticket has been closed. Thank you for reaching out!", color: "#64748b", bg: "bg-slate-100 dark:bg-white/5", text: "text-slate-500 dark:text-slate-400" }
};

const PRIORITY_COLORS = { low: "#94a3b8", medium: "#6366f1", high: "#f97316", urgent: "#ef4444" };

export default function TicketStatusPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticketId) return;
    fetch(`${API_BASE}/api/tickets/public/${ticketId}`)
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.message)))
      .then(data => { setTicket(data); setLoading(false); })
      .catch(err => { setError(typeof err === "string" ? err : "Ticket not found."); setLoading(false); });
  }, [ticketId]);

  const currentStepIndex = ticket ? STATUS_STEPS.indexOf(ticket.status) : -1;
  const primaryColor = ticket?.website?.primaryColor || "#6366f1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 flex items-center justify-center p-6 transition-colors duration-500">
      <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Branding Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl transition-transform hover:rotate-6" style={{ backgroundColor: primaryColor }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          {ticket?.website?.websiteName && (
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-1">{ticket.website.websiteName}</p>
          )}
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Ticket Status</h1>
        </div>

        {loading && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200/60 dark:border-white/5 shadow-2xl p-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-100 dark:border-white/5 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Protocol...</p>
          </div>
        )}

        {error && (
          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-red-100 dark:border-red-500/20 shadow-2xl p-20 text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-2">
               <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Signal Interrupted</p>
               <p className="text-xs text-slate-400 dark:text-slate-500 font-bold px-8">{error}</p>
            </div>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 font-black uppercase tracking-[0.2em]">Verify your tracking credentials</p>
          </div>
        )}

        {ticket && (
          <div className="space-y-6">
            {/* Main Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200/60 dark:border-white/5 shadow-2xl overflow-hidden transition-colors">
              
              {/* Status Banner */}
              <div className="p-10 border-b border-slate-50 dark:border-white/5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-block px-3 py-1 bg-slate-900 dark:bg-indigo-600 rounded-lg shadow-lg">
                       <p className="text-[10px] font-black text-white uppercase tracking-widest">{ticket.ticketId}</p>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-4 leading-tight">{ticket.subject}</h2>
                  </div>
                  <div
                    className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm border ${STATUS_CONFIG[ticket.status]?.bg} ${STATUS_CONFIG[ticket.status]?.text}`}
                  >
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: STATUS_CONFIG[ticket.status]?.color }} />
                    {STATUS_CONFIG[ticket.status]?.label}
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-6 leading-relaxed bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 ">{STATUS_CONFIG[ticket.status]?.desc}</p>
              </div>

              {/* Progress Track */}
              <div className="px-10 py-10 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-black/10">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Resolution Vector</p>
                <div className="relative max-w-sm mx-auto">
                  {/* Track line */}
                  <div className="absolute top-4 left-0 right-0 h-1 bg-slate-100 dark:bg-white/5 rounded-full" />
                  <div
                    className="absolute top-4 left-0 h-1 transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{
                      width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                      backgroundColor: primaryColor
                    }}
                  />
                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step} className="flex flex-col items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${i <= currentStepIndex ? 'shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/10'}`}
                          style={i <= currentStepIndex ? { backgroundColor: primaryColor, borderColor: 'white', borderOpacity: 0.1 } : {}}
                        >
                          {i <= currentStepIndex ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                          )}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${i <= currentStepIndex ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-700'}`}>
                          {STATUS_CONFIG[step]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Details Architecture */}
              <div className="px-10 py-8 grid grid-cols-2 md:grid-cols-3 gap-8 bg-white dark:bg-slate-900">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Priority</p>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[ticket.priority] || "#94a3b8" }} />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{ticket.priority}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sector</p>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{ticket.channel || "Web Core"}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Assigned Force</p>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{ticket.agent?.name || "Pending Selection"}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Initialization</p>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{new Date(ticket.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Sync</p>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">{new Date(ticket.updatedAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</span>
                </div>
              </div>

              {/* Communication Hub */}
              {ticket.notes?.length > 0 && (
                <div className="px-10 py-10 border-t border-slate-50 dark:border-white/5 bg-slate-50/20 dark:bg-black/5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Operation Updates</p>
                  <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-white/5">
                    {ticket.notes.map((note, i) => (
                      <div key={i} className="flex gap-6 relative">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm" style={{ backgroundColor: primaryColor }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-800 rounded-[28px] px-6 py-5 border border-slate-100 dark:border-white/5 shadow-sm">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                             <span>Support Protocol Agent</span>
                             <span className="opacity-60">{new Date(note.createdAt).toLocaleDateString()} • {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{note.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Persistence Note */}
            <div className="bg-slate-900/5 dark:bg-white/5 p-6 rounded-[28px] border border-white/50 dark:border-white/5 text-center">
               <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">
                 Bookmark this secure portal to monitor real-time progress.
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
