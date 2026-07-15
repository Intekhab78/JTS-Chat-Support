import React, { useState, useEffect } from "react";
import { Plus, Check, RefreshCw, Trash2, Edit3, Calendar, Users, Cpu, X, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmSubscriptionsView({ websiteId }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscription Form States
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState("");
  const [subForm, setSubForm] = useState({
    customerId: "", planId: "", billingCycle: "monthly", seats: 1, durationMonths: 1, status: "active"
  });

  // Plan Form States
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
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
      console.error("Failed to load subscription framework data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) {
      fetchData();
      closeSubModal();
      closePlanModal();
    }
  }, [websiteId]);

  // Modals helper controls
  const openNewSubModal = () => {
    setEditingSubId("");
    setSubForm({ customerId: "", planId: "", billingCycle: "monthly", seats: 1, durationMonths: 1, status: "active" });
    setShowSubForm(true);
  };

  const openEditSubModal = (sub) => {
    setEditingSubId(sub._id);
    setSubForm({
      customerId: sub.customerId?._id || sub.customerId || "",
      planId: sub.planId?._id || sub.planId || "",
      billingCycle: sub.billingCycle || "monthly",
      seats: sub.seats || 1,
      durationMonths: sub.durationMonths || 1,
      status: sub.status || "active"
    });
    setShowSubForm(true);
  };

  const closeSubModal = () => {
    setShowSubForm(false);
    setEditingSubId("");
  };

  const openNewPlanModal = () => {
    setEditingPlanId("");
    setPlanForm({ name: "", price: 0, billingCycle: "monthly", featuresList: "", storageGb: 5, aiCredits: 100 });
    setShowPlanForm(true);
  };

  const openEditPlanModal = (plan) => {
    setEditingPlanId(plan._id);
    setPlanForm({
      name: plan.name || "",
      price: plan.price || 0,
      billingCycle: plan.billingCycle || "monthly",
      featuresList: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      storageGb: plan.usageLimits?.storageGb || 5,
      aiCredits: plan.usageLimits?.aiCredits || 100
    });
    setShowPlanForm(true);
  };

  const closePlanModal = () => {
    setShowPlanForm(false);
    setEditingPlanId("");
  };

  // Submit handers
  const handleSaveSub = async (e) => {
    e.preventDefault();
    try {
      if (editingSubId) {
        // Edit flow
        await api(`/api/crm/subscriptions/${editingSubId}`, {
          method: "PUT",
          body: JSON.stringify({ ...subForm })
        });
      } else {
        // Create flow
        await api(`/api/crm/subscriptions`, {
          method: "POST",
          body: JSON.stringify({ ...subForm, websiteId })
        });
      }
      closeSubModal();
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to update subscription.");
    }
  };

  const handleDeleteSub = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subscription record?")) return;
    try {
      await api(`/api/crm/subscriptions/${id}`, {
        method: "DELETE"
      });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to delete subscription.");
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const features = planForm.featuresList.split(",").map(f => f.trim()).filter(Boolean);
      const payload = {
        ...planForm,
        websiteId,
        features,
        usageLimits: {
          storageGb: planForm.storageGb,
          aiCredits: planForm.aiCredits
        }
      };

      if (editingPlanId) {
        // Edit flow
        await api(`/api/crm/plans/${editingPlanId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        // Create flow
        await api(`/api/crm/plans`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      closePlanModal();
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to save plan.");
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to delete this plan? All subscribers mapped to this plan may lose access status!")) return;
    try {
      await api(`/api/crm/plans/${id}`, {
        method: "DELETE"
      });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to delete plan.");
    }
  };

  const handleTriggerCron = async () => {
    try {
      const res = await api(`/api/crm/subscriptions/cron`, { method: "POST" });
      alert(res.message || "Billing cron execution processed.");
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4 border-slate-100">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={openNewPlanModal}
            className="flex-1 sm:flex-initial py-3 px-5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase text-slate-700 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus size={12} className="text-indigo-500" /> Create Plan
          </button>
          <button
            onClick={openNewSubModal}
            className="flex-1 sm:flex-initial py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus size={12} /> Assign Subscription
          </button>
        </div>
        <button
          onClick={handleTriggerCron}
          className="w-full sm:w-auto py-3 px-5 bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 transition-all"
        >
          <RefreshCw size={12} className="animate-spin-slow" /> Run Billing Cron
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-50 border rounded-[30px] animate-pulse" />
          <div className="h-64 bg-slate-50 border rounded-[30px] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Subscriptions list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-500" /> Active Subscriptions
            </h4>
            {subscriptions.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No active subscriptions.</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map(s => (
                  <div key={s._id} className="p-4 border border-slate-100 hover:border-slate-200 rounded-2xl flex justify-between items-center transition-all group">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 flex items-center gap-2">
                        {s.customerId?.name || "Customer"} 
                        <span className="text-[10px] font-bold text-slate-400">→</span> 
                        <span className="text-indigo-600 font-black">{s.planId?.name || "No Plan"}</span>
                      </h5>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        Renewal: {new Date(s.renewalDate).toLocaleDateString()} • Cycle: {s.billingCycle} • Seats: {s.seats}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        s.status === "active" || s.status === "renewed" 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-rose-50 text-rose-600"
                      }`}>
                        {s.status}
                      </span>
                      
                      {/* Subscription Edit / Delete options */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditSubModal(s)}
                          title="Edit Subscription"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSub(s._id)}
                          title="Delete Subscription"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Plans list */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-500" /> Subscription Plans
            </h4>
            {plans.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No plans configured.</p>
            ) : (
              <div className="space-y-4">
                {plans.map(p => (
                  <div key={p._id} className="p-4 bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl space-y-2 relative group transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-xs font-black text-slate-800">{p.name}</h5>
                        <span className="text-xs font-extrabold text-indigo-600 block mt-0.5">${p.price}/{p.billingCycle}</span>
                      </div>
                      
                      {/* Plan Actions Menu */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditPlanModal(p)}
                          title="Edit Plan"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all bg-white/20"
                        >
                          <Edit3 size={10} />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p._id)}
                          title="Delete Plan"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all bg-white/20"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Limits: {p.usageLimits?.storageGb}GB • {p.usageLimits?.aiCredits} AI Credits
                    </p>
                    
                    {p.features && p.features.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100 flex flex-wrap gap-1">
                        {p.features.map((f, i) => (
                          <span key={i} className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50/50 text-indigo-500 uppercase tracking-wide">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
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
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeSubModal} />
          <form onSubmit={handleSaveSub} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {editingSubId ? "Edit Subscription" : "Assign Subscription"}
              </h3>
              <button type="button" onClick={closeSubModal} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Customer</label>
              <select
                required
                disabled={!!editingSubId} // Cannot transfer subscription customer ID directly
                value={subForm.customerId}
                onChange={(e) => setSubForm({ ...subForm, customerId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-60"
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
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Plan</label>
              <select
                required
                value={subForm.planId}
                onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700"
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
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Seats</label>
                <input 
                  type="number" 
                  required 
                  min={1}
                  value={subForm.seats} 
                  onChange={(e) => setSubForm({ ...subForm, seats: Number(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Billing Cycle</label>
                <select 
                  value={subForm.billingCycle} 
                  onChange={(e) => setSubForm({ ...subForm, billingCycle: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Duration (Months)</label>
                <input 
                  type="number" 
                  required 
                  min={1}
                  value={subForm.durationMonths} 
                  onChange={(e) => setSubForm({ ...subForm, durationMonths: Number(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                <select 
                  value={subForm.status} 
                  onChange={(e) => setSubForm({ ...subForm, status: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 transition-colors"
            >
              {editingSubId ? "Update Subscription" : "Save Subscription"}
            </button>
          </form>
        </div>
      )}

      {/* Plan Form Modal */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closePlanModal} />
          <form onSubmit={handleSavePlan} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {editingPlanId ? "Edit Pricing Plan" : "Create Pricing Plan"}
              </h3>
              <button type="button" onClick={closePlanModal} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Plan Name</label>
                <input 
                  required 
                  value={planForm.name} 
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} 
                  placeholder="e.g. Starter Enterprise"
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Price ($)</label>
                <input 
                  type="number" 
                  required 
                  min={0}
                  value={planForm.price} 
                  onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Storage (GB)</label>
                <input 
                  type="number" 
                  required 
                  min={1}
                  value={planForm.storageGb} 
                  onChange={(e) => setPlanForm({ ...planForm, storageGb: Number(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">AI Credits</label>
                <input 
                  type="number" 
                  required 
                  min={0}
                  value={planForm.aiCredits} 
                  onChange={(e) => setPlanForm({ ...planForm, aiCredits: Number(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Billing Frequency</label>
              <select 
                value={planForm.billingCycle} 
                onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })} 
                className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Features list (comma separated)</label>
              <input 
                value={planForm.featuresList} 
                onChange={(e) => setPlanForm({ ...planForm, featuresList: e.target.value })} 
                placeholder="CRM Access, Analytics, AI Copilot"
                className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-700" 
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 transition-colors"
            >
              {editingPlanId ? "Update Pricing Plan" : "Create Pricing Plan"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
