import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard, AlertCircle, Search, ArrowUpRight, ArrowDownLeft, Wallet,
  Calendar, Users, ShieldCheck, Zap, Download, Plus, Receipt, DollarSign,
  FileSpreadsheet, X, CheckCircle2, RefreshCw
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import EnterpriseReportsCenter from "../components/EnterpriseReportsCenter.jsx";
import CrmInvoicesView from "../components/CrmSystem/CrmInvoicesView.jsx";
import ConversationHub from "../components/ConversationHub.jsx";
import CRMManager from "../components/CRMManager.jsx";
import TicketManager from "../components/TicketManager.jsx";
import InventoryManager from "../components/InventoryManager.jsx";
import { api, apiUrl } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import { formatCurrency } from "../utils/currencyFormatter.js";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";

export default function AccountsPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const { selectedWebsiteId } = useWebsite();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState({});
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [billingSearch, setBillingSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState("pending");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");

  const showTempNotice = (msg) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(""), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const qs = selectedWebsiteId ? `?websiteId=${selectedWebsiteId}` : "";

      const canReadPurchase =
        hasPermission(user, PERMISSIONS.PURCHASE_VIEW) ||
        hasPermission(user, PERMISSIONS.PURCHASE_MANAGE);
      const [invData, poData] = await Promise.all([
        api(`/api/crm/invoices${qs}`).catch(() => []),
        canReadPurchase ? api(`/api/procurement/orders${qs}`).catch(() => []) : Promise.resolve([])
      ]);

      const invList = Array.isArray(invData) ? invData : invData?.invoices || invData?.data || [];
      const poList = Array.isArray(poData) ? poData : poData?.orders || poData?.purchaseOrders || poData?.data || [];

      setInvoices(invList);
      setPurchaseOrders(poList);
    } catch (err) {
      setErrorMsg(err?.message || "Failed to load accounts data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWebsiteId]);

  useEffect(() => {
    if (!hasPermission(user, PERMISSIONS.CHAT_VIEW)) return;
    api("/api/chat/sessions")
      .then((res) => setChatSessions(Array.isArray(res) ? res : []))
      .catch(() => { });
  }, [user]);

  const financials = useMemo(() => {
    const pendingInvoices = invoices.filter((i) => i.status === "pending").length;
    const paidList = invoices.filter((i) => i.status === "paid");
    const paidInvoices = paidList.length;
    const overdueInvoices = invoices.filter((i) => i.status === "overdue").length;
    const totalRevenue = invoices.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const collectedRevenue = paidList.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const totalExpenses = purchaseOrders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const collectionRate = totalRevenue > 0 ? Math.round((collectedRevenue / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      collectedRevenue,
      totalExpenses,
      netBalance: collectedRevenue - totalExpenses,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      collectionRate
    };
  }, [invoices, purchaseOrders]);

  async function handleViewPdf(inv) {
    if (pdfLoading[inv._id]) return;
    setPdfLoading((prev) => ({ ...prev, [inv._id]: true }));
    setErrorMsg("");
    try {
      if (inv.pdfUrl) {
        window.open(apiUrl(inv.pdfUrl), "_blank");
        return;
      }
      const updated = await api(`/api/crm/invoices/${inv._id}/pdf`, { method: "POST" });
      setInvoices((prev) => prev.map((i) => (i._id === inv._id ? { ...i, pdfUrl: updated.pdfUrl } : i)));
      if (updated.pdfUrl) {
        window.open(apiUrl(updated.pdfUrl), "_blank");
      } else {
        setErrorMsg("PDF generation failed. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Could not generate PDF: " + (err?.message || "Unknown error"));
    } finally {
      setPdfLoading((prev) => ({ ...prev, [inv._id]: false }));
    }
  }

  async function handleMarkPaid(inv) {
    if (inv.status === "paid") return;
    setErrorMsg("");
    try {
      await api(`/api/crm/invoices/${inv._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "paid" }),
        headers: { "Content-Type": "application/json" }
      });
      setInvoices((prev) => prev.map((i) => (i._id === inv._id ? { ...i, status: "paid" } : i)));
      showTempNotice(`Invoice ${inv.invoiceId || ""} marked as paid`);
    } catch (err) {
      setErrorMsg("Failed to update invoice: " + (err?.message || "Unknown error"));
    }
  }

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== "all" && inv.status !== invoiceStatusFilter) return false;
      if (!q) return true;
      return (
        (inv.invoiceId || "").toLowerCase().includes(q) ||
        (inv.customerId?.name || "").toLowerCase().includes(q) ||
        (inv.status || "").toLowerCase().includes(q)
      );
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  const ledgerEntries = useMemo(() => {
    const combined = [
      ...invoices.map((inv) => ({
        id: `inv-${inv._id}`,
        date: new Date(inv.issuedAt || inv.createdAt),
        description: `Invoice ${inv.invoiceId || ""}`,
        entity: inv.customerId?.name || "Customer",
        amount: Number(inv.total) || 0,
        type: "income",
        status: inv.status
      })),
      ...purchaseOrders.map((po) => ({
        id: `po-${po._id}`,
        date: new Date(po.createdAt),
        description: `Purchase Order ${po.poNumber || ""}`,
        entity: po.supplierId?.companyName || "Supplier",
        amount: Number(po.total) || 0,
        type: "expense",
        status: po.status
      }))
    ];
    const q = ledgerSearch.trim().toLowerCase();
    return combined
      .filter((e) => ledgerTypeFilter === "all" || e.type === ledgerTypeFilter)
      .filter((e) => {
        if (!q) return true;
        return `${e.description} ${e.entity} ${e.status}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.date - a.date);
  }, [invoices, purchaseOrders, ledgerSearch, ledgerTypeFilter]);

  const menuItems = [
    { label: "Dashboard", href: "/accounts" },
    ...(hasPermission(user, PERMISSIONS.INVOICE_VIEW) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE)
      ? [{ label: "Invoices", href: "/accounts?tab=invoices" }]
      : []),
    ...(hasPermission(user, PERMISSIONS.ACCOUNTS_VIEW) ? [{ label: "Ledger", href: "/accounts?tab=ledger" }] : []),
    ...(hasPermission(user, PERMISSIONS.BILLING_VIEW) ? [{ label: "Billing", href: "/accounts?tab=billing" }] : []),
    ...(hasPermission(user, PERMISSIONS.CHAT_VIEW) ? [{ label: "Live Chat", href: "/accounts?tab=chats" }] : []),
    ...(hasPermission(user, PERMISSIONS.CRM_VIEW) ? [{ label: "CRM", href: "/accounts?tab=crm" }] : []),
    ...(hasPermission(user, PERMISSIONS.TICKET_VIEW) ? [{ label: "Tickets", href: "/accounts?tab=tickets" }] : []),
    ...(hasPermission(user, PERMISSIONS.INVENTORY_VIEW) ? [{ label: "Inventory", href: "/accounts?tab=inventory" }] : []),
    ...(hasPermission(user, PERMISSIONS.REPORTS_VIEW) ? [{ label: "Reports", href: "/accounts?tab=reports" }] : [])
  ];

  const renderAlerts = () => (
    <>
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 mb-3">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}
      {noticeMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 mb-3">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0" />
            {noticeMsg}
          </span>
          <button onClick={() => setNoticeMsg("")} className="text-emerald-500 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );

  if (tab === "invoices") {
    return (
      <Layout menuItems={menuItems} title="Invoice Management" subtitle="Create, edit, delete and manage customer invoices">
        <CrmInvoicesView websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (tab === "chats") {
    return (
      <Layout menuItems={menuItems} title="Live Conversation Hub" subtitle="Real-time visitor chats and support">
        <ConversationHub
          socket={socket}
          initialSessions={chatSessions}
          websiteId={selectedWebsiteId}
          userRole={user?.role || "accounts"}
          currentUser={user}
        />
      </Layout>
    );
  }

  if (tab === "crm") {
    return (
      <Layout menuItems={menuItems} title="CRM Workspace" subtitle="Customer relationship & billing records">
        <CRMManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (tab === "tickets") {
    return (
      <Layout menuItems={menuItems} title="Support Tickets" subtitle="Track and resolve billing & support inquiries">
        <TicketManager isAdmin={false} websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (tab === "inventory") {
    return (
      <Layout menuItems={menuItems} title="Inventory & Stock" subtitle="Product catalog and stock overview">
        <InventoryManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (tab === "ledger") {
    return (
      <Layout menuItems={menuItems} title="General Ledger" subtitle="Unified stream of income and expenditure">
        {renderAlerts()}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Transaction History ({ledgerEntries.length})</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoices and purchase orders in chronological order</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search description or entity..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 w-52"
                />
              </div>
              <div className="flex gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "income", label: "Income" },
                  { key: "expense", label: "Expense" }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setLedgerTypeFilter(opt.key)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${ledgerTypeFilter === opt.key
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                      No ledger entries found.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 text-[11px] text-slate-500 font-semibold">{entry.date.toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 font-black text-slate-900 uppercase">{entry.description}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-600">{entry.entity}</td>
                      <td className={`px-4 py-2.5 font-black ${entry.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${entry.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                          }`}>
                          {entry.type === "income" ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-wider">
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    );
  }

  if (tab === "billing" || tab === "subscriptions") {
    const outstandingAmount = Math.max(0, financials.totalRevenue - financials.collectedRevenue);
    const billingList = invoices.filter((inv) => {
      const isPaid = inv.status === "paid" || inv.paymentStatus === "paid";
      if (billingFilter === "pending" && isPaid) return false;
      if (billingFilter === "paid" && !isPaid) return false;
      if (billingSearch.trim()) {
        const q = billingSearch.trim().toLowerCase();
        const invNum = String(inv.invoiceNumber || inv.invoiceId || "").toLowerCase();
        const custName = String(inv.customerId?.name || inv.customerName || "").toLowerCase();
        if (!invNum.includes(q) && !custName.includes(q)) return false;
      }
      return true;
    });

    return (
      <Layout menuItems={menuItems} title="Customer Billing & Collections" subtitle="Track receivables, pending settlements & payment collections">
        {renderAlerts()}
        <div className="space-y-4">
          {/* Collection KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Billed</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{formatCurrency(financials.totalRevenue)}</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Collected</p>
              <p className="text-lg font-black text-emerald-600 mt-0.5">{formatCurrency(financials.collectedRevenue)}</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-lg font-black text-amber-600 mt-0.5">{formatCurrency(outstandingAmount)}</p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Collection Rate</p>
              <p className="text-lg font-black text-indigo-600 mt-0.5">{financials.collectionRate}%</p>
            </div>
          </div>

          {/* Receivables Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Payment Collections ({billingList.length})
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customer invoice settlements and due balances
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    placeholder="Search invoice # or customer..."
                    value={billingSearch}
                    onChange={(e) => setBillingSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: "pending", label: "Pending / Due" },
                    { id: "paid", label: "Settled" },
                    { id: "all", label: "All" }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBillingFilter(opt.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-colors ${billingFilter === opt.id ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {billingList.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="mx-auto mb-2 text-slate-300" size={28} />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  No matching billing records found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {billingList.map((inv) => {
                      const total = Number(inv.totalAmount ?? inv.total ?? 0);
                      const isPaid = inv.status === "paid" || inv.paymentStatus === "paid";
                      const paidAmt = isPaid && !inv.paidAmount ? total : Number(inv.paidAmount || 0);
                      const balance = Math.max(0, total - paidAmt);
                      return (
                        <tr key={inv._id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-black text-slate-900">
                            #{inv.invoiceNumber || inv.invoiceId || inv._id.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {inv.customerId?.name || inv.customerName || "Customer"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-medium">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Upon Receipt"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(total)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(paidAmt)}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {formatCurrency(isPaid ? 0 : balance)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inv.status === "overdue"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                            >
                              {isPaid ? "paid" : inv.status || "pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(inv)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase"
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleViewPdf(inv)}
                                disabled={Boolean(pdfLoading[inv._id])}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase"
                              >
                                {pdfLoading[inv._id] ? "..." : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (tab === "reports" || tab === "intelligence") {
    return (
      <Layout menuItems={menuItems} title="Revenue Intelligence" subtitle="Financial analytics and reporting">
        <EnterpriseReportsCenter defaultTab="revenue" />
      </Layout>
    );
  }

  return (
    <Layout menuItems={menuItems} title="Financial Command Center" subtitle="Accounts oversight, receivables, general ledger & billing control">
      <div className="space-y-4">
        {renderAlerts()}

        {/* 1. 5 Core Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Gross Billed</span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <DollarSign size={14} />
              </div>
            </div>
            <h4 className="text-lg font-black text-slate-900">{formatCurrency(financials.totalRevenue)}</h4>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              {financials.collectionRate}% Collected
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Receivables</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Wallet size={14} />
              </div>
            </div>
            <h4 className="text-lg font-black text-amber-600">{financials.pendingInvoices} Pending</h4>
            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Awaiting Payment
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Overdue Alerts</span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle size={14} />
              </div>
            </div>
            <h4 className="text-lg font-black text-rose-600">{financials.overdueInvoices} Overdue</h4>
            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">
              {financials.overdueInvoices > 0 ? "Action Required" : "All Clear"}
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Expenses & POs</span>
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <CreditCard size={14} />
              </div>
            </div>
            <h4 className="text-lg font-black text-slate-900">{formatCurrency(financials.totalExpenses)}</h4>
            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
              {purchaseOrders.length} Orders
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Net Collected</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Receipt size={14} />
              </div>
            </div>
            <h4 className={`text-lg font-black ${financials.netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(financials.netBalance)}
            </h4>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Paid: {formatCurrency(financials.collectedRevenue)}
            </span>
          </div>
        </div>

        {/* 2. Quick Action Toolbar */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Zap size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Fast Accounts Operations</h3>
              <p className="text-[10px] font-semibold text-slate-400">1-Click financial management and customer billing control</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
              title="Refresh Financial Data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            {(hasPermission(user, PERMISSIONS.INVOICE_VIEW) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE)) && (
              <button
                onClick={() => setSearchParams({ tab: "invoices" })}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Plus size={13} /> View Invoices
              </button>
            )}
            {hasPermission(user, PERMISSIONS.ACCOUNTS_VIEW) && (
              <button
                onClick={() => setSearchParams({ tab: "ledger" })}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl border border-slate-200 transition flex items-center gap-1.5"
              >
                <FileSpreadsheet size={13} /> General Ledger
              </button>
            )}
            {hasPermission(user, PERMISSIONS.BILLING_VIEW) && (
              <button
                onClick={() => setSearchParams({ tab: "billing" })}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl border border-slate-200 transition flex items-center gap-1.5"
              >
                <CreditCard size={13} /> Billing &amp; Collections ({financials.pendingInvoices})
              </button>
            )}
          </div>
        </section>

        {/* 3. Invoices & Ledger Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Recent Customer Invoices</h3>
                <p className="text-[10px] font-semibold text-slate-400">Receivables status, PDF generation & 1-click payment logging</p>
              </div>
              <button
                onClick={() => setSearchParams({ tab: "invoices" })}
                className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-wider"
              >
                View All ({invoices.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-2.5">Invoice #</th>
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Amount</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs font-bold text-slate-400">
                        No invoices generated yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.slice(0, 6).map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-black text-slate-900 uppercase">{inv.invoiceId || "INV-000"}</td>
                        <td className="py-2.5 font-bold text-slate-600">{inv.customerId?.name || "Customer"}</td>
                        <td className="py-2.5 font-black text-slate-900">{formatCurrency(inv.total || 0)}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : inv.status === "pending"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-rose-50 text-rose-600 border-rose-200"
                              }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleViewPdf(inv)}
                              disabled={pdfLoading[inv._id]}
                              className="px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[9px] font-black uppercase transition flex items-center gap-1"
                            >
                              <Download size={10} />
                              {pdfLoading[inv._id] ? "..." : "PDF"}
                            </button>
                            {inv.status !== "paid" && (hasPermission(user, PERMISSIONS.INVOICE_UPDATE) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE)) && (
                              <button
                                onClick={() => handleMarkPaid(inv)}
                                className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[9px] font-black uppercase transition flex items-center gap-1"
                              >
                                <ShieldCheck size={10} />
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Ledger Stream Feed */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Ledger Feed</h3>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                  Live Stream
                </span>
              </div>
              <div className="space-y-2">
                {ledgerEntries.length === 0 ? (
                  <p className="py-6 text-center text-xs font-bold text-slate-400">No transactions recorded yet.</p>
                ) : (
                  ledgerEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2.5 p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${entry.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                          {entry.type === "income" ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">{entry.entity}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{entry.description}</p>
                        </div>
                      </div>
                      <p className={`text-[11px] font-black shrink-0 ${entry.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {entry.type === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setSearchParams({ tab: "ledger" })}
              className="w-full mt-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 transition text-center"
            >
              Audit Full Ledger Stream
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
