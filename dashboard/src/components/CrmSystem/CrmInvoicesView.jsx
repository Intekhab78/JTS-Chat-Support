import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  X,
  CreditCard,
  DollarSign,
  Download,
  Clock,
  Search,
  AlertTriangle,
  RefreshCw,
  Printer,
  ChevronRight,
  MessageCircle,
  Mail,
  Plus,
  Trash2
} from "lucide-react";
import { api, apiUrl } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";
import WhatsAppShareModal from "./WhatsAppShareModal.jsx";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { hasPermission } from "../../utils/permissions.js";
import { PERMISSIONS } from "../../constants/domain.js";

export default function CrmInvoicesView({ websiteId }) {
  const { user } = useAuth();
  const canCreateInvoice = !user || hasPermission(user, PERMISSIONS.INVOICE_CREATE);
  const canUpdateInvoice = !user || hasPermission(user, PERMISSIONS.INVOICE_UPDATE);
  const canDeleteInvoice = !user || hasPermission(user, PERMISSIONS.INVOICE_DELETE);
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [createInvForm, setCreateInvForm] = useState({
    customerId: "",
    description: "",
    quantity: 1,
    price: "",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    notes: ""
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    gateway: "cash",
    paymentMethod: "cash",
    referenceNumber: ""
  });

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundForm, setRefundForm] = useState({ reason: "" });

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Yes",
    type: "danger"
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const hasValidWebsite =
        websiteId &&
        websiteId !== "all" &&
        websiteId !== "undefined" &&
        websiteId !== "null";
      const qs = hasValidWebsite ? `?websiteId=${websiteId}` : "";
      const res = await api(`/api/crm/invoices${qs}`);
      const list = Array.isArray(res) ? res : res?.invoices || res?.data || [];
      setInvoices(list);
      setSelectedInvoice(list.length > 0 ? list[0] : null);
    } catch (err) {
      toast.error(err.message || "Failed to load invoices");
      setInvoices([]);
      setSelectedInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchInvoices();
  }, [websiteId]);

  const [waModal, setWaModal] = useState({
    open: false,
    title: "",
    subtitle: "",
    phone: "",
    message: "",
    customerId: null,
    websiteId: null,
  });

  const handleSendWhatsAppInvoice = async (inv) => {
    if (!inv) return;
    const phone =
      inv.customerId?.phones?.[0]?.phone ||
      inv.customerId?.whatsApp ||
      inv.customerId?.phone ||
      inv.phone ||
      "";
    const clientName = inv.customerId?.companyName || inv.customerId?.name || "Valued Client";
    const currencySymbols = { USD: "$", EUR: "€", INR: "Rs. ", AED: "AED ", GBP: "£" };
    const sym = currencySymbols[inv.currency] || "$";
    const dueAmount = Math.max(0, (Number(inv.total) || 0) - (Number(inv.paidAmount) || 0)).toLocaleString();
    const invNum = inv.invoiceId || inv._id?.slice(-6).toUpperCase();
    const dueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Immediate";
    const portalUrl = `${window.location.origin}/client`;
    const resolvedPdfUrl = inv.pdfUrl ? await apiUrl(inv.pdfUrl) : "";
    const pdfLine = resolvedPdfUrl ? `\n• Invoice PDF: ${resolvedPdfUrl}` : "";

    const msg =
      `Hello ${clientName},\n\n` +
      `This is a payment reminder for Invoice *#${invNum}*.\n` +
      `• Outstanding Due: *${sym}${dueAmount}*\n` +
      `• Due Date: *${dueDate}*${pdfLine}\n\n` +
      `Review & pay on your portal: ${portalUrl}\n\nThank you!`;

    setWaModal({
      open: true,
      title: "Share Invoice via WhatsApp",
      subtitle: `${invNum} · ${clientName}`,
      phone,
      message: msg,
      customerId: inv.customerId?._id || inv.customerId || null,
      websiteId: inv.websiteId?._id || inv.websiteId || websiteId || null,
    });
  };

  const handleSendEmailReminder = async (inv) => {
    if (!inv?._id) return;
    try {
      await api(`/api/crm/invoices/${inv._id}/remind`, { method: "POST" });
      toast.success("Email payment reminder sent");
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Failed to send reminder");
    }
  };

  const openCreateInvoiceModal = async () => {
    setShowCreateModal(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${websiteId}&limit=200` : "?limit=200";
      const res = await api(`/api/crm${qs}`);
      setCustomersList(Array.isArray(res) ? res : res?.customers || []);
    } catch {
      setCustomersList([]);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!createInvForm.customerId || !createInvForm.description || !createInvForm.price) {
      toast.error("Customer, item description, and unit price are required");
      return;
    }
    setCreatingInvoice(true);
    try {
      const cust = customersList.find((c) => c._id === createInvForm.customerId);
      const resolvedWebsiteId = (websiteId && websiteId !== "all" ? websiteId : null) || cust?.websiteId;
      const qty = Math.max(1, Number(createInvForm.quantity || 1));
      const price = Number(createInvForm.price || 0);
      await api("/api/crm/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: createInvForm.customerId,
          websiteId: resolvedWebsiteId,
          dueDate: createInvForm.dueDate || undefined,
          notes: createInvForm.notes,
          items: [{
            description: createInvForm.description,
            quantity: qty,
            price,
            total: qty * price
          }],
          status: "pending"
        })
      });
      toast.success("Invoice created");
      setShowCreateModal(false);
      setCreateInvForm({
        customerId: "",
        description: "",
        quantity: 1,
        price: "",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes: ""
      });
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async () => {
    if (!selectedInvoice) return;
    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load Razorpay SDK. Check internet connection.");
        return;
      }

      const orderData = await api(`/api/crm/invoices/${selectedInvoice._id}/razorpay-order`, {
        method: "POST"
      });

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize payment order.");
      }

      if (orderData.orderId.startsWith("order_mock_")) {
        await api(`/api/crm/invoices/${selectedInvoice._id}/razorpay-verify`, {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
            razorpay_signature: "mock_signature"
          })
        });
        toast.success("Sandbox payment verified");
        setSelectedInvoice(null);
        fetchInvoices();
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: selectedInvoice.websiteId?.name || "Invoice Payment",
        description: `Invoice Payment: ${selectedInvoice.invoiceId}`,
        order_id: orderData.orderId,
        prefill: {
          name: selectedInvoice.customerId?.name || "",
          email: selectedInvoice.customerId?.email || "",
          contact: selectedInvoice.customerId?.phone || ""
        },
        theme: { color: "#4f46e5" },
        handler: async function (response) {
          try {
            await api(`/api/crm/invoices/${selectedInvoice._id}/razorpay-verify`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            toast.success("Payment verified successfully");
            setSelectedInvoice(null);
            fetchInvoices();
          } catch (err) {
            toast.error("Verification failed: " + err.message);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Payment error");
    } finally {
      setPaying(false);
    }
  };

  const openPaymentModal = () => {
    if (!selectedInvoice) return;
    const due = Math.max(0, (Number(selectedInvoice.total) || 0) - (Number(selectedInvoice.paidAmount) || 0));
    setPaymentForm({
      amount: due > 0 ? Number(due.toFixed(2)) : 0,
      gateway: "cash",
      paymentMethod: "cash",
      referenceNumber: ""
    });
    setShowPaymentModal(true);
  };

  const handleAllocatePayment = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/payments`, {
        method: "POST",
        body: JSON.stringify({
          ...paymentForm,
          invoiceId: selectedInvoice._id,
          customerId: selectedInvoice.customerId?._id || selectedInvoice.customerId
        })
      });
      toast.success("Payment allocated");
      setShowPaymentModal(false);
      setPaymentForm({ amount: 0, gateway: "cash", paymentMethod: "cash", referenceNumber: "" });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Failed to allocate payment");
    }
  };

  const handleIssueRefund = async (e) => {
    e.preventDefault();
    try {
      const paymentsRes = await api(
        `/api/crm/payments?customerId=${selectedInvoice.customerId?._id || selectedInvoice.customerId}`
      );
      const payments = Array.isArray(paymentsRes)
        ? paymentsRes
        : paymentsRes?.payments || paymentsRes?.data || [];
      const matchingPay = payments.find(
        (p) => String(p.invoiceId?._id || p.invoiceId) === String(selectedInvoice._id)
      );
      if (!matchingPay) {
        throw new Error("No payments logged for this invoice to refund.");
      }
      await api(`/api/crm/payments/refund/${matchingPay._id}`, {
        method: "POST",
        body: JSON.stringify(refundForm)
      });
      toast.success("Refund issued");
      setShowRefundForm(false);
      setRefundForm({ reason: "" });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Refund failed");
    }
  };

  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalInvoicedValue = invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const paidAmount = invoices.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const pendingAmount = Math.max(0, totalInvoicedValue - paidAmount);
    return { totalCount, totalInvoicedValue, paidAmount, pendingAmount };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      const clientName = i.customerId?.companyName || i.customerId?.name || "";
      const invNum = i.invoiceId || i.invoiceNumber || "";
      const matchesSearch =
        !q || invNum.toLowerCase().includes(q) || clientName.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || i.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  useEffect(() => {
    if (paginatedInvoices.length > 0) {
      const isSelectedInPage =
        selectedInvoice && paginatedInvoices.some((i) => i._id === selectedInvoice._id);
      if (!isSelectedInPage) {
        setSelectedInvoice(paginatedInvoices[0]);
      }
    } else {
      setSelectedInvoice(null);
    }
  }, [paginatedInvoices]);

  const handleExportInvoicesCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.info("No invoices to export");
      return;
    }
    const sym = getCurrencySymbol();
    const data = filteredInvoices.map((i) => ({
      "Invoice #": i.invoiceId || i.invoiceNumber || "-",
      "Client / Company": i.customerId?.companyName || i.customerId?.name || "-",
      [`Total Amount (${sym})`]: i.total || 0,
      [`Paid Amount (${sym})`]: i.paidAmount || 0,
      [`Balance Due (${sym})`]: Math.max(0, (i.total || 0) - (i.paidAmount || 0)),
      Status: (i.status || "Pending").toUpperCase(),
      "Due Date": i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "-"
    }));
    exportToCSV(data, `Invoices_Ledger_Report_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported CSV");
  };

  const handleExportInvoicesPDF = () => {
    if (filteredInvoices.length === 0) {
      toast.info("No invoices to export");
      return;
    }
    const sym = getCurrencySymbol();
    const data = filteredInvoices.map((i) => ({
      "Invoice #": i.invoiceId || i.invoiceNumber || "-",
      Client: i.customerId?.companyName || i.customerId?.name || "-",
      [`Total (${sym})`]: formatCurrency(i.total || 0),
      [`Paid (${sym})`]: formatCurrency(i.paidAmount || 0),
      Status: (i.status || "Pending").toUpperCase()
    }));
    exportToPDF(
      data,
      `Invoices_Ledger_Report_${new Date().toISOString().slice(0, 10)}`,
      "ENTERPRISE INVOICES & RECEIVABLES LEDGER REPORT"
    );
  };

  const statusBadgeClass = (st) => {
    if (st === "paid") return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    if (st === "partially_paid") return "bg-sky-50 text-sky-700 border border-sky-100";
    if (st === "cancelled") return "bg-rose-50 text-rose-700 border border-rose-100";
    return "bg-amber-50 text-amber-700 border border-amber-100";
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText size={14} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
              Invoices & Receivables Ledger
            </h3>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Invoicing, payment allocations & receivables tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchInvoices}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportInvoicesCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportInvoicesPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
          {canCreateInvoice && (
            <button
              onClick={openCreateInvoiceModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-black uppercase rounded-lg shadow-sm transition-colors"
            >
              <Plus size={11} /> Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Compact KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Total Invoices
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.totalCount}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Total Invoiced
            </span>
            <span className="text-sm font-black text-emerald-700">
              ${metrics.totalInvoicedValue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Total Collected
            </span>
            <span className="text-sm font-black text-blue-700">
              ${metrics.paidAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Pending Receivables
            </span>
            <span className="text-sm font-black text-amber-700">
              ${metrics.pendingAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Status Filter */}
      <div className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search invoices by ID or customer name..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[9.5px] font-bold text-slate-700 uppercase outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <div className="lg:col-span-2 h-52 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          <div className="h-52 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Invoices List */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between space-y-2.5 min-h-[300px]">
            <div>
              <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider">
                  Issued Invoices ({filteredInvoices.length})
                </h4>
                <span className="text-[9px] font-bold text-slate-400">
                  Click row to inspect
                </span>
              </div>

              {paginatedInvoices.length === 0 ? (
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider text-center py-8">
                  No invoices found.
                </p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {paginatedInvoices.map((i) => {
                    const custName =
                      i.customerId?.companyName || i.customerId?.name || "Customer";
                    return (
                      <div
                        key={i._id}
                        onClick={() => setSelectedInvoice(i)}
                        className={`px-3 py-2 border rounded-xl flex justify-between items-center cursor-pointer transition-colors ${selectedInvoice?._id === i._id
                            ? "border-indigo-500 bg-indigo-50/25"
                            : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50"
                          }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black text-slate-800">
                              {i.invoiceId}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${statusBadgeClass(
                                i.status
                              )}`}
                            >
                              {i.status}
                            </span>
                            <span className="text-[9px] font-black text-indigo-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {custName}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            Total:{" "}
                            <span className="text-slate-900 font-black">
                              ${Number(i.total || 0).toLocaleString()}
                            </span>{" "}
                            • Paid:{" "}
                            <span className="text-indigo-600 font-black">
                              ${Number(i.paidAmount || 0).toLocaleString()}
                            </span>
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredInvoices.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9.5px] font-bold text-slate-500 mt-auto">
                <span>
                  {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of{" "}
                  {filteredInvoices.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9px] font-black uppercase"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9px] font-black uppercase"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Detail Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between min-h-[300px]">
            {selectedInvoice ? (
              <div className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                      {selectedInvoice.invoiceId}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                      Issued:{" "}
                      {new Date(
                        selectedInvoice.issuedAt || selectedInvoice.createdAt
                      ).toLocaleDateString()}
                    </p>
                    {selectedInvoice.quotationId && (
                      <span className="inline-block mt-1 text-[8.5px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase">
                        Quote: {selectedInvoice.quotationId}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md ${statusBadgeClass(
                      selectedInvoice.status
                    )}`}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>

                {/* Billed From / To */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-[9.5px]">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                      Billed From
                    </span>
                    <p className="font-black text-slate-800 truncate">
                      {selectedInvoice.websiteId?.name ||
                        selectedInvoice.billedFrom ||
                        "Business Account"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                      Billed To
                    </span>
                    <p className="font-black text-slate-800 truncate">
                      {selectedInvoice.customerId?.name ||
                        selectedInvoice.customerId?.companyName ||
                        "Customer"}
                    </p>
                    {selectedInvoice.customerId?.email && (
                      <p className="text-slate-400 font-medium truncate">
                        {selectedInvoice.customerId.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-1.5">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
                    Line Items
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-start text-[9.5px] bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                        >
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 truncate">{item.description}</p>
                            {item.sku && (
                              <p className="text-[8px] font-bold text-slate-400 uppercase">
                                SKU: {item.sku}
                              </p>
                            )}
                          </div>
                          <div className="text-right pl-2 shrink-0">
                            <span className="font-bold text-slate-500 mr-1.5">
                              {item.quantity}x
                            </span>
                            <span className="font-black text-indigo-600">${item.total}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[9.5px] text-slate-400 font-bold uppercase">
                        No items listed
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-1 border-t border-slate-100 pt-2 text-[9.5px] font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-slate-900 font-black">
                      ${Number(selectedInvoice.subtotal || selectedInvoice.total || 0).toLocaleString()}
                    </span>
                  </div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Discount:</span>
                      <span className="font-black">-${selectedInvoice.discountAmount}</span>
                    </div>
                  )}
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span className="text-slate-900 font-black">+${selectedInvoice.tax}</span>
                    </div>
                  )}
                  {selectedInvoice.shippingCharges > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span className="text-slate-900 font-black">
                        +${selectedInvoice.shippingCharges}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 text-[11px] font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600">
                      ${Number(selectedInvoice.total || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid:</span>
                    <span className="font-black">
                      ${Number(selectedInvoice.paidAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-black">
                    <span>Due:</span>
                    <span>
                      $
                      {Math.max(
                        0,
                        (Number(selectedInvoice.total) || 0) -
                        (Number(selectedInvoice.paidAmount) || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {selectedInvoice.status !== "paid" &&
                    selectedInvoice.status !== "cancelled" && (
                      <>
                        {canUpdateInvoice && (
                          <button
                            onClick={handleRazorpayCheckout}
                            disabled={paying}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CreditCard size={12} />{" "}
                            {paying ? "Opening Razorpay..." : "Pay with Razorpay"}
                          </button>
                        )}
                        <div className="grid grid-cols-3 gap-1.5">
                          {canUpdateInvoice && (
                            <button
                              onClick={openPaymentModal}
                              className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                            >
                              <DollarSign size={11} /> Log Pay
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWhatsAppInvoice(selectedInvoice)}
                            className="py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                          >
                            <MessageCircle size={11} /> WhatsApp
                          </button>
                          <button
                            onClick={() => handleSendEmailReminder(selectedInvoice)}
                            className="py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                          >
                            <Mail size={11} /> Remind
                          </button>
                        </div>
                      </>
                    )}

                  {selectedInvoice.status === "paid" && canUpdateInvoice && (
                    <button
                      onClick={() => setShowRefundForm(true)}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9.5px] font-black uppercase border border-rose-100 flex items-center justify-center gap-1 transition-colors"
                    >
                      <RefreshCw size={11} /> Issue Refund
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          const result = await api(
                            `/api/crm/invoices/${selectedInvoice._id}/pdf`,
                            { method: "POST" }
                          );
                          window.open(apiUrl(result.pdfUrl), "_blank");
                        } catch (err) {
                          toast.error(err.message || "Failed to generate PDF");
                        }
                      }}
                      className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download size={11} /> PDF Invoice
                    </button>

                    {selectedInvoice.status === "cancelled" ? (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            show: true,
                            title: "Restore Invoice",
                            message: "Restore this cancelled invoice to pending status?",
                            confirmText: "Restore",
                            type: "info",
                            onConfirm: async () => {
                              try {
                                await api(`/api/crm/invoices/${selectedInvoice._id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "pending" })
                                });
                                toast.success("Invoice restored");
                                fetchInvoices();
                              } catch (err) {
                                toast.error(err.message || "Failed to restore invoice");
                              }
                            }
                          })
                        }
                        className="py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                      >
                        <RefreshCw size={11} /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            show: true,
                            title: "Void Invoice",
                            message: "Void/cancel this invoice? Status will be set to cancelled.",
                            confirmText: "Void Invoice",
                            type: "danger",
                            onConfirm: async () => {
                              try {
                                await api(`/api/crm/invoices/${selectedInvoice._id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "cancelled" })
                                });
                                toast.success("Invoice voided");
                                fetchInvoices();
                              } catch (err) {
                                toast.error(err.message || "Failed to cancel invoice");
                              }
                            }
                          })
                        }
                        disabled={selectedInvoice.status === "paid"}
                        className="py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 disabled:opacity-40 text-rose-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                      >
                        <X size={11} /> Void
                      </button>
                    )}
                  </div>
                  {canDeleteInvoice && (
                    <button
                      onClick={() =>
                        setConfirmModal({
                          show: true,
                          title: "Delete Invoice",
                          message: `Permanently delete invoice #${selectedInvoice.invoiceId || selectedInvoice.invoiceNumber}?`,
                          confirmText: "Delete Invoice",
                          type: "danger",
                          onConfirm: async () => {
                            try {
                              await api(`/api/crm/invoices/${selectedInvoice._id}`, { method: "DELETE" });
                              toast.success("Invoice deleted");
                              setSelectedInvoice(null);
                              fetchInvoices();
                            } catch (err) {
                              toast.error(err.message || "Failed to delete invoice");
                            }
                          }
                        })
                      }
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 size={11} /> Delete Invoice
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-8 space-y-1.5">
                <FileText size={24} className="text-slate-200" />
                <p className="text-[9.5px] font-black uppercase tracking-wider">
                  Select an invoice to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Create Invoice Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <form
            onSubmit={handleCreateInvoice}
            className="relative w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Create New Invoice
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Customer *
              </label>
              <select
                required
                value={createInvForm.customerId}
                onChange={(e) => setCreateInvForm({ ...createInvForm, customerId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="">Choose Customer...</option>
                {customersList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Item / Service Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Annual SaaS License & Support"
                value={createInvForm.description}
                onChange={(e) => setCreateInvForm({ ...createInvForm, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Qty *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={createInvForm.quantity}
                  onChange={(e) => setCreateInvForm({ ...createInvForm, quantity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Price ({getCurrencySymbol()}) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={createInvForm.price}
                  onChange={(e) => setCreateInvForm({ ...createInvForm, price: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="date"
                  value={createInvForm.dueDate}
                  onChange={(e) => setCreateInvForm({ ...createInvForm, dueDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional invoice notes..."
                value={createInvForm.notes}
                onChange={(e) => setCreateInvForm({ ...createInvForm, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingInvoice}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {creatingInvoice ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Payment Allocation Modal */}
      {showPaymentModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          />
          <form
            onSubmit={handleAllocatePayment}
            className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Allocate Payment
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Payment Amount ({getCurrencySymbol()})
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })
                }
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Gateway
                </label>
                <select
                  value={paymentForm.gateway}
                  onChange={(e) => setPaymentForm({ ...paymentForm, gateway: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="stripe">Stripe</option>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Reference / Txn ID
              </label>
              <input
                type="text"
                value={paymentForm.referenceNumber}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                }
                placeholder="e.g. TXN-998822"
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Refund Modal */}
      {showRefundForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setShowRefundForm(false)}
          />
          <form
            onSubmit={handleIssueRefund}
            className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Issue Refund
              </h3>
              <button
                type="button"
                onClick={() => setShowRefundForm(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Reason for Refund
              </label>
              <textarea
                required
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold outline-none focus:border-indigo-400 h-20 resize-none"
                placeholder="Describe refund reason..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRefundForm(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase"
              >
                Confirm Refund
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Confirm Modal */}
      {confirmModal.show && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setConfirmModal({ ...confirmModal, show: false })}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${confirmModal.type === "danger"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-indigo-50 text-indigo-600"
                  }`}
              >
                {confirmModal.type === "danger" ? (
                  <AlertTriangle size={15} />
                ) : (
                  <RefreshCw size={15} />
                )}
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  {confirmModal.title}
                </h3>
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  Please confirm action
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal({ ...confirmModal, show: false });
                  if (confirmModal.onConfirm) await confirmModal.onConfirm();
                }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase text-white ${confirmModal.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <WhatsAppShareModal
        isOpen={waModal.open}
        onClose={() => setWaModal((prev) => ({ ...prev, open: false }))}
        title={waModal.title}
        subtitle={waModal.subtitle}
        initialPhone={waModal.phone}
        initialMessage={waModal.message}
        customerId={waModal.customerId}
        websiteId={waModal.websiteId}
      />
    </div>
  );
}
