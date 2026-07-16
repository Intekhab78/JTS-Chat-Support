import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText, CreditCard, BarChart3, TrendingUp, AlertCircle, Search,
  ArrowUpRight, ArrowDownLeft, Wallet, Calendar, Users, ShieldCheck, Zap,
  Globe, Download, Filter, Send, Building2
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import StatCard from "../components/StatCard.jsx";
import EnterpriseReportsCenter from "../components/EnterpriseReportsCenter.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AccountsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
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

        const [invData, poData, subData, webData, anyData] = await Promise.all([
          api("/api/crm/invoices").catch(() => []),
          api("/api/procurement/orders").catch(() => []),
          api("/api/billing/admin/all").catch(() => []),
          api("/api/websites").catch(() => []),
          api(`/api/analytics?${params.toString()}`).catch(() => null)
        ]);

        setInvoices(invData);
        setPurchaseOrders(poData);
        setSubscriptions(subData);
        setWebsites(webData);
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

  const WebsiteScopeSelector = () => (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-[32px] border border-slate-200/60 bg-white p-4 shadow-sm animate-in fade-in duration-500">
      <div className="flex items-center gap-4 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Globe size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Context Scope</p>
          <h4 className="text-sm font-black text-slate-900">
            {websites.find(w => w._id === selectedWebsiteId)?.websiteName || "All Managed Websites"}
          </h4>
        </div>
      </div>
      <div className="flex items-center gap-2 pr-2">
        <select
          value={selectedWebsiteId}
          onChange={(e) => setSelectedWebsiteId(e.target.value)}
          className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none hover:bg-white transition-all appearance-none cursor-pointer"
        >
          <option value="">Global View (All)</option>
          {websites.map(w => (
            <option key={w._id} value={w._id}>{w.websiteName}</option>
          ))}
        </select>
      </div>
    </div>
  );

  if (tab === "invoices") {
    return (
      <Layout menuItems={menuItems} title="Invoice Management" subtitle="Track and manage customer billing">
        <WebsiteScopeSelector />
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
        <WebsiteScopeSelector />
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

  return (
    <Layout menuItems={menuItems} title="Accounts Dashboard" subtitle="Financial oversight and revenue analytics">
      <WebsiteScopeSelector />
      <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCard
            label="Total Revenue"
            value={`$${financials.totalRevenue.toLocaleString()}`}
            trend="+12.5%"
            color="indigo"
          />
          <StatCard
            label="Total Expenses"
            value={`$${financials.totalExpenses.toLocaleString()}`}
            trend="+5.2%"
            color="rose"
          />
          <StatCard
            label="Net Profit"
            value={`$${(financials.totalRevenue - financials.totalExpenses).toLocaleString()}`}
            color="emerald"
          />
          <StatCard
            label="Paid Invoices"
            value={financials.paidInvoices}
            color="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart Placeholder */}
          <div className="lg:col-span-2 premium-card p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="heading-md">Revenue vs Expense</h3>
                <p className="small-label opacity-60">Comparative financial flow this year</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400 rounded-xl border border-slate-100">Yearly</button>
                <button className="px-3 py-1.5 bg-indigo-600 text-[9px] font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-200">Monthly</button>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {[40, 65, 45, 90, 75, 55, 85, 95, 70, 80, 60, 88].map((h, i) => (
                <div key={i} className="flex-1 group relative flex flex-row gap-0.5 items-end h-full">
                  <div
                    className="w-1/2 bg-indigo-50 group-hover:bg-indigo-500 transition-all rounded-t-lg"
                    style={{ height: `${h}%` }}
                  />
                  <div
                    className="w-1/2 bg-rose-50 group-hover:bg-rose-500 transition-all rounded-t-lg"
                    style={{ height: `${h * 0.4}%` }}
                  />
                  <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-300 uppercase">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="premium-card p-6 sm:p-8">
            <h3 className="heading-md mb-6">Ledger Feed</h3>
            <div className="space-y-6">
              {ledgerEntries.slice(0, 6).map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${entry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {entry.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">{entry.entity}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{entry.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-black ${entry.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.type === 'income' ? '+' : '-'}${entry.amount.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{entry.date.toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set("tab", "ledger");
                setSearchParams(p);
              }}
              className="w-full mt-8 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-white hover:text-indigo-600 transition-all"
            >
              Audit Full Ledger
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
