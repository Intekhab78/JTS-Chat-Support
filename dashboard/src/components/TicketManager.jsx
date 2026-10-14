import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
   Ticket, Plus, Search, Filter, ChevronDown, Check,
   Clock, AlertTriangle, X, MessageSquare, Globe, User,
   Link, Copy, CheckCheck, ChevronRight, Tag, Activity,
   ArrowUpRight, History, Settings2, Edit3, Layers, LayoutGrid, List,
   Sliders, ArrowUp, ArrowDown, PlusCircle, Trash2, RotateCcw, FileSpreadsheet,
   Mail, Phone, ExternalLink, ShieldCheck, MapPin, Monitor, Calendar, Hash, CheckCircle
} from "lucide-react";
import { api, apiUrl } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { cleanString } from "../utils/stringUtils.js";
import ActivityTimeline from "./ActivityTimeline.jsx";
import { exportToCsv } from "../utils/exportUtils.js";
import { HeatIndicator, NBARecommendationCard, CRMStageBadge, LEAD_STATUS_STYLES } from "./CrmSystem/CrmUIComponents.jsx";
import { Brain } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";

const DEFAULT_STAGES = [
  { key: "open", label: "Open", color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20", dot: "bg-blue-500", badgeBg: "bg-blue-600", active: true },
  { key: "in_progress", label: "In Progress", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-500", badgeBg: "bg-amber-500", active: true },
  { key: "waiting", label: "Waiting", color: "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", dot: "bg-violet-500", badgeBg: "bg-purple-600", active: true },
  { key: "pending", label: "Pending", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-400", badgeBg: "bg-amber-400", active: true },
  { key: "resolved", label: "Resolved", color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", dot: "bg-emerald-500", badgeBg: "bg-emerald-500", active: true },
  { key: "closed", label: "Closed", color: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5", dot: "bg-slate-400", badgeBg: "bg-slate-400", active: true }
];

const STAGE_PRESET_COLORS = [
  { label: "Blue", color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20", dot: "bg-blue-500", badgeBg: "bg-blue-600" },
  { label: "Amber", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-500", badgeBg: "bg-amber-500" },
  { label: "Violet", color: "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", dot: "bg-violet-500", badgeBg: "bg-purple-600" },
  { label: "Emerald", color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", dot: "bg-emerald-500", badgeBg: "bg-emerald-500" },
  { label: "Slate", color: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5", dot: "bg-slate-400", badgeBg: "bg-slate-400" },
  { label: "Red", color: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500", badgeBg: "bg-red-500" }
];

const STATUS_CONFIG = {
   open: { label: "Open", color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20", dot: "bg-blue-500", badgeBg: "bg-blue-600" },
   in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-500", badgeBg: "bg-amber-500" },
   waiting: { label: "Waiting", color: "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", dot: "bg-violet-500", badgeBg: "bg-purple-600" },
   pending: { label: "Pending", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", dot: "bg-amber-400", badgeBg: "bg-amber-400" },
   resolved: { label: "Resolved", color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", dot: "bg-emerald-500", badgeBg: "bg-emerald-500" },
   closed: { label: "Closed", color: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5", dot: "bg-slate-400", badgeBg: "bg-slate-400" }
};

const getStageConfig = (statusKey, websiteId = null) => {
   let currentStages = DEFAULT_STAGES;
   if (websiteId) {
      try {
         const saved = localStorage.getItem(`ticket_stages_${websiteId}`);
         if (saved) currentStages = JSON.parse(saved);
      } catch (err) {
         console.error(err);
      }
   }
   const stage = currentStages.find(s => s.key === statusKey);
   if (stage) {
      return {
         label: stage.label,
         color: stage.color || "bg-slate-50 text-slate-600 border-slate-100",
         dot: stage.dot || "bg-slate-400",
         badgeBg: stage.badgeBg || "bg-blue-600"
      };
   }
   return STATUS_CONFIG[statusKey] || { label: statusKey, color: "bg-slate-50 text-slate-600 border-slate-100", dot: "bg-slate-400", badgeBg: "bg-blue-600" };
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

function TicketDetailPanel({ ticket, onUpdate, onClose, assignableAgents = [], canManageAssignment = false, stages = DEFAULT_STAGES }) {
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
   const [copiedId, setCopiedId] = useState(false);
   const [copiedEmail, setCopiedEmail] = useState(false);

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
         toast.success("Ticket updated successfully!");
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

   const copyTicketId = () => {
      navigator.clipboard.writeText(ticket.ticketId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
   };

   const copyEmail = () => {
      if (ticket.visitorId?.email) {
         navigator.clipboard.writeText(ticket.visitorId.email);
         setCopiedEmail(true);
         setTimeout(() => setCopiedEmail(false), 2000);
      }
   };

   const stageCfg = getStageConfig(ticket.status, ticket.websiteId?._id || ticket.websiteId);
   const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
   const crmCfg = CRM_STAGE_CONFIG[ticket.crmStage] || CRM_STAGE_CONFIG.none;
   const slaDetails = getSLADetails(ticket);

   return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
         <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

         <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/90 dark:border-white/10 animate-in zoom-in-95 duration-200">

            {/* ── Compact Integrated Header ── */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
               <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                     <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                        <Ticket size={14} />
                     </div>
                     
                     {/* Ticket ID & Copy */}
                     <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-white/10 px-2 py-0.5 rounded-lg shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white">{ticket.ticketId}</span>
                        <button onClick={copyTicketId} title="Copy Ticket ID" className="text-slate-400 hover:text-sky-600 transition-colors">
                           {copiedId ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                     </div>

                     {/* Status Badge */}
                     <div className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 shrink-0 ${stageCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stageCfg.dot || "bg-sky-500"} animate-pulse`} />
                        {stageCfg.label}
                     </div>

                     {/* Priority Badge */}
                     <div className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${priorityCfg.color}`}>
                        {priorityCfg.icon} {priorityCfg.label}
                     </div>

                     {/* Website Source */}
                     <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 flex items-center gap-1 shrink-0">
                        <Globe size={11} className="text-sky-500" />
                        <span>{ticket.websiteId?.websiteName || "UAE Invoicing"}</span>
                     </div>

                     {/* CRN Badge */}
                     {ticket.crn && (
                        <div className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center gap-1 shrink-0">
                           <Tag size={10} />
                           <span>{ticket.crn}</span>
                        </div>
                     )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                     {slaDetails && (
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                           slaDetails.isBreached 
                              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 animate-pulse" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        }`}>
                           <Clock size={11} />
                           <span>SLA: {slaDetails.timeStr} {slaDetails.isBreached ? "Overdue" : "Left"}</span>
                        </div>
                     )}
                     <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-all">
                        <X size={17} />
                     </button>
                  </div>
               </div>

               {/* Subject Line & Meta */}
               <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                     {ticket.subject || "Support Inquiry"}
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium shrink-0">
                     <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
                     <span>Updated: {new Date(ticket.updatedAt || ticket.createdAt).toLocaleString()}</span>
                     {ticket.department && (
                        <span className="text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1">
                           <Layers size={11} /> {ticket.department}
                        </span>
                     )}
                  </div>
               </div>
            </div>

            {/* ── Body: 2-Column Split ── */}
            <div className="flex-1 flex flex-col md:flex-row bg-slate-50/40 dark:bg-black/10">

               {/* ── Left Content (58% width): Complete Information ── */}
               <div className="flex-1 md:w-[58%] border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5 p-4 space-y-3">
                  
                  {/* Requester & Origin Details (Compact 4-Grid) */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-white/10 p-3 space-y-2.5 shadow-xs">
                     <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                           <User size={12} className="text-sky-600" /> Requester & Context
                        </span>
                        {ticket.crn && (
                           <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">CRN: {ticket.crn}</span>
                        )}
                     </div>

                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        {/* Name */}
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Name</p>
                           <p className="font-extrabold text-slate-900 dark:text-white truncate">{cleanString(ticket.visitorId?.name, "Anonymous User")}</p>
                        </div>

                        {/* Email */}
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                           <div className="flex items-center gap-1">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{cleanString(ticket.visitorId?.email, "No email")}</p>
                              {ticket.visitorId?.email && (
                                 <button onClick={copyEmail} title="Copy Email" className="text-slate-400 hover:text-sky-600 transition-colors shrink-0">
                                    {copiedEmail ? <CheckCheck size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                 </button>
                              )}
                           </div>
                        </div>

                        {/* Phone */}
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                           <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{ticket.visitorId?.phone || "Not provided"}</p>
                        </div>

                        {/* Website */}
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Website</p>
                           <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{ticket.websiteId?.websiteName || "UAE Invoicing"}</p>
                        </div>

                        {/* Category & Subtier */}
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category / Tier</p>
                           <p className="font-bold text-sky-600 dark:text-sky-400 truncate">{ticket.category || "General"}{ticket.subcategory ? ` • ${ticket.subcategory}` : ""}</p>
                        </div>

                        {/* Device / Location */}
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location / Device</p>
                           <p className="font-medium text-slate-500 dark:text-slate-400 truncate">
                              {[ticket.visitorId?.city, ticket.visitorId?.country].filter(Boolean).join(", ") || ticket.visitorId?.browser || "Web Visitor"}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* SLA Metrics & Public URL (2-col row) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                     <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-white/10 p-2.5 shadow-xs flex items-center justify-between">
                        <div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">First Response SLA</span>
                           <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatSLA(ticket.createdAt, ticket.firstResponseAt)}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Resolution SLA</span>
                           <span className="text-xs font-extrabold text-slate-900 dark:text-white">{formatSLA(ticket.createdAt, ticket.resolvedAt)}</span>
                        </div>
                     </div>

                     <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-white/10 p-2.5 shadow-xs flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                           <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Public Status Link</span>
                           <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate block">{publicStatusUrl}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                           <CopyButton text={publicStatusUrl} />
                           <a href={publicStatusUrl} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition-colors">
                              <ExternalLink size={13} />
                           </a>
                        </div>
                     </div>
                  </div>

                  {/* Activity & Notes Log (Compact timeline) */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-white/10 p-3 shadow-xs space-y-2">
                     <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                           <History size={12} className="text-sky-600" /> Activity & Notes Log
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">{activity.length} entries</span>
                     </div>
                     <div className="max-h-36 overflow-y-auto custom-scrollbar pr-1">
                        <ActivityTimeline items={activity} emptyLabel="No ticket activity recorded yet." />
                     </div>
                  </div>

               </div>

               {/* ── Right Action Controls (42% width): Zero Scroll Compact View ── */}
               <div className="flex-1 md:w-[42%] bg-white dark:bg-slate-900 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                     
                     {/* Ticket Status Selector */}
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                           <Settings2 size={11} className="text-sky-600" /> Ticket Status
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                           {stages.filter(s => s.active).map((stage) => {
                              const isCurrent = status === stage.key;
                              return (
                                 <button
                                    key={stage.key}
                                    type="button"
                                    onClick={() => setStatus(stage.key)}
                                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all border text-center ${
                                       isCurrent
                                          ? "bg-slate-900 dark:bg-sky-600 text-white border-slate-900 dark:border-sky-600 shadow-xs"
                                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100"
                                    }`}
                                 >
                                    {stage.label}
                                 </button>
                              );
                           })}
                        </div>
                     </div>

                     {/* Priority & CRM Stage in 2 Columns */}
                     <div className="grid grid-cols-2 gap-2">
                        {/* Priority Selector */}
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <AlertTriangle size={11} className="text-amber-500" /> Priority
                           </label>
                           <div className="grid grid-cols-2 gap-1">
                              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                 <button
                                    key={key}
                                    type="button"
                                    onClick={() => setPriority(key)}
                                    className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1 ${
                                       priority === key
                                          ? "bg-slate-900 dark:bg-sky-600 text-white border-slate-900 dark:border-sky-600 shadow-xs"
                                          : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100"
                                    }`}
                                 >
                                    <span>{cfg.label}</span>
                                 </button>
                              ))}
                           </div>
                        </div>

                        {/* CRM Stage Selector */}
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Tag size={11} className="text-purple-500" /> CRM Stage
                           </label>
                           <select
                              value={crmStage}
                              onChange={(e) => setCrmStage(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-sky-500 transition-all cursor-pointer"
                           >
                              {Object.entries(CRM_STAGE_CONFIG).map(([key, cfg]) => (
                                 <option key={key} value={key} className="dark:bg-slate-900">
                                    {cfg.icon} {cfg.label}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </div>

                     {/* Agent Assignment (if permitted) */}
                     {canManageAssignment && (
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-white/5">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <User size={11} className="text-sky-600" /> Assign Agent
                           </label>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              <select
                                 value={assignedAgent}
                                 onChange={(e) => setAssignedAgent(e.target.value)}
                                 className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-sky-500 transition-all cursor-pointer"
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
                                 placeholder="Reason (optional)"
                                 className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-sky-500 transition-all"
                              />
                           </div>
                        </div>
                     )}

                     {/* Append Note */}
                     <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Edit3 size={11} className="text-sky-600" /> Add Note
                           </label>
                           <button
                              type="button"
                              onClick={() => setNoteIsPublic(!noteIsPublic)}
                              className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border transition-colors flex items-center gap-1 ${
                                 noteIsPublic 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400" 
                                    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400"
                              }`}
                           >
                              <span className={`w-1.5 h-1.5 rounded-full ${noteIsPublic ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                              <span>{noteIsPublic ? "Public" : "Internal"}</span>
                           </button>
                        </div>
                        <textarea
                           value={note}
                           onChange={(e) => setNote(e.target.value)}
                           placeholder="Type a note or progress update..."
                           className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-lg p-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-sky-500 transition-all h-16 resize-none"
                        />
                     </div>
                  </div>

                  {/* Primary Save Action Button */}
                  <div className="pt-1">
                     <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                     >
                        {saving ? (
                           <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : savedSuccess ? (
                           <><CheckCircle size={14} /> Saved Successfully</>
                        ) : (
                           <><CheckCircle size={14} /> Save Changes</>
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
   const [draggedTicketId, setDraggedTicketId] = useState(null);
   const [dragOverLane, setDragOverLane] = useState(null);
   const [rangeSummary, setRangeSummary] = useState({ all: 0 });
   const [showManageStages, setShowManageStages] = useState(false);
   const [stages, setStages] = useState(() => {
      const saved = localStorage.getItem(`ticket_stages_${websiteId}`);
      return saved ? JSON.parse(saved) : DEFAULT_STAGES;
   });

   useEffect(() => {
      const saved = localStorage.getItem(`ticket_stages_${websiteId}`);
      setStages(saved ? JSON.parse(saved) : DEFAULT_STAGES);
   }, [websiteId]);

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

   const handleTicketDragDrop = async (ticketId, targetStatus) => {
      if (!ticketId) return;
      const ticket = tickets.find(t => t._id === ticketId || t.ticketId === ticketId);
      if (!ticket) return;
      if (ticket.status === targetStatus) return;
      const prevStatus = ticket.status;

      // 1. Optimistically update local tickets & summary counts immediately
      setTickets(prev => prev.map(t => (t._id === ticket._id ? { ...t, status: targetStatus } : t)));
      setRangeSummary(prev => ({
         ...prev,
         [prevStatus]: Math.max(0, (prev[prevStatus] || 1) - 1),
         [targetStatus]: (prev[targetStatus] || 0) + 1
      }));

      try {
         const updated = await api(`/api/tickets/${ticket._id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: targetStatus })
         });
         if (updated && updated._id) {
            setTickets(prev => prev.map(t => (t._id === ticket._id ? { ...t, ...updated, status: targetStatus } : t)));
         }
         toast.success(`Ticket moved to ${getStageConfig(targetStatus, websiteId)?.label || targetStatus}`);
      } catch (err) {
         console.error("Failed to update status:", err);
         toast.error("Failed to update status: " + err.message);
         // Revert locally on failure
         setTickets(prev => prev.map(t => (t._id === ticket._id ? { ...t, status: prevStatus } : t)));
         setRangeSummary(prev => ({
            ...prev,
            [targetStatus]: Math.max(0, (prev[targetStatus] || 1) - 1),
            [prevStatus]: (prev[prevStatus] || 0) + 1
         }));
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

   const handleExportTickets = () => {
      const columns = [
         { key: "ticketId", label: "Ticket ID" },
         { key: "subject", label: "Subject" },
         { key: "status", label: "Status" },
         { key: "priority", label: "Priority" },
         { key: "crmStage", label: "CRM Stage" },
         { key: "visitorName", label: "Customer Name", accessor: t => t.visitorId?.name || "N/A" },
         { key: "visitorEmail", label: "Customer Email", accessor: t => t.visitorId?.email || "N/A" },
         { key: "createdAt", label: "Created Date" }
      ];
      exportToCsv(filtered, columns, "Tickets_Master_Report");
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
         <div className="space-y-3.5 animate-in fade-in duration-500">
            {/* Clean, Compact Header & Action Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-4 shadow-sm space-y-3.5">
               {/* Top Row: Title + Primary Actions */}
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                     <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center shrink-0">
                        <Ticket size={20} />
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                           <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Ticket Nexus</h3>
                           <span className="bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              {filtered.length} Tickets
                           </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Resolution workflows and support requests</p>
                     </div>
                  </div>

                  {/* Actions & View Toggle */}
                  <div className="flex items-center gap-2 flex-wrap">
                     {/* View Mode Toggle */}
                     <div className="flex items-center bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <button
                           type="button"
                           onClick={() => setViewMode("board")}
                           className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "board" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
                        >
                           <LayoutGrid size={13} />
                           <span>Board</span>
                        </button>
                        <button
                           type="button"
                           onClick={() => setViewMode("list")}
                           className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "list" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
                        >
                           <List size={13} />
                           <span>List</span>
                        </button>
                     </div>

                     <button
                        type="button"
                        onClick={handleExportTickets}
                        className="bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100/70 transition-all rounded-xl px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                     >
                        <FileSpreadsheet size={13} />
                        <span>Export</span>
                     </button>

                     {user && ["manager", "client", "admin"].includes(user.role) && (
                        <button
                           onClick={() => setShowManageStages(true)}
                           className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                           <Sliders size={13} className="text-sky-500" />
                           <span>Columns</span>
                        </button>
                     )}

                     <button
                        onClick={toggleSelectAllVisible}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                     >
                        {filtered.length > 0 && filtered.every(t => selectedIds.includes(t._id)) ? "Clear" : "Select All"}
                     </button>

                     {selectedIds.length > 0 && (
                        <>
                           <button
                              onClick={() => runBulkUpdate({ status: "resolved" })}
                              className="bg-emerald-600 hover:bg-emerald-500 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
                           >
                              Bulk Resolve ({selectedIds.length})
                           </button>
                           {user && ["manager", "client", "admin"].includes(user.role) && (
                              <button
                                 onClick={handleBulkAssign}
                                 className="bg-sky-600 hover:bg-sky-500 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
                              >
                                 Bulk Assign
                              </button>
                           )}
                        </>
                     )}
                  </div>
               </div>

               {/* Second Row: Search & Dropdown Filters */}
               <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Ticket */}
                  <div className="relative flex-1 min-w-[160px]">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                     <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search ticket, subject, visitor..."
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                     />
                  </div>

                  {/* Search CRN */}
                  <div className="relative min-w-[130px]">
                     <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                     <input
                        value={searchCRN}
                        onChange={e => setSearchCRN(e.target.value)}
                        placeholder="CRN / Email..."
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                     />
                  </div>

                  {/* CRM Stage Filter */}
                  <select
                     value={filterStage}
                     onChange={e => setFilterStage(e.target.value)}
                     className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                     <option value="all">CRM Stages: All</option>
                     {Object.entries(CRM_STAGE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k} className="dark:bg-slate-900">{v.label}</option>
                     ))}
                  </select>

                  {/* Priority Filter */}
                  <select
                     value={filterPriority}
                     onChange={e => setFilterPriority(e.target.value)}
                     className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                  >
                     <option value="all">Priority: All</option>
                     {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k} className="dark:bg-slate-900">{v.label}</option>
                     ))}
                  </select>

                  {/* Focus Window Time Scope */}
                  <div className="flex items-center bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl ml-auto border border-slate-200/60 dark:border-white/5">
                     {["all", "today", "week", "month"].map(r => (
                        <button
                           key={r}
                           onClick={() => setActiveRange(r)}
                           className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                              activeRange === r
                                 ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                 : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                           }`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Third Row: Status Scope & Channel Filter Bar */}
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                     {["all", ...stages.filter(s => s.active).map(s => s.key)].map(s => (
                        <button
                           key={s}
                           onClick={() => setFilterStatus(s)}
                           className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                              filterStatus === s
                                 ? "bg-sky-600 text-white shadow-xs"
                                 : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10"
                           }`}
                        >
                           {s !== "all" && <div className={`w-1.5 h-1.5 rounded-full ${getStageConfig(s, websiteId)?.dot}`} />}
                           <span>{s === "all" ? "All" : getStageConfig(s, websiteId)?.label}</span>
                           <span className={`text-[10px] font-bold ${
                              filterStatus === s ? "text-sky-100" : "text-slate-400 dark:text-slate-500"
                           }`}>
                              {counts[s] || 0}
                           </span>
                        </button>
                     ))}
                  </div>

                  {/* Channel Tabs (All / Live Chat / Email) */}
                  <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-white/5">
                     {[
                        { key: "all", label: "All" },
                        { key: "chat", label: "Chat" },
                        { key: "email", label: "Email" }
                     ].map((channel) => (
                        <button
                           key={channel.key}
                           onClick={() => setFilterChannel(channel.key)}
                           className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              filterChannel === channel.key
                                 ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                 : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                           }`}
                        >
                           <span>{channel.label}</span>
                           <span className="text-[10px] font-bold opacity-70">
                              {channelCounts[channel.key] || 0}
                           </span>
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-8 py-5 rounded-[28px] text-[11px] font-black uppercase tracking-widest shadow-xl animate-in shake duration-500">{error}</div>}

            {viewMode === "board" ? (
               <div className="overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
                  <div className="flex gap-6 min-w-max">
                  {stages.filter(s => s.active).map(s => s.key).map((statusKey) => {
                     const laneTickets = filtered.filter(ticket => ticket.status === statusKey);
                     const isDragOver = dragOverLane === statusKey;
                     return (
                        <section
                           key={statusKey}
                           onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverLane !== statusKey) setDragOverLane(statusKey);
                           }}
                           onDragEnter={(e) => {
                              e.preventDefault();
                              setDragOverLane(statusKey);
                           }}
                           onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) {
                                 setDragOverLane(null);
                              }
                           }}
                           onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverLane(null);
                              const id = e.dataTransfer.getData("ticketId") || e.dataTransfer.getData("text/plain") || draggedTicketId;
                              if (id) handleTicketDragDrop(id, statusKey);
                              setDraggedTicketId(null);
                           }}
                           className={`w-[320px] shrink-0 rounded-[32px] border transition-all duration-200 p-3.5 shadow-xs ${
                              isDragOver
                                 ? "border-sky-500 ring-2 ring-sky-400/40 bg-sky-50/40 dark:bg-sky-950/20"
                                 : "border-slate-200/80 bg-slate-50/60 dark:bg-slate-900/60"
                           }`}
                        >
                           {/* Lane Header matching screenshot */}
                           <div className="flex items-center gap-3.5 mb-4 px-1.5 pt-1">
                              <div className={`w-10 h-10 rounded-full ${getStageConfig(statusKey, websiteId)?.badgeBg || "bg-blue-600"} text-white flex items-center justify-center font-black text-base shadow-xs shrink-0`}>
                                 {counts[statusKey] || 0}
                              </div>
                              <div>
                                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{getStageConfig(statusKey, websiteId)?.label}</h3>
                                 <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {counts[statusKey] || 0} TICKETS
                                 </p>
                              </div>
                           </div>

                           {/* Lane Body with drop target */}
                           <div
                              className="space-y-3.5 min-h-[440px] max-h-[760px] overflow-y-auto custom-scrollbar"
                           >
                              {laneTickets.length === 0 ? (
                                 <div className={`h-44 border-2 border-dashed rounded-[24px] flex items-center justify-center text-center px-6 transition-colors ${
                                    isDragOver ? "border-sky-400 bg-sky-50/50 dark:bg-sky-950/30" : "border-slate-200/90 dark:border-white/10"
                                 }`}>
                                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">NO TICKETS IN THIS LANE</p>
                                 </div>
                              ) : laneTickets.map((ticket) => (
                                 <article
                                    key={ticket._id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    draggable={true}
                                    onDragStart={(e) => {
                                       e.dataTransfer.setData("ticketId", ticket._id);
                                       e.dataTransfer.setData("text/plain", ticket._id);
                                       e.dataTransfer.effectAllowed = "move";
                                       setDraggedTicketId(ticket._id);
                                    }}
                                    onDragEnd={() => {
                                       setDraggedTicketId(null);
                                       setDragOverLane(null);
                                    }}
                                    className={`rounded-[24px] border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800 p-4.5 shadow-xs hover:shadow-md transition-all cursor-pointer group cursor-grab active:cursor-grabbing ${
                                       draggedTicketId === ticket._id ? "opacity-40 scale-95 border-dashed border-sky-400" : ""
                                    }`}
                                 >
                                    {/* Top Row: Ticket Code & Chevron */}
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                       <span className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-tight">
                                          {ticket.ticketId}
                                       </span>
                                       <ChevronRight size={14} className="text-slate-300 group-hover:text-sky-600 transition-colors shrink-0" />
                                    </div>

                                    {/* Subject Header */}
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug line-clamp-2 mb-3">
                                       {ticket.subject}
                                    </h4>

                                    <div className="space-y-3">
                                       {/* Requester Identity Row */}
                                       <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black shrink-0 border border-emerald-100 dark:border-emerald-500/20">
                                             {ticket.visitorId?.name?.[0]?.toUpperCase() || "A"}
                                          </div>
                                          <div className="min-w-0">
                                             <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate">
                                                {cleanString(ticket.visitorId?.name, "ANONYMOUS")}
                                             </p>
                                             <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                                                {cleanString(ticket.visitorId?.email, "No email")}
                                             </p>
                                          </div>
                                       </div>

                                       {/* Tag Chips */}
                                       <div className="flex flex-wrap gap-1.5">
                                          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-blue-200 bg-blue-50/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                                             {PRIORITY_CONFIG[ticket.priority]?.label || "Medium"}
                                          </span>
                                          {ticket.department ? (
                                             <span className="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-sky-200 bg-sky-50/50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
                                                {ticket.department}
                                             </span>
                                          ) : null}
                                          {["department_auto_assignment", "department_reassignment"].includes(getLatestAssignmentReason(ticket)) ? (
                                             <span className="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-sky-200 bg-sky-50/50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
                                                auto routed
                                             </span>
                                          ) : null}
                                          {ticket.crmStage && ticket.crmStage !== "none" ? (
                                             <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border ${CRM_STAGE_CONFIG[ticket.crmStage]?.color}`}>
                                                {CRM_STAGE_CONFIG[ticket.crmStage]?.label}
                                             </span>
                                          ) : null}
                                          {ticket.crn ? (
                                             <span className="px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-purple-200 bg-purple-50/50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                                                {ticket.crn}
                                             </span>
                                          ) : null}
                                       </div>

                                       {/* Footer: Website Name + Date */}
                                       <div className="flex items-center justify-between gap-2 pt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                          <span className="truncate max-w-[170px]">{ticket.websiteId?.websiteName || "UAE INVOICING"}</span>
                                          <span className="shrink-0 font-medium">{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</span>
                                       </div>
                                    </div>
                                 </article>
                              ))}
                           </div>
                        </section>
                     );
                  })}
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
                                    <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm w-fit flex items-center gap-2 ${getStageConfig(ticket.status, ticket.websiteId?._id || ticket.websiteId)?.color}`}>
                                       <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStageConfig(ticket.status, ticket.websiteId?._id || ticket.websiteId)?.dot}`} />
                                       {getStageConfig(ticket.status, ticket.websiteId?._id || ticket.websiteId)?.label}
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
               stages={stages}
               onUpdate={() => { fetchTickets(); setSelectedTicket(null); }}
               onClose={() => setSelectedTicket(null)}
            />
         )}

         {showManageStages && createPortal(
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
               <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setShowManageStages(false)} />
               <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
                  
                  {/* Header */}
                  <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                     <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Orchestrate Lanes</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Configure, reorder, and enable support ticket stages.</p>
                     </div>
                     <button
                        onClick={() => setShowManageStages(false)}
                        className="p-3 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white transition-all"
                     >
                        <X size={18} />
                     </button>
                  </div>

                  {/* Body */}
                  <div className="p-8 overflow-y-auto max-h-[60vh] space-y-6 custom-scrollbar">
                     <ManageStagesList
                        stages={stages}
                        setStages={setStages}
                        websiteId={websiteId}
                     />
                  </div>

                  {/* Footer */}
                  <div className="px-8 py-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center gap-4">
                     <button
                        onClick={() => {
                           if (window.confirm("Reset all columns to system defaults?")) {
                              localStorage.removeItem(`ticket_stages_${websiteId}`);
                              setStages(DEFAULT_STAGES);
                              setShowManageStages(false);
                              toast.success("Columns reset to system defaults!");
                           }
                        }}
                        className="px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2"
                     >
                        <RotateCcw size={12} />
                        Reset Defaults
                     </button>
                     <button
                        onClick={() => {
                           localStorage.setItem(`ticket_stages_${websiteId}`, JSON.stringify(stages));
                           setShowManageStages(false);
                           toast.success("Support board workflow updated successfully!");
                        }}
                        className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
                     >
                        Apply Workflow
                     </button>
                  </div>

               </div>
            </div>,
            document.body
         )}
      </>
   );
}

function ManageStagesList({ stages, setStages, websiteId }) {
  const [newLabel, setNewLabel] = useState("");

  const moveStage = (index, direction) => {
    const updated = [...stages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setStages(updated);
  };

  const toggleActive = (index) => {
    const updated = [...stages];
    updated[index].active = !updated[index].active;
    setStages(updated);
  };

  const updateLabel = (index, value) => {
    const updated = [...stages];
    updated[index].label = value;
    setStages(updated);
  };

  const updateColor = (index, colorIndex) => {
    const updated = [...stages];
    const preset = STAGE_PRESET_COLORS[colorIndex];
    updated[index].color = preset.color;
    updated[index].dot = preset.dot;
    setStages(updated);
  };

  const addStage = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const key = newLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    // Avoid duplicates
    if (stages.some(s => s.key === key)) {
      alert("A column with this name or key already exists!");
      return;
    }
    const preset = STAGE_PRESET_COLORS[0]; // default blue
    const newStage = {
      key,
      label: newLabel.trim(),
      color: preset.color,
      dot: preset.dot,
      active: true
    };
    setStages([...stages, newStage]);
    setNewLabel("");
  };

  const removeStage = (index) => {
    const stage = stages[index];
    if (["open", "in_progress", "waiting", "pending", "resolved", "closed"].includes(stage.key)) {
      alert("System core stages cannot be deleted, only disabled.");
      return;
    }
    if (window.confirm(`Delete the custom column "${stage.label}"?`)) {
      setStages(stages.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* List items */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const colorName = STAGE_PRESET_COLORS.find(c => c.color === stage.color)?.label || "Custom";
          return (
            <div key={stage.key} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 transition-all">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                
                {/* Active check toggle badge */}
                <button
                  type="button"
                  onClick={() => toggleActive(index)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.16em] border transition-all ${stage.active 
                     ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                     : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/5 dark:text-slate-600 dark:border-white/5"}`}
                  title={stage.active ? "Click to Disable" : "Click to Enable"}
                >
                  {stage.active ? "Active" : "Disabled"}
                </button>

                {/* Name Input */}
                <input
                  type="text"
                  value={stage.label}
                  onChange={(e) => updateLabel(index, e.target.value)}
                  className="bg-transparent border-b border-transparent focus:border-indigo-500 text-xs font-black uppercase text-slate-800 dark:text-white outline-none py-1 flex-1 min-w-0"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                
                {/* Color Preset Selector */}
                <select
                  value={STAGE_PRESET_COLORS.findIndex(c => c.color === stage.color)}
                  onChange={(e) => updateColor(index, Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                >
                  {STAGE_PRESET_COLORS.map((c, i) => (
                    <option key={i} value={i}>{c.label}</option>
                  ))}
                  {colorName === "Custom" && <option value="-1">Custom</option>}
                </select>

                {/* Position Swap Buttons */}
                <button
                  type="button"
                  onClick={() => moveStage(index, -1)}
                  disabled={index === 0}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
                  title="Move Up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveStage(index, 1)}
                  disabled={index === stages.length - 1}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-indigo-500 hover:border-indigo-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
                  title="Move Down"
                >
                  <ArrowDown size={12} />
                </button>

                {/* Delete button (for custom ones only) */}
                {!["open", "in_progress", "waiting", "pending", "resolved", "closed"].includes(stage.key) && (
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Delete Column"
                  >
                    <Trash2 size={12} />
                  </button>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* Add new lane form */}
      <form onSubmit={addStage} className="bg-slate-50 dark:bg-white/5 rounded-[28px] border border-slate-100 dark:border-white/5 p-5 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Name a new ticket column (e.g. In Review)..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
          />
        </div>
        <button
          type="submit"
          className="w-full md:w-auto bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest px-6 py-4 rounded-2xl transition-all shadow-md"
        >
          Add Column
        </button>
      </form>

    </div>
  );
}
