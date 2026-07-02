import React, { useState, useEffect } from "react";
import { Phone, Video, AlertCircle, Clock, CheckCircle2, ChevronRight, User } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmDashboardWidgets({ websiteId, onOpenCustomer }) {
  const [calls, setCalls] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWidgetData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Today's Meetings
      const meetRes = await api(`/api/crm/meetings?websiteId=${websiteId}&limit=5`);
      setMeetings(meetRes.meetings || []);

      // 2. Fetch Today's Calls
      const callRes = await api(`/api/crm/calls?websiteId=${websiteId}&limit=5`);
      setCalls(callRes.calls || []);

      // 3. Fetch Overdue Tasks
      const taskRes = await api(`/api/crm/tasks/my?websiteId=${websiteId}`); // Fallbacks to my tasks
      const allTasks = Array.isArray(taskRes) ? taskRes : (taskRes.tasks || []);
      const overdue = allTasks.filter(t => t.status === "open" && new Date(t.dueAt) < new Date());
      setTasks(overdue.slice(0, 5));

      // 4. Fetch Recent Activities
      const actRes = await api(`/api/crm/activities?websiteId=${websiteId}&limit=5`);
      setActivities(actRes.activities || []);
    } catch (err) {
      console.error("Widget fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgetData();
  }, [websiteId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="bg-slate-50 border border-slate-100 rounded-[28px] h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Today's Meetings */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Scheduled Meetings</h5>
            <Video size={16} className="text-indigo-500" />
          </div>
          <div className="space-y-2.5">
            {meetings.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-bold">No meetings today.</p>
            ) : (
              meetings.map(m => (
                <div key={m._id} className="flex items-center justify-between text-xs">
                  <div className="font-black text-slate-800 truncate max-w-[120px]">{m.title}</div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{new Date(m.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mt-4 flex items-center gap-1 cursor-pointer hover:underline">
          Go to calendar <ChevronRight size={10} />
        </div>
      </div>

      {/* Today's Calls */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recent Calls</h5>
            <Phone size={16} className="text-sky-500" />
          </div>
          <div className="space-y-2.5">
            {calls.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-bold">No calls logged today.</p>
            ) : (
              calls.map(c => (
                <div key={c._id} className="flex items-center justify-between text-xs">
                  <div className="font-black text-slate-800 capitalize">{c.direction} Call</div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded">{c.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mt-4 flex items-center gap-1 cursor-pointer hover:underline">
          View call analytics <ChevronRight size={10} />
        </div>
      </div>

      {/* Overdue Tasks */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Overdue Tasks</h5>
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <div className="space-y-2.5">
            {tasks.length === 0 ? (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> All caught up!</p>
            ) : (
              tasks.map(t => (
                <div key={t._id} className="flex items-center justify-between text-xs">
                  <div className="font-black text-slate-800 truncate max-w-[120px]">{t.title}</div>
                  <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">{t.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mt-4 flex items-center gap-1 cursor-pointer hover:underline">
          View all open tasks <ChevronRight size={10} />
        </div>
      </div>

      {/* Recent Activities Timeline snippet */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ecosystem Logs</h5>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="space-y-2.5">
            {activities.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-bold">No activity recorded.</p>
            ) : (
              activities.map(a => (
                <div key={a._id} className="flex items-start gap-2 text-xs truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="font-bold text-slate-600 truncate">{a.title}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mt-4 flex items-center gap-1 cursor-pointer hover:underline">
          Explore complete timeline <ChevronRight size={10} />
        </div>
      </div>
    </div>
  );
}
