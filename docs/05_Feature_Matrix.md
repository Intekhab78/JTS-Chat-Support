# Feature Matrix

Related documents: [Project Overview](01_Project_Overview.md), [API Documentation](04_API_Documentation.md), [Production Readiness](11_Production_Readiness.md).

Status values are based on source evidence only.

| Feature | Business Purpose | Frontend | Backend | Database | API | Validation | Testing | Production Ready | Completion | Priority | Owner | Notes |
|---|---|---|---|---|---|---|---|---|---:|---|---|---|
| Authentication | Secure dashboard access | Yes | Yes | User | Yes | Partial | Smoke/env only | Needs hardening | 80% | P0 | Backend | Query token support is risk. |
| Role/RBAC | Restrict operations by role | Yes | Yes | Role/User | Yes | Partial | NOT FOUND | Needs hardening | 65% | P0 | Backend | Inconsistent authorization coverage. |
| Plan gating | SaaS feature tiers | Partial | Yes | User.subscription | Yes | Controller | NOT FOUND | Partial | 60% | P1 | Backend | Plan middleware exists. |
| Website management | Tenant website/widget setup | Yes | Yes | Website | Yes | Partial | NOT FOUND | Partial | 75% | P1 | Full stack | Multi-domain/currency support exists. |
| Chat widget | Visitor engagement | Yes | Yes | Website/Visitor/ChatSession | Yes | API key + controller | NOT FOUND | Partial | 82% | P1 | Full stack | DOM safety previously improved. |
| Live chat | Agent support workflow | Yes | Yes | ChatSession/Message | Yes/socket | Partial | NOT FOUND | Partial | 80% | P1 | Full stack | Sockets implemented. |
| Ticketing | Track support cases | Yes | Yes | Ticket | Yes | Zod partial | NOT FOUND | Partial | 72% | P1 | Full stack | Public ticket status exists. |
| CRM leads/customers | Sales pipeline | Yes | Yes | Customer | Yes | Zod partial | NOT FOUND | Partial | 75% | P0 | Full stack | Strong feature base. |
| CRM tasks | Follow-up discipline | Yes | Yes | FollowUpTask | Yes | Zod | NOT FOUND | Partial | 70% | P1 | Full stack | Reminder engine partial. |
| CRM notes/email | Sales communication | Yes | Yes | Customer communications | Yes | Partial | NOT FOUND | Partial | 65% | P1 | Full stack | SMTP config required. |
| Quotations | Proposal workflow | Yes | Yes | Quotation | Yes | Controller | PDF smoke only | Partial | 62% | P1 | Full stack | Approval exists. |
| Invoices | Billing documents | Yes | Yes | Invoice | Yes | Weak | PDF smoke only | No | 52% | P0 | Full stack | Tenant authorization gap. |
| Payments | Collect money | Partial | Partial | User/Quotation | Partial | Weak | NOT FOUND | No | 45% | P0 | Backend | Stripe partial, mock endpoint risk. |
| Inventory | Stock control | Yes | Yes | Inventory* | Yes | Controller | NOT FOUND | Partial | 58% | P1 | Full stack | Masters and movements exist. |
| Procurement | Purchase operations | Yes | Yes | PO/RFQ/Supplier | Yes | Controller | NOT FOUND | Partial | 60% | P1 | Full stack | PO delivery updates stock. |
| Supplier portal | Supplier self-service | Yes | Yes | Supplier/PO | Yes | Controller | NOT FOUND | Partial | 50% | P2 | Full stack | Ledger exists in UI/API. |
| Accounts dashboard | Finance overview | Yes | Partial | Invoice/PO/User | Partial | Weak | NOT FOUND | No | 45% | P1 | Full stack | Depends on invoice/payment maturity. |
| Analytics/reports | Management visibility | Yes | Yes | Analytics/Snapshot | Yes | Controller | NOT FOUND | Partial | 55% | P2 | Full stack | Some enterprise data mocked. |
| Notifications | Operational alerts | Yes | Yes | Notification | Yes | Controller | NOT FOUND | Partial | 60% | P1 | Full stack | Socket integration present. |
| Audit logs | Trace sensitive actions | Yes | Yes | AuditLog/ActivityEvent | Yes | Controller | NOT FOUND | Partial | 55% | P0 | Backend | Coverage inconsistent. |
| Flow builder | Widget automation | Yes | Yes | Flow/FlowTemplate | Yes | Inline validation | NOT FOUND | Partial | 65% | P2 | Full stack | Large inline routes. |
| Knowledge base | Help center content | UI only | Missing | Article | Missing | Missing | NOT FOUND | No | 25% | P1 | Full stack | UI calls missing APIs. |
| Webhooks | External integrations | Yes | Partial | Website/WebhookDelivery | Partial | Partial | NOT FOUND | Partial | 50% | P2 | Backend | Retry controls missing. |
| Security center | Admin visibility | Yes | Yes | Audit/WebhookDelivery | Yes | Controller | NOT FOUND | Partial | 55% | P1 | Full stack | 2FA controls included. |
| Billing admin | Subscription operations | Yes | Partial | User.subscription | Yes | Controller | NOT FOUND | No | 45% | P0 | Backend | Mock checkout must be handled. |
| Calendar | Schedule activities | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | No | 0% | P2 | UNKNOWN | Missing. |
| Expenses | Expense management | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | No | 0% | P2 | UNKNOWN | Missing. |
| Tax/GST | Tax compliance | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | NOT FOUND | No | 0% | P1 | UNKNOWN | Missing. |
