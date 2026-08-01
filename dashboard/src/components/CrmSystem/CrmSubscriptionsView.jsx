import React, { useState, useEffect, useMemo } from "react";
import {
  Repeat, DollarSign, Layers, Users, Plus, Play, Search, Filter,
  Calendar, Check, AlertCircle, RefreshCw, X, Trash2, Edit3, ChevronRight, ShieldCheck, Download, Printer, Cpu
} from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmSubscriptionsView({ websiteId }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
      setCurrentPage(1);
      fetchData();
      closeSubModal();
      closePlanModal();
    }
  }, [websiteId]);

  // KPI Analytics Metrics for Subscriptions
  const metrics = useMemo(() => {
    const totalSubs = subscriptions.length;
    const activeSubs = subscriptions.filter(s => (s.status || "active").toLowerCase() === "active").length;
    const totalMRR = subscriptions.reduce((sum, s) => {
      const price = Number(s.planId?.price) || 0;
      return sum + (s.billingCycle === "yearly" ? price / 12 : price);
    }, 0);
    const totalPlans = plans.length;

    return { totalSubs, activeSubs, totalMRR, totalPlans };
  }, [subscriptions, plans]);

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
  const handleCreateOrUpdateSub = async (e) => {
    e.preventDefault();
    try {
      if (editingSubId) {
        await api(`/api/crm/subscriptions/${editingSubId}`, {
          method: "PUT",
          body: JSON.stringify({ ...subForm, websiteId })
        });
      } else {
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
    if (!window.confirm("Are you sure you want to cancel and delete this subscription?")) return;
    try {
      await api(`/api/crm/subscriptions/${id}`, {
        method: "DELETE"
      });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to delete subscription.");
    }
  };

  const handleCreateOrUpdatePlan = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: planForm.name,
        price: Number(planForm.price) || 0,
        billingCycle: planForm.billingCycle,
        features: planForm.featuresList.split(",").map(f => f.trim()).filter(Boolean),
        usageLimits: {
          storageGb: Number(planForm.storageGb) || 5,
          aiCredits: Number(planForm.aiCredits) || 100
        },
        websiteId
      };

      if (editingPlanId) {
        await api(`/api/crm/plans/${editingPlanId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
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
    if (!window.confirm("Are you sure you want to delete this subscription plan?")) return;
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
      const res = await api(`/api/crm/subscriptions/run-cron`, { method: "POST" });
      alert(res.message || "Billing cron executed successfully.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!websiteId || websiteId === "undefined" || websiteId === "null") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-[30px] p-10 text-center flex flex-col items-center justify-center my-6">
        <AlertCircle size={40} className="text-slate-400 mb-3" />
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Website Scoped Context Required</h4>
        <p className="text-xs font-bold text-slate-400 max-w-sm leading-relaxed mt-2">
          Plans, renewals, and subscriptions are configured per website asset. Please select a specific domain from the website selector at the top to configure billing structures.
        </p>
      </div>
    );
  }

  // Filtered & Paginated Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => {
      const custName = s.customerId?.name || s.customerId?.companyName || "";
      const planName = s.planId?.name || "";
      const matchesSearch = search.trim() === "" ||
        custName.toLowerCase().includes(search.toLowerCase()) ||
        planName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || (s.status || "active").toLowerCase() === statusFilter.toLowerCase();
      const matchesCycle = cycleFilter === "all" || (s.billingCycle || "monthly").toLowerCase() === cycleFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCycle;
    });
  }, [subscriptions, search, statusFilter, cycleFilter]);

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage) || 1;

  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscriptions.slice(start, start + itemsPerPage);
  }, [filteredSubscriptions, currentPage, itemsPerPage]);

  const handleExportSubsCSV = () => {
    const data = filteredSubscriptions.map(s => ({
      "Customer / Company": s.customerId?.companyName || s.customerId?.name || "-",
      "Plan Tier": s.planId?.name || "Standard",
      "Billing Cycle": (s.billingCycle || "monthly").toUpperCase(),
      "Seats": s.seats || 1,
      "Monthly Value ($)": s.planId?.price ? (s.planId.price * (s.seats || 1)) : 0,
      "Status": (s.status || "active").toUpperCase(),
      "Renewal Date": s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : "-"
    }));
    exportToCSV(data, `Subscriptions_MRR_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportSubsPDF = () => {
    const data = filteredSubscriptions.map(s => ({
      "Customer": s.customerId?.companyName || s.customerId?.name || "-",
      "Plan": s.planId?.name || "Standard",
      "Cycle": (s.billingCycle || "monthly").toUpperCase(),
      "Status": (s.status || "active").toUpperCase(),
      "Next Bill": s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : "-"
    }));
    exportToPDF(data, `Subscriptions_MRR_Report_${new Date().toISOString().slice(0, 10)}`, "SUBSCRIPTIONS & RECURRING BILLING MRR REPORT");
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4 border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Subscription & Recurring Billing</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage customer subscription tiers, recurring billing cycles, and automated plan limits</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportSubsCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Subscriptions to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportSubsPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Subscriptions to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
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
          <button
            onClick={handleTriggerCron}
            className="w-full sm:w-auto py-3 px-5 bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            <RefreshCw size={12} /> Run Billing Cron
          </button>
        </div>
      </div>

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Active Subscriptions</span>
            <span className="text-lg font-black text-slate-900">{metrics.activeSubs} Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Est. Monthly Revenue</span>
            <span className="text-lg font-black text-emerald-700">${Math.round(metrics.totalMRR).toLocaleString()}/mo</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Configured Plans</span>
            <span className="text-lg font-black text-blue-700">{metrics.totalPlans} Tiers</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Customer Subs</span>
            <span className="text-lg font-black text-amber-700">{metrics.totalSubs} Total</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search subscriptions by customer or plan name…"
            className="w-full pl-4 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-36 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="past_due">Past Due</option>
          </select>

          <select
            value={cycleFilter}
            onChange={(e) => { setCycleFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-36 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Cycles</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-50 border rounded-[30px] animate-pulse" />
          <div className="h-64 bg-slate-50 border rounded-[30px] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Subscriptions list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between space-y-4 min-h-[420px]">
            <div>
              <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-500" /> Active Subscriptions ({filteredSubscriptions.length})
                </h4>
              </div>

              {paginatedSubscriptions.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-12">No active subscriptions found matching filters.</p>
              ) : (
                <div className="space-y-3 mt-4">
                  {paginatedSubscriptions.map(s => (
                    <div key={s._id} className="p-4 border border-slate-100 hover:border-slate-200 rounded-2xl flex justify-between items-center transition-all group">
                      <div>
                        <h5 className="text-xs font-black text-slate-800 flex items-center gap-2">
                          {s.customerId?.name || s.customerId?.companyName || "Customer"} 
                          <span className="text-[10px] font-bold text-slate-400">→</span> 
                          <span className="text-indigo-600 font-black">{s.planId?.name || "No Plan"}</span>
                        </h5>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                          Renewal: {s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : "N/A"} • Cycle: {s.billingCycle || "monthly"} • Seats: {s.seats || 1}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          (s.status || "active").toLowerCase() === "active" || (s.status || "").toLowerCase() === "renewed" 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {s.status || "active"}
                        </span>
                        
                        {/* Subscription Edit / Delete options */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              exportSingleRecordPDF(
                                `SUBSCRIPTION SUMMARY - ${s.customerId?.name || s.customerId?.companyName || "Customer"}`,
                                {
                                  "Customer / Client": s.customerId?.name || s.customerId?.companyName || "-",
                                  "Plan Tier": s.planId?.name || "Standard Plan",
                                  "Billing Cycle": (s.billingCycle || "monthly").toUpperCase(),
                                  "Seats Allocated": s.seats || 1,
                                  "Monthly Value": `$${(s.planId?.price ? (s.planId.price * (s.seats || 1)) : 0).toLocaleString()}`,
                                  "Subscription Status": (s.status || "active").toUpperCase(),
                                  "Next Renewal Date": s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : "-"
                                },
                                `Subscription_${(s.customerId?.companyName || s.customerId?.name || "Record").replace(/\s+/g, '_')}`
                              );
                            }}
                            title="Export Single Subscription PDF"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <Printer size={12} />
                          </button>
                          <button 
                            onClick={() => openEditSubModal(s)}
                            title="Edit Subscription"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteSub(s._id)}
                            title="Delete Subscription"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredSubscriptions.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 mt-auto">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} of {filteredSubscriptions.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                  >
                    Next
                  </button>
                </div>
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
