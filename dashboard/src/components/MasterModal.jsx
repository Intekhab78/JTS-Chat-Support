import { useEffect } from "react";
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-[650px] sm:w-[90%] md:w-[650px] bg-white rounded-[32px] border border-slate-200 shadow-[0_32px_90px_-24px_rgba(15,23,42,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {children}
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 text-white px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
