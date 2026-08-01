import { SubscriptionPlan } from "../models/SubscriptionPlan.js";

export const PLAN_DEFINITIONS = {
  basic: {
    plan: "basic",
    enabledModules: ["chat", "shortcuts", "security"],
    limits: { agents: 2, websites: 1 }
  },
  standard: {
    plan: "standard",
    enabledModules: ["chat", "tickets", "shortcuts", "reports", "security"],
    limits: { agents: 5, websites: 3 }
  },
  pro: {
    plan: "pro",
    enabledModules: ["chat", "tickets", "crm", "shortcuts", "reports", "security"],
    limits: { agents: 10, websites: 10 }
  },
  enterprise: {
    plan: "enterprise",
    enabledModules: ["chat", "tickets", "crm", "shortcuts", "reports", "security", "vat", "tax", "audit"],
    limits: { agents: 50, websites: 25 }
  }
};

export function normalizePlan(plan = "pro") {
  return String(plan || "pro").toLowerCase().trim();
}

export function buildSubscription(plan = "pro", overrides = {}) {
  const code = normalizePlan(plan);
  const fallback = PLAN_DEFINITIONS[code] || PLAN_DEFINITIONS.pro;

  return {
    plan: code,
    status: overrides.status || "active",
    offerCode: overrides.offerCode || "",
    discountPercentage: overrides.discountPercentage || 0,
    enabledModules: overrides.enabledModules || [...fallback.enabledModules],
    limits: {
      agents: overrides.limits?.agents ?? fallback.limits.agents,
      websites: overrides.limits?.websites ?? fallback.limits.websites
    },
    expiresAt: overrides.expiresAt || null
  };
}

export async function buildSubscriptionAsync(plan = "pro", overrides = {}) {
  const code = normalizePlan(plan);
  let planDoc = null;
  try {
    planDoc = await SubscriptionPlan.findOne({ code });
  } catch (e) {
    // fallback if DB error
  }

  const fallback = PLAN_DEFINITIONS[code] || PLAN_DEFINITIONS.pro;
  const enabledModules = overrides.enabledModules || (planDoc?.includedModules?.length ? planDoc.includedModules : fallback.enabledModules);
  const agents = overrides.limits?.agents ?? (planDoc?.limits?.agents ?? fallback.limits.agents);
  const websites = overrides.limits?.websites ?? (planDoc?.limits?.websites ?? fallback.limits.websites);

  return {
    plan: code,
    status: overrides.status || "active",
    offerCode: overrides.offerCode || "",
    discountPercentage: overrides.discountPercentage || 0,
    enabledModules: [...new Set(enabledModules)],
    limits: { agents, websites },
    expiresAt: overrides.expiresAt || null
  };
}

export function resolveSubscriptionForUser(user) {
  if (user?.role === "admin") {
    return {
      ...buildSubscription("enterprise"),
      expiresAt: null
    };
  }

  const subscription = user?.subscription || {};
  const plan = normalizePlan(subscription.plan || "pro");
  const fallback = PLAN_DEFINITIONS[plan] || PLAN_DEFINITIONS.pro;

  let status = subscription.status || "active";
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    status = "expired";
  }

  return {
    plan,
    status,
    offerCode: subscription.offerCode || "",
    discountPercentage: subscription.discountPercentage || 0,
    enabledModules: Array.isArray(subscription.enabledModules) && subscription.enabledModules.length
      ? subscription.enabledModules
      : [...fallback.enabledModules],
    limits: {
      agents: subscription.limits?.agents ?? fallback.limits.agents,
      websites: subscription.limits?.websites ?? fallback.limits.websites
    },
    expiresAt: subscription.expiresAt || null
  };
}

export function hasModuleAccess(subscription, moduleName) {
  if (!subscription) return false;
  let status = subscription.status || "active";
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    status = "expired";
  }
  if (status === "expired" || status === "suspended") return false;
  if (!Array.isArray(subscription.enabledModules)) return true;
  return subscription.enabledModules.includes(moduleName);
}
