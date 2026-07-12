export function getSubscription(user) {
  return user?.subscription || {
    plan: "pro",
    status: "active",
    enabledModules: ["chat", "tickets", "crm", "shortcuts", "reports", "security"],
    limits: { agents: 20, websites: 10 }
  };
}

export function hasModule(user, moduleName) {
  if (user?.role === "admin") return true; // Super Admin has access to all modules bypass
  const subscription = getSubscription(user);
  // Strictly enforce active status
  if (subscription.status === "expired" || subscription.status === "suspended") {
    return false;
  }
  return Array.isArray(subscription.enabledModules) && subscription.enabledModules.includes(moduleName);
}
