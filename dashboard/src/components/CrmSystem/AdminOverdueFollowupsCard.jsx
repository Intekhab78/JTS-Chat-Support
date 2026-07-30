import React, { useState, useEffect } from "react";
import { AlertTriangle, UserCheck, ShieldAlert, RefreshCw, Send, Calendar } from "lucide-react";
import { api } from "../../api/client.js";

export default function AdminOverdueFollowupsCard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOverdueFollowups = async () => {
    setLoading(true);
    try {
      const res = await api("/api/crm/reminders/overdue-admin");
      setData(res.overdueFollowups || []);
    } catch (err) {
      console.error("Failed to load overdue followups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueFollowups();
  }, []);

  return (
    <div className="bg-white rounded-[28px] border border-rose-200/80 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Overdue Follow-ups (Admin Task Monitoring)</h3>
            <p className="text-xs font-bold text-slate-400">Identify missed daily reminders across assigned Tax Consultants</p>
          </div>
        </div>

        <button
          onClick={fetchOverdueFollowups}
          className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200"
          title="Refresh List"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-bold">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 tracking-wider">
              <th className="pb-3">Consultant Name</th>
              <th className="pb-3">Client / Company Name</th>
              <th className="pb-3">Service Type</th>
              <th className="pb-3">Missed Reminder Date</th>
              <th className="pb-3 text-right">Pending Reminders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400">Loading overdue follow-ups telemetry...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-emerald-600">
                  <UserCheck size={24} className="mx-auto mb-2 text-emerald-500" />
                  All consultants have completed their daily client follow-ups!
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 text-indigo-600 font-black flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black">
                      {item.consultantName[0]}
                    </div>
                    {item.consultantName}
                  </td>
                  <td className="py-4 font-black text-slate-900">{item.clientName}</td>
                  <td className="py-4">
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                      {item.serviceType}
                    </span>
                  </td>
                  <td className="py-4 font-mono text-rose-600 flex items-center gap-1">
                    <Calendar size={12} /> {item.missedReminderDate}
                  </td>
                  <td className="py-4 text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-600 border border-rose-200">
                      {item.pendingRemindersCount} Missed
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
