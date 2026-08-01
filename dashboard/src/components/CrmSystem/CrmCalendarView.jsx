import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon, Video, Phone, CheckSquare, Clock, MapPin, Plus, X,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Edit2, Trash2, Calendar, Download, Printer
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const VIEW_MODES = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" }
];

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
        className={`flex items-center w-full bg-slate-50 border rounded-xl px-3 py-2 cursor-text gap-2 transition-all ${open ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-slate-300"}`}
        onClick={() => setOpen(true)}
      >
        <input
          className="flex-1 bg-transparent outline-none text-xs font-bold text-slate-700 placeholder:text-slate-400 min-w-0"
          placeholder={open ? "Type to search..." : (displayLabel || placeholder)}
          value={open ? query : ""}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {!open && displayLabel && (
          <span className="text-xs font-bold text-slate-700 truncate flex-1 pointer-events-none absolute left-3">{displayLabel}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button type="button" onClick={handleClear} className="text-slate-300 hover:text-red-400 transition-colors">
              <X size={12} />
            </button>
          )}
          <ChevronLeft size={12} className={`text-slate-400 transition-transform ${open ? "-rotate-90" : "rotate-180"}`} style={{transform: open ? 'rotate(90deg)' : 'rotate(-90deg)'}} />
        </div>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onMouseDown={() => handleSelect("")}
              className="w-full text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase hover:bg-slate-50 border-b border-slate-50"
            >
              — {placeholder}
            </button>
            {filtered.slice(0, 50).map(o => (
              <button
                key={o[valueKey]}
                type="button"
                onMouseDown={() => handleSelect(o[valueKey])}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${
                  String(o[valueKey]) === String(value) ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
                }`}
              >
                {o[labelKey]}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-[10px] font-bold text-slate-400">{emptyText}</p>
            )}
            {filtered.length > 50 && (
              <p className="px-4 py-2 text-[9px] font-bold text-slate-400 bg-slate-50 border-t">Showing first 50 — type to narrow down</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrmCalendarView({ websiteId }) {
  const toast = useToast();
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
    meetingType: "zoom",
    timezone: "Asia/Kolkata",
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
    try {
      const [custRes, compRes, contRes] = await Promise.all([
        api(`/api/crm?websiteId=${websiteId}&limit=200`).catch(() => ({})),
        api(`/api/crm/companies?websiteId=${websiteId}`).catch(() => ({})),
        api(`/api/crm/contacts?websiteId=${websiteId}`).catch(() => ({}))
      ]);
      setCustomers(custRes.customers || []);
      setCompanies(compRes.companies || []);
      setContacts(contRes.contacts || []);

      // Deals: fetch customers with recordType=deal (the CRM's deal pipeline)
      const dealCustRes = await api(`/api/crm?websiteId=${websiteId}&recordType=deal&limit=200`).catch(() => ({}));
      const dealCustomers = dealCustRes.customers || [];
      // Also try the dedicated deals endpoint
      const dealRes = await api(`/api/crm/deals?websiteId=${websiteId}&limit=200`).catch(() => ({}));
      const dedicatedDeals = dealRes.deals || [];
      // Merge both sources, prefer dedicated deals
      if (dedicatedDeals.length > 0) {
        setDeals(dedicatedDeals);
      } else {
        // Map deal-stage customers as deals (dealName = companyName or name + leadValue)
        setDeals(dealCustomers.map(c => ({
          _id: c._id,
          dealName: `${c.companyName || c.name}${c.leadValue ? ` — ₹${Number(c.leadValue).toLocaleString()}` : ''}`
        })));
      }
    } catch (err) {
      console.error("Lookups load failed:", err);
    }

    // Fetch meeting platforms
    try {
      const platRes = await api(`/api/crm/meeting-platforms?websiteId=${websiteId}`).catch(() => ({}));
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

  // Render Calendar Month Grid helper
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const allItems = [...activities, ...reminders];

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

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Centralized CRM Calendar</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Manage Calls, Meetings, Tasks, and Reminders</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportCalendarCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Calendar Meetings to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportCalendarPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Calendar Meetings to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
          {/* Navigation */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button
              onClick={() => {
                const next = new Date(currentDate);
                if (viewMode === "month") next.setMonth(next.getMonth() - 1);
                else next.setDate(next.getDate() - 7);
                setCurrentDate(next);
              }}
              className="p-1.5 hover:bg-white rounded-xl transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-black uppercase text-slate-700 px-3">
              {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => {
                const next = new Date(currentDate);
                if (viewMode === "month") next.setMonth(next.getMonth() + 1);
                else next.setDate(next.getDate() + 7);
                setCurrentDate(next);
              }}
              className="p-1.5 hover:bg-white rounded-xl transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === mode.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-white/40"}`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedActivity(null);
              setForm({
                title: "", type: "meeting", meetingType: "zoom", timezone: "Asia/Kolkata",
                dueDate: "", endAt: "", description: "", priority: "medium",
                reminderOffsetMinutes: "15", customerId: "", companyId: "",
                contactId: "", dealId: "", participantsInput: ""
              });
              setShowScheduleModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md transition-all"
          >
            <Plus size={14} /> Schedule Event
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm min-h-[500px]">
        {loading ? (
          <p className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Loading calendar...</p>
        ) : viewMode === "month" ? (
          /* Month View Grid */
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase pb-2 border-b">{day}</div>
            ))}
            {getDaysInMonth().map(day => {
              const dayStr = day.toDateString();
              const dayItems = allItems.filter(item => new Date(item.dueDate).toDateString() === dayStr);

              return (
                <div key={dayStr} className="min-h-[100px] border border-slate-100 rounded-2xl p-2 space-y-1 hover:bg-slate-50/55 transition-colors">
                  <div className="text-[10px] font-black text-slate-400">{day.getDate()}</div>
                  <div className="space-y-1 overflow-y-auto max-h-[70px]">
                    {dayItems.map(item => (
                      <div
                        key={item._id}
                        onClick={() => {
                          setSelectedActivity(item);
                          setForm({
                            title: item.title,
                            type: item.type,
                            meetingType: item.meetingType || "zoom",
                            timezone: item.timezone || "Asia/Kolkata",
                            dueDate: new Date(item.dueDate).toISOString().slice(0, 16),
                            endAt: item.endAt ? new Date(item.endAt).toISOString().slice(0, 16) : "",
                            description: item.description || "",
                            priority: item.priority || "medium",
                            reminderOffsetMinutes: "15",
                            customerId: item.customerId?._id || item.customerId || "",
                            companyId: item.companyId?._id || item.companyId || "",
                            contactId: item.contactId?._id || item.contactId || "",
                            dealId: item.dealId?._id || item.dealId || "",
                            participantsInput: ""
                          });
                          setShowScheduleModal(true);
                        }}
                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded truncate cursor-pointer transition-all ${item.type === "meeting" ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" : item.type === "call" ? "bg-sky-50 text-sky-600 hover:bg-sky-100" : item.type === "reminder" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"}`}
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
                                onClick={() => { setSelectedActivity(item); setShowScheduleModal(true); }}
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
                              onClick={() => { setSelectedActivity(item); setShowScheduleModal(true); }}
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
                            onClick={() => { setSelectedActivity(item); setShowScheduleModal(true); }}
                            className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:bg-slate-50/50 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${item.type === "meeting" ? "bg-indigo-50 text-indigo-600" : item.type === "call" ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600"}`}>
                                {item.type === "meeting" ? <Video size={15} /> : item.type === "call" ? <Phone size={15} /> : <CheckSquare size={15} />}
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
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm pointer-events-auto" onClick={() => setShowScheduleModal(false)} />
          <div className="relative z-10 pointer-events-auto bg-white rounded-[28px] max-w-lg w-full border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                {selectedActivity ? "Reschedule / Edit Event" : "Schedule New Event"}
              </h4>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="px-6 sm:px-8 py-6 space-y-4 text-xs font-bold text-slate-600 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Event Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="call">Call</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Meeting Platform</label>
                  <select
                    value={form.meetingType}
                    onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    {platforms.length > 0 ? (
                      platforms.map(p => (
                        <option key={p.key} value={p.key}>
                          {p.icon} {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="jts_meet">🎯 JTS Meet</option>
                        <option value="zoom">📹 Zoom</option>
                        <option value="google_meet">🟢 Google Meet</option>
                        <option value="phone">📞 Phone</option>
                        <option value="in_person">🤝 In Person</option>
                      </>
                    )}
                  </select>
                  {/* Show join link hint if platform has URL template */}
                  {platforms.find(p => p.key === form.meetingType)?.urlTemplate && (
                    <p className="text-[9px] font-bold text-indigo-500 mt-1">
                      ✨ Join link will be auto-generated
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Subject / Title</label>
                <input
                  type="text"
                  placeholder="Meeting Subject"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Timezone</label>
                  <SearchableSelect
                    value={form.timezone}
                    onChange={val => setForm({ ...form, timezone: val || "Asia/Kolkata" })}
                    placeholder="Search timezone..."
                    options={(Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [
                      'Asia/Kolkata','UTC','America/New_York','America/Los_Angeles',
                      'Europe/London','Europe/Paris','Asia/Dubai','Asia/Tokyo',
                      'Australia/Sydney','Pacific/Auckland'
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
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Reminder Alert Time</label>
                  <select
                    value={form.reminderOffsetMinutes}
                    onChange={(e) => setForm({ ...form, reminderOffsetMinutes: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="5">5 Minutes Before</option>
                    <option value="15">15 Minutes Before</option>
                    <option value="30">30 Minutes Before</option>
                    <option value="60">1 Hour Before</option>
                    <option value="1440">1 Day Before</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 border-slate-100">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Customer</label>
                  <SearchableSelect
                    value={form.customerId}
                    onChange={val => setForm({ ...form, customerId: val })}
                    placeholder="Select customer..."
                    options={customers.map(c => ({ value: c._id, label: c.name || c.companyName || c._id }))}
                    emptyText="No customers found"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Company</label>
                  <SearchableSelect
                    value={form.companyId}
                    onChange={val => setForm({ ...form, companyId: val })}
                    placeholder="Select company..."
                    options={companies.map(c => ({ value: c._id, label: c.companyName || c._id }))}
                    emptyText="No companies found"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Contact</label>
                  <SearchableSelect
                    value={form.contactId}
                    onChange={val => setForm({ ...form, contactId: val })}
                    placeholder="Select contact..."
                    options={contacts.map(c => ({ value: c._id, label: c.displayName || c.name || c._id }))}
                    emptyText="No contacts found"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Opportunity (Deal)</label>
                  <SearchableSelect
                    value={form.dealId}
                    onChange={val => setForm({ ...form, dealId: val })}
                    placeholder="Select deal..."
                    options={deals.map(d => ({ value: d._id, label: d.dealName || d.name || d._id }))}
                    emptyText="No deals found"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Participants (comma separated emails)</label>
                <input
                  type="text"
                  placeholder="e.g. client@domain.com, team@jts.com"
                  value={form.participantsInput}
                  onChange={(e) => setForm({ ...form, participantsInput: e.target.value })}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Meeting Notes / Agenda</label>
                <textarea
                  placeholder="Description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2 h-16"
                />
              </div>

              {/* Join Meeting link button for host */}
              {selectedActivity && selectedActivity.meetingLink && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center gap-2">
                  <p className="text-[10px] font-black text-indigo-600 uppercase">⚡ Host Controls</p>
                  <a
                    href={selectedActivity.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md inline-block"
                  >
                    🎯 Join Meeting Room
                  </a>
                  <p className="text-[9px] font-bold text-slate-400 truncate max-w-full">
                    Link: {selectedActivity.meetingLink}
                  </p>
                </div>
              )}

              <div className="flex gap-2 border-t pt-4 flex-wrap">
                {selectedActivity && (
                  <button
                    type="button"
                    onClick={() => {
                      exportSingleRecordPDF(
                        `SCHEDULED MEETING / EVENT - ${form.title}`,
                        {
                          "Event Title": form.title,
                          "Activity Type": (form.type || "MEETING").toUpperCase(),
                          "Meeting Platform": (form.meetingType || "ZOOM").toUpperCase(),
                          "Scheduled Date & Time": form.dueDate ? new Date(form.dueDate).toLocaleString() : "-",
                          "End Time": form.endAt ? new Date(form.endAt).toLocaleString() : "-",
                          "Priority": (form.priority || "MEDIUM").toUpperCase(),
                          "Description / Agenda": form.description || "-"
                        },
                        `Event_${(form.title || "Record").replace(/\s+/g, '_')}`
                      );
                    }}
                    className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black uppercase rounded-xl flex items-center gap-1.5 transition-all"
                    title="Export Single Meeting PDF"
                  >
                    <Printer size={13} /> Export PDF
                  </button>
                )}
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black uppercase rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md">
                  Confirm Event
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
