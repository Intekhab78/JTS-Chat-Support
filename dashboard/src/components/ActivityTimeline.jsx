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
    if (Array.isArray(value)) return `[ ${value.length} items ]`;
    return "{ complex data }";
  }
  return String(value);
}

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
        <div className="mt-4 space-y-2">
          {changes.map(change => (
            <div key={change.field} className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px]">
              <span className="font-black uppercase tracking-widest text-slate-400 w-full md:w-[120px] shrink-0">
                {change.field.replace(/[A-Z]/g, letter => ` ${letter}`).trim()}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="px-2 border border-rose-100 py-1 rounded bg-rose-50 text-rose-600 line-through min-w-0 truncate max-w-[130px]">
                  {change.from}
                </span>
                <span className="text-slate-300">→</span>
                <span className="px-2 border border-emerald-100 py-1 rounded bg-emerald-50 text-emerald-700 font-bold min-w-0 truncate max-w-[130px]">
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

  // Handle other generic metadata as nice parameter chips
  const displayKeys = Object.keys(metadata).filter(k => 
    typeof metadata[k] !== 'object' || Array.isArray(metadata[k])
  );
  
  if (displayKeys.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {displayKeys.map((key) => (
        <div key={key} className="flex flex-col bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
            {key.replace(/[A-Z]/g, letter => ` ${letter}`).trim()}
          </span>
          <span className="text-[10px] font-bold text-slate-700 truncate mt-0.5">
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

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    const cat = categories.find(c => c.id === filter);
    return cat?.types?.includes(item.type);
  });

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              filter === cat.id 
                ? "bg-slate-900 text-white shadow-md" 
                : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 animate-in fade-in duration-300" key={filter}>
        {filteredItems.length > 0 ? filteredItems.map((item, index) => (
          <div key={item._id || `${item.type}-${index}`} className="relative flex gap-5">
            <div className={`relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white ${TYPE_STYLES[item.type] || "bg-slate-400"}`} />
            <div className="flex-1 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black text-slate-900">{item.summary || item.title || item.type}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {(item.actorName || "System")} {item.actorRole ? `• ${item.actorRole}` : ""}
                  </p>
                </div>
                <span className="text-[9px] font-bold uppercase text-slate-300">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              {item.metadata ? renderMetadata(item.metadata) : null}
            </div>
          </div>
        )) : (
          <div className="py-12 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">No activity in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
