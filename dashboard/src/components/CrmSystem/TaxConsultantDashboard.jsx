import React, { useState, useEffect } from "react";
import {
  Users, FileSpreadsheet, Building2, Clock, CheckCircle2, ChevronDown, ChevronUp,
  Search, Filter, Calendar, Send, AlertTriangle, ShieldCheck, Award, Info, RefreshCw, Check, UserCheck, Eye, X
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import SearchableCustomerSelect from "../SearchableCustomerSelect.jsx";

export default function TaxConsultantDashboard({ websiteId }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const getMonthLabel = (offset = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const prefix = offset === 0 ? "This Month" : offset === 1 ? "Next Month" : offset === -1 ? "Last Month" : monthName;
    return `${prefix} (${monthName} ${year})`;
  };

  const thisMonthLabel = getMonthLabel(0);
  const nextMonthLabel = getMonthLabel(1);
  const lastMonthLabel = getMonthLabel(-1);

  const [activeMonth, setActiveMonth] = useState(thisMonthLabel);
  const [reminderLogs, setReminderLogs] = useState({});
  const [reminderLoading, setReminderLoading] = useState({});
  const [batchLoading, setBatchLoading] = useState({});
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  // All Clients Panel
  const [allClientsOpen, setAllClientsOpen] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [allClientsLoading, setAllClientsLoading] = useState(false);
  const [allClientsSearch, setAllClientsSearch] = useState("");
  const [allClientsPage, setAllClientsPage] = useState(1);
  const ALL_CLIENTS_PAGE_SIZE = 12;
  const [editClient, setEditClient] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({});

  // KPI Details Panel
  const [kpiPanel, setKpiPanel] = useState(null); // { title, color, items, serviceType }

  const openAllClients = async () => {
    setAllClientsOpen(true);
    setAllClientsSearch("");
    setAllClientsPage(1);
    if (allClients.length === 0) await fetchAllClients();
  };

  const fetchAllClients = async () => {
    setAllClientsLoading(true);
    try {
      const res = await api("/api/crm/customers?limit=500");
      setAllClients(Array.isArray(res) ? res : (res?.customers || res?.data || []));
    } catch (e) {
      console.error("Failed to load clients:", e);
    } finally {
      setAllClientsLoading(false);
    }
  };

  const openEditClient = async (c) => {
    setEditForm({
      companyName: c.companyName || c.name || "",
      email: c.email || "",
      phone: c.phone || c.mobile || "",
      trn: c.trn || "",
      tradeLicenseNumber: c.tradeLicenseNumber || "",
      tradeLicenseExpiryDate: c.tradeLicenseExpiryDate ? c.tradeLicenseExpiryDate.split("T")[0] : "",
      vatFilingDueDate: c.vatFilingDueDate ? c.vatFilingDueDate.split("T")[0] : "",
      corporateTaxDueDate: c.corporateTaxDueDate ? c.corporateTaxDueDate.split("T")[0] : "",
      vatFilingPeriod: c.vatFilingPeriod || "",
      emirate: c.emirate || c.city || "",
      address: c.address || "",
      workStatus: c.workStatus || "Pending",
      notes: c.notes || c.remarks || "",
      contactPersonName: c.contactPersonName || c.contactPerson || "",
      contactPersonDesignation: c.contactPersonDesignation || c.designation || "",
    });
    setEditClient(c);
  };

  const handleSaveEdit = async () => {
    if (!editClient) return;
    setEditLoading(true);
    try {
      await api(`/api/crm/${editClient._id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      // Refresh list
      await fetchAllClients();
      // Update editClient with new data
      setEditClient(prev => prev ? { ...prev, ...editForm } : null);
      alert("✅ Client updated successfully!");
    } catch (e) {
      alert(e.message || "Failed to update client");
    } finally {
      setEditLoading(false);
    }
  };

  // Per-section search, filter, pagination, multiselect
  const [sectionState, setSectionState] = useState({
    vatCurrent:    { search: "", statusFilter: "all", page: 1, selected: [] },
    corporateTax:  { search: "", statusFilter: "all", page: 1, selected: [] },
    vatTotal:      { search: "", statusFilter: "all", page: 1, selected: [] },
    tradeLicense:  { search: "", statusFilter: "all", page: 1, selected: [] },
    visaExtensions:{ search: "", statusFilter: "all", page: 1, selected: [] },
  });
  const PAGE_SIZE = 10;

  const updateSection = (key, patch) =>
    setSectionState(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const toggleRowSelect = (sectionKey, id) => {
    setSectionState(prev => {
      const sel = prev[sectionKey].selected;
      const next = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id];
      return { ...prev, [sectionKey]: { ...prev[sectionKey], selected: next } };
    });
  };

  const toggleSelectAll = (sectionKey, visibleIds) => {
    setSectionState(prev => {
      const sel = prev[sectionKey].selected;
      const allSelected = visibleIds.every(id => sel.includes(id));
      const next = allSelected ? sel.filter(id => !visibleIds.includes(id)) : [...new Set([...sel, ...visibleIds])];
      return { ...prev, [sectionKey]: { ...prev[sectionKey], selected: next } };
    });
  };

  const applyFilters = (items, sectionKey, dateKey = "dueDate") => {
    const { search, statusFilter } = sectionState[sectionKey];
    return items.filter(item => {
      const matchSearch = !search ||
        (item.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.trnNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (item.phone || "").toLowerCase().includes(search.toLowerCase());
      const ws = (item.workStatus || item.status || "Pending");
      const matchStatus = statusFilter === "all" || ws.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  };

  const getPaged = (items, sectionKey) => {
    const { page } = sectionState[sectionKey];
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  };

  // Batch send reminders for selected clients in a section
  const handleBatchReminder = async (sectionKey, items, serviceType) => {
    const today = new Date().toISOString().split("T")[0];
    const filingMonth = today.slice(0, 7);
    const clientIds = sectionState[sectionKey].selected.filter(id =>
      !reminderLogs[`${id}_${today}`]
    );
    if (clientIds.length === 0) return;
    setBatchLoading(prev => ({ ...prev, [sectionKey]: true }));
    try {
      await api("/api/crm/reminders/batch-log", {
        method: "POST",
        body: JSON.stringify({ clientIds, serviceType, filingMonth, reminderDate: today })
      });
      const newLogs = {};
      clientIds.forEach(id => { newLogs[`${id}_${today}`] = true; });
      setReminderLogs(prev => ({ ...prev, ...newLogs }));
      updateSection(sectionKey, { selected: [] });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || "Failed to send batch reminders");
    } finally {
      setBatchLoading(prev => ({ ...prev, [sectionKey]: false }));
    }
  };

  const handleUpdateStatus = async (clientId, serviceType, workStatus) => {
    setStatusUpdating(true);
    try {
      await api("/api/crm/reminders/status", {
        method: "POST",
        body: JSON.stringify({ clientId, serviceType, workStatus })
      });

      if (selectedFiling && selectedFiling.item._id === clientId) {
        setSelectedFiling(prev => prev ? {
          ...prev,
          item: { ...prev.item, workStatus }
        } : null);
      }

      fetchDashboardData();
    } catch (err) {
      alert(err.message || "Failed to update work status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const renderStatusSelect = (item, serviceType) => (
    <select
      value={item.workStatus || item.status || "Pending"}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => handleUpdateStatus(item._id, serviceType, e.target.value)}
      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase border outline-none cursor-pointer transition-all ${
        (item.workStatus || item.status || "Pending") === "Completed" || (item.workStatus || item.status || "Pending") === "Filed"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : (item.workStatus || item.status || "Pending") === "In Progress"
          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          : (item.workStatus || item.status || "Pending") === "Submitted to FTA"
          ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
      }`}
    >
      <option value="Pending">🟡 Pending</option>
      <option value="In Progress">🔵 In Progress</option>
      <option value="Submitted to FTA">🟣 Submitted to FTA</option>
      <option value="Filed">🟢 Filed / Completed</option>
      <option value="Completed">✅ Completed</option>
    </select>
  );

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

  const rawVatFilings = data?.vatFilings || [];
  const rawCorporateTaxFilings = data?.corporateTaxFilings || [];
  const rawTradeLicenses = data?.tradeLicenses || [];
  const rawVisaExtensions = data?.visaExtensions || [];

  const getMonthYearString = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const targetYearMonth = (() => {
    if (activeMonth === nextMonthLabel) {
      return getMonthYearString(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    }
    if (activeMonth === lastMonthLabel) {
      return getMonthYearString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    }
    return getMonthYearString(now);
  })();

  const filterByMonth = (items, dateKey = "dueDate") => {
    if (!items || !Array.isArray(items)) return [];
    const filtered = items.filter(item => {
      const d = item[dateKey] || item.expiryDate || item.dueDate || item.filingDeadline;
      if (!d) return true;
      return String(d).startsWith(targetYearMonth);
    });
    return filtered.length > 0 ? filtered : items;
  };

  const vatFilings = filterByMonth(rawVatFilings, "dueDate");
  const corporateTaxFilings = filterByMonth(rawCorporateTaxFilings, "dueDate");
  const tradeLicenses = filterByMonth(rawTradeLicenses, "expiryDate");
  const visaExtensions = filterByMonth(rawVisaExtensions, "expiryDate");

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
            <span onClick={openAllClients} className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer block mt-1">View all clients →</span>
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
            <span
              onClick={() => {
                setKpiPanel({
                  title: "VAT Filings — This Month",
                  color: "emerald",
                  items: vatFilings,
                  serviceType: "vat",
                  categoryLabel: "Current VAT Filing",
                  columns: ["Company Name", "TRN Number", "Due Date", "Status"]
                });
              }}
              className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer block mt-1">View details →</span>
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
            <span
              onClick={() => {
                setKpiPanel({
                  title: "Corporate Tax Filings — This Month",
                  color: "purple",
                  items: corporateTaxFilings,
                  serviceType: "corporate_tax",
                  categoryLabel: "Corporate Tax Filing",
                  columns: ["Company Name", "Financial Year", "Due Date", "Status"]
                });
              }}
              className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer block mt-1">View details →</span>
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
            <span
              onClick={() => {
                const allItems = [
                  ...vatFilings.map(i => ({ ...i, _typeLabel: "VAT", _svcType: "vat", _catLabel: "VAT Filing" })),
                  ...corporateTaxFilings.map(i => ({ ...i, _typeLabel: "Corp Tax", _svcType: "corporate_tax", _catLabel: "Corporate Tax Filing" })),
                  ...tradeLicenses.map(i => ({ ...i, _typeLabel: "Trade Lic", _svcType: "trade_license", _catLabel: "Trade License Renewal", dueDate: i.expiryDate })),
                  ...visaExtensions.map(i => ({ ...i, _typeLabel: "Visa", _svcType: "visa_extension", _catLabel: "Visa Extension", dueDate: i.expiryDate })),
                ].filter(i => {
                  const d = new Date(i.dueDate); const now = new Date();
                  return d >= now && d <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                setKpiPanel({ title: "Upcoming Deadlines (Next 30 Days)", color: "amber", items: allItems, serviceType: "mixed", categoryLabel: "Upcoming Deadline", columns: ["Company Name", "Type", "Due Date", "Status"] });
              }}
              className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer block mt-1">View details →</span>
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
            <span
              onClick={() => {
                const allItems = [
                  ...vatFilings.map(i => ({ ...i, _typeLabel: "VAT", _svcType: "vat", _catLabel: "VAT Filing" })),
                  ...corporateTaxFilings.map(i => ({ ...i, _typeLabel: "Corp Tax", _svcType: "corporate_tax", _catLabel: "Corporate Tax Filing" })),
                  ...tradeLicenses.map(i => ({ ...i, _typeLabel: "Trade Lic", _svcType: "trade_license", _catLabel: "Trade License Renewal", dueDate: i.expiryDate })),
                  ...visaExtensions.map(i => ({ ...i, _typeLabel: "Visa", _svcType: "visa_extension", _catLabel: "Visa Extension", dueDate: i.expiryDate })),
                ].filter(i => (i.workStatus || i.status || "Pending").toLowerCase() === "pending");
                setKpiPanel({ title: "Tasks Pending", color: "indigo", items: allItems, serviceType: "mixed", categoryLabel: "Pending Task", columns: ["Company Name", "Type", "Due Date", "Status"] });
              }}
              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer block mt-1">View details →</span>
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
                <option value={thisMonthLabel}>{thisMonthLabel}</option>
                <option value={nextMonthLabel}>{nextMonthLabel}</option>
                <option value={lastMonthLabel}>{lastMonthLabel}</option>
              </select>

              {openSections.vatCurrent ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.vatCurrent && (
            <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
              {/* Toolbar */}
              <SectionToolbar
                sectionKey="vatCurrent"
                items={vatFilings}
                sectionState={sectionState}
                updateSection={updateSection}
                toggleSelectAll={toggleSelectAll}
                applyFilters={applyFilters}
                getPaged={getPaged}
                batchLoading={batchLoading}
                reminderLogs={reminderLogs}
                todayStr={todayStr}
                serviceType="vat"
                handleBatchReminder={handleBatchReminder}
                PAGE_SIZE={PAGE_SIZE}
              />
              {/* Table */}
              <SectionTable
                sectionKey="vatCurrent"
                items={vatFilings}
                columns={["CLIENT / COMPANY NAME", "TRN NUMBER", "FILING DUE DATE", "WORK STATUS", "REMINDER ACTION"]}
                renderCols={(item, isRecordedToday) => [
                  <td key="name" className="py-3.5 font-black text-slate-900 hover:text-indigo-600 cursor-pointer"
                    onClick={() => setSelectedFiling({ item, serviceType: "vat", categoryLabel: "Current VAT Filing" })}>
                    <span className="flex items-center gap-1.5">{item.clientName}<Eye size={12} className="text-slate-400" /></span>
                  </td>,
                  <td key="trn" className="py-3.5 font-mono text-slate-500 text-[11px]">{item.trnNumber || "-"}</td>,
                  <td key="due" className="py-3.5 font-mono text-emerald-600 font-bold">{item.dueDate || "-"}</td>,
                  <td key="status" className="py-3.5">{renderStatusSelect(item, "vat")}</td>,
                  <td key="action" className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedFiling({ item, serviceType: "vat", categoryLabel: "Current VAT Filing" })} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 transition-colors"><Eye size={13} /></button>
                      <button onClick={() => handleRecordReminder(item._id, "vat")} disabled={isRecordedToday || reminderLoading[item._id]}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${isRecordedToday ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"}`}>
                        {isRecordedToday ? <Check size={12} /> : <Send size={12} />}
                        {isRecordedToday ? "Sent" : "Send"}
                      </button>
                    </div>
                  </td>
                ]}
                sectionState={sectionState}
                updateSection={updateSection}
                toggleRowSelect={toggleRowSelect}
                applyFilters={applyFilters}
                getPaged={getPaged}
                reminderLogs={reminderLogs}
                todayStr={todayStr}
                PAGE_SIZE={PAGE_SIZE}
                emptyMsg="No VAT filings due for this period."
              />
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
                <option value={thisMonthLabel}>{thisMonthLabel}</option>
                <option value={nextMonthLabel}>{nextMonthLabel}</option>
                <option value={lastMonthLabel}>{lastMonthLabel}</option>
              </select>

              {openSections.corporateTax ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.corporateTax && (
            <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
              <SectionToolbar sectionKey="corporateTax" items={corporateTaxFilings} sectionState={sectionState} updateSection={updateSection} toggleSelectAll={toggleSelectAll} applyFilters={applyFilters} getPaged={getPaged} batchLoading={batchLoading} reminderLogs={reminderLogs} todayStr={todayStr} serviceType="corporate_tax" handleBatchReminder={handleBatchReminder} PAGE_SIZE={PAGE_SIZE} />
              <SectionTable
                sectionKey="corporateTax" items={corporateTaxFilings}
                columns={["CLIENT / COMPANY NAME", "FINANCIAL YEAR", "FILING DEADLINE", "WORK STATUS", "CONSULTANT", "ACTION"]}
                renderCols={(item, isRecordedToday) => [
                  <td key="name" className="py-3.5 font-black text-slate-900 hover:text-purple-600 cursor-pointer" onClick={() => setSelectedFiling({ item, serviceType: "corporate_tax", categoryLabel: "Corporate Tax Filing" })}>
                    <span className="flex items-center gap-1.5">{item.clientName}<Eye size={12} className="text-slate-400" /></span>
                  </td>,
                  <td key="fy" className="py-3.5 text-slate-500 text-[11px]">{item.financialYear || "2025 - 2026"}</td>,
                  <td key="due" className="py-3.5 font-mono text-purple-600 font-bold">{item.dueDate || "-"}</td>,
                  <td key="status" className="py-3.5">{renderStatusSelect(item, "corporate_tax")}</td>,
                  <td key="consultant" className="py-3.5 text-slate-600 text-[11px]">{item.consultantName || user?.name || "-"}</td>,
                  <td key="action" className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedFiling({ item, serviceType: "corporate_tax", categoryLabel: "Corporate Tax Filing" })} className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 bg-slate-100 hover:bg-purple-50 border border-slate-200 transition-colors"><Eye size={13} /></button>
                      <button onClick={() => handleRecordReminder(item._id, "corporate_tax")} disabled={isRecordedToday || reminderLoading[item._id]}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${isRecordedToday ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20"}`}>
                        {isRecordedToday ? <Check size={12} /> : <Send size={12} />}
                        {isRecordedToday ? "Sent" : "Send"}
                      </button>
                    </div>
                  </td>
                ]}
                sectionState={sectionState} updateSection={updateSection} toggleRowSelect={toggleRowSelect} applyFilters={applyFilters} getPaged={getPaged} reminderLogs={reminderLogs} todayStr={todayStr} PAGE_SIZE={PAGE_SIZE} emptyMsg="No Corporate Tax filings due for this period."
              />
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
                <option value={thisMonthLabel}>{thisMonthLabel}</option>
                <option value={nextMonthLabel}>{nextMonthLabel}</option>
                <option value={lastMonthLabel}>{lastMonthLabel}</option>
              </select>

              <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200" title="Filter">
                <Filter size={16} />
              </button>

              {openSections.vatTotal ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.vatTotal && (
            <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
              <SectionToolbar sectionKey="vatTotal" items={rawVatFilings} sectionState={sectionState} updateSection={updateSection} toggleSelectAll={toggleSelectAll} applyFilters={applyFilters} getPaged={getPaged} batchLoading={batchLoading} reminderLogs={reminderLogs} todayStr={todayStr} serviceType="vat" handleBatchReminder={handleBatchReminder} PAGE_SIZE={PAGE_SIZE} />
              <SectionTable
                sectionKey="vatTotal" items={rawVatFilings}
                columns={["CLIENT / COMPANY NAME", "TRN NUMBER", "FILING DUE DATE", "WORK STATUS", "ACTION"]}
                renderCols={(item, isRecordedToday) => [
                  <td key="name" className="py-3.5 font-black text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => setSelectedFiling({ item, serviceType: "vat", categoryLabel: "VAT Filing" })}>
                    <span className="flex items-center gap-1.5">{item.clientName}<Eye size={12} className="text-slate-400" /></span>
                  </td>,
                  <td key="trn" className="py-3.5 font-mono text-slate-500 text-[11px]">{item.trnNumber || "-"}</td>,
                  <td key="due" className="py-3.5 font-mono text-blue-600 font-bold">{item.dueDate || "-"}</td>,
                  <td key="status" className="py-3.5">{renderStatusSelect(item, "vat")}</td>,
                  <td key="action" className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedFiling({ item, serviceType: "vat", categoryLabel: "VAT Filing" })} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition-colors"><Eye size={13} /></button>
                      <button onClick={() => handleRecordReminder(item._id, "vat")} disabled={isRecordedToday || reminderLoading[item._id]}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${isRecordedToday ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"}`}>
                        {isRecordedToday ? <Check size={12} /> : <Send size={12} />}
                        {isRecordedToday ? "Sent" : "Send"}
                      </button>
                    </div>
                  </td>
                ]}
                sectionState={sectionState} updateSection={updateSection} toggleRowSelect={toggleRowSelect} applyFilters={applyFilters} getPaged={getPaged} reminderLogs={reminderLogs} todayStr={todayStr} PAGE_SIZE={PAGE_SIZE} emptyMsg="No VAT filings found."
              />
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
                <option value={thisMonthLabel}>{thisMonthLabel}</option>
                <option value={nextMonthLabel}>{nextMonthLabel}</option>
                <option value={lastMonthLabel}>{lastMonthLabel}</option>
              </select>

              {openSections.tradeLicense ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.tradeLicense && (
            <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
              <SectionToolbar sectionKey="tradeLicense" items={tradeLicenses} sectionState={sectionState} updateSection={updateSection} toggleSelectAll={toggleSelectAll} applyFilters={applyFilters} getPaged={getPaged} batchLoading={batchLoading} reminderLogs={reminderLogs} todayStr={todayStr} serviceType="trade_license" handleBatchReminder={handleBatchReminder} PAGE_SIZE={PAGE_SIZE} />
              <SectionTable
                sectionKey="tradeLicense" items={tradeLicenses}
                columns={["CLIENT / COMPANY NAME", "TRADE LICENSE NO.", "EXPIRY DATE", "WORK STATUS", "ACTION"]}
                renderCols={(item, isRecordedToday) => [
                  <td key="name" className="py-3.5 font-black text-slate-900 hover:text-amber-600 cursor-pointer" onClick={() => setSelectedFiling({ item, serviceType: "trade_license", categoryLabel: "Trade License Renewal" })}>
                    <span className="flex items-center gap-1.5">{item.clientName}<Eye size={12} className="text-slate-400" /></span>
                  </td>,
                  <td key="lic" className="py-3.5 font-mono text-slate-500 text-[11px]">{item.licenseNumber || "-"}</td>,
                  <td key="exp" className="py-3.5 font-mono text-amber-600 font-bold">{item.expiryDate || "-"}</td>,
                  <td key="status" className="py-3.5">{renderStatusSelect(item, "trade_license")}</td>,
                  <td key="action" className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedFiling({ item, serviceType: "trade_license", categoryLabel: "Trade License Renewal" })} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 border border-slate-200 transition-colors"><Eye size={13} /></button>
                      <button onClick={() => handleRecordReminder(item._id, "trade_license")} disabled={isRecordedToday || reminderLoading[item._id]}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${isRecordedToday ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"}`}>
                        {isRecordedToday ? <Check size={12} /> : <Send size={12} />}
                        {isRecordedToday ? "Sent" : "Send"}
                      </button>
                    </div>
                  </td>
                ]}
                sectionState={sectionState} updateSection={updateSection} toggleRowSelect={toggleRowSelect} applyFilters={applyFilters} getPaged={getPaged} reminderLogs={reminderLogs} todayStr={todayStr} PAGE_SIZE={PAGE_SIZE} emptyMsg="No Trade License renewals due for this period."
              />
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
                <option value={thisMonthLabel}>{thisMonthLabel}</option>
                <option value={nextMonthLabel}>{nextMonthLabel}</option>
                <option value={lastMonthLabel}>{lastMonthLabel}</option>
              </select>

              {openSections.visaExtensions ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </div>
          </div>

          {openSections.visaExtensions && (
            <div className="border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
              <SectionToolbar sectionKey="visaExtensions" items={visaExtensions} sectionState={sectionState} updateSection={updateSection} toggleSelectAll={toggleSelectAll} applyFilters={applyFilters} getPaged={getPaged} batchLoading={batchLoading} reminderLogs={reminderLogs} todayStr={todayStr} serviceType="visa_extension" handleBatchReminder={handleBatchReminder} PAGE_SIZE={PAGE_SIZE} />
              <SectionTable
                sectionKey="visaExtensions" items={visaExtensions}
                columns={["CLIENT / COMPANY NAME", "VISA NUMBER", "EXPIRY DATE", "WORK STATUS", "ACTION"]}
                renderCols={(item, isRecordedToday) => [
                  <td key="name" className="py-3.5 font-black text-slate-900 hover:text-cyan-600 cursor-pointer" onClick={() => setSelectedFiling({ item, serviceType: "visa_extension", categoryLabel: "Visa Extension" })}>
                    <span className="flex items-center gap-1.5">{item.clientName}<Eye size={12} className="text-slate-400" /></span>
                  </td>,
                  <td key="visa" className="py-3.5 font-mono text-slate-500 text-[11px]">{item.visaNumber || "-"}</td>,
                  <td key="exp" className="py-3.5 font-mono text-cyan-600 font-bold">{item.expiryDate || "-"}</td>,
                  <td key="status" className="py-3.5">{renderStatusSelect(item, "visa_extension")}</td>,
                  <td key="action" className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedFiling({ item, serviceType: "visa_extension", categoryLabel: "Visa Extension" })} className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 bg-slate-100 hover:bg-cyan-50 border border-slate-200 transition-colors"><Eye size={13} /></button>
                      <button onClick={() => handleRecordReminder(item._id, "visa_extension")} disabled={isRecordedToday || reminderLoading[item._id]}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${isRecordedToday ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-600/20"}`}>
                        {isRecordedToday ? <Check size={12} /> : <Send size={12} />}
                        {isRecordedToday ? "Sent" : "Send"}
                      </button>
                    </div>
                  </td>
                ]}
                sectionState={sectionState} updateSection={updateSection} toggleRowSelect={toggleRowSelect} applyFilters={applyFilters} getPaged={getPaged} reminderLogs={reminderLogs} todayStr={todayStr} PAGE_SIZE={PAGE_SIZE} emptyMsg="No Visa extensions due for this period."
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-xs font-bold text-sky-700 flex items-center gap-2">
        <Info size={16} className="text-sky-600 flex-shrink-0" />
        <span>Note: Click on any client name or detail button above to view full details and update work status live.</span>
      </div>

      {/* Full Details & Work Status Modal */}
      {selectedFiling && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  {selectedFiling.categoryLabel || "Compliance Details"}
                </span>
                <h3 className="text-xl font-black mt-0.5">{selectedFiling.item.clientName || "Client Details"}</h3>
              </div>
              <button
                onClick={() => setSelectedFiling(null)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs font-bold text-slate-700">
              {/* Live Work Status Changer */}
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">
                    Current Work Status
                  </label>
                  <span className="text-xs text-indigo-700 font-medium">Update compliance status live:</span>
                </div>
                <select
                  disabled={statusUpdating}
                  value={selectedFiling.item.workStatus || selectedFiling.item.status || "Pending"}
                  onChange={(e) => handleUpdateStatus(selectedFiling.item._id, selectedFiling.serviceType, e.target.value)}
                  className="px-4 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-black text-indigo-900 outline-none cursor-pointer hover:border-indigo-400 transition-colors shadow-sm"
                >
                  <option value="Pending">🟡 Pending</option>
                  <option value="In Progress">🔵 In Progress</option>
                  <option value="Submitted to FTA">🟣 Submitted to FTA</option>
                  <option value="Filed">🟢 Filed / Completed</option>
                  <option value="Completed">✅ Completed</option>
                </select>
              </div>

              {/* Rich Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Company / Client Name</span>
                  <span className="text-xs font-black text-slate-900">{selectedFiling.item.clientName || "-"}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Contact Person</span>
                  <span className="text-xs font-bold text-slate-800">{selectedFiling.item.contactPerson || "-"} <span className="text-[10px] text-slate-400 font-normal">({selectedFiling.item.contactDesignation || "Contact"})</span></span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Email Address</span>
                  <span className="text-xs font-mono font-bold text-indigo-600 truncate block">{selectedFiling.item.email || "-"}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Phone / Mobile</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{selectedFiling.item.phone || "-"}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">TRN / License Number</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{selectedFiling.item.trnNumber !== "-" ? `TRN: ${selectedFiling.item.trnNumber}` : selectedFiling.item.licenseNumber !== "-" ? `License: ${selectedFiling.item.licenseNumber}` : selectedFiling.item.visaNumber || "-"}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Filing / Expiry Due Date</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">{selectedFiling.item.dueDate || selectedFiling.item.expiryDate || "-"}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Assigned Consultant</span>
                  <span className="text-xs font-bold text-purple-700">{selectedFiling.item.consultantName || "Anam Mushtaq"}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] uppercase text-slate-400 block font-black mb-1">Location / Emirate</span>
                  <span className="text-xs font-bold text-slate-800">{selectedFiling.item.emirate || "Dubai, UAE"}</span>
                </div>
              </div>

              {/* Special Compliance Notes / Remarks */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-black block">Special Compliance Remarks & Notes</span>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  {selectedFiling.item.notes || "FTA compliance deadline active. Please review invoices and complete tax return filing."}
                </p>
              </div>

              {/* Record Follow-up Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Daily Follow-up Action:</span>
                <button
                  onClick={() => handleRecordReminder(selectedFiling.item._id, selectedFiling.serviceType)}
                  disabled={reminderLogs[`${selectedFiling.item._id}_${todayStr}`] || reminderLoading[selectedFiling.item._id]}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                    reminderLogs[`${selectedFiling.item._id}_${todayStr}`]
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  }`}
                >
                  {reminderLogs[`${selectedFiling.item._id}_${todayStr}`] ? <Check size={16} /> : <Send size={16} />}
                  {reminderLogs[`${selectedFiling.item._id}_${todayStr}`] ? "Reminder Sent Today" : "Record Follow-up Reminder"}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedFiling(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Details Panel */}
      {kpiPanel && (
        <KpiDetailsPanel
          kpiPanel={kpiPanel}
          onClose={() => setKpiPanel(null)}
          onViewFiling={(item) => {
            setKpiPanel(null);
            setSelectedFiling({ item, serviceType: item._svcType || kpiPanel.serviceType, categoryLabel: item._catLabel || kpiPanel.categoryLabel });
          }}
          reminderLogs={reminderLogs}
          reminderLoading={reminderLoading}
          handleRecordReminder={handleRecordReminder}
          todayStr={todayStr}
          renderStatusSelect={renderStatusSelect}
        />
      )}

      {/* ── All Clients Sliding Panel ──────────────────────────────── */}
      {allClientsOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setAllClientsOpen(false); setEditClient(null); }} />
          <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Customer Master</span>
                <h2 className="text-xl font-black mt-0.5">All Clients ({allClients.length})</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchAllClients} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                  <RefreshCw size={16} className={allClientsLoading ? "animate-spin" : ""} />
                </button>
                <button onClick={() => { setAllClientsOpen(false); setEditClient(null); }} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <Search size={14} className="text-slate-400" />
                <input type="text" placeholder="Search by name, email, TRN, phone..." value={allClientsSearch}
                  onChange={e => { setAllClientsSearch(e.target.value); setAllClientsPage(1); }}
                  className="text-xs font-bold text-slate-700 outline-none bg-transparent w-full placeholder:text-slate-300 placeholder:font-normal" />
                {allClientsSearch && <button onClick={() => setAllClientsSearch("")}><X size={12} className="text-slate-400" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {allClientsLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400">Loading clients...</p>
                </div>
              ) : (() => {
                const q = allClientsSearch.toLowerCase();
                const filtered = allClients.filter(c =>
                  !q || (c.companyName || c.name || "").toLowerCase().includes(q) ||
                  (c.email || "").toLowerCase().includes(q) || (c.trn || "").toLowerCase().includes(q) ||
                  (c.phone || c.mobile || "").toLowerCase().includes(q)
                );
                const totalP = Math.max(1, Math.ceil(filtered.length / ALL_CLIENTS_PAGE_SIZE));
                const paged = filtered.slice((allClientsPage - 1) * ALL_CLIENTS_PAGE_SIZE, allClientsPage * ALL_CLIENTS_PAGE_SIZE);
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                      {paged.length === 0 ? (
                        <p className="col-span-2 text-center text-xs text-slate-400 py-8">No clients found.</p>
                      ) : paged.map(c => {
                        const ws = c.workStatus || "Pending";
                        const wsColor = ws === "Completed" || ws === "Filed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ws === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200"
                          : ws === "Submitted to FTA" ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-amber-50 text-amber-700 border-amber-200";
                        return (
                          <div key={c._id} onClick={() => openEditClient(c)}
                            className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-2">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                                {(c.companyName || c.name || "?")[0].toUpperCase()}
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${wsColor}`}>{ws}</span>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mt-1">{c.companyName || c.name || "—"}</h4>
                            <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{c.email || "—"}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-400">
                              {c.trn && <span>TRN: {c.trn}</span>}
                              {(c.phone || c.mobile) && <span>{c.phone || c.mobile}</span>}
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{c.emirate || c.city || "UAE"}</span>
                              <span className="text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"><Eye size={11} /> View & Edit</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalP > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400">Page {allClientsPage} of {totalP} · {filtered.length} clients</span>
                        <div className="flex gap-1.5">
                          <button disabled={allClientsPage <= 1} onClick={() => setAllClientsPage(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default">← Prev</button>
                          <button disabled={allClientsPage >= totalP} onClick={() => setAllClientsPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default">Next →</button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Client Modal ────────────────────────────────────────── */}
      {editClient && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Client Profile</span>
                <h3 className="text-lg font-black mt-0.5">{editClient.companyName || editClient.name}</h3>
              </div>
              <button onClick={() => setEditClient(null)} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">Current Work Status</label>
                  <span className="text-xs text-indigo-700 font-medium">Update compliance work status:</span>
                </div>
                <select value={editForm.workStatus || "Pending"} onChange={e => setEditForm(f => ({ ...f, workStatus: e.target.value }))}
                  className="px-4 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-black text-indigo-900 outline-none cursor-pointer hover:border-indigo-400 transition-colors shadow-sm">
                  <option value="Pending">🟡 Pending</option>
                  <option value="In Progress">🔵 In Progress</option>
                  <option value="Submitted to FTA">🟣 Submitted to FTA</option>
                  <option value="Filed">🟢 Filed / Completed</option>
                  <option value="Completed">✅ Completed</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Company / Client Name", key: "companyName", type: "text" },
                  { label: "Contact Person", key: "contactPersonName", type: "text" },
                  { label: "Designation", key: "contactPersonDesignation", type: "text" },
                  { label: "Email Address", key: "email", type: "email" },
                  { label: "Phone / Mobile", key: "phone", type: "text" },
                  { label: "TRN Number", key: "trn", type: "text" },
                  { label: "Trade License Number", key: "tradeLicenseNumber", type: "text" },
                  { label: "Trade License Expiry", key: "tradeLicenseExpiryDate", type: "date" },
                  { label: "VAT Filing Due Date", key: "vatFilingDueDate", type: "date" },
                  { label: "Corporate Tax Due Date", key: "corporateTaxDueDate", type: "date" },
                  { label: "VAT Filing Period", key: "vatFilingPeriod", type: "text", placeholder: "e.g. Q1 2026" },
                  { label: "Emirate / City", key: "emirate", type: "text" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-slate-400 block">{label}</label>
                    <input type={type} value={editForm[key] || ""} placeholder={placeholder || ""}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition-all" />
                  </div>
                ))}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-black text-slate-400 block">Notes / Remarks</label>
                  <textarea rows={3} value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
                    placeholder="Add compliance notes or remarks..." />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              <button onClick={() => setEditClient(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={editLoading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-60">
                {editLoading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {editLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SectionToolbar ────────────────────────────────────────────────────────────
function SectionToolbar({
  sectionKey, items, sectionState, updateSection, toggleSelectAll,
  applyFilters, getPaged, batchLoading, reminderLogs, todayStr,
  serviceType, handleBatchReminder, PAGE_SIZE
}) {
  const ss = sectionState[sectionKey];
  const filtered = applyFilters(items, sectionKey);
  const paged = getPaged(filtered, sectionKey);
  const pagedIds = paged.map(i => String(i._id));
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => ss.selected.includes(id));
  const selectedCount = ss.selected.length;
  const pendingCount = ss.selected.filter(id => !reminderLogs[`${id}_${todayStr}`]).length;

  return (
    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2">
        <Search size={13} className="text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search client, TRN, email..."
          value={ss.search}
          onChange={e => updateSection(sectionKey, { search: e.target.value, page: 1 })}
          className="text-xs font-bold text-slate-700 outline-none bg-transparent w-full placeholder:text-slate-300 placeholder:font-normal"
        />
        {ss.search && (
          <button onClick={() => updateSection(sectionKey, { search: "", page: 1 })} className="text-slate-400 hover:text-slate-600">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
        <Filter size={12} className="text-slate-400" />
        <select
          value={ss.statusFilter}
          onChange={e => updateSection(sectionKey, { statusFilter: e.target.value, page: 1 })}
          className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="pending">🟡 Pending</option>
          <option value="in progress">🔵 In Progress</option>
          <option value="submitted to fta">🟣 Submitted to FTA</option>
          <option value="filed">🟢 Filed</option>
          <option value="completed">✅ Completed</option>
        </select>
      </div>

      {/* Select All on current page */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allPageSelected}
          onChange={() => toggleSelectAll(sectionKey, pagedIds)}
          className="w-3.5 h-3.5 rounded accent-indigo-600"
        />
        <span className="text-[11px] font-bold text-slate-600">Select All ({pagedIds.length})</span>
      </label>

      {/* Batch Send Reminders */}
      {selectedCount > 0 && (
        <button
          onClick={() => handleBatchReminder(sectionKey, items, serviceType)}
          disabled={pendingCount === 0 || batchLoading[sectionKey]}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
            pendingCount === 0
              ? "bg-slate-100 text-slate-400 cursor-default"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
          }`}
        >
          <Send size={12} />
          {batchLoading[sectionKey]
            ? "Sending..."
            : `Send Reminders (${pendingCount})`}
        </button>
      )}

      {/* Count info */}
      <span className="text-[10px] font-bold text-slate-400 ml-auto">
        {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        {selectedCount > 0 && <span className="ml-1.5 text-indigo-600">· {selectedCount} selected</span>}
      </span>
    </div>
  );
}

// ─── SectionTable ──────────────────────────────────────────────────────────────
function SectionTable({
  sectionKey, items, columns, renderCols,
  sectionState, updateSection, toggleRowSelect, applyFilters, getPaged,
  reminderLogs, todayStr, PAGE_SIZE, emptyMsg
}) {
  const ss = sectionState[sectionKey];
  const filtered = applyFilters(items, sectionKey);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = getPaged(filtered, sectionKey);

  return (
    <div className="p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-bold">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
              <th className="pb-3 pr-3 w-8">
                {/* blank — checkbox col header */}
              </th>
              {columns.map(col => (
                <th key={col} className="pb-3 pr-4">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-slate-400 text-xs">{emptyMsg}</td>
              </tr>
            ) : (
              paged.map(item => {
                const id = String(item._id);
                const isSelected = ss.selected.includes(id);
                const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                return (
                  <tr key={id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-indigo-50/40" : ""}`}>
                    <td className="py-3.5 pr-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelect(sectionKey, id)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded accent-indigo-600"
                      />
                    </td>
                    {renderCols(item, isRecordedToday)}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400">
            Page {ss.page} of {totalPages} · {filtered.length} total
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={ss.page <= 1}
              onClick={() => updateSection(sectionKey, { page: ss.page - 1 })}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = Math.max(1, Math.min(ss.page - 2, totalPages - 4)) + i;
              return p <= totalPages ? (
                <button
                  key={p}
                  onClick={() => updateSection(sectionKey, { page: p })}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-colors ${
                    p === ss.page
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ) : null;
            })}
            <button
              disabled={ss.page >= totalPages}
              onClick={() => updateSection(sectionKey, { page: ss.page + 1 })}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KpiDetailsPanel ─────────────────────────────────────────────────────────
function KpiDetailsPanel({ kpiPanel, onClose, onViewFiling, reminderLogs, reminderLoading, handleRecordReminder, todayStr, renderStatusSelect }) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const PAGE = 15;

  const colorMap = {
    emerald: { bg: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700", accent: "text-emerald-400" },
    purple:  { bg: "bg-purple-600",  badge: "bg-purple-50 text-purple-700 border-purple-200",   btn: "bg-purple-600 hover:bg-purpleald-700",  accent: "text-purple-400" },
    amber:   { bg: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200",       btn: "bg-amber-500 hover:bg-amber-600",       accent: "text-amber-400" },
    indigo:  { bg: "bg-indigo-600",  badge: "bg-indigo-50 text-indigo-700 border-indigo-200",    btn: "bg-indigo-600 hover:bg-indigo-700",     accent: "text-indigo-400" },
  };
  const c = colorMap[kpiPanel.color] || colorMap.indigo;

  const q = search.toLowerCase();
  const filtered = kpiPanel.items.filter(item =>
    !q ||
    (item.clientName || "").toLowerCase().includes(q) ||
    (item.trnNumber || "").toLowerCase().includes(q) ||
    (item.email || "").toLowerCase().includes(q) ||
    (item._typeLabel || "").toLowerCase().includes(q) ||
    (item.licenseNumber || "").toLowerCase().includes(q)
  );
  const totalP = Math.max(1, Math.ceil(filtered.length / PAGE));
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE);

  const getStatusColor = (ws) => {
    const s = (ws || "Pending").toLowerCase();
    if (s === "completed" || s === "filed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "in progress") return "bg-blue-50 text-blue-700 border-blue-200";
    if (s === "submitted to fta") return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className={`p-6 ${c.bg} text-white flex items-center justify-between flex-shrink-0`}>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${c.accent}`}>Quick View</span>
            <h2 className="text-xl font-black mt-0.5">{kpiPanel.title}</h2>
            <p className="text-xs text-white/60 mt-0.5">{filtered.length} records · click any row to view full details & update status</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <Search size={14} className="text-slate-400" />
            <input type="text" placeholder="Search client name, TRN, type..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="text-xs font-bold text-slate-700 outline-none bg-transparent w-full placeholder:text-slate-300 placeholder:font-normal" />
            {search && <button onClick={() => setSearch("")}><X size={12} className="text-slate-400" /></button>}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {paged.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-bold text-slate-400">No records found.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-bold">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-3">Company / Client</th>
                  {kpiPanel.serviceType === "mixed" && <th className="px-4 py-3">Type</th>}
                  <th className="px-4 py-3">TRN / License</th>
                  <th className="px-4 py-3">Due / Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map(item => {
                  const ws = item.workStatus || item.status || "Pending";
                  const isRecordedToday = reminderLogs[`${item._id}_${todayStr}`];
                  const dueDate = item.dueDate || item.expiryDate || "—";
                  const svcType = item._svcType || kpiPanel.serviceType;
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => onViewFiling(item)}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg ${c.bg} text-white flex items-center justify-center font-black text-[10px] flex-shrink-0`}>
                            {(item.clientName || "?")[0].toUpperCase()}
                          </div>
                          <span className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {item.clientName || "—"}
                          </span>
                        </div>
                      </td>
                      {kpiPanel.serviceType === "mixed" && (
                        <td className="px-4 py-3.5">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            item._typeLabel === "VAT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            item._typeLabel === "Corp Tax" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            item._typeLabel === "Trade Lic" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-cyan-50 text-cyan-700 border-cyan-200"
                          }`}>{item._typeLabel}</span>
                        </td>
                      )}
                      <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                        {item.trnNumber || item.licenseNumber || item.visaNumber || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-700">{dueDate}</td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {renderStatusSelect(item, svcType)}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleRecordReminder(item._id, svcType)}
                          disabled={isRecordedToday || reminderLoading[item._id]}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${
                            isRecordedToday
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                              : `${c.btn} text-white shadow-sm`
                          }`}
                        >
                          {isRecordedToday ? <Check size={11} /> : <Send size={11} />}
                          {isRecordedToday ? "Sent" : "Send"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalP > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-400">Page {page} of {totalP} · {filtered.length} records</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default">← Prev</button>
              <button disabled={page >= totalP} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-default">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
