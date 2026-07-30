import React, { useState, useEffect } from "react";
import {
  Users, FileSpreadsheet, Building2, Clock, CheckCircle2, ChevronDown, ChevronUp,
  Search, Filter, Calendar, Send, AlertTriangle, ShieldCheck, Award, Info, RefreshCw, Check, UserCheck
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import SearchableCustomerSelect from "../SearchableCustomerSelect.jsx";

export default function TaxConsultantDashboard({ websiteId }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState("This Month (May 2026)");
  const [reminderLogs, setReminderLogs] = useState({}); // clientId -> array of logs
  const [reminderLoading, setReminderLoading] = useState({});

  // Collapsible States
  const [openSections, setOpenSections] = useState({
    vatCurrent: true,
    corporateTax: false,
    vatTotal: false,
    tradeLicense: false,
    visaExtensions: false
  });

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const q = websiteId ? `?websiteId=${websiteId}` : "";
      const res = await api(`/api/crm/reminders/overview${q}`);
      setData(res || {});

      if (res && res.todayLogs && Array.isArray(res.todayLogs)) {
        const today = new Date().toISOString().split("T")[0];
        const logsMap = {};
        res.todayLogs.forEach(log => {
          if (log.clientId) {
            logsMap[`${log.clientId}_${today}`] = true;
          }
        });
        setReminderLogs(prev => ({ ...logsMap, ...prev }));
      }
    } catch (err) {
      console.error("Failed to load tax consultant overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [websiteId]);

  // Handle 1-Click Reminder Recording
  const handleRecordReminder = async (clientId, serviceType) => {
    const today = new Date().toISOString().split("T")[0];
    const filingMonth = today.slice(0, 7);
    setReminderLoading(prev => ({ ...prev, [clientId]: true }));

    try {
      await api("/api/crm/reminders/log", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          serviceType,
          filingMonth,
          reminderDate: today,
          notes: `Daily follow-up reminder sent by ${user?.name || 'Tax Consultant'}`
        })
      });

      // Update local state to show reminder recorded
      setReminderLogs(prev => ({
        ...prev,
        [`${clientId}_${today}`]: true
      }));

      fetchDashboardData();
    } catch (err) {
      alert(err.message || "Failed to record reminder");
    } finally {
      setReminderLoading(prev => ({ ...prev, [clientId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Tax Consultant CRM Engine...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalClients: 0,
    vatFilingsThisMonth: 0,
    corporateTaxFilingsThisMonth: 0,
    upcomingDeadlines: 0,
    tasksPending: 0
  };

  const vatFilings = data?.vatFilings || [];
  const corporateTaxFilings = data?.corporateTaxFilings || [];
  const tradeLicenses = data?.tradeLicenses || [];
  const visaExtensions = data?.visaExtensions || [];

  const todayStr = new Date().toISOString().split("T")[0];
  const currentDateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Header Banner */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Welcome back, {user?.name || "Tax Consultant"}! 👋
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Here's an overview of your clients and upcoming obligations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700">
            <Calendar size={16} className="text-indigo-600" />
            <span>{currentDateFormatted}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Top 5 Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* KPI 1: Total Clients */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Users size={20} />
            </div>
            <span className="text-3xl font-black text-slate-900">{summary.totalClients}</span>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Total Clients</h4>
            <span onClick={() => { setOpenSections(prev => ({ ...prev, vatCurrent: true })); document.getElementById('section-vatCurrent')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer block mt-1">View all clients →</span>
          </div>
        </div>

        {/* KPI 2: VAT Filings This Month */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
              <FileSpreadsheet size={20} />
            </div>
            <span className="text-3xl font-black text-slate-900">{summary.vatFilingsThisMonth}</span>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">VAT Filings</h4>
            <p className="text-[9px] font-bold text-slate-400">This Month</p>
            <span onClick={() => { setOpenSections(prev => ({ ...prev, vatCurrent: true })); document.getElementById('section-vatCurrent')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer block mt-1">View details →</span>
          </div>
        </div>

        {/* KPI 3: Corporate Tax Filings */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
              <Building2 size={20} />
            </div>
            <span className="text-3xl font-black text-slate-900">{summary.corporateTaxFilingsThisMonth}</span>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Corporate Tax</h4>
            <p className="text-[9px] font-bold text-slate-400">This Month</p>
            <span onClick={() => { setOpenSections(prev => ({ ...prev, corporateTax: true })); document.getElementById('section-corporateTax')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer block mt-1">View details →</span>
          </div>
        </div>

        {/* KPI 4: Upcoming Deadlines */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Clock size={20} />
            </div>
            <span className="text-3xl font-black text-slate-900">{summary.upcomingDeadlines}</span>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Upcoming Deadlines</h4>
            <span onClick={() => { setOpenSections(prev => ({ ...prev, vatCurrent: true, corporateTax: true, tradeLicense: true })); document.getElementById('section-tradeLicense')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer block mt-1">View details →</span>
          </div>
        </div>

        {/* KPI 5: Tasks Pending */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-3xl font-black text-slate-900">{summary.tasksPending}</span>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Tasks Pending</h4>
            <span onClick={() => { setOpenSections(prev => ({ ...prev, vatCurrent: true, corporateTax: true, tradeLicense: true, visaExtensions: true })); document.getElementById('section-visaExtensions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer block mt-1">View details →</span>
          </div>
        </div>
      </div>

      {/* Prioritized Collapsible Module Cards */}
      <div className="space-y-4">
        {/* Module 1: Current VAT Filings */}
        <div id="section-vatCurrent" className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => toggleSection("vatCurrent")}
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-500/20">
                VAT
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Current VAT Filings</h3>
                <p className="text-xs font-bold text-slate-400">View and manage all VAT filings due this month.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                onClick={(e) => e.stopPropagation()}
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="This Month (May 2026)">This Month (May 2026)</option>
                <option value="Next Month (Jun 2026)">Next Month (Jun 2026)</option>
              </select>

              {openSections.vatCurrent ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.vatCurrent && (
            <div className="p-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
                      <th className="pb-3">Client / Company Name</th>
                      <th className="pb-3">TRN Number</th>
                      <th className="pb-3">Filing Due Date</th>
                      <th className="pb-3">Work Status</th>
                      <th className="pb-3 text-right">Daily Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {vatFilings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">No VAT filings due for this period.</td>
                      </tr>
                    ) : (
                      vatFilings.map((item) => {
                        const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 font-black">{item.clientName || "Al Reza Global Trading LLC"}</td>
                            <td className="py-4 font-mono text-slate-500">{item.trnNumber || "10098129900003"}</td>
                            <td className="py-4 font-mono text-emerald-600">{item.dueDate || "2026-06-28"}</td>
                            <td className="py-4">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                {item.workStatus || "Pending"}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleRecordReminder(item._id, "vat")}
                                disabled={isRecordedToday || reminderLoading[item._id]}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto ${
                                  isRecordedToday
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                                }`}
                              >
                                {isRecordedToday ? <Check size={14} /> : <Send size={14} />}
                                {isRecordedToday ? "Reminder Sent" : "Record Reminder"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Module 2: Corporate Tax Filings */}
        <div id="section-corporateTax" className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => toggleSection("corporateTax")}
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-600/20">
                TAX
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Corporate Tax Filings</h3>
                <p className="text-xs font-bold text-slate-400">View and manage all Corporate Tax filings due this month.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                onClick={(e) => e.stopPropagation()}
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="This Month (May 2026)">This Month (May 2026)</option>
              </select>

              {openSections.corporateTax ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.corporateTax && (
            <div className="p-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
                      <th className="pb-3">Client / Company Name</th>
                      <th className="pb-3">Financial Year</th>
                      <th className="pb-3">Filing Deadline</th>
                      <th className="pb-3">Tax Consultant</th>
                      <th className="pb-3 text-right">Daily Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {corporateTaxFilings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">No Corporate Tax filings due for this period.</td>
                      </tr>
                    ) : (
                      corporateTaxFilings.map((item) => {
                        const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 font-black">{item.clientName || "JTS Enterprise Holdings Group LLC"}</td>
                            <td className="py-4 text-slate-500">2025 - 2026</td>
                            <td className="py-4 font-mono text-purple-600">{item.dueDate || "2026-09-30"}</td>
                            <td className="py-4 text-slate-600">{item.consultantName || user?.name || "Anam Mushtaq"}</td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleRecordReminder(item._id, "corporate_tax")}
                                disabled={isRecordedToday || reminderLoading[item._id]}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto ${
                                  isRecordedToday
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"
                                }`}
                              >
                                {isRecordedToday ? <Check size={14} /> : <Send size={14} />}
                                {isRecordedToday ? "Reminder Sent" : "Record Reminder"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Module 3: Total VAT Filings */}
        <div id="section-vatTotal" className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => toggleSection("vatTotal")}
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-600/20">
                VAT
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Total VAT Filings</h3>
                <p className="text-xs font-bold text-slate-400">Search and view VAT filings for any period.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                onClick={(e) => e.stopPropagation()}
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="This Month (May 2026)">This Month (May 2026)</option>
                <option value="Next Month (Jun 2026)">Next Month (Jun 2026)</option>
              </select>

              <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200" title="Filter">
                <Filter size={16} />
              </button>

              {openSections.vatTotal ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.vatTotal && (
            <div className="p-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
                      <th className="pb-3">Client / Company Name</th>
                      <th className="pb-3">TRN Number</th>
                      <th className="pb-3">Filing Due Date</th>
                      <th className="pb-3">Work Status</th>
                      <th className="pb-3 text-right">Daily Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {vatFilings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">No VAT filings found.</td>
                      </tr>
                    ) : (
                      vatFilings.map((item) => {
                        const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 font-black">{item.clientName}</td>
                            <td className="py-4 font-mono text-slate-500">{item.trnNumber}</td>
                            <td className="py-4 font-mono text-blue-600">{item.dueDate}</td>
                            <td className="py-4">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                {item.workStatus || "Pending"}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleRecordReminder(item._id, "vat")}
                                disabled={isRecordedToday || reminderLoading[item._id]}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto ${
                                  isRecordedToday
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                                }`}
                              >
                                {isRecordedToday ? <Check size={14} /> : <Send size={14} />}
                                {isRecordedToday ? "Reminder Sent" : "Record Reminder"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Module 4: Trade License Renewals */}
        <div id="section-tradeLicense" className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => toggleSection("tradeLicense")}
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20">
                🏢
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Trade License Renewals</h3>
                <p className="text-xs font-bold text-slate-400">View all trade licenses due for renewal this month.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                onClick={(e) => e.stopPropagation()}
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="This Month (May 2026)">This Month (May 2026)</option>
              </select>

              {openSections.tradeLicense ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.tradeLicense && (
            <div className="p-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
                      <th className="pb-3">Client / Company Name</th>
                      <th className="pb-3">Trade License No.</th>
                      <th className="pb-3">Renewal Expiry Date</th>
                      <th className="pb-3">Work Status</th>
                      <th className="pb-3 text-right">Daily Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {tradeLicenses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">No Trade License renewals due for this period.</td>
                      </tr>
                    ) : (
                      tradeLicenses.map((item) => {
                        const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 font-black">{item.clientName}</td>
                            <td className="py-4 font-mono text-slate-500">{item.licenseNumber}</td>
                            <td className="py-4 font-mono text-amber-600">{item.expiryDate}</td>
                            <td className="py-4">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                {item.workStatus || "Pending"}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleRecordReminder(item._id, "trade_license")}
                                disabled={isRecordedToday || reminderLoading[item._id]}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto ${
                                  isRecordedToday
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                                }`}
                              >
                                {isRecordedToday ? <Check size={14} /> : <Send size={14} />}
                                {isRecordedToday ? "Reminder Sent" : "Record Reminder"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Module 5: Visa Extensions */}
        <div id="section-visaExtensions" className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => toggleSection("visaExtensions")}
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-cyan-600/20">
                🌐
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Visa Extensions</h3>
                <p className="text-xs font-bold text-slate-400">View all visa extensions due this month.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                onClick={(e) => e.stopPropagation()}
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="This Month (May 2026)">This Month (May 2026)</option>
              </select>

              {openSections.visaExtensions ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.visaExtensions && (
            <div className="p-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
                      <th className="pb-3">Client / Company Name</th>
                      <th className="pb-3">Visa Number</th>
                      <th className="pb-3">Expiry Date</th>
                      <th className="pb-3">Days Left</th>
                      <th className="pb-3 text-right">Daily Reminder Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {visaExtensions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-slate-400">No Visa extensions due for this period.</td>
                      </tr>
                    ) : (
                      visaExtensions.map((item) => {
                        const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                        return (
                          <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 font-black">{item.clientName}</td>
                            <td className="py-4 font-mono text-slate-500">{item.visaNumber}</td>
                            <td className="py-4 font-mono text-cyan-600">{item.expiryDate}</td>
                            <td className="py-4">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                                {item.daysLeft} Days Left
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => handleRecordReminder(item._id, "visa_extension")}
                                disabled={isRecordedToday || reminderLoading[item._id]}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ml-auto ${
                                  isRecordedToday
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                    : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/20"
                                }`}
                              >
                                {isRecordedToday ? <Check size={14} /> : <Send size={14} />}
                                {isRecordedToday ? "Reminder Sent" : "Record Reminder"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-xs font-bold text-sky-700 flex items-center gap-2">
        <Info size={16} className="text-sky-600 flex-shrink-0" />
        <span>Note: Click on any section above to view detailed client data and take action.</span>
      </div>
    </div>
  );
}
