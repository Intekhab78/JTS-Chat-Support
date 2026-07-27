import React, { useState, useEffect } from "react";
import {
  FileText, Download, Filter, Calendar, Users, Briefcase, RefreshCw, FileSpreadsheet, FileCode, Check, Search, ShieldCheck
} from "lucide-react";
import { api } from "../../api/client.js";
import { exportToPDF, exportToExcel, exportToCSV } from "../../utils/exportUtils.js";

const COMPLIANCE_REPORTS = [
  { id: "client_list", label: "Master Client Directory Report", description: "Complete inventory of clients, TRN, Trade License & Work Status" },
  { id: "vat_status", label: "VAT Filing Status Report", description: "VAT registration, period schedules, and filing deadline tracking" },
  { id: "corporate_tax", label: "Corporate Tax Filing Report", description: "Corporate Tax filing deadlines & live days remaining countdowns" },
  { id: "trade_license", label: "Trade License Expiry Report", description: "Commercial license expiry dates & color-coded warning buckets" },
  { id: "consultant_performance", label: "Consultant Performance Report", description: "Workload matrix, completed jobs, and overdue escalation ratios" },
  { id: "overdue_clients", label: "Overdue & Unattended Audit Report", description: "Comprehensive audit of overdue compliance tasks & escalation tiers" },
  { id: "payment_status", label: "Client Payment Status Report", description: "Service fee payment statuses, budgets, and outstanding balances" }
];

export default function ComplianceReportsHub({ websiteId, teamMembers = [] }) {
  const [selectedReport, setSelectedReport] = useState("client_list");
  const [reportData, setReportData] = useState({ reportTitle: "", columns: [], rows: [], totalRecords: 0 });
  const [loading, setLoading] = useState(false);

  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [serviceType, setServiceType] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ reportType: selectedReport });
      if (websiteId) params.append("websiteId", websiteId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (consultantId) params.append("consultantId", consultantId);
      if (serviceType) params.append("serviceType", serviceType);

      const res = await api(`/api/crm/compliance/reports/data?${params.toString()}`);
      setReportData(res || { reportTitle: "", columns: [], rows: [], totalRecords: 0 });
    } catch (err) {
      console.error("Failed to load compliance report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [websiteId, selectedReport, startDate, endDate, consultantId, serviceType]);

  const handleExportPDF = () => {
    if (!reportData.rows || !reportData.rows.length) return;
    exportToPDF(reportData.rows, `${selectedReport}_${new Date().toISOString().substring(0, 10)}`, reportData.reportTitle);
  };

  const handleExportExcel = () => {
    if (!reportData.rows || !reportData.rows.length) return;
    exportToExcel(reportData.rows, `${selectedReport}_${new Date().toISOString().substring(0, 10)}`);
  };

  const handleExportCSV = () => {
    if (!reportData.rows || !reportData.rows.length) return;
    exportToCSV(reportData.rows, `${selectedReport}_${new Date().toISOString().substring(0, 10)}`);
  };

  const activeMeta = COMPLIANCE_REPORTS.find(r => r.id === selectedReport);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper Title & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Enterprise Compliance Reporting Hub</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Download PDF & Excel compliance reports for UAE business services & audits
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportPDF}
            disabled={!reportData.rows?.length}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 shadow-sm"
          >
            <FileText size={14} /> Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!reportData.rows?.length}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 shadow-sm"
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!reportData.rows?.length}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COMPLIANCE_REPORTS.map(r => {
          const isSelected = selectedReport === r.id;
          return (
            <div
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`p-5 rounded-[22px] border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200" : "bg-white border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>Report</span>
                  {isSelected && <Check size={14} />}
                </div>
                <h4 className={`text-xs font-black uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-900"}`}>{r.label}</h4>
                <p className={`text-[9px] font-bold mt-1 line-clamp-2 ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>{r.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
          <Filter size={16} className="text-indigo-600" /> Report Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
          </div>

          {/* Consultant Filter */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Consultant</label>
            <select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="">All Consultants</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Service Type Filter */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Service Scope</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="">All Services</option>
              <option value="Corporate Tax Registration">Corporate Tax Registration</option>
              <option value="Corporate Tax Filing">Corporate Tax Filing</option>
              <option value="VAT Registration">VAT Registration</option>
              <option value="VAT Filing">VAT Filing</option>
              <option value="Trade License Renewal">Trade License Renewal</option>
              <option value="PRO Services">PRO Services</option>
              <option value="Other Services">Other Services</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Report Data Preview Grid */}
      <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">{reportData.reportTitle || activeMeta?.label}</h3>
            <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">
              {reportData.totalRecords || 0} Records compiled • Generated on {new Date().toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={fetchReport}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1350px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                {(reportData.columns || []).map((col, idx) => (
                  <th key={idx} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={reportData.columns?.length || 5} className="px-4 py-5"><div className="h-4 bg-slate-100 rounded-lg w-1/2" /></td>
                  </tr>
                ))
              ) : !reportData.rows || reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.columns?.length || 5} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    No compliance records found for the selected filters.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {(reportData.columns || []).map((col, cIdx) => {
                      const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : "-";
                      const colLower = col.toLowerCase();
                      
                      // Highlight Status Badges
                      if (colLower.includes("status")) {
                        const isCompleted = val.toLowerCase() === "completed" || val.toLowerCase() === "paid" || val.toLowerCase() === "submitted";
                        const isPending = val.toLowerCase() === "pending" || val.toLowerCase() === "unpaid";
                        const isOverdue = val.toLowerCase() === "overdue" || val.toLowerCase() === "failed";

                        return (
                          <td key={cIdx} className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                              isCompleted ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                              isOverdue ? "bg-rose-50 text-rose-600 border border-rose-200" :
                              isPending ? "bg-amber-50 text-amber-600 border border-amber-200" :
                              "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              {val}
                            </span>
                          </td>
                        );
                      }

                      // Monospace styling for TRN or Trade License numbers
                      if (colLower.includes("trn") || colLower.includes("license")) {
                        return (
                          <td key={cIdx} className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {val}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={cIdx} className="px-4 py-3.5 whitespace-nowrap text-slate-900 font-bold">
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
