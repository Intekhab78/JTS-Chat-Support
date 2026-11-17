import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck,
  Lock,
  Key,
  RefreshCw,
  Copy,
  Check,
  Activity,
  Radio,
  Download,
  Eye,
  EyeOff,
  X,
  Search
} from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useToast } from "../context/ToastContext.jsx";
import { exportToCsv } from "../utils/exportUtils.js";

export default function SecurityCenter({ websiteId }) {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  // Filters & Pagination
  const [auditPage, setAuditPage] = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [webhookSearch, setWebhookSearch] = useState("");
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("all");

  // Detail modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const q = websiteId ? `?websiteId=${websiteId}` : "";
      const [logs, deliveries, meRes] = await Promise.all([
        api(`/api/audit-logs${q}`).catch(() => []),
        api(`/api/webhooks/deliveries${q}`).catch(() => []),
        api("/api/auth/me").catch(() => null)
      ]);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setWebhookDeliveries(Array.isArray(deliveries) ? deliveries : []);
      if (meRes?.user) {
        setUser(meRes.user);
      }
    } catch (err) {
      console.error("Failed to load security data:", err);
    } finally {
      setLoading(false);
    }
  }, [websiteId, setUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedLog) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedLog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedLog]);

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
      loadData();
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
      loadData();
    } catch (err) {
      toast.error("Failed to disable 2FA: " + err.message);
    }
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const entityTypes = useMemo(() => {
    const set = new Set(auditLogs.map(l => l.entityType).filter(Boolean));
    return Array.from(set).sort();
  }, [auditLogs]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase();
        return (
          (log.action || "").toLowerCase().includes(q) ||
          (log.actorName || "").toLowerCase().includes(q) ||
          (log.entityType || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, auditSearch, entityFilter]);

  const filteredDeliveries = useMemo(() => {
    return webhookDeliveries.filter(d => {
      const isOk = Boolean(d.success || d.responseStatus === 200);
      if (webhookStatusFilter === "success" && !isOk) return false;
      if (webhookStatusFilter === "failed" && isOk) return false;
      if (webhookSearch.trim()) {
        const q = webhookSearch.toLowerCase();
        return (
          (d.event || "").toLowerCase().includes(q) ||
          (d.endpointUrl || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [webhookDeliveries, webhookSearch, webhookStatusFilter]);

  const failedWebhooksCount = useMemo(() => {
    return webhookDeliveries.filter(d => !(d.success || d.responseStatus === 200)).length;
  }, [webhookDeliveries]);

  const paginatedAuditLogs = getPaginationMeta(filteredAuditLogs, auditPage);
  const paginatedDeliveries = getPaginationMeta(filteredDeliveries, deliveryPage);

  return (
    <div className="space-y-3">
      {/* ── Clean White Header ───────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">
              Security Center & Compliance Hardening
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              Two-factor authentication (TOTP), administrative audit trail & webhook delivery health
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const cols = [
                { key: "action", label: "Action" },
                { key: "actorName", label: "Actor" },
                { key: "entityType", label: "Entity Type" },
                { key: "ipAddress", label: "IP Address" },
                { key: "createdAt", label: "Timestamp", accessor: (r) => new Date(r.createdAt).toISOString() }
              ];
              exportToCsv(filteredAuditLogs, cols, "Security_Audit_Logs");
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            Export Audit CSV
          </button>
          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 cursor-pointer"
            title="Refresh security records"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Clean White KPI Cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            2FA Protection
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-lg font-bold ${user?.twoFactorEnabled ? "text-emerald-600" : "text-amber-600"}`}>
              {user?.twoFactorEnabled ? "Active" : "Disabled"}
            </span>
            <span className="text-[10px] text-slate-500">TOTP Authenticator</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Audit Events
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900">{auditLogs.length}</span>
            <span className="text-[10px] text-indigo-600 font-medium">{filteredAuditLogs.length} matched</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Webhook Deliveries
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-lg font-bold text-slate-900">{webhookDeliveries.length}</span>
            <span className="text-[10px] text-slate-500">Gateway + CRM</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
            Failed Webhooks
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-lg font-bold ${failedWebhooksCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {failedWebhooksCount}
            </span>
            <span className="text-[10px] text-slate-500">Delivery errors</span>
          </div>
        </div>
      </div>

      {/* ── Two-Factor Authentication Card ───────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 ${
              user?.twoFactorEnabled ? "bg-emerald-600" : "bg-indigo-600"
            }`}>
              <Lock size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900">Two-Factor Authentication (2FA)</h4>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                  user?.twoFactorEnabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {user?.twoFactorEnabled ? "Active & Protected" : "Disabled"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Protect your account with Google Authenticator or any TOTP app.
              </p>
            </div>
          </div>

          {!user?.twoFactorEnabled && !setupData && (
            <button
              type="button"
              onClick={startSetup}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0"
            >
              Start 2FA Setup
            </button>
          )}
        </div>

        {/* 2FA Setup Form */}
        {setupData && !user?.twoFactorEnabled && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Key size={13} className="text-indigo-600" /> Authenticator Secret Key
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(setupData.secret, "Secret Key")}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "Secret Key" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  Copy Secret
                </button>
                {setupData.otpAuthUrl && (
                  <button
                    type="button"
                    onClick={() => handleCopy(setupData.otpAuthUrl, "OTPAuth URI")}
                    className="text-[11px] font-semibold text-slate-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "OTPAuth URI" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    Copy OTPAuth URI
                  </button>
                )}
              </div>
            </div>

            <div className="p-2 rounded-md bg-white border border-slate-200 font-mono text-xs font-bold text-indigo-700 tracking-widest text-center select-all">
              {setupData.secret}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code from Authenticator app"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 text-center tracking-widest"
                maxLength={6}
              />
              <button
                type="button"
                onClick={verifySetup}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Verify & Enable
              </button>
              <button
                type="button"
                onClick={() => setSetupData(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* 2FA Disable Form */}
        {user?.twoFactorEnabled && (
          <div className="mt-3 p-3.5 rounded-lg bg-rose-50/50 border border-rose-200 space-y-2">
            <p className="text-xs font-bold text-rose-700">Disable Two-Factor Authentication</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <input
                  type={disableForm.showPassword ? "text" : "password"}
                  value={disableForm.password}
                  onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
                  placeholder="Account password"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-9 py-1.5 text-xs outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setDisableForm({ ...disableForm, showPassword: !disableForm.showPassword })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title={disableForm.showPassword ? "Hide password" : "Show password"}
                >
                  {disableForm.showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="6-digit TOTP code"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-rose-500"
                maxLength={6}
              />
              <button
                type="button"
                onClick={disable2fa}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2-Column Audit Logs & Webhooks Grid ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Audit Log */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-600" /> Administrative Audit Log
              </h4>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {filteredAuditLogs.length} Events
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2.5">
              <div className="relative sm:col-span-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={auditSearch}
                  onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                  placeholder="Search action or actor..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                />
              </div>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setAuditPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="all">All Entities</option>
                {entityTypes.map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              {paginatedAuditLogs.pageItems.map((log) => (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {log.actorName || "System"} • {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {log.entityType && (
                      <span className="px-1.5 py-0.5 bg-white text-slate-600 text-[9px] font-semibold uppercase rounded border border-slate-200">
                        {log.entityType}
                      </span>
                    )}
                    <Eye size={12} className="text-slate-400" />
                  </div>
                </div>
              ))}

              {filteredAuditLogs.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No audit logs found matching your criteria.
                </div>
              )}
            </div>
          </div>

          {filteredAuditLogs.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-100">
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Radio size={14} className="text-emerald-600" /> Webhook Deliveries & Health
              </h4>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {filteredDeliveries.length} Deliveries
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2.5">
              <div className="relative sm:col-span-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={webhookSearch}
                  onChange={(e) => { setWebhookSearch(e.target.value); setDeliveryPage(1); }}
                  placeholder="Search event or endpoint URL..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
                />
              </div>
              <select
                value={webhookStatusFilter}
                onChange={(e) => { setWebhookStatusFilter(e.target.value); setDeliveryPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              {paginatedDeliveries.pageItems.map((delivery) => {
                const isOk = Boolean(delivery.success || delivery.responseStatus === 200);
                return (
                  <div key={delivery._id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {delivery.event}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isOk ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {delivery.responseStatus || (isOk ? "200" : "Failed")}
                        </span>
                        {delivery.latencyMs !== null && delivery.latencyMs !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono">{delivery.latencyMs}ms</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[280px]">
                        {delivery.endpointUrl} • {new Date(delivery.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOk ? "bg-emerald-500" : "bg-rose-500"}`} />
                  </div>
                );
              })}

              {filteredDeliveries.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No webhook deliveries recorded yet. Outbound CRM & gateway webhooks appear here automatically.
                </div>
              )}
            </div>
          </div>

          {filteredDeliveries.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-100">
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

      {/* ── Audit Event Detail Modal (Portal) ────────────────── */}
      {selectedLog && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setSelectedLog(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{selectedLog.action}</h4>
                <p className="text-[10px] text-slate-500">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block">Actor</span>
                  <span className="font-semibold text-slate-800">{selectedLog.actorName || "System"}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block">Entity Type</span>
                  <span className="font-semibold text-slate-800">{selectedLog.entityType || "—"}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block">IP Address</span>
                  <span className="font-mono text-slate-700">{selectedLog.ipAddress || "—"}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block">Entity ID</span>
                  <span className="font-mono text-slate-700 truncate block">{selectedLog.entityId || "—"}</span>
                </div>
              </div>
              {(selectedLog.metadata || selectedLog.changes) && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block mb-1">Payload / Changes</span>
                  <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata || selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
