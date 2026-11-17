import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Target,
    Calendar,
    Plus,
    Trash2,
    Edit3,
    TrendingUp,
    Users,
    Percent,
    ShieldAlert,
    X,
    Download,
    Printer,
    RefreshCw
  } from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import { formatCurrency } from "./CrmUIComponents.jsx";
import { getCurrencySymbol } from "../../utils/currencyFormatter.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import ConfirmModal from "../ConfirmModal.jsx";

const monthsList = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

  const isValidWebsiteId = (id) =>
    Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

  export default function CrmSalesTargets({ websiteId, teamMembers = [] }) {
    const { user } = useAuth();
    const toast = useToast();
    const { currencySymbol = getCurrencySymbol() } = useCurrency();
    const isManagerOrAdmin = ["admin", "client", "manager"].includes(user?.role);

    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

    const [loading, setLoading] = useState(true);
    const [targets, setTargets] = useState([]);
    const [overallProgress, setOverallProgress] = useState({ achievedValue: 0, achievedCount: 0 });
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Modal & Delete States
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [targetForm, setTargetForm] = useState({
      ownerId: "",
      targetValue: "",
      targetCount: ""
    });
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchTargets = async () => {
      if (!isValidWebsiteId(websiteId)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await api(
            `/api/crm/sales-targets?websiteId=${encodeURIComponent(websiteId)}&year=${selectedYear}&month=${selectedMonth}`
        );
        setTargets(data?.targets || []);
        setOverallProgress(data?.overall || { achievedValue: 0, achievedCount: 0 });
      } catch (err) {
        console.error("Failed to fetch sales targets:", err);
        toast?.error?.(err?.message || "Failed to fetch sales targets");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchTargets();
    }, [websiteId, selectedYear, selectedMonth]);

    useEffect(() => {
      if (showModal) document.body.style.overflow = "hidden";
      else document.body.style.overflow = "";
      return () => {
        document.body.style.overflow = "";
      };
    }, [showModal]);

    const openTargetModal = (prefill = null) => {
      setFormError("");
      if (prefill) {
        setTargetForm({
          ownerId: prefill.ownerId?._id || prefill.ownerId || "",
          targetValue: prefill.targetValue ?? "",
          targetCount: prefill.targetCount ?? ""
        });
      } else {
        setTargetForm({ ownerId: "", targetValue: "", targetCount: "" });
      }
      setShowModal(true);
    };

    const handleSaveTarget = async (e) => {
      e.preventDefault();
      if (!targetForm.targetValue || Number(targetForm.targetValue) <= 0) {
        setFormError("Target revenue value must be greater than 0");
        return;
      }

      setSaving(true);
      setFormError("");
      try {
        await api("/api/crm/sales-targets", {
          method: "POST",
          body: JSON.stringify({
            websiteId,
            ownerId: targetForm.ownerId || null,
            targetValue: Number(targetForm.targetValue),
            targetCount: Number(targetForm.targetCount || 0),
            month: selectedMonth,
            year: selectedYear,
            period: "monthly"
          })
        });
        setShowModal(false);
        setTargetForm({ ownerId: "", targetValue: "", targetCount: "" });
        toast?.success?.("Sales target saved");
        await fetchTargets();
      } catch (err) {
        setFormError(err.message || "Failed to save sales target");
      } finally {
        setSaving(false);
      }
    };

      const executeDeleteTarget = async () => {
        if (!deleteTargetId) return;
        setDeleting(true);
        try {
          await api(`/api/crm/sales-targets/${deleteTargetId}`, { method: "DELETE" });
          toast?.success?.("Sales target deleted");
          setDeleteTargetId(null);
          await fetchTargets();
        } catch (err) {
          toast?.error?.(err?.message || "Failed to delete target");
        } finally {
          setDeleting(false);
        }
      };

      const companyTarget = targets.find((t) => !t.ownerId);
      const agentTargets = targets.filter((t) => t.ownerId);

        if (!isValidWebsiteId(websiteId)) {
          return (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-center">
                  <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
                    <Target size={22} />
                  </div>
                    <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                      Select a Specific Website Domain
                    </h3>
                    <p className="text-[10.5px] font-medium text-slate-500 max-w-sm leading-relaxed mt-1">
                      Sales targets and quotas are configured per website. Please select a specific website from the top dropdown to manage targets.
                    </p>
                </div>
                );
  }

                const companyTargetVal = companyTarget?.targetValue || 0;
                const companyTargetCnt = companyTarget?.targetCount || 0;
                const companyAchievedVal = overallProgress.achievedValue || 0;
                const companyAchievedCnt = overallProgress.achievedCount || 0;

                const valueProgressPercent =
    companyTargetVal > 0 ? Math.min(100, Math.round((companyAchievedVal / companyTargetVal) * 100)) : 0;
                const countProgressPercent =
    companyTargetCnt > 0 ? Math.min(100, Math.round((companyAchievedCnt / companyTargetCnt) * 100)) : 0;

  const handleExportTargetsCSV = () => {
    const data = targets.map((t) => ({
                  "Scope / Consultant": t.ownerId ? t.ownerId.name || "Consultant" : "Company-Wide Target",
                "Target Month / Year": `${monthsList[selectedMonth - 1]} ${selectedYear}`,
                [`Revenue Target Value (${currencySymbol})`]: t.targetValue || 0,
                "Deals Count Target": t.targetCount || 0,
                "Achievement Status": t.ownerId ? "Individual Quota" : "Master Goal"
    }));
                exportToCSV(data, `Sales_Targets_Report_${selectedYear}_${selectedMonth}`);
  };

  const handleExportTargetsPDF = () => {
    const data = targets.map((t) => ({
                  "Scope / Consultant": t.ownerId ? t.ownerId.name || "Consultant" : "Company-Wide Target",
                "Month/Year": `${monthsList[selectedMonth - 1]} ${selectedYear}`,
                [`Revenue Goal (${currencySymbol})`]: formatCurrency(t.targetValue || 0),
                "Deals Goal": String(t.targetCount || 0)
    }));
                exportToPDF(
                data,
                `Sales_Targets_Report_${selectedYear}_${selectedMonth}`,
                "SALES TARGETS & CONSULTANT QUOTAS REPORT"
                );
  };

                return (
                        <div className="space-y-3 bg-white">
                          {/* Compact Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-lg shrink-0">
                                <Calendar size={15} />
                              </div>
                              <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                  Targets Configuration
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Set &amp; monitor monthly sales quotas
                                </p>
                              </div>
                            </div>

        <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  onClick={handleExportTargetsCSV}
                                  disabled={targets.length === 0}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
                                  title="Export Sales Targets to CSV"
                                >
                                  <Download size={12} /> Export CSV
                                </button>
          <button
                                  onClick={handleExportTargetsPDF}
                                  disabled={targets.length === 0}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
                                  title="Export Sales Targets to PDF"
                                >
                                  <Printer size={12} /> Export PDF
                                </button>

                                <select
                                  value={selectedMonth}
                                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-bold uppercase text-slate-700 outline-none cursor-pointer"
                                >
                                  {monthsList.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
                                  ))}
                                </select>

                                <select
                                  value={selectedYear}
                                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-bold uppercase text-slate-700 outline-none cursor-pointer"
                                >
            {
                                      yearOptions.map((y) => (
                                        <option key={y} value={y}>
                                          {y}
                                        </option>
                                      ))
                                    }
          </select>

                                <button
                                  onClick={fetchTargets}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                  title="Refresh targets"
                                >
                                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                                </button>

                                {isManagerOrAdmin && (
                                  <button
                                    onClick={() => openTargetModal()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[9.5px] font-black uppercase text-white hover:bg-indigo-700 transition-all"
                                  >
                                    <Plus size={12} /> Add / Set Target
                                  </button>
                                )}
                              </div>
                            </div>

                            {loading ? (
                                <div className="space-y-2">
                                  {[1, 2, 3].map((n) => (
                                    <div key={n} className="h-16 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
                                  ))}
                                </div>
                                ) : (
                                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                                        {/* Main Column */}
                                        <div className="xl:col-span-2 space-y-3">
                                          {/* Company-Wide Target Card */}
                                          <div className="bg-white text-slate-900 border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                                            <div className="relative z-10">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-100 text-[8.5px] font-black uppercase tracking-wider">
                                                      <Target size={11} className="text-indigo-600" />
                                                      Company-Wide Sales Goal
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[9.5px] font-black text-indigo-600 uppercase tracking-wider">
                                                        {monthsList[selectedMonth - 1]} {selectedYear}
                                                      </span>
                                                      {companyTarget && isManagerOrAdmin && (
                                                        <button
                                                          onClick={() => openTargetModal(companyTarget)}
                                                          className="p-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 transition-all cursor-pointer"
                                                          title="Edit Company Target"
                                                        >
                                                          <Edit3 size={11} />
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {companyTarget ? (
                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                                                Won Volume Revenue Goal
                                                              </p>
                                                              <div className="flex items-baseline gap-1.5">
                                                                <span className="text-xl font-black text-slate-900">{formatCurrency(companyAchievedVal)}</span>
                                                                <span className="text-slate-500 text-[10.5px] font-semibold">
                                                                  / {formatCurrency(companyTargetVal)}
                                                                </span>
                                                              </div>
                                                              <div className="space-y-1">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                    <div
                                                                      className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500"
                                                                      style={{ width: `${valueProgressPercent}%` }}
                                                                    />
                                                                  </div>
                                                                    <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                                                      <span>Progress</span>
                                                                      <span className="text-indigo-600">{valueProgressPercent}%</span>
                                                                    </div>
                                                                  </div>
                                                                </div>

                                                                    <div className="space-y-2">
                                                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                                                        Won Deals Count Goal
                                                                      </p>
                                                                      <div className="flex items-baseline gap-1.5">
                                                                        <span className="text-xl font-black text-slate-900">{companyAchievedCnt}</span>
                                                                        <span className="text-slate-500 text-[10.5px] font-semibold">
                                                                          / {companyTargetCnt} Deals
                                                                        </span>
                                                                      </div>
                                                                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                                            <div
                                                                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                                                              style={{ width: `${countProgressPercent}%` }}
                                                                            />
                                                                          </div>
                                                                            <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                                                              <span>Deals Target</span>
                                                                              <span className="text-emerald-600">{countProgressPercent}%</span>
                                                                            </div>
                                                                          </div>
                                                                        </div>
                                                                      </div>
                                                                      ) : (
                                                                        <div className="py-4 text-center space-y-2.5">
                                                                          <p className="text-slate-500 text-xs font-medium">
                                                                            No company-wide target has been set for this month yet.
                                                                          </p>
                                                                          {isManagerOrAdmin && (
                                                                            <button
                                                                              onClick={() => openTargetModal()}
                                                                              className="inline-flex items-center gap-1 bg-indigo-600 px-3.5 py-1.5 rounded-xl text-[9.5px] font-black uppercase text-white hover:bg-indigo-700 transition-all cursor-pointer"
                                                                            >
                                                                              <Plus size={12} /> Set Company Target
                                                                            </button>
                                                                          )}
                                                                        </div>
                )}
                                                                      </div>
                                                                    </div>

                                                                        {/* Quota Leaderboard */}
                                                                        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                                                                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                                            <div>
                                                                              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                                                                Sales Leaderboard Targets
                                                                              </h4>
                                                                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                                Individual quotas assigned to sales agents
                                                                              </p>
                                                                            </div>
                                                                              <div className="flex items-center gap-1 text-[9px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                                                                <Users size={11} className="text-slate-500" />
                                                                                <span>{agentTargets.length} Quotas</span>
                                                                              </div>
                                                                            </div>

                                                                            {agentTargets.length > 0 ? (
                                                                                  < div className="space-y-2">
                                                                                {[...agentTargets]
                                                                                  .sort((a, b) => {
                                                                                    const aPercent = a.targetValue > 0 ? a.achievedValue / a.targetValue : 0;
                                                                                    const bPercent = b.targetValue > 0 ? b.achievedValue / b.targetValue : 0;
                                                                                    return bPercent - aPercent;
                                                                                  })
                    .map((item) => {
                                                                                      const pctVal =
                                                                                        item.targetValue > 0
                                                                                          ? Math.min(100, Math.round((item.achievedValue / item.targetValue) * 100))
                                                                                          : 0;
                                                                                      const agentName = item.ownerId?.name || "Unassigned Agent";
                                                                                      const isComplete = pctVal >= 100;


                                                                                      return (
                                                                                              <div
                                                                                                key={item._id}
                                                                                                className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:border-slate-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                                                                                              >
                                                                                                <div className="flex items-center gap-2.5">
                                                                                                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                                                                                                    {agentName[0]?.toUpperCase()}
                                                                                                  </div>
                                                                                                  <div>
                                                                                                      <div className="flex items-center gap-1">
                                                                                                        <span className="text-[11px] font-black text-slate-900">{agentName}</span>
                                                                                                        {isComplete && (
                                  <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    Hit
                                  </span>
                                                                                                        )}
                                                                                                      </div>
                                                                                                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                                                                                                        {item.ownerId?.role || "sales"}
                                                                                                      </span>
                                                                                                    </div>
                                                                                                  </div>

                                                                                                        <div className="flex-1 max-w-md space-y-1">
                                                                                                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase">
                                                                                                            <span>
                                                                                                              Revenue: {formatCurrency(item.achievedValue)} /{" "}
                                                                                                              {formatCurrency(item.targetValue)}
                                                                                                            </span>
                                                                                                            <span
                                                                                                              className={
                                                                                                                isComplete
                                                                                                                  ? "text-emerald-600 font-black"
                                                                                                                  : pctVal >= 50
                                                                                                                    ? "text-indigo-600"
                                                                                                                    : "text-amber-600"
                                                                                                              }
                                                                                                            >
                                                                                                              {pctVal}%
                                                                                                            </span>
                                                                                                          </div>
                            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                                                                                                              <div
                                                                                                                className={`h-full rounded-full transition-all duration-500 ${isComplete
                                                                                                                    ? "bg-emerald-500"
                                                                                                                    : pctVal >= 50
                                                                                                                      ? "bg-indigo-600"
                                                                                                                      : "bg-amber-500"
                                                                                                                  }`}
                                                                                                                style={{ width: `${pctVal}%` }}
                                                                                                              />
                                                                                                            </div>
                                                                                                              <div className="text-[8.5px] font-bold text-slate-400 uppercase">
                                                                                                                Deals Won:{" "}
                                                                                                                <span className="text-slate-800 font-black">{item.achievedCount || 0}</span> /{" "}
                                                                                                                {item.targetCount || 0}
                                                                                                              </div>
                                                                                                            </div>

                                                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                                              {isManagerOrAdmin && (
                                                                                                                <button
                                                                                                                  onClick={() => openTargetModal(item)}
                                                                                                                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                                                  title="Edit target"
                                                                                                                >
                                                                                                                  <Edit3 size={12} />
                                                                                                                </button>
                                                                                                              )}
                                                                                                              <button
                                                                                                                onClick={() => {
                                                                                                                  exportSingleRecordPDF(
                                                                                                                    `SALES QUOTA REPORT - ${agentName}`,
                                                                                                                    {
                                                                                                                      "Consultant Name": agentName,
                                                                                                                      Role: (item.ownerId?.role || "Sales").toUpperCase(),
                                                                                                                      Timeframe: `${monthsList[selectedMonth - 1]} ${selectedYear}`,
                                                                                                                      "Target Revenue": formatCurrency(item.targetValue),
                                                                                                                      "Achieved Revenue": formatCurrency(item.achievedValue),
                                                                                                                      "Achievement Rate": `${pctVal}%`,
                                                                                                                      "Target Deals Count": item.targetCount || 0,
                                                                                                                      "Deals Won": item.achievedCount || 0
                                                                                                                    },
                                                                                                                      `Sales_Quota_${agentName.replace(/\s+/g, "_")}`
                                                                                                                  );
                                                                                                                }}
                                                                                                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                                                                                                title="Export Single Sales Quota PDF"
                                                                                                              >
                                                                                                                <Printer size={12} />
                                                                                                              </button>
                                                                                                              {isManagerOrAdmin && (
                                                                                                                <button
                                                                                                                  onClick={() => setDeleteTargetId(item._id)}
                                                                                                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                                                                                                  title="Delete target"
                                                                                                                >
                                                                                                                  <Trash2 size={12} />
                                                                                                                </button>
                                                                                                              )}
                                                                                                            </div>
                                                                                                          </div>
                                                                                                          );
                    })}
                                                                                                        </div>
                                                                                                        ) : (
                                                                                                          <div className="py-8 border border-dashed border-slate-200 rounded-xl text-center space-y-1.5">
                                                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                                                              No individual agent targets set for this month
                                                                                                            </p>
                                                                                                            {isManagerOrAdmin && (
                                                                                                              <button
                                                                                                                onClick={() => openTargetModal()}
                                                                                                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-wider underline"
                                                                                                              >
                                                                                                                Assign an agent target now
                                                                                                              </button>
                                                                                                            )}
                                                                                                          </div>
              )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                              {/* Monthly Analytics Sidebar */}
                                                                                                              <div className="space-y-3">
                                                                                                                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                                                                                                                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                                                                                                                    Monthly Analytics
                                                                                                                  </h4>

                                                                                                                  <div className="space-y-2.5">
                                                                                                                    <div className="rounded-xl bg-indigo-50/50 p-3 border border-indigo-100 flex items-start gap-2.5">
                                                                                                                      <div className="w-7 h-7 rounded-lg bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                                                                                                                        <TrendingUp size={13} />
                                                                                                                      </div>
                                                                                                                      <div>
                                                                                                                        <p className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                                                                                                                          Total Actual Won
                                                                                                                        </p>
                                                                                                                        <p className="text-base font-black text-slate-950 mt-0.5">
                                                                                                                          {formatCurrency(companyAchievedVal)}
                                                                                                                        </p>
                                                                                                                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                                                                                                                          {companyAchievedCnt} Won Deals Total
                                                                                                                        </p>
                                                                                                                      </div>
                                                                                                                    </div>

                                                                                                                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 flex items-start gap-2.5">
                                                                                                                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                                                                                                            <Percent size={13} />
                                                                                                                          </div>
                                                                                                                          <div>
                                                                                                                            <p className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                                                                                                                              Target Efficiency
                                                                                                                            </p>
                                                                                                                            <p className="text-base font-black text-slate-950 mt-0.5">
                                                                                                                              {valueProgressPercent}%
                                                                                                                            </p>
                                                                                                                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                                                                                                                              Company goal completion rate
                                                                                                                            </p>
                                                                                                                          </div>
                                                                                                                        </div>
                                                                                                                      </div>
                                                                                                                    </div>
                                                                                                                  </div>
                                                                                                                </div>
      )}

                                                                                                                {/* Target Setup Modal Form */}
                                                                                                                          {showModal &&
                                                                                                                            createPortal(
                                                                                                                              <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
                                                                                                                                <div
                                                                                                                                  className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto"
                                                                                                                                  onClick={() => setShowModal(false)}
                                                                                                                                />
                                                                                                                                <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                                                                                                                                  <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 shrink-0">
                                                                                                                                    <div>
                                                                                                                                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                                                                                                                                        Configure Sales Target
                                                                                                                                      </h3>
                                                                                                                                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                                                                                                                        Timeframe: {monthsList[selectedMonth - 1]} {selectedYear}
                                                                                                                                      </p>
                                                                                                                                    </div>
                                                                                                                                    <button
                                                                                                                                      type="button"
                                                                                                                                      onClick={() => setShowModal(false)}
                                                                                                                                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                                                                                                                                    >
                                                                                                                                      <X size={16} />
                                                                                                                                    </button>
                                                                                                                                  </div>

                                                                                                                                      <form onSubmit={handleSaveTarget} className="p-4 space-y-2.5 overflow-y-auto flex-1">
                                                                                                                                        {formError && (
                                                                                                                                          <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[10.5px] text-rose-600 font-bold flex items-center gap-2">
                                                                                                                                            <ShieldAlert size={13} className="shrink-0" />
                                                                                                                                            <span>{formError}</span>
                                                                                                                                          </div>
                                                                                                                                        )}

                                                                                                                                        <div className="space-y-1">
                                                                                                                                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                                                                                                                                            Assign Target To
                                                                                                                                          </label>
                                                                                                                                          <select
                                                                                                                                            value={targetForm.ownerId}
                                                                                                                                            onChange={(e) => setTargetForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                                                                                                                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 outline-none"
                                                                                                                                          >
                                                                                                                                            <option value="">Company Wide (Overall Target)</option>
                                                                                                                                            {teamMembers.map((m) => (
                                                                                                                                              <option key={m._id} value={m._id}>
                                                                                                                                                {m.name} ({m.role || "sales"})
                                                                                                                                              </option>
                                                                                                                                            ))}
                                                                                                                                          </select>
                                                                                                                                        </div>

                                                                                                                                                                        <div className="space-y-1">
                                                                                                                                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                                                                                                                                            Target Won Revenue ({currencySymbol}) *
                                                                                                                                          </label>
                                                                                                                                          <input
                                                                                                                                            type="number"
                                                                                                                                            min="1"
                                                                                                                                            placeholder="e.g. 50000"
                                                                                                                                            required
                                                                                                                                            value={targetForm.targetValue}
                                                                                                                                            onChange={(e) => setTargetForm((prev) => ({ ...prev, targetValue: e.target.value }))}
                                                                                                                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                                                                                                                                          />
                                                                                                                                        </div>

                                                                                                                                        <div className="space-y-1">
                                                                                                                                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                                                                                                                                            Target Won Deals Count (Optional)
                                                                                                                                          </label>
                                                                                                                                          <input
                                                                                                                                            type="number"
                                                                                                                                            min="0"
                                                                                                                                            placeholder="e.g. 10"
                                                                                                                                            value={targetForm.targetCount}
                                                                                                                                            onChange={(e) => setTargetForm((prev) => ({ ...prev, targetCount: e.target.value }))}
                                                                                                                                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                                                                                                                                          />
                                                                                                                                        </div>

                                                                                                                                        <div className="flex items-center gap-2 pt-2">
                                                                                                                                          <button
                                                                                                                                            type="button"
                                                                                                                                            onClick={() => setShowModal(false)}
                                                                                                                                            className="flex-1 border border-slate-200 rounded-xl py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all"
                                                                                                                                          >
                                                                                                                                            Cancel
                                                                                                                                          </button>
                                                                                                                                          <button
                                                                                                                                            type="submit"
                                                                                                                                            disabled={saving}
                                                                                                                                            className="flex-1 bg-indigo-600 rounded-xl py-2 text-[10px] font-black uppercase text-white hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center"
                                                                                                                                          >
                                                                                                                                            {saving ? "Saving…" : "Save Target"}
                                                                                                                                          </button>
                                                                                                                                        </div>
                                                                                                                                      </form>
                                                                                                                                    </div>
          </div>,
                                                                                                                              document.body
                                                                                                                            )}

                                                                                                                    <ConfirmModal
                                                                                                                      open={Boolean(deleteTargetId)}
                                                                                                                      title="Delete Sales Target"
                                                                                                                      message="Are you sure you want to delete this sales target?"
                                                                                                                      confirmLabel="Delete"
                                                                                                                      variant="danger"
                                                                                                                      loading={deleting}
                                                                                                                      onConfirm={executeDeleteTarget}
                                                                                                                      onCancel={() => setDeleteTargetId(null)}
                                                                                                                    />
                                                                                                                  </div>
                                                                                                                );
}
