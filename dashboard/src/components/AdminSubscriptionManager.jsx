import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Zap, Users, Filter, X, Globe, Tag, Check, Sparkles, Clock,
  Edit3, Plus, Trash2, Search, RefreshCw, DollarSign, Layers,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { api } from "../api/client.js";

const MODULE_OPTIONS = [
  { key: "service", label: "Helpdesk & Omnichannel Inbox" },
  { key: "crm", label: "CRM & Lead Pipeline" },
  { key: "operations", label: "Inventory & Procurement" },
  { key: "finance", label: "Finance, Quotes & Invoicing" },
  { key: "automation", label: "AI Copilot & Workflows" },
  { key: "reports", label: "BI Reports & Analytics" },
  { key: "security", label: "Security, Audit & RBAC" },
  { key: "enterprise", label: "Enterprise SLA & Integrations" }
];

const STATUS_STYLES = {
  active: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
  trialing: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
  expired: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20" },
  suspended: { dot: "bg-slate-500", text: "text-slate-700 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10" }
};

export default function AdminSubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Filters & View Controls
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSubscriptions = async () => {
    try {
      const data = await api("/api/billing/admin/all");
      setSubscriptions(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load subscriptions");
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await api("/api/subscription-plans");
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load plans:", err);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([fetchSubscriptions(), fetchPlans()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Dynamic Plan Lookup & Live Metrics
  const planMap = useMemo(() => {
    const map = {};
    plans.forEach((p) => {
      if (p.code) map[p.code.toLowerCase()] = p;
    });
    return map;
  }, [plans]);

  const metrics = useMemo(() => {
    let activeCount = 0;
    let trialingCount = 0;
    let attentionCount = 0;
    let mrr = 0;
    const clientCountByPlan = {};

    subscriptions.forEach((sub) => {
      const status = (sub.subscription?.status || "active").toLowerCase();
      const planCode = (sub.subscription?.plan || "basic").toLowerCase();
      clientCountByPlan[planCode] = (clientCountByPlan[planCode] || 0) + 1;

      if (status === "active") {
        activeCount += 1;
        const matchedPlan = planMap[planCode];
        if (matchedPlan) {
          const basePrice = Number(matchedPlan.monthlyPrice || 0);
          const discount = Number(sub.subscription?.discountPercentage || 0);
          mrr += basePrice * (1 - Math.min(Math.max(discount, 0), 100) / 100);
        }
      } else if (status === "trialing") {
        trialingCount += 1;
      } else if (status === "expired" || status === "suspended") {
        attentionCount += 1;
      }
    });

    return {
      totalClients: subscriptions.length,
      activeCount,
      trialingCount,
      attentionCount,
      mrr: Math.round(mrr),
      clientCountByPlan
    };
  }, [subscriptions, planMap]);

  const filteredSubscriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subscriptions.filter((s) => {
      const status = (s.subscription?.status || "active").toLowerCase();
      const planCode = (s.subscription?.plan || "basic").toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (planFilter !== "all" && planCode !== planFilter) return false;
      if (q) {
        const hay = `${s.name || ""} ${s.email || ""} ${s.subscription?.offerCode || ""} ${planCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [subscriptions, statusFilter, planFilter, searchQuery]);

  const openClientDetails = (client) => {
    const code = (client.subscription?.plan || "pro").toLowerCase();
    const matched = planMap[code];
    setSelectedClient(client);
    setEditPlan(code);
    setEditStatus(client.subscription?.status || "active");
    setEditOfferCode(client.subscription?.offerCode || "");
    setEditDiscount(client.subscription?.discountPercentage || 0);
    setEditAgentSeats(client.subscription?.limits?.agents ?? matched?.limits?.agents ?? 10);
    setEditWebsiteSlots(client.subscription?.limits?.websites ?? matched?.limits?.websites ?? 5);
    setEditDuration(30);
  };

  const handlePlanChangeForClient = (newCode) => {
    setEditPlan(newCode);
    const matched = planMap[newCode.toLowerCase()];
    if (matched) {
      setEditAgentSeats(matched.limits?.agents ?? 5);
      setEditWebsiteSlots(matched.limits?.websites ?? 2);
    }
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
          discountPercentage: Number(editDiscount) || 0,
          agentSeats: Number(editAgentSeats) || 1,
          websiteSlots: Number(editWebsiteSlots) || 1,
          durationDays: Number(editDuration) || 30
        })
      });
      showToast(`Subscription updated for ${selectedClient.name}`);
      setSelectedClient(null);
      fetchSubscriptions();
    } catch (err) {
      showToast(`Failed to update: ${err.message}`, "error");
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
      monthlyPrice: plan.monthlyPrice ?? 0,
      annualPrice: plan.annualPrice ?? 0,
      currencySymbol: plan.currencySymbol || "$",
      agents: plan.limits?.agents ?? 5,
      websites: plan.limits?.websites ?? 2,
      includedModules: (plan.includedModules || ["service", "crm", "operations", "finance", "automation", "reports", "security"]).filter((m) => m !== "compliance"),
      isPopular: !!plan.isPopular
    });
    setPlanModalOpen(true);
  };

  const handleSavePlanPackage = async (e) => {
    e.preventDefault();
    setSavingPlanPackage(true);
    try {
      const payload = {
        ...planFormData,
        monthlyPrice: Number(planFormData.monthlyPrice) || 0,
        annualPrice: Number(planFormData.annualPrice) || 0,
        agents: Number(planFormData.agents) || 1,
        websites: Number(planFormData.websites) || 1
      };
      if (editingPlanId) {
        await api(`/api/subscription-plans/${editingPlanId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        showToast(`Plan "${planFormData.name}" updated`);
      } else {
        await api("/api/subscription-plans", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showToast(`Plan "${planFormData.name}" created`);
      }
      setPlanModalOpen(false);
      fetchPlans();
    } catch (err) {
      showToast(`Failed to save plan: ${err.message}`, "error");
    } finally {
      setSavingPlanPackage(false);
    }
  };

  const handleDeletePlanPackage = async (plan) => {
    if (!window.confirm(`Delete "${plan.name}" plan package?`)) return;
    try {
      await api(`/api/subscription-plans/${plan._id}`, { method: "DELETE" });
      showToast(`Plan "${plan.name}" deleted`);
      fetchPlans();
    } catch (err) {
      showToast(`Failed to delete: ${err.message}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[11px] text-slate-500 font-semibold">Loading subscriptions & pricing plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inline Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[10000] flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${toast.type === "error"
          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800"
          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800"
          }`}>
          {toast.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {error && (
        <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => loadData(true)} className="underline text-[11px] font-semibold">Retry</button>
        </div>
      )}

      {/* ── LIVE REVENUE & SUBSCRIPTION KPI STRIP ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl px-3.5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Est. Active MRR</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">${metrics.mrr.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl px-3.5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Clients</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {metrics.activeCount} <span className="text-[11px] font-medium text-slate-400">/ {metrics.totalClients}</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl px-3.5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Trialing / Due</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {metrics.trialingCount} <span className="text-[11px] font-medium text-rose-500">({metrics.attentionCount} due)</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock size={15} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl px-3.5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pricing Tiers</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{plans.length} Plans</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Layers size={15} />
          </div>
        </div>
      </div>

      {/* ── SECTION 1: SAAS SUBSCRIPTION PLANS CATALOG ────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">SaaS Product Architecture</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                {plans.length} Active Tiers
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Subscription Plans & Pricing Catalog</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage dynamic pricing tiers, agent & domain limits, and module access across workspaces.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Monthly / Annual Dynamic Preview Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${billingCycle === "monthly"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${billingCycle === "annual"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                Annual
              </button>
            </div>

            <button
              onClick={openCreatePlanModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-semibold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Plan
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((p) => {
            const planCode = (p.code || "").toLowerCase();
            const subscriberCount = metrics.clientCountByPlan[planCode] || 0;
            const displayPrice = billingCycle === "annual" ? p.annualPrice : p.monthlyPrice;
            const cycleLabel = billingCycle === "annual" ? "/ year" : "/ month";
            const altPrice = billingCycle === "annual"
              ? `Monthly: ${p.currencySymbol || "$"}${p.monthlyPrice}/mo`
              : `Annual: ${p.currencySymbol || "$"}${p.annualPrice}/yr`;

            return (
              <div
                key={p._id || p.code}
                className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${p.isPopular
                  ? "bg-indigo-50/40 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/50 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                  }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-2.5 right-3 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles size={9} /> Popular
                  </span>
                )}

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-md">
                        {p.code}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {subscriberCount} {subscriberCount === 1 ? "client" : "clients"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openEditPlanModal(p)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Edit Plan"
                      >
                        <Edit3 size={13} />
                      </button>
                      {p._id && (
                        <button
                          onClick={() => handleDeletePlanPackage(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete Plan"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug">{p.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {p.currencySymbol || "$"}{displayPrice}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">{cycleLabel}</span>
                    </div>
                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{altPrice}</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5"><Users size={11} className="text-indigo-500" /> Agent Seats</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{p.limits?.agents ?? 5}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5"><Globe size={11} className="text-amber-500" /> Domain Slots</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{p.limits?.websites ?? 2}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Modules</span>
                    <div className="flex flex-wrap gap-1">
                      {(p.includedModules || []).filter((m) => m !== "compliance").map((m) => (
                        <span
                          key={m}
                          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEditPlanModal(p)}
                  className="mt-3 w-full py-1.5 bg-slate-50 dark:bg-white/5 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:border-transparent rounded-lg text-[11px] font-semibold transition-all"
                >
                  Edit Package
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2: CLIENT SUBSCRIPTION LEDGER ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Client Subscriptions</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Master Client Subscription Ledger</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Assign plans, apply promo codes, override seat/domain limits, and extend validity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client, email, promo..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 outline-none w-48"
              />
            </div>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">All Plans</option>
              {plans.map((p) => (
                <option key={p.code} value={p.code.toLowerCase()}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5">
              <Filter size={12} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <th className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Client</th>
                <th className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Plan & Limits</th>
                <th className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Promo Offer</th>
                <th className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Validity</th>
                <th className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">Status</th>
                <th className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredSubscriptions.map((sub) => {
                const statusKey = (sub.subscription?.status || "active").toLowerCase();
                const statusStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.active;
                const planCode = (sub.subscription?.plan || "basic").toLowerCase();
                const matchedPlan = planMap[planCode];
                const agentsLimit = sub.subscription?.limits?.agents ?? matchedPlan?.limits?.agents ?? "-";
                const sitesLimit = sub.subscription?.limits?.websites ?? matchedPlan?.limits?.websites ?? "-";
                const expiryDate = sub.subscription?.currentPeriodEnd
                  ? new Date(sub.subscription.currentPeriodEnd).toLocaleDateString()
                  : "Active";

                return (
                  <tr key={sub._id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                          {(sub.name || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{sub.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{sub.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${planCode === "enterprise" ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20" :
                          planCode === "pro" ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20" :
                            planCode === "standard" ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20" :
                              "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20"
                          }`}>
                          {matchedPlan?.name || planCode}
                        </span>
                        <span className="text-[11px] text-slate-400">{agentsLimit}s · {sitesLimit}d</span>
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      {sub.subscription?.offerCode ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 rounded-md text-[10px] font-semibold">
                          <Tag size={10} /> {sub.subscription.offerCode} ({sub.subscription.discountPercentage || 0}% off)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Standard</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {expiryDate}
                    </td>

                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusKey}
                      </span>
                    </td>

                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openClientDetails(sub)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-white/5 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-slate-700 dark:text-slate-200 rounded-lg transition-all border border-slate-200/80 dark:border-white/10 hover:border-transparent text-[11px] font-semibold"
                      >
                        <Edit3 size={12} /> Manage
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-xs text-slate-400">
                    No matching client subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: CREATE / EDIT SAAS PLAN PACKAGE MODAL ─────────────────── */}
      {planModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] p-3 sm:p-4 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm pointer-events-auto" onClick={() => setPlanModalOpen(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/70 dark:bg-black/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Layers size={15} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider leading-none">SaaS Product Catalog</p>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {editingPlanId ? "Edit Subscription Plan" : "Create Subscription Plan"}
                  </h2>
                </div>
              </div>
              <button onClick={() => setPlanModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePlanPackage} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Plan Name</label>
                    <input
                      value={planFormData.name}
                      onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      placeholder="Gold Growth Tier"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Unique Code</label>
                    <input
                      value={planFormData.code}
                      onChange={(e) => setPlanFormData({ ...planFormData, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      disabled={!!editingPlanId}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none disabled:opacity-60"
                      placeholder="gold_tier"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                  <input
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    placeholder="Package description & benefits..."
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Monthly</label>
                    <input
                      type="number"
                      value={planFormData.monthlyPrice}
                      onChange={(e) => setPlanFormData({ ...planFormData, monthlyPrice: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Annual</label>
                    <input
                      type="number"
                      value={planFormData.annualPrice}
                      onChange={(e) => setPlanFormData({ ...planFormData, annualPrice: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Currency</label>
                    <input
                      value={planFormData.currencySymbol}
                      onChange={(e) => setPlanFormData({ ...planFormData, currencySymbol: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none text-center"
                      placeholder="$"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Agent Seats</label>
                    <input
                      type="number"
                      value={planFormData.agents}
                      onChange={(e) => setPlanFormData({ ...planFormData, agents: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Domain Slots</label>
                    <input
                      type="number"
                      value={planFormData.websites}
                      onChange={(e) => setPlanFormData({ ...planFormData, websites: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Included Modules</label>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={planFormData.isPopular}
                        onChange={(e) => setPlanFormData({ ...planFormData, isPopular: e.target.checked })}
                        className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Sparkles size={11} className="text-indigo-500" /> Highlight as Most Popular
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {MODULE_OPTIONS.map((mod) => {
                      const isChecked = (planFormData.includedModules || []).includes(mod.key);
                      const toggleMod = () => {
                        const current = planFormData.includedModules || [];
                        const next = isChecked ? current.filter((m) => m !== mod.key) : [...current, mod.key];
                        setPlanFormData({ ...planFormData, includedModules: next });
                      };
                      return (
                        <button
                          key={mod.key}
                          type="button"
                          onClick={toggleMod}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${isChecked
                            ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-400/50 text-indigo-700 dark:text-indigo-300"
                            : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-400 hover:text-slate-600"
                            }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${isChecked ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
                            {isChecked && <Check size={9} strokeWidth={3} />}
                          </div>
                          <span className="text-[11px] font-semibold truncate">{mod.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-black/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlanPackage}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {savingPlanPackage ? "Saving..." : editingPlanId ? "Update Plan" : "Publish Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: CLIENT SUBSCRIPTION & OFFER ASSIGN MODAL ─────────────── */}
      {selectedClient && createPortal(
        <div className="fixed inset-0 z-[9999] p-3 sm:p-4 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedClient(null)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/70 dark:bg-black/20">
              <div>
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider leading-none">Superadmin Control</p>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Manage Client Subscription</h2>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="flex items-center gap-2.5 p-2.5 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(selectedClient.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedClient.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{selectedClient.email}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold uppercase border border-indigo-100 dark:border-white/10">
                    {selectedClient.subscription?.plan || "basic"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Zap size={11} className="text-indigo-500" /> Plan Tier
                    </label>
                    <select
                      value={editPlan}
                      onChange={(e) => handlePlanChangeForClient(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    >
                      {plans.map((p) => (
                        <option key={p.code} value={p.code.toLowerCase()}>
                          {p.name} ({p.currencySymbol || "$"}{p.monthlyPrice}/mo)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Billing Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                      <option value="expired">Expired / Due</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Agent Seats</label>
                    <input
                      type="number"
                      value={editAgentSeats}
                      onChange={(e) => setEditAgentSeats(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Domain Slots</label>
                    <input
                      type="number"
                      value={editWebsiteSlots}
                      onChange={(e) => setEditWebsiteSlots(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Promo Code</label>
                    <input
                      value={editOfferCode}
                      onChange={(e) => setEditOfferCode(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none uppercase"
                      placeholder="LAUNCH26"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                    <Clock size={11} className="text-indigo-500" /> Validity Extension
                  </label>
                  <select
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                  >
                    <option value={30}>+ 1 Month (30 Days)</option>
                    <option value={90}>+ 3 Months (90 Days)</option>
                    <option value={180}>+ 6 Months (180 Days)</option>
                    <option value={365}>+ 1 Year (365 Days)</option>
                    <option value={3650}>Lifetime (10 Years)</option>
                  </select>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-black/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {saving ? "Updating..." : "Save Subscription"}
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
