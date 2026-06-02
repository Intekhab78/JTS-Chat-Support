import React from "react";
import { Circle, Clock, CheckCircle2, Zap, TrendingUp, Brain } from "lucide-react";

export const CRM_STAGE_CONFIG = {
  new: { label: "New", color: "bg-violet-50 text-violet-600 border-violet-100", dot: "bg-violet-500", active: true },
  contacted: { label: "Contacted", color: "bg-sky-50 text-sky-600 border-sky-100", dot: "bg-sky-500", active: true },
  qualified: { label: "Qualified", color: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-500", active: true },
  proposal: { label: "Proposal", color: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500", active: true },
  negotiation: { label: "Negotiation", color: "bg-orange-50 text-orange-600 border-orange-100", dot: "bg-orange-500", active: true },
  won: { label: "Won", color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500", active: true },
  lost: { label: "Lost", color: "bg-red-50 text-red-500 border-red-100", dot: "bg-red-400", active: true }
};

export const TICKET_STATUS_CONFIG = {
  open: { label: "Open", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: Circle },
  waiting: { label: "Waiting", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
  pending: { label: "Waiting", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
  resolved: { label: "Resolved", color: "bg-slate-100 text-slate-500 border-slate-200", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-400 border-slate-100", icon: CheckCircle2 },
};

export function TicketStatusBadge({ status }) {
  const cfg = TICKET_STATUS_CONFIG[status] || TICKET_STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

export function PriorityDot({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
      ● {cfg.label}
    </span>
  );
}

export const PRIORITY_CONFIG = {
  low: { color: "text-slate-400", label: "Low" },
  medium: { color: "text-sky-500", label: "Medium" },
  high: { color: "text-amber-500", label: "High" },
  urgent: { color: "text-red-500", label: "Urgent" },
};

export const LEAD_STATUS_STYLES = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  disqualified: "bg-rose-50 text-rose-700 border-rose-200",
  proposal: "bg-amber-50 text-amber-700 border-amber-200",
  negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  prospect: "bg-violet-50 text-violet-700 border-violet-200",
  lead: "bg-cyan-50 text-cyan-700 border-cyan-200",
  customer: "bg-emerald-50 text-emerald-700 border-emerald-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-rose-50 text-rose-700 border-rose-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200"
};

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function LeadStatusBadge({ status }) {
  const normalized = status || "new";
  const classes = LEAD_STATUS_STYLES[normalized] || LEAD_STATUS_STYLES.new;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${classes}`}>
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

export function CRMStageBadge({ stage }) {
  const cfg = CRM_STAGE_CONFIG[stage] || CRM_STAGE_CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function HeatIndicator({ score }) {
  const isHot = score > 70;
  const isCold = score < 20;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${isHot ? "bg-orange-50 text-orange-600 border-orange-100" :
        isCold ? "bg-blue-50 text-blue-400 border-blue-100" :
          "bg-slate-50 text-slate-500 border-slate-100"
      }`}>
      {isHot ? <Zap size={10} className="animate-pulse" /> : <Clock size={10} />}
      Score: {score}
    </div>
  );
}

export function WinProbabilityBadge({ probability }) {
  const color = probability > 70 ? "text-emerald-500" : probability > 30 ? "text-amber-500" : "text-rose-400";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest">
      <TrendingUp size={10} className={color} />
      Win: {probability}%
    </div>
  );
}

export function NBARecommendationCard({ nba }) {
  if (!nba) return null;
  const priorityColors = {
    high: "bg-rose-50 border-rose-100 text-rose-700",
    medium: "bg-amber-50 border-amber-100 text-amber-700",
    low: "bg-indigo-50 border-indigo-100 text-indigo-700"
  };
  const classes = priorityColors[nba.priority] || priorityColors.low;
  return (
    <div className={`p-4 rounded-2xl border ${classes} animate-pulse-subtle`}>
      <div className="flex items-center gap-2 mb-2">
        <Brain size={14} className="animate-bounce" />
        <p className="text-[10px] font-black uppercase tracking-widest">Next Best Action</p>
      </div>
      <h4 className="text-sm font-black uppercase tracking-tight mb-1">{nba.action}</h4>
      <p className="text-[10px] font-medium leading-relaxed opacity-80">{nba.recommendation}</p>
    </div>
  );
}
