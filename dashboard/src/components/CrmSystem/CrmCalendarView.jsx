import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon, Video, Phone, CheckSquare, Clock, MapPin, Plus, X,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Edit2, Trash2, Calendar, Download, Printer
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import { renderPlatformIcon } from "./platformIconHelper.jsx";

const isValidRealRecord = (rec) => {
  if (!rec) return false;
  if (rec.isAnonymous) return false;
  const email = String(rec.email || "").trim().toLowerCase();
  if (email.endsWith("@visitor.local") || email.startsWith("anon-visitor")) return false;
  const rawName = String(
    rec.displayName ||
      rec.name ||
      [rec.firstName, rec.lastName].filter(Boolean).join(" ") ||
      rec.companyName ||
      ""
  )
    .trim()
    .toLowerCase();
  if (
    !rawName ||
    rawName === "anonymous" ||
    rawName === "anonymous visitor" ||
    rawName === "anonymous user" ||
    rawName === "visitor" ||
    rawName === "guest" ||
    rawName === "guest user" ||
    rawName.startsWith("anon-")
  ) {
    return false;
  }
  return true;
};

const VIEW_MODES = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" }
];

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// ─── Reusable Searchable Combobox ─────────────────────────────────────────────
function SearchableSelect({ value, onChange, options, placeholder = "Search...", labelKey = "label", valueKey = "value", emptyText = "No results found" }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  // Compute display label for the current value
  const selectedOption = options.find(o => String(o[valueKey]) === String(value));
  const displayLabel = selectedOption ? (typeof selectedOption[labelKey] === 'string' ? selectedOption[labelKey] : String(selectedOption[labelKey])) : "";

  const filtered = options.filter(o =>
    !query || String(o[labelKey]).toLowerCase().includes(query.toLowerCase())
  );

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-1.5 cursor-text gap-2 transition-all relative ${
          open
            ? "border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-900/40"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
        onClick={() => setOpen(true)}
      >
        <input
          className="flex-1 bg-transparent outline-none text-xs font-semibold text-slate-700 dark:text-slate-100 placeholder:text-slate-400 min-w-0"
          placeholder={open ? "Type to search..." : (displayLabel ? "" : placeholder)}
          value={open ? query : ""}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {!open && displayLabel && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-100 truncate flex-1 pointer-events-none absolute left-3 right-10">
            {displayLabel}
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button type="button" onClick={handleClear} className="text-slate-300 hover:text-red-400 transition-colors">
              <X size={12} />
            </button>
          )}
          <ChevronLeft size={12} className="text-slate-400 transition-transform" style={{transform: open ? 'rotate(90deg)' : 'rotate(-90deg)'}} />
        </div>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            <button
              type="button"
              onMouseDown={() => handleSelect("")}
              className="w-full text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800"
            >
              — {placeholder}
            </button>
            {filtered.slice(0, 50).map(o => (
              <button
                key={o[valueKey]}
                type="button"
                onMouseDown={() => handleSelect(o[valueKey])}
                className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors ${
                  String(o[valueKey]) === String(value)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {o[labelKey]}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2.5 text-[10px] font-bold text-slate-400">{emptyText}</p>
            )}
            {filtered.length > 50 && (
              <p className="px-3 py-1.5 text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 border-t dark:border-slate-700">Showing first 50 — type to narrow down</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrmCalendarView({ websiteId }) {
  const toast = useToast();
  const { formatCurrency } = useCurrency();
  const [viewMode, setViewMode] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for scheduling
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [form, setForm] = useState({
    title: "",
    type: "meeting",
    meetingType: "",
    timezone: DEFAULT_TIMEZONE,
    dueDate: "", // start time
    endAt: "",
    description: "",
    priority: "medium",
    reminderOffsetMinutes: "15",
    customerId: "",
    companyId: "",
    contactId: "",
    dealId: "",
    participantsInput: ""
  });

  // Entities for lookup
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [platforms, setPlatforms] = useState([]);

  const fetchCalendarItems = async () => {
    setLoading(true);
    try {
      // Use a COPY of currentDate — NEVER mutate state directly
      const ref = new Date(currentDate);
      const yr = ref.getFullYear();
      const mo = ref.getMonth();
      const day = ref.getDate();

      let startDate, endDate;

      if (viewMode === "month") {
        // Fetch prev-month tail + next-month head so grid edges are covered
        startDate = new Date(yr, mo - 1, 20).toISOString();
        endDate   = new Date(yr, mo + 1, 10).toISOString();
      } else if (viewMode === "week") {
        // Calculate week start (Sunday) WITHOUT mutating ref
        const dayOfWeek = ref.getDay(); // 0=Sun … 6=Sat
        const weekStart = new Date(yr, mo, day - dayOfWeek, 0, 0, 0);
        const weekEnd   = new Date(yr, mo, day - dayOfWeek + 6, 23, 59, 59);
        startDate = weekStart.toISOString();
        endDate   = weekEnd.toISOString();
      } else if (viewMode === "day") {
        startDate = new Date(yr, mo, day, 0, 0, 0).toISOString();
        endDate   = new Date(yr, mo, day, 23, 59, 59).toISOString();
      } else {
        // Agenda: load 3 months window around current date
        startDate = new Date(yr, mo - 1, 1).toISOString();
        endDate   = new Date(yr, mo + 2, 0).toISOString();
      }

      // Fetch without strict websiteId so events saved before websiteId fix also appear
      const wsParam = websiteId ? `&websiteId=${websiteId}` : "";
      const [actRes, remRes] = await Promise.all([
        api(`/api/crm/activities?startDate=${startDate}&endDate=${endDate}${wsParam}&limit=200`).catch(() => ({})),
        api(`/api/crm/activities?type=reminder&startDate=${startDate}&endDate=${endDate}${wsParam}&limit=200`).catch(() => ({}))
      ]);
      setActivities(actRes.activities || []);
      setReminders(remRes.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    const wsQs = websiteId && websiteId !== "all" ? `websiteId=${encodeURIComponent(websiteId)}` : "";
    const qsPrefix = wsQs ? `?${wsQs}` : "";
    try {
      const [custRes, compRes, contRes] = await Promise.all([
        api(`/api/crm?${wsQs ? `${wsQs}&` : ""}limit=200`).catch(() => ({})),
        api(`/api/crm/companies${qsPrefix}`).catch(() => ({})),
        api(`/api/crm/contacts${qsPrefix}`).catch(() => ({}))
      ]);
      setCustomers((custRes.customers || []).filter(isValidRealRecord));
      setCompanies((compRes.companies || []).filter(isValidRealRecord));
      setContacts((contRes.contacts || []).filter(isValidRealRecord));

      // Deals: fetch customers with recordType=deal (the CRM's deal pipeline)
      const dealCustRes = await api(`/api/crm?${wsQs ? `${wsQs}&` : ""}recordType=deal&limit=200`).catch(() => ({}));
      const dealCustomers = (dealCustRes.customers || []).filter(isValidRealRecord);
      // Also try the dedicated deals endpoint
      const dealRes = await api(`/api/crm/deals?${wsQs ? `${wsQs}&` : ""}limit=200`).catch(() => ({}));
      const dedicatedDeals = dealRes.deals || [];
      // Merge both sources, prefer dedicated deals
      if (dedicatedDeals.length > 0) {
        setDeals(dedicatedDeals);
      } else {
        // Map deal-stage customers as deals (dealName = companyName or name + leadValue)
        setDeals(dealCustomers.map(c => ({
          _id: c._id,
          dealName: `${c.companyName || c.name}${c.leadValue ? ` — ${formatCurrency(Number(c.leadValue))}` : ''}`
        })));
      }
    } catch (err) {
      console.error("Lookups load failed:", err);
    }

    // Fetch meeting platforms
    try {
      const platRes = await api(`/api/crm/meeting-platforms${qsPrefix}`).catch(() => ({}));
      const loadedPlatforms = platRes.platforms || [];
      setPlatforms(loadedPlatforms);
      // Set default meetingType to first platform's key
      if (loadedPlatforms.length > 0) {
        setForm(prev => ({ ...prev, meetingType: prev.meetingType || loadedPlatforms[0].key }));
      }
    } catch (e) {
      console.warn("[Platforms] Load failed:", e.message);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
    fetchLookups();
  }, [currentDate, viewMode, websiteId]);

  useEffect(() => {
    if (showScheduleModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showScheduleModal]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      // Participants: plain email strings stored in participantEmails field
      const participantEmails = form.participantsInput
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const payload = {
        ...form,
        websiteId,
        dueDate: form.dueDate ? new Date(form.dueDate) : null,
        endAt: form.endAt ? new Date(form.endAt) : null,
        customerId: form.customerId || null,
        companyId: form.companyId || null,
        contactId: form.contactId || null,
        dealId: form.dealId || null,
        participants: [],          // always empty — we use participantEmails instead
        participantEmails
      };

      if (selectedActivity) {
        await api(`/api/crm/activities/${selectedActivity._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        toast.success("Meeting rescheduled/updated successfully");
      } else {
        await api(`/api/crm/activities`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("New meeting scheduled successfully");
      }

      setShowScheduleModal(false);
      setSelectedActivity(null);
      fetchCalendarItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateStatus = async (activityId, status) => {
    try {
      await api(`/api/crm/activities/${activityId}`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      toast.success(`Meeting status updated to: ${status}`);
      fetchCalendarItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to cancel and delete this calendar item?")) return;
    try {
      await api(`/api/crm/activities/${activityId}`, {
        method: "DELETE"
      });
      toast.success("Meeting cancelled and deleted successfully");
      fetchCalendarItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Render Calendar Month Grid helper (includes leading weekday offset)
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const leadingBlanks = Array.from({ length: firstDay.getDay() }, () => null);
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return [...leadingBlanks, ...days];
  };

  const allItems = Array.from(new Map([...activities, ...reminders].filter(Boolean).map(item => [item._id, item])).values());

  const openEditActivityModal = (item) => {
    setSelectedActivity(item);
    setForm({
      title: item.title || "",
      type: item.type || "meeting",
      meetingType: item.meetingType || platforms[0]?.key || "",
      timezone: item.timezone || DEFAULT_TIMEZONE,
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : "",
      endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
      description: item.description || "",
      priority: item.priority || "medium",
      reminderOffsetMinutes: String(item.reminderOffsetMinutes ?? "15"),
      customerId: item.customerId?._id || item.customerId || "",
      companyId: item.companyId?._id || item.companyId || "",
      contactId: item.contactId?._id || item.contactId || "",
      dealId: item.dealId?._id || item.dealId || "",
      participantsInput: Array.isArray(item.participantEmails) ? item.participantEmails.join(", ") : ""
    });
    setShowScheduleModal(true);
  };

  const handleExportCalendarCSV = () => {
    const data = allItems.map(item => ({
      "Title / Subject": item.title || item.subject || "-",
      "Activity Type": (item.type || item.activityType || "MEETING").toUpperCase(),
      "Date & Time": item.scheduledAt || item.date || item.dueDate ? new Date(item.scheduledAt || item.date || item.dueDate).toLocaleString() : "-",
      "Status": (item.status || "scheduled").toUpperCase(),
      "Platform": item.meetingType || "-",
      "Client": item.customerId?.companyName || item.customerId?.name || "-"
    }));
    exportToCSV(data, `Calendar_Meetings_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportCalendarPDF = () => {
    const data = allItems.map(item => ({
      "Title": item.title || item.subject || "-",
      "Type": (item.type || item.activityType || "MEETING").toUpperCase(),
      "Scheduled At": item.scheduledAt || item.date || item.dueDate ? new Date(item.scheduledAt || item.date || item.dueDate).toLocaleString() : "-",
      "Status": (item.status || "scheduled").toUpperCase()
    }));
    exportToPDF(data, `Calendar_Meetings_Report_${new Date().toISOString().slice(0, 10)}`, "CENTRALIZED CRM CALENDAR & SCHEDULED MEETINGS REPORT");
  };

  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-3">
      {/* Compact Calendar Header */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <CalendarIcon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">Centralized CRM Calendar</h3>
              <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                {allItems.length} Events
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 leading-tight truncate">Manage calls, meetings, tasks, and reminders</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleExportCalendarCSV}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-semibold rounded-lg transition-all"
            title="Export Calendar Meetings to Excel CSV"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={handleExportCalendarPDF}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-semibold rounded-lg transition-all"
            title="Export Calendar Meetings to PDF"
          >
            <Printer size={12} /> PDF
          </button>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[11px] font-semibold rounded-lg transition-all"
          >
            Today
          </button>

          {/* Navigation */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg gap-0.5 border border-slate-200/60">
            <button
              onClick={() => {
                const next = new Date(currentDate);
                if (viewMode === "month") next.setMonth(next.getMonth() - 1);
                else if (viewMode === "day") next.setDate(next.getDate() - 1);
                else next.setDate(next.getDate() - 7);
                setCurrentDate(next);
              }}
              className="p-1 hover:bg-white rounded-md transition-all text-slate-600"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] font-bold text-slate-800 px-2 whitespace-nowrap">
              {currentDate.toLocaleString("default", { month: "short", year: "numeric" })}
            </span>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                if (viewMode === "month") next.setMonth(next.getMonth() + 1);
                else if (viewMode === "day") next.setDate(next.getDate() + 1);
                else next.setDate(next.getDate() + 7);
                setCurrentDate(next);
              }}
              className="p-1 hover:bg-white rounded-md transition-all text-slate-600"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 border border-slate-200/60">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${viewMode === mode.id ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedActivity(null);
              setForm({
                title: "", type: "meeting", meetingType: platforms[0]?.key || "", timezone: DEFAULT_TIMEZONE,
                dueDate: "", endAt: "", description: "", priority: "medium",
                reminderOffsetMinutes: "15", customerId: "", companyId: "",
                contactId: "", dealId: "", participantsInput: ""
              });
              setShowScheduleModal(true);
            }}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-all"
          >
            <Plus size={13} /> Schedule Event
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        {loading ? (
          <p className="text-center py-16 text-slate-400 font-semibold text-xs">Loading calendar...</p>
        ) : viewMode === "month" ? (
          /* Month View Grid */
          <div className="grid grid-cols-7 gap-1.5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100">{day}</div>
            ))}
            {getDaysInMonth().map((day, idx) => {
              if (!day) {
                return <div key={`blank-${idx}`} className="min-h-[82px] rounded-xl bg-slate-50/40 border border-slate-100/60" />;
              }
              const dayStr = day.toDateString();
              const isToday = dayStr === todayStr;
              const dayItems = allItems.filter(item => new Date(item.dueDate).toDateString() === dayStr);

              return (
                <div
                  key={dayStr}
                  className={`min-h-[82px] border rounded-xl p-1.5 space-y-1 transition-colors ${
                    isToday
                      ? "border-indigo-300 bg-indigo-50/30"
                      : "border-slate-100 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold inline-flex items-center justify-center ${
                        isToday
                          ? "w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px]"
                          : "text-slate-500 px-0.5"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-semibold text-slate-400">{dayItems.length}</span>
                    )}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[54px] pr-0.5">
                    {dayItems.map(item => (
                      <div
                        key={item._id}
                        onClick={() => openEditActivityModal(item)}
                        title={item.title}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-all ${
                          item.type === "meeting"
                            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            : item.type === "call"
                              ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
                              : item.type === "reminder"
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "week" ? (
          /* ── Week View ── */
          (() => {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            const weekDays = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              return d;
            });
            return (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-8 min-w-[700px] gap-0 border border-slate-100 rounded-2xl overflow-hidden">
                  {/* Header row */}
                  <div className="bg-slate-50 border-b border-r border-slate-100 p-2" />
                  {weekDays.map(day => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div key={day.toDateString()} className={`border-b border-r border-slate-100 p-2 text-center ${isToday ? "bg-indigo-50" : "bg-slate-50"}`}>
                        <p className="text-[9px] font-black text-slate-400 uppercase">{day.toLocaleDateString("en", { weekday: "short" })}</p>
                        <p className={`text-sm font-black ${isToday ? "text-indigo-600" : "text-slate-700"}`}>{day.getDate()}</p>
                      </div>
                    );
                  })}
                  {/* Time slots */}
                  {Array.from({ length: 12 }, (_, hr) => hr + 7).map(hour => (
                    <React.Fragment key={hour}>
                      <div className="border-r border-b border-slate-100 p-2 text-[9px] font-black text-slate-400 bg-slate-50/50 text-right pr-3">
                        {hour % 12 || 12}{hour < 12 ? "am" : "pm"}
                      </div>
                      {weekDays.map(day => {
                        const cellItems = allItems.filter(item => {
                          const d = new Date(item.dueDate);
                          return d.toDateString() === day.toDateString() && d.getHours() === hour;
                        });
                        return (
                          <div key={day.toDateString()} className="border-r border-b border-slate-100 p-1 min-h-[48px] hover:bg-slate-50/40 transition-colors">
                            {cellItems.map(item => (
                              <div
                                key={item._id}
                                onClick={() => openEditActivityModal(item)}
                                className={`text-[8px] font-black px-1.5 py-1 rounded-lg mb-0.5 truncate cursor-pointer ${item.type === "meeting" ? "bg-indigo-100 text-indigo-700" : item.type === "call" ? "bg-sky-100 text-sky-700" : "bg-amber-50 text-amber-700"}`}
                              >
                                {item.title}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                {allItems.length === 0 && (
                  <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">No events this week.</p>
                )}
              </div>
            );
          })()
        ) : viewMode === "day" ? (
          /* ── Day View ── */
          (() => {
            const dayStr = currentDate.toDateString();
            const dayItems = allItems.filter(item => new Date(item.dueDate).toDateString() === dayStr);
            return (
              <div>
                <div className="text-center mb-6">
                  <p className="text-sm font-black text-slate-700">{currentDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{dayItems.length} event{dayItems.length !== 1 ? "s" : ""} scheduled</p>
                </div>
                <div className="space-y-1 border border-slate-100 rounded-2xl overflow-hidden">
                  {Array.from({ length: 17 }, (_, i) => i + 6).map(hour => {
                    const slotItems = dayItems.filter(item => new Date(item.dueDate).getHours() === hour);
                    return (
                      <div key={hour} className={`flex gap-4 px-4 py-2 border-b border-slate-50 hover:bg-slate-50/40 transition-colors min-h-[52px] ${slotItems.length ? "bg-indigo-50/30" : ""}`}>
                        <div className="w-14 shrink-0 text-[10px] font-black text-slate-400 pt-1">
                          {hour % 12 || 12}:00 {hour < 12 ? "AM" : "PM"}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          {slotItems.map(item => (
                            <div
                              key={item._id}
                              onClick={() => openEditActivityModal(item)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer ${item.type === "meeting" ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" : item.type === "call" ? "bg-sky-100 text-sky-700 hover:bg-sky-200" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                            >
                              <div>
                                <p className="text-xs font-black">{item.title}</p>
                                <p className="text-[9px] font-bold opacity-70 uppercase mt-0.5">{item.type} • {item.meetingType || ""}</p>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item._id, "completed"); }} className="text-[9px] bg-emerald-100 text-emerald-700 font-black px-2 py-1 rounded-lg">Done</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteActivity(item._id); }} className="text-[9px] bg-red-50 text-red-500 font-black px-2 py-1 rounded-lg">Del</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          /* ── Agenda View ── */
          (() => {
            // Group all events by date, sorted ascending
            const grouped = allItems.reduce((acc, item) => {
              const key = new Date(item.dueDate).toDateString();
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            }, {});
            const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));
            return (
              <div className="space-y-6">
                {sortedDates.length === 0 ? (
                  <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No calendar events scheduled.</p>
                ) : sortedDates.map(dateStr => {
                  const dateItems = grouped[dateStr].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                  const date = new Date(dateStr);
                  const isToday = dateStr === new Date().toDateString();
                  return (
                    <div key={dateStr}>
                      <div className={`flex items-center gap-3 mb-3 px-2 py-1.5 rounded-xl ${isToday ? "bg-indigo-50" : ""}`}>
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center ${isToday ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          <span className="text-[9px] font-black uppercase leading-none">{date.toLocaleDateString("en", { month: "short" })}</span>
                          <span className="text-sm font-black leading-none">{date.getDate()}</span>
                        </div>
                        <div>
                          <p className={`text-xs font-black uppercase ${isToday ? "text-indigo-600" : "text-slate-700"}`}>{date.toLocaleDateString("en", { weekday: "long" })}{isToday ? " — Today" : ""}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{dateItems.length} event{dateItems.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="space-y-2 pl-13 ml-1 border-l-2 border-slate-100 pl-6">
                        {dateItems.map(item => (
                          <div
                            key={item._id}
                            onClick={() => openEditActivityModal(item)}
                            className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${item.type === "meeting" ? "bg-indigo-50 text-indigo-600" : item.type === "call" ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600"}`}>
                                {item.type === "meeting" ? renderPlatformIcon(item.meetingType || "Video", "#6366f1", 15) : item.type === "call" ? <Phone size={15} /> : <CheckSquare size={15} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 group-hover:text-indigo-700 transition-colors">{item.title}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 flex gap-2">
                                  <span>🕐 {new Date(item.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  {item.timezone && <span>• 🌍 {item.timezone.replace("_", " ")}</span>}
                                  {item.meetingType && <span>• {item.meetingType}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item._id, "completed"); }} className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-black px-2.5 py-1.5 rounded-xl">Complete</button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteActivity(item._id); }} className="text-[9px] bg-red-50 border border-red-100 text-red-500 font-black p-1.5 rounded-xl"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* Schedule / Reschedule Event Modal */}
      {showScheduleModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-3 sm:p-4 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowScheduleModal(false)} />
          <div className="relative z-10 pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {selectedActivity ? "Reschedule / Edit Event" : "Schedule New Event"}
                </h4>
                {platforms.find(p => p.key === form.meetingType)?.urlTemplate && (
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                    Auto join link
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="px-5 py-3.5 space-y-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Event Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="call">Call</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Meeting Platform</label>
                  <div className="relative">
                    <select
                      value={form.meetingType}
                      onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                    >
                      {platforms.length > 0 ? (
                        platforms.map(p => (
                          <option key={p.key} value={p.key}>
                            {p.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No platforms configured</option>
                      )}
                    </select>
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {renderPlatformIcon(platforms.find(p => p.key === form.meetingType)?.icon || form.meetingType, "#6366f1", 14)}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Subject / Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Quarterly Account Review"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Reminder Alert</label>
                  <select
                    value={form.reminderOffsetMinutes}
                    onChange={(e) => setForm({ ...form, reminderOffsetMinutes: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  >
                    <option value="5">5 Minutes Before</option>
                    <option value="15">15 Minutes Before</option>
                    <option value="30">30 Minutes Before</option>
                    <option value="60">1 Hour Before</option>
                    <option value="1440">1 Day Before</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Timezone</label>
                  <SearchableSelect
                    value={form.timezone}
                    onChange={val => setForm({ ...form, timezone: val || DEFAULT_TIMEZONE })}
                    placeholder="Search timezone..."
                    options={(Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [
                      DEFAULT_TIMEZONE, 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Kolkata'
                    ]).map(tz => {
                      let offset = '';
                      try {
                        const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
                        offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
                      } catch (_) {}
                      return { value: tz, label: `${tz.replace(/_/g, ' ')} (${offset})` };
                    })}
                    emptyText="No timezone found"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Link Customer</label>
                  <SearchableSelect
                    value={form.customerId}
                    onChange={val => setForm({ ...form, customerId: val })}
                    placeholder="Select customer..."
                    options={customers.map(c => ({ value: c._id, label: c.name || c.companyName || c.email }))}
                    emptyText="No named customers found"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Link Company</label>
                  <SearchableSelect
                    value={form.companyId}
                    onChange={val => setForm({ ...form, companyId: val })}
                    placeholder="Select company..."
                    options={companies.map(c => ({ value: c._id, label: c.companyName }))}
                    emptyText="No companies found"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Link Contact</label>
                  <SearchableSelect
                    value={form.contactId}
                    onChange={val => setForm({ ...form, contactId: val })}
                    placeholder="Select contact..."
                    options={contacts.map(c => ({
                      value: c._id,
                      label: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email
                    }))}
                    emptyText="No named contacts found"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Link Opportunity (Deal)</label>
                  <SearchableSelect
                    value={form.dealId}
                    onChange={val => setForm({ ...form, dealId: val })}
                    placeholder="Select deal..."
                    options={deals.map(d => ({ value: d._id, label: d.dealName || d.name }))}
                    emptyText="No deals found"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Participants (Comma Separated Emails)</label>
                  <input
                    type="text"
                    placeholder="e.g. client@domain.com, team@company.com"
                    value={form.participantsInput}
                    onChange={(e) => setForm({ ...form, participantsInput: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Meeting Notes / Agenda</label>
                  <input
                    type="text"
                    placeholder="Optional agenda or meeting notes..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Join Meeting link button for host */}
              {selectedActivity && selectedActivity.meetingLink && (
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Host Controls</p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {selectedActivity.meetingLink}
                    </p>
                  </div>
                  <a
                    href={selectedActivity.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg shadow-sm"
                  >
                    Join Meeting
                  </a>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 flex-wrap">
                {selectedActivity && (
                  <button
                    type="button"
                    onClick={() => {
                      exportSingleRecordPDF(
                        `SCHEDULED MEETING / EVENT - ${form.title}`,
                        {
                          "Event Title": form.title,
                          "Activity Type": (form.type || "MEETING").toUpperCase(),
                          "Meeting Platform": (form.meetingType || "N/A").toUpperCase(),
                          "Scheduled Date & Time": form.dueDate ? new Date(form.dueDate).toLocaleString() : "-",
                          "End Time": form.endAt ? new Date(form.endAt).toLocaleString() : "-",
                          "Priority": (form.priority || "MEDIUM").toUpperCase(),
                          "Description / Agenda": form.description || "-"
                        },
                        `Event_${(form.title || "Record").replace(/\s+/g, '_')}`
                      );
                    }}
                    className="mr-auto py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black uppercase rounded-xl flex items-center gap-1.5 transition-all"
                    title="Export Single Meeting PDF"
                  >
                    <Printer size={12} /> Export PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-colors"
                >
                  {selectedActivity ? "Save Event" : "Confirm Event"}
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
