import { useState, useEffect } from "react";
import { CreditCard, Zap, Shield, Crown, AlertTriangle, ExternalLink, ArrowUpRight } from "lucide-react";
import { api } from "../api/client.js";
import PricingPage from "./PricingPage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function BillingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // "monthly" | "annual"

  const fetchStatus = async () => {
    try {
      const res = await api("/api/billing/status");
      setData(res);
    } catch (err) {
      setError(err.message);
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
     <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Refreshing Billing Node...</p>
     </div>
  );

  const isExpired = data?.subscription?.status === "expired" || data?.subscription?.status === "suspended";

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {isExpired && (
        <div className={`border-2 p-6 rounded-[24px] flex items-center gap-6 shadow-xl ${!data?.stripeCustomerId ? 'bg-indigo-50 border-indigo-100 shadow-indigo-500/5' : 'bg-rose-50 border-rose-100 shadow-rose-500/5'}`}>
           <div className={`w-12 h-12 text-white rounded-xl flex items-center justify-center animate-pulse ${!data?.stripeCustomerId ? 'bg-indigo-500' : 'bg-rose-500'}`}>
              <AlertTriangle size={24} />
           </div>
           <div className="flex-1">
              <h3 className={`text-xs font-black uppercase tracking-tight ${!data?.stripeCustomerId ? 'text-indigo-900' : 'text-rose-900'}`}>
                {!data?.subscription?.plan || isExpired ? "Onboarding: Setup your Ecosystem" : "Service Interruption: Plan Expired"}
              </h3>
              <p className={`text-[10px] font-bold leading-relaxed max-w-xl mt-0.5 ${!data?.subscription?.plan || isExpired ? 'text-indigo-700' : 'text-rose-700'}`}>
                {!data?.subscription?.plan || isExpired 
                  ? "Select a plan below to deploy your multi-domain support network and unlock advanced modules." 
                  : "Your status is currently set to expired. Please renew your subscription to regain access to premium features."}
              </p>
           </div>
           <button 
             onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })} 
             className={`px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg transition-all ${!data?.subscription?.plan || isExpired ? 'bg-indigo-600 hover:bg-indigo-800 text-white shadow-indigo-200' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'}`}
           >
             {!data?.subscription?.plan || isExpired ? "Pick a Plan" : "Renew Now"}
           </button>
        </div>
      )}

      {/* Main Grid: Subscription Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Column 1: Current Plan */}
         <div className="premium-card p-8 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_100%)] text-white border-none shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="relative z-10 space-y-6">
               <div className="flex items-center justify-between">
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xl border border-white/10"><Shield size={18} className="text-indigo-400" /></div>
                  {data?.subscription?.plan && (
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      isExpired ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {data?.subscription?.status || 'Active'}
                    </span>
                  )}
               </div>

               <div>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">{data?.subscription?.plan ? "Active Plan" : "Account Status"}</p>
                  <h4 className="text-2xl font-black tracking-tight flex items-end gap-2 uppercase">
                    {data?.subscription?.plan || "Awaiting Plan"}
                    <span className="text-[10px] font-bold text-white/40 mb-1">Tier</span>
                  </h4>
               </div>

               <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Websites</p>
                     <p className="text-xs font-bold">{data?.subscription?.limits?.websites || 0} Domains</p>
                  </div>
                  <div className="space-y-0.5">
                     <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Personnel</p>
                     <p className="text-xs font-bold">{data?.subscription?.limits?.agents || 0} Seats</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Column 2 & 3: Capabilities */}
         <div className="lg:col-span-2 premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 flex flex-col justify-between">
            <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Included Capabilities</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
               {data?.subscription?.enabledModules?.map(mod => (
                  <div key={mod} className="flex items-center gap-3 group">
                     <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0"><Zap size={12} /></div>
                     <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{mod}</span>
                  </div>
               ))}
               {(!data?.subscription?.enabledModules || data.subscription.enabledModules.length === 0) && (
                  <p className="text-[10px] font-bold text-slate-400 italic">No modules active for current tier.</p>
               )}
            </div>
            
          {!isExpired && (
             <div className="mt-8 flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Standard maintenance inclusive • Pro-rata billing active</p>
                <button
                  onClick={handlePortal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ExternalLink size={12} /> Manage Billing
                </button>
             </div>
          )}
         </div>
      </div>

      <section className="pt-4 border-t border-slate-100 dark:border-white/5">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Upgrade Pathways</h3>
               <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Scalable intelligence for your support ecosystem.</p>
            </div>
            <div className="flex gap-4">
               <button
                 onClick={() => setBillingPeriod("monthly")}
                 className={`px-4 py-2 border-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                   billingPeriod === "monthly"
                     ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                     : "border-slate-100 dark:border-white/5 text-slate-400 hover:border-indigo-400 hover:text-indigo-500"
                 }`}
               >Monthly</button>
               <button
                 onClick={() => setBillingPeriod("annual")}
                 className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl transition-all ${
                   billingPeriod === "annual"
                     ? "bg-indigo-600 text-white shadow-indigo-200"
                     : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-700"
                 }`}
               >Annual -20%</button>
            </div>
         </div>
         <PricingPage currentPlan={data?.subscription?.plan} isExpired={isExpired} billingPeriod={billingPeriod} />
      </section>
    </div>
  );
}
