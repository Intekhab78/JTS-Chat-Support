import React, { useState } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { Bug, Terminal, Play, CheckCircle2, Clock, X, Code, Braces } from "lucide-react";

export function FlowDebuggerModal({ isOpen, onClose }) {
  const nodes = useFlowStore((s) => s.nodes);
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const mockExecution = () => {
    setIsRunning(true);
    setLogs([]);

    const rootNode = nodes.find((n) => n.id === "root");
    const simulatedLogs = [
      { step: 1, node: "root", type: "message", status: "SUCCESS", latency: "12ms", payload: { visitor_ip: "185.220.101.4", country: "UAE", device: "Desktop" } },
      { step: 2, node: rootNode?.data?.options?.[0]?.next || "support", type: rootNode?.data?.options?.[0]?.next ? "action" : "message", status: "SUCCESS", latency: "45ms", payload: { action: "escalate", department: "Technical Support" } }
    ];

    setTimeout(() => {
      setLogs(simulatedLogs);
      setIsRunning(false);
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-6 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
              <Bug size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                Flow Debugger & Execution Logs
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-tight">
                Simulate execution trace & variable evaluations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={mockExecution}
              disabled={isRunning}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {isRunning ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={13} fill="currentColor" />}
              <span>Dry Run</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Debug Logs Console */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 font-mono text-xs">
          {logs.length === 0 && !isRunning && (
            <div className="text-center py-12 text-slate-400 font-sans space-y-2">
              <Terminal size={36} className="mx-auto opacity-20" />
              <p className="text-xs font-bold uppercase tracking-wider">No Execution Logs Recorded</p>
              <p className="text-[11px] opacity-70">Click "Dry Run" to trace variable resolution and step-by-step logic execution.</p>
            </div>
          )}

          {logs.map((log, idx) => (
            <div key={idx} className="bg-slate-950 text-slate-200 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-indigo-400 font-black flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Step #{log.step}: Node [{log.node}]
                </span>
                <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                  <Clock size={11} /> {log.latency}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl text-[10px] text-slate-300">
                <span className="text-purple-400 font-bold block mb-1">Evaluated Context Variables:</span>
                <pre className="text-emerald-400 overflow-x-auto">{JSON.stringify(log.payload, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
