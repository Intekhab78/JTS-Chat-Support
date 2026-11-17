import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Repeat,
  DollarSign,
  Layers,
  Users,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  RefreshCw,
  X,
  Trash2,
  Edit3,
  Download,
  Printer,
  Cpu
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";

const EMPTY_SUB_FORM = {
  customerId: "",
  planId: "",
  billingCycle: "monthly",
  seats: 1,
  durationMonths: 1,
  status: "active"
};

const EMPTY_PLAN_FORM = {
  name: "",
  price: 0,
  billingCycle: "monthly",
  featuresList: "",
  storageGb: 5,
  aiCredits: 100
};

export default function CrmSubscriptionsView({ websiteId }) {
  const toast = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);

  // Search, Filters & Pagination State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Subscription Form States
  const [showSubForm, setShowSubForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState("");
  const [savingSub, setSavingSub] = useState(false);
  const [subForm, setSubForm] = useState(EMPTY_SUB_FORM);

  // Plan Form States
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);

  // Inline delete confirm
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState(null);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${websiteId}` : "";
      const custQs =
        websiteId && websiteId !== "all" ? `?limit=200&websiteId=${websiteId}` : `?limit=200`;

      const [subRes, planRes, customerRes] = await Promise.allSettled([
        api(`/api/crm/subscriptions${qs}`),
        api(`/api/crm/plans${qs}`),
        api(`/api/crm${custQs}`)
      ]);

      setSubscriptions(
        subRes.status === "fulfilled" && Array.isArray(subRes.value) ? subRes.value : []
      );
      setPlans(
        planRes.status === "fulfilled" && Array.isArray(planRes.value) ? planRes.value : []
      );

      const custVal = customerRes.status === "fulfilled" ? customerRes.value : [];
      const customerList = Array.isArray(custVal) ? custVal : custVal?.customers || [];
      setCustomers(customerList);
    } catch (err) {
      toast.error(err.message || "Failed to load subscription data");
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

  const metrics = useMemo(() => {
    const totalSubs = subscriptions.length;
    const activeList = subscriptions.filter((s) =>
      ["active", "renewed"].includes((s.status || "active").toLowerCase())
    );
    const activeSubs = activeList.length;
    const totalMRR = activeList.reduce((sum, s) => {
      const price = (Number(s.planId?.price) || 0) * Math.max(1, Number(s.seats || 1));
      return sum + (s.billingCycle === "yearly" ? price / 12 : price);
    }, 0);
    const totalPlans = plans.length;
    return { totalSubs, activeSubs, totalMRR, totalPlans };
  }, [subscriptions, plans]);

  const openNewSubModal = () => {
    setEditingSubId("");
    setSubForm(EMPTY_SUB_FORM);
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
    setPlanForm(EMPTY_PLAN_FORM);
    setShowPlanForm(true);
  };

  const openEditPlanModal = (plan) => {
    setEditingPlanId(plan._id);
    setPlanForm({
      name: plan.name || "",
      price: plan.price || 0,
      billingCycle: plan.billingCycle || "monthly",
      featuresList: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      storageGb: plan.usageLimits?.storageGb ?? 5,
      aiCredits: plan.usageLimits?.aiCredits ?? 100
    });
    setShowPlanForm(true);
  };

  const closePlanModal = () => {
    setShowPlanForm(false);
    setEditingPlanId("");
  };

  const handleSaveSub = async (e) => {
    e.preventDefault();
    setSavingSub(true);
    try {
      const payload = {
        ...subForm,
        ...(websiteId && websiteId !== "all" ? { websiteId } : {})
      };
      if (editingSubId) {
        await api(`/api/crm/subscriptions/${editingSubId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Subscription updated");
      } else {
        await api(`/api/crm/subscriptions`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Subscription assigned");
      }
      closeSubModal();
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save subscription");
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSub = async (id) => {
    try {
      await api(`/api/crm/subscriptions/${id}`, { method: "DELETE" });
      setConfirmDeleteSubId(null);
      toast.success("Subscription deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete subscription");
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        price: Number(planForm.price) || 0,
        billingCycle: planForm.billingCycle,
        features: planForm.featuresList
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        usageLimits: {
          storageGb: Number(planForm.storageGb) || 5,
          aiCredits: Number(planForm.aiCredits) || 100
        },
        ...(websiteId && websiteId !== "all" ? { websiteId } : {})
      };

      if (editingPlanId) {
        await api(`/api/crm/plans/${editingPlanId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Plan updated");
      } else {
        await api(`/api/crm/plans`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Plan created");
      }
      closePlanModal();
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save plan");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id) => {
    try {
      await api(`/api/crm/plans/${id}`, { method: "DELETE" });
      setConfirmDeletePlanId(null);
      toast.success("Plan deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete plan");
    }
  };

  const handleTriggerCron = async () => {
    setRunningCron(true);
    try {
      const res = await api(`/api/crm/subscriptions/cron`, { method: "POST" });
      toast.success(res?.message || "Billing cron executed");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Billing cron failed");
    } finally {
      setRunningCron(false);
    }
  };

  if (!websiteId || websiteId === "undefined" || websiteId === "null") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
        <AlertCircle size={28} className="text-slate-400 mb-2" />
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
          Website Scoped Context Required
        </h4>
        <p className="text-[10px] font-medium text-slate-400 max-w-sm mt-1">
          Select a domain from the top website selector to configure billing plans and subscriptions.
        </p>
      </div>
    );
  }

  const filteredSubscriptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscriptions.filter((s) => {
      const custName = s.customerId?.name || s.customerId?.companyName || "";
      const planName = s.planId?.name || "";
      const matchesSearch =
        !q || custName.toLowerCase().includes(q) || planName.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (s.status || "active").toLowerCase() === statusFilter.toLowerCase();
      const matchesCycle =
        cycleFilter === "all" ||
        (s.billingCycle || "monthly").toLowerCase() === cycleFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesCycle;
    });
  }, [subscriptions, search, statusFilter, cycleFilter]);

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage) || 1;
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscriptions.slice(start, start + itemsPerPage);
  }, [filteredSubscriptions, currentPage, itemsPerPage]);

  const handleExportSubsCSV = () => {
    if (filteredSubscriptions.length === 0) {
      toast.info("No subscriptions to export");
      return;
    }
    const sym = getCurrencySymbol();
    const data = filteredSubscriptions.map((s) => {
      const renew = s.renewalDate || s.nextBillingDate;
      return {
        "Customer / Company": s.customerId?.companyName || s.customerId?.name || "-",
        "Plan Tier": s.planId?.name || "Standard",
        "Billing Cycle": (s.billingCycle || "monthly").toUpperCase(),
        Seats: s.seats || 1,
        [`Value (${sym})`]: s.planId?.price ? s.planId.price * (s.seats || 1) : 0,
        Status: (s.status || "active").toUpperCase(),
        "Renewal Date": renew ? new Date(renew).toLocaleDateString() : "-"
      };
    });
    exportToCSV(data, `Subscriptions_MRR_Report_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported CSV");
  };

  const handleExportSubsPDF = () => {
    if (filteredSubscriptions.length === 0) {
      toast.info("No subscriptions to export");
      return;
    }
    const data = filteredSubscriptions.map((s) => {
      const renew = s.renewalDate || s.nextBillingDate;
      return {
        Customer: s.customerId?.companyName || s.customerId?.name || "-",
        Plan: s.planId?.name || "Standard",
        Cycle: (s.billingCycle || "monthly").toUpperCase(),
        Status: (s.status || "active").toUpperCase(),
        "Next Bill": renew ? new Date(renew).toLocaleDateString() : "-"
      };
    });
    exportToPDF(
      data,
      `Subscriptions_MRR_Report_${new Date().toISOString().slice(0, 10)}`,
      "SUBSCRIPTIONS & RECURRING BILLING MRR REPORT"
    );
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Repeat size={14} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
              Subscription & Recurring Billing
            </h3>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Manage tiers, billing cycles, seats & automated renewals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={fetchData}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportSubsCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportSubsPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
          <button
            onClick={openNewPlanModal}
            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[9.5px] font-black uppercase text-slate-700 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus size={11} className="text-indigo-500" /> Plan
          </button>
          <button
            onClick={openNewSubModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-[9.5px] font-black uppercase text-white rounded-lg flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus size={11} /> Assign Sub
          </button>
          <button
            onClick={handleTriggerCron}
            disabled={runningCron}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-[9.5px] font-black uppercase text-white rounded-lg flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={11} className={runningCron ? "animate-spin" : ""} />
            {runningCron ? "Running..." : "Billing Cron"}
          </button>
        </div>
      </div>

      {/* Compact KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Active Subs
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.activeSubs} Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Est. Monthly MRR
            </span>
            <span className="text-sm font-black text-emerald-700">
              ${Math.round(metrics.totalMRR).toLocaleString()}/mo
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Configured Plans
            </span>
            <span className="text-sm font-black text-blue-700">{metrics.totalPlans} Tiers</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Total Subscriptions
            </span>
            <span className="text-sm font-black text-amber-700">{metrics.totalSubs} Total</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search subscriptions by customer or plan name..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[9.5px] font-bold text-slate-700 uppercase outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="past_due">Past Due</option>
          </select>

          <select
            value={cycleFilter}
            onChange={(e) => {
              setCycleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[9.5px] font-bold text-slate-700 uppercase outline-none"
          >
            <option value="all">All Cycles</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <div className="lg:col-span-2 h-52 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          <div className="h-52 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Active Subscriptions list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between space-y-2.5 min-h-[280px]">
            <div>
              <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-500" /> Subscriptions (
                  {filteredSubscriptions.length})
                </h4>
              </div>

              {paginatedSubscriptions.length === 0 ? (
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider text-center py-8">
                  No subscriptions found matching filters.
                </p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {paginatedSubscriptions.map((s) => {
                    const renew = s.renewalDate || s.nextBillingDate;
                    const isConfirming = confirmDeleteSubId === s._id;
                    const st = (s.status || "active").toLowerCase();
                    return (
                      <div
                        key={s._id}
                        className="px-3 py-2 border border-slate-100 hover:border-indigo-200 rounded-xl flex justify-between items-center gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 truncate">
                            <span className="truncate">
                              {s.customerId?.name || s.customerId?.companyName || "Customer"}
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-400">→</span>
                            <span className="text-indigo-600 font-black truncate">
                              {s.planId?.name || "No Plan"}
                            </span>
                          </h5>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            Renewal: {renew ? new Date(renew).toLocaleDateString() : "N/A"} •{" "}
                            {s.billingCycle || "monthly"} • {s.seats || 1} seat(s)
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase ${
                              st === "active" || st === "renewed"
                                ? "bg-emerald-50 text-emerald-600"
                                : st === "suspended"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {s.status || "active"}
                          </span>

                          <button
                            onClick={() =>
                              exportSingleRecordPDF(
                                `SUBSCRIPTION SUMMARY - ${
                                  s.customerId?.name || s.customerId?.companyName || "Customer"
                                }`,
                                {
                                  "Customer / Client":
                                    s.customerId?.name || s.customerId?.companyName || "-",
                                  "Plan Tier": s.planId?.name || "Standard Plan",
                                  "Billing Cycle": (s.billingCycle || "monthly").toUpperCase(),
                                  "Seats Allocated": s.seats || 1,
                                  "Plan Value": formatCurrency(
                                    (s.planId?.price || 0) * (s.seats || 1)
                                  ),
                                  "Subscription Status": (s.status || "active").toUpperCase(),
                                  "Next Renewal Date": renew
                                    ? new Date(renew).toLocaleDateString()
                                    : "-"
                                },
                                `Subscription_${(
                                  s.customerId?.companyName ||
                                  s.customerId?.name ||
                                  "Record"
                                ).replace(/\s+/g, "_")}`
                              )
                            }
                            title="Export Single Subscription PDF"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Printer size={12} />
                          </button>
                          <button
                            onClick={() => openEditSubModal(s)}
                            title="Edit Subscription"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <Edit3 size={12} />
                          </button>
                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteSub(s._id)}
                                className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8.5px] font-black uppercase"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSubId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[8.5px] font-bold uppercase"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteSubId(s._id)}
                              title="Delete Subscription"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredSubscriptions.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9.5px] font-bold text-slate-500 mt-auto">
                <span>
                  {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} of{" "}
                  {filteredSubscriptions.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9px] font-black uppercase"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9px] font-black uppercase"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Plans list */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-2.5">
            <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center gap-1.5">
              <Cpu size={13} className="text-indigo-500" /> Subscription Plans ({plans.length})
            </h4>

            {plans.length === 0 ? (
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider text-center py-8">
                No plans configured.
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
                {plans.map((p) => {
                  const isConfirming = confirmDeletePlanId === p._id;
                  return (
                    <div
                      key={p._id}
                      className="p-2.5 bg-slate-50/70 border border-slate-100 hover:border-indigo-200 rounded-xl space-y-1.5 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h5 className="text-[11px] font-black text-slate-800 truncate">{p.name}</h5>
                          <span className="text-[10.5px] font-extrabold text-indigo-600 block">
                            ${Number(p.price || 0).toLocaleString()}/{p.billingCycle}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditPlanModal(p)}
                            title="Edit Plan"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                          >
                            <Edit3 size={11} />
                          </button>
                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeletePlan(p._id)}
                                className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black uppercase"
                              >
                                Del
                              </button>
                              <button
                                onClick={() => setConfirmDeletePlanId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[8px] font-bold uppercase"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeletePlanId(p._id)}
                              title="Delete Plan"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[8.5px] font-bold text-slate-400 uppercase">
                        Limits: {p.usageLimits?.storageGb ?? 0}GB • {p.usageLimits?.aiCredits ?? 0} AI
                        Credits
                      </p>

                      {p.features && p.features.length > 0 && (
                        <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1">
                          {p.features.map((f, i) => (
                            <span
                              key={i}
                              className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Form Modal */}
      {showSubForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeSubModal} />
          <form
            onSubmit={handleSaveSub}
            className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingSubId ? "Edit Subscription" : "Assign Subscription"}
              </h3>
              <button
                type="button"
                onClick={closeSubModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Select Customer
              </label>
              <select
                required
                disabled={!!editingSubId}
                value={subForm.customerId}
                onChange={(e) => setSubForm({ ...subForm, customerId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700 disabled:opacity-60"
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
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Select Plan
              </label>
              <select
                required
                value={subForm.planId}
                onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
              >
                <option value="">Choose Plan...</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (${p.price}/{p.billingCycle})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Seats
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={subForm.seats}
                  onChange={(e) => setSubForm({ ...subForm, seats: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Billing Cycle
                </label>
                <select
                  value={subForm.billingCycle}
                  onChange={(e) => setSubForm({ ...subForm, billingCycle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Duration (Months)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={subForm.durationMonths}
                  onChange={(e) =>
                    setSubForm({ ...subForm, durationMonths: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={subForm.status}
                  onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeSubModal}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingSub}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {savingSub ? "Saving..." : editingSubId ? "Update Sub" : "Save Sub"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Plan Form Modal */}
      {showPlanForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={closePlanModal}
          />
          <form
            onSubmit={handleSavePlan}
            className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingPlanId ? "Edit Pricing Plan" : "Create Pricing Plan"}
              </h3>
              <button
                type="button"
                onClick={closePlanModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Plan Name
                </label>
                <input
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Starter Enterprise"
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Price ({getCurrencySymbol()})
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Storage (GB)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={planForm.storageGb}
                  onChange={(e) => setPlanForm({ ...planForm, storageGb: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  AI Credits
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={planForm.aiCredits}
                  onChange={(e) => setPlanForm({ ...planForm, aiCredits: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                Billing Frequency
              </label>
              <select
                value={planForm.billingCycle}
                onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Features (comma separated)
              </label>
              <input
                value={planForm.featuresList}
                onChange={(e) => setPlanForm({ ...planForm, featuresList: e.target.value })}
                placeholder="CRM Access, Analytics, AI Copilot"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closePlanModal}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPlan}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {savingPlan ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
