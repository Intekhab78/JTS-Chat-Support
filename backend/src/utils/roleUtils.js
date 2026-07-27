/**
 * Shared role utilities — centralised here to avoid duplication across controllers/sockets.
 */
import { Website } from "../models/Website.js";

const OWNER_ROLES = new Set(["admin", "client", "manager"]);
const PERSONNEL_BASE_ROLES = new Set(["agent", "sales", "purchase", "user", "supplier", "accounts", "tax_consultant"]);

/**
 * Normalises legacy aliases (e.g., user or sales to agent).
 * Manager is a distinct role representing a tenant-level admin.
 * @param {string} role
 * @returns {string}
 */
export function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (!normalized) return normalized;
  if (normalized === "user") return "agent";
  if (normalized === "account") return "accounts";
  if (OWNER_ROLES.has(normalized) || PERSONNEL_BASE_ROLES.has(normalized)) return normalized;
  return "agent";
}

export function isPersonnelRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return Boolean(normalized) && !OWNER_ROLES.has(normalized);
}

/**
 * Row Level Security (RLS) filter generator:
 * - Tax Consultant / Sales: Returns { ownerId: user._id }
 * - Admin / Manager: Returns {} (All records)
 */
export function getOwnershipQuery(user) {
  const role = normalizeRole(user?.role);
  if (role === "tax_consultant" || role === "sales") {
    return { ownerId: user._id };
  }
  return {};
}

function sanitizeWebsiteIds(ids = []) {
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

/**
 * Returns the list of Website ObjectIds that the given user is allowed to access.
 * - Admins can see all websites.
 * - Clients only see websites they manage.
 * - Managers only see websites belonging to their parent client (managerId).
 * - Agents get an empty array (they work per-session, not per-website).
 *
 * @param {object} user - Mongoose User document (or plain object with .role, ._id, .managerId)
 * @returns {Promise<import("mongoose").Types.ObjectId[]>}
 */
export async function getOwnedWebsiteIds(user) {
  const rawRole = user.role;
  const role = normalizeRole(rawRole);

  if (role === "admin") {
    // Global admin: all websites
    const websites = await Website.find({}).select("_id");
    return websites.map((w) => w._id);
  }

  if (role === "client") {
    // Client: websites they own
    const websites = await Website.find({ managerId: user._id }).select("_id");
    return websites.map((w) => w._id);
  }

  if (role === "manager") {
    const assigned = sanitizeWebsiteIds(user.websiteIds);
    if (assigned.length > 0) return assigned;
    const websites = await Website.find({ managerId: user.managerId }).select("_id");
    return websites.map((w) => w._id);
  }

  if (isPersonnelRole(rawRole)) {
    const assigned = sanitizeWebsiteIds(user.websiteIds);
    if (assigned.length > 0) return assigned;
    const websites = await Website.find({ managerId: user.managerId }).select("_id");
    return websites.map((w) => w._id);
  }

  return [];
}
