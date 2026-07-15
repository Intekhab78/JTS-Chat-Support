import React, { useState, useEffect } from "react";
import { FileText, Plus, Check, ChevronRight, DollarSign, Clock, AlertCircle, RefreshCw, Download, X, CreditCard } from "lucide-react";
import { api, API_BASE } from "../../api/client.js";

export default function CrmInvoicesView({ websiteId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0, gateway: "cash", paymentMethod: "cash", referenceNumber: ""
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
      const res = await api(`/api/crm/invoices?websiteId=${websiteId}`);
      setInvoices(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [websiteId]);

  const handleSimulateRazorpayPayment = async () => {
    if (!selectedInvoice) return;
    try {
      const response = await fetch(`${API_BASE}/api/razorpay-webhooks/razorpay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
                notes: {
                  invoiceId: selectedInvoice.invoiceId
                }
              }
            }
          }
        })
      });
      
      if (!response.ok) {
        throw new Error("Simulation failed. Status: " + response.status);
      }
      
      alert(`Simulation Successful! Razorpay payload sent and processed for ${selectedInvoice.invoiceId}.`);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert("Simulation error: " + err.message);
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
        alert("Failed to load Razorpay SDK. Please check your internet connection.");
        return;
      }

      // 1. Create order on backend
      const orderData = await api(`/api/crm/invoices/${selectedInvoice._id}/razorpay-order`, {
        method: "POST"
      });

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize payment order.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "JTS Chat Support",
        description: `Invoice Payment: ${selectedInvoice.invoiceId}`,
        order_id: orderData.orderId,
        prefill: {
          name: selectedInvoice.customerId?.name || "",
          email: selectedInvoice.customerId?.email || "",
          contact: selectedInvoice.customerId?.phone || ""
        },
        theme: {
          color: "#4f46e5"
        },
        handler: async function (response) {
          // 3. Verify on backend
          try {
            await api(`/api/crm/invoices/${selectedInvoice._id}/razorpay-verify`, {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            alert("Payment completed and verified successfully!");
            setSelectedInvoice(null);
            fetchInvoices();
          } catch (err) {
            alert("Verification failed: " + err.message);
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
      alert("Error: " + err.message);
    } finally {
      setPaying(false);
    }
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
      setShowPaymentModal(false);
      setPaymentForm({ amount: 0, gateway: "cash", paymentMethod: "cash", referenceNumber: "" });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleIssueRefund = async (e) => {
    e.preventDefault();
    try {
      // Find a payment associated with this invoice (or mock a refund request)
      const payments = await api(`/api/crm/payments?customerId=${selectedInvoice.customerId?._id || selectedInvoice.customerId}`);
      const matchingPay = payments.find(p => String(p.invoiceId?._id || p.invoiceId) === String(selectedInvoice._id));
      if (!matchingPay) {
        throw new Error("No payments logged for this invoice to issue a refund against.");
      }
      await api(`/api/crm/payments/refund/${matchingPay._id}`, {
        method: "POST",
        body: JSON.stringify(refundForm)
      });
      setShowRefundForm(false);
      setRefundForm({ reason: "" });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Invoices & Receivables Ledger</h3>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Enterprise Finance</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoices List */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Issued Invoices</h4>
            {invoices.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No invoices logged.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map(i => (
                  <div
                    key={i._id}
                    onClick={() => setSelectedInvoice(i)}
                    className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedInvoice?._id === i._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{i.invoiceId}</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          i.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                          i.status === "partially_paid" ? "bg-sky-50 text-sky-700" :
                          i.status === "cancelled" ? "bg-rose-50 text-rose-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>{i.status}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total: ${i.total} • Allocated: <span className="text-indigo-600 font-black">${i.paidAmount || 0}</span></p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details & Payment Allocation Triggers */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
            {selectedInvoice ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Header Action Row */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{selectedInvoice.invoiceId}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Issued: {new Date(selectedInvoice.issuedAt || selectedInvoice.createdAt).toLocaleDateString()}
                    </p>
                    {selectedInvoice.quotationId && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Quote:</span>
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 uppercase">
                          {selectedInvoice.quotationId}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border ${
                    selectedInvoice.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    selectedInvoice.status === "partially_paid" ? "bg-sky-50 text-sky-700 border-sky-100" :
                    selectedInvoice.status === "cancelled" ? "bg-rose-50 text-rose-700 border-rose-100" :
                    "bg-amber-50 text-amber-700 border-amber-100"
                  }`}>
                    {selectedInvoice.status}
                  </span>
                </div>

                {/* Billed To / From Information */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-[10px]">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block animate-pulse">Billed From</span>
                    <p className="font-black text-slate-800">Our Company</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Billed To</span>
                    <p className="font-black text-slate-800">{selectedInvoice.customerId?.name || "Valued Customer"}</p>
                    {selectedInvoice.customerId?.email && <p className="text-slate-400 font-medium">{selectedInvoice.customerId.email}</p>}
                  </div>
                </div>

                {/* Itemized list of invoice items */}
                <div className="space-y-2.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Line Items</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-[10px] bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/50">
                          <div>
                            <p className="font-black text-slate-800">{item.description}</p>
                            {item.sku && <p className="text-[8px] font-black text-slate-400 mt-0.5 uppercase tracking-wider">SKU: {item.sku}</p>}
                          </div>
                          <div className="text-right pl-2">
                            <p className="font-bold text-slate-700">{item.quantity}x</p>
                            <p className="font-black text-indigo-600 mt-0.5">${item.total}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">No items listed</p>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 border-t border-slate-100 pt-4 text-[10px] font-bold text-slate-600">
                  <div className="flex justify-between"><span>Subtotal:</span> <span className="text-slate-900 font-black">${selectedInvoice.subtotal || selectedInvoice.total}</span></div>
                  {selectedInvoice.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-500"><span>Discount:</span> <span className="font-black">-${selectedInvoice.discountAmount}</span></div>
                  )}
                  {selectedInvoice.tax > 0 && (
                    <div className="flex justify-between"><span>Tax (GST/VAT):</span> <span className="text-slate-900 font-black">+${selectedInvoice.tax}</span></div>
                  )}
                  {selectedInvoice.shippingCharges > 0 && (
                    <div className="flex justify-between"><span>Shipping:</span> <span className="text-slate-900 font-black">+${selectedInvoice.shippingCharges}</span></div>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-xs font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600">${selectedInvoice.total}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 mt-1">
                    <span>Paid Amount:</span>
                    <span className="font-black">${selectedInvoice.paidAmount || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100/50 pt-2 text-rose-600 font-black">
                    <span>Outstanding Due:</span>
                    <span>${selectedInvoice.total - (selectedInvoice.paidAmount || 0)}</span>
                  </div>
                </div>

                {/* Action Suite (Allocating Payments, Downloading/Printing, etc.) */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {selectedInvoice.status !== "paid" && selectedInvoice.status !== "cancelled" && (
                    <div className="space-y-2 w-full">
                      <button
                        onClick={handleRazorpayCheckout}
                        disabled={paying}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
                      >
                        <CreditCard size={13} /> {paying ? "Opening Razorpay..." : "Pay with Razorpay"}
                      </button>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                        <DollarSign size={12} /> Record Cash/Offline Payment
                      </button>
                    </div>
                  )}

                  {selectedInvoice.status === "paid" && (
                    <button
                      onClick={() => setShowRefundForm(true)}
                      className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-100 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={12} /> Issue Refund
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const result = await api(`/api/crm/invoices/${selectedInvoice._id}/pdf`, { method: "POST" });
                          const cleanUrl = `${API_BASE}${result.pdfUrl}`;
                          window.open(cleanUrl, "_blank");
                        } catch (err) {
                          alert(err.message || "Failed to generate PDF");
                        }
                      }}
                      className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                    >
                      <Download size={11} /> PDF Invoice
                    </button>

                    {selectedInvoice.status === "cancelled" ? (
                      <button
                        onClick={() => {
                          setConfirmModal({
                            show: true,
                            title: "Restore Invoice",
                            message: "Are you sure you want to reverse cancellation and restore this invoice to pending status?",
                            confirmText: "Restore Invoice",
                            type: "info",
                            onConfirm: async () => {
                              try {
                                await api(`/api/crm/invoices/${selectedInvoice._id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "pending" })
                                });
                                setSelectedInvoice({ ...selectedInvoice, status: "pending" });
                                fetchInvoices();
                              } catch (err) {
                                alert(err.message || "Failed to restore invoice");
                              }
                            }
                          });
                        }}
                        className="py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                      >
                        <RefreshCw size={11} /> Restore Invoice
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmModal({
                            show: true,
                            title: "Void Invoice",
                            message: "Are you sure you want to void/cancel this invoice? This will set its status to cancelled.",
                            confirmText: "Void Invoice",
                            type: "danger",
                            onConfirm: async () => {
                              try {
                                await api(`/api/crm/invoices/${selectedInvoice._id}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ status: "cancelled" })
                                });
                                setSelectedInvoice({ ...selectedInvoice, status: "cancelled" });
                                fetchInvoices();
                              } catch (err) {
                                alert(err.message || "Failed to cancel invoice");
                              }
                            }
                          });
                        }}
                        disabled={selectedInvoice.status === "paid"}
                        className="py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 disabled:opacity-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        <X size={11} /> Void Invoice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-12 space-y-2">
                <FileText size={36} className="text-slate-200" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select an invoice to view ledger details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Allocation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <form onSubmit={handleAllocatePayment} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Close button */}
            <button type="button" onClick={() => setShowPaymentModal(false)} className="absolute right-5 top-5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>

            {/* Title / Description */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <DollarSign size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Allocate Payment</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Reconcile outstanding balance with transaction details</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Amount ($ / €)</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  value={paymentForm.amount} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} 
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  placeholder="Enter amount..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gateway</label>
                  <select 
                    value={paymentForm.gateway} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, gateway: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="stripe">Stripe</option>
                    <option value="razorpay">Razorpay</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
                  <select 
                    value={paymentForm.paymentMethod} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference / Txn ID</label>
                <input 
                  type="text" 
                  value={paymentForm.referenceNumber} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })} 
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  placeholder="e.g. CHQ-99212, TXN-998822"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all">
              Confirm Payment
            </button>
          </form>
        </div>
      )}

      {showRefundForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setShowRefundForm(false)} />
          <form onSubmit={handleIssueRefund} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            {/* Close button */}
            <button type="button" onClick={() => setShowRefundForm(false)} className="absolute right-5 top-5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>

            {/* Title / Description */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <RefreshCw size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Issue Refund / Credit</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Reverse payment lifecycle and issue credit statement</p>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason for refund</label>
              <textarea 
                required 
                value={refundForm.reason} 
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} 
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all h-24 resize-none"
                placeholder="Describe transaction refund context..."
              />
            </div>

            <button type="submit" className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 transition-all">
              Confirm Refund
            </button>
          </form>
        </div>
      )}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setConfirmModal({ ...confirmModal, show: false })} 
          />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6 border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                confirmModal.type === "danger" 
                  ? "bg-rose-50 border border-rose-100 text-rose-600" 
                  : "bg-indigo-50 border border-indigo-100 text-indigo-600"
              }`}>
                {confirmModal.type === "danger" ? <AlertCircle size={18} /> : <RefreshCw size={18} />}
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase">{confirmModal.title}</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Please confirm your action</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal({ ...confirmModal, show: false });
                  if (confirmModal.onConfirm) await confirmModal.onConfirm();
                }}
                className={`flex-1 rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                  confirmModal.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
