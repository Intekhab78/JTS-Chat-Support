import { User } from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hasModuleAccess, resolveSubscriptionForUser } from "../utils/planUtils.js";

async function getTenantUser(user) {
  if (!user) return null;
  if (user.role === "admin" || user.role === "client") return user;
  
  let current = user;
  let depth = 0;
  while (current?.managerId && depth < 5) {
    const parent = await User.findById(current.managerId).select("role managerId subscription websiteIds");
    if (!parent) break;
    if (parent.role === "client" || parent.role === "admin") return parent;
    current = parent;
    depth++;
  }

  // If still not found, locate client organization owner via shared websiteIds
  if (Array.isArray(user.websiteIds) && user.websiteIds.length > 0) {
    const clientOwner = await User.findOne({ 
      role: "client", 
      websiteIds: { $in: user.websiteIds } 
    }).select("role subscription");
    if (clientOwner) return clientOwner;
  }

  return current || user;
}

export const attachTenantSubscription = asyncHandler(async (req, _res, next) => {
  const tenantUser = await getTenantUser(req.user);
  req.tenantUser = tenantUser;
  req.subscription = resolveSubscriptionForUser(tenantUser || req.user);
  next();
});

export function requirePlanFeature(moduleName) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.subscription) {
      const tenantUser = await getTenantUser(req.user);
      req.tenantUser = tenantUser;
      req.subscription = resolveSubscriptionForUser(tenantUser || req.user);
    }

    if (req.user?.role !== "admin" && req.user?.role !== "client" && !hasModuleAccess(req.subscription, moduleName)) {
      throw new AppError(`Your current plan does not include ${moduleName}.`, 403);
    }

    next();
  });
}
