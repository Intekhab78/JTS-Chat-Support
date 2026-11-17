import React, { useState, useEffect } from "react";
import {
  Receipt, Download, CreditCard, X, ShieldCheck, Eye, Printer, FileText,
  CheckCircle2, Clock, Wallet
} from "lucide-react";
import { api, apiUrl } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import { printPortalDocument, formatPortalMoney } from "./portalPrintUtils.js";

const formatAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  return [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(", ");
};

export default function CustomerPortalInvoices({ onPaymentSuccess, currency, currencySettings = null, workspaceName = "Client Portal", customer = null }) {
  const toast = useToast();
  const { formatCurrency: ctxFormatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModal, setPaymentModal] = useState({ show: false, invoice: null });
  const [processing, setProcessing] = useState(false);

  const formatMoney = (amount, overrideCurrency) => {
    if (currencySettings || currency || overrideCurrency) {
      return formatPortalMoney(amount, overrideCurrency || currency, currencySettings);
    }
    return ctxFormatCurrency(Number(amount || 0));
  };

  const fetchInvoices = async () => {
    try {
      const res = await api("/api/crm/customer-portal/invoices");
      setInvoices(Array.isArray(res) ? res : (res?.invoices || res?.data || []));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (paymentModal.show && !processing) {
          setPaymentModal({ show: false, invoice: null });
        } else if (selectedInvoice) {
          setSelectedInvoice(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paymentModal.show, processing, selectedInvoice]);

  const isPaidInvoice = (inv) => inv?.status === "paid" || inv?.paymentStatus === "paid";
  const isPayableInvoice = (inv) =>
    inv && !isPaidInvoice(inv) && inv.status !== "cancelled" && inv.status !== "void";

  const handleDownloadPdf = async (invoiceId) => {
    try {
      const result = await api(`/api/crm/customer-portal/invoices/${invoiceId}/pdf`, { method: "POST" });
      const cleanUrl = apiUrl(result.pdfUrl);

      const response = await fetch(cleanUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", result.pdfUrl.split("/").pop() || `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Invoice PDF downloaded");
    } catch (err) {
      toast.error(err.message || "Failed to generate PDF");
    }
  };

  const handlePrintInvoice = (inv) => {
    if (!inv) return;
    const invNum = inv.invoiceNumber || inv.invoiceId || inv._id.slice(-6).toUpperCase();
    const paid = isPaidInvoice(inv);
    const total = Number(inv.totalAmount ?? inv.total ?? 0);
    const paidAmt = paid && !inv.paidAmount ? total : Number(inv.paidAmount || 0);
    const custInfo = {
      name: inv.customerId?.name || customer?.name || "Customer",
      email: inv.customerId?.email || customer?.email || "",
      phone: inv.customerId?.phone || "",
      crn: customer?.crn || ""
    };

    const opened = printPortalDocument({
      docType: "INVOICE",
      docNumber: invNum,
      status: paid ? "PAID" : inv.paymentStatus || inv.status || "PENDING",
      workspaceName,
      issuedDate: inv.issuedAt || inv.issuedDate || inv.createdAt,
      dueDate: inv.dueDate,
      dueDateLabel: "Due Date",
      referenceLabel: inv.quotationId ? "Quotation Ref" : "",
      referenceValue: inv.quotationId || "",
      customer: custInfo,
      billingAddress: inv.billingAddress,
      shippingAddress: inv.shippingAddress,
      items: inv.items || inv.lineItems || [],
      subtotal: inv.subtotal,
      discount: inv.discountAmount || 0,
      tax: inv.tax || 0,
      shipping: inv.shippingCharges || 0,
      total,
      paidAmount: paidAmt,
      notes: inv.notes || "",
      formatMoney: (v) => formatMoney(v, inv.currency || currency)
    });

    if (!opened) {
      toast.error("Please allow pop-ups to print this invoice");
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

  const handleProcessPayment = async () => {
    if (!paymentModal.invoice) return;
    setProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment SDK. Please check your network.");
        setProcessing(false);
        return;
      }

      const orderData = await api(`/api/crm/customer-portal/invoices/${paymentModal.invoice._id}/razorpay-order`, {
        method: "POST"
      });

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize checkout order.");
      }

      if (orderData.orderId.startsWith("order_mock_")) {
        await api(`/api/crm/customer-portal/invoices/${paymentModal.invoice._id}/razorpay-verify`, {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
            razorpay_signature: "mock_signature"
          })
        });
        toast.success("Payment completed and verified successfully!");
        setPaymentModal({ show: false, invoice: null });
        fetchInvoices();
        onPaymentSuccess?.();
        setProcessing(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || currency || "INR",
        name: workspaceName || "Client Portal",
        description: `Invoice #${paymentModal.invoice.invoiceNumber || paymentModal.invoice._id.slice(-6).toUpperCase()}`,
        order_id: orderData.orderId,
        prefill: {
          name: paymentModal.invoice.customerId?.name || customer?.name || "",
          email: paymentModal.invoice.customerId?.email || customer?.email || "",
          contact: paymentModal.invoice.customerId?.phone || ""
        },
        theme: { color: "#059669" },
        handler: async function (response) {
          setProcessing(true);
          try {
            await api(`/api/crm/customer-portal/invoices/${paymentModal.invoice._id}/razorpay-verify`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            toast.success("Payment completed and verified successfully!");
            setPaymentModal({ show: false, invoice: null });
            fetchInvoices();
            onPaymentSuccess?.();
          } catch (err) {
            toast.error("Verification failed: " + err.message);
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Payment process error");
      setProcessing(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "paid") return isPaidInvoice(inv);
    if (filter === "unpaid") return isPayableInvoice(inv);
    return true;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount ?? inv.total ?? 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => {
    const amt = Number(inv.totalAmount ?? inv.total ?? 0);
    if (isPaidInvoice(inv)) return sum + (Number(inv.paidAmount || 0) || amt);
    return sum + Number(inv.paidAmount || 0);
  }, 0);
  const outstandingDue = Math.max(0, totalBilled - totalPaid);
  const unpaidCount = invoices.filter(isPayableInvoice).length;

  const statCards = [
    { label: "Total Invoices", value: invoices.length, icon: Receipt, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total Billed", value: formatMoney(totalBilled), icon: Wallet, color: "text-slate-700 bg-slate-100" },
    { label: "Total Paid", value: formatMoney(totalPaid), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Outstanding Due", value: formatMoney(outstandingDue), sub: unpaidCount > 0 ? `${unpaidCount} unpaid` : "All settled", icon: Clock, color: unpaidCount > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50" }
  ];

  if (loading) {
    return <p className="text-center py-10 text-slate-400 text-xs font-semibold">Loading invoices...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Mini Summary Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5 truncate">{card.value}</p>
                {card.sub && <p className="text-[10px] text-slate-500 mt-0.5">{card.sub}</p>}
              </div>
              <div className={`p-2 rounded-xl shrink-0 ${card.color}`}>
                <Icon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Billing History</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Inspect itemized breakdowns, print statements, or download PDFs</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {[
              { id: "all", label: `All (${invoices.length})` },
              { id: "unpaid", label: `Unpaid (${unpaidCount})` },
              { id: "paid", label: `Paid (${invoices.filter(isPaidInvoice).length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  filter === tab.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-1">
            <FileText size={22} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold">No invoices found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInvoices.map((invoice) => {
              const paid = isPaidInvoice(invoice);
              const payable = isPayableInvoice(invoice);
              const itemCount = (invoice.items || invoice.lineItems || []).length;
              return (
                <div
                  key={invoice._id}
                  className="py-2.5 first:pt-1 last:pb-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${paid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      <Receipt size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-slate-900 truncate">
                          Invoice #{invoice.invoiceNumber || invoice.invoiceId || invoice._id.slice(-6).toUpperCase()}
                        </h5>
                        {itemCount > 0 && (
                          <span className="text-[10px] text-slate-400 font-medium">• {itemCount} {itemCount === 1 ? "item" : "items"}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Issued: {new Date(invoice.issuedAt || invoice.issuedDate || invoice.createdAt).toLocaleDateString()} • Due:{" "}
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Upon Receipt"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-xs font-bold text-slate-900">
                        {formatMoney(invoice.totalAmount ?? invoice.total ?? 0, invoice.currency)}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          paid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                            : "bg-rose-50 text-rose-700 border border-rose-200/70"
                        }`}
                      >
                        {paid ? "PAID" : invoice.paymentStatus || invoice.status || "PENDING"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {payable && (
                        <button
                          type="button"
                          onClick={() => setPaymentModal({ show: true, invoice })}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CreditCard size={12} /> Pay
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(invoice)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        title="View Full Invoice Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(invoice)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        title="Print Invoice"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(invoice._id)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-Detail View Invoice Modal */}
      {selectedInvoice && (() => {
        const inv = selectedInvoice;
        const paid = isPaidInvoice(inv);
        const total = Number(inv.totalAmount ?? inv.total ?? 0);
        const paidAmt = paid && !inv.paidAmount ? total : Number(inv.paidAmount || 0);
        const balance = Math.max(0, total - paidAmt);
        const items = inv.items || inv.lineItems || [];
        const billingAddr = formatAddress(inv.billingAddress);
        const shippingAddr = formatAddress(inv.shippingAddress);
        const invCurrency = inv.currency || currency;

        return (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedInvoice(null)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Invoice #{inv.invoiceNumber || inv.invoiceId || inv._id.slice(-6).toUpperCase()}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        paid
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {paid ? "PAID" : inv.paymentStatus || inv.status || "PENDING"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {workspaceName} • Issued {new Date(inv.issuedAt || inv.issuedDate || inv.createdAt).toLocaleDateString()} • Due{" "}
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "Upon Receipt"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {/* Billed To & Invoice Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billed To</span>
                    <p className="font-bold text-slate-900">{inv.customerId?.name || customer?.name || "Customer"}</p>
                    {(inv.customerId?.email || customer?.email) && (
                      <p className="text-[11px] text-slate-600">{inv.customerId?.email || customer?.email}</p>
                    )}
                    {inv.customerId?.phone && <p className="text-[11px] text-slate-600">{inv.customerId.phone}</p>}
                    {customer?.crn && <p className="text-[11px] text-slate-500">CRN: {customer.crn}</p>}
                    {billingAddr && <p className="text-[11px] text-slate-500">Billing: {billingAddr}</p>}
                    {shippingAddr && <p className="text-[11px] text-slate-500">Shipping: {shippingAddr}</p>}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment &amp; Reference</span>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Invoice Ref</span>
                      <span className="font-semibold text-slate-800">{inv.invoiceId || inv.invoiceNumber || "—"}</span>
                    </div>
                    {inv.quotationId && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Quotation Ref</span>
                        <span className="font-semibold text-slate-800">{inv.quotationId}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Currency</span>
                      <span className="font-semibold text-slate-800">{invCurrency || "USD"}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Amount Paid</span>
                      <span className="font-semibold text-emerald-700">{formatMoney(paidAmt, invCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Balance Due</span>
                      <span className={`font-bold ${balance > 0 ? "text-rose-600" : "text-slate-800"}`}>
                        {formatMoney(paid ? 0 : balance, invCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Tax</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-3 py-4 text-center text-[11px] text-slate-400">
                            No itemized lines attached.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-800">{item.description || item.name || item.title || "Item"}</div>
                              {item.sku && <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">{item.quantity || 1}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{formatMoney(item.price ?? item.unitPrice ?? 0, invCurrency)}</td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {item.taxAmount ? formatMoney(item.taxAmount, invCurrency) : item.taxRate ? `${item.taxRate}%` : "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                              {formatMoney(item.total ?? (item.quantity || 1) * (item.price ?? item.unitPrice ?? 0), invCurrency)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Notes */}
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  {inv.notes ? (
                    <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Notes</span>
                      {inv.notes}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <div className="sm:w-64 bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">{formatMoney(inv.subtotal ?? total, invCurrency)}</span>
                    </div>
                    {Number(inv.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Discount</span>
                        <span className="font-semibold text-emerald-700">-{formatMoney(inv.discountAmount, invCurrency)}</span>
                      </div>
                    )}
                    {Number(inv.tax || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax</span>
                        <span className="font-semibold text-slate-800">{formatMoney(inv.tax, invCurrency)}</span>
                      </div>
                    )}
                    {Number(inv.shippingCharges || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping</span>
                        <span className="font-semibold text-slate-800">{formatMoney(inv.shippingCharges, invCurrency)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                      <span>Grand Total</span>
                      <span>{formatMoney(total, invCurrency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(inv)}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer size={13} /> Print Statement
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(inv._id)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download size={13} /> Download PDF
                </button>
                {isPayableInvoice(inv) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setPaymentModal({ show: true, invoice: inv });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CreditCard size={13} /> Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Online Payment Checkout Modal */}
      {paymentModal.show && paymentModal.invoice && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => !processing && setPaymentModal({ show: false, invoice: null })}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-5 border border-slate-200 shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={processing}
              onClick={() => setPaymentModal({ show: false, invoice: null })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-1">
                <CreditCard size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Invoice Payment</h3>
              <p className="text-[11px] text-slate-500">Complete your invoice settlement securely</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Invoice Number</span>
                <span className="font-semibold text-slate-900">
                  #{paymentModal.invoice.invoiceNumber || paymentModal.invoice._id.slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Due Date</span>
                <span className="font-semibold text-slate-900">
                  {paymentModal.invoice.dueDate ? new Date(paymentModal.invoice.dueDate).toLocaleDateString() : "Upon Receipt"}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                <span className="font-bold text-slate-900">Total Payable</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatMoney(paymentModal.invoice.totalAmount ?? paymentModal.invoice.total ?? 0, paymentModal.invoice.currency)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProcessPayment}
              disabled={processing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {processing
                ? "Processing..."
                : `Pay ${formatMoney(paymentModal.invoice.totalAmount ?? paymentModal.invoice.total ?? 0, paymentModal.invoice.currency)}`}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400">
              <ShieldCheck size={12} className="text-emerald-500" /> Encrypted Online Checkout
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
