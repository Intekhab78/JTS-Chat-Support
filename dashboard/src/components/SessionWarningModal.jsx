import { useEffect, useRef } from "react";
import { Clock, X } from "lucide-react";

/**
 * Session timeout warning modal.
 * Shows when the user's session is about to expire.
 */
export default function SessionWarningModal({
    open,
    onExtend,
    onLogout,
    loading = false,
}) {
    const extendBtnRef = useRef(null);

    // Focus the extend button when modal opens
    useEffect(() => {
        if (open) {
            setTimeout(() => extendBtnRef.current?.focus(), 50);
        }
    }, [open]);

    // Close on Escape (logout)
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === "Escape") onLogout?.(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onLogout]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onLogout}
            />

            {/* Dialog */}
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="session-modal-title"
                aria-describedby="session-modal-desc"
                className="fixed inset-0 z-[9991] flex items-center justify-center p-4 pointer-events-none"
            >
                <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-white/5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">

                    {/* Header */}
                    <div className="flex items-start justify-between p-6 pb-0">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Clock size={20} />
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 pt-4 pb-6">
                        <h3
                            id="session-modal-title"
                            className="text-sm font-black text-slate-900 dark:text-white tracking-tight mb-2"
                        >
                            Session Expiring Soon
                        </h3>
                        <p
                            id="session-modal-desc"
                            className="text-[12px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed"
                        >
                            Your session will expire in 5 minutes. Would you like to extend your session or log out now?
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 px-6 pb-6">
                        <button
                            onClick={onLogout}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all disabled:opacity-50"
                        >
                            Log Out
                        </button>
                        <button
                            ref={extendBtnRef}
                            onClick={onExtend}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/40 shadow-indigo-200 dark:shadow-indigo-900/40 shadow-xl focus:outline-none focus:ring-4 transition-all disabled:opacity-60"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Extending...
                                </span>
                            ) : "Extend Session"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}