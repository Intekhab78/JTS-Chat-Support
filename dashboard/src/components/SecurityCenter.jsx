import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";

export default function SecurityCenter() {
  const { user, setUser } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [message, setMessage] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);

  useEffect(() => {
    api("/api/audit-logs").then(setAuditLogs).catch((error) => {
      console.error("Failed to load audit logs:", error);
    });
    api("/api/webhooks/deliveries").then(setWebhookDeliveries).catch((error) => {
      console.error("Failed to load webhook deliveries:", error);
    });
  }, []);

  async function startSetup() {
    const data = await api("/api/auth/2fa/setup", { method: "POST" });
    setSetupData(data);
    setMessage("");
  }

  async function verifySetup() {
    await api("/api/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ code: verifyCode })
    });
    setUser({ ...user, twoFactorEnabled: true });
    setSetupData(null);
    setVerifyCode("");
    setMessage("Two-factor authentication enabled.");
  }

  async function disable2fa() {
    await api("/api/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify(disableForm)
    });
    setUser({ ...user, twoFactorEnabled: false });
    setDisableForm({ password: "", code: "" });
    setMessage("Two-factor authentication disabled.");
  }

  const paginatedAuditLogs = getPaginationMeta(auditLogs, auditPage);
  const paginatedDeliveries = getPaginationMeta(webhookDeliveries, deliveryPage);

  return (
    <div className="space-y-8">
      <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
        <h3 className="heading-md dark:text-white">Security Center</h3>
        <p className="small-label mt-2 dark:text-slate-500">Account protection, audit trail, and webhook delivery visibility.</p>
        {message && <div className="mt-4 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">{message}</div>}

        <div className="mt-6 rounded-3xl border border-slate-100 p-6 dark:border-white/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">Two-Factor Authentication</div>
              <div className="text-xs font-bold text-slate-400">{user?.twoFactorEnabled ? "Enabled" : "Disabled"}</div>
            </div>
            {!user?.twoFactorEnabled ? (
              <button onClick={startSetup} className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">
                Start Setup
              </button>
            ) : null}
          </div>

          {setupData && !user?.twoFactorEnabled && (
            <div className="mt-5 space-y-4 rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Add this secret in Google Authenticator or another TOTP app:</p>
              <div className="rounded-xl bg-white px-4 py-3 font-mono text-xs dark:bg-slate-900">{setupData.secret}</div>
              <div className="rounded-xl bg-white px-4 py-3 text-xs break-all dark:bg-slate-900">{setupData.otpAuthUrl}</div>
              <div className="flex gap-3">
                <input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:bg-slate-900 dark:border-white/5 dark:text-white"
                />
                <button onClick={verifySetup} className="rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">
                  Verify
                </button>
              </div>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-5 dark:bg-white/5">
              <input
                type="password"
                value={disableForm.password}
                onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
                placeholder="Current password"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:bg-slate-900 dark:border-white/5 dark:text-white"
              />
              <input
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                placeholder="Authenticator code"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold dark:bg-slate-900 dark:border-white/5 dark:text-white"
              />
              <button onClick={disable2fa} className="w-fit rounded-2xl bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white">
                Disable 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
          <h4 className="text-lg font-black text-slate-900 dark:text-white">Recent Audit Log</h4>
          <div className="mt-5 space-y-3">
            {paginatedAuditLogs.pageItems.map((log) => (
              <div key={log._id} className="rounded-2xl border border-slate-100 p-4 dark:border-white/5">
                <div className="text-xs font-black text-slate-900 dark:text-white">{log.action}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">{log.actorName} • {new Date(log.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <PaginationControls
            currentPage={paginatedAuditLogs.currentPage}
            totalPages={paginatedAuditLogs.totalPages}
            totalItems={paginatedAuditLogs.totalItems}
            itemLabel="audit logs"
            onPageChange={setAuditPage}
          />
        </div>

        <div className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
          <h4 className="text-lg font-black text-slate-900 dark:text-white">Webhook Deliveries</h4>
          <div className="mt-5 space-y-3">
            {paginatedDeliveries.pageItems.map((delivery) => (
              <div key={delivery._id} className="rounded-2xl border border-slate-100 p-4 dark:border-white/5">
                <div className="text-xs font-black text-slate-900 dark:text-white">{delivery.event}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">{delivery.endpointUrl}</div>
                <div className="mt-1 text-xs font-bold text-slate-400">Status: {delivery.responseStatus || "failed"} • {delivery.success ? "Success" : "Failed"}</div>
              </div>
            ))}
          </div>
          <PaginationControls
            currentPage={paginatedDeliveries.currentPage}
            totalPages={paginatedDeliveries.totalPages}
            totalItems={paginatedDeliveries.totalItems}
            itemLabel="deliveries"
            onPageChange={setDeliveryPage}
          />
        </div>
      </div>
    </div>
  );
}
