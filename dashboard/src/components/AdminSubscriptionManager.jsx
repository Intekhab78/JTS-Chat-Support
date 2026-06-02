import { useState, useEffect } from "react";
import { CreditCard, Zap, Shield, AlertTriangle, Users, ExternalLink, Filter, X, Globe } from "lucide-react";
import { api } from "../api/client.js";

export default function AdminSubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const [selectedClient, setSelectedClient] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      const data = await api("/api/billing/admin/all");
      setSubscriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const filtered = subscriptions.filter(s => {
    if (filter === "all") return true;
    const status = s.subscription?.status || 'active';
    return status === filter;
  });

  if (loading) return (
     <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Loading Subscriptions...</p>
     </div>
  );

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
         <div className="space-y-1.5">
            <h3 className="heading-md dark:text-white">Master Subscription Ledger</h3>
            <p className="small-label dark:text-slate-500">Monitor ecosystem revenue, plan distribution, and subscription health.</p>
         </div>
         <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-2 px-4 shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <select 
               value={filter}
               onChange={(e) => setFilter(e.target.value)}
               className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white outline-none cursor-pointer"
            >
               <option value="all">All Statuses</option>
               <option value="active">Active Only</option>
               <option value="expired">Expired Only</option>
               <option value="trialing">Trialing</option>
            </select>
         </div>
      </div>

      <div className="premium-card p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                     <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Client Profile</th>
                     <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Current Tier</th>
                     <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Status</th>
                     <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {filtered.map(sub => (
                     <tr key={sub._id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-black/40 flex items-center justify-center font-black text-xs text-slate-500 border border-slate-100 dark:border-white/5 shadow-sm">
                                 {sub.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                 <strong className="text-[13px] font-black text-slate-900 dark:text-white tracking-tight">{sub.name}</strong>
                                 <span className="text-[10px] text-slate-400 font-bold">{sub.email}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border ${
                              sub.subscription?.plan === 'pro' ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' :
                              sub.subscription?.plan === 'standard' ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                              'bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
                           }`}>
                              {sub.subscription?.plan || 'basic'}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full ring-4 ${
                                 sub.subscription?.status === 'active' ? 'bg-emerald-500 ring-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                 sub.subscription?.status === 'expired' ? 'bg-rose-500 ring-rose-500/10 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                 'bg-amber-500 ring-amber-500/10'
                              }`}></div>
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest leading-none">{sub.subscription?.status || 'active'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex justify-end">
                              <button 
                                 onClick={() => setSelectedClient(sub)}
                                 className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-white/5 hover:border-transparent group-hover:shadow-md"
                              >
                                 <ExternalLink size={12} className="opacity-60" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Details</span>
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filtered.length === 0 && (
                     <tr><td colSpan="5" className="px-8 py-24 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-40">Zero Subscription Records Identified.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Details Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-[32px] border border-white/10 shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <div className="space-y-1">
                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.25em]">Tenant Intelligence</h4>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Client Dossier</h2>
                 </div>
                 <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X size={18} className="text-slate-400" />
                 </button>
              </div>

              {/* Identity Section */}
              <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-xl shadow-indigo-500/20">
                       {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{selectedClient.name}</h3>
                       <p className="text-xs font-bold text-slate-400 mt-1">{selectedClient.email}</p>
                       <div className="flex items-center gap-2 mt-3">
                          <div className={`w-2 h-2 rounded-full ${selectedClient.subscription?.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedClient.subscription?.status || 'Active'}</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1.5">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Plan</p>
                       <p className="text-sm font-black text-indigo-500 uppercase tracking-tight">{selectedClient.subscription?.plan || 'Basic'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1.5">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Stripe Link</p>
                       <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">{selectedClient.stripeCustomerId || 'Local Mock'}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] px-1">Resource Constraints</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Users size={14} /></div>
                          <div>
                             <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none">
                                {selectedClient.subscription?.plan === 'pro' ? '20' : 
                                 selectedClient.subscription?.plan === 'standard' ? '5' : '2'}
                             </p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Agent Seats</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center"><Globe size={14} /></div>
                          <div>
                             <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none">
                                {selectedClient.subscription?.plan === 'pro' ? '10' : 
                                 selectedClient.subscription?.plan === 'standard' ? '2' : '1'}
                             </p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Domain Slots</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] px-1">Enabled Protocols</h4>
                    <div className="flex flex-wrap gap-2">
                       {selectedClient.subscription?.enabledModules?.map(mod => (
                          <div key={mod} className="px-3 py-1.5 bg-slate-100 dark:bg-black/40 rounded-lg border border-slate-200 dark:border-white/5 text-[9px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">
                             {mod}
                          </div>
                       )) || <p className="text-[10px] font-bold text-slate-400 italic">No custom modules active.</p>}
                    </div>
                 </div>

                 <button 
                  onClick={() => setSelectedClient(null)}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95"
                 >
                    Close Dossier
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
