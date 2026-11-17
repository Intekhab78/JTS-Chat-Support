import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingUp, CreditCard, RefreshCw, AlertTriangle, Download, Printer,
  BarChart3, PieChart, CheckCircle2, FileText, Activity
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";

const TIME_RANGES = [
  { id: "all", label: "All Time" },
  { id: "month", label: "This Month" },
  { id: "quarter", label: "This Quarter" },
  { id: "year", label: "This Year" }
];

export default function CrmFinanceDashboard({ websiteId }) {
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const [invRes, subRes, pmtRes] = await Promise.all([
        api(`/api/crm/invoices?websiteId=${websiteId}`).catch(() => []),
        api(`/api/crm/subscriptions?websiteId=${websiteId}`).catch(() => []),
        api(`/api/crm/payments?websiteId=${websiteId}`).catch(() => [])
      ]);

      setInvoices(Array.isArray(invRes) ? invRes : []);
      setSubscriptions(Array.isArray(subRes) ? subRes : []);
      setPayments(Array.isArray(pmtRes) ? pmtRes : []);
    } catch (err) {
      console.error("Finance metrics fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [websiteId]);

  // Date Range Filtering Helper
  const isWithinTimeRange = (dateStr) => {
    if (timeRange === "all" || !dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (timeRange === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (timeRange === "quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const itemQuarter = Math.floor(d.getMonth() / 3);
      return currentQuarter === itemQuarter && d.getFullYear() === now.getFullYear();
    }
    if (timeRange === "year") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => isWithinTimeRange(inv.createdAt || inv.dueDate || inv.issueDate));
  }, [invoices, timeRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => isWithinTimeRange(p.createdAt));
  }, [payments, timeRange]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => isWithinTimeRange(s.createdAt || s.startDate));
  }, [subscriptions, timeRange]);

  // Dynamic calculations from real database records
  const metrics = useMemo(() => {
    const activeSubs = filteredSubscriptions.filter(s => s.status === "active" || s.status === "renewed");

    let mrr = 0;
    let totalSeats = 0;
    activeSubs.forEach(sub => {
      const basePrice = sub.planId ? sub.planId.price : (sub.amount || 0);
      const seatsCount = sub.seats || 1;
      totalSeats += seatsCount;
      const totalSubValue = basePrice * seatsCount;

      if (sub.billingCycle === "yearly") {
        mrr += totalSubValue / 12;
      } else {
        mrr += totalSubValue;
      }
    });

    let collections = 0;
    let outstanding = 0;
    let refunds = 0;
    let totalTaxCollected = 0;
    let grossInvoiced = 0;
    let paidInvoicesCount = 0;
    let unpaidInvoicesCount = 0;

    filteredInvoices.forEach(inv => {
      const invTotal = Number(inv.total || inv.grandTotal || 0);
      const taxAmount = Number(inv.taxAmount ?? inv.tax ?? 0);
      grossInvoiced += invTotal;
      totalTaxCollected += taxAmount;

      if (inv.status === "paid") {
        collections += invTotal;
        paidInvoicesCount++;
      } else if (inv.status === "partially_paid") {
        const paid = Number(inv.paidAmount || 0);
        collections += paid;
        outstanding += Math.max(0, invTotal - paid);
        unpaidInvoicesCount++;
      } else if (inv.status === "pending" || inv.status === "sent" || inv.status === "overdue" || !inv.status) {
        outstanding += invTotal;
        unpaidInvoicesCount++;
      } else if (inv.status === "refunded") {
        refunds += invTotal;
      }
    });

    if (filteredPayments.length > 0) {
      const pmtCollections = filteredPayments
        .filter(p => p.status !== "refunded" && p.status !== "failed")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      if (pmtCollections > collections) {
        collections = pmtCollections;
      }
    }

    const collectionRatio = grossInvoiced > 0 ? Math.round((collections / grossInvoiced) * 100) : 0;
    const netCashFlow = Math.max(0, collections - refunds);

    return {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      collections: Math.round(collections),
      outstanding: Math.round(outstanding),
      refunds: Math.round(refunds),
      grossInvoiced: Math.round(grossInvoiced),
      totalTaxCollected: Math.round(totalTaxCollected),
      collectionRatio,
      netCashFlow: Math.round(netCashFlow),
      activeSubsCount: activeSubs.length,
      totalSeats,
      paidInvoicesCount,
      unpaidInvoicesCount
    };
  }, [filteredInvoices, filteredSubscriptions, filteredPayments]);

  // Real monthly trend grouped by invoice & payment dates
  const monthlyTrendData = useMemo(() => {
    const buckets = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const ensureBucket = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) {
        buckets[key] = {
          key,
          name: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
          collections: 0,
          invoiced: 0
        };
      }
      return buckets[key];
    };

    filteredInvoices.forEach(inv => {
      const b = ensureBucket(inv.issueDate || inv.createdAt || inv.dueDate);
      if (!b) return;
      const invTotal = Number(inv.total || inv.grandTotal || 0);
      b.invoiced += invTotal;
      if (inv.status === "paid") {
        b.collections += invTotal;
      } else if (inv.status === "partially_paid") {
        b.collections += Number(inv.paidAmount || 0);
      }
    });

    filteredPayments
      .filter(p => p.status !== "refunded" && p.status !== "failed")
      .forEach(p => {
        const b = ensureBucket(p.createdAt);
        if (b && b.collections === 0) {
          b.collections += Number(p.amount || 0);
        }
      });

    return Object.values(buckets)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8)
      .map(b => ({
        name: b.name,
        collections: Math.round(b.collections),
        invoiced: Math.round(b.invoiced)
      }));
  }, [filteredInvoices, filteredPayments]);

  const visibleInvoices = useMemo(() => {
    if (invoiceStatusFilter === "all") return filteredInvoices;
    if (invoiceStatusFilter === "unpaid") {
      return filteredInvoices.filter(inv => ["pending", "sent", "overdue", "partially_paid"].includes(inv.status) || !inv.status);
    }
    return filteredInvoices.filter(inv => inv.status === invoiceStatusFilter);
  }, [filteredInvoices, invoiceStatusFilter]);

  const handleExportFinanceCSV = () => {
    const sym = getCurrencySymbol();
    const data = [
      { "Financial Metric": "Monthly Recurring Revenue (MRR)", [`Value (${sym})`]: metrics.mrr },
      { "Financial Metric": "Annualized Run Rate (ARR)", [`Value (${sym})`]: metrics.arr },
      { "Financial Metric": "Total Received Collections", [`Value (${sym})`]: metrics.collections },
      { "Financial Metric": "Gross Invoiced Volume", [`Value (${sym})`]: metrics.grossInvoiced },
      { "Financial Metric": "Outstanding Receivables Ageing", [`Value (${sym})`]: metrics.outstanding },
      { "Financial Metric": "Statutory Tax Collected (VAT/GST)", [`Value (${sym})`]: metrics.totalTaxCollected },
      { "Financial Metric": "Customer Refunds Logged", [`Value (${sym})`]: metrics.refunds },
      { "Financial Metric": "Collection Efficiency Ratio", "Value (%)": `${metrics.collectionRatio}%` },
      { "Financial Metric": "Active SaaS Subscribers", "Value (Plans)": metrics.activeSubsCount }
    ];
    exportToCSV(data, `Enterprise_Finance_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportFinancePDF = () => {
    const sym = getCurrencySymbol();
    const data = [
      { "Financial Metric": "Monthly Recurring Revenue (MRR)", [`Value (${sym})`]: formatCurrency(metrics.mrr) },
      { "Financial Metric": "Annualized Run Rate (ARR)", [`Value (${sym})`]: formatCurrency(metrics.arr) },
      { "Financial Metric": "Total Received Collections", [`Value (${sym})`]: formatCurrency(metrics.collections) },
      { "Financial Metric": "Gross Invoiced Volume", [`Value (${sym})`]: formatCurrency(metrics.grossInvoiced) },
      { "Financial Metric": "Outstanding Receivables Ageing", [`Value (${sym})`]: formatCurrency(metrics.outstanding) },
      { "Financial Metric": "Statutory Tax Collected (VAT/GST)", [`Value (${sym})`]: formatCurrency(metrics.totalTaxCollected) },
      { "Financial Metric": "Collection Efficiency Ratio", "Value (%)": `${metrics.collectionRatio}%` }
    ];
    exportToPDF(data, `Enterprise_Finance_Report_${new Date().toISOString().slice(0, 10)}`, "ENTERPRISE FINANCE & P&L EXECUTIVE REPORT");
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-14 bg-slate-50 border border-slate-200/80 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-24 bg-slate-50 border border-slate-200/80 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Compact Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white border border-slate-200/80 px-4 py-3 rounded-2xl shadow-xs gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <BarChart3 size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">Enterprise Finance & P&L Center</h3>
            <p className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">Real-time revenue, tax splits, collections & MRR</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 w-full lg:w-auto flex-wrap lg:flex-nowrap justify-end">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            {TIME_RANGES.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase whitespace-nowrap transition-all cursor-pointer ${
                  timeRange === t.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchFinanceData}
            className="h-7 w-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Refresh Financial Data"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExportFinanceCSV}
            className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Export Finance Report to CSV"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportFinancePDF}
            className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Export Finance Report to PDF"
          >
            <Printer size={11} /> PDF
          </button>
        </div>
      </div>

      {/* Compact 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between hover:border-indigo-300 transition-colors">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Monthly Recurring (MRR)</span>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">${metrics.mrr.toLocaleString()}</p>
            <span className="text-[9px] font-semibold text-indigo-600 flex items-center gap-1 truncate">
              <TrendingUp size={10} />
              {metrics.activeSubsCount > 0
                ? `${metrics.activeSubsCount} Active Plan${metrics.activeSubsCount === 1 ? "" : "s"}`
                : "No active plans"}
            </span>
          </div>
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between hover:border-emerald-300 transition-colors">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Annualized Run (ARR)</span>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">${metrics.arr.toLocaleString()}</p>
            <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-1 truncate">
              <DollarSign size={10} /> {metrics.totalSeats} Active Seats
            </span>
          </div>
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between hover:border-sky-300 transition-colors">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total Collections</span>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">${metrics.collections.toLocaleString()}</p>
            <span className="text-[9px] font-semibold text-sky-600 flex items-center gap-1 truncate">
              <CheckCircle2 size={10} /> {metrics.collectionRatio}% Collection Rate
            </span>
          </div>
          <div className="w-8 h-8 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between hover:border-rose-300 transition-colors">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Outstanding Ageing</span>
            <p className="text-base sm:text-lg font-extrabold text-rose-600 tabular-nums">${metrics.outstanding.toLocaleString()}</p>
            <span className="text-[9px] font-semibold text-rose-500 flex items-center gap-1 truncate">
              <AlertTriangle size={10} /> {metrics.unpaidInvoicesCount} Unpaid Invoice{metrics.unpaidInvoicesCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
        </div>
      </div>

      {/* Charts & Revenue/Tax Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
            <div>
              <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-500" /> Cash Flow & Invoiced Trend
              </h4>
              <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Actual monthly collections vs gross invoiced</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-extrabold uppercase">
              <span className="flex items-center gap-1 text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Collections</span>
              <span className="flex items-center gap-1 text-sky-500"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Gross Invoiced</span>
            </div>
          </div>

          {monthlyTrendData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
              No invoice or payment activity in selected range
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="collectionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff", fontSize: "10.5px" }}
                    formatter={(val, name) => [`$${Number(val).toLocaleString()}`, name === "collections" ? "Collections" : "Gross Invoiced"]}
                  />
                  <Area type="monotone" dataKey="collections" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#collectionsGrad)" />
                  <Area type="monotone" dataKey="invoiced" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#invoicedGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue & Tax Splits */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <PieChart size={14} className="text-indigo-500" /> Revenue & Tax Splits
            </h4>

            <div className="mt-2.5 space-y-2">
              <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase">Gross Invoiced</span>
                <span className="text-xs font-extrabold text-slate-900 tabular-nums">${metrics.grossInvoiced.toLocaleString()}</span>
              </div>
              <div className="px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <span className="text-[9.5px] font-bold text-emerald-700 uppercase">Net Collected</span>
                <span className="text-xs font-extrabold text-emerald-700 tabular-nums">${metrics.netCashFlow.toLocaleString()}</span>
              </div>
              <div className="px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <span className="text-[9.5px] font-bold text-indigo-600 uppercase">Statutory VAT / Tax</span>
                <span className="text-xs font-extrabold text-indigo-700 tabular-nums">${metrics.totalTaxCollected.toLocaleString()}</span>
              </div>
              <div className="px-3 py-2 bg-rose-50/50 border border-rose-100 rounded-xl flex items-center justify-between">
                <span className="text-[9.5px] font-bold text-rose-600 uppercase">Total Refunds</span>
                <span className="text-xs font-extrabold text-rose-700 tabular-nums">-${metrics.refunds.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5">
            <div className="flex justify-between items-center text-[9.5px] font-extrabold uppercase text-indigo-300">
              <span>Collection Ratio</span>
              <span>{metrics.collectionRatio}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, metrics.collectionRatio)}%` }} />
            </div>
            <p className="text-[8.5px] text-slate-400 font-semibold uppercase">
              {metrics.paidInvoicesCount} paid • {metrics.unpaidInvoicesCount} unpaid
            </p>
          </div>
        </div>
      </div>

      {/* Recent Financial Invoices Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-500" /> Recent Financial Invoices
            </h4>
            <p className="text-[9.5px] text-slate-400 font-semibold uppercase">Live invoice & collection status across accounts</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: `All (${filteredInvoices.length})` },
              { id: "paid", label: "Paid" },
              { id: "unpaid", label: "Unpaid" },
              { id: "refunded", label: "Refunded" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setInvoiceStatusFilter(tab.id)}
                className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-colors cursor-pointer ${
                  invoiceStatusFilter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleInvoices.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-bold text-[10.5px] uppercase tracking-wider">
            No financial invoices matching selected filter ({timeRange}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Client Name</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleInvoices.slice(0, 10).map(inv => (
                  <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-extrabold text-indigo-600 font-mono text-[10.5px]">{inv.invoiceId || inv._id?.slice(-8).toUpperCase()}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{inv.customerId?.name || inv.customerId?.companyName || "Client"}</td>
                    <td className="py-2 px-3 font-medium text-slate-500 tabular-nums">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="py-2 px-3 font-extrabold text-slate-900 tabular-nums">${(inv.total || inv.grandTotal || 0).toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase ${
                        inv.status === "paid" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        inv.status === "refunded" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}>
                        {inv.status || "Pending"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => {
                          exportSingleRecordPDF(
                            `INVOICE FINANCIAL STATEMENT - ${inv.invoiceId || inv._id}`,
                            {
                              "Invoice ID": inv.invoiceId || inv._id,
                              "Client Name": inv.customerId?.name || inv.customerId?.companyName || "Client",
                              "Total Amount": `$${inv.total || inv.grandTotal || 0}`,
                              "Tax Amount": `$${inv.taxAmount || 0}`,
                              "Payment Status": (inv.status || "PENDING").toUpperCase(),
                              "Issued Date": inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"
                            },
                            `Invoice_Statement_${inv.invoiceId || inv._id}`
                          );
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors inline-flex items-center cursor-pointer"
                        title="Export Invoice Statement PDF"
                      >
                        <Printer size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
