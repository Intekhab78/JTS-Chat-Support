import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon, Video, Phone, CheckSquare, Clock, MapPin, Plus, X,
  ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Edit2, Trash2, Calendar
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const VIEW_MODES = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "agenda", label: "Agenda" }
];

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

  const fetchCalendarItems = async () => {
    setLoading(true);
    try {
      // Calculate date range for current view
      let startDate, endDate;
      const yr = currentDate.getFullYear();
      const mo = currentDate.getMonth();

      if (viewMode === "month") {
        startDate = new Date(yr, mo - 1, 20).toISOString();
        endDate = new Date(yr, mo + 1, 10).toISOString();
      } else if (viewMode === "week") {
        const start = currentDate.getDate() - currentDate.getDay();
        startDate = new Date(currentDate.setDate(start)).toISOString();
        endDate = new Date(currentDate.setDate(start + 7)).toISOString();
      } else {
        startDate = new Date(yr, mo, currentDate.getDate(), 0, 0, 0).toISOString();
        endDate = new Date(yr, mo, currentDate.getDate(), 23, 59, 59).toISOString();
      }

      const actRes = await api(`/api/crm/activities?websiteId=${websiteId}&startDate=${startDate}&endDate=${endDate}`);
      setActivities(actRes.activities || []);

      // Load Reminders
      const remRes = await api(`/api/crm/activities?websiteId=${websiteId}&type=reminder&startDate=${startDate}&endDate=${endDate}`);
      setReminders(remRes.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const custRes = await api(`/api/crm?websiteId=${websiteId}`);
      setCustomers(custRes.customers || []);
      const compRes = await api(`/api/crm/companies?websiteId=${websiteId}`);
      setCompanies(compRes.companies || []);
      const contRes = await api(`/api/crm/contacts?websiteId=${websiteId}`);
      setContacts(contRes.contacts || []);
      const dealRes = await api(`/api/crm/deals?websiteId=${websiteId}`);
      setDeals(dealRes.deals || []);
    } catch (err) {
      console.error("Lookups load failed:", err);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
    fetchLookups();
  }, [websiteId, viewMode, currentDate]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      const parsedParticipants = form.participantsInput.split(",").map(p => p.trim()).filter(Boolean).map(email => ({
        participantId: new mongoose.Types.ObjectId(), // mock id representation
        participantType: "Customer"
      }));

      const payload = {
        ...form,
        dueDate: new Date(form.dueDate),
        endAt: form.endAt ? new Date(form.endAt) : null,
        participants: parsedParticipants
      };

      if (selectedActivity) {
        await api(`/api/crm/activities/${selectedActivity._id}`, {
          method: "PUT",
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
        ) : (
          /* List Agenda / Day / Week View */
          <div className="space-y-4">
            {allItems.length === 0 ? (
              <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No calendar events scheduled.</p>
            ) : (
              allItems.map(item => (
                <div key={item._id} className="p-5 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50/50 transition-colors gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${item.type === "meeting" ? "bg-indigo-50 text-indigo-600" : item.type === "call" ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-600"}`}>
                      {item.type === "meeting" ? <Video size={18} /> : item.type === "call" ? <Phone size={18} /> : <CheckSquare size={18} />}
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{item.title}</h5>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase flex items-center gap-2">
                        <span>📅 {new Date(item.dueDate).toLocaleString()}</span>
                        {item.timezone && <span>• 🌍 {item.timezone}</span>}
                        {item.meetingType && <span>• 🔗 {item.meetingType}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {item.type !== "reminder" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(item._id, "completed")}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase rounded-xl transition-all"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item._id, "cancelled")}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteActivity(item._id)}
                      className="p-2 border hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Schedule / Reschedule Event Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />
          <div className="bg-white rounded-[28px] p-8 max-w-lg w-full relative z-10 border shadow-2xl space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-3">
              {selectedActivity ? "Reschedule / Edit Event" : "Schedule New Event"}
            </h4>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-xs font-bold text-slate-600">
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
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="phone">Phone</option>
                    <option value="in_person">In Person</option>
                  </select>
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
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="Europe/London">London (GMT)</option>
                  </select>
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
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Company</label>
                  <select
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="">Select company...</option>
                    {companies.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Contact</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map(c => <option key={c._id} value={c._id}>{c.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link Opportunity (Deal)</label>
                  <select
                    value={form.dealId}
                    onChange={(e) => setForm({ ...form, dealId: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="">Select deal...</option>
                    {deals.map(d => <option key={d._id} value={d._id}>{d.dealName}</option>)}
                  </select>
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

              <div className="flex gap-2 border-t pt-4">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black uppercase rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md">
                  Confirm Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
