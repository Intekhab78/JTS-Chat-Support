import React, { useState, useEffect } from "react";
import {
  FileText, Download, Filter, Calendar, Users, Briefcase, RefreshCw, FileSpreadsheet,
  ShieldCheck, Check, Search, Award, AlertTriangle, CreditCard, Landmark, Sparkles, ChevronRight, Layers, ArrowUpRight
} from "lucide-react";
import { api } from "../../api/client.js";
import { exportToPDF, exportToExcel, exportToCSV } from "../../utils/exportUtils.js";

const COMPLIANCE_REPORTS = [
  {
    id: "client_list",
    label: "Master Client Directory",
    description: "Complete inventory of clients, TRN, Trade License & Work Status",
    icon: ShieldCheck,
    tag: "Directory",
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent"
  },
  {
    id: "vat_status",
    label: "VAT Filing Status",
    description: "VAT registration, period schedules, and filing deadline tracking",
    icon: Landmark,
    tag: "UAE VAT",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent"
  },
  {
    id: "corporate_tax",
    label: "Corporate Tax Filing",
    description: "Corporate Tax filing deadlines & live days remaining countdowns",
    icon: Sparkles,
    tag: "Corporate Tax",
    gradient: "from-violet-500/10 via-purple-500/5 to-transparent"
  },
  {
    id: "trade_license",
    label: "Trade License Expiry",
    description: "Commercial license expiry dates & color-coded warning buckets",
    icon: Award,
    tag: "DED License",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent"
  },
  {
    id: "consultant_performance",
    label: "Consultant Performance",
    description: "Workload matrix, completed jobs, and overdue escalation ratios",
    icon: Users,
    tag: "KPI Audit",
    gradient: "from-sky-500/10 via-blue-500/5 to-transparent"
  },
  {
    id: "overdue_clients",
    label: "Overdue & Inactivity Audit",
    description: "Comprehensive audit of overdue compliance tasks & escalation tiers",
    icon: AlertTriangle,
    tag: "Escalation",
    gradient: "from-rose-500/10 via-pink-500/5 to-transparent"
  },
  {
    id: "payment_status",
    label: "Client Payment Status",
    description: "Service fee payment statuses, budgets, and outstanding balances",
    icon: CreditCard,
    tag: "Financials",
    gradient: "from-indigo-500/10 via-purple-500/5 to-transparent"
  }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── Executive Header Banner ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-8 text-white shadow-[0_24px_70px_-20px_rgba(15,23,42,0.6)] border border-slate-800/80">
        {/* Glow backdrop shapes */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300 border border-indigo-500/20 backdrop-blur-md">
              <Sparkles size={12} className="text-indigo-400" /> Executive Compliance Intelligence
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Compliance Reporting Hub
            </h2>
            <p className="max-w-xl text-xs font-bold text-slate-300/80 leading-relaxed">
              Generate & download audit-ready PDF, Excel, and CSV reports for UAE VAT, Corporate Tax, DED Trade Licenses, and Consultant KPIs.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportPDF}
              disabled={!reportData.rows?.length}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 px-5 py-3.5 text-xs font-black text-white uppercase tracking-wider shadow-[0_10px_30px_-5px_rgba(244,63,94,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            >
              <span className="flex items-center gap-2">
                <FileText size={15} /> Export PDF
              </span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!reportData.rows?.length}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 px-5 py-3.5 text-xs font-black text-white uppercase tracking-wider shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={15} /> Export Excel
              </span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!reportData.rows?.length}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 px-5 py-3.5 text-xs font-black text-white uppercase tracking-wider border border-slate-700/60 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            >
              <span className="flex items-center gap-2">
                <Download size={15} /> Export CSV
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Report Cards Selection Grid ─────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">Select Report Type</p>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{COMPLIANCE_REPORTS.length} Reports Available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPLIANCE_REPORTS.map(r => {
            const isSelected = selectedReport === r.id;
            const Icon = r.icon;

            return (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`group relative overflow-hidden p-5 rounded-[28px] border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white border-indigo-400/40 shadow-[0_20px_45px_-12px_rgba(79,70,229,0.5)] ring-2 ring-indigo-500/40 scale-[1.02]"
                    : "bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-0.5 text-slate-900"
                }`}
              >
                {/* Background Card Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${r.gradient} opacity-50 pointer-events-none`} />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-2xl transition-transform group-hover:scale-110 ${
                      isSelected ? "bg-white/20 text-white shadow-inner" : "bg-indigo-50 text-indigo-600"
                    }`}>
                      <Icon size={18} />
                    </div>

                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                      isSelected ? "bg-white/20 text-white border-white/30" : "bg-slate-100 text-slate-500 border-slate-200/60"
                    }`}>
                      {r.tag}
                    </span>
                  </div>

                  <h4 className={`text-xs font-black uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {r.label}
                  </h4>
                  <p className={`text-[10px] font-bold mt-1.5 line-clamp-2 leading-relaxed ${isSelected ? "text-indigo-100/90" : "text-slate-400"}`}>
                    {r.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-indigo-100/10 flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isSelected ? "text-indigo-200" : "text-indigo-600"}>View Report</span>
                  {isSelected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-600 shadow">
                      <Check size={12} />
                    </span>
                  ) : (
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Report Filters Console ─────────────────────────────── */}
      <div className="rounded-[30px] border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Filter size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Custom Report Parameters</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Filter by date window, consultant owner, and service category</p>
            </div>
          </div>

          {(startDate || endDate || consultantId || serviceType) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setConsultantId("");
                setServiceType("");
              }}
              className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Start Date</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-slate-700"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-slate-700"
              />
            </div>
          </div>

          {/* Consultant Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Assigned Consultant</label>
            <select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-slate-700 cursor-pointer"
            >
              <option value="">All Consultants</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Service Type Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Service Scope</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-slate-700 cursor-pointer"
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

      {/* ── Live Data Audit Table ─────────────────────────────── */}
      <div className="rounded-[34px] border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {reportData.reportTitle || activeMeta?.label}
              </h3>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
              <span className="text-indigo-600 font-black">{reportData.totalRecords || 0}</span> Records compiled • Auto-synced at {new Date().toLocaleTimeString()}
            </p>
          </div>

          <button
            onClick={fetchReport}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-200 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} /> Refresh Audit
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1350px]">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200">
                {(reportData.columns || []).map((col, idx) => (
                  <th key={idx} className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={reportData.columns?.length || 5} className="px-5 py-5">
                      <div className="h-4 bg-slate-100 rounded-xl w-3/4" />
                    </td>
                  </tr>
                ))
              ) : !reportData.rows || reportData.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.columns?.length || 5} className="px-6 py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-500">
                        <FileText size={24} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-700">No Records Found</p>
                      <p className="text-[10px] font-bold text-slate-400">There are no compliance records matching the specified filter parameters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-indigo-50/30 transition-colors">
                    {(reportData.columns || []).map((col, cIdx) => {
                      const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : "-";
                      const colLower = col.toLowerCase();
                      
                      // Highlight Status Badges
                      if (colLower.includes("status")) {
                        const isCompleted = ["completed", "paid", "submitted", "active"].includes(val.toLowerCase());
                        const isPending = ["pending", "unpaid", "renewal_pending"].includes(val.toLowerCase());
                        const isOverdue = ["overdue", "failed", "expired", "dark_red", "red"].includes(val.toLowerCase());

                        return (
                          <td key={cIdx} className="px-5 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                              isCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" :
                              isOverdue ? "bg-rose-50 text-rose-700 border border-rose-200/80" :
                              isPending ? "bg-amber-50 text-amber-700 border border-amber-200/80" :
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
                          <td key={cIdx} className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-black text-indigo-950 bg-indigo-50/70 border border-indigo-100/80 px-2.5 py-1 rounded-lg">
                              {val}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={cIdx} className="px-5 py-4 whitespace-nowrap text-slate-900 font-bold">
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
