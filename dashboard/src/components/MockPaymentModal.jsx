import React, { useState } from "react";
import { X, CheckCircle, Loader2, Tag, Zap, ShieldCheck } from "lucide-react";
import { api } from "../api/client.js";

export default function MockPaymentModal({ isOpen, onClose, plan, billingPeriod, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0); // e.g. 20%

  if (!isOpen) return null;

  const basePriceNum = plan?.monthlyPrice || parseInt(String(plan?.price || "0").replace(/[^0-9]/g, ""), 10) || 49;
  const isAnnual = billingPeriod === "annual";
  const calculatedPrice = isAnnual ? Math.floor(basePriceNum * 0.8) : basePriceNum;
  const finalPrice = appliedDiscount > 0 ? Math.floor(calculatedPrice * (1 - appliedDiscount / 100)) : calculatedPrice;

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    const code = promoCode.trim().toUpperCase();
    if (code.includes("20") || code === "EARLY_BIRD_2026" || code === "SPECIAL20") {
      setAppliedDiscount(20);
      setError("");
    } else if (code.includes("50") || code === "HALF_PRICE") {
      setAppliedDiscount(50);
      setError("");
    } else {
      setAppliedDiscount(10); // Default 10% discount for any valid promo input
      setError("");
    }
  };

  const handleExpressMockCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/api/billing/mock-checkout", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id || "pro" })
      });
      if (res.status === "success" || res.subscription) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onStatusUpdate) onStatusUpdate();
        }, 1500);
      } else {
        throw new Error(res.message || "Checkout failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const handleRazorpayPay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
      }

      const orderData = await api("/api/billing/razorpay-order", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id })
      });

      if (!orderData || !orderData.orderId) {
        throw new Error("Failed to initialize billing order.");
      }

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[36px] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden relative flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-black/20">
          <div>
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Self-Serve Checkout</span>
            <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Complete Plan Upgrade</h2>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6">
          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-5">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Subscription Active!</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed max-w-xs">Your plan features, agent seats, and website slots have been activated. Refreshing workspace...</p>
            </div>
          ) : (
            <>
              {/* Plan Summary */}
              <div className="bg-slate-50 dark:bg-black/20 rounded-[28px] p-5 border border-slate-100 dark:border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px]">Selected Package</span>
                  <span className="text-slate-900 dark:text-white font-black">{plan.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px]">Billing Interval</span>
                  <span className="text-slate-900 dark:text-white font-black">{isAnnual ? "Annual Billing (-20%)" : "Monthly Billing"}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="uppercase tracking-wider text-[9px]">Promo Discount</span>
                    <span className="font-black">-{appliedDiscount}% OFF</span>
                  </div>
                )}
                <div className="border-t border-slate-200/60 dark:border-white/10 pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">Total Payable</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{plan.currencySymbol || "$"}{finalPrice}<span className="text-xs font-bold text-slate-400">/mo</span></span>
                </div>
              </div>

              {/* Promo Code Box */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Tag size={12} className="text-emerald-500" /> Have a Promo Discount Code?
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g. SPECIAL20 or EARLY_BIRD"
                    className="flex-1 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider outline-none text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-500/20">{error}</p>
              )}

              {/* Payment Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleRazorpayPay}
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Pay via Secure Razorpay / Card"}
                </button>

                <button
                  type="button"
                  onClick={handleExpressMockCheckout}
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-950 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={14} className="text-amber-400" />
                  Instant Express Activation (1-Click)
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <ShieldCheck size={10} className="text-emerald-500" /> 256-bit Encrypted SSL Instant Provisioning
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
