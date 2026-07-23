import React from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { FLOW_TEMPLATES } from "./flowTemplatesData.js";
import { convertDictToReactFlow } from "../utils/graphConverter.js";
import { getLayoutedElements } from "../utils/autoLayout.js";
import { LayoutTemplate, ArrowRight, X, Sparkles, Check } from "lucide-react";

export function FlowTemplatesModal() {
  const showTemplatesModal = useFlowStore((s) => s.showTemplatesModal);
  const setShowTemplatesModal = useFlowStore((s) => s.setShowTemplatesModal);

  if (!showTemplatesModal) return null;

  const handleSelectTemplate = (template) => {
    if (window.confirm(`Load template "${template.name}"? This will replace current canvas nodes.`)) {
      const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(template.nodes);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, "LR");

      useFlowStore.setState({
        nodes: layoutedNodes,
        edges: layoutedEdges,
        selectedNodeId: "root",
        isDirty: true,
        showTemplatesModal: false
      });

      useFlowStore.getState().recordHistory(layoutedNodes, layoutedEdges);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-6 select-none"
      onClick={() => setShowTemplatesModal(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
              <LayoutTemplate size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-base">
                Chatbot Flow Templates Library
              </h3>
              <p className="text-xs text-slate-400 font-medium">Select a pre-built workflow to populate your canvas</p>
            </div>
          </div>
          <button onClick={() => setShowTemplatesModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FLOW_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="group cursor-pointer p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 hover:shadow-xl transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                    {tpl.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Object.keys(tpl.nodes).length} Nodes
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-all">
                  {tpl.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-all">
                <span>Use This Template</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
