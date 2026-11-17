import React, { useState, useEffect, useCallback } from "react";
import {
  Phone, Video, AlertCircle, Clock, CheckCircle2, ChevronRight, ChevronLeft,
  SlidersHorizontal, Eye, EyeOff, LayoutGrid, RefreshCw, RotateCcw, Users, Briefcase
} from "lucide-react";
import { api } from "../../api/client.js";

const DEFAULT_WIDGET_LAYOUT = [
  { key: "meetings", visible: true },
  { key: "calls", visible: true },
  { key: "tasks", visible: true },
  { key: "activities", visible: true },
  { key: "leads", visible: false },
  { key: "deals", visible: false }
];

const WIDGET_META = {
  meetings: { label: "Scheduled Meetings", icon: Video, accent: "text-indigo-500" },
  calls: { label: "Recent Calls", icon: Phone, accent: "text-sky-500" },
  tasks: { label: "Overdue Tasks", icon: AlertCircle, accent: "text-rose-500" },
  activities: { label: "Ecosystem Logs", icon: Clock, accent: "text-amber-500" },
  leads: { label: "Recent Leads", icon: Users, accent: "text-emerald-500" },
  deals: { label: "Active Deals", icon: Briefcase, accent: "text-purple-500" }
};

const PRIORITY_BADGE = {
  urgent: "text-rose-700 bg-rose-50 border-rose-200",
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low: "text-slate-600 bg-slate-100 border-slate-200"
};

const CALL_STATUS_BADGE = {
  completed: "text-emerald-700 bg-emerald-50",
  missed: "text-rose-600 bg-rose-50",
  failed: "text-rose-600 bg-rose-50",
  ongoing: "text-sky-700 bg-sky-50"
};

function loadSavedLayout(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_WIDGET_LAYOUT;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingKeys = new Set(parsed.map((item) => item.key));
      const merged = [
        ...parsed.filter((item) => WIDGET_META[item.key]),
        ...DEFAULT_WIDGET_LAYOUT.filter((d) => !existingKeys.has(d.key))
      ];
      return merged.some((w) => w.visible) ? merged : DEFAULT_WIDGET_LAYOUT;
    }
    if (parsed && typeof parsed === "object") {
      return DEFAULT_WIDGET_LAYOUT.map((d) => ({
        key: d.key,
        visible: typeof parsed[d.key] === "boolean" ? parsed[d.key] : d.visible
      }));
    }
  } catch {
    // Fallback to default layout on malformed JSON
  }
  return DEFAULT_WIDGET_LAYOUT;
}

export default function CrmDashboardWidgets({
  websiteId,
  onOpenCustomer,
  onOpenCalendar,
  onViewCallAnalytics,
  onViewAllOpenTasks,
  onExploreCompleteTimeline
}) {
  const storageKey = `crm_dashboard_widgets_${websiteId || "all"}`;
  const [calls, setCalls] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const [layout, setLayout] = useState(() => loadSavedLayout(storageKey));

  useEffect(() => {
    setLayout(loadSavedLayout(storageKey));
  }, [storageKey]);

  const persistLayout = (nextLayout) => {
    setLayout(nextLayout);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextLayout));
    } catch {
      // Ignore storage quota errors
    }
  };

  const toggleWidget = (key) => {
    const visibleCount = layout.filter((w) => w.visible).length;
    const target = layout.find((w) => w.key === key);
    if (target?.visible && visibleCount <= 1) return;
    persistLayout(layout.map((w) => (w.key === key ? { ...w, visible: !w.visible } : w)));
  };

  const moveWidget = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= layout.length) return;
    const next = [...layout];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    persistLayout(next);
  };

  const resetLayout = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setLayout(DEFAULT_WIDGET_LAYOUT);
  };

  const fetchWidgetData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    const wsParam = websiteId ? `websiteId=${websiteId}` : "";
    const qs = (extra) => [wsParam, extra].filter(Boolean).join("&");

    try {
      const [meetRes, callRes, taskRes, actRes, leadRes, dealRes] = await Promise.allSettled([
        api(`/api/crm/meetings?${qs("limit=5")}`),
        api(`/api/crm/calls?${qs("limit=5")}`),
        api(`/api/crm/tasks/my?${qs("")}`),
        api(`/api/crm/activities?${qs("limit=5")}`),
        api(`/api/crm?${qs("limit=5")}`),
        api(`/api/crm?${qs("recordType=deal&limit=5")}`)
      ]);

      setMeetings(meetRes.status === "fulfilled" ? (meetRes.value?.meetings || []) : []);
      setCalls(callRes.status === "fulfilled" ? (callRes.value?.calls || []) : []);

      if (taskRes.status === "fulfilled") {
        const allTasks = Array.isArray(taskRes.value) ? taskRes.value : (taskRes.value?.tasks || []);
        const now = new Date();
        const overdue = allTasks.filter((t) => t.status === "open" && t.dueAt && new Date(t.dueAt) < now);
        setTasks(overdue.slice(0, 5));
      } else {
        setTasks([]);
      }

      setActivities(actRes.status === "fulfilled" ? (actRes.value?.activities || []) : []);
      setLeads(leadRes.status === "fulfilled" ? (leadRes.value?.customers || []) : []);
      setDeals(dealRes.status === "fulfilled" ? (dealRes.value?.customers || []) : []);
    } catch (e) {
      console.error("Dashboard widget fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [websiteId]);

  useEffect(() => {
    fetchWidgetData(false);
  }, [fetchWidgetData]);

  const visibleWidgets = layout.filter((w) => w.visible);
  const gridColsClass =
    visibleWidgets.length === 1
      ? "grid-cols-1"
      : visibleWidgets.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : visibleWidgets.length === 3
          ? "grid-cols-1 md:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  const openLinkedCustomer = (item) => {
    const cId = item?.customerId?._id || item?.customerId;
    if (cId && onOpenCustomer) onOpenCustomer(cId);
  };

  const renderWidgetCard = (key) => {
    const meta = WIDGET_META[key];
    if (!meta) return null;
    const Icon = meta.icon;

    if (key === "meetings") {
      return (
        <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</h5>
              <Icon size={15} className={meta.accent} />
            </div>
            <div className="space-y-2">
              {meetings.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No upcoming meetings.</p>
              ) : (
                meetings.map((m) => {
                  const dt = m.startAt || m.dueDate;
                  const timeLabel = dt && !Number.isNaN(new Date(dt).getTime())
                    ? new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "--:--";
                  const hasCustomer = Boolean(m?.customerId?._id || m?.customerId);
                  return (
                    <div
                      key={m._id}
                      onClick={() => hasCustomer && openLinkedCustomer(m)}
                      className={`flex items-center justify-between gap-2 text-xs ${hasCustomer ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    >
                      <span className="font-semibold text-slate-800 truncate">{m.title || "Meeting"}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        {timeLabel}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenCalendar?.()}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer hover:underline w-fit"
          >
            Go to calendar <ChevronRight size={11} />
          </button>
        </div>
      );
    }

    if (key === "calls") {
      return (
        <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</h5>
              <Icon size={15} className={meta.accent} />
            </div>
            <div className="space-y-2">
              {calls.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No calls logged.</p>
              ) : (
                calls.map((c) => {
                  const statusKey = (c.status || "completed").toLowerCase();
                  const badgeStyle = CALL_STATUS_BADGE[statusKey] || "text-slate-600 bg-slate-100";
                  const callerLabel = c.customerId?.name || c.callerName || c.phoneNumber || `${c.direction || "Voice"} Call`;
                  const hasCustomer = Boolean(c?.customerId?._id || c?.customerId);
                  return (
                    <div
                      key={c._id}
                      onClick={() => hasCustomer && openLinkedCustomer(c)}
                      className={`flex items-center justify-between gap-2 text-xs ${hasCustomer ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    >
                      <span className="font-semibold text-slate-800 truncate capitalize">{callerLabel}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${badgeStyle}`}>
                        {c.status || "logged"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewCallAnalytics?.()}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer hover:underline w-fit"
          >
            View call analytics <ChevronRight size={11} />
          </button>
        </div>
      );
    }

    if (key === "tasks") {
      return (
        <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</h5>
              <Icon size={15} className={meta.accent} />
            </div>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={13} /> All caught up!
                </p>
              ) : (
                tasks.map((t) => {
                  const prioKey = (t.priority || "medium").toLowerCase();
                  const prioStyle = PRIORITY_BADGE[prioKey] || PRIORITY_BADGE.medium;
                  const hasCustomer = Boolean(t?.customerId?._id || t?.customerId);
                  return (
                    <div
                      key={t._id}
                      onClick={() => hasCustomer && openLinkedCustomer(t)}
                      className={`flex items-center justify-between gap-2 text-xs ${hasCustomer ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    >
                      <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${prioStyle}`}>
                        {t.priority || "medium"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewAllOpenTasks?.()}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer hover:underline w-fit"
          >
            View all open tasks <ChevronRight size={11} />
          </button>
        </div>
      );
    }

    if (key === "activities") {
      return (
        <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</h5>
              <Icon size={15} className={meta.accent} />
            </div>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No activity recorded.</p>
              ) : (
                activities.map((a) => {
                  const hasCustomer = Boolean(a?.customerId?._id || a?.customerId);
                  return (
                    <div
                      key={a._id}
                      onClick={() => hasCustomer && openLinkedCustomer(a)}
                      className={`flex items-start gap-2 text-xs ${hasCustomer ? "cursor-pointer hover:text-indigo-600" : ""}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span className="font-medium text-slate-700 truncate">{a.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onExploreCompleteTimeline?.()}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer hover:underline w-fit"
          >
            Explore complete timeline <ChevronRight size={11} />
          </button>
        </div>
      );
    }

    if (key === "leads") {
      return (
        <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</h5>
              <Icon size={15} className={meta.accent} />
            </div>
            <div className="space-y-2">
              {leads.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No recent leads.</p>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead._id}
                    onClick={() => onOpenCustomer?.(lead._id)}
                    className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:text-indigo-600"
                  >
                    <span className="font-semibold text-slate-800 truncate">{lead.companyName || lead.name || "Lead"}</span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                      {lead.pipelineStage || lead.leadStatus || "new"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => leads[0]?._id && onOpenCustomer?.(leads[0]._id)}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer hover:underline w-fit"
          >
            Open latest lead <ChevronRight size={11} />
          </button>
        </div>
      );
    }

    if (key === "deals") {
      return (
        <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[190px]">
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{meta.label}</h5>
              <Icon size={15} className={meta.accent} />
            </div>
            <div className="space-y-2">
              {deals.length === 0 ? (
                <p className="text-[11px] text-slate-400 font-medium">No active deals.</p>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal._id}
                    onClick={() => onOpenCustomer?.(deal._id)}
                    className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:text-indigo-600"
                  >
                    <span className="font-semibold text-slate-800 truncate">{deal.companyName || deal.name || "Deal"}</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md shrink-0">
                      {deal.leadValue ? Number(deal.leadValue).toLocaleString() : (deal.dealStage || "open")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => deals[0]?._id && onOpenCustomer?.(deals[0]._id)}
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-3 flex items-center gap-1 cursor-pointer hover:underline w-fit"
          >
            Open top deal <ChevronRight size={11} />
          </button>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className={`grid ${gridColsClass} gap-3.5`}>
        {visibleWidgets.map((w) => (
          <div key={w.key} className="bg-white border border-slate-100 rounded-2xl p-4 min-h-[190px] animate-pulse flex flex-col justify-between">
            <div className="h-3.5 bg-slate-100 rounded-full w-24" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded-full w-full" />
              <div className="h-3 bg-slate-100 rounded-full w-3/4" />
            </div>
            <div className="h-3 bg-slate-100 rounded-full w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Widget Layout Header Controls */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <LayoutGrid size={14} className="text-indigo-500" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Workspace Widgets ({visibleWidgets.length}/{layout.length})
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fetchWidgetData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-xs"
            title="Refresh Widgets"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((s) => !s)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            <SlidersHorizontal size={12} className="text-indigo-500" />
            {showConfig ? "Done" : "Configure Layout"}
          </button>
        </div>
      </div>

      {/* Widget Toggle & Reorder Panel */}
      {showConfig && (
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Show / Hide &amp; Reorder Widgets
            </span>
            <button
              type="button"
              onClick={resetLayout}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <RotateCcw size={11} /> Reset Default
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {layout.map((w, idx) => {
              const meta = WIDGET_META[w.key];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div
                  key={w.key}
                  className={`inline-flex items-center rounded-xl border transition-all ${
                    w.visible
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => moveWidget(idx, -1)}
                    disabled={idx === 0}
                    className="px-1.5 py-1.5 opacity-70 hover:opacity-100 disabled:opacity-25"
                    title="Move Left"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWidget(w.key)}
                    className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] font-semibold"
                    title={w.visible ? "Click to Hide" : "Click to Show"}
                  >
                    <Icon size={12} />
                    <span>{meta.label}</span>
                    {w.visible ? <Eye size={11} className="opacity-80" /> : <EyeOff size={11} className="opacity-60" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(idx, 1)}
                    disabled={idx === layout.length - 1}
                    className="px-1.5 py-1.5 opacity-70 hover:opacity-100 disabled:opacity-25"
                    title="Move Right"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Responsive Grid */}
      <div className={`grid ${gridColsClass} gap-3.5`}>
        {visibleWidgets.map((w) => renderWidgetCard(w.key))}
      </div>
    </div>
  );
}
