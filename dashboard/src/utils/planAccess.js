export const MODULE_CATEGORIES = {
  service: [
    "chat", "chats", "tickets", "shortcuts", "canned_responses", "departments",
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

export function getSubscription(user) {
  return user?.subscription || {
    plan: "pro",
    status: "active",
    enabledModules: ["service", "crm", "operations", "finance", "compliance", "automation", "reports", "security"],
    limits: { agents: 10, websites: 10 }
  };
}

export function hasModule(user, moduleName) {
  const role = String(user?.role || "").toLowerCase().trim();
  // SuperAdmin has universal master access
  if (role.includes("admin") || role === "superadmin" || role === "global_admin") return true;

  const cleanMod = String(moduleName || "").toLowerCase().trim();
  // Always allowed essentials so tenant can see their dashboard and renew billing
  const ALWAYS_ALLOWED = ["overview", "billing", "websites", "agents"];
  if (ALWAYS_ALLOWED.includes(cleanMod)) return true;

  const subscription = getSubscription(user);

  let status = subscription.status || "active";
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    status = "expired";
  }

  // Strictly enforce active subscription
  if (status === "expired" || status === "suspended") {
    return false;
  }

  const planCode = String(subscription.plan || "pro").toLowerCase().trim();
  if (planCode === "enterprise") return true;

  const enabled = Array.isArray(subscription.enabledModules)
    ? subscription.enabledModules.map(m => String(m).toLowerCase().trim())
    : [];

  if (enabled.includes("*") || enabled.includes("all")) return true;
  if (enabled.includes(cleanMod)) return true;

  // Match category hierarchy
  for (const [category, moduleList] of Object.entries(MODULE_CATEGORIES)) {
    if (moduleList.includes(cleanMod)) {
      if (enabled.includes(category)) return true;
    }
  }

  return false;
}

