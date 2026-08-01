import React, { useState, useEffect } from "react";
import { Shield, Search, RefreshCw, Filter, Calendar, User, Activity, AlertCircle, Eye, EyeOff, Download, Printer } from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmAuditLogsView({ websiteId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter state
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLog, setExpandedLog] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/audit-logs?";
      if (websiteId) url += `websiteId=${websiteId}&`;
      if (entityType) url += `entityType=${entityType}&`;
      if (action) url += `action=${action}&`;
      
      const res = await api(url);
      setLogs(res || []);
    } catch (err) {
      setError(err.message || "Failed to load audit logs from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [websiteId, entityType, action]);

  // Client-side fuzzy search on Actor name or Entity ID
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const actorMatch = log.actorName?.toLowerCase().includes(searchQuery.toLowerCase());
    const entityMatch = log.entityId?.toLowerCase().includes(searchQuery.toLowerCase());
    const actionMatch = log.action?.toLowerCase().includes(searchQuery.toLowerCase());
    return actorMatch || entityMatch || actionMatch;
  });

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpandLog = (id) => {
    setExpandedLog(expandedLog === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Shield size={14} className="text-indigo-500" /> Security Audit Trail
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Ecosystem events registry & security changes logs</p>
        </div>
        <button 
          onClick={fetchAuditLogs}
          className="p-2 border rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Logs
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Fuzzy Lookup (Actor / ID)</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search user name or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 pl-9 rounded-xl text-xs font-bold text-slate-700 focus:bg-white transition-all outline-none"
            />
            <Search size={13} className="absolute left-3.5 top-3 text-slate-400" />
          </div>
        </div>

        {/* Entity Type Filter */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Filter Entity Type</label>
          <select 
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-black uppercase text-slate-700 focus:bg-white outline-none"
          >
            <option value="">-- All Entities --</option>
            <option value="Customer">Lead / Customer</option>
            <option value="Deal">Deal Opportunity</option>
            <option value="Quotation">Quotation</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="Ticket">Support Ticket</option>
            <option value="User">User Profile</option>
          </select>
        </div>

        {/* Action Type Filter */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Filter Action Type</label>
          <select 
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="w-full bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-black uppercase text-slate-700 focus:bg-white outline-none"
          >
            <option value="">-- All Actions --</option>
            <option value="create">Created (new)</option>
            <option value="update">Updated (edit)</option>
            <option value="delete">Deleted</option>
            <option value="login">User Login</option>
            <option value="logout">User Logout</option>
            <option value="status_change">Status Modified</option>
          </select>
        </div>

        {/* Export buttons & summary */}
        <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-3 flex flex-col justify-between">
          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">Total Audited: {filteredLogs.length}</span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleExportCSV}
              className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
              title="Export Audit Logs to CSV"
            >
              <Download size={11} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
              title="Export Audit Logs to PDF"
            >
              <Printer size={11} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid/Table */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-600 font-bold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200/80 rounded-[30px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold text-slate-600">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-6 w-[18%]">Timestamp</th>
                <th className="py-3 px-6 w-[20%]">Actor (User)</th>
                <th className="py-3 px-6 w-[18%]">Action Category</th>
                <th className="py-3 px-6 w-[18%]">Entity Target</th>
                <th className="py-3 px-6 w-[14%]">IP Address</th>
                <th className="py-3 px-6 text-right w-[12%]">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2" />
                    Scanning audit log database...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    No security events found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isExpanded = expandedLog === log._id;
                  return (
                    <React.Fragment key={log._id}>
                      <tr className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/40 transition-colors ${isExpanded ? "bg-slate-50/20" : ""}`}>
                        {/* Timestamp */}
                        <td className="py-3.5 px-6 font-mono text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400" />
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </td>
                        
                        {/* Actor */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px]">
                              <User size={12} />
                            </div>
                            <div>
                              <p className="text-slate-900 truncate max-w-[150px]">{log.actorName}</p>
                              <p className="text-[8px] font-black uppercase text-indigo-500 tracking-wider mt-0.5">{log.actorRole}</p>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                            {log.action}
                          </span>
                        </td>

                        {/* Entity */}
                        <td className="py-3.5 px-6">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-md">
                              {log.entityType}
                            </span>
                            <p className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">{log.entityId}</p>
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-6 font-mono text-[10px] text-slate-400">
                          {log.ipAddress || "System"}
                        </td>

                        {/* Expand Details & Single Export */}
                        <td className="py-3.5 px-6 text-right space-x-1">
                          <button
                            onClick={() => {
                              exportSingleRecordPDF(
                                `SECURITY AUDIT LOG EVENT - ${log.action?.toUpperCase()}`,
                                {
                                  "Log Event ID": log._id,
                                  "Timestamp": log.createdAt ? new Date(log.createdAt).toLocaleString() : "-",
                                  "Actor Name": log.actorName || "System",
                                  "Actor Role": log.actorRole || "system",
                                  "Action Performed": (log.action || "general").toUpperCase(),
                                  "Target Entity Type": log.entityType || "-",
                                  "Target Entity ID": log.entityId || "-",
                                  "IP Address": log.ipAddress || "Internal"
                                },
                                `Audit_Log_${log._id}`
                              );
                            }}
                            className="p-1.5 rounded-xl border border-slate-200/80 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors inline-flex items-center"
                            title="Export Single Audit Log PDF"
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            onClick={() => toggleExpandLog(log._id)}
                            className="p-1.5 rounded-xl border border-slate-200/80 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                            title={isExpanded ? "Collapse Details" : "View Details / Diffs"}
                          >
                            {isExpanded ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Nested details panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/40 border-b border-slate-100 px-6 py-4">
                            <div className="bg-white border rounded-2xl p-4 shadow-xs space-y-3">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <Activity size={12} className="text-indigo-500" /> Event Parameters & Data Diffs
                              </h5>
                              
                              {log.metadata && log.metadata.diff ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Field Modifications:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(log.metadata.diff).map(([key, diffObj]) => (
                                      <div key={key} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                        <p className="text-xs font-black text-slate-800 font-mono mb-1">{key}</p>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          <div className="text-rose-600">
                                            <span className="font-bold uppercase tracking-wider text-[8px] bg-rose-50 px-1 rounded block mb-0.5 w-max">Before</span>
                                            <pre className="font-mono bg-white p-1 rounded border border-rose-100/50 truncate max-w-xs">{JSON.stringify(diffObj.before)}</pre>
                                          </div>
                                          <div className="text-emerald-600">
                                            <span className="font-bold uppercase tracking-wider text-[8px] bg-emerald-50 px-1 rounded block mb-0.5 w-max">After</span>
                                            <pre className="font-mono bg-white p-1 rounded border border-emerald-100/50 truncate max-w-xs">{JSON.stringify(diffObj.after)}</pre>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Log Metadata Payload:</p>
                                  <pre className="text-[10px] font-mono bg-slate-50 p-3 rounded-xl border max-h-[150px] overflow-y-auto w-full">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && filteredLogs.length > itemsPerPage && (
          <div className="flex justify-between items-center bg-slate-50/70 border-t border-slate-200/80 px-6 py-4 text-xs font-bold text-slate-500">
            <span>Showing {startIndex + 1} - {Math.min(filteredLogs.length, startIndex + itemsPerPage)} of {filteredLogs.length} events</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
