import React, { useState } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { Sparkles, ArrowRight, ArrowLeft, Check, X } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Welcome to the Visual Flow Engine! 🚀",
    description: "Build automated, interactive website chatbot workflows visually without writing code.",
    highlight: "canvas"
  },
  {
    title: "1. Visual Canvas Grid",
    description: "Drag nodes across the grid, connect handles, and zoom or pan seamlessly across your decision tree graph.",
    highlight: "canvas"
  },
  {
    title: "2. Left Sidebar Palette",
    description: "Drag new node types (Message, Form, Action, Condition, AI Agent) onto your canvas or search active nodes.",
    highlight: "sidebar"
  },
  {
    title: "3. Top Toolbar Controls",
    description: "Access Undo/Redo, Auto Layout, Test Simulator, Version History, Draft/Published toggle, and Save Engine.",
    highlight: "toolbar"
  },
  {
    title: "4. Right Inspector Panel",
    description: "Click any node to configure its message text, quick reply buttons, form inputs, action targets, and view analytics.",
    highlight: "inspector"
  },
  {
    title: "5. Real-Time Validation & Simulator",
    description: "The Flow Health shield detects broken links, dead ends, and orphan nodes. Test your chatbot live in the simulator before publishing!",
    highlight: "simulator"
  }
];

export function FlowProductTourModal({ isOpen, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[stepIdx];

  const handleNext = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-white/10 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Sparkles size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Step {stepIdx + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
            {step.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {step.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((stepIdx + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <ArrowLeft size={14} />
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <span>{stepIdx === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next"}</span>
              {stepIdx === TOUR_STEPS.length - 1 ? <Check size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
