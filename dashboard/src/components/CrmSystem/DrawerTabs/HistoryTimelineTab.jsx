import React, { useState, useEffect } from "react";
import { Shield, Clock, User, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "../../../api/client.js";

export default function HistoryTimelineTab({ entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Backend exposes audit logs at /api/audit-logs
        const data = await api(`/api/audit-logs?entityId=${entityId}`);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch history logs:", err);
      } finally {
        setLoading(false);
      }
    };
    if (entityId) fetchHistory();
  }, [entityId]);

  if (loading) return (
    <div className="py-8 text-center animate-pulse bg-white rounded-xl border border-slate-200/70">
      <Shield size={20} className="mx-auto text-slate-300 mb-2" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loading audit logs…</p>
    </div>
  );

  return (
    <div className="space-y-2.5">
      <div className="bg-white rounded-xl border border-slate-200/70 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <p className="text-[8.5px] font-bold uppercase tracking-wider text-indigo-600">Security &amp; Governance</p>
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">Entity Audit History</h3>
          <p className="text-[9.5px] font-medium text-slate-500 mt-0.5">
            Immutable record of state transitions, ownership changes, and financial updates.
          </p>
        </div>
        <Shield size={18} className="text-indigo-400 shrink-0" />
      </div>

      <div className="space-y-2">
        {logs.length > 0 ? logs.map((log) => (
          <div key={log._id} className="group relative pl-5 border-l-2 border-slate-200/70 hover:border-indigo-400 transition-all py-0.5">
            <div className="absolute left-[-6px] top-3 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-300 group-hover:border-indigo-500 transition-all" />
            
            <div className="bg-white rounded-xl border border-slate-200/70 p-3 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <User size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">{log.actorName || "System"}</p>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{log.actorRole || "automation"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-wider border border-indigo-100">
                    {log.action?.replace("crm.", "").replace(/_/g, " ")}
                  </span>
                  <p className="text-[8.5px] font-medium text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-2">
                  <button 
                    onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {expandedLogId === log._id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    Inspect Metadata
                  </button>
                  
                  {expandedLogId === log._id && (
                    <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 divide-y divide-slate-200/50">
                      {Object.entries(log.metadata).map(([key, val]) => (
                        <div key={key} className="py-1 flex items-start justify-between gap-3">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{key}</span>
                          <span className="text-[9.5px] font-semibold text-slate-800 break-all text-right">
                             {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="py-8 bg-white text-center border border-dashed border-slate-200 rounded-xl space-y-1.5">
             <Clock size={20} className="mx-auto text-slate-300" />
             <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">No audit logs discovered</p>
          </div>
        )}
      </div>
    </div>
  );
}
