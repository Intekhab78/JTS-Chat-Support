import React, { useState, useEffect } from "react";
import { Receipt, Download, AlertTriangle, CheckCircle2, CreditCard, X, ShieldCheck } from "lucide-react";
import { api, API_BASE } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalInvoices() {
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState({ show: false, invoice: null });
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [processing, setProcessing] = useState(false);

  const fetchInvoices = async () => {
    try {
      const res = await api("/api/crm/customer-portal/invoices");
      setInvoices(res || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownloadPdf = async (invoiceId) => {
    try {
      const result = await api(`/api/crm/invoices/${invoiceId}/pdf`, { method: "POST" });
      const cleanUrl = `${API_BASE}${result.pdfUrl}`;
      window.open(cleanUrl, "_blank");
    } catch (err) {
      toast.error(err.message || "Failed to generate PDF");
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentModal.invoice) return;
    setProcessing(true);
    try {
      await api(`/api/crm/customer-portal/invoices/${paymentModal.invoice._id}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod })
      });
      toast.success("Payment processed successfully! Invoice is now fully settled.");
      setPaymentModal({ show: false, invoice: null });
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Loading invoices...</p>;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3 border-slate-200">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Invoices & Payments</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">View your billing history, payments, and outstanding balances</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm">
        {invoices.length === 0 ? (
          <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No invoices logged.</p>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div key={invoice._id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50/50 transition-colors gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800">Invoice #{invoice.invoiceNumber || invoice._id.slice(-6).toUpperCase()}</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                      Issued: {new Date(invoice.issuedDate || invoice.createdAt).toLocaleDateString()} • Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-800">₹{invoice.totalAmount || invoice.total || 0}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${invoice.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{invoice.paymentStatus}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice.paymentStatus !== "paid" && invoice.status !== "cancelled" && invoice.status !== "void" && (
                      <button
                        onClick={() => setPaymentModal({ show: true, invoice })}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <CreditCard size={11} /> Pay Online
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadPdf(invoice._id)}
                      className="p-2 border hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Online Payment Checkout Simulator Modal */}
      {paymentModal.show && paymentModal.invoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md p-8 border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPaymentModal({ show: false, invoice: null })}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <CreditCard size={24} />
              </div>
              <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">Portal Card Checkout</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulate Sandbox Billing Payment</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Invoice Number</span>
                <span className="text-slate-800">#{paymentModal.invoice.invoiceNumber || paymentModal.invoice._id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Due Date</span>
                <span className="text-slate-800">{new Date(paymentModal.invoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="border-t border-slate-200/60 pt-3 flex justify-between items-baseline">
                <span className="text-xs font-black text-slate-950 uppercase tracking-wider">Total Payable</span>
                <span className="text-xl font-black text-emerald-600">₹{paymentModal.invoice.totalAmount || paymentModal.invoice.total || 0}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "credit_card", label: "Credit / Debit Card" },
                  { id: "upi", label: "UPI / QR Pay" },
                  { id: "net_banking", label: "Net Banking" },
                  { id: "paypal_mock", label: "Sandbox PayPal" }
                ].map((method) => (
                  <label 
                    key={method.id}
                    className={`flex items-center gap-2.5 p-3.5 border rounded-2xl cursor-pointer select-none transition-all ${
                      paymentMethod === method.id 
                        ? "border-emerald-500 bg-emerald-50/30 text-emerald-700 font-extrabold" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="payment_method" 
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="hidden" 
                    />
                    <span className="text-[10px] uppercase tracking-wide">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleProcessPayment}
              disabled={processing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {processing ? (
                <span className="flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </span>
              ) : `Confirm & Pay ₹${paymentModal.invoice.totalAmount || paymentModal.invoice.total || 0}`}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-emerald-500" /> Secure 256-bit Portal SSL Reconciled
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
