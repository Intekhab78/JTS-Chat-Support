import React, { useState, useEffect } from "react";
import { DollarSign, Percent, TrendingUp, CreditCard, RefreshCw, AlertTriangle, Download, Printer } from "lucide-react";
import { api } from "../../api/client.js";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";

export default function CrmFinanceDashboard({ websiteId }) {
  const [metrics, setMetrics] = useState({
    mrr: 0, arr: 0, collections: 0, outstanding: 0, refunds: 0, activeSubsCount: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchFinanceMetrics = async () => {
    setLoading(true);
    try {
      // Fetch active subscriptions to compute MRR/ARR
      const subs = await api(`/api/crm/subscriptions?websiteId=${websiteId}`);
      const activeSubs = subs.filter(s => s.status === "active" || s.status === "renewed");
      
      let mrr = 0;
      activeSubs.forEach(sub => {
        const basePrice = sub.planId ? sub.planId.price : 0;
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

      // Fetch Invoices to calculate collections, outstanding, refunds
      const invoices = await api(`/api/crm/invoices?websiteId=${websiteId}`);
      let collections = 0;
      let outstanding = 0;
      let refunds = 0;

      invoices.forEach(inv => {
        if (inv.status === "paid") {
          collections += inv.total;
        } else if (inv.status === "partially_paid") {
          collections += (inv.paidAmount || 0);
          outstanding += (inv.total - (inv.paidAmount || 0));
        } else if (inv.status === "pending" || inv.status === "sent") {
          outstanding += inv.total;
        } else if (inv.status === "refunded") {
          refunds += inv.total;
        }
      });

      setMetrics({
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        collections: Math.round(collections),
        outstanding: Math.round(outstanding),
        refunds: Math.round(refunds),
        activeSubsCount: activeSubs.length
      });
    } catch (err) {
      console.error("Finance metrics fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceMetrics();
  }, [websiteId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="bg-slate-50 border border-slate-100 rounded-[28px] h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const handleExportFinanceCSV = () => {
    const data = [
      { "Metric": "Monthly Recurring Revenue (MRR)", "Amount ($)": metrics.mrr },
      { "Metric": "Annualized Run Rate (ARR)", "Amount ($)": metrics.arr },
      { "Metric": "Total Collections", "Amount ($)": metrics.collections },
      { "Metric": "Outstanding Receivables", "Amount ($)": metrics.outstanding },
      { "Metric": "Total Refunds Logged", "Amount ($)": metrics.refunds },
      { "Metric": "Active SaaS Subscribers", "Amount ($)": metrics.activeSubsCount }
    ];
    exportToCSV(data, `Finance_Metrics_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportFinancePDF = () => {
    const data = [
      { "Metric": "Monthly Recurring Revenue (MRR)", "Amount ($)": `$${metrics.mrr}` },
      { "Metric": "Annualized Run Rate (ARR)", "Amount ($)": `$${metrics.arr}` },
      { "Metric": "Total Collections", "Amount ($)": `$${metrics.collections}` },
      { "Metric": "Outstanding Receivables", "Amount ($)": `$${metrics.outstanding}` },
      { "Metric": "Total Refunds Logged", "Amount ($)": `$${metrics.refunds}` },
      { "Metric": "Active SaaS Subscribers", "Amount ($)": String(metrics.activeSubsCount) }
    ];
    exportToPDF(data, `Finance_Metrics_${new Date().toISOString().slice(0, 10)}`, "ENTERPRISE FINANCE & P&L EXECUTIVE REPORT");
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Export Bar */}
      <div className="flex justify-between items-center bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Enterprise Finance & P&L Center</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Recurring revenue, collections, receivables and statutory tax split</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportFinanceCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Finance Report to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportFinancePDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Finance Report to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Metrics Strips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR Card */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Monthly Recurring (MRR)</span>
            <p className="text-xl font-black text-slate-900">${metrics.mrr}</p>
          </div>
          <TrendingUp size={24} className="text-indigo-500" />
        </div>

        {/* ARR Card */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Annualized Run (ARR)</span>
            <p className="text-xl font-black text-slate-900">${metrics.arr}</p>
          </div>
          <DollarSign size={24} className="text-emerald-500" />
        </div>

        {/* Total Collections */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Collections</span>
            <p className="text-xl font-black text-slate-900">${metrics.collections}</p>
          </div>
          <CreditCard size={24} className="text-sky-500" />
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Outstanding Ageing</span>
            <p className="text-xl font-black text-rose-600">${metrics.outstanding}</p>
          </div>
          <AlertTriangle size={24} className="text-rose-500" />
        </div>
      </div>

      {/* Subscription Performance Snip */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Plan Distribution</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>Active SaaS Subscribers</span>
              <span className="text-indigo-600 font-extrabold">{metrics.activeSubsCount} Seats</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>Total Refunds Logged</span>
              <span className="text-rose-500 font-extrabold">-${metrics.refunds}</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl p-6 flex flex-col justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Financial Compliance</p>
          <p className="text-xs font-bold text-slate-600 leading-relaxed mt-2">All invoice tax splits (CGST/SGST/IGST) are recorded according to statutory codes. Data ledgers are future ERP accounting integration ready.</p>
        </div>
      </div>
    </div>
  );
}
