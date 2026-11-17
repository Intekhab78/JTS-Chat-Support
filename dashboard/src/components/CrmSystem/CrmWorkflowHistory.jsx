import React, { useState, useEffect, useMemo } from "react";
import { Search, Clock, FileText, Download, Printer, RefreshCw } from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmWorkflowHistory({ websiteId }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/workflows/executions?websiteId=${websiteId}`);
      setExecutions(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [websiteId]);

  const filteredExecutions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return executions.filter(e => {
      const name = (e.workflowId?.name || "Workflow Run").toLowerCase();
      const trigger = (e.workflowId?.trigger || "Event").toLowerCase();
      const matchSearch = !q || name.includes(q) || trigger.includes(q);
      const st = (e.status || "").toLowerCase();
      const matchStatus = statusFilter === "all" || st === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [executions, search, statusFilter]);

  const handleExportCSV = () => {
    const data = filteredExecutions.map(e => ({
      "Workflow Name": e.workflowId?.name || "Workflow Run",
      "Trigger Type": e.workflowId?.trigger || "System Event",
      "Execution Status": (e.status || "Completed").toUpperCase(),
      "Timestamp": e.createdAt ? new Date(e.createdAt).toLocaleString() : "-"
    }));
    exportToCSV(data, `Workflow_Executions_Log_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const data = filteredExecutions.map(e => ({
      "Workflow Name": e.workflowId?.name || "Workflow Run",
      "Trigger": e.workflowId?.trigger || "System Event",
      "Status": (e.status || "Completed").toUpperCase(),
      "Timestamp": e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "-"
    }));
    exportToPDF(data, `Workflow_Executions_Log_${new Date().toISOString().slice(0, 10)}`, "AUTOMATION WORKFLOW EXECUTION AUDIT REPORT");
  };

  return (
    <div className="space-y-3">
      {/* Compact Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-lg shrink-0">
            <Clock size={15} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold tracking-wider text-slate-900 uppercase">Automation Execution Logs</h3>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">
              {executions.length} total run{executions.length === 1 ? "" : "s"} • Real-time pipeline audit trail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchExecutions}
            className="h-7 w-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            title="Refresh Logs"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportCSV}
            className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            title="Export Workflow Logs to CSV"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            title="Export Workflow Logs to PDF"
          >
            <Printer size={11} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(n => <div key={n} className="h-14 bg-slate-50 border border-slate-200/80 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Runs History List */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
              <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
                Executions ({filteredExecutions.length})
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter runs..."
                    className="h-7 pl-7 pr-2.5 w-36 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  {["all", "success", "failed"].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase cursor-pointer transition-colors ${
                        statusFilter === st ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredExecutions.length === 0 ? (
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider text-center py-10">
                No execution logs found.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                {filteredExecutions.map(e => (
                  <div
                    key={e._id}
                    onClick={() => setSelectedRun(e)}
                    className={`px-3 py-2.5 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                      selectedRun?._id === e._id
                        ? "border-indigo-500 bg-indigo-50/20"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <h5 className="text-[11px] font-extrabold text-slate-900 truncate">{e.workflowId?.name || "Workflow Run"}</h5>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">
                        Trigger: {e.workflowId?.trigger || "Event"} • {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
                        e.status === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : e.status === "failed"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {e.status || "Completed"}
                      </span>
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
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        title="Export Execution Run PDF"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trace Details Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[320px]">
            {selectedRun ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
                      {selectedRun.workflowId?.name || "Workflow Run"}
                    </h4>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">Run ID: {selectedRun._id}</p>
                  </div>

                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Execution Trace</span>
                    {(selectedRun.logs || []).length === 0 ? (
                      <p className="text-[10px] font-medium text-slate-400 py-4 text-center">No step trace logs recorded for this run.</p>
                    ) : (
                      (selectedRun.logs || []).map((log, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-0.5 text-[10px]">
                          <div className="flex justify-between items-center text-[8.5px] font-extrabold uppercase text-slate-400">
                            <span>Node: {log.nodeId}</span>
                            <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "—"}</span>
                          </div>
                          <p className={`font-semibold ${
                            log.status === "failed" ? "text-rose-600" : log.status === "success" ? "text-emerald-700" : "text-slate-700"
                          }`}>
                            {log.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 text-[9.5px] font-extrabold uppercase text-slate-400 flex justify-between">
                  <span>Status</span>
                  <span className={selectedRun.status === "success" ? "text-emerald-600" : "text-rose-600"}>
                    {selectedRun.status || "Completed"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-1.5 py-10 text-center">
                <FileText size={26} className="text-slate-300" />
                <p className="text-[10px] font-bold uppercase tracking-wider">Select a run log to view traces</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
