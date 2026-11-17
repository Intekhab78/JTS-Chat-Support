import { ROLES } from "../constants/domain.js";
import AppError from "./AppError.js";
import { normalizeRole } from "./roleUtils.js";
import { logAuditEvent } from "../services/auditService.js";

export const PERMISSIONS = Object.freeze({
  CRM_VIEW: "crm.view",
  CRM_CREATE: "crm.create",
  CRM_UPDATE: "crm.update",
  CRM_EDIT: "crm.update",
  CRM_ARCHIVE: "crm.archive",
  CRM_DELETE: "crm.delete",
  CRM_ASSIGN_OWNER: "crm.assign_owner",
  CRM_MERGE: "crm.merge",
  CRM_SEND_EMAIL: "crm.send_email",
  CRM_MANAGE_TASKS: "crm.manage_tasks",
  CRM_AUTO_ASSIGN: "crm.auto_assign",
  TICKET_VIEW: "ticket.view",
  TICKET_CREATE: "ticket.create",
  TICKET_UPDATE: "ticket.update",
  TICKET_ASSIGN: "ticket.assign",
  TICKET_COMMENT: "ticket.comment",
  TICKET_DELETE: "ticket.delete",
  CHAT_VIEW: "chat.view",
  CHAT_TRANSFER: "chat.transfer",
  CHAT_NOTE: "chat.note",
  CHAT_HISTORY: "chat.history",
  CHAT_ARCHIVE: "chat.archive",
  ACTIVITY_VIEW: "activity.view",
  NOTIFICATION_VIEW: "notification.view",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
  REPORTS_VIEW: "reports.view",
  TEAM_VIEW: "team.view",
  ACCOUNTS_VIEW: "accounts.view",
  BILLING_VIEW: "billing.view",
  INVOICE_VIEW: "invoice.view",
  INVOICE_CREATE: "invoice.create",
  INVOICE_UPDATE: "invoice.update",
  INVOICE_DELETE: "invoice.delete",
  INVOICE_MANAGE: "invoice.manage",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_UPDATE: "inventory.update",
  INVENTORY_DELETE: "inventory.delete",
  INVENTORY_MANAGE: "inventory.manage",
  PURCHASE_VIEW: "purchase.view",
  PURCHASE_CREATE: "purchase.create",
  PURCHASE_UPDATE: "purchase.update",
  PURCHASE_DELETE: "purchase.delete",
  PURCHASE_MANAGE: "purchase.manage",
  ROLE_MANAGE: "role.manage"
});

const MATRIX = Object.freeze({
  // Admin: everything
  [ROLES.ADMIN]: new Set(Object.values(PERMISSIONS)),

  // Client: full CRM + communications + settings
  [ROLES.CLIENT]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_CREATE,
    PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.CRM_ARCHIVE,
    PERMISSIONS.CRM_DELETE,
    PERMISSIONS.CRM_ASSIGN_OWNER,
    PERMISSIONS.CRM_MERGE,
    PERMISSIONS.CRM_SEND_EMAIL,
    PERMISSIONS.CRM_MANAGE_TASKS,
    PERMISSIONS.CRM_AUTO_ASSIGN,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.TICKET_ASSIGN,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.CHAT_TRANSFER,
    PERMISSIONS.CHAT_NOTE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.TEAM_VIEW
  ]),

  // Manager: full CRM control + monitoring + delete (no settings management)
  [ROLES.MANAGER]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_CREATE,
    PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.CRM_ARCHIVE,
    PERMISSIONS.CRM_DELETE,
    PERMISSIONS.CRM_ASSIGN_OWNER,
    PERMISSIONS.CRM_MERGE,
    PERMISSIONS.CRM_SEND_EMAIL,
    PERMISSIONS.CRM_MANAGE_TASKS,
    PERMISSIONS.CRM_AUTO_ASSIGN,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.TICKET_ASSIGN,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.CHAT_NOTE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_UPDATE,
    PERMISSIONS.PURCHASE_MANAGE
  ]),

  // Sales: can only work their own assigned leads, no delete/assign/archive
  [ROLES.SALES]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_CREATE,
    PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.CRM_SEND_EMAIL,
    PERMISSIONS.CRM_MANAGE_TASKS,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.CHAT_NOTE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.REPORTS_VIEW, // own performance only
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_UPDATE
  ]),

  [ROLES.PURCHASE]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.CRM_SEND_EMAIL,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.PURCHASE_VIEW,
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_UPDATE,
    PERMISSIONS.PURCHASE_MANAGE
  ]),

  [ROLES.ACCOUNTS]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.CRM_SEND_EMAIL,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.INVOICE_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PURCHASE_VIEW
  ]),

  // Agent: read-only CRM, can handle chats/tickets
  [ROLES.AGENT]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.TICKET_UPDATE,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.CHAT_TRANSFER,
    PERMISSIONS.CHAT_NOTE,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW
  ]),

  [ROLES.TAX_CONSULTANT]: new Set([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_CREATE,
    PERMISSIONS.CRM_UPDATE,
    PERMISSIONS.CRM_SEND_EMAIL,
    PERMISSIONS.CRM_MANAGE_TASKS,
    PERMISSIONS.TICKET_VIEW,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.NOTIFICATION_VIEW,
    PERMISSIONS.REPORTS_VIEW
  ])
});

export function hasPermission(user, permission) {
  if (!user?.role || !permission) return false;
  const role = normalizeRole(user.role);
  if (role === "admin" || user.role === "admin" || role === "client" || user.role === "client") {
    return true;
  }

  // 1. Dynamic DB permission list from Role Master overrides static matrix when present
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }

  // 2. Fallback to static role MATRIX when no Role Master document exists
  return MATRIX[user.role]?.has(permission) || MATRIX[role]?.has(permission) || false;
}

export function requirePermission(user, permission, message = "Access denied: Insufficient privileges") {
  if (!hasPermission(user, permission)) {
    console.warn(`[Security Alert] Permission denied for user ${user?.name || user?._id} (${user?.role}) attempting ${permission}`);
    logAuditEvent({
      actor: user,
      action: "PERMISSION_DENIED",
      entityType: "Security",
      entityId: String(user?._id || "anonymous"),
      metadata: { permission, role: user?.role, severity: "Security" }
    });
    throw new AppError(message, 403);
  }
}

export function requireAnyPermission(...permissions) {
  const flat = permissions.flat().filter(Boolean);
  return (req, res, next) => {
    if (flat.some((permission) => hasPermission(req.user, permission))) {
      return next();
    }
    const primary = flat[0] || "unknown";
    console.warn(
      `[Security Alert] Permission denied for user ${req.user?.name || req.user?._id} (${req.user?.role}) attempting ${flat.join(" | ")}`
    );
    logAuditEvent({
      actor: req.user,
      action: "PERMISSION_DENIED",
      entityType: "Security",
      entityId: String(req.user?._id || "anonymous"),
      metadata: {
        permission: primary,
        requiredAny: flat,
        role: req.user?.role,
        path: req.originalUrl,
        severity: "Security"
      }
    });
    return next(new AppError("Access denied: Insufficient privileges", 403));
  };
}
