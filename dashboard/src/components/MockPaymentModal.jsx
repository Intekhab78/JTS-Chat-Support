import React, { useState } from "react";
import { X, CreditCard, Smartphone, CheckCircle, Loader2 } from "lucide-react";
import { api } from "../api/client.js";

export default function MockPaymentModal({ isOpen, onClose, plan, onStatusUpdate }) {
  const [activeTab, setActiveTab] = useState("card");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleMockPay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api("/api/billing/mock-checkout", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id })
      });

      if (res.status === "success") {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          if (onStatusUpdate) onStatusUpdate();
        }, 2000);
      } else {
        throw new Error(res.message || "Payment failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
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

        {/* Content - Scrollable if needed */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {success ? (
            <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500 min-h-[300px]">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-5">
                <CheckCircle size={36} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment Successful!</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-2 leading-relaxed">Your platform access is now being activated. Redirecting you back to your workspace...</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl mb-6">
                <button
                  onClick={() => setActiveTab("card")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'card' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CreditCard size={12} /> Credit Card
                </button>
                <button
                  onClick={() => setActiveTab("upi")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'upi' ? 'bg-white dark:bg-slate-800 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Smartphone size={12} /> UPI Payment
                </button>
              </div>

              <form onSubmit={handleMockPay} className="space-y-5">
                {activeTab === "card" ? (
                  <div className="space-y-3.5 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                      <input type="text" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3 rounded-xl text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                        <input type="text" placeholder="MM/YY" defaultValue="12/28" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3 rounded-xl text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CVV</label>
                        <input type="password" placeholder="***" defaultValue="123" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3 rounded-xl text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 animate-in slide-in-from-left-4 duration-300">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">UPI ID (VPA)</label>
                      <input type="text" placeholder="example@upi" defaultValue="jts_support@upi" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-3 rounded-xl text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 italic flex items-center gap-2">
                      <Smartphone size={8} /> Click below to simulate a successful UPI transaction.
                    </p>
                  </div>
                )}

                {error && <p className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-100 dark:border-rose-500/20">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "Confirm & Pay Now"}
                </button>

                <div className="pb-2 text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-60 flex items-center justify-center gap-1.5">
                    <CheckCircle size={8} /> Fully Mocked Secure Simulation
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
