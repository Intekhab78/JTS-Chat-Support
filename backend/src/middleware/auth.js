import { env } from "../config/env.js";
import { User } from "../models/User.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { normalizeRole } from "../utils/roleUtils.js";
import { authenticateWithDeveloperApiKey } from "../services/developerApiKeyAuthService.js";
import jwt from "jsonwebtoken";

export async function getUserFromToken(token) {
  if (!token) {
    throw new AppError("You are not logged in! Please log in to get access.", 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Your token has expired! Please log in again.", 401);
    }
    throw new AppError("Invalid token! Please log in again.", 401);
  }

  const user = await User.findById(payload.id).select("-password");
  if (!user) {
    throw new AppError("The user belonging to this token no longer exists.", 401);
  }

  // Populate dynamic permissions from Role collection
  const { Role } = await import("../models/Role.js");
  user.permissions = await Role.resolvePermissionsForUser(user);

  return user;
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const headerApiKey = req.headers["x-api-key"] || "";
  const bearerPart = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : "";
  const candidateApiKey = headerApiKey.startsWith("jts_live_")
    ? headerApiKey
    : bearerPart.startsWith("jts_live_")
      ? bearerPart
      : "";

  if (candidateApiKey) {
    const { user, apiKeyDoc } = await authenticateWithDeveloperApiKey(candidateApiKey, req);
    req.user = user;
    req.apiKey = apiKeyDoc;
    return next();
  }

  let token = "";

  if (bearerPart) {
    token = bearerPart;
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError("You are not logged in! Please log in to get access.", 401));
  }
  req.user = await getUserFromToken(token);
  next();
});

export function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user?.role === "admin" || normalizeRole(req.user?.role) === "admin") {
      return next();
    }

    let allowedRoles = [...roles];
    // If 'client' is allowed, also allow 'manager' (tenant admins)
    if (allowedRoles.includes("client")) {
      allowedRoles.push("manager");
    }

    const effectiveRole = normalizeRole(req.user?.role);
    if (req.user && (allowedRoles.includes(req.user.role) || allowedRoles.includes(effectiveRole))) {
      return next();
    }

    // Dynamic RBAC bridge: if this is not a Super-Admin-only route and the user was granted module permission via Role Master, allow access
    const isAdminOnly = allowedRoles.length === 1 && allowedRoles[0] === "admin";
    const perms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (req.user && !isAdminOnly && perms.length > 0) {
      const url = `${req.baseUrl || ""}${req.path || ""}`.toLowerCase();
      const hasAny = (...list) => list.some((p) => perms.includes(p));
      const hasPrefix = (prefix) => perms.some((p) => p.startsWith(prefix));

      if (
        ((url.includes("/chat") || url.includes("/canned-responses")) && hasPrefix("chat.")) ||
        (url.includes("/tickets") && hasPrefix("ticket.")) ||
        (url.includes("/crm") && (hasPrefix("crm.") || hasPrefix("invoice.") || hasAny("accounts.view", "billing.view"))) ||
        (url.includes("/inventory") && (hasPrefix("inventory.") || hasPrefix("purchase."))) ||
        (url.includes("/procurement") && (hasPrefix("purchase.") || hasPrefix("inventory."))) ||
        (url.includes("/analytics") && hasAny("reports.view", "accounts.view")) ||
        (url.includes("/audit") && hasAny("audit.view")) ||
        ((url.includes("/users") || url.includes("/departments")) && (hasAny("team.view", "chat.view", "settings.manage", "role.manage") || hasPrefix("crm.") || hasPrefix("ticket."))) ||
        (url.includes("/roles") && hasAny("role.manage"))
      ) {
        return next();
      }
    }

    return res.status(403).json({ message: "Access denied" });
  };
}
