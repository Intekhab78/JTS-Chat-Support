import React from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { MessageSquare, Zap, Network, Bot, Globe, LayoutGrid, Clipboard, Plus } from "lucide-react";

export function CanvasContextMenu({ position, onClose }) {
  const addNode = useFlowStore((s) => s.addNode);
  const pasteNode = useFlowStore((s) => s.pasteNode);
  const copiedNode = useFlowStore((s) => s.copiedNode);

  if (!position) return null;

  const handleAdd = (type) => {
    addNode(type, { x: position.x, y: position.y });
    onClose();
  };

  const handlePaste = () => {
    pasteNode({ x: position.x, y: position.y });
    onClose();
  };

  return (
    <div
      className="fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 w-56 text-xs font-bold text-slate-700 dark:text-slate-200 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{ top: position.clientY, left: position.clientX }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
        Quick Add Node
      </div>

      <button
        onClick={() => handleAdd("message")}
        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all"
      >
        <MessageSquare size={14} className="text-blue-500" /> Add Message
      </button>

      <button
        onClick={() => handleAdd("ai_response")}
        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all"
      >
        <Bot size={14} className="text-violet-500" /> Add AI Agent
      </button>

      <button
        onClick={() => handleAdd("condition")}
        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all"
      >
        <Network size={14} className="text-purple-500" /> Add Condition (IF/THEN)
      </button>

      <button
        onClick={() => handleAdd("action")}
        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all"
      >
        <Zap size={14} className="text-amber-500" /> Add Action Execution
      </button>

      <button
        onClick={() => handleAdd("webhook")}
        className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all"
      >
        <Globe size={14} className="text-indigo-500" /> Add Webhook / REST API
      </button>

      {copiedNode && (
        <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
          <button
            onClick={handlePaste}
            className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-all text-indigo-600 dark:text-indigo-400"
          >
            <Clipboard size={14} /> Paste Node ({copiedNode.id})
          </button>
        </div>
      )}
    </div>
  );
}
