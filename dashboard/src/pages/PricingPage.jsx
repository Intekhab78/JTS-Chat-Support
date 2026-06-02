import { Check, Zap, Shield, Crown } from "lucide-react";
import { api } from "../api/client.js";
import { useState } from "react";
import MockPaymentModal from "../components/MockPaymentModal";

const plans = [
  {
    id: "basic",
    name: "Basic Chat",
    price: "$29",
    description: "Essential live chat for growing websites.",
    features: ["2 Agents", "1 Website", "Basic Shortcuts", "Standard Security"],
    color: "sky",
    icon: <Zap size={24} />
  },
  {
    id: "standard",
    name: "Standard Support",
    price: "$79",
    description: "Advanced ticketing and reporting for teams.",
    features: ["5 Agents", "2 Websites", "Ticket Workspace", "Department Routing", "Enhanced Reports"],
    color: "amber",
    icon: <Shield size={24} />,
    popular: true
  },
  {
    id: "pro",
    name: "Enterprise Pro",
    price: "$199",
    description: "Full CRM and sales intelligence suite.",
    features: ["20 Agents", "10 Websites", "Full CRM Suite", "Lead Pipeline", "Advanced Analytics", "Audit Logs"],
    color: "indigo",
    icon: <Crown size={24} />
  }
];

export default function PricingPage({ currentPlan, isExpired, billingPeriod = "monthly" }) {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const getPrice = (plan) => {
    const base = parseInt(plan.price.replace("$", ""), 10);
    return billingPeriod === "annual" ? `$${Math.floor(base * 0.8)}` : plan.price;
  };

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
      {plans.map((plan) => {
        const isCurrentActive = currentPlan === plan.id && !isExpired;
        const isCurrentExpired = currentPlan === plan.id && isExpired;

        return (
          <div 
            key={plan.id}
            className={`premium-card relative p-10 flex flex-col bg-white dark:bg-slate-900 border-2 transition-all hover:scale-[1.02] ${
              plan.popular ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10' : 'border-slate-100 dark:border-white/5'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                Most Popular
              </div>
            )}

            <div className="flex items-center gap-4 mb-8">
              <div className={`p-4 rounded-2xl bg-${plan.color}-50 dark:bg-${plan.color}-500/10 text-${plan.color}-500`}>
                {plan.icon}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{plan.name}</h4>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {getPrice(plan)}
                  <span className="text-xs text-slate-400 font-bold ml-1">/mo</span>
                  {billingPeriod === "annual" && (
                    <span className="ml-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">-20%</span>
                  )}
                </p>
              </div>
            </div>

            <p className="text-[11px] font-bold text-slate-400 leading-relaxed mb-8">{plan.description}</p>

            <div className="space-y-4 flex-1 mb-10">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <Check size={14} className="text-indigo-500 flex-shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUpgrade(plan)}
              disabled={isCurrentActive || loadingPlan}
              className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                isCurrentActive 
                  ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100/10'
              }`}
            >
              {loadingPlan === plan.id ? "Connecting..." : isCurrentActive ? "Current Plan" : isCurrentExpired ? "Buy/Renew Now" : "Upgrade Now"}
            </button>
          </div>
        );
      })}

      {selectedPlan && (
        <MockPaymentModal 
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          plan={selectedPlan}
          onStatusUpdate={() => window.location.reload()}
        />
      )}
    </div>
  );
}
