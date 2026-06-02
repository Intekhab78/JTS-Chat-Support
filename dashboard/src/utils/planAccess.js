export function getSubscription(user) {
  return user?.subscription || {
    plan: "pro",
    status: "active",
    enabledModules: ["chat", "tickets", "crm", "shortcuts", "reports", "security"],
    limits: { agents: 20, websites: 10 }
  };
}

export function hasModule(user, moduleName) {
  const subscription = getSubscription(user);
  // Strictly enforce active status
  if (subscription.status === "expired" || subscription.status === "suspended") {
    // Basic chat might still be allowed if you want, but for now we block all modules
    return false;
  }
  return Array.isArray(subscription.enabledModules) && subscription.enabledModules.includes(moduleName);
}
