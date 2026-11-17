import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function MasterModal({ isOpen, onClose, title, onSubmit, children, submitLabel = "Save Master" }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-[620px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50">
          <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {children}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-black dark:hover:bg-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
