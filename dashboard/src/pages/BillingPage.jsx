import { useState, useEffect, useMemo } from "react";
import { CreditCard, Zap, Shield, Crown, AlertTriangle, ExternalLink, ArrowUpRight, CheckCircle2, RefreshCw } from "lucide-react";
import { api } from "../api/client.js";
import PricingPage from "./PricingPage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function BillingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // "monthly" | "annual"

  const expiresAt = data?.subscription?.expiresAt;
  const isExpiringSoon = useMemo(() => {
    if (!expiresAt) return false;
    const diffTime = new Date(expiresAt) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }, [expiresAt]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api("/api/billing/status");
      setData(res);
    } catch (err) {
      console.error("Failed to load billing status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handlePortal = async () => {
    try {
      const { url } = await api("/api/billing/portal", { method: "POST" });
      window.location.href = url;
    } catch (err) {
      toast.error("Could not open billing portal: " + err.message);
    }
  };

  if (loading) return (
     <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Syncing billing data...</p>
     </div>
  );

  const isExpired = data?.subscription?.status === "expired" || data?.subscription?.status === "suspended";
  const currentPlan = data?.subscription?.plan || "pro";

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
                <Crown size={11} className="text-amber-400" /> Platform Tier & Quotas
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Billing & Subscription Command Center
            </h2>
            <p className="text-[11px] text-slate-300 font-medium leading-normal">
              Manage platform subscription, quotas, included enterprise modules, and upgrade pathways.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Metrics */}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Tier</span>
                <span className="text-xs font-black text-amber-300 uppercase">{currentPlan}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block leading-none mb-0.5">Domains</span>
                <span className="text-xs font-black text-white">{data?.subscription?.limits?.websites || 10}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block leading-none mb-0.5">Seats</span>
                <span className="text-xs font-black text-white">{data?.subscription?.limits?.agents || 10}</span>
              </div>
            </div>

            {data?.stripeCustomerId && (
              <button
                onClick={handlePortal}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 shrink-0"
              >
                <ExternalLink size={13} />
                <span>Stripe Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {isExpired && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <div className="flex-1">
            <span className="font-black text-rose-900 block">Subscription Expired</span>
            <span className="text-rose-700 text-[11px]">Renew your subscription below to continue using all platform features.</span>
          </div>
          <button onClick={() => setBillingPeriod("monthly")} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-black text-[10px] uppercase">
            Renew
          </button>
        </div>
      )}

      {/* ── Active Plan & Capabilities Summary Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Active Plan Card */}
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/20 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10 text-indigo-400">
                <Shield size={16} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🟢 {data?.subscription?.status || "Active"}
              </span>
            </div>

            <div>
              <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Current Platform Tier</p>
              <h3 className="text-2xl font-black tracking-tight uppercase flex items-baseline gap-1.5 mt-0.5">
                {currentPlan} <span className="text-xs font-bold text-white/50 tracking-normal capitalize">Tier</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 mt-4 text-center">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Websites</span>
              <span className="text-xs font-black text-white">{data?.subscription?.limits?.websites || 10} Domains</span>
            </div>
            <div className="border-x border-white/10">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Personnel</span>
              <span className="text-xs font-black text-white">{data?.subscription?.limits?.agents || 10} Seats</span>
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Valid Until</span>
              <span className="text-xs font-black text-white">{expiresAt ? new Date(expiresAt).toLocaleDateString() : "Active"}</span>
            </div>
          </div>
        </div>

        {/* Included Capabilities */}
        <div className="lg:col-span-2 rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Included Enterprise Capabilities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(data?.subscription?.enabledModules || ["crm", "operations", "finance", "compliance", "service", "automation"]).map(mod => (
                <div key={mod} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Zap size={11} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">{mod}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>✨ Full feature access inclusive in your active plan tier</span>
            <span className="text-indigo-600 font-black">24/7 SLA Support Included</span>
          </div>
        </div>

      </div>

      {/* ── Unified Upgrade Pathways & Pricing Engine ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
        
        {/* Tier Header & Toggle Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Available Subscription Tiers & Upgrades
            </h3>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Scale agent seats, unlock UAE Tax Compliance, and deploy multi-website networks.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                billingPeriod === "monthly"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                billingPeriod === "annual"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Annual</span>
              <span className="text-[8px] bg-emerald-400 text-emerald-950 font-black px-1 py-0.2 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <PricingPage currentPlan={currentPlan} isExpired={isExpired} billingPeriod={billingPeriod} hideHeader={true} />
      </div>

    </div>
  );
}
