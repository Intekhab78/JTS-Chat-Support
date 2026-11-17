export const ROLES = Object.freeze({
  ADMIN: "admin",
  CLIENT: "client",
  MANAGER: "manager",
  MANAGEMENT: "management",
  AGENT: "agent",
  SALES: "sales",
  PURCHASE: "purchase",
  ACCOUNTS: "accounts",
  TAX_CONSULTANT: "tax_consultant",
  SUPPLIER: "supplier",
  CUSTOMER: "customer"
});

export const PERMISSIONS = Object.freeze({
  CRM_VIEW: "crm.view",
  CRM_CREATE: "crm.create",
  CRM_UPDATE: "crm.update",
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
  INVOICE_VIEW: "invoice.view",
  INVOICE_CREATE: "invoice.create",
  INVOICE_UPDATE: "invoice.update",
  INVOICE_DELETE: "invoice.delete",
  INVOICE_MANAGE: "invoice.manage",
  BILLING_VIEW: "billing.view",
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

/**
 * Which lead statuses a Sales role is allowed to transition TO from a given current status.
 */
export const SALES_ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  new: ["new", "contacted"],
  contacted: ["contacted", "qualified"],
  qualified: ["qualified", "proposal_sent"],
  proposal_sent: ["proposal_sent", "negotiation"],
  negotiation: ["negotiation"],
  // legacy
  prospect: ["prospect", "lead"],
  lead: ["lead", "customer"],
  customer: ["customer"],
  inactive: ["inactive"],
  won: ["won"],
  lost: ["lost"]
});
