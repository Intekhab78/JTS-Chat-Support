import React, { useState, useEffect } from "react";
import { Play, CheckCircle, XCircle, AlertCircle, Search, Clock, FileText, Download, Printer } from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

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

  const handleExportCSV = () => {
    const data = executions.map(e => ({
      "Workflow Name": e.workflowId?.name || "Workflow Run",
      "Trigger Type": e.workflowId?.trigger || "System Event",
      "Execution Status": (e.status || "Completed").toUpperCase(),
      "Timestamp": e.createdAt ? new Date(e.createdAt).toLocaleString() : "-"
    }));
    exportToCSV(data, `Workflow_Executions_Log_${new Date().toISOString().slice(0,10)}`);
  };

  const handleExportPDF = () => {
    const data = executions.map(e => ({
      "Workflow Name": e.workflowId?.name || "Workflow Run",
      "Trigger": e.workflowId?.trigger || "System Event",
      "Status": (e.status || "Completed").toUpperCase(),
      "Timestamp": e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "-"
    }));
    exportToPDF(data, `Workflow_Executions_Log_${new Date().toISOString().slice(0,10)}`, "AUTOMATION WORKFLOW EXECUTION AUDIT REPORT");
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900">Automation Execution Logs</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-time pipeline automation audit trail</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Workflow Logs to CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Workflow Logs to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Runs history list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Executions List ({executions.length})</h4>
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
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Trigger: {e.workflowId?.trigger || "Event"} • Executed: {new Date(e.createdAt).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${e.status === "success" ? "bg-emerald-50 text-emerald-600" : e.status === "failed" ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}>{e.status || "Completed"}</span>
                      <button
                        onClick={(evt) => {
                          evt.stopPropagation();
                          exportSingleRecordPDF(
                            `WORKFLOW EXECUTION LOG - ${e.workflowId?.name || "Run"}`,
                            {
                              "Workflow Name": e.workflowId?.name || "Workflow Run",
                              "Trigger Event": e.workflowId?.trigger || "System Event",
                              "Execution Status": (e.status || "COMPLETED").toUpperCase(),
                              "Execution Time": e.createdAt ? new Date(e.createdAt).toLocaleString() : "-"
                            },
                            `Workflow_Run_${e._id}`
                          );
                        }}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Export Single Execution Run PDF"
                      >
                        <Printer size={12} />
                      </button>
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
