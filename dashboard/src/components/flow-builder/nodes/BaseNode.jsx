import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { useFlowStore } from "../store/useFlowStore.js";
import { AlertCircle, AlertTriangle, Copy, Trash, Eye, TrendingDown, CheckCircle2, Clock } from "lucide-react";

export const BaseNode = memo(function BaseNode({ id, data, selected, title, icon: Icon, colorClass, badgeText, children }) {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const duplicateNode = useFlowStore((s) => s.duplicateNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const analytics = useFlowStore((s) => s.analytics);
  const validation = useFlowStore((s) => s.validation);

  const isSelected = selectedNodeId === id || selected;
  const isRoot = id === "root";

  // Validation status
  const hasError = validation.errors.some((e) => e.node === id);
  const hasWarning = validation.warnings.some((w) => w.node === id);

  // Performance Heatmap Metrics (Visits, Clicks, Drop-off, Conversion Rate, Avg Time)
  const stats = analytics?.nodeStats?.[id];
  const visits = stats?.visits || 0;
  const dropOffs = stats?.dropOffs || 0;
  const avgTimeSec = stats?.avgTimeSeconds || 4;
  const completions = visits > 0 ? visits - dropOffs : 0;
  const completionRate = visits > 0 ? Math.round((completions / visits) * 100) : 100;
  const dropOffRate = visits > 0 ? Math.round((dropOffs / visits) * 100) : 0;

  // Performance Color Coding (Green, Yellow, Orange, Red)
  let heatBorderClass = "border-slate-200/90 dark:border-slate-800";
  let heatBadge = null;

  if (visits > 0) {
    if (dropOffRate > 50) {
      // Red: Critical Drop-off (>50%)
      heatBorderClass = "border-red-500 shadow-red-500/10";
      heatBadge = { text: `${dropOffRate}% Drop`, class: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
    } else if (dropOffRate >= 30) {
      // Orange: High Drop-off (30-50%)
      heatBorderClass = "border-orange-500 shadow-orange-500/10";
      heatBadge = { text: `${dropOffRate}% Drop`, class: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" };
    } else if (dropOffRate >= 15) {
      // Yellow: Moderate Drop-off (15-30%)
      heatBorderClass = "border-amber-400 shadow-amber-500/10";
      heatBadge = { text: `${dropOffRate}% Drop`, class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    } else {
      // Green: Healthy High Completion (<15% Drop-off)
      heatBorderClass = "border-emerald-500/80 shadow-emerald-500/10";
      heatBadge = { text: `${completionRate}% Done`, class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    }
  }

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-80 bg-white dark:bg-slate-900 rounded-3xl border-2 transition-all duration-200 ease-out shadow-xl hover:shadow-2xl hover:scale-[1.015] ${
        isSelected
          ? "border-indigo-500 shadow-indigo-500/25 ring-4 ring-indigo-500/15"
          : hasError
          ? "border-red-500 shadow-red-500/20"
          : hasWarning
          ? "border-amber-500 shadow-amber-500/20"
          : heatBorderClass
      }`}
    >
      {/* Connection Handle */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !bg-indigo-600 !border-2 !border-white dark:!border-slate-900 !-left-2 shadow-md"
        />
      )}

      {/* Header */}
      <div className={`p-3.5 rounded-t-[14px] flex items-center justify-between border-b ${colorClass}`}>
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-black/30 shadow-xs backdrop-blur-xs">
            {Icon && <Icon size={16} className="shrink-0" />}
          </div>
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-slate-800 dark:text-white uppercase truncate">
                {id}
              </span>
              {heatBadge && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase border ${heatBadge.class}`}>
                  {heatBadge.text}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {badgeText || data.type}
              </span>
              <span className="text-[8px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">
                {(data.options?.length || 0) + (data.next ? 1 : 0) + (data.trueNext ? 1 : 0) + (data.falseNext ? 1 : 0)} links
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              useFlowStore.setState({ showHelpDrawer: true });
            }}
            title={`View ${data.type} Documentation`}
            className="p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-all font-black text-xs"
          >
            ?
          </button>
          {hasError && <AlertCircle size={14} className="text-red-500" title="Validation Error" />}
          {!hasError && hasWarning && <AlertTriangle size={14} className="text-amber-500" title="Validation Warning" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            title="Duplicate Node"
            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all"
          >
            <Copy size={13} />
          </button>
          {!isRoot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
              }}
              title="Delete Node"
              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            >
              <Trash size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3.5 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
        {children}
      </div>

      {/* Performance Analytics Dashboard Footer */}
      {visits > 0 && (
        <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 rounded-b-[14px] flex items-center justify-between text-[9px] font-bold text-slate-500">
          <span className="flex items-center gap-1">
            <Eye size={11} className="text-indigo-500" /> {visits} Visits
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-500" /> {completionRate}% Rate
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-slate-400" /> {avgTimeSec}s Avg
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown size={11} className={dropOffs > 0 ? "text-rose-500" : "text-slate-400"} /> {dropOffs} Drop
          </span>
        </div>
      )}
    </div>
  );
});
