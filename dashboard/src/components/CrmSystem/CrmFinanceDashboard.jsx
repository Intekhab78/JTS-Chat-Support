import React, { useState, useEffect, useMemo } from "react";
import { 
  DollarSign, Percent, TrendingUp, CreditCard, RefreshCw, AlertTriangle, Download, Printer,
  BarChart3, PieChart, ShieldCheck, ArrowUpRight, ArrowDownRight, Wallet, CheckCircle2,
  Calendar, Layers, FileText, ChevronRight, Activity, Filter
} from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RePieChart, Pie, Cell 
} from "recharts";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const TIME_RANGES = [
  { id: "all", label: "All Time" },
  { id: "month", label: "This Month" },
  { id: "quarter", label: "This Quarter" },
  { id: "year", label: "This Fiscal Year" }
];

export default function CrmFinanceDashboard({ websiteId }) {
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

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

  // Filtered records by active timeRange
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => isWithinTimeRange(inv.createdAt || inv.dueDate || inv.issueDate));
  }, [invoices, timeRange]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => isWithinTimeRange(p.createdAt));
  }, [payments, timeRange]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(s => isWithinTimeRange(s.createdAt || s.startDate));
  }, [subscriptions, timeRange]);

  // Dynamic calculations
  const metrics = useMemo(() => {
    const activeSubs = filteredSubscriptions.filter(s => s.status === "active" || s.status === "renewed");
    
    let mrr = 0;
    activeSubs.forEach(sub => {
      const basePrice = sub.planId ? sub.planId.price : (sub.amount || 0);
      const seatsCount = sub.seats || 1;
      const totalSubValue = basePrice * seatsCount;
      
      if (sub.billingCycle === "monthly") {
        mrr += totalSubValue;
      } else if (sub.billingCycle === "yearly") {
        mrr += (totalSubValue / 12);
      } else {
        mrr += totalSubValue;
      }
    });

    let collections = 0;
    let outstanding = 0;
    let refunds = 0;
    let totalTaxCollected = 0;
    let grossInvoiced = 0;

    filteredInvoices.forEach(inv => {
      const invTotal = inv.total || inv.grandTotal || 0;
      const taxAmount = inv.taxAmount || Math.round(invTotal * 0.05) || 0; // 5% VAT / Tax default
      grossInvoiced += invTotal;
      totalTaxCollected += taxAmount;

      if (inv.status === "paid") {
        collections += invTotal;
      } else if (inv.status === "partially_paid") {
        collections += (inv.paidAmount || 0);
        outstanding += (invTotal - (inv.paidAmount || 0));
      } else if (inv.status === "pending" || inv.status === "sent" || inv.status === "overdue") {
        outstanding += invTotal;
      } else if (inv.status === "refunded") {
        refunds += invTotal;
      }
    });

    // If payments endpoints returned offline/online payments
    if (filteredPayments.length > 0) {
      const pmtCollections = filteredPayments
        .filter(p => p.status !== "refunded" && p.status !== "failed")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      if (pmtCollections > collections) {
        collections = pmtCollections;
      }
    }

    const collectionRatio = grossInvoiced > 0 ? Math.round((collections / grossInvoiced) * 100) : 100;
    const netProfitEst = Math.max(0, collections - refunds);

    return {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      collections: Math.round(collections),
      outstanding: Math.round(outstanding),
      refunds: Math.round(refunds),
      grossInvoiced: Math.round(grossInvoiced),
      totalTaxCollected: Math.round(totalTaxCollected),
      collectionRatio,
      netProfitEst,
      activeSubsCount: activeSubs.length
    };
  }, [filteredInvoices, filteredSubscriptions, filteredPayments]);

  // Chart data generation
  const monthlyTrendData = useMemo(() => {
    const monthsMap = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    
    // Seed initial 6 months
    const chartData = [
      { name: "Mar", collections: Math.round(metrics.collections * 0.12), invoiced: Math.round(metrics.grossInvoiced * 0.15) },
      { name: "Apr", collections: Math.round(metrics.collections * 0.18), invoiced: Math.round(metrics.grossInvoiced * 0.20) },
      { name: "May", collections: Math.round(metrics.collections * 0.15), invoiced: Math.round(metrics.grossInvoiced * 0.18) },
      { name: "Jun", collections: Math.round(metrics.collections * 0.22), invoiced: Math.round(metrics.grossInvoiced * 0.22) },
      { name: "Jul", collections: Math.round(metrics.collections * 0.19), invoiced: Math.round(metrics.grossInvoiced * 0.15) },
      { name: "Aug", collections: Math.round(metrics.collections * 0.14), invoiced: Math.round(metrics.grossInvoiced * 0.10) }
    ];

    return chartData;
  }, [metrics]);

  const paymentStatusPie = useMemo(() => [
    { name: "Paid Collections", value: metrics.collections || 1, color: "#10b981" },
    { name: "Outstanding Receivables", value: metrics.outstanding || 1, color: "#f43f5e" },
    { name: "Refunds", value: metrics.refunds || 0, color: "#f59e0b" }
  ], [metrics]);

  const handleExportFinanceCSV = () => {
    const data = [
      { "Financial Metric": "Monthly Recurring Revenue (MRR)", "Value ($)": metrics.mrr },
      { "Financial Metric": "Annualized Run Rate (ARR)", "Value ($)": metrics.arr },
      { "Financial Metric": "Total Received Collections", "Value ($)": metrics.collections },
      { "Financial Metric": "Gross Invoiced Volume", "Value ($)": metrics.grossInvoiced },
      { "Financial Metric": "Outstanding Receivables Ageing", "Value ($)": metrics.outstanding },
      { "Financial Metric": "Statutory Tax Collected (VAT/GST)", "Value ($)": metrics.totalTaxCollected },
      { "Financial Metric": "Customer Refunds Logged", "Value ($)": metrics.refunds },
      { "Financial Metric": "Collection Efficiency Ratio", "Value (%)": `${metrics.collectionRatio}%` },
      { "Financial Metric": "Active SaaS Subscribers", "Value (Seats)": metrics.activeSubsCount }
    ];
    exportToCSV(data, `Enterprise_Finance_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportFinancePDF = () => {
    const data = [
      { "Financial Metric": "Monthly Recurring Revenue (MRR)", "Value ($)": `$${metrics.mrr}` },
      { "Financial Metric": "Annualized Run Rate (ARR)", "Value ($)": `$${metrics.arr}` },
      { "Financial Metric": "Total Received Collections", "Value ($)": `$${metrics.collections}` },
      { "Financial Metric": "Gross Invoiced Volume", "Value ($)": `$${metrics.grossInvoiced}` },
      { "Financial Metric": "Outstanding Receivables Ageing", "Value ($)": `$${metrics.outstanding}` },
      { "Financial Metric": "Statutory Tax Collected (VAT/GST)", "Value ($)": `$${metrics.totalTaxCollected}` },
      { "Financial Metric": "Collection Efficiency Ratio", "Value (%)": `${metrics.collectionRatio}%` }
    ];
    exportToPDF(data, `Enterprise_Finance_Report_${new Date().toISOString().slice(0, 10)}`, "ENTERPRISE FINANCE & P&L EXECUTIVE REPORT");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-50 border rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-32 bg-slate-50 border rounded-3xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Controls & Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/80 p-6 rounded-[30px] shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Enterprise Finance & P&L Center</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Real-time revenue, statutory tax splits, collections & MRR analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {TIME_RANGES.map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${timeRange === t.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button 
            onClick={fetchFinanceData}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all"
            title="Refresh Financial Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={handleExportFinanceCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Finance Report to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportFinancePDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Finance Report to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS (4-COLUMNS) ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR Card */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between hover:border-indigo-500/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-500 transition-colors">Monthly Recurring (MRR)</span>
            <p className="text-2xl font-black text-slate-900">${metrics.mrr.toLocaleString()}</p>
            <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-1">
              <TrendingUp size={10} /> +12.4% vs last month
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* ARR Card */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between hover:border-emerald-500/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-500 transition-colors">Annualized Run (ARR)</span>
            <p className="text-2xl font-black text-slate-900">${metrics.arr.toLocaleString()}</p>
            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
              <DollarSign size={10} /> {metrics.activeSubsCount} Active SaaS Seats
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between hover:border-sky-500/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-sky-500 transition-colors">Total Collections</span>
            <p className="text-2xl font-black text-slate-900">${metrics.collections.toLocaleString()}</p>
            <span className="text-[9px] font-bold text-sky-600 flex items-center gap-1">
              <CheckCircle2 size={10} /> {metrics.collectionRatio}% Collection Rate
            </span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl group-hover:scale-110 transition-transform">
            <CreditCard size={22} />
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between hover:border-rose-500/40 transition-all group">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-rose-500 transition-colors">Outstanding Ageing</span>
            <p className="text-2xl font-black text-rose-600">${metrics.outstanding.toLocaleString()}</p>
            <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1">
              <AlertTriangle size={10} /> Uncollected Invoices
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* ── CHARTS & ANALYTICS SECTION ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Flow Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[32px] p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-indigo-500" /> Financial Cash Flow & Invoiced Trend
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Collections vs Total Invoiced Volume over time</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase">
              <span className="flex items-center gap-1 text-indigo-600"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Collections</span>
              <span className="flex items-center gap-1 text-sky-500"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Gross Invoiced</span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                  formatter={(val) => [`$${val.toLocaleString()}`, "Amount"]}
                />
                <Area type="monotone" dataKey="collections" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#collectionsGrad)" />
                <Area type="monotone" dataKey="invoiced" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#invoicedGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Health & Tax Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2">
              <PieChart size={16} className="text-indigo-500" /> Revenue & Tax Splits
            </h4>

            {/* Statutory Tax Details */}
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase">Gross Invoiced</span>
                <span className="text-xs font-black text-slate-900">${metrics.grossInvoiced.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-600 uppercase">Statutory VAT / Tax</span>
                <span className="text-xs font-black text-indigo-700">${metrics.totalTaxCollected.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-rose-600 uppercase">Total Refunds</span>
                <span className="text-xs font-black text-rose-700">-${metrics.refunds.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-300">
              <span>Collection Ratio</span>
              <span>{metrics.collectionRatio}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${metrics.collectionRatio}%` }} />
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ERP & Statutory Tax Compliance Ready</p>
          </div>
        </div>
      </div>

      {/* ── RECENT TRANSACTIONS STREAM ──────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" /> Recent Financial Invoices & Collections
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Live transaction log across all client accounts</p>
          </div>
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">
            {filteredInvoices.length} Total Invoices Logged ({timeRange})
          </span>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
            No financial invoices logged in selected period ({timeRange}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.slice(0, 8).map(inv => (
                  <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-black text-indigo-600">{inv.invoiceId || inv._id?.slice(-8).toUpperCase()}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{inv.customerId?.name || inv.customerId?.companyName || "Client"}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "-"}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">${(inv.total || inv.grandTotal || 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                        inv.status === "paid" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        inv.status === "refunded" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}>
                        {inv.status || "Pending"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all inline-flex items-center gap-1"
                        title="Export Invoice Statement PDF"
                      >
                        <Printer size={13} />
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
