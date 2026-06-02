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
    <div className="py-20 text-center animate-pulse">
      <Shield size={32} className="mx-auto text-slate-100 mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Scanning Audit Engine…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-1">Security & Governance</p>
          <h3 className="text-sm font-black uppercase tracking-tight">Entity Audit History</h3>
          <p className="text-[10px] font-medium text-slate-400 mt-2 leading-relaxed">
            immutable record of all state transitions, ownership changes, and financial updates for this lead.
          </p>
        </div>
        <Shield size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
      </div>

      <div className="space-y-4">
        {logs.length > 0 ? logs.map((log) => (
          <div key={log._id} className="group relative pl-8 border-l-2 border-slate-100 hover:border-indigo-500 transition-all py-2">
            <div className="absolute left-[-9px] top-4 w-4 h-4 rounded-full bg-white border-2 border-slate-200 group-hover:border-indigo-500 group-hover:scale-110 transition-all" />
            
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm group-hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User size={14} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{log.actorName || "System"}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.actorRole || "automation"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase tracking-widest border border-indigo-100">
                    {log.action?.replace("crm.", "").replace("_", " ")}
                  </span>
                  <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-3">
                  <button 
                    onClick={() => setExpandedLogId(expandedLogId === log._id ? null : log._id)}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {expandedLogId === log._id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Inspect Metadata
                  </button>
                  
                  {expandedLogId === log._id && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-200/50">
                      {Object.entries(log.metadata).map(([key, val]) => (
                        <div key={key} className="py-2 flex items-start justify-between gap-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{key}</span>
                          <span className="text-[10px] font-bold text-slate-900 break-all text-right">
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
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
             <Clock size={32} className="mx-auto text-slate-100 mb-3" />
             <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No audit logs discovered</p>
          </div>
        )}
      </div>
    </div>
  );
}
