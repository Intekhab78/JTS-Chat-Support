import React, { useState } from "react";
import { ChevronRight, User, AlertTriangle, TrendingUp, Brain, Clock, Shield, Flame, Award, Zap, Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  WinProbabilityBadge,
  HeatIndicator,
  formatCurrency,
  formatRequirement
} from "./CrmUIComponents.jsx";
import { isStaleLead, isHighValueLead } from "./crmUtils.js";
import { getCurrencySymbol } from "../../utils/currencyFormatter.js";

const exportColumnStage = (columnLabel, columnCustomers, format = "csv") => {
  const title = `CRM PIPELINE STAGE REPORT - ${columnLabel.toUpperCase()}`;
  const filename = `${columnLabel.toUpperCase()}_Stage_Leads_${new Date().toISOString().slice(0, 10)}`;
  const columns = ["Client / Lead Name", "Company Name", "Email", "Phone", "TRN", `Lead Value (${getCurrencySymbol()})`, "Work Status", "Payment Status", "Owner"];
  
  const rows = columnCustomers.map(c => [
    c.name || "-",
    c.companyName || "-",
    c.email || "-",
    c.phones?.[0]?.phone || c.phone || c.whatsApp || "-",
    c.trn || "Not Registered",
    c.leadValue || c.budget || 0,
    c.workStatus || "Pending",
    c.paymentStatus || "Pending",
    c.ownerId?.name || "Unassigned"
  ]);

  if (format === "csv") {
    const csvContent = "data:text/csv;charset=utf-8," + [
      [title],
      ["Stage Scope", columnLabel.toUpperCase()],
      ["Total Stage Records", columnCustomers.length],
      ["Generated Date", new Date().toLocaleDateString()],
      [],
      columns,
      ...rows
    ].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("JTS SUPPORT CRM", 14, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(199, 210, 254);
    doc.text(title, 14, 20);

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, 196, 14, { align: "right" });

    autoTable(doc, {
      startY: 34,
      margin: { left: 14, right: 14 },
      head: [columns.map(c => c.toUpperCase())],
      body: rows.length > 0 ? rows.map(r => r.map(cell => String(cell))) : [["No records found in this stage", "-", "-", "-", "-", "$0", "-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`${filename}.pdf`);
  }
};

const cleanString = (val, fallback = "") => (val || "").trim() || fallback;

const formatCompactDate = (value) => {
  if (!value) return "No activity";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "No activity";
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

const formatFullDateTime = (value) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "TBD";
  const dateStr = date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${dateStr}, ${timeStr}`.toUpperCase();
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
    <div className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
      <div className="flex items-start gap-3 min-w-max pr-2 snap-x snap-mandatory">
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
              className={`w-[300px] shrink-0 snap-start rounded-2xl border transition-all duration-300 overflow-hidden bg-white shadow-xs ${dropTargetStatus === column.key ? "ring-2 ring-indigo-500/40 border-indigo-400 shadow-indigo-200/40 scale-[1.01]" : "border-slate-200/90"}`}
            >
              <div className={`p-3 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-2 transition-all duration-300 ${dropTargetStatus === column.key ? "bg-indigo-50/70 border-indigo-200" : ""}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${column.tone} text-white text-xs flex items-center justify-center font-black shadow-xs shrink-0`}>
                    {columnCustomers.length}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate">{column.label}</h3>
                      {index > 0 && customers.length > 0 && (
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                          {Math.round((columnCustomers.length / customers.filter(c => !c.archivedAt).length) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{columnCustomers.length} records</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                  <p className="text-[11px] font-black text-slate-900 tracking-tight">{formatCurrency(columnValue)}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => exportColumnStage(column.label, columnCustomers, "csv")}
                      className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[8px] font-bold uppercase cursor-pointer"
                      title={`Export ${column.label} stage to Excel CSV`}
                    >
                      <Download size={9} /> CSV
                    </button>
                    <button
                      onClick={() => exportColumnStage(column.label, columnCustomers, "pdf")}
                      className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition-colors flex items-center gap-1 text-[8px] font-bold uppercase cursor-pointer"
                      title={`Export ${column.label} stage to PDF`}
                    >
                      <Printer size={9} /> PDF
                    </button>
                  </div>
                </div>
              </div>
              <div
                className={`p-2.5 space-y-2.5 min-h-[420px] max-h-[720px] overflow-y-auto bg-slate-50/40 transition-all duration-300 ${dropTargetStatus === column.key ? "bg-indigo-50/40" : ""}`}
              >
                {columnCustomers.length === 0 ? (
                  <div className={`h-32 border border-dashed rounded-xl flex items-center justify-center text-center px-4 transition-all duration-300 ${dropTargetStatus === column.key ? "border-indigo-400 bg-indigo-50/80 animate-pulse" : "border-slate-200"}`}>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No records in this stage</p>
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
  const stage = String(customer.pipelineStage || "new").toLowerCase();
  const isWon = stage === "won" || stage === "closed_won";
  const isLost = stage === "lost" || stage === "closed_lost";

  const accentBarClass = isWon
    ? "from-emerald-500 to-teal-500"
    : isLost
    ? "from-rose-400 to-rose-500"
    : isHighValue
    ? "from-indigo-500 to-violet-600"
    : isStale
    ? "from-amber-400 to-orange-500"
    : "";

  const cardBorderClass = draggedCustomerId === customer._id
    ? "border-indigo-300 opacity-70 scale-[0.98]"
    : isWon
    ? "border-emerald-200/80"
    : isLost
    ? "border-rose-200/80"
    : isHighValue
    ? "border-indigo-200/80"
    : isStale
    ? "border-amber-200/80"
    : "border-slate-200/90";

  return (
    <article
      draggable={canManagePipeline && !(customer.isLocked && isWon)}
      onDragStart={(e) => {
        if (customer.isLocked && isWon) return;
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
      className={`rounded-xl border bg-white p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group relative ${cardBorderClass}`}
    >
      {/* Semantic left accent bar by stage / priority */}
      {accentBarClass && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentBarClass} rounded-l-xl`} />
      )}
      {customer.pipelineStage === "won" && !customer.isLocked && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 text-slate-900 text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm z-20 flex items-center gap-1 border border-yellow-200">
          <Award size={9} /> DEAL WON
        </div>
      )}
      {customer.isLocked && customer.pipelineStage === "won" && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm z-20 flex items-center gap-1 border border-slate-700">
          <Shield size={9} className="fill-amber-400 text-amber-400" /> LOCKED
        </div>
      )}
      {/* Inline alert badge row — clearly visible inside the card */}
      {(isStale || isHighValue || customer.nbaMetadata) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {isStale && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold uppercase tracking-wider">
              <AlertTriangle size={8} className="shrink-0" /> Inactive 7+ Days
            </span>
          )}
          {isHighValue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8px] font-bold uppercase tracking-wider">
              <Award size={8} className="shrink-0" /> High Value
            </span>
          )}
          {customer.nbaMetadata && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[8px] font-bold uppercase tracking-wider">
              <Brain size={8} className="shrink-0" /> AI Insight
            </span>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white text-xs flex items-center justify-center font-bold shadow-2xs shrink-0">
            {customer.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold text-slate-900 tracking-tight truncate">{cleanString(customer.name, "Anonymous Lead")}</h4>
            <p className="text-[10px] text-slate-400 font-medium truncate">{cleanString(customer.companyName) || cleanString(customer.email, "No contact info")}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <WinProbabilityBadge probability={customer.probability || 0} />
            <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-wider border ${customer.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-100" :
              customer.priority === "medium" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
              {customer.priority || "Med"}
            </span>
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            {customer.crn || "No CRN"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <HeatIndicator score={customer.heatScore || 0} />
          <div className="flex -space-x-1.5">
            {customer.ownerId && customer.ownerId.name ? (
              <div className="w-5 h-5 rounded-full border border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-700" title={customer.ownerId.name}>
                {customer.ownerId.name[0].toUpperCase()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-white bg-slate-50 flex items-center justify-center text-slate-300">
                <User size={9} />
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Expected Value</p>
            <p className="mt-0.5 text-[10px] font-black text-slate-900">{formatCurrency(customer.leadValue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Next Activity</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-800">{customer.nextFollowUpAt ? formatCompactDate(customer.nextFollowUpAt) : "Not planned"}</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Owner</span>
            <span className="text-slate-700 truncate text-right">{customer.ownerId?.name || "Unassigned"}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Source</span>
            <span className="text-slate-700 uppercase truncate text-right">{customer.leadSource || "Manual"}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Interest</span>
            <span className="text-slate-700 uppercase truncate text-right">{customer.interestLevel || "Warm"}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Requirement</span>
            <span
              className={`truncate text-right max-w-[130px] ${customer.requirement ? 'text-indigo-600' : 'text-slate-300'}`}
              title={formatRequirement(customer.requirement)}
            >
              {customer.requirement ? formatRequirement(customer.requirement) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Probability</span>
            <span className="text-slate-700 truncate text-right">{customer.probability || 0}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Last touch</span>
            <span className="text-slate-700 truncate text-right">{formatCompactDate(customer.lastInteraction)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[9px] font-semibold">
            <span className="text-slate-400 uppercase tracking-wider">Created</span>
            <span className="text-slate-700 truncate text-right">
              {formatFullDateTime(customer.createdAt || customer.firstInteraction)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap gap-1 min-w-0">
            {customer.tags?.length > 0 ? customer.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 text-[8px] font-bold uppercase tracking-wider">
                {tag}
              </span>
            )) : (
              <span className="text-[9px] font-medium text-slate-300">No tags</span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenCustomer(customer, 'actions'); }}
            className="w-6 h-6 rounded-md hover:bg-amber-50 flex items-center justify-center text-slate-300 hover:text-amber-500 transition-all shrink-0"
            title="Create Task"
          >
            <Clock size={13} />
          </button>
        </div>

        {/* Next-step prompt for Won but not yet locked */}
        {customer.pipelineStage === "won" && !customer.isLocked && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 animate-pulse-subtle">
            <span className="text-amber-500 text-[10px]">⚡</span>
            <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest leading-tight">
              Open lead → Generate Code to start purchase workflow
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
