import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText, CreditCard, BarChart3, TrendingUp, AlertCircle, Search,
  ArrowUpRight, ArrowDownLeft, Wallet, Calendar, Users, ShieldCheck, Zap,
  Globe, Download, Filter, Send, Building2, Plus, CheckCircle2, Receipt, DollarSign, FileSpreadsheet
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import StatCard from "../components/StatCard.jsx";
import EnterpriseReportsCenter from "../components/EnterpriseReportsCenter.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";

export default function AccountsPage() {
  const { user } = useAuth();
  const { websites, selectedWebsiteId, setSelectedWebsiteId } = useWebsite();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [reportRange, setReportRange] = useState({ preset: "7d" });

  const [financials, setFinancials] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedWebsiteId) params.set("websiteId", selectedWebsiteId);
        if (reportRange.startDate) params.set("startDate", reportRange.startDate);
        if (reportRange.endDate) params.set("endDate", reportRange.endDate);

        const [invData, poData, subData, anyData] = await Promise.all([
          api("/api/crm/invoices").catch(() => []),
          api("/api/procurement/orders").catch(() => []),
          api("/api/billing/admin/all").catch(() => []),
          api(`/api/analytics?${params.toString()}`).catch(() => null)
        ]);

        setInvoices(invData);
        setPurchaseOrders(poData);
        setSubscriptions(subData);
        setAnalytics(anyData);


        // Calculate basic stats
        const pending = invData.filter(i => i.status === "pending").length;
        const paid = invData.filter(i => i.status === "paid").length;
        const overdue = invData.filter(i => i.status === "overdue").length;
        const revenue = invData.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const expenses = poData.reduce((acc, curr) => acc + (curr.total || 0), 0);

        setFinancials({
          totalRevenue: revenue,
          totalExpenses: expenses,
          pendingInvoices: pending,
          paidInvoices: paid,
          overdueInvoices: overdue
        });
      } catch (err) {
        console.error("Failed to load accounts data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedWebsiteId, reportRange.startDate, reportRange.endDate]);

  // --- View PDF Handler ---
  async function handleViewPdf(inv) {
    if (pdfLoading[inv._id]) return;
    setPdfLoading(prev => ({ ...prev, [inv._id]: true }));
    try {
      // If already has pdfUrl, open directly
      if (inv.pdfUrl) {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        window.open(`${base}${inv.pdfUrl}`, "_blank");
        return;
      }
      // Generate PDF first
      const updated = await api(`/api/crm/invoices/${inv._id}/pdf`, { method: "POST" });
      // Update local state with pdfUrl
      setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, pdfUrl: updated.pdfUrl } : i));
      if (updated.pdfUrl) {
        const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
        window.open(`${base}${updated.pdfUrl}`, "_blank");
      } else {
        alert("PDF generation failed. Please try again.");
      }
    } catch (err) {
      console.error("PDF error:", err);
      alert("Could not generate PDF: " + (err?.message || "Unknown error"));
    } finally {
      setPdfLoading(prev => ({ ...prev, [inv._id]: false }));
    }
  }

  // --- Mark Paid Handler ---
  async function handleMarkPaid(inv) {
    if (inv.status === "paid") return;
    try {
      await api(`/api/crm/invoices/${inv._id}`, { method: "PUT", body: JSON.stringify({ status: "paid" }), headers: { "Content-Type": "application/json" } });
      setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: "paid" } : i));
      setFinancials(prev => ({ ...prev, paidInvoices: prev.paidInvoices + 1, pendingInvoices: Math.max(0, prev.pendingInvoices - 1) }));
    } catch (err) {
      alert("Failed to update invoice: " + (err?.message || "Unknown error"));
    }
  }

  // Filtered invoices for search
  const filteredInvoices = invoices.filter(inv => {
    if (!invoiceSearch.trim()) return true;
    const q = invoiceSearch.toLowerCase();
    return (
      (inv.invoiceId || "").toLowerCase().includes(q) ||
      (inv.customerId?.name || "").toLowerCase().includes(q) ||
      (inv.status || "").toLowerCase().includes(q)
    );
  });

  const ledgerEntries = useMemo(() => {
    const combined = [
      ...invoices.map(inv => ({
        id: inv._id,
        date: new Date(inv.issuedAt || inv.createdAt),
        description: `Invoice ${inv.invoiceId}`,
        entity: inv.customerId?.name || "Customer",
        amount: inv.total,
        type: "income",
        status: inv.status
      })),
      ...purchaseOrders.map(po => ({
        id: po._id,
        date: new Date(po.createdAt),
        description: `Purchase Order ${po.poNumber}`,
        entity: po.supplierId?.companyName || "Supplier",
        amount: po.total,
        type: "expense",
        status: po.status
      }))
    ];
    return combined.sort((a, b) => b.date - a.date);
  }, [invoices, purchaseOrders]);

  const menuItems = [
    { label: "Dashboard", href: "/accounts" },
    { label: "Invoices", href: "/accounts?tab=invoices" },
    { label: "Ledger", href: "/accounts?tab=ledger" },
    { label: "Billing", href: "/accounts?tab=billing" },
    { label: "Reports", href: "/accounts?tab=reports" },
  ];



  if (tab === "invoices") {
    return (
      <Layout menuItems={menuItems} title="Invoice Management" subtitle="Track and manage customer billing">
        <div className="premium-card p-0 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h3 className="heading-md">All Invoices</h3>
              <p className="small-label opacity-60 mt-1">Detailed list of all generated invoices</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 transition-all w-64"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-5 small-label">Invoice #</th>
                  <th className="px-10 py-5 small-label">Customer</th>
                  <th className="px-10 py-5 small-label">Date</th>
                  <th className="px-10 py-5 small-label">Amount</th>
                  <th className="px-10 py-5 small-label">Status</th>
                  <th className="px-10 py-5 small-label">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-10 py-16 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {invoiceSearch ? "No invoices match your search" : "No invoices found"}
                    </td>
                  </tr>
                ) : filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-5 text-xs font-black text-slate-900 uppercase">{inv.invoiceId || "INV-000"}</td>
                    <td className="px-10 py-5 text-xs font-bold text-slate-600">{inv.customerId?.name || "Unknown"}</td>
                    <td className="px-10 py-5 text-xs text-slate-500">{new Date(inv.issuedAt || inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-10 py-5 text-xs font-black text-slate-900">${(inv.total || 0).toLocaleString()}</td>
                    <td className="px-10 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${inv.status === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          inv.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
                            "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-10 py-5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleViewPdf(inv)}
                          disabled={pdfLoading[inv._id]}
                          className="text-[9px] font-black uppercase text-indigo-600 hover:underline disabled:opacity-40 disabled:cursor-wait flex items-center gap-1"
                        >
                          <Download size={10} />
                          {pdfLoading[inv._id] ? "Generating..." : "View PDF"}
                        </button>
                        {inv.status !== "paid" && (
                          <button
                            onClick={() => handleMarkPaid(inv)}
                            className="text-[9px] font-black uppercase text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <ShieldCheck size={10} />
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    );
  }

  if (tab === "ledger") {
    return (
      <Layout menuItems={menuItems} title="General Ledger" subtitle="Unified stream of income and expenditure">
        <div className="premium-card p-0 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <h3 className="heading-md">Transaction History</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <ArrowUpRight size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Income</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <ArrowDownLeft size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">Expense</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-10 py-5 small-label">Date</th>
                  <th className="px-10 py-5 small-label">Description</th>
                  <th className="px-10 py-5 small-label">Entity</th>
                  <th className="px-10 py-5 small-label">Amount</th>
                  <th className="px-10 py-5 small-label">Type</th>
                  <th className="px-10 py-5 small-label">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-5 text-xs text-slate-500 font-bold">{entry.date.toLocaleDateString()}</td>
                    <td className="px-10 py-5 text-xs font-black text-slate-900 uppercase">{entry.description}</td>
                    <td className="px-10 py-5 text-xs font-bold text-slate-600">{entry.entity}</td>
                    <td className={`px-10 py-5 text-xs font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                    </td>
                    <td className="px-10 py-5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${entry.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {entry.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                    </td>
                    <td className="px-10 py-5">
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase tracking-widest">{entry.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    );
  }

  if (tab === "billing") {
    return (
      <Layout menuItems={menuItems} title="Client Subscriptions" subtitle="Monitor platform recurring revenue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subscriptions.length === 0 ? (
            <div className="col-span-full py-20 text-center opacity-40">
              <Users className="mx-auto mb-4" size={48} />
              <p className="text-sm font-black uppercase tracking-widest">No active client subscriptions found</p>
            </div>
          ) : subscriptions.map(client => (
            <div key={client._id} className="premium-card p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex items-start justify-between relative z-10 mb-6">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{client.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">{client.email}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${client.subscription?.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                  {client.subscription?.status || 'No Plan'}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase text-slate-500">Current Plan</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-indigo-600">{client.subscription?.plan || 'Free'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-slate-100 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Agents</p>
                    <p className="text-xs font-black text-slate-900">{client.subscription?.limits?.agents || 0}</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-2xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Websites</p>
                    <p className="text-xs font-black text-slate-900">{client.subscription?.limits?.websites || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Started Dec 2023</span>
                </div>
                <button className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Details</button>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  if (tab === "reports") {
    return (
      <Layout menuItems={menuItems} title="Revenue Intelligence" subtitle="Financial analytics and reporting">
        <EnterpriseReportsCenter />
      </Layout>
    );
  }

  /* ── Overview Tab (Financial Command Center) ── */
  const vatCollectedEst = Math.round(financials.totalRevenue * 0.05);

  return (
    <Layout menuItems={menuItems} title="Financial Command Center" subtitle="Complete accounts oversight, receivables management, and VAT compliance desk">
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
        
        {/* 1. 5 Core Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Revenue</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <DollarSign size={16} />
              </div>
            </div>
            <h4 className="text-2xl font-black text-slate-900">${financials.totalRevenue.toLocaleString()}</h4>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-2">+12.5% Inflow</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receivables</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Wallet size={16} />
              </div>
            </div>
            <h4 className="text-2xl font-black text-amber-600">{financials.pendingInvoices} Pending</h4>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-2">Awaiting Payment</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue Alerts</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle size={16} />
              </div>
            </div>
            <h4 className="text-2xl font-black text-rose-600">{financials.overdueInvoices} Overdue</h4>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-2">Action Required</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expenses & POs</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <CreditCard size={16} />
              </div>
            </div>
            <h4 className="text-2xl font-black text-slate-900">${financials.totalExpenses.toLocaleString()}</h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-2">Payables</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. VAT Collected</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Receipt size={16} />
              </div>
            </div>
            <h4 className="text-2xl font-black text-emerald-600">${vatCollectedEst.toLocaleString()}</h4>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-2">5% Standard VAT</span>
          </div>
        </div>

        {/* 2. Quick Action Toolbar */}
        <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Fast Accounts Operations</h3>
              <p className="text-[11px] font-semibold text-slate-400">1-Click financial management and customer billing control</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set("tab", "invoices");
                setSearchParams(p);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> View All Invoices
            </button>
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set("tab", "ledger");
                setSearchParams(p);
              }}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl border border-slate-200 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={14} /> Audit General Ledger
            </button>
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set("tab", "billing");
                setSearchParams(p);
              }}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl border border-slate-200 transition-all flex items-center gap-2"
            >
              <Users size={14} /> Client Subscriptions
            </button>
          </div>
        </section>

        {/* 3. Invoices & Receivables Supervision Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Recent Customer Invoices</h3>
                <p className="text-[11px] font-semibold text-slate-400">Receivables status, PDF generation & 1-click payment logging</p>
              </div>
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set("tab", "invoices");
                  setSearchParams(p);
                }}
                className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-wider"
              >
                View All ({invoices.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Invoice #</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs font-bold text-slate-400">No invoices generated yet.</td>
                    </tr>
                  ) : invoices.slice(0, 6).map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-xs font-black text-slate-900 uppercase">{inv.invoiceId || "INV-000"}</td>
                      <td className="py-4 text-xs font-bold text-slate-600">{inv.customerId?.name || "Customer"}</td>
                      <td className="py-4 text-xs font-black text-slate-900">${(inv.total || 0).toLocaleString()}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          inv.status === "paid" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          inv.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPdf(inv)}
                            disabled={pdfLoading[inv._id]}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1"
                          >
                            <Download size={10} />
                            {pdfLoading[inv._id] ? "Loading..." : "PDF"}
                          </button>
                          {inv.status !== "paid" && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1"
                            >
                              <ShieldCheck size={10} />
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Ledger Stream Feed */}
          <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Ledger Feed</h3>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Real-time Stream</span>
              </div>
              <div className="space-y-4">
                {ledgerEntries.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${entry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {entry.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-900 uppercase truncate">{entry.entity}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{entry.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[10px] font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set("tab", "ledger");
                setSearchParams(p);
              }}
              className="w-full mt-6 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-indigo-600 transition-all text-center"
            >
              Audit Full Ledger Stream
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
