import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Target, Award, Calendar, Plus, Trash2, ArrowUpRight, 
  TrendingUp, Users, Percent, CheckCircle2, ShieldAlert, X, Download, Printer 
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatCurrency } from "./CrmUIComponents.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const monthsList = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CrmSalesTargets({ websiteId, teamMembers }) {
  const { user } = useAuth();
  const isManagerOrAdmin = ["admin", "client", "manager"].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [overallProgress, setOverallProgress] = useState({ achievedValue: 0, achievedCount: 0 });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [targetForm, setTargetForm] = useState({
    ownerId: "", // Empty for company wide target
    targetValue: "",
    targetCount: "",
  });

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const data = await api(
        `/api/crm/sales-targets?websiteId=${websiteId}&year=${selectedYear}&month=${selectedMonth}`
      );
      setTargets(data.targets || []);
      setOverallProgress(data.overall || { achievedValue: 0, achievedCount: 0 });
    } catch (err) {
      console.error("Failed to fetch sales targets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      return;
    }
    fetchTargets();
  }, [websiteId, selectedYear, selectedMonth]);

  useEffect(() => {
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

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
      fetchTargets();
    } catch (err) {
      setFormError(err.message || "Failed to save sales target");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTarget = async (targetId) => {
    if (!window.confirm("Are you sure you want to delete this target?")) return;
    try {
      await api(`/api/crm/sales-targets/${targetId}`, { method: "DELETE" });
      fetchTargets();
    } catch (err) {
      alert("Failed to delete target: " + err.message);
    }
  };

  // Find company-wide target (where ownerId is null)
  const companyTarget = targets.find(t => !t.ownerId);
  const agentTargets = targets.filter(t => t.ownerId);

  if (!websiteId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200/80 rounded-[30px] shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
          <Target size={32} />
        </div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Select a Specific Website Domain</h3>
        <p className="text-xs font-bold text-slate-400 max-w-sm leading-relaxed mt-2">
          Sales targets and quotas are configured per website asset. Please select a specific domain from the website dropdown at the top of the console to start tracking.
        </p>
      </div>
    );
  }

  // Compute stats for Company Target progress
  const companyTargetVal = companyTarget?.targetValue || 0;
  const companyTargetCnt = companyTarget?.targetCount || 0;
  const companyAchievedVal = overallProgress.achievedValue || 0;
  const companyAchievedCnt = overallProgress.achievedCount || 0;

  const valueProgressPercent = companyTargetVal > 0 ? Math.min(100, Math.round((companyAchievedVal / companyTargetVal) * 100)) : 0;
  const countProgressPercent = companyTargetCnt > 0 ? Math.min(100, Math.round((companyAchievedCnt / companyTargetCnt) * 100)) : 0;

  const handleExportTargetsCSV = () => {
    const data = targets.map(t => ({
      "Scope / Consultant": t.ownerId ? (t.ownerId.name || "Consultant") : "Company-Wide Target",
      "Target Month / Year": `${monthsList[selectedMonth - 1]} ${selectedYear}`,
      "Revenue Target Value": t.targetValue || 0,
      "Deals Count Target": t.targetCount || 0,
      "Achievement Status": t.ownerId ? "Individual Quota" : "Master Goal"
    }));
    exportToCSV(data, `Sales_Targets_Report_${selectedYear}_${selectedMonth}`);
  };

  const handleExportTargetsPDF = () => {
    const data = targets.map(t => ({
      "Scope / Consultant": t.ownerId ? (t.ownerId.name || "Consultant") : "Company-Wide Target",
      "Month/Year": `${monthsList[selectedMonth - 1]} ${selectedYear}`,
      "Revenue Goal ($)": `$${(t.targetValue || 0).toLocaleString()}`,
      "Deals Goal": String(t.targetCount || 0)
    }));
    exportToPDF(data, `Sales_Targets_Report_${selectedYear}_${selectedMonth}`, "SALES TARGETS & CONSULTANT QUOTAS REPORT");
  };

  return (
    <div className="space-y-6">
      {/* Timeframe selector header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900">Targets Configuration</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Set & monitor monthly sales quotas</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleExportTargetsCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Sales Targets to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportTargetsPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Sales Targets to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-700"
          >
            {monthsList.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-700"
          >
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {isManagerOrAdmin && (
            <button
              onClick={() => {
                setFormError("");
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Plus size={14} /> Add/Set Target
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white border border-slate-100 rounded-[24px]">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading targets progress...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Dashboard Widget for Company-wide Target */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[30px] p-6 md:p-8 shadow-xl relative overflow-hidden">
              {/* Background accent glow */}
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-wider">
                    <Target size={12} className="text-indigo-400" />
                    Company-wide Sales Goal
                  </div>
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">
                    {monthsList[selectedMonth - 1]} {selectedYear}
                  </span>
                </div>

                {companyTarget ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Revenue target progress */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em]">Won Volume Revenue Goal</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black">{formatCurrency(companyAchievedVal)}</span>
                        <span className="text-slate-400 text-xs font-semibold">/ {formatCurrency(companyTargetVal)}</span>
                      </div>
                      
                      {/* Custom progress bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${valueProgressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <span>Progress</span>
                          <span className="text-indigo-400">{valueProgressPercent}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Deals count progress */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em]">Won Deals Count Goal</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black">{companyAchievedCnt}</span>
                        <span className="text-slate-400 text-xs font-semibold">/ {companyTargetCnt} Deals</span>
                      </div>

                      {/* Custom progress bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${countProgressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <span>Deals Target</span>
                          <span className="text-emerald-400">{countProgressPercent}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <p className="text-slate-400 text-sm font-semibold">No company-wide target has been set for this month yet.</p>
                    {isManagerOrAdmin && (
                      <button
                        onClick={() => {
                          setTargetForm({ ownerId: "", targetValue: "", targetCount: "" });
                          setFormError("");
                          setShowModal(true);
                        }}
                        className="inline-flex items-center gap-1 bg-indigo-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase text-white hover:bg-indigo-700 transition-all shadow-lg"
                      >
                        <Plus size={14} /> Set Company Target
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quota Leaderboard and detailed progress */}
            <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sales Leaderboard Targets</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Individual quotas assigned to sales agents</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                  <Users size={12} className="text-slate-500" />
                  <span>{agentTargets.length} Assigned Quotas</span>
                </div>
              </div>

              {agentTargets.length > 0 ? (
                <div className="space-y-4">
                  {agentTargets
                    .sort((a, b) => {
                      const aPercent = a.targetValue > 0 ? (a.achievedValue / a.targetValue) : 0;
                      const bPercent = b.targetValue > 0 ? (b.achievedValue / b.targetValue) : 0;
                      return bPercent - aPercent;
                    })
                    .map((item, index) => {
                      const pctVal = item.targetValue > 0 ? Math.min(100, Math.round((item.achievedValue / item.targetValue) * 100)) : 0;
                      const agentName = item.ownerId?.name || "Unassigned Agent";
                      const isComplete = pctVal >= 100;
                      
                      return (
                        <div key={item._id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:border-slate-200 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                              {agentName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-950">{agentName}</span>
                                {isComplete && (
                                  <span className="text-xs" title="Quota Exceeded! 🔥">🔥</span>
                                )}
                              </div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.ownerId?.role || "sales"}</span>
                            </div>
                          </div>

                          {/* Progress indicators */}
                          <div className="flex-1 max-w-md space-y-2">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              <span>Revenue: {formatCurrency(item.achievedValue)} / {formatCurrency(item.targetValue)}</span>
                              <span className={isComplete ? "text-emerald-600 font-black" : pctVal >= 50 ? "text-indigo-600" : "text-amber-600"}>
                                {pctVal}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : pctVal >= 50 ? "bg-indigo-600" : "bg-amber-500"}`}
                                style={{ width: `${pctVal}%` }}
                              />
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              Deals Won: <span className="text-slate-800 font-black">{item.achievedCount}</span> / {item.targetCount || 0}
                            </div>
                          </div>

                          {/* Control actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                exportSingleRecordPDF(
                                  `SALES QUOTA REPORT - ${agentName}`,
                                  {
                                    "Consultant Name": agentName,
                                    "Role": (item.ownerId?.role || "Sales").toUpperCase(),
                                    "Timeframe": `${monthsList[selectedMonth - 1]} ${selectedYear}`,
                                    "Target Revenue": formatCurrency(item.targetValue),
                                    "Achieved Revenue": formatCurrency(item.achievedValue),
                                    "Achievement Rate": `${pctVal}%`,
                                    "Target Deals Count": item.targetCount || 0,
                                    "Deals Won": item.achievedCount || 0
                                  },
                                  `Sales_Quota_${agentName.replace(/\s+/g, '_')}`
                                );
                              }}
                              className="w-8 h-8 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-colors"
                              title="Export Single Sales Quota PDF"
                            >
                              <Printer size={13} />
                            </button>
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => handleDeleteTarget(item._id)}
                                className="w-8 h-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                                title="Delete target"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No individual agent targets set for this month</p>
                  {isManagerOrAdmin && (
                    <button
                      onClick={() => {
                        setFormError("");
                        setShowModal(true);
                      }}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest underline"
                    >
                      Assign an agent target now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Info & Stats Pane */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Monthly Analytics</h4>
              
              <div className="space-y-4">
                <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Total Actual Won</p>
                    <p className="text-lg font-black text-slate-950 mt-1">{formatCurrency(companyAchievedVal)}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{companyAchievedCnt} Won Deals Total</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <Percent size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Target Efficiency</p>
                    <p className="text-lg font-black text-slate-950 mt-1">{valueProgressPercent}%</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Company goal completion rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Setup Modal Form */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowModal(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-950 tracking-tight">Configure Sales Target</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Timeframe: {monthsList[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {formError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-600 font-bold flex items-center gap-2">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Owner target selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Assign Target To</label>
                <select
                  value={targetForm.ownerId}
                  onChange={(e) => setTargetForm(prev => ({ ...prev, ownerId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="">Company Wide (Overall Target)</option>
                  {teamMembers.map(m => (
                    <option key={m._id} value={m._id}>{m.name} ({m.role || "sales"})</option>
                  ))}
                </select>
              </div>

              {/* Target value input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Target Won Revenue (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  required
                  value={targetForm.targetValue}
                  onChange={(e) => setTargetForm(prev => ({ ...prev, targetValue: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              {/* Target won deals count input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Target Won Deals Count (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={targetForm.targetCount}
                  onChange={(e) => setTargetForm(prev => ({ ...prev, targetCount: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              {/* Modal controls */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 rounded-2xl py-3.5 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 rounded-2xl py-3.5 text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Save Target</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
