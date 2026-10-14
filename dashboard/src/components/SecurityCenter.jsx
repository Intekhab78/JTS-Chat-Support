import { useEffect, useState, useMemo } from "react";
import { 
  ShieldCheck, ShieldAlert, Lock, Key, CheckCircle2, AlertTriangle, 
  RefreshCw, Copy, Check, ExternalLink, Activity, Radio, ArrowRight, Zap
} from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useToast } from "../context/ToastContext.jsx";

export default function SecurityCenter() {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [logs, deliveries] = await Promise.all([
        api("/api/audit-logs").catch(() => []),
        api("/api/webhooks/deliveries").catch(() => [])
      ]);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setWebhookDeliveries(Array.isArray(deliveries) ? deliveries : []);
    } catch (err) {
      console.error("Failed to load security data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function startSetup() {
    try {
      const data = await api("/api/auth/2fa/setup", { method: "POST" });
      setSetupData(data);
    } catch (err) {
      toast.error("Failed to initiate 2FA setup: " + err.message);
    }
  }

  async function verifySetup() {
    if (!verifyCode || verifyCode.length < 6) {
      toast.error("Please enter a valid 6-digit authentication code.");
      return;
    }
    try {
      await api("/api/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode })
      });
      setUser({ ...user, twoFactorEnabled: true });
      setSetupData(null);
      setVerifyCode("");
      toast.success("Two-Factor Authentication successfully enabled!");
    } catch (err) {
      toast.error("Verification failed: " + err.message);
    }
  }

  async function disable2fa() {
    if (!disableForm.password || !disableForm.code) {
      toast.error("Please enter both your password and 2FA code.");
      return;
    }
    try {
      await api("/api/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify(disableForm)
      });
      setUser({ ...user, twoFactorEnabled: false });
      setDisableForm({ password: "", code: "" });
      toast.success("Two-Factor Authentication disabled.");
    } catch (err) {
      toast.error("Failed to disable 2FA: " + err.message);
    }
  }

  const handleCopySecret = (secret) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    toast.success("2FA Secret copied to clipboard!");
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(log => 
      (log.action || "").toLowerCase().includes(q) ||
      (log.actorName || "").toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const paginatedAuditLogs = getPaginationMeta(filteredAuditLogs, auditPage);
  const paginatedDeliveries = getPaginationMeta(webhookDeliveries, deliveryPage);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-500">
      
      {/* ── Compact Executive Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 py-3.5 sm:px-5 sm:py-4 text-white border border-indigo-500/20 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-60 h-60 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-500/30 inline-flex items-center gap-1">
                <ShieldCheck size={11} className="text-indigo-400" /> Account Shield & Hardening
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Security Center & Compliance Hardening
            </h2>
            <p className="text-[11px] text-slate-300 font-medium leading-normal">
              Two-factor authentication, administrative audit trail, and real-time webhook delivery visibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Posture Metrics */}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">2FA</span>
                <span className={`text-xs font-black ${user?.twoFactorEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {user?.twoFactorEnabled ? "Active" : "Off"}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block leading-none mb-0.5">Audit Logs</span>
                <span className="text-xs font-black text-white">{auditLogs.length}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block leading-none mb-0.5">Webhooks</span>
                <span className="text-xs font-black text-white">{webhookDeliveries.length}</span>
              </div>
            </div>

            <button
              onClick={loadData}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              title="Refresh security records"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Two-Factor Authentication Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              user?.twoFactorEnabled ? 'bg-emerald-600' : 'bg-slate-900 dark:bg-indigo-600'
            }`}>
              <Lock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                  user?.twoFactorEnabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {user?.twoFactorEnabled ? "🟢 Active & Protected" : "⚪ Disabled"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                Protect your agent and client administrative account with Google Authenticator or any TOTP mobile application.
              </p>
            </div>
          </div>

          {!user?.twoFactorEnabled && !setupData && (
            <button 
              onClick={startSetup} 
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all hover:scale-[1.02] shrink-0"
            >
              Start 2FA Setup
            </button>
          )}
        </div>

        {/* 2FA Setup Form */}
        {setupData && !user?.twoFactorEnabled && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Key size={14} className="text-indigo-600" /> Authenticator Secret Key:
              </span>
              <button 
                type="button"
                onClick={() => handleCopySecret(setupData.secret)}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                {copiedSecret ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                {copiedSecret ? "Copied!" : "Copy Secret"}
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 font-mono text-xs font-black text-indigo-600 tracking-widest text-center select-all">
              {setupData.secret}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code (e.g. 123456)"
                className="flex-1 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-center tracking-widest"
                maxLength={6}
              />
              <button 
                onClick={verifySetup} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all"
              >
                Verify & Enable
              </button>
              <button 
                onClick={() => setSetupData(null)} 
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* 2FA Disable Form */}
        {user?.twoFactorEnabled && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 space-y-2.5">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Disable Two-Factor Authentication</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="password"
                value={disableForm.password}
                onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
                placeholder="Account password"
                className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
              <input
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="6-digit TOTP code"
                className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-rose-500"
                maxLength={6}
              />
            </div>
            <button 
              onClick={disable2fa} 
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-black uppercase tracking-wider text-white transition-all shadow-xs"
            >
              Disable 2FA
            </button>
          </div>
        )}
      </div>

      {/* ── 2-Column Audit Logs & Webhooks Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        
        {/* Left: Audit Log */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-600" /> Administrative Audit Log
              </h4>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {auditLogs.length} Events
              </span>
            </div>

            <div className="mb-3">
              <input
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                placeholder="Quick search action or actor name..."
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              {paginatedAuditLogs.pageItems.map((log) => (
                <div key={log._id} className="p-2.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-2 hover:bg-indigo-50/30 transition-colors">
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block truncate">
                      {log.actorName || "System"} • {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded border border-indigo-100 dark:border-indigo-900/30 shrink-0">
                    Audit
                  </span>
                </div>
              ))}

              {filteredAuditLogs.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  No audit logs found.
                </div>
              )}
            </div>
          </div>

          {filteredAuditLogs.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5">
              <PaginationControls
                currentPage={paginatedAuditLogs.currentPage}
                totalPages={paginatedAuditLogs.totalPages}
                totalItems={paginatedAuditLogs.totalItems}
                itemLabel="logs"
                onPageChange={setAuditPage}
              />
            </div>
          )}
        </div>

        {/* Right: Webhook Deliveries */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Radio size={14} className="text-emerald-600" /> Webhook Deliveries & Health
              </h4>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {webhookDeliveries.length} Deliveries
              </span>
            </div>

            <div className="space-y-2">
              {paginatedDeliveries.pageItems.map((delivery) => {
                const isOk = delivery.success || delivery.responseStatus === 200;
                return (
                  <div key={delivery._id} className="p-2.5 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-2 hover:bg-emerald-50/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {delivery.event || "webhook.dispatch"}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                          isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {delivery.responseStatus || (isOk ? "200 OK" : "Failed")}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold block truncate max-w-[260px]">
                        {delivery.endpointUrl || "https://api.internal/webhook"}
                      </span>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </div>
                );
              })}

              {webhookDeliveries.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  No webhook deliveries registered yet.
                </div>
              )}
            </div>
          </div>

          {webhookDeliveries.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5">
              <PaginationControls
                currentPage={paginatedDeliveries.currentPage}
                totalPages={paginatedDeliveries.totalPages}
                totalItems={paginatedDeliveries.totalItems}
                itemLabel="deliveries"
                onPageChange={setDeliveryPage}
              />
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
