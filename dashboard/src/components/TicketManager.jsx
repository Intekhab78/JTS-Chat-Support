import { useState, useEffect } from "react";
import {
   Ticket, Plus, Search, Filter, ChevronDown, Check,
   Clock, AlertTriangle, X, MessageSquare, Globe, User,
   Link, Copy, CheckCheck, ChevronRight, Tag, Activity,
   ArrowUpRight, History, Settings2, Edit3, Layers, LayoutGrid, List
} from "lucide-react";
import { api, apiUrl } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { cleanString } from "../utils/stringUtils.js";
import ActivityTimeline from "./ActivityTimeline.jsx";
import { HeatIndicator, NBARecommendationCard, CRMStageBadge, LEAD_STATUS_STYLES } from "./CrmSystem/CrmUIComponents.jsx";
import { Brain } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";

const STATUS_CONFIG = {
   open: { label: "Open", color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20", dot: "bg-blue-500" },
   in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-500" },
   waiting: { label: "Waiting", color: "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", dot: "bg-violet-500" },
   pending: { label: "Pending", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-500" },
   resolved: { label: "Resolved", color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", dot: "bg-emerald-500" },
   closed: { label: "Closed", color: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5", dot: "bg-slate-400" }
};

const PRIORITY_CONFIG = {
   low: { label: "Low", color: "bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400", icon: "●" },
   medium: { label: "Medium", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", icon: "▲" },
   high: { label: "High", color: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400", icon: "▲▲" },
   urgent: { label: "Urgent", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", icon: "⚡" }
};

const CRM_STAGE_CONFIG = {
   none: { label: "Standard Support", color: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400", icon: "🛠️" },
   lead: { label: "New Lead", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400", icon: "✨" },
   qualified: { label: "Qualified", color: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400", icon: "💎" },
   opportunity: { label: "Opportunity", color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", icon: "🚀" },
   proposal: { label: "Proposal Sent", color: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400", icon: "📄" },
   negotiation: { label: "Negotiation", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", icon: "🤝" },
   won: { label: "Deal Won", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", icon: "🏆" },
   lost: { label: "Closed Lost", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", icon: "❌" }
};

function getSLADetails(ticket) {
   if (!ticket?.createdAt) return null;
   if (["resolved", "closed"].includes(ticket.status)) return null;

   const dueAt = ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt) : (() => {
      const createdAt = new Date(ticket.createdAt);
      if (Number.isNaN(createdAt.getTime())) return null;
      const priorityHours = {
         low: 48,
         medium: 24,
         high: 8,
         urgent: 2
      };
      return new Date(createdAt.getTime() + (priorityHours[ticket.priority] || 24) * 60 * 60 * 1000);
   })();
   if (!dueAt || Number.isNaN(dueAt.getTime())) return null;
   const diffMs = dueAt.getTime() - Date.now();
   const isBreached = diffMs < 0;
   const absMinutes = Math.round(Math.abs(diffMs) / 60000);

   if (absMinutes < 60) {
      return { isBreached, timeStr: `${absMinutes}m` };
   }

   const hours = Math.floor(absMinutes / 60);
   const minutes = absMinutes % 60;
   return {
      isBreached,
      timeStr: minutes ? `${hours}h ${minutes}m` : `${hours}h`
   };
}

function CopyButton({ text }) {
   const [copied, setCopied] = useState(false);
   const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };
   return (
      <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
         {copied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
   );
}

function getLatestAssignmentReason(ticket) {
   return ticket.assignmentHistory?.[0]?.reason || ticket.assignmentReason || "";
}

function TicketDetailPanel({ ticket, onUpdate, onClose, assignableAgents = [], canManageAssignment = false }) {
   const toast = useToast();
   const [status, setStatus] = useState(ticket.status);
   const [priority, setPriority] = useState(ticket.priority);
   const [crmStage, setCrmStage] = useState(ticket.crmStage || "none");
   const [assignedAgent, setAssignedAgent] = useState(ticket.assignedAgent?._id || "");
   const [assignmentReason, setAssignmentReason] = useState(ticket.assignmentReason || "");
   const [note, setNote] = useState("");
   const [noteIsPublic, setNoteIsPublic] = useState(true);
   const [saving, setSaving] = useState(false);
   const [savedSuccess, setSavedSuccess] = useState(false);
   const [activity, setActivity] = useState([]);

   useEffect(() => {
      api(`/api/tickets/${ticket._id}/activity`).then(setActivity).catch(() => setActivity([]));
   }, [ticket._id]);

   const dashboardBase = window.location.origin;
   const publicStatusUrl = `${dashboardBase}/ticket-status/${ticket.ticketId}`;

   const handleSave = async () => {
      setSaving(true);
      try {
         const payload = { status, priority, crmStage };
         if (canManageAssignment) {
            payload.assignedAgent = assignedAgent || null;
            if (assignmentReason.trim()) payload.assignmentReason = assignmentReason.trim();
         }
         if (note.trim()) { payload.note = note; payload.noteIsPublic = noteIsPublic; }
         await api(`/api/tickets/${ticket._id}`, { method: "PATCH", body: JSON.stringify(payload) });
         onUpdate();
         setNote("");
         setSavedSuccess(true);
         setTimeout(() => setSavedSuccess(false), 2000);
      } catch (e) {
         toast.error("Failed to update ticket: " + e.message);
      } finally {
         setSaving(false);
      }
   };

   const formatSLA = (start, end) => {
      if (!start || !end) return "--";
      const diff = Math.round((new Date(end) - new Date(start)) / 60000);
      if (diff < 1) return "< 1m";
      if (diff < 60) return `${diff}m`;
      return `${Math.round(diff / 60)}h ${diff % 60}m`;
   };

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
         <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md" onClick={onClose} />

         <div className="relative w-full max-w-6xl h-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden border border-slate-100 dark:border-white/5 transition-all animate-in zoom-in-95 duration-500">

            {/* Compact Header */}
            <div className="px-6 md:px-10 py-5 md:py-6 border-b border-slate-50 dark:border-white/5 flex flex-wrap gap-4 items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 shrink-0">
               <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                     <Ticket size={24} />
                  </div>
                  <div>
                     <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{ticket.ticketId}</h3>
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${STATUS_CONFIG[ticket.status]?.color}`}>
                           {STATUS_CONFIG[ticket.status]?.label}
                        </div>
                        {["department_auto_assignment", "department_reassignment"].includes(getLatestAssignmentReason(ticket)) ? (
                           <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-sky-100 bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
                              Auto Routed
                           </div>
                        ) : null}
                     </div>
                     <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mt-1">Universal Service Record</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20">
                  <X size={20} />
               </button>
            </div>

            {/* Master Container: Two-Column Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

               {/* Left Column: Intelligence & Logs (Scrollable) */}
               <div className="lg:flex-[1.4] border-b lg:border-b-0 lg:border-r border-slate-50 dark:border-white/5 lg:overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-black/10 shrink-0">

                  {/* Meta Grid */}
                  <div className="p-6 lg:p-10 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-10">
                     <div className="space-y-1.5 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <span className="small-label flex items-center gap-2">
                           <User size={12} className="text-indigo-400" /> Visitor Identity
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{ticket.visitorId?.name || "Anonymous User"}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{ticket.visitorId?.email || "No contact vector"}</p>
                     </div>
                     <div className="space-y-1.5 p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <span className="small-label flex items-center gap-2">
                           <Activity size={12} className="text-indigo-400" /> Resolution Agent
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{ticket.assignedAgent?.name || "Awaiting Assignment"}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{ticket.department || "general"} department</p>
                     </div>
                  </div>

                  {/* Category & Subcategory Grid */}
                  {(ticket.category || ticket.subcategory) && (
                     <div className="px-6 lg:px-10 pb-6 lg:pb-10 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-10">
                        <div className="space-y-1.5 p-6 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 shadow-sm">
                           <span className="small-label flex items-center gap-2">
                              <Layers size={12} className="text-indigo-500" /> Primary Category
                           </span>
                           <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{ticket.category || "Unclassified"}</p>
                        </div>
                        <div className="space-y-1.5 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                           <span className="small-label flex items-center gap-2">
                              <Tag size={12} className="text-indigo-400" /> Sub-Tier
                           </span>
                           <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">{ticket.subcategory || "General"}</p>
                        </div>
                     </div>
                  )}

                  {/* SLA Metrics Grid */}
                  <div className="px-6 lg:px-10 pb-6 lg:pb-10 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-10">
                     <div className="p-6 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100 dark:border-emerald-500/10">
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 block">Initial Response SLA</span>
                        <div className="flex items-end gap-2">
                           <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{formatSLA(ticket.createdAt, ticket.firstResponseAt)}</p>
                           <span className="text-[10px] font-bold text-emerald-600 mb-0.5">Target: 30m</span>
                        </div>
                     </div>
                     <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-500/10">
                        <span className="text-[9px] font-black text-blue-600 dark:blue-400 uppercase tracking-widest mb-2 block">Resolution SLA</span>
                        <div className="flex items-end gap-2">
                           <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{formatSLA(ticket.createdAt, ticket.resolvedAt)}</p>
                           <span className="text-[10px] font-bold text-blue-600 mb-0.5">Target: 24h</span>
                        </div>
                     </div>
                  </div>

                  {/* Public Link Section */}
                  <div className="px-6 lg:px-10 pb-6 lg:pb-10">
                     <div className="p-8 bg-indigo-600 rounded-[32px] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-x-12 -translate-y-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative z-10 flex flex-col gap-5">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Universal Tracking Interface</span>
                              <Link size={16} className="opacity-60" />
                           </div>
                           <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/10">
                              <span className="text-[11px] font-black truncate flex-1 tracking-tight select-all">{publicStatusUrl}</span>
                              <CopyButton text={publicStatusUrl} />
                           </div>
                           <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest text-center">Share this link for external resolution transparency</p>
                        </div>
                     </div>
                  </div>

                  {/* History Section */}
                  <div className="px-6 lg:px-10 pb-6 lg:pb-10 space-y-8">
                     <div className="flex items-center gap-4 px-2">
                        <History size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Operation Log</span>
                     </div>
                     <ActivityTimeline items={activity} emptyLabel="No ticket activity recorded yet." />
                  </div>
               </div>

               {/* Right Column: Configuration & Controls (Fixed-Style) */}
               <div className="lg:flex-1 flex flex-col bg-white dark:bg-slate-950 shrink-0">

                  <div className="flex-1 lg:overflow-y-auto p-6 lg:p-10 space-y-10 custom-scrollbar">

                     {/* Status Selector */}
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-1">
                           <Settings2 size={16} className="text-indigo-500" />
                           <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Resolution State</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                 key={key}
                                 type="button"
                                 onClick={() => setStatus(key)}
                                 className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all duration-500 ${status === key
                                    ? "bg-slate-950 dark:bg-indigo-600 text-white border-slate-950 dark:border-white/10 shadow-2xl scale-[1.02]"
                                    : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                    }`}
                              >
                                 {cfg.label}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* CRM Stage Selector */}
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-1">
                           <Tag size={16} className="text-indigo-500" />
                           <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">CRM Sales Stage</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           {Object.entries(CRM_STAGE_CONFIG).map(([key, cfg]) => (
                              <button
                                 key={key}
                                 type="button"
                                 onClick={() => setCrmStage(key)}
                                 className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all duration-500 flex items-center justify-center gap-2 ${crmStage === key
                                       ? "bg-slate-950 dark:bg-indigo-600 text-white border-slate-950 dark:border-white/10 shadow-2xl scale-[1.02]"
                                       : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                    }`}
                              >
                                 <span>{cfg.icon}</span>
                                 {cfg.label}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Priority Selector */}
                     <div className="space-y-5">
                        <div className="flex items-center gap-3 px-1">
                           <AlertTriangle size={16} className="text-indigo-500" />
                           <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Priority Vector</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                              <button
                                 key={key}
                                 type="button"
                                 onClick={() => setPriority(key)}
                                 className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all duration-500 ${priority === key
                                    ? "bg-slate-950 dark:bg-indigo-600 text-white border-slate-950 dark:border-white/10 shadow-2xl scale-[1.02]"
                                    : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-transparent hover:border-slate-100 dark:hover:border-white/5"
                                    }`}
                              >
                                 {cfg.label}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Note / Activity Input */}
                     <div className="space-y-5">
                        {canManageAssignment ? (
                           <div className="space-y-5">
                              <div className="flex items-center gap-3 px-1">
                                 <User size={16} className="text-indigo-500" />
                                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Ticket Owner</label>
                              </div>
                              <select
                                 value={assignedAgent}
                                 onChange={(e) => setAssignedAgent(e.target.value)}
                                 className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[24px] px-5 py-4 text-[11px] font-black text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500/50 transition-all"
                              >
                                 <option value="">Unassigned</option>
                                 {assignableAgents.map((agent) => (
                                    <option key={agent._id} value={agent._id}>
                                       {agent.name} ({agent.role})
                                    </option>
                                 ))}
                              </select>
                              <input
                                 value={assignmentReason}
                                 onChange={(e) => setAssignmentReason(e.target.value)}
                                 placeholder="Assignment reason (optional)"
                                 className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[24px] px-5 py-4 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500/50 transition-all"
                              />
                           </div>
                        ) : null}

                        <div className="space-y-5">
                           <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-3">
                                 <Edit3 size={16} className="text-indigo-500" />
                                 <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">New Transmission</label>
                              </div>
                              <div
                                 onClick={() => setNoteIsPublic(!noteIsPublic)}
                                 className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5 transition-colors"
                              >
                                 <div className={`w-2 h-2 rounded-full transition-colors ${noteIsPublic ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">
                                    {noteIsPublic ? "PUBLIC" : "INTERNAL"}
                                 </span>
                              </div>
                           </div>
                           <textarea
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="Append situational updates to the ticket flow..."
                              className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[32px] px-8 py-6 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500/50 transition-all h-40 resize-none shadow-inner leading-relaxed"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Action Area: Large Button at bottom of right col */}
                  <div className="p-6 lg:p-10 border-t border-slate-50 dark:border-white/5 bg-slate-50/10 dark:bg-black/20 shrink-0">
                     <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-6 rounded-[28px] bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
                     >
                        {saving ? (
                           <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : savedSuccess ? (
                           <><CheckCheck size={20} className="text-emerald-400" /> Matrix Synced</>
                        ) : (
                           <><Activity size={20} /> Update Clearances</>
                        )}
                     </button>
                  </div>
               </div>

            </div>
         </div>
      </div>
   );
}

export default function TicketManager({ websiteId }) {
   const { user } = useAuth();
   const toast = useToast();
   const canManageAssignment = ["admin", "client", "manager"].includes(user?.role);
   const [viewMode, setViewMode] = useState("board");
   const [tickets, setTickets] = useState([]);
   const [teamMembers, setTeamMembers] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [searchTerm, setSearchTerm] = useState("");
   const [filterStatus, setFilterStatus] = useState("all");
   const [filterPriority, setFilterPriority] = useState("all");
   const [filterStage, setFilterStage] = useState("all");
   const [filterChannel, setFilterChannel] = useState("all");
   const [searchCRN, setSearchCRN] = useState("");
   const [selectedTicket, setSelectedTicket] = useState(null);
   const [selectedIds, setSelectedIds] = useState([]);
   const [page, setPage] = useState(1);
   const [activeRange, setActiveRange] = useState("all");
   const [rangeSummary, setRangeSummary] = useState({ all: 0 });

   const fetchTickets = async () => {
      setLoading(true);
      try {
         const queryParams = new URLSearchParams();
         if (websiteId) queryParams.set("websiteId", websiteId);
         queryParams.set("range", activeRange);
         if (filterChannel !== "all") queryParams.set("channel", filterChannel);

         const data = await api(`/api/tickets?${queryParams.toString()}`);
         setTickets(data.tickets || []);
         setRangeSummary(data.summary || { all: 0 });
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchTickets();
   }, [websiteId, activeRange, filterChannel]);

   const fetchTeamMembers = async () => {
      if (!canManageAssignment) return;
      try {
         const data = await api("/api/users/agents");
         setTeamMembers(Array.isArray(data) ? data : []);
      } catch (err) {
         toast.error("Failed to fetch assignable agents: " + err.message);
      }
   };

   useEffect(() => { fetchTickets(); }, [websiteId]);
   useEffect(() => { fetchTeamMembers(); }, [canManageAssignment]);

   const assignableAgents = teamMembers.filter((member) => ["agent", "user", "manager", "sales"].includes(member.role));

   const toggleSelected = (ticketId) => {
      setSelectedIds(prev => prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]);
   };

   const toggleSelectAllVisible = () => {
      const visibleIds = visibleTickets.map(t => t._id);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
      setSelectedIds(allVisibleSelected ? selectedIds.filter(id => !visibleIds.includes(id)) : [...new Set([...selectedIds, ...visibleIds])]);
   };

   const runBulkUpdate = async (updates) => {
      if (!selectedIds.length) return alert("Select at least one ticket first.");
      try {
         await api("/api/tickets/bulk-update", {
            method: "POST",
            body: JSON.stringify({ ticketIds: selectedIds, updates })
         });
         setSelectedIds([]);
         fetchTickets();
      } catch (e) {
         alert(e.message);
      }
   };

   const handleBulkAssign = async () => {
      const agentId = window.prompt("Enter agent ID to assign selected tickets to. Leave blank to unassign.");
      if (agentId === null) return;
      await runBulkUpdate({ assignedAgent: agentId.trim() || null });
   };

   const handleBulkExport = async () => {
      const token = localStorage.getItem("dashboard_token");
      window.open(await apiUrl(`/api/tickets/export?token=${encodeURIComponent(token || "")}`), "_blank");
   };

   const filtered = tickets.filter(t => {
      const matchSearch = !searchTerm ||
         t.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (t.visitorId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
         (t.visitorId?.email || "").toLowerCase().includes(searchTerm.toLowerCase());
      const [matchStatus, matchPriority, matchStage] = [
         filterStatus === "all" || t.status === filterStatus,
         filterPriority === "all" || t.priority === filterPriority,
         filterStage === "all" || t.crmStage === filterStage
      ];
      const matchCRN = !searchCRN ||
         (t.crn && t.crn.toLowerCase().includes(searchCRN.toLowerCase())) ||
         (t.visitorId?.email && t.visitorId.email.toLowerCase().includes(searchCRN.toLowerCase()));
      return matchSearch && matchStatus && matchPriority && matchStage && matchCRN;
   });
   const paginatedFiltered = getPaginationMeta(filtered, page);
   const visibleTickets = paginatedFiltered.pageItems;

   useEffect(() => {
      setPage(1);
   }, [searchTerm, filterStatus, filterPriority, filterStage, filterChannel, searchCRN, tickets.length, viewMode]);

   const counts = rangeSummary || {};
   const channelCounts = {
      all: tickets.length,
      web: tickets.filter((ticket) => ticket.channel === "web").length,
      chat: tickets.filter((ticket) => ticket.channel === "chat").length,
      email: tickets.filter((ticket) => ticket.channel === "email").length
   };

   if (loading) return (
      <div className="space-y-6 animate-pulse p-4">
         {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5" />)}
      </div>
   );

   return (
      <>
         <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
               <div className="space-y-1.5">
                  <h3 className="heading-md dark:text-white">Ticket Nexus</h3>
                  <p className="small-label dark:text-slate-500">Orchestrate resolution workflows for global support requests.</p>
               </div>
               <div className="flex items-center gap-4 flex-wrap xl:justify-end">
                  <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-1.5 shadow-sm">
                     <button
                        type="button"
                        onClick={() => setViewMode("board")}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "board" ? "bg-slate-950 dark:bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                           }`}
                     >
                        <LayoutGrid size={13} />
                        Board
                     </button>
                     <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === "list" ? "bg-slate-950 dark:bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                           }`}
                     >
                        <List size={13} />
                        List
                     </button>
                  </div>
                  <button
                     onClick={toggleSelectAllVisible}
                     className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300"
                  >
                     {filtered.length > 0 && filtered.every(t => selectedIds.includes(t._id)) ? "Clear Visible" : "Select Visible"}
                  </button>
                  <button
                     onClick={() => runBulkUpdate({ status: "resolved" })}
                     className="bg-emerald-600 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-colors"
                  >
                     Bulk Resolve
                  </button>
                  {user && ["manager", "client", "admin"].includes(user.role) && (
                     <button
                        onClick={handleBulkAssign}
                        className="bg-indigo-600 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500 transition-colors"
                     >
                        Bulk Assign
                     </button>
                  )}
                  {user && ["manager", "client", "admin"].includes(user.role) && (
                     <button
                        onClick={handleBulkExport}
                        className="bg-slate-950 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white"
                     >
                        Export CSV
                     </button>
                  )}
                  <div className="relative group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                     <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Locate ticket..."
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all w-64 shadow-sm dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                     />
                  </div>
                  <div className="relative group">
                     <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={14} />
                     <input
                        value={searchCRN}
                        onChange={e => setSearchCRN(e.target.value)}
                        placeholder="Search CRN/Email..."
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 outline-none transition-all w-64 shadow-sm dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                     />
                  </div>
                  <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                     <div className="px-5 py-4 flex items-center justify-center border-r border-slate-100 dark:border-white/5">
                        <Tag size={14} className="text-slate-400" />
                     </div>
                     <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="bg-transparent px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all appearance-none">
                        <option value="all">CRM Stages</option>
                        {Object.entries(CRM_STAGE_CONFIG).map(([k, v]) => <option key={k} value={k} className="dark:bg-slate-900">{v.label}</option>)}
                     </select>
                  </div>
                  <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                     <div className="px-5 py-4 flex items-center justify-center border-r border-slate-100 dark:border-white/5">
                        <Filter size={14} className="text-slate-400" />
                     </div>
                     <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-transparent px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all appearance-none">
                        <option value="all">Priority Fleet</option>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k} className="dark:bg-slate-900">{v.label}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,255,0.98))] dark:bg-slate-900 dark:border-white/5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.25)] p-4 md:p-5">
               <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-2">
                     <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                        Focus Window
                     </span>
                     <div className="inline-flex w-fit gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-sm dark:bg-white/5 dark:border-white/5">
                        {["all", "today", "week", "month"].map(r => (
                           <button
                              key={r}
                              onClick={() => setActiveRange(r)}
                              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.18em] transition-all ${activeRange === r
                                 ? "bg-slate-950 text-white shadow-lg shadow-slate-200 dark:bg-indigo-600"
                                 : "text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 dark:hover:text-slate-200"
                                 }`}
                           >
                              {r}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="min-w-0 flex-1 xl:max-w-[72%]">
                     <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                           Inbox Mode
                        </span>
                     </div>
                     <div className="overflow-x-auto custom-scrollbar pb-3">
                        <div className="inline-flex min-w-max gap-2 rounded-[22px] border border-slate-200/80 bg-white/85 p-1.5 shadow-sm dark:bg-white/5 dark:border-white/5">
                           {[
                              { key: "all", label: "All Messages" },
                              { key: "chat", label: "Live Chat Tickets" },
                              { key: "email", label: "Email Tickets" }
                           ].map((channel) => (
                              <button
                                 key={channel.key}
                                 onClick={() => setFilterChannel(channel.key)}
                                 className={`px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.16em] transition-all flex items-center gap-3 whitespace-nowrap ${filterChannel === channel.key
                                    ? "bg-slate-950 text-white shadow-lg shadow-slate-200 dark:bg-indigo-600"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 dark:hover:text-slate-200"
                                    }`}
                              >
                                 <span>{channel.label}</span>
                                 <span className={`min-w-[24px] px-2 py-0.5 rounded-full text-[9px] ${filterChannel === channel.key
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                    }`}>
                                    {channelCounts[channel.key] || 0}
                                 </span>
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                           Status Scope
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
                           Swipe to browse
                        </span>
                     </div>
                     <div className="overflow-x-auto custom-scrollbar pb-1">
                        <div className="inline-flex min-w-max gap-2 rounded-[22px] border border-slate-200/80 bg-white/85 p-1.5 shadow-sm dark:bg-white/5 dark:border-white/5">
                           {["all", "open", "in_progress", "waiting", "resolved", "closed"].map(s => (
                              <button
                                 key={s}
                                 onClick={() => setFilterStatus(s)}
                                 className={`px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.16em] transition-all flex items-center gap-3 whitespace-nowrap ${filterStatus === s
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 dark:hover:text-slate-200"
                                    }`}
                              >
                                 {s !== "all" && <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s]?.dot}`} />}
                                 <span>{s === "all" ? "Universe" : STATUS_CONFIG[s]?.label}</span>
                                 <span className={`min-w-[24px] px-2 py-0.5 rounded-full text-[9px] ${filterStatus === s
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                    }`}>
                                    {counts[s] || 0}
                                 </span>
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-8 py-5 rounded-[28px] text-[11px] font-black uppercase tracking-widest shadow-xl animate-in shake duration-500">{error}</div>}

            {viewMode === "board" ? (
               <div className="overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
                  <div className="flex gap-6 min-w-max">
                  {["open", "in_progress", "waiting", "pending", "resolved", "closed"].map((statusKey) => (
                     <section key={statusKey} className="w-[320px] shrink-0 rounded-[32px] border border-slate-200/70 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/5">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl ${STATUS_CONFIG[statusKey]?.dot} text-white flex items-center justify-center font-black shadow-lg`}>
                                 {counts[statusKey] || 0}
                              </div>
                              <div>
                                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{STATUS_CONFIG[statusKey]?.label}</h3>
                                 <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {counts[statusKey] || 0} tickets
                                 </p>
                              </div>
                           </div>
                        </div>
                        <div className="p-4 space-y-4 min-h-[420px] max-h-[760px] overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,1))] dark:bg-none dark:bg-slate-950">
                           {visibleTickets.filter(ticket => ticket.status === statusKey).length === 0 ? (
                              <div className="h-40 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[28px] flex items-center justify-center text-center px-6">
                                 <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">No tickets in this lane</p>
                              </div>
                           ) : visibleTickets.filter(ticket => ticket.status === statusKey).map((ticket) => (
                              <article
                                 key={ticket._id}
                                 onClick={() => setSelectedTicket(ticket)}
                                 className="rounded-[28px] border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                              >
                                 <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                       <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{ticket.ticketId}</p>
                                       <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 line-clamp-2">{ticket.subject}</h4>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                                 </div>
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                       <div className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-[11px] font-black text-indigo-500 dark:text-indigo-400 border border-slate-100 dark:border-white/5">
                                          {ticket.visitorId?.name?.[0] || "A"}
                                       </div>
                                       <div className="min-w-0">
                                          <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{cleanString(ticket.visitorId?.name, "Anonymous")}</p>
                                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate">{cleanString(ticket.visitorId?.email, "No email")}</p>
                                       </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                       <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                                          {PRIORITY_CONFIG[ticket.priority]?.label}
                                       </span>
                                       {["department_auto_assignment", "department_reassignment"].includes(getLatestAssignmentReason(ticket)) ? (
                                          <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-sky-100 bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
                                             auto routed
                                          </span>
                                       ) : null}
                                       {ticket.department ? (
                                          <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-sky-100 bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
                                             {ticket.department}
                                          </span>
                                       ) : null}
                                       {ticket.crmStage && ticket.crmStage !== "none" ? (
                                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${CRM_STAGE_CONFIG[ticket.crmStage]?.color}`}>
                                             {CRM_STAGE_CONFIG[ticket.crmStage]?.label}
                                          </span>
                                       ) : null}
                                       {ticket.crn ? (
                                          <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-100 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                                             {ticket.crn}
                                          </span>
                                       ) : null}
                                    </div>
                                    <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                       <span>{ticket.websiteId?.websiteName || "Website"}</span>
                                       <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                 </div>
                              </article>
                           ))}
                        </div>
                     </section>
                  ))}
                  </div>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-6">
                  {visibleTickets.map(ticket => (
                     <div
                        key={ticket._id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="premium-card p-0 group cursor-pointer border-2 border-transparent hover:border-indigo-500/20 transition-all duration-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1"
                     >
                        <div className="flex flex-col lg:flex-row lg:items-center h-full">
                           <div className="p-8 lg:p-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                              <div className="lg:col-span-1 flex items-center justify-center">
                                 <input
                                    type="checkbox"
                                    checked={selectedIds.includes(ticket._id)}
                                    onChange={(e) => {
                                       e.stopPropagation();
                                       toggleSelected(ticket._id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-5 w-5 rounded border-slate-300"
                                 />
                              </div>

                              {/* Ticket ID & Core Status */}
                              <div className="lg:col-span-2 space-y-4">
                                 <div className="flex items-center gap-2 group-hover:scale-110 transition-transform origin-left">
                                    <div className="w-2 h-8 rounded-full bg-indigo-600" />
                                    <span className="text-[12px] font-black text-slate-950 dark:text-white tracking-tighter">{ticket.ticketId}</span>
                                 </div>
                                 <div className="space-y-1.5">
                                    <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm w-fit flex items-center gap-2 ${STATUS_CONFIG[ticket.status]?.color}`}>
                                       <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${STATUS_CONFIG[ticket.status]?.dot}`} />
                                       {STATUS_CONFIG[ticket.status]?.label}
                                    </div>
                                    {ticket.crmStage && ticket.crmStage !== "none" && (
                                       <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit border shadow-sm flex items-center gap-1.5 ${CRM_STAGE_CONFIG[ticket.crmStage]?.color}`}>
                                          <span>{CRM_STAGE_CONFIG[ticket.crmStage]?.icon}</span>
                                          {CRM_STAGE_CONFIG[ticket.crmStage]?.label}
                                       </div>
                                    )}
                                    {ticket.crn && (
                                       <div className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit border border-purple-100 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 shadow-sm flex items-center gap-1.5 mt-1">
                                          <Tag size={10} />
                                          {ticket.crn}
                                       </div>
                                    )}
                                    {ticket.category && (
                                       <div className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit border border-indigo-100 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 shadow-sm flex items-center gap-1.5 mt-1">
                                          <Layers size={10} />
                                          {ticket.category}
                                       </div>
                                    )}
                                    {ticket.department && (
                                       <div className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit border border-sky-100 bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 shadow-sm flex items-center gap-1.5 mt-1">
                                          <Activity size={10} />
                                          {ticket.department}
                                       </div>
                                    )}
                                 </div>
                              </div>

                              {/* Subject & Visitor Context */}
                              <div className="lg:col-span-6 space-y-3">
                                 <div className="flex items-center justify-between gap-4">
                                    <h4 className="text-[12px] font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                                       {ticket.subject || "No Subject Transmission"}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                       {ticket.heatScore && <HeatIndicator score={ticket.heatScore} />}
                                       {ticket.nbaMetadata && (
                                          <div className="p-1 px-1.5 rounded-md bg-violet-600 text-white animate-bounce" title={ticket.nbaMetadata.recommendation}>
                                             <Brain size={10} />
                                          </div>
                                       )}
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-[12px] font-black text-indigo-500 dark:text-indigo-400 border border-slate-100 dark:border-white/5 shadow-inner">
                                       {ticket.visitorId?.name?.[0] || "A"}
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{cleanString(ticket.visitorId?.name, "Participant Alpha")}</p>
                                       <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{cleanString(ticket.visitorId?.email, "Encrypted Vector")}</p>
                                    </div>
                                 </div>
                              </div>

                              {/* Routing & Metadata */}
                              <div className="lg:col-span-2 flex flex-col gap-4 border-l border-slate-50 dark:border-white/5 pl-10">
                                 <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Source Identity</span>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-tight">
                                       <Globe size={11} className="text-indigo-400" />
                                       {ticket.websiteId?.websiteName || "Root Proxy"}
                                    </div>
                                 </div>
                                 <div className="space-y-1 flex items-center justify-between">
                                    <div className="space-y-1">
                                       <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Priority Tier</span>
                                       <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit border ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                                          {PRIORITY_CONFIG[ticket.priority]?.label}
                                       </div>
                                    </div>
                                    {getSLADetails(ticket) && (
                                       <div className="flex flex-col items-end">
                                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">SLA Deadline</span>
                                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mt-1 ${getSLADetails(ticket).isBreached ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                             <Clock size={10} />
                                             {getSLADetails(ticket).timeStr} {getSLADetails(ticket).isBreached ? 'Overdue' : 'Left'}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>

                              {/* Temporal Sync */}
                              <div className="lg:col-span-2 text-right">
                                 <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Last Convergence</span>
                                 <p className="text-base font-black text-slate-950 dark:text-white tracking-tighter mt-1">{new Date(ticket.updatedAt).toLocaleDateString([], { day: '2-digit', month: 'short' })}</p>
                                 <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mt-1 uppercase tracking-[0.1em]">{new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                           </div>

                           {/* Vertical Interactive Strip */}
                           <div className="lg:w-20 w-full bg-slate-50/50 dark:bg-white/5 flex items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/5 p-6 lg:p-0 group-hover:bg-indigo-600 transition-all duration-500">
                              <ChevronRight size={24} className="text-slate-300 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                           </div>
                        </div>
                     </div>
                  ))}
                  {filtered.length === 0 && !loading && (
                     <div className="p-40 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[64px] text-center space-y-8 bg-slate-50/30 dark:bg-white/5 transition-colors">
                        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                           <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-10"></div>
                           <div className="absolute inset-4 bg-indigo-500/10 rounded-full animate-pulse"></div>
                           <Ticket size={48} className="text-indigo-600 dark:text-indigo-400 relative z-10" />
                        </div>
                        <div className="space-y-3">
                           <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Ecosystem Vacuum</h3>
                           <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">No operational tickets found within the current signal parameters.</p>
                        </div>
                     </div>
                  )}
               </div>
            )}

            {!loading && (
               <PaginationControls
                  currentPage={paginatedFiltered.currentPage}
                  totalPages={paginatedFiltered.totalPages}
                  totalItems={paginatedFiltered.totalItems}
                  itemLabel="tickets"
                  onPageChange={setPage}
               />
            )}
         </div>

         {selectedTicket && (
            <TicketDetailPanel
               ticket={selectedTicket}
               assignableAgents={assignableAgents}
               canManageAssignment={canManageAssignment}
               onUpdate={() => { fetchTickets(); setSelectedTicket(null); }}
               onClose={() => setSelectedTicket(null)}
            />
         )}
      </>
   );
}
