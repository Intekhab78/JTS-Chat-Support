import React from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { ShieldCheck, ShieldX, AlertCircle, AlertTriangle, Check, X } from "lucide-react";

export function DiagnosticsModal() {
  const showDiagnostics = useFlowStore((s) => s.showDiagnostics);
  const setShowDiagnostics = useFlowStore((s) => s.setShowDiagnostics);
  const validation = useFlowStore((s) => s.validation);
  const nodes = useFlowStore((s) => s.nodes);

  if (!showDiagnostics) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-6"
      onClick={() => setShowDiagnostics(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-100 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
              {validation.isValid ? <ShieldCheck size={18} className="text-emerald-500" /> : <ShieldX size={18} className="text-red-500" />}
              Flow Tree Validation Diagnostics
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-wider">
              {validation.errors.length} Errors · {validation.warnings.length} Warnings · {validation.totalNodesCount} Total Nodes
            </p>
          </div>
          <button onClick={() => setShowDiagnostics(false)} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Diagnostic Results List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {validation.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                Critical Errors (Must fix to save/publish)
              </p>
              <div className="space-y-1.5">
                {validation.errors.map((e, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-800/30">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Warnings</p>
              <div className="space-y-1.5">
                {validation.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-800/30">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validation.isValid && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Check size={18} />
              <span>Flow graph structure is completely valid and safe for production publish.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
