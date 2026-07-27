export const ROLES = Object.freeze({
  ADMIN: "admin",
  CLIENT: "client",
  MANAGER: "manager",
  AGENT: "agent",
  SALES: "sales",
  PURCHASE: "purchase",
  ACCOUNTS: "accounts",
  USER: "user",
  TAX_CONSULTANT: "tax_consultant",
  MANAGEMENT: "management"
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const CRM_RECORD_TYPES = Object.freeze(["lead", "deal", "customer"]);
export const CRM_LEAD_STATUSES = Object.freeze(["new", "contacted", "qualified", "disqualified"]);
export const CRM_DEAL_STAGES = Object.freeze(["qualified", "proposal", "negotiation", "won", "lost"]);
export const CRM_LEAD_TEMPERATURES = Object.freeze(["cold", "warm", "hot"]);
export const CRM_LOST_REASONS = Object.freeze(["price_issue", "competitor", "no_response", "not_interested"]);

// Legacy compatibility enums retained for older code paths and stored historic data.
export const CRM_STATUSES = Object.freeze([
  ...CRM_LEAD_STATUSES,
  ...CRM_DEAL_STAGES,
  "prospect", "lead", "customer", "inactive", "hold", "proposal_sent", "proposition"
]);

export const CRM_PIPELINE_STAGES = Object.freeze([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost"
]);
export const TICKET_STATUSES = Object.freeze(["open", "in_progress", "waiting", "resolved", "closed", "pending", "archived"]);
export const TICKET_PRIORITIES = Object.freeze(["low", "medium", "high", "urgent"]);
export const TICKET_CRM_STAGES = Object.freeze(["none", "lead", "qualified", "opportunity", "proposal", "negotiation", "won", "lost"]);
export const CHAT_STATUSES = Object.freeze(["active", "closed", "queued", "archived"]);

/**
 * Status transitions allowed for Sales role.
 * Key = current status, Value = array of statuses they can move to.
 */
export const SALES_ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  new: ["new", "contacted"],
  contacted: ["contacted", "qualified"],
  qualified: ["qualified", "proposal"],
  proposal: ["proposal", "negotiation"],
  negotiation: ["negotiation"],
  disqualified: ["disqualified"],
  // legacy statuses
  prospect: ["prospect", "lead"],
  lead: ["lead", "customer"],
  customer: ["customer"],
  inactive: ["inactive"],
  // Sales cannot move won/lost
  won: ["won"],
  lost: ["lost"]
});

export const NOTIFICATION_TYPES = Object.freeze([
  "new_chat",
  "new_ticket",
  "status_update",
  "system_alert",
  "sla_breach",
  "crm_lead_assigned",
  "crm_follow_up_due",
  "crm_duplicate_detected",
  "crm_task_completed",
  "purchase_request_created",
  "procurement_order_shipped",
  "procurement_order_delivered",
  "procurement_invoice_uploaded",
  "inventory_low_stock",
  "chat_transferred",
  "activity_alert",
  "vat_filing_due",
  "corporate_tax_due",
  "trade_license_expiring",
  "overdue_compliance",
  "unattended_client_alert"
]);

export const UAE_SERVICES = Object.freeze([
  "Corporate Tax Registration",
  "Corporate Tax Filing",
  "VAT Registration",
  "VAT Filing",
  "Trade License Renewal",
  "PRO Services",
  "Other Services"
]);

export const UAE_WORK_STATUSES = Object.freeze([
  "Pending",
  "In Progress",
  "Completed"
]);

export const UAE_PAYMENT_STATUSES = Object.freeze([
  "Pending",
  "Partial",
  "Paid",
  "Overdue"
]);

export const ACTIVITY_ENTITY_TYPES = Object.freeze([
  "customer",
  "ticket",
  "chat_session",
  "website",
  "article",
  "follow_up_task",
  "notification",
  "settings"
]);

export const ACTIVITY_VISIBILITY = Object.freeze(["internal", "public"]);

export const ACTIVITY_TYPES = Object.freeze([
  "created",
  "updated",
  "archived",
  "restored",
  "deleted",
  "assigned",
  "unassigned",
  "stage_changed",
  "status_changed",
  "note_added",
  "call_logged",
  "meeting_logged",
  "manual_email_logged",
  "email_sent",
  "task_created",
  "task_updated",
  "task_completed",
  "task_deleted",
  "duplicate_detected",
  "merged",
  "transferred",
  "comment_added",
  "settings_updated",
  "auto_assigned",
  "sla_breached",
  "page_view"
]);

export const FOLLOW_UP_TASK_TYPES = Object.freeze([
  "call",
  "email",
  "meeting",
  "demo",
  "quotation",
  "follow_up",
  "custom"
]);

export const FOLLOW_UP_TASK_STATUSES = Object.freeze([
  "open",
  "in_progress",
  "completed",
  "cancelled"
]);
