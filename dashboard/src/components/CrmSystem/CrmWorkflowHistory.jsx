import React, { useState, useEffect } from "react";
import { Play, CheckCircle, XCircle, AlertCircle, Search, Clock, FileText } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmWorkflowHistory({ websiteId }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/workflows/executions?websiteId=${websiteId}`);
      setExecutions(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [websiteId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Automation Execution Logs</h3>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Real-time Pipeline Audit</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Runs history list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Executions List</h4>
            {executions.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No execution logs found.</p>
            ) : (
              <div className="space-y-3">
                {executions.map(e => (
                  <div
                    key={e._id}
                    onClick={() => setSelectedRun(e)}
                    className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedRun?._id === e._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                  >
                    <div className="space-y-1">
                      <h5 className="text-xs font-black text-slate-800">{e.workflowId?.name || "Workflow Run"}</h5>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Trigger: {e.workflowId?.trigger} • Executed: {new Date(e.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${e.status === "success" ? "bg-emerald-50 text-emerald-600" : e.status === "failed" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}>{e.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trace details console logs */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
            {selectedRun ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{selectedRun.workflowId?.name || "Workflow Name"}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Run ID: {selectedRun._id}</p>
                  </div>

                  <div className="border-t pt-4 space-y-3 max-h-[300px] overflow-y-auto">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Element execution logs</span>
                    {(selectedRun.logs || []).map((log, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/50 border rounded-xl space-y-1 text-[10px] font-bold text-slate-600">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                          <span>Node: {log.nodeId}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className={log.status === "failed" ? "text-rose-500" : log.status === "success" ? "text-emerald-600" : "text-slate-800"}>
                          {log.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 text-[9px] font-black uppercase text-slate-400 flex justify-between">
                  <span>Execution Status:</span>
                  <span className={selectedRun.status === "success" ? "text-emerald-600" : "text-rose-600"}>{selectedRun.status}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-10 text-center">
                <FileText size={32} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a run log to view compliance traces</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
