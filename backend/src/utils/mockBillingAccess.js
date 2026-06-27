export function isFlagEnabled(value) {
  return String(value || "").trim().toLowerCase() === "true";
}

export function canUseMockBilling({ nodeEnv = "development", enableMockBilling = false } = {}) {
  if (nodeEnv === "production") return false;
  return nodeEnv === "development" || enableMockBilling === true || isFlagEnabled(enableMockBilling);
}

export function logBlockedMockBillingRequest({ user = null, ipAddress = "", nodeEnv = "", reason = "" } = {}) {
  console.warn("[billing] Blocked mock billing request", {
    userId: user?._id ? String(user._id) : null,
    userRole: user?.role || null,
    ipAddress,
    nodeEnv,
    reason,
    timestamp: new Date().toISOString()
  });
}
