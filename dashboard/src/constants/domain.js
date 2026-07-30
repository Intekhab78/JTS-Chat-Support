export const ROLES = Object.freeze({
  ADMIN: "admin",
  CLIENT: "client",
  MANAGER: "manager",
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
  TICKET_UPDATE: "ticket.update",
  TICKET_ASSIGN: "ticket.assign",
  CHAT_VIEW: "chat.view",
  CHAT_TRANSFER: "chat.transfer",
  CHAT_NOTE: "chat.note",
  ACTIVITY_VIEW: "activity.view",
  NOTIFICATION_VIEW: "notification.view",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
  REPORTS_VIEW: "reports.view",
  TEAM_VIEW: "team.view",
  ACCOUNTS_VIEW: "accounts.view",
  INVOICE_MANAGE: "invoice.manage",
  BILLING_VIEW: "billing.view"
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
