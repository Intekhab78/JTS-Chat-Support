import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Globe, 
  User, 
  Search, 
  RefreshCw, 
  Download, 
  FileText, 
  CheckCircle2, 
  ShoppingBag, 
  RotateCcw, 
  ArrowDownRight, 
  ArrowUpRight,
  TrendingUp
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CrmPaymentsLedgerView({ websiteId: propWebsiteId }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active sub-tab inside Payments Ledger
  const [activeLedgerTab, setActiveLedgerTab] = useState("income"); // "income" | "expense" | "refunds"

  // Filters state
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(propWebsiteId || "");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Load initial data
  useEffect(() => {
    fetchWebsites();
  }, []);

  // Fetch payments or POs and customers whenever filters or tab changes
  useEffect(() => {
    if (activeLedgerTab === "expense") {
      fetchPurchaseOrders();
    } else {
      fetchPayments();
    }

    if (selectedWebsiteId) {
      fetchCustomersForWebsite(selectedWebsiteId);
    } else {
      setCustomers([]);
    }
  }, [selectedWebsiteId, selectedCustomerId, activeLedgerTab]);

  const fetchWebsites = async () => {
    try {
      const res = await api("/api/websites");
      setWebsites(res || []);
      // If we don't have a website selected and there are websites, select the first one
      if (!selectedWebsiteId && res && res.length > 0) {
        setSelectedWebsiteId(res[0]._id);
      }
    } catch (err) {
      console.error("Failed to fetch websites", err);
    }
  };

  const fetchCustomersForWebsite = async (wId) => {
    try {
      const res = await api(`/api/crm?websiteId=${wId}`);
      setCustomers(res.customers || res || []);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let url = `/api/crm/payments`;
      const params = [];
      if (selectedWebsiteId) params.push(`websiteId=${selectedWebsiteId}`);
      if (selectedCustomerId) params.push(`customerId=${selectedCustomerId}`);
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      
      const res = await api(url);
      setPayments(res || []);
    } catch (err) {
      console.error("Failed to fetch payments", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/procurement/orders`;
      if (selectedWebsiteId) {
        url += `?websiteId=${selectedWebsiteId}`;
      }
      const res = await api(url);
      setPurchaseOrders(res || []);
    } catch (err) {
      console.error("Failed to fetch purchase orders", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeLedgerTab === "expense") {
      fetchPurchaseOrders();
    } else {
      fetchPayments();
    }
  };

  // Local filtering logic for client payments (Income / Refunds)
  const filteredPayments = payments.filter((p) => {
    // Tab filtering
    if (activeLedgerTab === "income" && p.status === "refunded") return false;
    if (activeLedgerTab === "refunds" && p.status !== "refunded") return false;

    const term = searchQuery.toLowerCase();
    if (!term) return true;

    const paymentNum = (p.paymentNumber || "").toLowerCase();
    const invoiceNum = (p.invoiceId?.invoiceId || p.invoiceId?._id || "").toLowerCase();
    const customerName = (p.customerId?.name || "").toLowerCase();
    const transactionId = (p.transactionId || "").toLowerCase();

    return (
      paymentNum.includes(term) ||
      invoiceNum.includes(term) ||
      customerName.includes(term) ||
      transactionId.includes(term)
    );
  });

  // Local filtering logic for supplier expenses (Purchase Orders)
  const filteredPurchaseOrders = purchaseOrders.filter((po) => {
    const term = searchQuery.toLowerCase();
    if (!term) return true;

    const poNumber = (po.poNumber || "").toLowerCase();
    const supplierName = (po.supplierId?.companyName || "").toLowerCase();
    const status = (po.status || "").toLowerCase();

    return (
      poNumber.includes(term) ||
      supplierName.includes(term) ||
      status.includes(term)
    );
  });

  // Calculate totals for cards
  const totalIncome = payments
    .filter(p => p.status !== "refunded")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalRefunds = payments
    .filter(p => p.status === "refunded")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalExpenses = purchaseOrders
    .filter(po => po.status === "delivered" || po.status === "accepted" || po.status === "shipped")
    .reduce((sum, po) => sum + (po.total || 0), 0);

  const exportToCSV = () => {
    if (activeLedgerTab === "expense") {
      if (filteredPurchaseOrders.length === 0) return;
      const headers = ["PO Number", "Date", "Supplier", "Supplier Email", "Website", "Amount (Total)", "Currency", "Status"];
      const rows = filteredPurchaseOrders.map(po => [
        po.poNumber,
        po.createdAt ? new Date(po.createdAt).toLocaleString() : "",
        po.supplierId?.companyName || "",
        po.supplierId?.email || "",
        po.websiteId?.websiteName || "",
        po.total || 0,
        po.currency || "INR",
        po.status || ""
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      downloadCSVFile(csvContent, `expense_ledger_${Date.now()}.csv`);
    } else {
      if (filteredPayments.length === 0) return;
      const headers = ["Payment Number", "Date", "Customer Name", "Customer Email", "Invoice", "Amount", "Gateway", "Transaction ID", "Status"];
      const rows = filteredPayments.map(p => [
        p.paymentNumber,
        p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
        p.customerId?.name || "",
        p.customerId?.email || "",
        p.invoiceId?.invoiceId || p.invoiceId?._id || "",
        p.amount || 0,
        p.gateway || "offline",
        p.transactionId || p.referenceNumber || "",
        p.status || "completed"
      ]);
      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      const filename = activeLedgerTab === "refunds" ? `refunds_ledger_${Date.now()}.csv` : `payments_ledger_${Date.now()}.csv`;
      downloadCSVFile(csvContent, filename);
    }
  };

  const downloadCSVFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="text-indigo-600" size={18} /> Payments Ledger
          </h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
            {isAdmin ? "Unified admin portal transaction registers" : "Your website transaction and billing ledger"}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {((activeLedgerTab === "expense" && filteredPurchaseOrders.length > 0) || 
            (activeLedgerTab !== "expense" && filteredPayments.length > 0)) && (
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-100"
            >
              <Download size={12} /> Export CSV
            </button>
          )}
          <button 
            onClick={handleRefresh}
            className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors flex items-center justify-center"
            title="Refresh ledger"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : "text-slate-600"} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-6">
        <button
          onClick={() => setActiveLedgerTab("income")}
          className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
            activeLedgerTab === "income"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <TrendingUp size={12} /> Income Ledger
        </button>
        <button
          onClick={() => setActiveLedgerTab("expense")}
          className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
            activeLedgerTab === "expense"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShoppingBag size={12} /> Expense & Vendor Ledger
        </button>
        <button
          onClick={() => setActiveLedgerTab("refunds")}
          className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${
            activeLedgerTab === "refunds"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <RotateCcw size={12} /> Refunds Register
        </button>
      </div>

      {/* Quick Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Total Income (Received)</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{totalIncome.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><ArrowDownRight size={20} /></div>
        </div>

        <div className="premium-card p-6 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Total Outgoing Expenses</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{totalExpenses.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl"><ArrowUpRight size={20} /></div>
        </div>

        <div className="premium-card p-6 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Total Customer Refunds</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">₹{totalRefunds.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl"><RotateCcw size={20} /></div>
        </div>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        {/* Website Selector */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <Globe size={8} /> Select Website
          </label>
          <select
            value={selectedWebsiteId}
            onChange={(e) => {
              setSelectedWebsiteId(e.target.value);
              setSelectedCustomerId(""); // reset customer on website change
            }}
            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {websites.map((w) => (
              <option key={w._id} value={w._id}>
                {w.domain || w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Selector (Available to Admin/Manager to filter specific customer - Hidden for Expenses) */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <User size={8} /> {activeLedgerTab === "expense" ? "Filter Locked" : "Customer Filter"}
          </label>
          <select
            value={selectedCustomerId}
            disabled={activeLedgerTab === "expense"}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Local Search input */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <Search size={8} /> Search Transactions
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeLedgerTab === "expense" ? "Search PO#, Supplier..." : "Search payment#, invoice#, txId..."}
            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm shadow-slate-100/40">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
            <p className="text-[9px] font-black uppercase tracking-widest">Loading transactions...</p>
          </div>
        ) : activeLedgerTab === "expense" ? (
          /* Expense Ledger (Purchase Orders) Table */
          filteredPurchaseOrders.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <ShoppingBag size={32} className="mx-auto text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest">No expense records found matching the criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">PO Info</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Website</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {filteredPurchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900">
                        <p className="font-black text-slate-800">{po.poNumber}</p>
                        <p className="text-[8px] text-slate-400 font-medium mt-0.5">
                          {po.createdAt ? new Date(po.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{po.supplierId?.companyName || "N/A"}</p>
                        <p className="text-[8px] text-slate-400 font-medium">{po.supplierId?.email || ""}</p>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {po.websiteId?.websiteName || "N/A"}
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        ₹{po.total || 0}
                      </td>
                      <td className="p-4 pr-6">
                        <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                          po.status === "delivered" || po.status === "accepted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : po.status === "cancelled"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {po.status || "draft"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Income & Refunds Table */
          filteredPayments.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <CreditCard size={32} className="mx-auto text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                {activeLedgerTab === "refunds" ? "No refund records found matching the criteria" : "No income records found matching the criteria"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Payment Info</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Invoice Ref</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Gateway</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900">
                        <p className="font-black text-slate-800">{p.paymentNumber}</p>
                        <p className="text-[8px] text-slate-400 font-medium mt-0.5">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{p.customerId?.name || "N/A"}</p>
                        <p className="text-[8px] text-slate-400 font-medium">{p.customerId?.email || ""}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                          <FileText size={10} /> {p.invoiceId?.invoiceId || p.invoiceId?._id?.slice(-6).toUpperCase() || "N/A"}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        ₹{p.amount || 0}
                      </td>
                      <td className="p-4">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          p.gateway === "razorpay" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {p.gateway || "offline"}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-500 select-all">
                        {p.transactionId || p.referenceNumber || "N/A"}
                      </td>
                      <td className="p-4 pr-6">
                        <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                          p.status === "refunded" 
                            ? "bg-amber-50 text-amber-700 border-amber-100" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          {p.status === "refunded" ? "refunded" : "completed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Simple loader helper inside same file
function Loader2({ className, size }) {
  return <RefreshCw className={`animate-spin ${className}`} size={size} />;
}
