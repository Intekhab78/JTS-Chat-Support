import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800/50 dark:text-emerald-300",
  error: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800/50 dark:text-rose-300",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/60 dark:border-amber-800/50 dark:text-amber-300",
  info: "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800/50 dark:text-indigo-300",
};

const ICON_STYLES = {
  success: "text-emerald-500",
  error: "text-rose-500",
  warning: "text-amber-500",
  info: "text-indigo-500",
};

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  // Convenience helpers
  toast.success = (msg, dur) => toast(msg, "success", dur);
  toast.error   = (msg, dur) => toast(msg, "error",   dur ?? 6000);
  toast.warning = (msg, dur) => toast(msg, "warning", dur);
  toast.info    = (msg, dur) => toast(msg, "info",    dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }) {
  const Icon = ICONS[t.type] || Info;
  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl
        backdrop-blur-md animate-in slide-in-from-bottom-3 fade-in duration-300
        ${STYLES[t.type]}
      `}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${ICON_STYLES[t.type]}`} />
      <p className="flex-1 text-[12px] font-bold leading-snug">{t.message}</p>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}
