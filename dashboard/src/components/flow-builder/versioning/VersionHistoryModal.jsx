import React from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { History, RotateCcw, X, Clock, Check } from "lucide-react";

export function VersionHistoryModal() {
  const showVersionHistory = useFlowStore((s) => s.showVersionHistory);
  const setShowVersionHistory = useFlowStore((s) => s.setShowVersionHistory);
  const history = useFlowStore((s) => s.history);
  const historyIndex = useFlowStore((s) => s.historyIndex);
  const restoreVersionSnapshot = useFlowStore((s) => s.restoreVersionSnapshot);

  if (!showVersionHistory) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-6 select-none"
      onClick={() => setShowVersionHistory(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
              <History size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-wide text-sm">
                Flow Version History
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {history.length} Saved Snapshots
              </p>
            </div>
          </div>
          <button onClick={() => setShowVersionHistory(false)} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Revisions List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {history.map((rev, idx) => {
            const isCurrent = idx === historyIndex;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  isCurrent
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/50"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock size={16} className={isCurrent ? "text-indigo-600" : "text-slate-400"} />
                  <div>
                    <div className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                      Snapshot #{idx + 1}
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white uppercase flex items-center gap-1">
                          <Check size={10} /> Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {rev.timestamp || "—"} · {rev.nodes?.length || 0} Nodes
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => restoreVersionSnapshot(idx)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
