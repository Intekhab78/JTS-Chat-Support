import { useState } from "react";

const TYPE_STYLES = {
  created: "bg-emerald-500",
  updated: "bg-indigo-500",
  archived: "bg-amber-500",
  restored: "bg-cyan-500",
  assigned: "bg-violet-500",
  transferred: "bg-fuchsia-500",
  note_added: "bg-slate-500",
  call_logged: "bg-sky-500",
  meeting_logged: "bg-orange-500",
  manual_email_logged: "bg-indigo-500",
  email_sent: "bg-sky-600",
  task_created: "bg-emerald-500",
  task_updated: "bg-indigo-500",
  task_completed: "bg-emerald-600",
  duplicate_detected: "bg-rose-500",
  merged: "bg-orange-500",
  comment_added: "bg-slate-700",
  status_changed: "bg-blue-500",
  page_view: "bg-teal-500"
};

function formatMetadataValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    if (Array.isArray(value)) return `[${value.length} items]`;
    return "{details}";
  }
  const str = String(value);
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/i.test(str)) {
    return str.replace(/_/g, " ");
  }
  return str;
}

const MONGO_ID_RE = /^[a-f0-9]{24}$/i;

function renderMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  // Handle standard before/after updates with visual diffs
  if (metadata.before && metadata.after) {
    const changes = [];
    Object.keys(metadata.after).forEach(key => {
      const beforeStr = JSON.stringify(metadata.before[key]);
      const afterStr = JSON.stringify(metadata.after[key]);
      if (beforeStr !== afterStr) {
        changes.push({
          field: key,
          from: formatMetadataValue(metadata.before[key]),
          to: formatMetadataValue(metadata.after[key])
        });
      }
    });

    if (changes.length > 0) {
      return (
        <div className="mt-2 space-y-1">
          {changes.map(change => (
            <div key={change.field} className="flex flex-wrap items-center gap-1.5 text-[9.5px]">
              <span className="font-bold uppercase tracking-wider text-slate-400 w-full sm:w-[110px] shrink-0">
                {change.field.replace(/[A-Z]/g, letter => ` ${letter}`).trim()}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="px-1.5 py-0.5 border border-rose-100 rounded bg-rose-50 text-rose-600 line-through min-w-0 truncate max-w-[130px]">
                  {change.from}
                </span>
                <span className="text-slate-300">→</span>
                <span className="px-1.5 py-0.5 border border-emerald-100 rounded bg-emerald-50 text-emerald-700 font-semibold min-w-0 truncate max-w-[130px]">
                  {change.to}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  // Filter out raw internal Mongo ObjectIds so timeline stays human-readable
  const displayKeys = Object.keys(metadata).filter(k => {
    const val = metadata[k];
    if (typeof val === "object" && !Array.isArray(val)) return false;
    if (typeof val === "string" && MONGO_ID_RE.test(val.trim())) return false;
    if (k.toLowerCase().endsWith("id") && typeof val === "string" && val.length >= 16) return false;
    return true;
  });

  if (displayKeys.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {displayKeys.map((key) => (
        <div key={key} className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
            {key.replace(/[A-Z]/g, letter => ` ${letter}`).trim()}:
          </span>
          <span className="text-[9.5px] font-semibold text-slate-700 truncate max-w-[180px] capitalize">
            {formatMetadataValue(metadata[key])}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ActivityTimeline({ items = [], emptyLabel = "No timeline activity yet." }) {
  const [filter, setFilter] = useState("all");

  const categories = [
    { id: "all", label: "All history", icon: null },
    { id: "interactions", label: "Interactions", types: ["note_added", "call_logged", "meeting_logged", "manual_email_logged", "email_sent", "comment_added"] },
    { id: "tasks", label: "Tasks", types: ["task_created", "task_updated", "task_completed"] },
    { id: "system", label: "Lifecycle", types: ["created", "updated", "archived", "restored", "assigned", "transferred", "status_changed", "duplicate_detected", "merged"] },
    { id: "web", label: "Web activity", types: ["page_view"] }
  ];

  const categoriesWithCounts = categories.map((cat) => ({
    ...cat,
    count: cat.id === "all"
      ? items.length
      : items.filter((item) => cat.types?.includes(item.type)).length
  }));

  const visibleCategories = categoriesWithCounts.filter((cat) => cat.id === "all" || cat.count > 0);

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    const cat = categories.find(c => c.id === filter);
    return cat?.types?.includes(item.type);
  });

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
        {visibleCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilter(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === cat.id 
                ? "bg-indigo-600 text-white" 
                : "bg-slate-100 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
            }`}
          >
            <span>{cat.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[8px] ${filter === cat.id ? "bg-white/20 text-white" : "bg-white text-slate-600"}`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200/70" key={filter}>
        {filteredItems.length > 0 ? filteredItems.map((item, index) => (
          <div key={item._id || `${item.type}-${index}`} className="relative flex gap-2.5">
            <div className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white ${TYPE_STYLES[item.type] || "bg-slate-400"}`} />
            <div className="flex-1 min-w-0 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-900 break-words leading-snug">{item.summary || item.title || item.type}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    {(item.actorName || "System")} {item.actorRole ? `• ${item.actorRole}` : ""}
                  </p>
                </div>
                <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap shrink-0">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              {item.metadata ? renderMetadata(item.metadata) : null}
            </div>
          </div>
        )) : (
          <div className="py-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">No activity in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
