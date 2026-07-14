import React, { useState, useEffect } from "react";
import { Plus, Check, RefreshCw, Trash2, Calendar, Users, Cpu } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmSubscriptionsView({ websiteId }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState({
    customerId: "", planId: "", billingCycle: "monthly", seats: 1, durationMonths: 1
  });

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "", price: 0, billingCycle: "monthly", featuresList: "", storageGb: 5, aiCredits: 100
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const subRes = await api(`/api/crm/subscriptions?websiteId=${websiteId}`);
      setSubscriptions(subRes || []);

      const planRes = await api(`/api/crm/plans?websiteId=${websiteId}`);
      setPlans(planRes || []);

      const customerRes = await api(`/api/crm?limit=200&websiteId=${websiteId}`);
      const customerList = Array.isArray(customerRes) ? customerRes : (customerRes?.customers || []);
      setCustomers(customerList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleCreateSub = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/subscriptions`, {
        method: "POST",
        body: JSON.stringify({ ...subForm, websiteId })
      });
      setShowSubForm(false);
      setSubForm({ customerId: "", planId: "", billingCycle: "monthly", seats: 1, durationMonths: 1 });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const features = planForm.featuresList.split(",").map(f => f.trim()).filter(Boolean);
      await api(`/api/crm/plans`, {
        method: "POST",
        body: JSON.stringify({
          ...planForm,
          websiteId,
          features,
          usageLimits: {
            storageGb: planForm.storageGb,
            aiCredits: planForm.aiCredits
          }
        })
      });
      setShowPlanForm(false);
      setPlanForm({ name: "", price: 0, billingCycle: "monthly", featuresList: "", storageGb: 5, aiCredits: 100 });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTriggerCron = async () => {
    try {
      const res = await api(`/api/crm/subscriptions/cron`, { method: "POST" });
      alert(res.message || "Cron executed successfully.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!websiteId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200/80 rounded-[30px] shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
          <Calendar size={32} />
        </div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Select a Specific Website Domain</h3>
        <p className="text-xs font-bold text-slate-400 max-w-sm leading-relaxed mt-2">
          Plans, renewals, and subscriptions are configured per website asset. Please select a specific domain from the website selector at the top to configure billing structures.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowPlanForm(true)}
            className="flex-1 sm:flex-initial py-3 px-5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase text-slate-700 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            Create Plan
          </button>
          <button
            onClick={() => setShowSubForm(true)}
            className="flex-1 sm:flex-initial py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
          >
            Create Subscription
          </button>
        </div>
        <button
          onClick={handleTriggerCron}
          className="w-full sm:w-auto py-3 px-5 bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 transition-all"
        >
          <RefreshCw size={14} /> Run Billing Cron
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-50 border rounded-[28px] animate-pulse" />
          <div className="h-64 bg-slate-50 border rounded-[28px] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Subscriptions list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><Calendar size={14} className="text-indigo-500" /> Active Subscriptions</h4>
            {subscriptions.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No active subscriptions.</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(s => (
                  <div key={s._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{s.customerId?.name || "Customer"} - Plan: {s.planId?.name}</h5>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Renewal: {new Date(s.renewalDate).toLocaleDateString()} • Cycle: {s.billingCycle} • Seats: {s.seats}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === "active" || s.status === "renewed" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Plans list */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><Cpu size={14} className="text-indigo-500" /> Subscription Plans</h4>
            {plans.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No plans configured.</p>
            ) : (
              <div className="space-y-4">
                {plans.map(p => (
                  <div key={p._id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h5 className="text-xs font-black text-slate-800">{p.name}</h5>
                      <span className="text-xs font-extrabold text-indigo-600">${p.price}/{p.billingCycle}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Limits: {p.usageLimits?.storageGb}GB • {p.usageLimits?.aiCredits} AI Credits</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Form Modal */}
      {showSubForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowSubForm(false)} />
          <form onSubmit={handleCreateSub} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Assign Subscription</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Customer</label>
              <select
                required
                value={subForm.customerId}
                onChange={(e) => setSubForm({ ...subForm, customerId: e.target.value })}
                className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold"
              >
                <option value="">Choose Customer...</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.companyName || "Unnamed account"} ({c.email || "No email"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Plan</label>
              <select
                required
                value={subForm.planId}
                onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
                className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold"
              >
                <option value="">Choose Plan...</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (${p.price}/{p.billingCycle})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Seats</label>
                <input type="number" required value={subForm.seats} onChange={(e) => setSubForm({ ...subForm, seats: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cycle</label>
                <select value={subForm.billingCycle} onChange={(e) => setSubForm({ ...subForm, billingCycle: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Subscription</button>
          </form>
        </div>
      )}

      {/* Plan Form Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPlanForm(false)} />
          <form onSubmit={handleCreatePlan} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Create Plan</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Plan Name</label>
                <input required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Price ($)</label>
                <input type="number" required value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Storage (GB)</label>
                <input type="number" required value={planForm.storageGb} onChange={(e) => setPlanForm({ ...planForm, storageGb: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Credits</label>
                <input type="number" required value={planForm.aiCredits} onChange={(e) => setPlanForm({ ...planForm, aiCredits: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Features list (comma separated)</label>
              <input value={planForm.featuresList} onChange={(e) => setPlanForm({ ...planForm, featuresList: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Plan</button>
          </form>
        </div>
      )}
    </div>
  );
}
