import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Landmark, Building2, Award, Clock, CreditCard,
  ChevronDown, ChevronUp, Search, RefreshCw, Send, Check, Eye, Users, ShieldCheck, Mail, Phone, X, Calendar
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function OverdueClientsSection({ websiteId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    vatFilings: [],
    corporateTaxFilings: [],
    tradeLicenses: [],
    visaExtensions: [],
    adminOverdue: []
  });

  // Collapsible Open/Close states for each separate module card (default all collapsed)
  const [openCards, setOpenCards] = useState({
    vat: false,
    corporateTax: false,
    tradeLicense: false,
    visa: false,
    adminFollowups: false
  });

  // Search & Filter State per module
  const [searchQuery, setSearchQuery] = useState({
    vat: "",
    corporateTax: "",
    tradeLicense: "",
    visa: "",
    adminFollowups: ""
  });

  const [statusFilter, setStatusFilter] = useState({
    vat: "all",
    corporateTax: "all",
    tradeLicense: "all",
    visa: "all",
    adminFollowups: "all"
  });

  // Modal State for Viewing Detailed Client 360
  const [selectedClient, setSelectedClient] = useState(null);
  const [reminderSending, setReminderSending] = useState({});
  const [reminderLogs, setReminderLogs] = useState({});

  const fetchOverdueData = async () => {
    setLoading(true);
    try {
      const q = websiteId ? `?websiteId=${websiteId}` : "";
      const [overviewRes, adminRes] = await Promise.allSettled([
        api(`/api/crm/reminders/overview${q}`),
        api(`/api/crm/reminders/overdue-admin${q}`)
      ]);

      const overview = overviewRes.status === "fulfilled" ? overviewRes.value : {};
      const admin = adminRes.status === "fulfilled" ? adminRes.value : {};

      const vat = overview.vatFilings || [];
      const ct = overview.corporateTaxFilings || [];
      const tl = overview.tradeLicenses || [];
      const visa = overview.visaExtensions || [];
      const followups = admin.overdueFollowups || [];

      setData({
        vatFilings: vat,
        corporateTaxFilings: ct,
        tradeLicenses: tl,
        visaExtensions: visa,
        adminOverdue: followups
      });

      // Populate today logs if present
      if (overview.todayLogs && Array.isArray(overview.todayLogs)) {
        const today = new Date().toISOString().split("T")[0];
        const logsMap = {};
        overview.todayLogs.forEach(l => {
          if (l.clientId) logsMap[`${l.clientId}_${today}`] = true;
        });
        setReminderLogs(logsMap);
      }
    } catch (err) {
      console.error("Failed to load overdue clients data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueData();
  }, [websiteId]);

  const toggleCard = (cardKey) => {
    setOpenCards(prev => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const handleStatusUpdate = async (clientId, serviceType, newStatus) => {
    try {
      await api(`/api/crm/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ workStatus: newStatus })
      });
      fetchOverdueData();
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleSendReminder = async (clientId, serviceType) => {
    const today = new Date().toISOString().split("T")[0];
    const filingMonth = today.slice(0, 7);
    setReminderSending(prev => ({ ...prev, [clientId]: true }));

    try {
      await api("/api/crm/reminders/log", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          serviceType,
          filingMonth,
          reminderDate: today,
          notes: `Overdue follow-up reminder triggered by ${user?.name || 'Tax Consultant'}`
        })
      });

      setReminderLogs(prev => ({ ...prev, [`${clientId}_${today}`]: true }));
      alert("✅ Reminder sent successfully to client!");
    } catch (err) {
      alert(err.message || "Failed to send reminder");
    } finally {
      setReminderSending(prev => ({ ...prev, [clientId]: false }));
    }
  };

  // Compute Overdue Filtered Lists & Counts
  const modulesConfig = useMemo(() => {
    const today = new Date();

    const isOverdue = (dateStr) => {
      if (!dateStr || dateStr === "-") return true;
      const d = new Date(dateStr);
      return d < today;
    };

    // 1. VAT Filings
    const vatList = data.vatFilings.filter(item => {
      const matchSearch = !searchQuery.vat || 
        (item.clientName || "").toLowerCase().includes(searchQuery.vat.toLowerCase()) ||
        (item.trnNumber || "").toLowerCase().includes(searchQuery.vat.toLowerCase());
      const status = item.workStatus || item.status || "Pending";
      const matchStatus = statusFilter.vat === "all" || status.toLowerCase() === statusFilter.vat.toLowerCase();
      return matchSearch && matchStatus;
    });

    // 2. Corporate Tax Filings
    const ctList = data.corporateTaxFilings.filter(item => {
      const matchSearch = !searchQuery.corporateTax || 
        (item.clientName || "").toLowerCase().includes(searchQuery.corporateTax.toLowerCase()) ||
        (item.trnNumber || "").toLowerCase().includes(searchQuery.corporateTax.toLowerCase());
      const status = item.workStatus || item.status || "Pending";
      const matchStatus = statusFilter.corporateTax === "all" || status.toLowerCase() === statusFilter.corporateTax.toLowerCase();
      return matchSearch && matchStatus;
    });

    // 3. Trade Licenses
    const tlList = data.tradeLicenses.filter(item => {
      const matchSearch = !searchQuery.tradeLicense || 
        (item.clientName || "").toLowerCase().includes(searchQuery.tradeLicense.toLowerCase()) ||
        (item.licenseNumber || "").toLowerCase().includes(searchQuery.tradeLicense.toLowerCase());
      const status = item.workStatus || item.status || "Pending";
      const matchStatus = statusFilter.tradeLicense === "all" || status.toLowerCase() === statusFilter.tradeLicense.toLowerCase();
      return matchSearch && matchStatus;
    });

    // 4. Visa & PRO Extensions
    const visaList = data.visaExtensions.filter(item => {
      const matchSearch = !searchQuery.visa || 
        (item.clientName || "").toLowerCase().includes(searchQuery.visa.toLowerCase());
      const status = item.workStatus || item.status || "Pending";
      const matchStatus = statusFilter.visa === "all" || status.toLowerCase() === statusFilter.visa.toLowerCase();
      return matchSearch && matchStatus;
    });

    // 5. Admin Missed Follow-ups
    const adminList = data.adminOverdue.filter(item => {
      return !searchQuery.adminFollowups || 
        (item.clientName || "").toLowerCase().includes(searchQuery.adminFollowups.toLowerCase()) ||
        (item.consultantName || "").toLowerCase().includes(searchQuery.adminFollowups.toLowerCase());
    });

    return [
      {
        key: "vat",
        title: "VAT Filing Overdue Clients",
        subtitle: "Clients with pending or overdue quarterly/monthly UAE VAT returns",
        icon: Landmark,
        badgeColor: "bg-emerald-500 text-white shadow-emerald-500/20",
        headerBg: "hover:bg-emerald-50/40",
        count: vatList.length,
        totalRaw: data.vatFilings.length,
        items: vatList,
        columns: ["CLIENT / COMPANY NAME", "TRN NUMBER", "DUE DATE", "WORK STATUS", "ACTIONS"]
      },
      {
        key: "corporateTax",
        title: "Corporate Tax Overdue Clients",
        subtitle: "Clients with pending Corporate Tax registration & filing deadlines",
        icon: Building2,
        badgeColor: "bg-purple-600 text-white shadow-purple-600/20",
        headerBg: "hover:bg-purple-50/40",
        count: ctList.length,
        totalRaw: data.corporateTaxFilings.length,
        items: ctList,
        columns: ["CLIENT / COMPANY NAME", "TRN NUMBER", "FINANCIAL YEAR", "WORK STATUS", "ACTIONS"]
      },
      {
        key: "tradeLicense",
        title: "Trade License Expiry & Renewal Overdue",
        subtitle: "Clients with expired or imminent commercial trade licenses",
        icon: Award,
        badgeColor: "bg-amber-500 text-white shadow-amber-500/20",
        headerBg: "hover:bg-amber-50/40",
        count: tlList.length,
        totalRaw: data.tradeLicenses.length,
        items: tlList,
        columns: ["CLIENT / COMPANY NAME", "LICENSE NUMBER", "EXPIRY DATE", "WORK STATUS", "ACTIONS"]
      },
      {
        key: "visa",
        title: "PRO & Visa Extension Overdue",
        subtitle: "Clients with active PRO services & visa extensions due for renewal",
        icon: CreditCard,
        badgeColor: "bg-blue-600 text-white shadow-blue-600/20",
        headerBg: "hover:bg-blue-50/40",
        count: visaList.length,
        totalRaw: data.visaExtensions.length,
        items: visaList,
        columns: ["CLIENT / COMPANY NAME", "SERVICE TYPE", "EXPIRY DATE", "WORK STATUS", "ACTIONS"]
      },
      {
        key: "adminFollowups",
        title: "Consultant Missed Follow-up Reminders",
        subtitle: "Unattended daily follow-ups across assigned Tax Consultants",
        icon: AlertTriangle,
        badgeColor: "bg-rose-600 text-white shadow-rose-600/20",
        headerBg: "hover:bg-rose-50/40",
        count: adminList.length,
        totalRaw: data.adminOverdue.length,
        items: adminList,
        columns: ["ASSIGNED CONSULTANT", "CLIENT / COMPANY NAME", "SERVICE TYPE", "MISSED DATE", "PENDING REMINDERS"]
      }
    ];
  }, [data, searchQuery, statusFilter]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Overview Header Banner */}
      <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Overdue Clients & Service Obligations</h3>
            <p className="text-xs font-bold text-slate-400">Click any card below to view detailed overdue client lists and take action</p>
          </div>
        </div>

        <button
          onClick={fetchOverdueData}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-bold transition-all"
          title="Refresh Overdue Lists"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* List of 5 Separate Collapsible Cards */}
      <div className="space-y-4">
        {modulesConfig.map((module) => {
          const IconComponent = module.icon;
          const isOpen = openCards[module.key];

          return (
            <div
              key={module.key}
              className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition-all"
            >
              {/* COLLAPSIBLE CARD HEADER */}
              <div
                onClick={() => toggleCard(module.key)}
                className={`p-6 flex items-center justify-between cursor-pointer transition-colors ${module.headerBg}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${module.badgeColor}`}>
                    <IconComponent size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{module.title}</h3>
                    <p className="text-xs font-bold text-slate-400">{module.subtitle}</p>
                  </div>
                </div>

                {/* OVERDUE TOTAL CLIENTS COUNT BADGE + TOGGLE CHEVRON */}
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${module.badgeColor}`}>
                    <Users size={14} />
                    {module.count} Clients Due
                  </span>

                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* DETAILED CLIENT INFORMATION (Visible ONLY when user clicks card to open) */}
              {isOpen && (
                <div className="border-t border-slate-100 p-6 space-y-5 bg-slate-50/30 animate-in slide-in-from-top-2 duration-200">
                  {/* Internal Controls Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
                    <div className="relative flex-1 w-full max-w-sm">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        value={searchQuery[module.key] || ""}
                        onChange={(e) => setSearchQuery({ ...searchQuery, [module.key]: e.target.value })}
                        placeholder={`Search ${module.title}...`}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:bg-white"
                      />
                    </div>

                    {module.key !== "adminFollowups" && (
                      <select
                        value={statusFilter[module.key] || "all"}
                        onChange={(e) => setStatusFilter({ ...statusFilter, [module.key]: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="all">All Work Statuses</option>
                        <option value="pending">🟡 Pending</option>
                        <option value="in progress">🔵 In Progress</option>
                        <option value="submitted to fta">🟣 Submitted to FTA</option>
                        <option value="completed">🟢 Filed / Completed</option>
                      </select>
                    )}
                  </div>

                  {/* Detailed Client Table */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-bold border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase text-slate-400 tracking-wider">
                            {module.columns.map((col, idx) => (
                              <th key={idx} className={`p-4 ${idx === module.columns.length - 1 ? "text-right" : ""}`}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {module.items.length === 0 ? (
                            <tr>
                              <td colSpan={module.columns.length} className="py-10 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                🎉 No overdue clients found for this service module!
                              </td>
                            </tr>
                          ) : module.key === "adminFollowups" ? (
                            /* Admin Follow-ups Table Rows */
                            module.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-4 text-indigo-600 font-black flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                    {(item.consultantName?.[0] || "C").toUpperCase()}
                                  </div>
                                  {item.consultantName}
                                </td>
                                <td className="p-4 font-black text-slate-900">{item.clientName}</td>
                                <td className="p-4">
                                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                                    {item.serviceType}
                                  </span>
                                </td>
                                <td className="p-4 font-mono text-rose-600 font-bold">
                                  <span className="flex items-center gap-1"><Calendar size={12} /> {item.missedReminderDate}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200">
                                    {item.pendingRemindersCount} Missed
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            /* Standard Service Module Table Rows */
                            module.items.map((item) => {
                              const isSentToday = reminderLogs[`${item._id}_${todayStr}`];

                              return (
                                <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                                  {/* Client Name */}
                                  <td
                                    className="p-4 font-black text-slate-900 hover:text-indigo-600 cursor-pointer"
                                    onClick={() => setSelectedClient(item)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{item.clientName}</span>
                                      <Eye size={13} className="text-slate-400 opacity-60 hover:opacity-100" />
                                    </div>
                                  </td>

                                  {/* TRN or License Number */}
                                  <td className="p-4 font-mono text-slate-600 text-[11px]">
                                    {item.trnNumber || item.licenseNumber || "—"}
                                  </td>

                                  {/* Due Date */}
                                  <td className="p-4 font-mono text-rose-600 font-bold">
                                    {item.dueDate || item.expiryDate || "—"}
                                  </td>

                                  {/* Work Status Select Dropdown */}
                                  <td className="p-4">
                                    <select
                                      value={item.workStatus || item.status || "Pending"}
                                      onChange={(e) => handleStatusUpdate(item._id, module.key, e.target.value)}
                                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border outline-none cursor-pointer transition-all ${
                                        (item.workStatus || "Pending") === "Completed" || (item.workStatus || "Pending") === "Filed"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : (item.workStatus || "Pending") === "In Progress"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : (item.workStatus || "Pending") === "Submitted to FTA"
                                          ? "bg-purple-50 text-purple-700 border-purple-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      <option value="Pending">🟡 Pending</option>
                                      <option value="In Progress">🔵 In Progress</option>
                                      <option value="Submitted to FTA">🟣 Submitted to FTA</option>
                                      <option value="Completed">🟢 Filed / Completed</option>
                                    </select>
                                  </td>

                                  {/* Actions */}
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => setSelectedClient(item)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 transition-colors"
                                        title="View Full Profile"
                                      >
                                        <Eye size={13} />
                                      </button>

                                      <button
                                        onClick={() => handleSendReminder(item._id, module.key)}
                                        disabled={isSentToday || reminderSending[item._id]}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${
                                          isSentToday
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                                        }`}
                                      >
                                        {isSentToday ? <Check size={12} /> : <Send size={12} />}
                                        {isSentToday ? "Sent" : "Send Reminder"}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DETAILED CLIENT PROFILE MODAL (When clicking Eye or Client Name) */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedClient.clientName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{selectedClient.serviceType || "Overdue Client Profile"}</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Communication Details</span>
                {selectedClient.email && <div className="flex items-center gap-2 text-slate-800"><Mail size={14} className="text-indigo-500 shrink-0" /><span>{selectedClient.email}</span></div>}
                {selectedClient.phone && <div className="flex items-center gap-2 text-slate-800"><Phone size={14} className="text-emerald-500 shrink-0" /><span>{selectedClient.phone}</span></div>}
                {selectedClient.emirate && <div className="text-[11px] text-slate-500">Location: {selectedClient.emirate}</div>}
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Compliance Identifiers & Deadlines</span>
                {selectedClient.trnNumber && <p className="text-xs font-mono">TRN: <span className="font-extrabold text-slate-900">{selectedClient.trnNumber}</span></p>}
                {selectedClient.licenseNumber && <p className="text-xs font-mono">License No: <span className="font-extrabold text-slate-900">{selectedClient.licenseNumber}</span></p>}
                {selectedClient.dueDate && <p className="text-xs font-mono text-rose-600">Obligation Due Date: <span className="font-extrabold">{selectedClient.dueDate}</span></p>}
                {selectedClient.consultantName && <p className="text-xs font-bold text-slate-600">Assigned Consultant: {selectedClient.consultantName}</p>}
              </div>

              {selectedClient.notes && (
                <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl text-[11px] font-medium text-amber-900">
                  <span className="font-black uppercase tracking-wider text-[9px] text-amber-700 block mb-1">Compliance Notes</span>
                  {selectedClient.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setSelectedClient(null)} className="px-5 py-2.5 bg-indigo-600 text-white font-black text-xs uppercase rounded-xl shadow-lg shadow-indigo-100">Close Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
