import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, DollarSign, Server, RefreshCw, Download, Save,
  ArrowUpRight, ArrowDownRight, Percent, Search, X
} from "lucide-react";
import { api } from "../api/client.js";

const COST_FIELDS = [
  { key: "serverCost", label: "Server Hosting ($)" },
  { key: "mongoCost", label: "MongoDB Cluster ($)" },
  { key: "storageCost", label: "Cloud Storage ($)" },
  { key: "bandwidthCost", label: "Bandwidth ($)" },
  { key: "emailCost", label: "Email Gateway ($)" },
  { key: "whatsappCost", label: "WhatsApp API ($)" },
  { key: "smsCost", label: "SMS Gateway ($)" },
  { key: "apiCost", label: "3rd-Party APIs ($)" },
  { key: "backupCost", label: "Backups & Security ($)" },
  { key: "monitoringCost", label: "Monitoring & Logs ($)" },
  { key: "cacBudget", label: "Monthly CAC Budget ($)" }
];

const EMPTY_COSTS = {
  serverCost: 0,
  mongoCost: 0,
  storageCost: 0,
  bandwidthCost: 0,
  emailCost: 0,
  whatsappCost: 0,
  smsCost: 0,
  apiCost: 0,
  backupCost: 0,
  monitoringCost: 0,
  cacBudget: 0
};

export default function SaaSFinancialCenter() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [data, setData] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCosts, setSavingCosts] = useState(false);
  const [costEditing, setCostEditing] = useState(false);
  const [costs, setCosts] = useState(EMPTY_COSTS);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState("all");

  const syncCostsFromResponse = (costObj) => {
    if (!costObj) {
      setCosts(EMPTY_COSTS);
      return;
    }
    setCosts({
      serverCost: costObj.serverCost ?? 0,
      mongoCost: costObj.mongoCost ?? 0,
      storageCost: costObj.storageCost ?? 0,
      bandwidthCost: costObj.bandwidthCost ?? 0,
      emailCost: costObj.emailCost ?? 0,
      whatsappCost: costObj.whatsappCost ?? 0,
      smsCost: costObj.smsCost ?? 0,
      apiCost: costObj.apiCost ?? 0,
      backupCost: costObj.backupCost ?? 0,
      monitoringCost: costObj.monitoringCost ?? 0,
      cacBudget: costObj.cacBudget ?? 0
    });
  };

  const fetchData = async (month = selectedMonth) => {
    setLoading(true);
    try {
      const qs = `?month=${encodeURIComponent(month)}`;
      const [overviewRes, tenantsRes] = await Promise.all([
        api(`/api/financial-analytics/overview${qs}`),
        api(`/api/financial-analytics/tenants${qs}`)
      ]);
      setData(overviewRes);
      setTenants(Array.isArray(tenantsRes) ? tenantsRes : []);
      syncCostsFromResponse(overviewRes?.costAnalytics);
    } catch (err) {
      console.error("Failed to load financial analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const handleSaveCosts = async () => {
    setSavingCosts(true);
    try {
      await api("/api/financial-analytics/costs", {
        method: "POST",
        body: JSON.stringify({ ...costs, month: selectedMonth })
      });
      setCostEditing(false);
      await fetchData(selectedMonth);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCosts(false);
    }
  };

  const handleCancelEdit = () => {
    syncCostsFromResponse(data?.costAnalytics);
    setCostEditing(false);
  };

  const exportCSV = (filename, rows) => {
    const processRow = (row) => row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",");
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(processRow).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProfitability = () => {
    const rows = [
      ["Company Name", "Email", "Plan", "Status", "Websites", "Customers", "MRR ($)", "Allocated Cost ($)", "Net Profit ($)", "Margin (%)", "Health Score"],
      ...tenants.map((t) => [
        t.companyName,
        t.email,
        t.plan,
        t.status,
        t.websitesCount,
        t.customerRecords,
        t.revenue,
        t.estCost,
        t.profit,
        `${t.margin}%`,
        t.healthScore
      ])
    ];
    exportCSV("SaaS_Financial_Report", rows);
  };

  const filteredTenants = useMemo(() => {
    const q = tenantSearch.trim().toLowerCase();
    return tenants.filter((t) => {
      if (tenantStatusFilter !== "all" && t.status !== tenantStatusFilter) return false;
      if (!q) return true;
      return (
        String(t.companyName || "").toLowerCase().includes(q) ||
        String(t.email || "").toLowerCase().includes(q) ||
        String(t.plan || "").toLowerCase().includes(q)
      );
    });
  }, [tenants, tenantSearch, tenantStatusFilter]);

  const draftInfraTotal = useMemo(() => {
    return (
      (Number(costs.serverCost) || 0) +
      (Number(costs.mongoCost) || 0) +
      (Number(costs.storageCost) || 0) +
      (Number(costs.bandwidthCost) || 0) +
      (Number(costs.emailCost) || 0) +
      (Number(costs.whatsappCost) || 0) +
      (Number(costs.smsCost) || 0) +
      (Number(costs.apiCost) || 0) +
      (Number(costs.backupCost) || 0) +
      (Number(costs.monitoringCost) || 0)
    );
  }, [costs]);

  if (loading && !data) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading SaaS Financial Analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const subAnalytics = data?.subscriptionAnalytics || {};
  const custAnalytics = data?.customerAnalytics || {};
  const costAnalytics = data?.costAnalytics || {};
  const saasMetrics = data?.saasMetrics || {};
  const monthlyTrend = data?.monthlyTrend || [];

  const activeCostComponents = COST_FIELDS.slice(0, 10).filter((f) => Number(costAnalytics[f.key] || 0) > 0).length;
  const maxTrendVal = Math.max(1, ...monthlyTrend.map((m) => Math.max(m.mrr || 0, m.cost || 0)));
  const growthVal = Number(summary.growthPercentage ?? 0);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Compact Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={16} />
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">SaaS Financial Analytics & Cost Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
            Live Revenue, MRR/ARR, Unit Economics & Monthly Infra Cost Allocation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
            title="Select Reporting Month"
          />
          <button
            onClick={() => fetchData(selectedMonth)}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            title="Refresh Financial Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportProfitability}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Monthly Recurring Revenue</span>
            <DollarSign size={13} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">${Number(summary.mrr || 0).toLocaleString()}</h3>
          <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-0.5 ${growthVal >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {growthVal >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {growthVal >= 0 ? `+${growthVal}%` : `${growthVal}%`} MoM ({data?.prevMonth || "prev"}: ${Number(summary.lastMonthRevenue || 0).toLocaleString()})
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp size={13} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-black text-indigo-600 mt-1">${Number(summary.arr || 0).toLocaleString()}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
            Trial Pipeline: ${Number(summary.trialPipelineMrr || 0).toLocaleString()}/mo
          </p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-[9px] font-black uppercase tracking-wider">
            <span>Net Profit Margin</span>
            <Percent size={13} />
          </div>
          <h3 className={`text-xl font-black mt-1 ${Number(summary.netProfitMargin || 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            {summary.netProfitMargin ?? 0}%
          </h3>
          <p className="text-[10px] font-bold text-emerald-700/80 mt-0.5">
            Net Profit: ${Number(summary.netProfit || 0).toLocaleString()} / mo
          </p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Monthly Infra Cost</span>
            <Server size={13} className="text-rose-400" />
          </div>
          <h3 className="text-xl font-black text-rose-400 mt-1">${Number(costAnalytics.totalInfraCost || 0).toLocaleString()}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
            {activeCostComponents}/10 Active Components • CAC ${Number(costAnalytics.cacBudget || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 w-fit gap-1">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${activeSubTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
        >
          Revenue & SaaS Metrics
        </button>
        <button
          onClick={() => setActiveSubTab("costs")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${activeSubTab === "costs" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
        >
          Cost Management
        </button>
        <button
          onClick={() => setActiveSubTab("tenants")}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${activeSubTab === "tenants" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
        >
          Tenant Profitability ({tenants.length})
        </button>
      </div>

      {/* Sub-Tab 1: Overview & SaaS Metrics */}
      {activeSubTab === "overview" && (
        <div className="space-y-4">
          {/* SaaS Unit Economics Matrix */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100">
              SaaS Unit Economics & Customer Lifetime Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[9px] font-black uppercase text-slate-400 block">ARPU (Paid Client)</span>
                <strong className="text-base font-black text-slate-900 mt-0.5 block">${Number(saasMetrics.arpu || 0).toLocaleString()} / mo</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[9px] font-black uppercase text-slate-400 block">LTV (Lifetime Value)</span>
                <strong className="text-base font-black text-emerald-600 mt-0.5 block">${Number(saasMetrics.ltv || 0).toLocaleString()}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[9px] font-black uppercase text-slate-400 block">CAC (Per New Client)</span>
                <strong className="text-base font-black text-indigo-600 mt-0.5 block">${Number(saasMetrics.cac || 0).toLocaleString()}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Churn Rate</span>
                <strong className="text-base font-black text-rose-600 mt-0.5 block">{saasMetrics.churnRate ?? 0}%</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-[9px] font-black uppercase text-slate-400 block">Retention Rate</span>
                <strong className="text-base font-black text-emerald-600 mt-0.5 block">{saasMetrics.retentionRate ?? 100}%</strong>
              </div>
            </div>
          </div>

          {/* 6-Month Revenue vs Cost Trend */}
          {monthlyTrend.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">6-Month MRR vs Total Cost Trend</h3>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> MRR</span>
                  <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Total Cost</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 items-end h-28 pt-2">
                {monthlyTrend.map((pt) => (
                  <div key={pt.month} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1 flex-1">
                      <div
                        className="w-3 bg-indigo-500 rounded-t transition-all"
                        style={{ height: `${Math.max(4, Math.round((pt.mrr / maxTrendVal) * 100))}%` }}
                        title={`MRR: $${pt.mrr}`}
                      />
                      <div
                        className="w-3 bg-rose-400 rounded-t transition-all"
                        style={{ height: `${Math.max(4, Math.round((pt.cost / maxTrendVal) * 100))}%` }}
                        title={`Cost: $${pt.cost}`}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">{pt.month.slice(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscriptions & Accounts Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100">Subscription Status Breakdown</h4>
              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700 text-[11px]">Active Paid Subscriptions</span>
                  <span className="font-black text-emerald-900 text-xs">{subAnalytics.activeSubscriptions || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-sky-50 px-3 py-2 rounded-xl border border-sky-100">
                  <span className="text-sky-700 text-[11px]">Trial Accounts</span>
                  <span className="font-black text-sky-900 text-xs">{subAnalytics.trialAccounts || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                  <span className="text-amber-700 text-[11px]">Renewals Due (Next 30 Days)</span>
                  <span className="font-black text-amber-900 text-xs">{subAnalytics.renewalsDueNext30Days || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">
                  <span className="text-rose-700 text-[11px]">Expired & Suspended Accounts</span>
                  <span className="font-black text-rose-900 text-xs">{(subAnalytics.expiredAccounts || 0) + (subAnalytics.cancelledAccounts || 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide border-b pb-2 border-slate-100">Customer Scale Metrics</h4>
              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-[11px]">Total Enrolled Companies</span>
                  <span className="font-black text-slate-900 text-xs">{custAnalytics.totalCompanies || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-[11px]">Active & Trial Companies</span>
                  <span className="font-black text-emerald-600 text-xs">{custAnalytics.activeCompanies || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-[11px]">Total System Users</span>
                  <span className="font-black text-indigo-600 text-xs">{custAnalytics.totalUsers || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-[11px]">Avg Infra Cost / Active Company</span>
                  <span className="font-black text-rose-600 text-xs">${saasMetrics.costPerCustomer || 0} / mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Cost Management */}
      {activeSubTab === "costs" && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Monthly Infrastructure Expense ({selectedMonth})
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Infra Total: <span className="text-slate-800">${draftInfraTotal.toLocaleString()}</span> • Total incl. CAC:{" "}
                <span className="text-indigo-600">${(draftInfraTotal + (Number(costs.cacBudget) || 0)).toLocaleString()}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {costEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 font-black uppercase text-[10px] rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCosts}
                    disabled={savingCosts}
                    className="px-4 py-1.5 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-xl flex items-center gap-1.5 hover:bg-emerald-700 shadow-sm disabled:opacity-60"
                  >
                    <Save size={12} /> {savingCosts ? "Saving..." : "Save Costs"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCostEditing(true)}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl hover:bg-indigo-700 shadow-sm"
                >
                  Edit Cost Parameters
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
            {COST_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  disabled={!costEditing}
                  value={costs[key] ?? 0}
                  onChange={(e) => setCosts({ ...costs, [key]: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-black text-slate-900 disabled:opacity-75 focus:border-indigo-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Tenant Profitability Table */}
      {activeSubTab === "tenants" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Company Level Profitability Matrix</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredTenants.length} of {tenants.length} Companies • Infra allocated by active usage
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search company, email, plan..."
                  className="pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
                {tenantSearch && (
                  <button
                    onClick={() => setTenantSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
              <select
                value={tenantStatusFilter}
                onChange={(e) => setTenantStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-4 py-2.5">Company</th>
                  <th className="px-4 py-2.5">Plan / Status</th>
                  <th className="px-4 py-2.5 text-right">MRR ($)</th>
                  <th className="px-4 py-2.5 text-right">Allocated Cost</th>
                  <th className="px-4 py-2.5 text-right">Net Profit</th>
                  <th className="px-4 py-2.5 text-center">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-[11px]">
                      No matching tenant companies found.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const score = Number(tenant.healthScoreNum ?? 0);
                    const healthClass =
                      score >= 80
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : score >= 50
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";
                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-black text-slate-900 text-xs block">{tenant.companyName}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {tenant.email} • {tenant.websitesCount || 0} sites • {tenant.customerRecords || 0} customers
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {tenant.plan}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 text-slate-600">
                              {tenant.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900">${Number(tenant.revenue || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-rose-600">${Number(tenant.estCost || 0).toLocaleString()}</td>
                        <td className={`px-4 py-2.5 text-right font-black ${Number(tenant.profit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          ${Number(tenant.profit || 0).toLocaleString()}
                          <span className="block text-[9px] font-bold text-slate-400">{tenant.margin ?? 0}% margin</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${healthClass}`}>
                            {tenant.healthScore}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
