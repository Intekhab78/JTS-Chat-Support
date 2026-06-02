import React from "react";
import { ChevronRight, User, AlertTriangle, TrendingUp, Brain, Clock, Shield } from "lucide-react";
import {
  WinProbabilityBadge,
  HeatIndicator,
  formatCurrency
} from "./CrmUIComponents.jsx";
import { isStaleLead, isHighValueLead } from "./crmUtils.js";

const cleanString = (val, fallback = "") => (val || "").trim() || fallback;

const formatCompactDate = (value) => {
  if (!value) return "No activity";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "No activity";
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

export default function CrmBoardView({
  customers,
  boardColumns,
  canManagePipeline,
  onOpenCustomer,
  onBoardDrop,
  onGenerateCode,
  draggedCustomerId,
  setDraggedCustomerId,
  dropTargetStatus,
  setDropTargetStatus
}) {
  return (
    <div className="overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]">
      <div className="flex items-start gap-4 min-w-max pr-2 snap-x snap-mandatory">
        {boardColumns.map((column, index) => {
          const columnCustomers = customers.filter((customer) => (customer.pipelineStage || "new") === column.key);
          const columnValue = columnCustomers.reduce((sum, customer) => sum + Number(customer.leadValue || 0), 0);

          return (
            <section
              key={column.key}
              onDragOver={(e) => {
                if (!canManagePipeline) return;
                e.preventDefault();
                setDropTargetStatus(column.key);
              }}
              onDragLeave={() => {
                if (dropTargetStatus === column.key) setDropTargetStatus("");
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedId = e.dataTransfer.getData("customerId");
                onBoardDrop(column.key, droppedId);
              }}
              className={`w-[340px] shrink-0 snap-start rounded-[28px] border transition-all duration-300 overflow-hidden bg-white shadow-sm ${dropTargetStatus === column.key ? "ring-4 ring-indigo-500/30 border-indigo-400 shadow-indigo-200/50 scale-[1.02] animate-pulse" : "border-slate-200"}`}
            >
              <div className={`p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 transition-all duration-300 ${dropTargetStatus === column.key ? "bg-indigo-50/70 border-indigo-200" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${column.tone} text-white flex items-center justify-center font-black shadow-lg shrink-0`}>
                    {columnCustomers.length}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{column.label}</h3>
                      {index > 0 && customers.length > 0 && (
                        <div className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                          {Math.round((columnCustomers.length / customers.filter(c => !c.archivedAt).length) * 100)}% <span className="text-[7px] opacity-60">OF TOTAL</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em]">{columnCustomers.length} records</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-black text-slate-950 tracking-tight">{formatCurrency(columnValue)}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Value</p>
                </div>
              </div>
              <div
                className={`p-3 space-y-3 min-h-[500px] max-h-[760px] overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] transition-all duration-300 ${dropTargetStatus === column.key ? "bg-indigo-50/40" : ""}`}
              >
                {columnCustomers.length === 0 ? (
                  <div className={`h-40 border-2 border-dashed rounded-[22px] flex items-center justify-center text-center px-6 transition-all duration-300 ${dropTargetStatus === column.key ? "border-indigo-400 bg-indigo-50/80 animate-pulse" : "border-slate-200"}`}>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No records in this stage</p>
                  </div>
                ) : (
                  columnCustomers.map((customer) => (
                    <BoardCard
                      key={customer._id}
                      customer={customer}
                      canManagePipeline={canManagePipeline}
                      onOpenCustomer={onOpenCustomer}
                      draggedCustomerId={draggedCustomerId}
                      setDraggedCustomerId={setDraggedCustomerId}
                      setDropTargetStatus={setDropTargetStatus}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({ customer, canManagePipeline, onOpenCustomer, draggedCustomerId, setDraggedCustomerId, setDropTargetStatus }) {
  const isStale = isStaleLead(customer);
  const isHighValue = isHighValueLead(customer);

  return (
    <article
      draggable={canManagePipeline && !customer.isLocked}
      onDragStart={(e) => {
        if (customer.isLocked) return;
        setDraggedCustomerId(customer._id);
        e.dataTransfer.setData("customerId", customer._id);
        e.dataTransfer.effectAllowed = "move";

        // Create a custom drag image
        const dragImage = e.target.cloneNode(true);
        dragImage.style.transform = "rotate(-2deg) scale(0.95)";
        dragImage.style.opacity = "0.8";
        dragImage.style.position = "absolute";
        dragImage.style.top = "-1000px";
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
        setTimeout(() => document.body.removeChild(dragImage), 0);
      }}
      onDragEnd={() => {
        setDraggedCustomerId("");
        setDropTargetStatus("");
      }}
      onClick={() => onOpenCustomer(customer)}
      className={`rounded-[22px] border bg-white p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group relative ${draggedCustomerId === customer._id ? "border-indigo-300 opacity-70 scale-[0.98]" : "border-slate-200"} ${isStale ? "ring-2 ring-amber-400/30 ring-offset-2 animate-pulse-subtle bg-amber-50/10" : ""}`}
    >
      {customer.pipelineStage === "won" && !customer.isLocked && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 text-slate-900 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-[0_8px_20px_-4px_rgba(234,179,8,0.4)] z-20 flex items-center gap-2 border border-yellow-200 overflow-hidden group/badge">
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          <span className="relative z-10 flex items-center gap-2">🏆 DEAL WON ✨</span>
        </div>
      )}
      {customer.isLocked && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-2 border border-slate-700 overflow-hidden">
          <Shield size={10} className="fill-amber-400 text-amber-400" /> LOCKED
        </div>
      )}
      {customer.nbaMetadata && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg z-10 flex items-center gap-1 animate-bounce">
          <Brain size={8} /> Active Insight
        </div>
      )}
      {isStale && (
        <div className="absolute -top-2 -left-2 bg-amber-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg z-10 flex items-center gap-1">
          <AlertTriangle size={8} /> Stale
        </div>
      )}
      {isHighValue && (
        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg z-10 flex items-center gap-1">
          <TrendingUp size={8} /> High Value
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-black shadow-sm shrink-0">
            {customer.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <h4 className="text-[12px] font-black text-slate-950 tracking-tight truncate">{cleanString(customer.name, "Anonymous Lead")}</h4>
            <p className="text-[10px] text-slate-400 font-bold truncate">{cleanString(customer.companyName) || cleanString(customer.email, "No contact info")}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <WinProbabilityBadge probability={customer.probability || 0} />
            <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest border ${customer.priority === "high" ? "bg-rose-50 text-rose-500 border-rose-100" :
              customer.priority === "medium" ? "bg-indigo-50 text-indigo-500 border-indigo-100" :
                "bg-slate-100 text-slate-400 border-slate-200"
              }`}>
              {customer.priority || "Med"}
            </span>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
            {customer.crn || "No CRN"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <HeatIndicator score={customer.heatScore || 0} />
          <div className="flex -space-x-2">
            {customer.ownerId ? (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black" title={customer.ownerId.name}>
                {customer.ownerId.name[0]}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-slate-300">
                <User size={10} />
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Expected Value</p>
            <p className="mt-1 text-[11px] font-black text-slate-900">{formatCurrency(customer.leadValue)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">Next Activity</p>
            <p className="mt-1 text-[11px] font-black text-slate-900">{customer.nextFollowUpAt ? formatCompactDate(customer.nextFollowUpAt) : "Not planned"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.16em]">
            <span className="text-slate-400">Owner</span>
            <span className="text-slate-700 truncate text-right">{customer.ownerId?.name || "Unassigned"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.16em]">
            <span className="text-slate-400">Source</span>
            <span className="text-slate-700 truncate text-right">{customer.leadSource || "Manual"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.16em]">
            <span className="text-slate-400">Interest</span>
            <span className="text-slate-700 truncate text-right">{customer.interestLevel || "Warm"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.16em]">
            <span className="text-slate-400">Probability</span>
            <span className="text-slate-700 truncate text-right">{customer.probability || 0}%</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.16em]">
            <span className="text-slate-400">Last touch</span>
            <span className="text-slate-700 truncate text-right">{formatCompactDate(customer.lastInteraction)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {customer.tags?.length > 0 ? customer.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-500 text-[8px] font-black uppercase tracking-[0.16em]">
              {tag}
            </span>
          )) : (
            <span className="text-[9px] font-bold text-slate-300">No tags</span>
          )}
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenCustomer(customer, 'actions'); }}
            className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-slate-300 hover:text-amber-500 transition-all"
            title="Create Task"
          >
            <Clock size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
