import React, { useState, useEffect, useMemo } from "react";
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
  TrendingUp,
  Filter,
  Printer,
  Plus,
  X,
  PieChart,
  Activity,
  DollarSign,
  Calendar,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from "recharts";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const TIME_FILTERS = [
  { id: "all", label: "All Time" },
  { id: "month", label: "This Month" },
  { id: "quarter", label: "This Quarter" }
];

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
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Log Payment Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    customerId: "",
    amount: "",
    paymentMethod: "cash",
    transactionId: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

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

  // Submit offline payment log
  const handleLogPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!logForm.customerId || !logForm.amount) {
      alert("Please select customer and enter amount.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/crm/payments", {
        method: "POST",
        body: JSON.stringify({
          ...logForm,
          websiteId: selectedWebsiteId,
          amount: Number(logForm.amount),
          status: "completed",
          gateway: logForm.paymentMethod
        })
      });
      alert("Payment logged successfully!");
      setShowLogModal(false);
      setLogForm({ customerId: "", amount: "", paymentMethod: "cash", transactionId: "", notes: "" });
      fetchPayments();
    } catch (err) {
      alert(err.message || "Failed to log payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Local filtering logic for client payments (Income / Refunds)
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Tab filtering
      if (activeLedgerTab === "income" && p.status === "refunded") return false;
      if (activeLedgerTab === "refunds" && p.status !== "refunded") return false;

      // Payment Mode / Gateway Filter
      if (selectedPaymentMode) {
        const gw = (p.gateway || p.paymentMethod || p.method || "cash").toLowerCase();
        if (!gw.includes(selectedPaymentMode.toLowerCase())) return false;
      }

      // Payment Status Filter
      if (selectedPaymentStatus) {
        const st = (p.status || "completed").toLowerCase();
        if (!st.includes(selectedPaymentStatus.toLowerCase())) return false;
      }

      const term = searchQuery.toLowerCase();
      if (!term) return true;

      const paymentNum = (p.paymentNumber || "").toLowerCase();
      const invoiceNum = (p.invoiceId?.invoiceId || p.invoiceId?._id || "").toLowerCase();
      const customerName = (p.customerId?.name || p.customerId?.companyName || "").toLowerCase();
      const transactionId = (p.transactionId || p.referenceNumber || "").toLowerCase();
      const gateway = (p.gateway || p.paymentMethod || "").toLowerCase();
      const status = (p.status || "").toLowerCase();

      return (
        paymentNum.includes(term) ||
        invoiceNum.includes(term) ||
        customerName.includes(term) ||
        transactionId.includes(term) ||
        gateway.includes(term) ||
        status.includes(term)
      );
    });
  }, [payments, activeLedgerTab, selectedPaymentMode, selectedPaymentStatus, searchQuery]);

  // Local filtering logic for supplier expenses (Purchase Orders)
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
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
  }, [purchaseOrders, searchQuery]);

  // Calculate totals for cards
  const totals = useMemo(() => {
    const totalIncome = payments
      .filter(p => p.status !== "refunded")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalRefunds = payments
      .filter(p => p.status === "refunded")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalExpenses = purchaseOrders
      .filter(po => po.status === "delivered" || po.status === "accepted" || po.status === "shipped")
      .reduce((sum, po) => sum + (po.total || 0), 0);

    const razorpayTotal = payments
      .filter(p => (p.gateway || p.paymentMethod) === "razorpay")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const cashTotal = payments
      .filter(p => (p.gateway || p.paymentMethod) === "cash")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return { totalIncome, totalRefunds, totalExpenses, razorpayTotal, cashTotal };
  }, [payments, purchaseOrders]);

  // Visual chart data
  const chartData = useMemo(() => {
    return [
      { name: "Total Income", amount: totals.totalIncome, fill: "#10b981" },
      { name: "Expenses", amount: totals.totalExpenses, fill: "#f43f5e" },
      { name: "Refunds", amount: totals.totalRefunds, fill: "#f59e0b" },
      { name: "Razorpay Online", amount: totals.razorpayTotal, fill: "#6366f1" },
      { name: "Cash Received", amount: totals.cashTotal, fill: "#06b6d4" }
    ];
  }, [totals]);

  const exportCSV = () => {
    if (activeLedgerTab === "expense") {
      if (filteredPurchaseOrders.length === 0) return;
      const headers = ["PO Number", "Date", "Supplier", "Supplier Email", "Website", "Amount (Total)", "Status"];
      const rows = filteredPurchaseOrders.map(po => ({
        "PO Number": po.poNumber,
        "Date": po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "-",
        "Supplier": po.supplierId?.companyName || "-",
        "Supplier Email": po.supplierId?.email || "-",
        "Website": po.websiteId?.websiteName || "-",
        "Amount": po.total || 0,
        "Status": (po.status || "Draft").toUpperCase()
      }));
      exportToCSV(rows, `Supplier_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}`);
    } else {
      if (filteredPayments.length === 0) return;
      const rows = filteredPayments.map(p => ({
        "Payment ID": p.paymentNumber || p._id,
        "Date": p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-",
        "Customer Name": p.customerId?.name || p.customerId?.companyName || "N/A",
        "Invoice Reference": p.invoiceId?.invoiceId || p.invoiceId?._id || "N/A",
        "Amount Paid": p.amount || 0,
        "Gateway / Mode": (p.gateway || p.paymentMethod || "Offline").toUpperCase(),
        "Transaction Ref": p.transactionId || p.referenceNumber || "N/A",
        "Status": (p.status || "Completed").toUpperCase()
      }));
      exportToCSV(rows, `Payments_Ledger_${activeLedgerTab}_${new Date().toISOString().slice(0, 10)}`);
    }
  };

  const exportPDF = () => {
    if (activeLedgerTab === "expense") {
      const data = filteredPurchaseOrders.map(po => ({
        "PO Number": po.poNumber,
        "Supplier": po.supplierId?.companyName || "-",
        "Amount": `$${po.total || 0}`,
        "Status": (po.status || "Draft").toUpperCase()
      }));
      exportToPDF(data, `Supplier_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}`, "EXPENSE & SUPPLIER VENDOR LEDGER REPORT");
    } else {
      const data = filteredPayments.map(p => ({
        "Payment ID": p.paymentNumber || p._id,
        "Customer": p.customerId?.name || p.customerId?.companyName || "N/A",
        "Amount": `$${p.amount || 0}`,
        "Gateway": (p.gateway || p.paymentMethod || "Offline").toUpperCase(),
        "Status": (p.status || "Completed").toUpperCase()
      }));
      exportToPDF(data, `Payments_Ledger_${activeLedgerTab}_${new Date().toISOString().slice(0, 10)}`, `CLIENT PAYMENTS & ${activeLedgerTab.toUpperCase()} LEDGER REPORT`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── TOP BANNER & ACTION BAR ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/80 p-6 rounded-[30px] shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Payments & Financial Ledger Console</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Website transaction logs, gateway collections & vendor billing hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-200"
          >
            <Plus size={14} /> Log Offline Payment
          </button>
          
          <button 
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export CSV"
          >
            <Download size={13} /> Export CSV
          </button>

          <button 
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export PDF"
          >
            <Printer size={13} /> Export PDF
          </button>

          <button 
            onClick={handleRefresh}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* ── TABS SELECTOR ───────────────────────────────────── */}
      <div className="flex border-b border-slate-200/80 gap-6">
        <button
          onClick={() => setActiveLedgerTab("income")}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeLedgerTab === "income"
              ? "border-emerald-600 text-emerald-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <TrendingUp size={14} /> Income Ledger
        </button>
        <button
          onClick={() => setActiveLedgerTab("expense")}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeLedgerTab === "expense"
              ? "border-rose-600 text-rose-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShoppingBag size={14} /> Expense & Vendor Ledger
        </button>
        <button
          onClick={() => setActiveLedgerTab("refunds")}
          className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${
            activeLedgerTab === "refunds"
              ? "border-amber-600 text-amber-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <RotateCcw size={14} /> Refunds Register
        </button>
      </div>

      {/* ── KPI STATISTICS STRIP (3 CARDS + MINI CHART) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/80 p-6 rounded-[28px] shadow-sm flex items-center justify-between hover:border-emerald-500/40 transition-all group">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider group-hover:text-emerald-500 transition-colors">Total Income (Received)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totals.totalIncome.toLocaleString()}</h3>
              <p className="text-[9px] font-bold text-emerald-600 mt-1">Razorpay: ₹{totals.razorpayTotal.toLocaleString()}</p>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <ArrowDownRight size={22} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-[28px] shadow-sm flex items-center justify-between hover:border-rose-500/40 transition-all group">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider group-hover:text-rose-500 transition-colors">Total Outgoing Expenses</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totals.totalExpenses.toLocaleString()}</h3>
              <p className="text-[9px] font-bold text-rose-500 mt-1">Procurement POs</p>
            </div>
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <ArrowUpRight size={22} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-6 rounded-[28px] shadow-sm flex items-center justify-between hover:border-amber-500/40 transition-all group">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider group-hover:text-amber-500 transition-colors">Total Customer Refunds</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totals.totalRefunds.toLocaleString()}</h3>
              <p className="text-[9px] font-bold text-amber-600 mt-1">Processed Refunds</p>
            </div>
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <RotateCcw size={22} />
            </div>
          </div>
        </div>

        {/* Visual Bar Breakdown Chart */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-[28px] shadow-sm flex flex-col justify-between">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Activity size={12} className="text-indigo-500" /> Payment Split Bar
          </p>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "8px", color: "#fff", fontSize: "10px" }} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── FILTERS ROW (5-COLUMNS DYNAMIC) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-5 rounded-[24px] border border-slate-200/80 shadow-sm">
        {/* Website Selector */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <Globe size={9} className="text-indigo-500" /> Website
          </label>
          <select
            value={selectedWebsiteId}
            onChange={(e) => {
              setSelectedWebsiteId(e.target.value);
              setSelectedCustomerId("");
            }}
            className="w-full bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          >
            {websites.map((w) => (
              <option key={w._id} value={w._id}>
                {w.domain || w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Selector */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <User size={9} className="text-indigo-500" /> Customer Filter
          </label>
          <select
            value={selectedCustomerId}
            disabled={activeLedgerTab === "expense"}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-50"
          >
            <option value="">All Customers ({customers.length})</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Mode / Gateway Selector */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <CreditCard size={9} className="text-indigo-500" /> Payment Mode
          </label>
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          >
            <option value="">All Modes / Gateways</option>
            <option value="razorpay">Razorpay Online</option>
            <option value="cash">Cash Received</option>
            <option value="bank">Bank Wire / Transfer</option>
            <option value="stripe">Stripe</option>
            <option value="card">Credit / Debit Card</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        {/* Payment Status Selector */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <Filter size={9} className="text-indigo-500" /> Payment Status
          </label>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed / Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Search input */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
            <Search size={9} className="text-indigo-500" /> Search Transactions
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Tx#, Invoice#..."
            className="w-full bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-[10px] font-bold text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* ── MAIN LEDGER TABLE CONTENT ─────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw size={32} className="animate-spin text-indigo-600" />
            <p className="text-[10px] font-black uppercase tracking-widest">Fetching ledger transactions...</p>
          </div>
        ) : activeLedgerTab === "expense" ? (
          /* Expense Ledger Table */
          filteredPurchaseOrders.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <ShoppingBag size={32} className="mx-auto text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest">No expense records found matching criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">PO Info</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Website</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4 pr-6 text-right">Status & Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-slate-50/60 transition-colors">
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
                      <td className="p-4 text-slate-600 font-semibold">
                        {po.websiteId?.websiteName || "N/A"}
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        ₹{(po.total || 0).toLocaleString()}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                            po.status === "delivered" || po.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : po.status === "cancelled"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}>
                            {po.status || "draft"}
                          </span>
                          <button
                            onClick={() => {
                              exportSingleRecordPDF(
                                `PURCHASE ORDER EXPENSE RECEIPT - ${po.poNumber}`,
                                {
                                  "PO Number": po.poNumber,
                                  "Supplier": po.supplierId?.companyName || "N/A",
                                  "Total Amount": `INR ₹${po.total || 0}`,
                                  "Status": (po.status || "DRAFT").toUpperCase(),
                                  "Order Date": po.createdAt ? new Date(po.createdAt).toLocaleString() : "N/A"
                                },
                                `PO_Expense_${po.poNumber}`
                              );
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Export Single PO PDF"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
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
                {activeLedgerTab === "refunds" ? "No refund records found" : "No income transactions found"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4 pl-6">Payment Info</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Invoice Ref</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Gateway / Mode</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4 pr-6 text-right">Status & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900">
                        <p className="font-black text-slate-800">{p.paymentNumber || p._id}</p>
                        <p className="text-[8px] text-slate-400 font-medium mt-0.5">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{p.customerId?.name || p.customerId?.companyName || "N/A"}</p>
                        <p className="text-[8px] text-slate-400 font-medium">{p.customerId?.email || ""}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                          <FileText size={10} /> {p.invoiceId?.invoiceId || p.invoiceId?._id?.slice(-6).toUpperCase() || "N/A"}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        ₹{(p.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          (p.gateway || p.paymentMethod) === "razorpay" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          {p.gateway || p.paymentMethod || "offline"}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500 text-[10px] select-all">
                        {p.transactionId || p.referenceNumber || "N/A"}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                            p.status === "refunded" 
                              ? "bg-amber-50 text-amber-700 border-amber-100" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}>
                            {p.status === "refunded" ? "refunded" : "completed"}
                          </span>
                          <button
                            onClick={() => {
                              exportSingleRecordPDF(
                                `PAYMENT TRANSACTION RECEIPT - ${p.paymentNumber || p._id}`,
                                {
                                  "Receipt #": p.paymentNumber || p._id,
                                  "Customer Name": p.customerId?.name || p.customerId?.companyName || "N/A",
                                  "Invoice Reference": p.invoiceId?.invoiceId || p.invoiceId?._id || "N/A",
                                  "Amount Paid": `INR ₹${p.amount || 0}`,
                                  "Payment Gateway / Mode": (p.gateway || p.paymentMethod || "OFFLINE").toUpperCase(),
                                  "Transaction Ref ID": p.transactionId || p.referenceNumber || "N/A",
                                  "Payment Status": (p.status || "COMPLETED").toUpperCase(),
                                  "Transaction Time": p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"
                                },
                                `Payment_Receipt_${p.paymentNumber || p._id}`
                              );
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Export Single Receipt PDF"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── LOG OFFLINE PAYMENT MODAL ─────────────────────────────── */}
      {showLogModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogModal(false); }}
        >
          <div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Log Payment Transaction</h4>
              <button onClick={() => setShowLogModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogPaymentSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Select Customer</label>
                <select
                  required
                  value={logForm.customerId}
                  onChange={(e) => setLogForm({ ...logForm, customerId: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Amount (INR ₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={logForm.amount}
                  onChange={(e) => setLogForm({ ...logForm, amount: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Payment Method</label>
                <select
                  value={logForm.paymentMethod}
                  onChange={(e) => setLogForm({ ...logForm, paymentMethod: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="cash">Cash Received</option>
                  <option value="bank">Bank Wire / Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="razorpay">Razorpay Online</option>
                  <option value="card">Credit / Debit Card</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Tx Reference / Cheque #</label>
                <input
                  type="text"
                  placeholder="Optional reference number"
                  value={logForm.transactionId}
                  onChange={(e) => setLogForm({ ...logForm, transactionId: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl shadow-md"
                >
                  {submitting ? "Logging..." : "Log Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
