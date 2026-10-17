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
    // SuperAdmin bypass
    const userRole = String(req.user?.role || "").toLowerCase().trim();
    if (userRole.includes("admin") || userRole === "superadmin" || userRole === "global_admin") {
      return next();
    }

    if (!req.subscription) {
      const tenantUser = await getTenantUser(req.user);
      req.tenantUser = tenantUser;
      req.subscription = resolveSubscriptionForUser(tenantUser || req.user);
    }

    const sub = req.subscription;
    if (sub?.status === "expired" || sub?.status === "suspended") {
      throw new AppError("Your subscription has expired or is suspended. Please renew your plan to continue.", 403);
    }

    if (!hasModuleAccess(sub, moduleName)) {
      throw new AppError(
        `Your current subscription plan (${sub?.plan || "basic"}) does not include access to the '${moduleName}' module. Please upgrade your plan.`,
        403
      );
    }

    next();
  });
}

export function checkPlanLimit(resourceType) {
  return asyncHandler(async (req, _res, next) => {
    const userRole = String(req.user?.role || "").toLowerCase().trim();
    if (userRole.includes("admin") || userRole === "superadmin" || userRole === "global_admin") {
      return next();
    }

    if (!req.subscription) {
      const tenantUser = await getTenantUser(req.user);
      req.tenantUser = tenantUser;
      req.subscription = resolveSubscriptionForUser(tenantUser || req.user);
    }

    const sub = req.subscription;
    if (sub?.status === "expired" || sub?.status === "suspended") {
      throw new AppError("Your subscription has expired. Please renew your plan.", 403);
    }

    const allowedLimit = sub?.limits?.[resourceType];
    if (typeof allowedLimit === "number") {
      let currentCount = 0;
      if (resourceType === "websites") {
        const { Website } = await import("../models/Website.js");
        currentCount = await Website.countDocuments({
          $or: [
            { clientId: req.tenantUser?._id || req.user._id },
            { _id: { $in: req.user.websiteIds || [] } }
          ]
        });
      } else if (resourceType === "agents") {
        const { User } = await import("../models/User.js");
        currentCount = await User.countDocuments({
          managerId: req.tenantUser?._id || req.user._id,
          role: { $in: ["agent", "manager", "purchase", "accounts"] }
        });
      }

      if (currentCount >= allowedLimit) {
        throw new AppError(
          `You have reached the maximum allowed ${resourceType} limit (${allowedLimit}) for your current plan (${sub.plan}). Please upgrade to add more.`,
          403
        );
      }
    }

    next();
  });
}

