import React, { useState, useEffect } from "react";
import { 
  History, Mail, Phone, Video, FileText, MessageSquare, 
  Search, RefreshCw, User, Calendar, Award, AlertTriangle, Play, Download, Printer 
} from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const ACTIVITY_TYPES = [
  { value: "", label: "All Activities" },
  { value: "email", label: "Emails" },
  { value: "call", label: "Calls" },
  { value: "meeting", label: "Meetings" },
  { value: "note", label: "Internal Notes" },
  { value: "system", label: "System Actions" }
];

export default function CrmActivityFeed({ websiteId, onOpenCustomer }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  
  const fetchActivities = async () => {
    if (!websiteId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const typeParam = filterType ? `&type=${filterType}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      
      const res = await api(
        `/api/crm/activities?websiteId=${websiteId}${typeParam}${searchParam}&limit=100`
      );
      
      setActivities(res.activities || []);
    } catch (err) {
      console.error("Failed to fetch CRM activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [websiteId, filterType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchActivities();
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getActivityIcon = (type) => {
    const map = {
      email: { icon: Mail, bg: "bg-indigo-50 text-indigo-600 border-indigo-100" },
      call: { icon: Phone, bg: "bg-emerald-50 text-emerald-600 border-emerald-100" },
      meeting: { icon: Video, bg: "bg-sky-50 text-sky-600 border-sky-100" },
      note: { icon: FileText, bg: "bg-amber-50 text-amber-600 border-amber-100" },
      system: { icon: History, bg: "bg-slate-50 text-slate-600 border-slate-200" }
    };
    const match = map[type?.toLowerCase()] || map.system;
    const IconComponent = match.icon;
    return (
      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${match.bg}`}>
        <IconComponent size={14} />
      </div>
    );
  };

  const handleExportCSV = () => {
    const data = activities.map(a => ({
      "Activity Title": a.title || "Activity",
      "Type": (a.type || "general").toUpperCase(),
      "Description / Details": a.description || "-",
      "Created By": a.ownerId?.name || "System",
      "User Role": a.ownerId?.role || "System",
      "Timestamp": a.createdAt ? new Date(a.createdAt).toLocaleString() : "-"
    }));
    exportToCSV(data, `CRM_Activity_Feed_${new Date().toISOString().slice(0,10)}`);
  };

  const handleExportPDF = () => {
    const data = activities.map(a => ({
      "Activity Title": a.title || "Activity",
      "Type": (a.type || "general").toUpperCase(),
      "Created By": a.ownerId?.name || "System",
      "Timestamp": a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-"
    }));
    exportToPDF(data, `CRM_Activity_Feed_${new Date().toISOString().slice(0,10)}`, "LIVE CRM TEAM ACTIVITY FEED REPORT");
  };

  if (!websiteId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200/80 rounded-[30px] shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
          <History size={32} />
        </div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Select a Specific Website Domain</h3>
        <p className="text-xs font-bold text-slate-400 max-w-sm leading-relaxed mt-2">
          CRM activity feeds are scoped to individual websites. Please select a specific domain from the website selector at the top to check live team updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl">
            <History size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-slate-900">Live Team Feed</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monitor all CRM events and sales updates</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-64">
            <input
              type="text"
              placeholder="Search feed activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          {/* Type Selector Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-700 outline-none cursor-pointer"
          >
            {ACTIVITY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Master Export Buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Feed to CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Feed to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>

          {/* Refresh Action */}
          <button
            onClick={fetchActivities}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all"
            title="Refresh feed"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white border border-slate-100 rounded-[24px]">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fetching CRM event feed...</p>
        </div>
      ) : activities.length > 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 md:p-8 shadow-sm space-y-6">
          <div className="relative pl-6 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
            {activities.map((act) => {
              const creatorName = act.ownerId?.name || "System Automated";
              const creatorRole = act.ownerId?.role || "system";
              
              return (
                <div key={act._id} className="relative flex items-start gap-4 group">
                  {/* Vertical Node Indicator */}
                  <div className="absolute -left-[30px] top-0 z-10 bg-white p-0.5 rounded-full">
                    {getActivityIcon(act.type)}
                  </div>

                  {/* Activity Details Card */}
                  <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-200 p-4 transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 leading-tight">
                          {act.title}
                        </span>
                        
                        {/* Optional linked Lead/Customer clickable badge */}
                        {act.customerId && (
                          <button
                            onClick={() => onOpenCustomer(typeof act.customerId === "object" ? act.customerId : { _id: act.customerId })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-[8px] font-black uppercase text-indigo-600 tracking-wider transition-colors"
                          >
                            <User size={8} /> {typeof act.customerId === "object" ? (act.customerId.name || "Customer Profile") : "Customer Profile"}
                          </button>
                        )}
                      </div>

                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        {getRelativeTime(act.createdAt || act.activityAt)}
                      </span>
                    </div>

                    {act.description && (
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed whitespace-pre-line mb-3">
                        {act.description}
                      </p>
                    )}

                    {/* Agent metadata footer & single export */}
                    <div className="flex items-center justify-between border-t border-slate-100/80 pt-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] text-slate-600 font-black shrink-0">
                          {creatorName[0]?.toUpperCase()}
                        </span>
                        <span>By {creatorName} ({creatorRole})</span>
                      </div>
                      <button
                        onClick={() => {
                          exportSingleRecordPDF(
                            `ACTIVITY EVENT BRIEF - ${act.title}`,
                            {
                              "Activity Event": act.title,
                              "Activity Type": (act.type || "GENERAL").toUpperCase(),
                              "Details / Description": act.description || "-",
                              "Created By User": creatorName,
                              "User Role": creatorRole,
                              "Timestamp": act.createdAt ? new Date(act.createdAt).toLocaleString() : "-"
                            },
                            `Activity_${(act.title || "Record").replace(/\s+/g, '_')}`
                          );
                        }}
                        className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded transition-all"
                        title="Export Single Activity PDF"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-16 bg-white border border-slate-200/80 rounded-[30px] text-center space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activities matched the selected filters</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterType("");
            }}
            className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest underline"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
