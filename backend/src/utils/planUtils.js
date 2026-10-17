import { SubscriptionPlan } from "../models/SubscriptionPlan.js";

export const MODULE_CATEGORIES = {
  service: [
    "chat", "tickets", "shortcuts", "canned_responses", "departments",
    "categories", "help-center", "service", "history"
  ],
  crm: [
    "crm", "leads", "deals", "customer-master", "inventory-customer",
    "contacts", "crm_pipeline", "crm_deals", "sales"
  ],
  operations: [
    "inventory", "inventory-master", "inventory-stock-in", "inventory-stock-out",
    "inventory-adjustment", "inventory-history", "inventory-category",
    "inventory-subcategory", "inventory-brand", "inventory-size",
    "inventory-color", "inventory-unit", "inventory-supplier",
    "procurement", "purchase", "operations"
  ],
  finance: [
    "billing", "invoices", "quotations", "payments", "ledger",
    "sales-orders", "subscriptions", "finance"
  ],
  compliance: [
    "vat", "vat-compliance", "corporate-tax", "trade-license",
    "compliance-reports", "risk-register", "compliance"
  ],
  automation: [
    "flows", "flow-builder", "flow-analytics", "ai-automation",
    "voice-calls", "voice-logs", "lowcode-studio", "workflow-builder",
    "custom-crm-modules", "automation"
  ],
  enterprise: [
    "multi-organization", "enterprise-bi", "enterprise-integrations",
    "mission-control", "sla-center", "observability", "load-testing",
    "release-management", "developer-portal", "product-management",
    "compliance-governance", "mobile-readiness", "enterprise"
  ],
  reports: [
    "reports", "analytics", "financial-analytics"
  ],
  security: [
    "security", "audit", "roles"
  ]
};

export const PLAN_DEFINITIONS = {
  basic: {
    plan: "basic",
    name: "Starter Basic Tier",
    enabledModules: ["service", "chat", "shortcuts", "security"],
    limits: { agents: 2, websites: 1 }
  },
  standard: {
    plan: "standard",
    name: "Business Standard Tier",
    enabledModules: ["service", "chat", "tickets", "crm", "finance", "shortcuts", "reports", "security"],
    limits: { agents: 5, websites: 3 }
  },
  pro: {
    plan: "pro",
    name: "Pro Enterprise Tier",
    enabledModules: ["service", "crm", "operations", "finance", "compliance", "automation", "reports", "security"],
    limits: { agents: 10, websites: 10 }
  },
  enterprise: {
    plan: "enterprise",
    name: "Custom Enterprise Unlimited",
    enabledModules: [
      "service", "crm", "operations", "finance", "compliance", "automation", "enterprise",
      "reports", "security"
    ],
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
  if (user?.role === "admin" || user?.role === "superadmin" || user?.role === "global_admin") {
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

  const existingModules = Array.isArray(subscription.enabledModules) ? subscription.enabledModules : [];
  const mergedModules = [...new Set([...fallback.enabledModules, ...existingModules])];

  return {
    plan,
    status,
    offerCode: subscription.offerCode || "",
    discountPercentage: subscription.discountPercentage || 0,
    enabledModules: mergedModules,
    limits: {
      agents: subscription.limits?.agents ?? fallback.limits.agents,
      websites: subscription.limits?.websites ?? fallback.limits.websites
    },
    expiresAt: subscription.expiresAt || null
  };
}

export function hasModuleAccess(subscription, moduleName) {
  if (!subscription) return false;

  const cleanMod = String(moduleName || "").toLowerCase().trim();
  // Essential admin / account management routes are always allowed so client can upgrade
  const ALWAYS_ALLOWED = ["overview", "billing", "websites", "agents"];
  if (ALWAYS_ALLOWED.includes(cleanMod)) return true;

  let status = subscription.status || "active";
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    status = "expired";
  }
  if (status === "expired" || status === "suspended") return false;

  const planCode = String(subscription.plan || "pro").toLowerCase().trim();
  if (planCode === "enterprise") return true;

  const enabled = Array.isArray(subscription.enabledModules)
    ? subscription.enabledModules.map(m => String(m).toLowerCase().trim())
    : [];

  if (enabled.includes("*") || enabled.includes("all")) return true;
  if (enabled.includes(cleanMod)) return true;

  // Check category hierarchy mapping
  for (const [category, moduleList] of Object.entries(MODULE_CATEGORIES)) {
    if (moduleList.includes(cleanMod)) {
      if (enabled.includes(category)) return true;
    }
  }

  return false;
}

