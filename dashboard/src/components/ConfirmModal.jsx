import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * Reusable confirmation dialog for destructive actions.
 *
 * Usage:
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="Delete Lead"
 *     message="This will permanently remove the lead and all associated data. This cannot be undone."
 *     confirmLabel="Delete"
 *     variant="danger"        // "danger" | "warning" | "default"
 *     loading={deleting}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  // Focus the confirm button when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
      btn: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/40 shadow-rose-200 dark:shadow-rose-900/40",
    },
    warning: {
      icon: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
      btn: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/40 shadow-amber-200 dark:shadow-amber-900/40",
    },
    default: {
      icon: "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      btn: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/40 shadow-indigo-200 dark:shadow-indigo-900/40",
    },
  };

  const s = variantStyles[variant] || variantStyles.default;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="fixed inset-0 z-[9991] flex items-center justify-center p-4 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-white/5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.icon}`}>
              {variant === "danger"
                ? <Trash2 size={20} />
                : <AlertTriangle size={20} />
              }
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pt-4 pb-6">
            <h3
              id="confirm-modal-title"
              className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-2"
            >
              {title}
            </h3>
            <p
              id="confirm-modal-desc"
              className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed"
            >
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl focus:outline-none focus:ring-4 transition-all disabled:opacity-60 ${s.btn}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
