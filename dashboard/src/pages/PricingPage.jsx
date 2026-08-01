import { Check, Zap, Shield, Crown, Sparkles, Tag, ArrowRight } from "lucide-react";
import { api } from "../api/client.js";
import { useState, useEffect } from "react";
import MockPaymentModal from "../components/MockPaymentModal";

export default function PricingPage({ currentPlan, isExpired, billingPeriod = "monthly" }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchPlans = async () => {
    try {
      const data = await api("/api/subscription-plans");
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
      } else {
        setPlans([
          {
            id: "basic",
            code: "basic",
            name: "Starter Basic Tier",
            monthlyPrice: 49,
            annualPrice: 490,
            currencySymbol: "$",
            description: "Essential live chat, help center, and basic lead capture.",
            limits: { agents: 2, websites: 1 },
            includedModules: ["crm", "service"],
            isPopular: false
          },
          {
            id: "standard",
            code: "standard",
            name: "Business Standard Tier",
            monthlyPrice: 149,
            annualPrice: 1490,
            currencySymbol: "$",
            description: "Complete sales operations, invoicing, and helpdesk SLA ticketing.",
            limits: { agents: 5, websites: 3 },
            includedModules: ["crm", "operations", "finance", "service"],
            isPopular: false
          },
          {
            id: "pro",
            code: "pro",
            name: "Pro Enterprise Tier",
            monthlyPrice: 349,
            annualPrice: 3490,
            currencySymbol: "$",
            description: "Full suite with UAE VAT Compliance, Corporate Tax, AI Workflows & BI.",
            limits: { agents: 10, websites: 10 },
            includedModules: ["crm", "operations", "finance", "compliance", "service", "automation"],
            isPopular: true
          },
          {
            id: "enterprise",
            code: "enterprise",
            name: "Custom Enterprise Unlimited",
            monthlyPrice: 799,
            annualPrice: 7990,
            currencySymbol: "$",
            description: "Dedicated infrastructure, security audit trail & custom SLAs.",
            limits: { agents: 50, websites: 25 },
            includedModules: ["crm", "operations", "finance", "compliance", "service", "automation"],
            isPopular: false
          }
        ]);
      }
    } catch {
      // Fallback default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleUpgrade = (plan) => {
    setSelectedPlan({
      id: plan.code || plan.id,
      name: plan.name,
      price: `${plan.currencySymbol || "$"}${billingPeriod === "annual" ? Math.floor(plan.monthlyPrice * 0.8) : plan.monthlyPrice}`,
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      currencySymbol: plan.currencySymbol || "$"
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-8 py-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">SaaS Subscription Engine</span>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Select Your Growth Plan Package</h2>
        <p className="text-xs font-bold text-slate-500">Deploy custom domain support networks, unlock UAE VAT Compliance, and scale agent seats instantly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const planCode = plan.code || plan.id;
          const isCurrentActive = currentPlan === planCode && !isExpired;
          const isCurrentExpired = currentPlan === planCode && isExpired;
          const monthlyDisplayPrice = billingPeriod === "annual" ? Math.floor((plan.monthlyPrice || 49) * 0.8) : (plan.monthlyPrice || 49);

          return (
            <div 
              key={planCode}
              className={`premium-card relative p-8 flex flex-col bg-white dark:bg-slate-900 border-2 transition-all hover:scale-[1.02] ${
                plan.isPopular ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10' : 'border-slate-100 dark:border-white/5'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                  <Sparkles size={10} /> Most Popular
                </div>
              )}

              <div className="space-y-4 mb-6">
                <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-lg">
                  {planCode}
                </span>

                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-2">{plan.description}</p>
                </div>

                <div>
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {plan.currencySymbol || "$"}{monthlyDisplayPrice}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">/ mo</span>
                  {billingPeriod === "annual" && (
                    <span className="ml-2 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">-20%</span>
                  )}
                </div>
              </div>

              <div className="space-y-3 flex-1 mb-8 pt-4 border-t border-slate-100 dark:border-white/5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{plan.limits?.agents || 2} Agent Seats Included</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>{plan.limits?.websites || 1} Domain Slots Included</span>
                </div>
                {(plan.includedModules || []).map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <Check size={14} className="text-indigo-500 shrink-0" />
                    <span className="uppercase text-[10px] font-black text-slate-600 dark:text-slate-400">
                      {m === 'compliance' ? 'UAE VAT & Tax Suite 🇦🇪' : m === 'automation' ? 'AI Workflows & BI' : m}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan)}
                disabled={isCurrentActive}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  isCurrentActive 
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-default border border-slate-200 dark:border-white/5'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/10 active:scale-95'
                }`}
              >
                {isCurrentActive ? "Active Plan" : isCurrentExpired ? "Renew Plan Now" : "Subscribe / Upgrade"}
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <MockPaymentModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          plan={selectedPlan}
          billingPeriod={billingPeriod}
          onStatusUpdate={() => window.location.reload()}
        />
      )}
    </div>
  );
}
