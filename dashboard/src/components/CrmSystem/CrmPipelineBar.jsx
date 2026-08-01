import React, { useState } from "react";
import { TrendingUp, Download, Printer, Filter, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function CRMPipelineBar({ customers }) {
  const [selectedStageMenu, setSelectedStageMenu] = useState("");

  const pipelineCounts = customers.reduce((acc, c) => {
    const stage = c.pipelineStage || "new";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const stages = [
    { key: "new", label: "New", color: "bg-violet-500", textColor: "text-violet-600", count: pipelineCounts.new || 0 },
    { key: "contacted", label: "Contacted", color: "bg-sky-500", textColor: "text-sky-600", count: pipelineCounts.contacted || 0 },
    { key: "qualified", label: "Qualified", color: "bg-indigo-500", textColor: "text-indigo-600", count: pipelineCounts.qualified || 0 },
    { key: "proposal", label: "Proposal", color: "bg-amber-500", textColor: "text-amber-600", count: pipelineCounts.proposal || 0 },
    { key: "negotiation", label: "Negotiation", color: "bg-orange-500", textColor: "text-orange-600", count: pipelineCounts.negotiation || 0 },
    { key: "won", label: "Won", color: "bg-emerald-500", textColor: "text-emerald-600", count: pipelineCounts.won || 0 },
    { key: "lost", label: "Lost", color: "bg-red-400", textColor: "text-red-500", count: pipelineCounts.lost || 0 },
  ];

  const total = customers.length || 1;

  // ── STAGE-WISE INDIVIDUAL EXPORT ─────────────────────────────
  const exportStageReport = (stageKey, stageLabel, format = "csv") => {
    const stageCustomers = customers.filter(c => (c.pipelineStage || "new").toLowerCase() === stageKey);
    const title = `CRM STAGE REPORT - ${stageLabel.toUpperCase()}`;
    const filename = `${stageLabel.toUpperCase()}_Stage_Leads_${new Date().toISOString().slice(0, 10)}`;
    const columns = ["Client / Lead Name", "Company Name", "Email", "Phone", "TRN", "Lead Value ($)", "Work Status", "Payment Status", "Owner"];
    
    const rows = stageCustomers.map(c => [
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
        ["Pipeline Stage Scope", stageLabel.toUpperCase()],
        ["Total Stage Records", stageCustomers.length],
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

  // ── ALL STAGES MASTER EXPORT ─────────────────────────────
  const exportAllStagesMaster = (format = "csv") => {
    const reportDate = new Date().toLocaleDateString();
    const filename = `All_Pipeline_Stages_Master_Report_${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      let rows = [
        ["=========================================================================="],
        ["JTS SUPPORT - ALL PIPELINE STAGES MASTER REPORT"],
        ["Generated Date", reportDate],
        ["Total Pipeline Records", customers.length],
        ["=========================================================================="],
        []
      ];

      stages.forEach(st => {
        const stCustomers = customers.filter(c => (c.pipelineStage || "new").toLowerCase() === st.key);
        rows.push([`--- ${st.label.toUpperCase()} STAGE (${stCustomers.length} Records) ---`]);
        rows.push(["Client / Lead Name", "Company Name", "Email", "Phone", "TRN", "Lead Value ($)", "Work Status", "Payment Status", "Owner"]);
        if (stCustomers.length === 0) {
          rows.push(["No records in this stage", "-", "-", "-", "-", "$0", "-", "-", "-"]);
        } else {
          stCustomers.forEach(c => {
            rows.push([
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
          });
        }
        rows.push([]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let currentY = 34;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("JTS SUPPORT CRM", 14, 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(199, 210, 254);
      doc.text("ALL PIPELINE STAGES MASTER REPORT", 14, 20);

      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${reportDate}`, 196, 14, { align: "right" });

      stages.forEach(st => {
        const stCustomers = customers.filter(c => (c.pipelineStage || "new").toLowerCase() === st.key);
        
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 27, 75);
        doc.text(`${st.label.toUpperCase()} STAGE (${stCustomers.length} Records)`, 14, currentY);

        const rows = stCustomers.map(c => [
          c.name || "-",
          c.companyName || "-",
          c.email || "-",
          c.phones?.[0]?.phone || c.phone || c.whatsApp || "-",
          `$${(c.leadValue || c.budget || 0).toLocaleString()}`,
          c.workStatus || "Pending"
        ]);

        autoTable(doc, {
          startY: currentY + 3,
          margin: { left: 14, right: 14 },
          head: [["NAME", "COMPANY", "EMAIL", "PHONE", "VALUE ($)", "STATUS"]],
          body: rows.length > 0 ? rows : [["No records in this stage", "-", "-", "-", "$0", "-"]],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        currentY = doc.lastAutoTable.finalY + 8;
      });

      doc.save(`${filename}.pdf`);
    }
  };

  return (
    <div className="premium-card p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CRM Pipeline Overview</p>
          <p className="text-sm font-black text-slate-900">{customers.length} Total Records Active</p>
        </div>

        {/* Global Pipeline Export Options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportAllStagesMaster("csv")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all"
            title="Export All Pipeline Stages to 1 Excel Sheet"
          >
            <Download size={13} /> Export All Stages (Excel)
          </button>
          <button
            onClick={() => exportAllStagesMaster("pdf")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all"
            title="Export All Pipeline Stages to Master PDF"
          >
            <Printer size={13} /> Export All Stages (PDF)
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex rounded-xl overflow-hidden h-2.5 bg-slate-100 gap-0.5">
        {stages.map(s => s.count > 0 && (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-700`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>

      {/* Interactive Stage-by-Stage Chips */}
      <div className="flex gap-2 flex-wrap items-center pt-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Stage Export:</span>
        {stages.map(s => (
          <div key={s.key} className="relative group">
            <button
              onClick={() => setSelectedStageMenu(selectedStageMenu === s.key ? "" : s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all ${selectedStageMenu === s.key ? "ring-2 ring-indigo-500 border-indigo-500" : ""}`}
            >
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{s.label}</span>
              <span className={`text-[10px] font-black ${s.textColor} bg-slate-100 px-1.5 py-0.2 rounded-md`}>{s.count}</span>
              <ChevronDown size={11} className="text-slate-400" />
            </button>

            {/* Dropdown Menu for Individual Stage Export */}
            {selectedStageMenu === s.key && (
              <div className="absolute left-0 mt-1 z-30 w-44 bg-slate-900 rounded-xl shadow-xl border border-slate-800 p-1.5 text-white animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[8px] font-black text-slate-400 uppercase border-b border-slate-800 mb-1">
                  Export {s.label} Stage Only
                </div>
                <button
                  onClick={() => {
                    exportStageReport(s.key, s.label, "csv");
                    setSelectedStageMenu("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Download size={12} /> {s.label} Excel CSV
                </button>
                <button
                  onClick={() => {
                    exportStageReport(s.key, s.label, "pdf");
                    setSelectedStageMenu("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Printer size={12} /> {s.label} PDF Report
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
