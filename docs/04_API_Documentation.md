# API Documentation

Related documents: [Architecture](02_Architecture.md), [Security Audit](07_Security_Audit.md), [Testing Guide](09_Testing_Guide.md).

Base API is mounted in `backend/src/app.js`. Unless marked public, endpoints use JWT authentication via `requireAuth`; some routes also require roles or plan features.

Legend:
- Validation: `Zod`, `Mongoose`, `Controller`, or `UNKNOWN`.
- Pagination/filtering/sorting: listed where evidence exists; otherwise `NOT FOUND`.
- Status: `Active`, `Partial`, or `Risk`.

## Auth

| Method | URL | Description | Auth | Authorization | Request | Response | Validation | Errors | Pagination | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | Register user/client | Public | Controller-defined | name/email/password/role | user/token | Controller/Mongoose | 400/409 | N/A | Active |
| POST | `/api/auth/login` | Login | Public | None | email/password/2FA token optional | user/token | Zod/controller | 400/401/429 | N/A | Active |
| POST | `/api/auth/refresh` | Refresh session | JWT | Any user | none | refreshed user/token | Controller | 401 | N/A | Active |
| GET | `/api/auth/me` | Current user | JWT | Any user | none | user | JWT | 401 | N/A | Active |
| POST | `/api/auth/agents/register` | Register agent | JWT | admin/client | user payload | user | Controller | 403/400 | N/A | Active |
| POST | `/api/auth/2fa/setup` | Setup 2FA | JWT | Any user | none | secret/setup payload | Controller | 401/400 | N/A | Partial |
| POST | `/api/auth/2fa/verify` | Verify 2FA setup | JWT | Any user | token | result | Controller | 400 | N/A | Partial |
| POST | `/api/auth/2fa/disable` | Disable 2FA | JWT | Any user | token/current password | result | Controller | 400/401 | N/A | Partial |
| POST | `/api/auth/forgot-password` | Request password reset | Public | None | email | result | Zod/controller | 400/429 | N/A | Active |
| POST | `/api/auth/reset-password/:token` | Reset password | Public | token | password | result | Zod/controller | 400/401 | N/A | Active |

## Websites and Widget

| Method | URL | Description | Auth | Authorization | Request | Response | Validation | Pagination | Status |
|---|---|---|---|---|---|---|---|---|---|
| GET | `/api/websites` | List scoped websites | JWT | route requires auth in route file | query optional | websites | Controller | NOT FOUND | Active |
| GET | `/api/websites/:id` | Get website | JWT | tenant scope | id | website | Controller | N/A | Active |
| POST | `/api/websites` | Create website | JWT | client/admin evidence | website config | website + embed script | Mongoose/controller | N/A | Active |
| PATCH | `/api/websites/:id` | Update website | JWT | tenant scope | website config | website | Controller | N/A | Active |
| GET | `/chat-widget.js` | Serve widget bundle | Public | None | none | JS | N/A | N/A | Active |
| GET | `/api/widget/config` | Widget config | API key | website API key | apiKey | config | API key middleware | N/A | Active |
| POST | `/api/widget/init` | Init visitor/session | API key | website API key | visitor/session data | session | Controller | N/A | Active |
| POST | `/api/widget/feedback` | Submit feedback | API key | website API key | feedback payload | result | Controller | N/A | Active |
| POST | `/api/widget/bot-status` | Submit bot status | API key | website API key | status/path metadata | result | Controller | N/A | Active |
| POST | `/api/widget/upload` | Upload widget attachment | API key | website API key | multipart file | file URL | Multer/controller | N/A | Active |
| POST | `/api/widget/lead` | Submit widget lead | API key | website API key | lead payload | customer | Controller | N/A | Active |
| POST | `/api/widget/ticket` | Submit widget ticket | API key | website API key | ticket payload | ticket | Controller | N/A | Active |
| POST | `/api/widget/action` | Execute flow action | API key | website API key | action payload | result | Controller | N/A | Active |

## Users, Roles, Departments, Categories

| Method | URL | Description | Auth | Authorization | Validation | Status |
|---|---|---|---|---|---|---|
| GET | `/api/users/agents` | List agents | JWT | admin/client/manager | Controller | Active |
| POST | `/api/users/agents` | Create agent | JWT | admin/client | Controller | Active |
| PATCH | `/api/users/agents/:id` | Update agent | JWT | admin/client | Controller | Active |
| DELETE | `/api/users/agents/:id` | Delete agent | JWT | admin/client | Controller | Active |
| GET | `/api/users/clients` | List clients | JWT | admin | Controller | Active |
| GET | `/api/users/clients/:id/details` | Client details | JWT | admin | Controller | Active |
| POST | `/api/users/clients` | Create client | JWT | admin | Controller | Active |
| PATCH | `/api/users/availability` | Update availability | JWT | agent/sales/user/client/admin | Controller | Active |
| PATCH | `/api/users/profile` | Update profile | JWT | any | Controller | Active |
| PATCH | `/api/users/preferences` | Update preferences | JWT | any | Controller | Active |
| GET | `/api/roles` | List roles | JWT | route auth | Controller | Active |
| POST | `/api/roles` | Create role | JWT | admin/client | Controller | Active |
| PATCH | `/api/roles/:id` | Update role | JWT | admin/client | Controller | Active |
| DELETE | `/api/roles/:id` | Delete role | JWT | admin/client | Controller | Active |
| GET | `/api/departments` | List departments | JWT | admin/client/manager | Controller | Active |
| POST | `/api/departments` | Create department | JWT | admin/client/manager | Controller | Active |
| PATCH | `/api/departments/:id` | Update department | JWT | admin/client/manager | Controller | Active |
| PATCH | `/api/departments/:id/toggle` | Toggle department | JWT | admin/client/manager | Controller | Active |
| GET | `/api/categories` | List categories | JWT | admin/client/agent/sales | Controller | Active |
| POST | `/api/categories` | Create category | JWT | client/admin/manager | Controller | Active |
| PATCH | `/api/categories/:id` | Update category | JWT | client/admin/manager | Controller | Active |
| DELETE | `/api/categories/:id` | Delete category | JWT | client/admin/manager | Controller | Active |

## Chat and Tickets

| Method | URL | Description | Auth | Authorization | Request/Response | Validation | Pagination | Status |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/chat/admin/sessions` | Admin sessions | JWT | admin | sessions | Controller | UNKNOWN | Active |
| GET | `/api/chat/client/sessions` | Client sessions | JWT | admin/client | sessions | Controller | UNKNOWN | Active |
| GET | `/api/chat/agent/sessions` | Agent sessions | JWT | agent/sales/user | sessions | Controller | UNKNOWN | Active |
| GET | `/api/chat/sessions` | Role-routed sessions | JWT | any | sessions | Controller | UNKNOWN | Active |
| GET | `/api/chat/queued` | Queued sessions | JWT | admin/client | sessions | Controller | UNKNOWN | Active |
| GET | `/api/chat/history` | Chat history | JWT | admin/client/manager | history | Controller | Filters present in UI | Active |
| GET | `/api/chat/sessions/:sessionId/messages` | Session messages | JWT | any scoped | messages | Controller | NOT FOUND | Active |
| PATCH | `/api/chat/sessions/:sessionId/accept` | Accept session | JWT | admin/client/agent/sales/user | session | Controller | N/A | Active |
| PATCH | `/api/chat/sessions/:sessionId/close` | Close session | JWT | any scoped | session | Controller | N/A | Active |
| POST | `/api/chat/upload` | Chat attachment | JWT | any scoped | file | Multer | N/A | Active |
| POST | `/api/tickets/submit` | Public visitor ticket | Public | API key/body | ticket | Zod | N/A | Active |
| GET | `/api/tickets/public/:ticketId` | Public ticket status | Public | ticket id | ticket | Controller | N/A | Active |
| GET | `/api/tickets` | List tickets | JWT | admin/client/manager/agent/sales | tickets | Controller | Query filters | Active |
| POST | `/api/tickets/convert` | Chat to ticket | JWT | admin/client/manager/agent/sales | ticket | Zod | N/A | Active |
| PATCH | `/api/tickets/:id` | Update ticket | JWT | role scoped | ticket | Zod | N/A | Active |
| DELETE | `/api/tickets/:id` | Delete ticket | JWT | admin/client/manager | result | Controller | N/A | Active |

## CRM

| Method | URL | Description | Auth | Authorization | Validation | Pagination/Filtering | Status |
|---|---|---|---|---|---|---|---|
| GET | `/api/crm` | List customers/leads | JWT + plan `crm` | CRM roles | Controller | page, limit, status, search, websiteId, ownerId, views | Active |
| POST | `/api/crm` | Create customer/lead | JWT + plan | admin/client/manager/sales | Zod | N/A | Active |
| GET | `/api/crm/search` | CRM search | JWT + plan | CRM roles | Controller | `q` | Active |
| POST | `/api/crm/promote` | Promote visitor to CRM | JWT + plan | admin/client/manager/agent/sales | Controller | N/A | Active |
| POST | `/api/crm/merge` | Merge customers | JWT + plan | admin/client/manager | Zod | N/A | Risk |
| PATCH | `/api/crm/bulk-update` | Bulk update customers | JWT + plan | admin/client/manager | Controller | N/A | Risk |
| DELETE | `/api/crm/bulk-delete` | Bulk delete customers | JWT + plan | admin/client/manager | Controller | N/A | Risk |
| GET | `/api/crm/:id` | Customer profile | JWT + plan | CRM roles | Controller | N/A | Active |
| PATCH | `/api/crm/:id` | Update customer | JWT + plan | admin/client/manager/sales | Zod | N/A | Active |
| DELETE | `/api/crm/:id` | Delete customer | JWT + plan | admin/client/manager | Controller | N/A | Active |
| POST | `/api/crm/:id/archive` | Archive customer | JWT + plan | admin/client/manager | Controller | N/A | Partial |
| GET | `/api/crm/:id/activity` | Customer activity | JWT + plan | CRM roles | Controller | N/A | Active |
| POST | `/api/crm/:id/notes` | Add note | JWT + plan | admin/client/manager/sales | Controller | N/A | Active |
| POST | `/api/crm/:id/send-email` | Send email | JWT + plan | admin/client/manager/sales | Upload/controller | N/A | Active |
| POST | `/api/crm/:id/tasks` | Create follow-up task | JWT + plan | admin/client/manager/sales | Zod | N/A | Active |
| PATCH | `/api/crm/:id/tasks/:taskId` | Update task | JWT + plan | admin/client/manager/sales | Zod | N/A | Active |

## Quotations, Invoices, Reports

| Method | URL | Description | Auth | Authorization | Validation | Status |
|---|---|---|---|---|---|---|
| GET | `/api/crm/:customerId/quotations` | Customer quotes | JWT + plan | CRM finance roles | Controller | Active |
| POST | `/api/crm/quotations` | Create quote | JWT + plan | CRM finance roles | Controller | Active |
| PATCH | `/api/crm/quotations/:id/status` | Update quote status | JWT + plan | CRM roles | Controller | Active |
| PUT | `/api/crm/quotations/:id` | Update quote | JWT + plan | CRM finance roles | Controller | Active |
| DELETE | `/api/crm/quotations/:id` | Delete quote | JWT + plan | CRM finance roles | Controller | Active |
| POST | `/api/crm/quotations/:id/send` | Generate/send quote | JWT + plan | CRM finance roles | Controller | Active |
| POST | `/api/crm/quotations/:id/pay` | Stripe PaymentIntent | JWT + plan | CRM finance roles | Controller | Partial |
| POST | `/api/crm/quotations/:id/approve` | Approve quote | JWT + plan | admin/client/manager | Controller | Partial |
| POST | `/api/crm/quotations/:id/deny` | Deny quote | JWT + plan | admin/client/manager | Controller | Partial |
| GET | `/api/crm/invoices` | List invoices | JWT + plan | finance roles | Controller | Active |
| POST | `/api/crm/invoices` | Create invoice | JWT + plan | finance roles | Controller | Risk |
| PUT | `/api/crm/invoices/:id` | Update invoice | JWT + plan | finance roles | Controller | Risk |
| DELETE | `/api/crm/invoices/:id` | Delete invoice | JWT + plan | finance roles | Controller | Risk |
| POST | `/api/crm/invoices/:id/pdf` | Generate invoice PDF | JWT + plan | finance roles | Controller | Risk |
| GET | `/api/crm/reports` | CRM reports | JWT + plan | admin/client/manager | Controller | Active |
| GET | `/api/crm/reports/won-timeseries` | Won revenue timeseries | JWT + plan | admin/client/manager | Controller | Active |

## Inventory, Procurement, Supplier

| Method | URL | Description | Auth | Authorization | Validation | Status |
|---|---|---|---|---|---|---|
| GET | `/api/inventory/search` | Search items | JWT | admin/client/manager/sales/agent/purchase | Controller | Active |
| GET | `/api/inventory/meta` | Inventory metadata | JWT | admin/client/manager/sales/purchase | Controller | Active |
| GET | `/api/inventory/items` | List items | JWT | admin/client/manager/sales/purchase | Controller | Active |
| POST | `/api/inventory/items` | Create item | JWT | write access | Controller | Active |
| PATCH | `/api/inventory/items/:id` | Update item | JWT | write access | Controller | Active |
| DELETE | `/api/inventory/items/:id` | Delete item | JWT | write access | Controller | Active |
| POST | `/api/inventory/movements` | Create movement | JWT | admin/client/purchase/sales | Controller | Active |
| GET | `/api/procurement/stats` | Procurement stats | JWT | admin/client/manager/purchase/accounts | Controller | Active |
| GET | `/api/procurement/suppliers` | Suppliers | JWT | admin/client/manager/purchase/accounts | Controller | Active |
| POST | `/api/procurement/suppliers` | Create supplier/user | JWT | admin/client/manager/purchase/accounts | Controller | Active |
| GET | `/api/procurement/orders` | List POs | JWT | procurement roles | Controller | Active |
| POST | `/api/procurement/orders` | Create PO | JWT | procurement roles | Controller | Active |
| PATCH | `/api/procurement/orders/:id` | Update PO | JWT | procurement roles | Controller | Active |
| GET | `/api/procurement/rfqs` | List RFQs | JWT | any authenticated before role gate | Controller | Risk |
| POST | `/api/procurement/rfqs` | Create RFQ | JWT | procurement roles | Controller | Active |
| POST | `/api/procurement/rfqs/:id/bids` | Supplier bid | JWT | supplier | Controller | Active |
| POST | `/api/procurement/rfqs/:id/award` | Award RFQ | JWT | procurement roles | Controller | Active |
| GET | `/api/supplier/profile` | Supplier profile | JWT | supplier route middleware | Controller | Active |
| PATCH | `/api/supplier/orders/:id/status` | Supplier order status | JWT | supplier | Controller | Active |

## Analytics, Security, Billing, Flows

| Method | URL | Description | Auth | Authorization | Status |
|---|---|---|---|---|---|
| GET | `/api/analytics` | Manager analytics | JWT | admin/client/manager/accounts | Active |
| GET | `/api/analytics/export/csv` | CSV export | JWT + plan reports | admin/client/manager/accounts | Active |
| GET | `/api/analytics/enterprise/*` | Enterprise analytics modules | JWT | role-specific | Partial |
| GET | `/api/audit-logs` | Audit logs | JWT + plan security | admin/client | Active |
| GET | `/api/webhooks/deliveries` | Webhook deliveries | JWT | admin/client | Active |
| GET | `/api/billing/status` | Subscription status | JWT | any user | Active |
| GET | `/api/billing/admin/all` | Subscription admin list | JWT | admin/accounts in controller | Active |
| POST | `/api/billing/checkout` | Stripe checkout | JWT | client/admin in controller | Partial |
| POST | `/api/billing/mock-checkout` | Mock subscription activation | JWT | any authenticated in route | Risk |
| POST | `/api/billing/portal` | Stripe billing portal | JWT | stripe customer required | Partial |
| POST | `/api/stripe-webhooks/stripe` | Stripe webhook | Raw body | Stripe signature expected | Partial |
| GET/POST/PATCH/DELETE | `/api/flows/*` | Flow builder CRUD/analytics/templates | JWT | website scope | Partial |
| POST | `/api/tracking/pageview` | Log pageview | Public | none | Partial |

## Missing APIs

- `/api/knowledge-base/articles`
- `/api/knowledge-base/categories`
- tax/GST settings
- invoice number series
- recurring invoices
- refunds/returns
- import/export jobs
- API key management
- webhook retry management
- backup/restore

