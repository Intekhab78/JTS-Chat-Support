import React, { useState } from "react";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../api/client.js";

export default function MockPaymentModal({ isOpen, onClose, plan, billingPeriod, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

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

  const handleRazorpayPay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
      }

      // 1. Create order on backend
      const orderData = await api("/api/billing/razorpay-order", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id })
      });

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize billing order.");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "JTS Workspace Billing",
        description: `Subscription: ${plan.name}`,
        order_id: orderData.orderId,
        theme: {
          color: "#4f46e5"
        },
        handler: async function (response) {
          setLoading(true);
          try {
            const res = await api("/api/billing/razorpay-verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: plan.id,
                billingPeriod
              })
            });

            if (res.status === "success" || res.subscription) {
              setSuccess(true);
              setTimeout(() => {
                onClose();
                if (onStatusUpdate) onStatusUpdate();
              }, 2000);
            } else {
              throw new Error(res.message || "Payment verification failed");
            }
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-white/10 overflow-hidden relative flex flex-col max-h-[90vh]">

        {/* Header - Fixed */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Complete Payment</h2>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Plan: <span className="text-indigo-500">{plan.name}</span> • {plan.price}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {success ? (
            <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 min-h-[300px]">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-5">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment Successful!</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">Your platform access is now active. Redirecting to workspace...</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Selected Subscription</span>
                  <span className="text-slate-800 dark:text-slate-200">{plan.name}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Pricing Period</span>
                  <span className="text-slate-800 dark:text-slate-200">Monthly Billing</span>
                </div>
                <div className="border-t border-slate-200/60 pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">Total Amount</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{plan.price}</span>
                </div>
              </div>

              {error && <p className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-100 dark:border-rose-500/20">{error}</p>}

              <button
                onClick={handleRazorpayPay}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : "Pay with Razorpay"}
              </button>

              <div className="pb-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-60 flex items-center justify-center gap-1.5">
                  <CheckCircle size={8} className="text-indigo-500" /> Secure SSL Razorpay Sandbox Gateway
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
