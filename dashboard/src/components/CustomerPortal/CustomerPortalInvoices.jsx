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
    } catch (err) {
      toast.error(err.message || "Failed to generate PDF");
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
        toast.error("Failed to load Razorpay Checkout SDK. Please check your network.");
        return;
      }

      // Create order
      const orderData = await api(`/api/crm/customer-portal/invoices/${paymentModal.invoice._id}/razorpay-order`, {
        method: "POST"
      });

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize Razorpay checkout order.");
      }

      // Handle Sandbox Simulation mode orders (for test mode / large amounts)
      if (orderData.orderId.startsWith("order_mock_")) {
        await api(`/api/crm/customer-portal/invoices/${paymentModal.invoice._id}/razorpay-verify`, {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 10)}`,
            razorpay_signature: "mock_signature"
          })
        });
        toast.success("Sandbox payment completed and verified successfully!");
        setPaymentModal({ show: false, invoice: null });
        fetchInvoices();
        setProcessing(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "JTS Client Portal",
        description: `Invoice Settlement: ${paymentModal.invoice.invoiceNumber || paymentModal.invoice._id.slice(-6).toUpperCase()}`,
        order_id: orderData.orderId,
        prefill: {
          name: paymentModal.invoice.customerId?.name || "",
          email: paymentModal.invoice.customerId?.email || "",
          contact: paymentModal.invoice.customerId?.phone || ""
        },
        theme: {
          color: "#059669"
        },
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
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${(invoice.status === "paid" || invoice.paymentStatus === "paid") ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>
                      {(invoice.status === "paid" || invoice.paymentStatus === "paid") ? "PAID" : (invoice.paymentStatus || invoice.status || "PENDING")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice.status !== "paid" && invoice.paymentStatus !== "paid" && invoice.status !== "cancelled" && invoice.status !== "void" && (
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
              ) : `Pay with Razorpay ₹${paymentModal.invoice.totalAmount || paymentModal.invoice.total || 0}`}
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
