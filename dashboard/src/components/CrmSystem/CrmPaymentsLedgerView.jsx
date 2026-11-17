import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Globe,
  User,
  Search,
  RefreshCw,
  Download,
  FileText,
  ShoppingBag,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Filter,
  Printer,
  Plus,
  X,
  Activity,
  Trash2
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmPaymentsLedgerView({ websiteId: propWebsiteId }) {
  const toast = useToast();
  const { formatCurrency, currencySymbol = "$" } = useCurrency();

  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeLedgerTab, setActiveLedgerTab] = useState("income");

  const [selectedWebsiteId, setSelectedWebsiteId] = useState(
    propWebsiteId && propWebsiteId !== "all" ? propWebsiteId : ""
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    customerId: "",
    invoiceId: "",
    amount: "",
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().slice(0, 10),
    transactionId: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    noteType: "credit",
    customerId: "",
    invoiceId: "",
    amount: "",
    reason: ""
  });
  const [submittingNote, setSubmittingNote] = useState(false);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ paymentId: "", amount: "", reason: "" });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  useEffect(() => {
    if (propWebsiteId !== undefined) {
      setSelectedWebsiteId(propWebsiteId === "all" ? "" : propWebsiteId);
      setSelectedCustomerId("");
    }
  }, [propWebsiteId]);

  useEffect(() => {
    fetchWebsites();
  }, []);

  useEffect(() => {
    fetchLedgerData();
    fetchCustomersForWebsite(selectedWebsiteId);
    fetchInvoicesForWebsite(selectedWebsiteId);
  }, [selectedWebsiteId, selectedCustomerId]);

  const fetchWebsites = async () => {
    try {
      const res = await api("/api/websites");
      setWebsites(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to fetch websites", err);
    }
  };

  const fetchCustomersForWebsite = async (wId) => {
    try {
      const qs = wId && wId !== "all" ? `?websiteId=${wId}` : "";
      const res = await api(`/api/crm${qs}`);
      setCustomers(Array.isArray(res) ? res : res?.customers || []);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchInvoicesForWebsite = async (wId) => {
    try {
      const qs = wId && wId !== "all" ? `?websiteId=${wId}` : "";
      const res = await api(`/api/crm/invoices${qs}`);
      const list = Array.isArray(res) ? res : res?.invoices || res?.data || [];
      setInvoices(list);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    }
  };

  const customerOpenInvoices = useMemo(() => {
    if (!logForm.customerId) return [];
    return invoices.filter((inv) => {
      const invCustId = inv.customerId?._id || inv.customerId;
      const isPaid = inv.status === "paid" || inv.status === "cancelled" || inv.status === "void";
      return String(invCustId) === String(logForm.customerId) && !isPaid;
    });
  }, [invoices, logForm.customerId]);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const payParams = [];
      if (selectedWebsiteId && selectedWebsiteId !== "all") {
        payParams.push(`websiteId=${selectedWebsiteId}`);
      }
      if (selectedCustomerId) {
        payParams.push(`customerId=${selectedCustomerId}`);
      }
      const payUrl = `/api/crm/payments${payParams.length ? `?${payParams.join("&")}` : ""}`;
      const poUrl = `/api/procurement/orders${
        selectedWebsiteId && selectedWebsiteId !== "all"
          ? `?websiteId=${selectedWebsiteId}`
          : ""
      }`;

      const cnUrl = `/api/crm/creditnotes${payParams.length ? `?${payParams.join("&")}` : ""}`;
      const dnUrl = `/api/crm/debitnotes${payParams.length ? `?${payParams.join("&")}` : ""}`;

      const [payRes, poRes, cnRes, dnRes] = await Promise.allSettled([
        api(payUrl),
        api(poUrl),
        api(cnUrl),
        api(dnUrl)
      ]);
      setPayments(payRes.status === "fulfilled" && Array.isArray(payRes.value) ? payRes.value : []);
      setPurchaseOrders(
        poRes.status === "fulfilled" && Array.isArray(poRes.value) ? poRes.value : []
      );
      setCreditNotes(cnRes.status === "fulfilled" && Array.isArray(cnRes.value) ? cnRes.value : []);
      setDebitNotes(dnRes.status === "fulfilled" && Array.isArray(dnRes.value) ? dnRes.value : []);
    } catch (err) {
      toast.error(err.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const handleLogPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!logForm.customerId || !logForm.invoiceId || !logForm.amount) {
      toast.error("Please select a customer, invoice, and enter amount.");
      return;
    }
    setSubmitting(true);
    try {
      const cust = customers.find((c) => c._id === logForm.customerId);
      const resolvedWebsiteId =
        selectedWebsiteId || cust?.websiteId || websites[0]?._id || undefined;
      await api("/api/crm/payments", {
        method: "POST",
        body: JSON.stringify({
          ...logForm,
          ...(resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : {}),
          amount: Number(logForm.amount),
          referenceNumber: logForm.transactionId,
          status: "completed",
          gateway: logForm.paymentMethod
        })
      });
      toast.success("Payment logged successfully");
      setShowLogModal(false);
      setLogForm({
        customerId: "",
        invoiceId: "",
        amount: "",
        paymentMethod: "cash",
        paymentDate: new Date().toISOString().slice(0, 10),
        transactionId: "",
        notes: ""
      });
      fetchLedgerData();
      fetchInvoicesForWebsite(selectedWebsiteId);
    } catch (err) {
      toast.error(err.message || "Failed to log payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteForm.customerId || !noteForm.invoiceId || !noteForm.amount) {
      toast.error("Please select customer, invoice, and amount.");
      return;
    }
    setSubmittingNote(true);
    try {
      const cust = customers.find((c) => c._id === noteForm.customerId);
      const resolvedWebsiteId =
        selectedWebsiteId || cust?.websiteId || websites[0]?._id || undefined;
      const endpoint = noteForm.noteType === "credit" ? "/api/crm/creditnotes" : "/api/crm/debitnotes";
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify({
          ...(resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : {}),
          customerId: noteForm.customerId,
          invoiceId: noteForm.invoiceId,
          amount: Number(noteForm.amount),
          reason: noteForm.reason
        })
      });
      toast.success(`${noteForm.noteType === "credit" ? "Credit" : "Debit"} Note issued`);
      setShowNoteModal(false);
      setNoteForm({ noteType: "credit", customerId: "", invoiceId: "", amount: "", reason: "" });
      fetchLedgerData();
    } catch (err) {
      toast.error(err.message || "Failed to issue note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateNoteStatus = async (noteType, id, status) => {
    try {
      const endpoint = noteType === "credit" ? `/api/crm/creditnotes/${id}` : `/api/crm/debitnotes/${id}`;
      await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      toast.success("Note status updated");
      fetchLedgerData();
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const openRefundModal = (payment) => {
    setRefundForm({
      paymentId: payment?._id || "",
      amount: payment ? String(payment.amount || "") : "",
      reason: ""
    });
    setShowRefundModal(true);
  };

  const handleInitiateRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundForm.paymentId) {
      toast.error("Select a payment to refund");
      return;
    }
    setSubmittingRefund(true);
    try {
      await api(`/api/crm/payments/refund/${refundForm.paymentId}`, {
        method: "POST",
        body: JSON.stringify({
          ...(refundForm.amount ? { amount: Number(refundForm.amount) } : {}),
          reason: refundForm.reason || "Customer refund request"
        })
      });
      toast.success("Refund issued and Credit Note created");
      setShowRefundModal(false);
      setRefundForm({ paymentId: "", amount: "", reason: "" });
      fetchLedgerData();
    } catch (err) {
      toast.error(err.message || "Refund failed");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!paymentId) return;
    if (!window.confirm("Void and delete this payment record? Invoice paid amount will be recalculated.")) return;
    try {
      await api(`/api/crm/payments/${paymentId}`, { method: "DELETE" });
      toast.success("Payment voided and deleted");
      fetchLedgerData();
    } catch (err) {
      toast.error(err.message || "Failed to delete payment");
    }
  };

  const noteCustomerInvoices = useMemo(() => {
    if (!noteForm.customerId) return [];
    return invoices.filter(
      (inv) => String(inv.customerId?._id || inv.customerId) === String(noteForm.customerId)
    );
  }, [invoices, noteForm.customerId]);

  const combinedNotes = useMemo(() => {
    const cns = creditNotes.map((n) => ({ ...n, noteType: "credit", noteNumber: n.creditNoteNumber }));
    const dns = debitNotes.map((n) => ({ ...n, noteType: "debit", noteNumber: n.debitNoteNumber }));
    return [...cns, ...dns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [creditNotes, debitNotes]);

  const filteredPayments = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      if (activeLedgerTab === "income" && p.status === "refunded") return false;
      if (activeLedgerTab === "refunds" && p.status !== "refunded") return false;

      if (selectedPaymentMode) {
        const gw = (p.gateway || p.paymentMethod || p.method || "cash").toLowerCase();
        if (!gw.includes(selectedPaymentMode.toLowerCase())) return false;
      }

      if (selectedPaymentStatus) {
        const st = (p.status || "completed").toLowerCase();
        if (!st.includes(selectedPaymentStatus.toLowerCase())) return false;
      }

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

  const filteredPurchaseOrders = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return purchaseOrders.filter((po) => {
      if (!term) return true;
      const poNumber = (po.poNumber || "").toLowerCase();
      const supplierName = (po.supplierId?.companyName || "").toLowerCase();
      const status = (po.status || "").toLowerCase();
      return poNumber.includes(term) || supplierName.includes(term) || status.includes(term);
    });
  }, [purchaseOrders, searchQuery]);

  const totals = useMemo(() => {
    const totalIncome = payments
      .filter((p) => p.status !== "refunded")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalRefunds = payments
      .filter((p) => p.status === "refunded")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalExpenses = purchaseOrders
      .filter((po) => ["delivered", "accepted", "shipped"].includes(po.status))
      .reduce((sum, po) => sum + (Number(po.total) || 0), 0);

    const razorpayTotal = payments
      .filter((p) => (p.gateway || p.paymentMethod) === "razorpay" && p.status !== "refunded")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const cashTotal = payments
      .filter((p) => (p.gateway || p.paymentMethod) === "cash" && p.status !== "refunded")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { totalIncome, totalRefunds, totalExpenses, razorpayTotal, cashTotal };
  }, [payments, purchaseOrders]);

  const chartData = useMemo(
    () => [
      { name: "Income", amount: totals.totalIncome, fill: "#10b981" },
      { name: "Expenses", amount: totals.totalExpenses, fill: "#f43f5e" },
      { name: "Refunds", amount: totals.totalRefunds, fill: "#f59e0b" },
      { name: "Razorpay", amount: totals.razorpayTotal, fill: "#6366f1" },
      { name: "Cash", amount: totals.cashTotal, fill: "#06b6d4" }
    ],
    [totals]
  );

  const exportCSV = () => {
    if (activeLedgerTab === "expense") {
      if (filteredPurchaseOrders.length === 0) {
        toast.info("No expense records to export");
        return;
      }
      const rows = filteredPurchaseOrders.map((po) => ({
        "PO Number": po.poNumber,
        Date: po.createdAt ? new Date(po.createdAt).toLocaleDateString() : "-",
        Supplier: po.supplierId?.companyName || "-",
        "Supplier Email": po.supplierId?.email || "-",
        Website: po.websiteId?.websiteName || "-",
        Amount: po.total || 0,
        Status: (po.status || "Draft").toUpperCase()
      }));
      exportToCSV(rows, `Supplier_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}`);
      toast.success("Exported CSV");
    } else {
      if (filteredPayments.length === 0) {
        toast.info("No payment records to export");
        return;
      }
      const rows = filteredPayments.map((p) => ({
        "Payment ID": p.paymentNumber || p._id,
        Date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-",
        "Customer Name": p.customerId?.name || p.customerId?.companyName || "N/A",
        "Invoice Reference": p.invoiceId?.invoiceId || p.invoiceId?._id || "N/A",
        "Amount Paid": p.amount || 0,
        "Gateway / Mode": (p.gateway || p.paymentMethod || "Offline").toUpperCase(),
        "Transaction Ref": p.transactionId || p.referenceNumber || "N/A",
        Status: (p.status || "Completed").toUpperCase()
      }));
      exportToCSV(
        rows,
        `Payments_Ledger_${activeLedgerTab}_${new Date().toISOString().slice(0, 10)}`
      );
      toast.success("Exported CSV");
    }
  };

  const exportPDF = () => {
    if (activeLedgerTab === "expense") {
      if (filteredPurchaseOrders.length === 0) {
        toast.info("No expense records to export");
        return;
      }
      const data = filteredPurchaseOrders.map((po) => ({
        "PO Number": po.poNumber,
        Supplier: po.supplierId?.companyName || "-",
        Amount: formatCurrency(po.total || 0),
        Status: (po.status || "Draft").toUpperCase()
      }));
      exportToPDF(
        data,
        `Supplier_Expenses_Ledger_${new Date().toISOString().slice(0, 10)}`,
        "EXPENSE & SUPPLIER VENDOR LEDGER REPORT"
      );
    } else {
      if (filteredPayments.length === 0) {
        toast.info("No payment records to export");
        return;
      }
      const data = filteredPayments.map((p) => ({
        "Payment ID": p.paymentNumber || p._id,
        Customer: p.customerId?.name || p.customerId?.companyName || "N/A",
        Amount: formatCurrency(p.amount || 0),
        Gateway: (p.gateway || p.paymentMethod || "Offline").toUpperCase(),
        Status: (p.status || "Completed").toUpperCase()
      }));
      exportToPDF(
        data,
        `Payments_Ledger_${activeLedgerTab}_${new Date().toISOString().slice(0, 10)}`,
        `CLIENT PAYMENTS & ${activeLedgerTab.toUpperCase()} LEDGER REPORT`
      );
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-sm gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard size={14} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
              Payments & Financial Ledger
            </h3>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Transaction logs, gateway collections & vendor billing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={fetchLedgerData}
            title="Refresh"
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
          <button
            onClick={() => openRefundModal(null)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <RotateCcw size={11} /> Initiate Refund
          </button>
          <button
            onClick={() => setShowNoteModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Plus size={11} /> Issue Note
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-black uppercase rounded-lg shadow-sm transition-colors"
          >
            <Plus size={11} /> Log Payment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 gap-4 px-1">
        <button
          onClick={() => setActiveLedgerTab("income")}
          className={`pb-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
            activeLedgerTab === "income"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <TrendingUp size={12} /> Income Ledger
        </button>
        <button
          onClick={() => setActiveLedgerTab("expense")}
          className={`pb-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
            activeLedgerTab === "expense"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShoppingBag size={12} /> Expense & Vendor
        </button>
        <button
          onClick={() => setActiveLedgerTab("refunds")}
          className={`pb-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
            activeLedgerTab === "refunds"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <RotateCcw size={12} /> Refunds Register
        </button>
        <button
          onClick={() => setActiveLedgerTab("notes")}
          className={`pb-2 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors flex items-center gap-1.5 ${
            activeLedgerTab === "notes"
              ? "border-violet-600 text-violet-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <FileText size={12} /> Credit & Debit Notes ({combinedNotes.length})
        </button>
      </div>

      {/* KPI Strip + Mini Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2.5">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                Total Income
              </p>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {formatCurrency(totals.totalIncome)}
              </h3>
              <p className="text-[9px] font-bold text-emerald-600">
                Razorpay: {formatCurrency(totals.razorpayTotal)}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowDownRight size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                Outgoing Expenses
              </p>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {formatCurrency(totals.totalExpenses)}
              </h3>
              <p className="text-[9px] font-bold text-rose-500">Procurement POs</p>
            </div>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowUpRight size={16} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                Customer Refunds
              </p>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {formatCurrency(totals.totalRefunds)}
              </h3>
              <p className="text-[9px] font-bold text-amber-600">Processed Refunds</p>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <RotateCcw size={16} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-sm flex flex-col justify-between">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Activity size={11} className="text-indigo-500" /> Payment Split
          </p>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "9.5px"
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Globe size={9} className="text-indigo-500" /> Website
          </label>
          <select
            value={selectedWebsiteId}
            onChange={(e) => {
              setSelectedWebsiteId(e.target.value);
              setSelectedCustomerId("");
            }}
            className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none"
          >
            <option value="">All Websites</option>
            {websites.map((w) => (
              <option key={w._id} value={w._id}>
                {w.domain || w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <User size={9} className="text-indigo-500" /> Customer
          </label>
          <select
            value={selectedCustomerId}
            disabled={activeLedgerTab === "expense"}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none disabled:opacity-50"
          >
            <option value="">All Customers ({customers.length})</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CreditCard size={9} className="text-indigo-500" /> Mode
          </label>
          <select
            value={selectedPaymentMode}
            onChange={(e) => setSelectedPaymentMode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none"
          >
            <option value="">All Modes</option>
            <option value="razorpay">Razorpay Online</option>
            <option value="cash">Cash Received</option>
            <option value="bank">Bank Transfer</option>
            <option value="stripe">Stripe</option>
            <option value="card">Card</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={9} className="text-indigo-500" /> Status
          </label>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Search size={9} className="text-indigo-500" /> Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tx#, Invoice#, Name..."
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 space-y-2">
            <RefreshCw size={20} className="animate-spin text-indigo-600" />
            <p className="text-[9.5px] font-black uppercase tracking-wider">Loading ledger...</p>
          </div>
        ) : activeLedgerTab === "notes" ? (
          combinedNotes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-1.5">
              <FileText size={22} className="mx-auto text-slate-300" />
              <p className="text-[9.5px] font-black uppercase tracking-wider">
                No credit or debit notes issued
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-3 py-2 pl-4">Note #</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Invoice #</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2 pr-4 text-right">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combinedNotes
                    .filter((n) => {
                      if (selectedCustomerId && String(n.customerId?._id || n.customerId) !== String(selectedCustomerId)) return false;
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.trim().toLowerCase();
                      return (
                        (n.noteNumber || "").toLowerCase().includes(q) ||
                        (n.customerId?.name || "").toLowerCase().includes(q) ||
                        (n.invoiceId?.invoiceNumber || n.invoiceId?.invoiceId || "").toLowerCase().includes(q) ||
                        (n.reason || "").toLowerCase().includes(q)
                      );
                    })
                    .map((n) => (
                      <tr key={n._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2 pl-4 font-black text-slate-800">{n.noteNumber}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                              n.noteType === "credit"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {n.noteType === "credit" ? "Credit Note" : "Debit Note"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-700">
                          {n.customerId?.companyName || n.customerId?.name || "Unknown"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[9.5px] text-slate-500">
                          {n.invoiceId?.invoiceNumber || n.invoiceId?.invoiceId || "-"}
                        </td>
                        <td className="px-3 py-2 font-black text-slate-900">
                          {formatCurrency(n.amount || 0)}
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-[180px] truncate">
                          {n.reason || "-"}
                        </td>
                        <td className="px-3 py-2 pr-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <select
                              value={n.status}
                              onChange={(e) => handleUpdateNoteStatus(n.noteType, n._id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase text-slate-700 outline-none"
                            >
                              {n.noteType === "credit" ? (
                                <>
                                  <option value="applied">Applied</option>
                                  <option value="refunded">Refunded</option>
                                  <option value="cancelled">Cancelled</option>
                                </>
                              ) : (
                                <>
                                  <option value="pending">Pending</option>
                                  <option value="paid">Paid</option>
                                  <option value="cancelled">Cancelled</option>
                                </>
                              )}
                            </select>
                            <button
                              onClick={() =>
                                exportSingleRecordPDF(
                                  `${n.noteType === "credit" ? "CREDIT" : "DEBIT"} NOTE - ${n.noteNumber}`,
                                  {
                                    "Note Number": n.noteNumber,
                                    Type: n.noteType.toUpperCase(),
                                    Customer: n.customerId?.companyName || n.customerId?.name || "Unknown",
                                    "Invoice #": n.invoiceId?.invoiceNumber || n.invoiceId?.invoiceId || "-",
                                    Amount: formatCurrency(n.amount || 0),
                                    Status: (n.status || "").toUpperCase(),
                                    Reason: n.reason || "-",
                                    "Issued Date": n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "-"
                                  },
                                  `${n.noteNumber}`
                                )
                              }
                              className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md"
                              title="Export Note PDF"
                            >
                              <Printer size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeLedgerTab === "expense" ? (
          filteredPurchaseOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-1.5">
              <ShoppingBag size={22} className="mx-auto text-slate-300" />
              <p className="text-[9.5px] font-black uppercase tracking-wider">
                No expense records found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-3 py-2 pl-4">PO Info</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2">Website</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2 pr-4 text-right">Status & PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2 pl-4">
                        <p className="font-black text-slate-800">{po.poNumber}</p>
                        <p className="text-[8.5px] text-slate-400">
                          {po.createdAt ? new Date(po.createdAt).toLocaleString() : "N/A"}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-700">
                          {po.supplierId?.companyName || "N/A"}
                        </p>
                        <p className="text-[8.5px] text-slate-400">{po.supplierId?.email || ""}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-semibold">
                        {po.websiteId?.websiteName || "N/A"}
                      </td>
                      <td className="px-3 py-2 font-black text-slate-900">
                        {formatCurrency(po.total || 0)}
                      </td>
                      <td className="px-3 py-2 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                              po.status === "delivered" || po.status === "accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : po.status === "cancelled"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {po.status || "draft"}
                          </span>
                          <button
                            onClick={() =>
                              exportSingleRecordPDF(
                                `PURCHASE ORDER EXPENSE RECEIPT - ${po.poNumber}`,
                                {
                                  "PO Number": po.poNumber,
                                  Supplier: po.supplierId?.companyName || "N/A",
                                  "Total Amount": formatCurrency(po.total || 0),
                                  Status: (po.status || "DRAFT").toUpperCase(),
                                  "Order Date": po.createdAt
                                    ? new Date(po.createdAt).toLocaleString()
                                    : "N/A"
                                },
                                `PO_Expense_${po.poNumber}`
                              )
                            }
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                            title="Export Single PO PDF"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-1.5">
            <CreditCard size={22} className="mx-auto text-slate-300" />
            <p className="text-[9.5px] font-black uppercase tracking-wider">
              {activeLedgerTab === "refunds"
                ? "No refund records found"
                : "No income transactions found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[8.5px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-3 py-2 pl-4">Payment</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Tx Ref</th>
                  <th className="px-3 py-2 pr-4 text-right">Status & Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2 pl-4">
                      <p className="font-black text-slate-800">{p.paymentNumber || p._id}</p>
                      <p className="text-[8.5px] text-slate-400">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-800">
                        {p.customerId?.name || p.customerId?.companyName || "N/A"}
                      </p>
                      <p className="text-[8.5px] text-slate-400">{p.customerId?.email || ""}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[9px]">
                        <FileText size={10} />{" "}
                        {p.invoiceId?.invoiceId || p.invoiceId?._id?.slice(-6).toUpperCase() || "N/A"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-black text-slate-900">
                      {formatCurrency(p.amount || 0)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          (p.gateway || p.paymentMethod) === "razorpay"
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {p.gateway || p.paymentMethod || "offline"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-500 text-[9.5px] select-all">
                      {p.transactionId || p.referenceNumber || "N/A"}
                    </td>
                    <td className="px-3 py-2 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                            p.status === "refunded"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {p.status === "refunded" ? "refunded" : "completed"}
                        </span>
                        <button
                          onClick={() =>
                            exportSingleRecordPDF(
                              `PAYMENT TRANSACTION RECEIPT - ${p.paymentNumber || p._id}`,
                              {
                                "Receipt #": p.paymentNumber || p._id,
                                "Customer Name":
                                  p.customerId?.name || p.customerId?.companyName || "N/A",
                                "Invoice Reference":
                                  p.invoiceId?.invoiceId || p.invoiceId?._id || "N/A",
                                "Amount Paid": formatCurrency(p.amount || 0),
                                "Payment Gateway / Mode": (
                                  p.gateway ||
                                  p.paymentMethod ||
                                  "OFFLINE"
                                ).toUpperCase(),
                                "Transaction Ref ID":
                                  p.transactionId || p.referenceNumber || "N/A",
                                "Payment Status": (p.status || "COMPLETED").toUpperCase(),
                                "Transaction Time": p.createdAt
                                  ? new Date(p.createdAt).toLocaleString()
                                  : "N/A"
                              },
                              `Payment_Receipt_${p.paymentNumber || p._id}`
                            )
                          }
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                          title="Export Single Receipt PDF"
                        >
                          <Printer size={12} />
                        </button>
                        {p.status !== "refunded" && (
                          <button
                            onClick={() => openRefundModal(p)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md"
                            title="Initiate Refund"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePayment(p._id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                          title="Void & Delete Payment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Offline Payment Modal */}
      {showLogModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLogModal(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Log Payment Transaction
                </h4>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleLogPaymentSubmit} className="p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Select Customer *
                    </label>
                    <select
                      required
                      value={logForm.customerId}
                      onChange={(e) =>
                        setLogForm({
                          ...logForm,
                          customerId: e.target.value,
                          invoiceId: "",
                          amount: ""
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    >
                      <option value="">Choose Customer...</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name || c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Select Invoice *
                    </label>
                    <select
                      required
                      disabled={!logForm.customerId}
                      value={logForm.invoiceId}
                      onChange={(e) => {
                        const invId = e.target.value;
                        const inv = customerOpenInvoices.find((i) => i._id === invId);
                        const due = inv
                          ? Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0))
                          : "";
                        setLogForm({
                          ...logForm,
                          invoiceId: invId,
                          amount: due !== "" ? String(due) : logForm.amount
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value="">
                        {!logForm.customerId
                          ? "Select customer first..."
                          : customerOpenInvoices.length === 0
                          ? "No unpaid invoices"
                          : "Choose Invoice..."}
                      </option>
                      {customerOpenInvoices.map((inv) => {
                        const due = Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0));
                        return (
                          <option key={inv._id} value={inv._id}>
                            {inv.invoiceId || inv._id.slice(-6).toUpperCase()} — Due: {formatCurrency(due)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {logForm.customerId && customerOpenInvoices.length === 0 && (
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-2 rounded-xl">
                    Is customer ka koi unpaid/pending invoice nahi mila. Pehle invoice create karein.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Amount ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      placeholder="5000"
                      value={logForm.amount}
                      onChange={(e) => setLogForm({ ...logForm, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Method
                    </label>
                    <select
                      value={logForm.paymentMethod}
                      onChange={(e) => setLogForm({ ...logForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI / Instant</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                      <option value="razorpay">Razorpay</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={logForm.paymentDate}
                      onChange={(e) => setLogForm({ ...logForm, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Tx Reference / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="Optional reference / UTR / cheque number"
                    value={logForm.transactionId}
                    onChange={(e) => setLogForm({ ...logForm, transactionId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Optional internal payment note..."
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !logForm.invoiceId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-colors"
                  >
                    {submitting ? "Logging..." : "Log Transaction"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
                  document.body
        )}

      {/* Issue Credit / Debit Note Modal */}
      {showNoteModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNoteModal(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Issue Credit / Debit Note
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateNoteSubmit} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Note Type *
                    </label>
                    <select
                      value={noteForm.noteType}
                      onChange={(e) => setNoteForm({ ...noteForm, noteType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    >
                      <option value="credit">Credit Note (Refund / Reduction)</option>
                      <option value="debit">Debit Note (Additional Charge)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Amount ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={noteForm.amount}
                      onChange={(e) => setNoteForm({ ...noteForm, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Customer *
                  </label>
                  <select
                    required
                    value={noteForm.customerId}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, customerId: e.target.value, invoiceId: "" })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                  >
                    <option value="">Choose Customer...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Linked Invoice *
                  </label>
                  <select
                    required
                    disabled={!noteForm.customerId}
                    value={noteForm.invoiceId}
                    onChange={(e) => setNoteForm({ ...noteForm, invoiceId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Select Invoice...</option>
                    {noteCustomerInvoices.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        #{inv.invoiceNumber || inv.invoiceId} ({formatCurrency(inv.total || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Reason / Adjustment Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Partial service cancellation or extra hours"
                    value={noteForm.reason}
                    onChange={(e) => setNoteForm({ ...noteForm, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNote || !noteForm.invoiceId}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-colors"
                  >
                    {submittingNote ? "Issuing..." : "Issue Note"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Initiate Refund Modal */}
      {showRefundModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowRefundModal(false)}
            />
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw size={14} className="text-amber-600" /> Initiate Payment Refund
                </h3>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
                >
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={handleInitiateRefundSubmit} className="p-5 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Completed Payment
                  </label>
                  <select
                    required
                    value={refundForm.paymentId}
                    onChange={(e) => {
                      const p = payments.find((item) => item._id === e.target.value);
                      setRefundForm({
                        ...refundForm,
                        paymentId: e.target.value,
                        amount: p ? String(p.amount || "") : ""
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                  >
                    <option value="">Select Payment...</option>
                    {payments
                      .filter((p) => p.status !== "refunded")
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.paymentNumber || p._id} · {p.customerId?.companyName || p.customerId?.name || "Client"} · {formatCurrency(p.amount || 0)}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Refund Amount ({currencySymbol})
                  </label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={refundForm.amount}
                    onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Refund Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Duplicate payment or order cancellation"
                    value={refundForm.reason}
                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRefund || !refundForm.paymentId}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-colors"
                  >
                    {submittingRefund ? "Processing..." : "Process Refund"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
