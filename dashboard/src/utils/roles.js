export function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) return normalized;
  if (normalized === "user") return "agent";
  if (["admin", "client", "manager", "agent", "sales", "supplier", "accounts", "customer", "tax_consultant", "management"].includes(normalized) || normalized === "account") {
    return normalized === "account" ? "accounts" : normalized;
  }
  return "agent";
}

export function isAgentWorkspaceRole(role) {
  return normalizeRole(role) === "agent";
}
