import React, { useState, useEffect } from "react";
import {
  TrendingUp, DollarSign, PieChart as PieChartIcon, Activity, Server, Users, RefreshCw, Download, Save,
  Building2, ArrowUpRight, ArrowDownRight, Percent, ShieldCheck, Zap, Layers, CheckCircle2, Clock
} from "lucide-react";
import { api } from "../api/client.js";

export default function SaaSFinancialCenter() {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [data, setData] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [costEditing, setCostEditing] = useState(false);

  const [costs, setCosts] = useState({
    serverCost: 250,
    mongoCost: 150,
    storageCost: 45,
    bandwidthCost: 30,
    emailCost: 25,
    whatsappCost: 40,
    smsCost: 15,
    apiCost: 50,
    backupCost: 20,
    monitoringCost: 15,
    cacBudget: 500
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, tenantsRes] = await Promise.all([
        api("/api/financial-analytics/overview"),
        api("/api/financial-analytics/tenants")
      ]);
      setData(overviewRes);
      setTenants(tenantsRes || []);
      if (overviewRes?.costAnalytics) {
        setCosts({
          serverCost: overviewRes.costAnalytics.serverCost || 250,
          mongoCost: overviewRes.costAnalytics.mongoCost || 150,
          storageCost: overviewRes.costAnalytics.storageCost || 45,
          bandwidthCost: overviewRes.costAnalytics.bandwidthCost || 30,
          emailCost: overviewRes.costAnalytics.emailCost || 25,
          whatsappCost: overviewRes.costAnalytics.whatsappCost || 40,
          smsCost: overviewRes.costAnalytics.smsCost || 15,
          apiCost: overviewRes.costAnalytics.apiCost || 50,
          backupCost: overviewRes.costAnalytics.backupCost || 20,
          monitoringCost: overviewRes.costAnalytics.monitoringCost || 15,
          cacBudget: overviewRes.costAnalytics.cacBudget || 500
        });
      }
    } catch (err) {
      console.error("Failed to load financial analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCosts = async () => {
    try {
      await api("/api/financial-analytics/costs", {
        method: "POST",
        body: JSON.stringify(costs)
      });
      setCostEditing(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportCSV = (filename, rows) => {
    const processRow = row => row.map(val => `"${val}"`).join(",");
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(processRow).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProfitability = () => {
    const rows = [
      ["Company Name", "Email", "Subscription Plan", "Status", "MRR ($)", "Est Cost ($)", "Profit ($)", "Health Score"],
      ...tenants.map(t => [t.companyName, t.email, t.plan, t.status, t.revenue, t.estCost, t.profit, t.healthScore])
    ];
    exportCSV("SaaS_Tenant_Profitability_Report", rows);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading SaaS Financial Analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const subAnalytics = data?.subscriptionAnalytics || {};
  const custAnalytics = data?.customerAnalytics || {};
  const costAnalytics = data?.costAnalytics || {};
  const saasMetrics = data?.saasMetrics || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">SaaS Financial Analytics & Cost Center</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Super Admin & Business Owner Revenue, MRR/ARR, Unit Economics & Cost Profitability Controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Refresh Financial Data"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleExportProfitability}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Download size={15} /> Export Financial Report
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Monthly Recurring Revenue</span>
            <DollarSign size={14} className="text-emerald-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mt-2">${summary.mrr?.toLocaleString() || 0}</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUpRight size={12} /> +{summary.growthPercentage}% MoM Growth
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp size={14} className="text-indigo-600" />
          </div>
          <h3 className="text-3xl font-black text-indigo-600 mt-2">${summary.arr?.toLocaleString() || 0}</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Projected 12-Month Run Rate</p>
        </div>

        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-[9px] font-black uppercase tracking-wider">
            <span>Net Profit Margin</span>
            <Percent size={14} />
          </div>
          <h3 className="text-3xl font-black text-emerald-700 mt-2">{summary.netProfitMargin}%</h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-1">Net Profit: ${summary.netProfit?.toLocaleString() || 0} / mo</p>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-wider">
            <span>Monthly Infra Cost</span>
            <Server size={14} className="text-rose-400" />
          </div>
          <h3 className="text-3xl font-black text-rose-400 mt-2">${costAnalytics.totalInfraCost?.toLocaleString() || 0}</h3>
          <p className="text-[10px] text-slate-400 mt-1 font-bold">10 Service Components</p>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === "overview" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Revenue & SaaS Metrics
        </button>
        <button
          onClick={() => setActiveSubTab("costs")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === "costs" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Cost Management
        </button>
        <button
          onClick={() => setActiveSubTab("tenants")}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeSubTab === "tenants" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-900"}`}
        >
          Tenant Profitability ({tenants.length})
        </button>
      </div>

      {/* Sub-Tab 1: Overview & SaaS Metrics */}
      {activeSubTab === "overview" && (
        <div className="space-y-8">
          {/* SaaS Unit Economics Matrix */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">
              SaaS Unit Economics & Customer Lifetime Metrics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block">ARPU (Avg Rev Per Company)</span>
                <strong className="text-lg font-black text-slate-900 mt-1 block">${saasMetrics.arpu} / mo</strong>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block">LTV (Customer Lifetime Value)</span>
                <strong className="text-lg font-black text-emerald-600 mt-1 block">${saasMetrics.ltv?.toLocaleString()}</strong>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block">CAC (Acquisition Cost)</span>
                <strong className="text-lg font-black text-indigo-600 mt-1 block">${saasMetrics.cac}</strong>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Monthly Churn Rate</span>
                <strong className="text-lg font-black text-rose-600 mt-1 block">{saasMetrics.churnRate}%</strong>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Retention Rate</span>
                <strong className="text-lg font-black text-emerald-600 mt-1 block">{saasMetrics.retentionRate}%</strong>
              </div>
            </div>
          </div>

          {/* Subscriptions & Accounts Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Subscription Status Breakdown</h4>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700">Active Paid Subscriptions</span>
                  <span className="font-black text-emerald-900 text-sm">{subAnalytics.activeSubscriptions}</span>
                </div>
                <div className="flex justify-between items-center bg-sky-50 p-3 rounded-xl border border-sky-100">
                  <span className="text-sky-700">Trialing Accounts</span>
                  <span className="font-black text-sky-900 text-sm">{subAnalytics.trialAccounts}</span>
                </div>
                <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <span className="text-amber-700">Renewals Due (Next 30 Days)</span>
                  <span className="font-black text-amber-900 text-sm">{subAnalytics.renewalsDueNext30Days}</span>
                </div>
                <div className="flex justify-between items-center bg-rose-50 p-3 rounded-xl border border-rose-100">
                  <span className="text-rose-700">Expired & Cancelled Accounts</span>
                  <span className="font-black text-rose-900 text-sm">{subAnalytics.expiredAccounts + subAnalytics.cancelledAccounts}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Customer Scale Metrics</h4>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>Total Enrolled Companies</span>
                  <span className="font-black text-slate-900 text-sm">{custAnalytics.totalCompanies}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>Active Workstation Companies</span>
                  <span className="font-black text-emerald-600 text-sm">{custAnalytics.activeCompanies}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>Total Active System Users</span>
                  <span className="font-black text-indigo-600 text-sm">{custAnalytics.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>Avg Cost per Active Customer</span>
                  <span className="font-black text-rose-600 text-sm">${saasMetrics.costPerCustomer} / mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Cost Management */}
      {activeSubTab === "costs" && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Monthly Infrastructure Expense Breakdown</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Configure live operational & cloud hosting cost parameters</p>
            </div>
            {costEditing ? (
              <button
                onClick={handleSaveCosts}
                className="px-5 py-2.5 bg-emerald-600 text-white font-black uppercase text-[10px] rounded-xl flex items-center gap-2 hover:bg-emerald-700 shadow-md"
              >
                <Save size={14} /> Save Cost Configuration
              </button>
            ) : (
              <button
                onClick={() => setCostEditing(true)}
                className="px-5 py-2.5 bg-indigo-600 text-white font-black uppercase text-[10px] rounded-xl hover:bg-indigo-700 shadow-md"
              >
                Edit Cost Parameters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs font-bold">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Server Hosting ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.serverCost}
                onChange={(e) => setCosts({ ...costs, serverCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">MongoDB Database Cluster ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.mongoCost}
                onChange={(e) => setCosts({ ...costs, mongoCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Cloud Vault Storage ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.storageCost}
                onChange={(e) => setCosts({ ...costs, storageCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Bandwidth ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.bandwidthCost}
                onChange={(e) => setCosts({ ...costs, bandwidthCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Email Sending Gateway ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.emailCost}
                onChange={(e) => setCosts({ ...costs, emailCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">WhatsApp API Gateway ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.whatsappCost}
                onChange={(e) => setCosts({ ...costs, whatsappCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Third-Party API Integrations ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.apiCost}
                onChange={(e) => setCosts({ ...costs, apiCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Backup & Security Snapshots ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.backupCost}
                onChange={(e) => setCosts({ ...costs, backupCost: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Monthly CAC Marketing Budget ($)</label>
              <input
                type="number"
                disabled={!costEditing}
                value={costs.cacBudget}
                onChange={(e) => setCosts({ ...costs, cacBudget: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none font-black text-slate-900 disabled:opacity-80"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Tenant Profitability Table */}
      {activeSubTab === "tenants" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Company Level Profitability Matrix</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tenants.length} Total Enrolled Companies</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Plan Tier</th>
                  <th className="px-6 py-4 text-right">MRR ($)</th>
                  <th className="px-6 py-4 text-right">Est Cost ($)</th>
                  <th className="px-6 py-4 text-right">Net Profit ($)</th>
                  <th className="px-6 py-4 text-center">Health Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {tenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">
                      {tenant.companyName}
                      <span className="block text-[10px] text-slate-400 font-normal">{tenant.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">${tenant.revenue}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">${tenant.estCost}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600">${tenant.profit}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {tenant.healthScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
