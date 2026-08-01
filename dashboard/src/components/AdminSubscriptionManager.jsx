import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  CreditCard, Zap, Shield, AlertTriangle, Users, ExternalLink, Filter, X, Globe, 
  Tag, Percent, Check, Calendar, Sparkles, Clock, Edit3, ArrowUpRight, Plus, Package, DollarSign, Trash2
} from "lucide-react";
import { api } from "../api/client.js";

const MODULE_OPTIONS = [
  { key: "crm", label: "CRM & Lead Pipeline" },
  { key: "operations", label: "Operations & Quotations" },
  { key: "finance", label: "Finance & Invoicing" },
  { key: "compliance", label: "UAE VAT Compliance Suite" },
  { key: "service", label: "Helpdesk & Omnichannel Inbox" },
  { key: "automation", label: "Workflows & AI Platform" }
];

export default function AdminSubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Client Subscription Modal State
  const [selectedClient, setSelectedClient] = useState(null);
  const [editPlan, setEditPlan] = useState("pro");
  const [editStatus, setEditStatus] = useState("active");
  const [editOfferCode, setEditOfferCode] = useState("");
  const [editDiscount, setEditDiscount] = useState(0);
  const [editAgentSeats, setEditAgentSeats] = useState(10);
  const [editWebsiteSlots, setEditWebsiteSlots] = useState(5);
  const [editDuration, setEditDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  // SaaS Subscription Plan Creator / Editor Modal State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    name: "",
    code: "",
    description: "",
    monthlyPrice: 99,
    annualPrice: 990,
    currencySymbol: "$",
    agents: 10,
    websites: 5,
    includedModules: ["crm", "operations", "finance", "service"],
    isPopular: false
  });
  const [savingPlanPackage, setSavingPlanPackage] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const data = await api("/api/billing/admin/all");
      setSubscriptions(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await api("/api/subscription-plans");
      setPlans(data);
    } catch (err) {
      console.error("Failed to load plans:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchSubscriptions(), fetchPlans()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openClientDetails = (client) => {
    setSelectedClient(client);
    setEditPlan(client.subscription?.plan || "pro");
    setEditStatus(client.subscription?.status || "active");
    setEditOfferCode(client.subscription?.offerCode || "");
    setEditDiscount(client.subscription?.discountPercentage || 0);
    setEditAgentSeats(client.subscription?.limits?.agents ?? (client.subscription?.plan === 'enterprise' ? 100 : client.subscription?.plan === 'pro' ? 20 : 5));
    setEditWebsiteSlots(client.subscription?.limits?.websites ?? (client.subscription?.plan === 'enterprise' ? 50 : client.subscription?.plan === 'pro' ? 10 : 2));
    setEditDuration(30);
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSaving(true);
    try {
      await api("/api/billing/admin/update", {
        method: "PATCH",
        body: JSON.stringify({
          clientId: selectedClient._id,
          plan: editPlan,
          status: editStatus,
          offerCode: editOfferCode,
          discountPercentage: editDiscount,
          agentSeats: editAgentSeats,
          websiteSlots: editWebsiteSlots,
          durationDays: editDuration
        })
      });
      alert(`Subscription & Promo Offers successfully updated for ${selectedClient.name}!`);
      setSelectedClient(null);
      fetchSubscriptions();
    } catch (err) {
      alert("Failed to update subscription: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreatePlanModal = () => {
    setEditingPlanId(null);
    setPlanFormData({
      name: "",
      code: "",
      description: "",
      monthlyPrice: 99,
      annualPrice: 990,
      currencySymbol: "$",
      agents: 10,
      websites: 5,
      includedModules: ["crm", "operations", "finance", "service"],
      isPopular: false
    });
    setPlanModalOpen(true);
  };

  const openEditPlanModal = (plan) => {
    setEditingPlanId(plan._id);
    setPlanFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice || 0,
      annualPrice: plan.annualPrice || 0,
      currencySymbol: plan.currencySymbol || "$",
      agents: plan.limits?.agents || 5,
      websites: plan.limits?.websites || 2,
      includedModules: plan.includedModules || ["crm", "operations", "finance", "compliance", "service", "automation"],
      isPopular: !!plan.isPopular
    });
    setPlanModalOpen(true);
  };

  const handleSavePlanPackage = async (e) => {
    e.preventDefault();
    setSavingPlanPackage(true);
    try {
      if (editingPlanId) {
        await api(`/api/subscription-plans/${editingPlanId}`, {
          method: "PATCH",
          body: JSON.stringify(planFormData)
        });
        alert(`Plan Package "${planFormData.name}" updated successfully!`);
      } else {
        await api("/api/subscription-plans", {
          method: "POST",
          body: JSON.stringify(planFormData)
        });
        alert(`New Plan Package "${planFormData.name}" created successfully!`);
      }
      setPlanModalOpen(false);
      fetchPlans();
    } catch (err) {
      alert("Failed to save plan package: " + err.message);
    } finally {
      setSavingPlanPackage(false);
    }
  };

  const handleDeletePlanPackage = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete the "${plan.name}" plan package?`)) return;
    try {
      await api(`/api/subscription-plans/${plan._id}`, { method: "DELETE" });
      alert(`Plan Package "${plan.name}" deleted successfully!`);
      fetchPlans();
    } catch (err) {
      alert("Failed to delete plan package: " + err.message);
    }
  };

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
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* ── SECTION 1: SAAS SUBSCRIPTION PLANS CATALOG ───────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">SaaS Product Architecture</span>
            <h3 className="heading-md dark:text-white">Subscription Plans & Pricing Catalog</h3>
            <p className="small-label dark:text-slate-500">Create new pricing packages, update plan features, adjust agent limits, and manage subscription tiers.</p>
          </div>
          <button
            onClick={openCreatePlanModal}
            className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shrink-0"
          >
            <Plus size={16} /> Add New Subscription Plan
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <div 
              key={p._id || p.code}
              className={`p-6 rounded-[32px] border-2 transition-all relative flex flex-col justify-between group ${p.isPopular ? 'bg-indigo-900/10 border-indigo-500/50 shadow-2xl' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5'}`}
            >
              {p.isPopular && (
                <span className="absolute -top-3 right-6 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles size={10} /> Most Popular
                </span>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg">
                    Code: {p.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditPlanModal(p)}
                      className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                      title="Edit Plan Pricing & Limits"
                    >
                      <Edit3 size={14} />
                    </button>
                    {p._id && (
                      <button
                        onClick={() => handleDeletePlanPackage(p)}
                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Delete Plan Package"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{p.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{p.currencySymbol || "$"}{p.monthlyPrice}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">/ month</span>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Annual: {p.currencySymbol || "$"}{p.annualPrice} / year
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Users size={12} className="text-indigo-500" /> Agent Seats</span>
                    <span className="font-black text-slate-900 dark:text-white">{p.limits?.agents || 5} Seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Globe size={12} className="text-amber-500" /> Domain Slots</span>
                    <span className="font-black text-slate-900 dark:text-white">{p.limits?.websites || 2} Domains</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Included Modules:</span>
                  <div className="flex flex-wrap gap-1">
                    {(p.includedModules || []).map(m => (
                      <span key={m} className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-md">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => openEditPlanModal(p)}
                className="mt-6 w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Edit Package Settings
              </button>
            </div>
          ))}
        </div>
      </div>


      {/* ── SECTION 2: CLIENT SUBSCRIPTION LEDGER ───────────────────────────── */}
      <div className="space-y-6 pt-6 border-t border-slate-200/60 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-1.5">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">Client Subscriptions</span>
              <h3 className="heading-md dark:text-white">Master Client Subscription Ledger</h3>
              <p className="small-label dark:text-slate-500">Assign plan packages to clients, apply custom discount promo codes, and extend billing dates.</p>
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
                       <th className="px-8 py-5 text-[10px] font-black tracking-widest text-slate-400 uppercase">Promo Offer / Discount</th>
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
                                sub.subscription?.plan === 'enterprise' ? 'bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' :
                                sub.subscription?.plan === 'pro' ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' :
                                sub.subscription?.plan === 'standard' ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                'bg-sky-50 border-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20'
                             }`}>
                                {sub.subscription?.plan || 'basic'}
                             </span>
                          </td>
                          <td className="px-8 py-6">
                             {sub.subscription?.offerCode ? (
                               <div className="flex items-center gap-2">
                                 <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                   🏷️ {sub.subscription.offerCode} ({sub.subscription.discountPercentage || 0}% OFF)
                                 </span>
                               </div>
                             ) : (
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Standard Pricing</span>
                             )}
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
                                   onClick={() => openClientDetails(sub)}
                                   className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-white/5 hover:border-transparent group-hover:shadow-md"
                                >
                                   <Edit3 size={12} className="opacity-80" />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Assign Plan & Offers</span>
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
      </div>


      {/* ── MODAL 1: CREATE / EDIT SAAS PLAN PACKAGE MODAL ───────────────────── */}
      {planModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 lg:p-10 flex items-center justify-center pointer-events-none">
           <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto" onClick={() => setPlanModalOpen(false)} />
           <div className="relative z-10 pointer-events-auto w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300">
              
              <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
                 <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">SaaS Product Catalog</h4>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">
                      {editingPlanId ? "Edit Subscription Plan Package" : "Create New SaaS Plan Package"}
                    </h2>
                 </div>
                 <button onClick={() => setPlanModalOpen(false)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleSavePlanPackage} className="p-8 md:p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Plan Display Name</label>
                       <input
                          value={planFormData.name}
                          onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                          placeholder="Gold Growth Tier"
                          required
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Plan Unique Code</label>
                       <input
                          value={planFormData.code}
                          onChange={(e) => setPlanFormData({ ...planFormData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          disabled={!!editingPlanId}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none disabled:opacity-60"
                          placeholder="gold_tier"
                          required
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Plan Description</label>
                    <textarea
                       value={planFormData.description}
                       onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                       rows={2}
                       className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl p-5 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                       placeholder="Package description & benefits..."
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Price ($)</label>
                       <input
                          type="number"
                          value={planFormData.monthlyPrice}
                          onChange={(e) => setPlanFormData({ ...planFormData, monthlyPrice: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                          required
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Annual Price ($)</label>
                       <input
                          type="number"
                          value={planFormData.annualPrice}
                          onChange={(e) => setPlanFormData({ ...planFormData, annualPrice: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                          required
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Currency Symbol</label>
                       <input
                          value={planFormData.currencySymbol}
                          onChange={(e) => setPlanFormData({ ...planFormData, currencySymbol: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none text-center"
                          placeholder="$"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Included Agent Seats</label>
                       <input
                          type="number"
                          value={planFormData.agents}
                          onChange={(e) => setPlanFormData({ ...planFormData, agents: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                          required
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Included Domain Slots</label>
                       <input
                          type="number"
                          value={planFormData.websites}
                          onChange={(e) => setPlanFormData({ ...planFormData, websites: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                          required
                       />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Enabled SaaS Modules for this Package</label>
                    <div className="grid grid-cols-2 gap-3">
                       {MODULE_OPTIONS.map(mod => {
                          const isChecked = (planFormData.includedModules || []).includes(mod.key);
                          const toggleMod = () => {
                             const current = planFormData.includedModules || [];
                             const next = isChecked ? current.filter(m => m !== mod.key) : [...current, mod.key];
                             setPlanFormData({ ...planFormData, includedModules: next });
                          };
                          return (
                             <button
                                key={mod.key}
                                type="button"
                                onClick={toggleMod}
                                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${isChecked ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-60'}`}
                             >
                                <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isChecked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isChecked ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-400'}`}>
                                   {mod.label}
                                </span>
                             </button>
                          );
                       })}
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                    <button
                       type="submit"
                       disabled={savingPlanPackage}
                       className="w-full bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.3em] py-5 rounded-[24px] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-98"
                    >
                       <Check size={18} />
                       {savingPlanPackage ? "Saving Package..." : editingPlanId ? "Update Plan Package" : "Publish New Subscription Plan Package"}
                    </button>
                 </div>
              </form>
           </div>
        </div>,
        document.body
      )}


      {/* ── MODAL 2: CLIENT SUBSCRIPTION & OFFER ASSIGN MODAL ───────────────── */}
      {selectedClient && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 lg:p-10 flex items-center justify-center pointer-events-none">
           <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md pointer-events-auto" onClick={() => setSelectedClient(null)} />
           <div className="relative z-10 pointer-events-auto w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300">
              
              <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-black/20">
                 <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">Superadmin Control Console</h4>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Subscription & Promo Offer Manager</h2>
                 </div>
                 <button onClick={() => setSelectedClient(null)} className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleSaveSubscription} className="p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                 <div className="flex items-center gap-6 p-5 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-[28px] border border-indigo-100 dark:border-indigo-500/20">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-xl">
                       {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{selectedClient.name}</h3>
                       <p className="text-xs font-bold text-slate-400 mt-0.5">{selectedClient.email}</p>
                       <span className="inline-block mt-2 px-3 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-white/10">
                         Current Plan: {(selectedClient.subscription?.plan || 'basic').toUpperCase()}
                       </span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <Zap size={14} className="text-indigo-500" /> Subscription Plan Tier & Status
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Select Plan Tier</span>
                          <select
                            value={editPlan}
                            onChange={(e) => setEditPlan(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                          >
                             {plans.map(p => (
                               <option key={p.code} value={p.code}>
                                 {p.name} ({p.currencySymbol || '$'}{p.monthlyPrice}/mo)
                               </option>
                             ))}
                          </select>
                       </div>
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Billing Status</span>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                          >
                             <option value="active">🟢 Active Subscription</option>
                             <option value="trialing">🟡 Trialing (Free Trial)</option>
                             <option value="expired">🔴 Expired / Due</option>
                             <option value="suspended">⛔ Suspended</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <Globe size={14} className="text-indigo-500" /> Custom Resource Capacity Overrides
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Agent Seats Limit</span>
                          <input
                             type="number"
                             value={editAgentSeats}
                             onChange={(e) => setEditAgentSeats(e.target.value)}
                             className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                             placeholder="20"
                          />
                       </div>
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Website Slots Limit</span>
                          <input
                             type="number"
                             value={editWebsiteSlots}
                             onChange={(e) => setEditWebsiteSlots(e.target.value)}
                             className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                             placeholder="10"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <Tag size={14} className="text-emerald-500" /> Apply Special Offer & Promo Discount
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Promo / Offer Code</span>
                          <input
                             value={editOfferCode}
                             onChange={(e) => setEditOfferCode(e.target.value)}
                             className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none uppercase tracking-wider placeholder:text-slate-300"
                             placeholder="e.g. LAUNCH_2026_DISCOUNT"
                          />
                       </div>
                       <div className="space-y-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Discount % (Off)</span>
                          <div className="relative">
                             <input
                                type="number"
                                min="0"
                                max="100"
                                value={editDiscount}
                                onChange={(e) => setEditDiscount(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                                placeholder="20"
                             />
                             <span className="absolute right-4 top-4 text-xs font-black text-slate-400">%</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                       <Clock size={14} className="text-indigo-500" /> Plan Validity & Expiry Extension
                    </label>
                    <select
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-5 py-4 text-xs font-black focus:border-indigo-500 outline-none text-slate-900 dark:text-white"
                    >
                       <option value={30}>+ 1 Month (30 Days Active)</option>
                       <option value={90}>+ 3 Months (90 Days Quarterly)</option>
                       <option value={180}>+ 6 Months (180 Days Half-Yearly)</option>
                       <option value={365}>+ 1 Year (365 Days Annual Plan)</option>
                       <option value={3650}>♾️ Lifetime Enterprise Access (10 Years)</option>
                    </select>
                 </div>

                 <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                    <button
                       type="submit"
                       disabled={saving}
                       className="w-full bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.3em] py-5 rounded-[24px] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-98"
                    >
                       <Check size={18} />
                       {saving ? "Updating Subscription..." : "Save & Activate Subscription Plan"}
                    </button>
                 </div>
              </form>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
}
