import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  History,
  Mail,
  Phone,
  Video,
  FileText,
  Search,
  RefreshCw,
  User,
  Download,
  Printer,
  Eye,
  X
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

const isValidWebsiteId = (id) =>
  Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

export default function CrmActivityFeed({ websiteId, onOpenCustomer }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const fetchActivities = async () => {
    if (!isValidWebsiteId(websiteId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ websiteId, limit: "100" });
      if (filterType) params.set("type", filterType);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await api(`/api/crm/activities?${params.toString()}`);
      setActivities(res?.activities || []);
      setPage(1);
    } catch (err) {
      console.error("Failed to fetch CRM activities:", err);
      setActivities([]);
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
    if (!dateString) return "—";
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
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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
      <div
        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${match.bg}`}
      >
        <IconComponent size={12} />
      </div>
    );
  };

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.trim().toLowerCase();
    return activities.filter(
      (act) =>
        (act.title || "").toLowerCase().includes(q) ||
        (act.description || "").toLowerCase().includes(q) ||
        (act.ownerId?.name || "").toLowerCase().includes(q) ||
        (act.customerId?.name || "").toLowerCase().includes(q)
    );
  }, [activities, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);

  const paginatedActivities = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredActivities.slice(start, start + itemsPerPage);
  }, [filteredActivities, safePage, itemsPerPage]);

  const handleExportCSV = () => {
    const data = filteredActivities.map((a) => ({
      "Activity Title": a.title || "Activity",
      Type: (a.type || "general").toUpperCase(),
      "Description / Details": a.description || "—",
      "Created By": a.ownerId?.name || "System",
      "User Role": a.ownerId?.role || "System",
      Timestamp: a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"
    }));
    exportToCSV(data, `CRM_Activity_Feed_${new Date().toISOString().slice(0, 10)}`);
  };

  const handlePrintActivity = (act) => {
    if (!act) return;
    const creatorName = act.ownerId?.name || "System";
    const creatorRole = act.ownerId?.role || "system";
    exportSingleRecordPDF(
      {
        "Activity Event": act.title || "Activity",
        "Activity Type": (act.type || "GENERAL").toUpperCase(),
        "Details / Description": act.description || "—",
        "Created By": `${creatorName} (${creatorRole})`,
        Timestamp: act.createdAt ? new Date(act.createdAt).toLocaleString() : "—",
      },
      `Activity_${(act.title || "Record").replace(/[^a-zA-Z0-9_-]+/g, "_")}`
    );
  };

  const handleExportPDF = () => {
    const data = filteredActivities.map((a) => ({
      "Activity Title": a.title || "Activity",
      Type: (a.type || "general").toUpperCase(),
      "Created By": a.ownerId?.name || "System",
      Timestamp: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"
    }));
    exportToPDF(
      data,
      `CRM_Activity_Feed_${new Date().toISOString().slice(0, 10)}`,
      "LIVE CRM TEAM ACTIVITY FEED REPORT"
    );
  };

  if (!isValidWebsiteId(websiteId)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-center">
        <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
          <History size={22} />
        </div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          Select a Specific Website Domain
        </h3>
        <p className="text-[10.5px] font-medium text-slate-500 max-w-sm leading-relaxed mt-1">
          CRM activity feeds are scoped to individual websites. Please select a specific domain from the website selector at the top.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 bg-white">
      {/* Compact Controls & Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center rounded-lg shrink-0">
            <History size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
                Live Team Feed
              </h3>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                {filteredActivities.length} Events
              </span>
            </div>
            <p className="text-[9.5px] text-slate-500 font-medium leading-tight truncate">
              Monitor CRM events and sales updates
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-56">
            <input
              type="text"
              placeholder="Search feed activities…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-6 py-1.5 text-[10.5px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
            <Search size={12} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={11} />
              </button>
            )}
          </form>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-all"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            disabled={filteredActivities.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg transition-all"
            title="Export Feed to CSV"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredActivities.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg transition-all"
            title="Export Feed to PDF"
          >
            <Printer size={11} /> PDF
          </button>

          <button
            onClick={fetchActivities}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
            title="Refresh feed"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : paginatedActivities.length > 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-2.5">
          {/* Bounded Scroll Container */}
          <div className="max-h-[470px] overflow-y-auto pr-1.5">
            <div className="relative pl-5 space-y-2 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
              {paginatedActivities.map((act) => {
                const creatorName = act.ownerId?.name || "System";
                const creatorRole = act.ownerId?.role || "system";
                const rawCustName = typeof act.customerId === "object" ? act.customerId?.name : "";
                const customerLabel =
                  rawCustName && !/^anonymous\s*visitor$/i.test(rawCustName.trim())
                    ? rawCustName
                    : "Visitor";

                return (
                  <div key={act._id} className="relative flex items-start gap-2.5 group">
                    <div className="absolute -left-[22px] top-1 z-10 bg-white p-0.5 rounded-full">
                      {getActivityIcon(act.type)}
                    </div>

                    <div
                      onClick={() => setSelectedActivity(act)}
                      className="flex-1 rounded-xl border border-slate-200/70 bg-slate-50/40 hover:bg-white hover:border-indigo-200/80 p-2.5 transition-all cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-900 leading-tight">
                            {act.title}
                          </span>
                          {act.customerId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCustomer &&
                                onOpenCustomer(
                                  typeof act.customerId === "object"
                                    ? act.customerId
                                    : { _id: act.customerId }
                                );
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-[9px] font-bold text-indigo-600 transition-colors cursor-pointer"
                            >
                              <User size={9} /> {customerLabel}
                            </button>
                          )}
                        </div>
                        <span className="text-[9.5px] font-semibold text-slate-400 shrink-0">
                          {getRelativeTime(act.createdAt || act.activityAt)}
                        </span>
                      </div>

                      {act.description && (
                        <p className="text-[10px] font-normal text-slate-600 leading-snug whitespace-pre-line mb-1.5">
                          {act.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-1 text-[9.5px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600 font-bold shrink-0">
                            {creatorName[0]?.toUpperCase()}
                          </span>
                          <span>
                            By {creatorName} ({creatorRole})
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedActivity(act);
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                            title="View Activity Details"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintActivity(act);
                            }}
                            className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded transition-all cursor-pointer"
                            title="Export Single Activity PDF"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact Pagination */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400">
              Showing {(safePage - 1) * itemsPerPage + 1}–
              {Math.min(safePage * itemsPerPage, filteredActivities.length)} of{" "}
              {filteredActivities.length} Events
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Prev
              </button>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9.5px] font-black">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-10 bg-white border border-slate-200/80 rounded-2xl text-center space-y-2">
          <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            No activities matched the selected filters
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterType("");
              setPage(1);
            }}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9.5px] font-black uppercase"
          >
            Reset Filters
          </button>
        </div>
      )}
      {/* Activity Detail Modal */}
      {selectedActivity && createPortal(
        <div
          onClick={() => setSelectedActivity(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-4 shadow-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {getActivityIcon(selectedActivity.type)}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {selectedActivity.title || "Activity Event"}
                  </h4>
                  <p className="text-[9.5px] font-semibold text-slate-400">
                    {(selectedActivity.type || "general").toUpperCase()} ·{" "}
                    {selectedActivity.createdAt
                      ? new Date(selectedActivity.createdAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {selectedActivity.description && (
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </p>
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedActivity.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-white border border-slate-200/70 rounded-lg p-2">
                <span className="text-[8.5px] font-bold uppercase text-slate-400 block">
                  Created By
                </span>
                <span className="font-bold text-slate-800">
                  {selectedActivity.ownerId?.name || "System"} (
                  {selectedActivity.ownerId?.role || "system"})
                </span>
              </div>
              <div className="bg-white border border-slate-200/70 rounded-lg p-2">
                <span className="text-[8.5px] font-bold uppercase text-slate-400 block">
                  Customer / Lead
                </span>
                {selectedActivity.customerId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const c =
                        typeof selectedActivity.customerId === "object"
                          ? selectedActivity.customerId
                          : { _id: selectedActivity.customerId };
                      setSelectedActivity(null);
                      if (onOpenCustomer) onOpenCustomer(c);
                    }}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer truncate max-w-full block text-left"
                  >
                    {selectedActivity.customerId?.name &&
                    !/^anonymous\s*visitor$/i.test(selectedActivity.customerId.name.trim())
                      ? selectedActivity.customerId.name
                      : "Open Customer Profile"}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-500">—</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handlePrintActivity(selectedActivity)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-bold uppercase tracking-wider cursor-pointer"
              >
                <Printer size={12} /> Print / PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
