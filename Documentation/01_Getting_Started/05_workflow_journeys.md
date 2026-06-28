# Platform Workflow Journeys

This document details the core workflows and end-to-end user journeys implemented in JTS Chat Support. It outlines flow diagrams, decision points, validations, success scenarios, failure scenarios, permissions, dependencies, and business rules for each process.

---

## 1. User Registration & Client Account Setup

### Overview
The starting point for a new tenant client account. This workflow registers a client user, allocates a tenant space, and directs them to setup pages.

### Flow Diagram
```mermaid
graph TD
  A[Guest User] -->|Fills Register Form| B{Backend Validates Email}
  B -->|Email Exists| C[Return 409 Conflict Error]
  B -->|Valid Email| D{Valid Password?}
  D -->|Password < 8 chars| E[Return 400 Validation Error]
  D -->|Valid Password| F[Hash Password & Create User]
  F --> G[Generate JWT Token & Set Cookies]
  G --> H[Redirect to /client Workspace]
```

### Details
-   **Decision Points**: Whether to register as a client (self-service) or sign in as an existing user.
-   **Validations**:
    -   *Frontend*: Matches format validations for email structure and password matching.
    -   *Backend*: Mongoose database checks for unique email indexes. Password length checked on controllers.
-   **Success Scenario**: User registration completes, database adds Client profile with Pro-tier defaults, dashboard redirects to `/client`.
-   **Failure Scenario**: Conflict exceptions (409) if the email address is already registered; rate limits lock (429) if requests exceed 5 attempts in 15 minutes.
-   **Permissions**: Publicly accessible.
-   **Dependencies**: MongoDB (`User` collection).
-   **Business Rules**: Public sign-ups are assigned the `client` role. Max login lock is 5 attempts per 15 minutes.

---

## 2. Subscription Upgrade & Feature Gating

### Overview
Gating platform modules and resource limits based on subscription tier status.

### Flow Diagram
```mermaid
graph TD
  A[Client Owner] -->|Clicks Upgrade Plan| B{Backend Checks Node Environment}
  B -->|Development/Staging| C[Allow Mock Sandbox Checkout]
  B -->|Production| D[Initiate Stripe Checkout Session]
  C --> E[Save Subscription Plan Status Active]
  D --> F[Redirect to Stripe Payment Page]
  F -->|Payment Successful| G[Stripe Emits Webhook event]
  G --> E
  E --> H[Update User limits & enabledModules]
```

### Details
-   **Decision Points**: Choose Basic, Standard, or Pro pricing tier; select Stripe gateway vs Mock Sandbox checkout.
-   **Validations**:
    -   Price ID matches configured environment keys.
    -   Verify customer user signature on Stripe webhook.
-   **Success Scenario**: Payment completes, subscription status updates to `active`, limits increment (e.g. 20 agents, 10 sites for Pro), and CRM/ticket tabs unlock in the UI.
-   **Failure Scenario**: Stripe webhook signature verification fails (400), card declined by gateway, or mock billing attempted in a production environment (blocked with a 403 response).
-   **Permissions**: Client, Admin roles.
-   **Dependencies**: Stripe Payment Gateway, Stripe Webhook endpoints.
-   **Business Rules**:
    -   *Basic*: Chat, Shortcuts, Security. Limits: 2 agents, 1 website.
    -   *Standard*: Chat, Tickets, Shortcuts, Reports, Security. Limits: 5 agents, 2 websites.
    -   *Pro*: Chat, Tickets, CRM, Shortcuts, Reports, Security. Limits: 20 agents, 10 websites.

---

## 3. Website Configuration & Tracking Snippet Deployment

### Overview
Connecting client website domains to JTS Chat Support using embed scripts and API keys.

### Flow Diagram
```mermaid
graph TD
  A[Client Owner] -->|Enters Site Name & Domain| B[Database creates Website record]
  B --> C[Generate Cryptographic apiKey]
  C --> D[Generate Javascript Embed Snippet]
  D -->|Admin installs script on target Site| E[Visitor loads site]
  E -->|Script calls /api/tracking/pageview| F[Log ActivityEvent under Website scope]
```

### Details
-   **Decision Points**: Allocate domain names, select colors, set welcome messages.
-   **Validations**: Checks domain format and ensures unique website ID.
-   **Success Scenario**: API key generated, snippet copied to client site, visitor hits are recorded as `page_view` events in the database.
-   **Failure Scenario**: Widget requests blocked by CORS rules if the origin header does not match client domain listings.
-   **Permissions**: Client, Admin roles.
-   **Dependencies**: Mongoose `Website` model, Express static served public folder.

---

## 4. Visual Flow Builder & Custom Bot Deployment

### Overview
Designing the visual node tree configurations for automated visitor widget onboarding flows.

### Flow Diagram
```mermaid
graph TD
  A[Admin/Client] -->|Builds Node Tree| B{Flow Builder Diagnostics Check}
  B -->|Broken links or no root| C[Display Validation Error & Block Save]
  B -->|Valid Flow Tree| D[Save Flow payload to Database]
  D --> E[Activate Flow ID on Website]
  E -->|Visitor opens widget| F[Widget renders interactive nodes]
```

### Details
-   **Decision Points**: Construct Message, Button, Form, Action, or Condition nodes.
-   **Validations**:
    -   *Root Node Validation*: Checks if a node named `root` exists.
    -   *Broken Link Check*: Checks if any node refers to a missing next node.
    -   *Orphan Check*: Identifies nodes that are not linked from other nodes.
-   **Success Scenario**: Flow is published, visitor widget loads visual buttons and custom forms.
-   **Failure Scenario**: Validation errors (e.g. broken node link) block save operations.
-   **Permissions**: Client, Admin roles.
-   **Dependencies**: `Flow` and `Website` schemas.

---

## 5. Staff Account Creation & Workload Balance

### Overview
Inviting team members, assigning security roles, selecting website scopes, and auto-balancing active queue routing.

### Flow Diagram
```mermaid
graph TD
  A[Admin/Client] -->|Enters Staff Info| B{Verify Subscription limits}
  B -->|Agents limit exceeded| C[Show Limit Upgrade Required Dialog]
  B -->|Limits Available| D[Verify unique Email]
  D -->|Email conflict| E[Show Error Alert]
  D -->|Valid input| F[Save User with custom Role]
  F --> G[Agent logs in & sets Available]
  G -->|Visitor chat arrives| H[System routes to Agent with lowest Workload]
```

### Details
-   **Decision Points**: Select role (Agent, Manager, Sales, etc.), max concurrent workload, assigned website checkmarks.
-   **Validations**: Checks unique email index, confirms role value exists in Role database, limits max workload value to integers.
-   **Success Scenario**: Agent profile is active, logs in, sets availability to online, and receives incoming chats.
-   **Failure Scenario**: User creation fails if active agents count is equal to the subscription limit.
-   **Permissions**: Client, Admin roles.
-   **Dependencies**: `Role` and `User` database models.
-   **Business Rules**: Chats are routed to online agents who have not reached their `maxWorkload` limit, prioritizing agents with the lowest current workload.

---

## 6. Live Chat to Ticket Lifecycle & SLA Escalations

### Overview
Converting a live visitor session to a support ticket, tracking SLA compliance, and monitoring ticket lifecycle stages.

### Flow Diagram
```mermaid
graph TD
  A[Visitor opens Widget] --> B[Socket.IO initiates ChatSession]
  B --> C[Agent claims Chat Session]
  C -->|Clicks Convert to Ticket| D[Zod validates Ticket payload]
  D --> E[Ticket created in database]
  E --> F[Calculate SLA firstResponseDueAt]
  F --> G[Visitor receives Status Link]
  G -->|SLA breaches without agent action| H[Trigger SLA Breach Notification]
  G -->|Agent resolves case| I[Set Status Resolved & Close Ticket]
```

### Details
-   **Decision Points**: Set ticket priority (low, medium, high, urgent), categorize issue, and assign to departments.
-   **Validations**: Zod validation checks for required subject lines, valid category IDs, and website scopes.
-   **Success Scenario**: Ticket is created, visitor receives a tracking link, agent updates status to resolved, and SLA stopwatch resets.
-   **Failure Scenario**: Target ticket fields fail schema validation, or agent attempts to convert a deleted chat session.
-   **Permissions**: Any authenticated dashboard user (Agent, Sales, Manager, Client, Admin).
-   **Dependencies**: `Ticket`, `ChatSession`, and `Visitor` database models.
-   **Business Rules**:
    -   *First Response SLA*: Countdown duration configured in minutes (`SLA_QUEUE_ALERT_MINUTES`).
    -   *Resolution SLA*: Countdown duration configured in hours (`SLA_TICKET_ALERT_HOURS`).
    -   Breached tickets are colored red in the UI and trigger alerts to managers.

---

## 7. Live Chat to Sales CRM Lead Qualification

### Overview
Promoting website visitors to CRM sales leads, analyzing engagement metrics, and moving prospects through the pipeline.

### Flow Diagram
```mermaid
graph TD
  A[Visitor starts chat inquiry] --> B[Agent promotes ChatSession to CRM Lead]
  B --> C[Database checks for duplicates email/phone/company]
  C -->|Duplicate Found| D[Log warning event in CRM timeline]
  C -->|No duplicate| E[Create Customer record]
  E --> F[AI calculates Win Probability & Churn Risks]
  F --> G[Sales Executive qualifiers follow NBA alerts]
  G --> H[Update Pipeline stage to Won]
```

### Details
-   **Decision Points**: Decide deal value, interest levels, expected close date, and pipeline stage (New, Contacted, Qualified, Proposal, Negotiation, Won, Lost).
-   **Validations**:
    -   Checks duplicate entries based on email and phone numbers.
    -   Verifies expected close date is a future date.
-   **Success Scenario**: Lead card appears on the Sales Kanban board, AI recommendations display, and the sales executive updates follow-up tasks.
-   **Failure Scenario**: Lead update fails if the sales user does not have permission to modify active deals.
-   **Permissions**: Sales, Manager, Client, Admin roles.
-   **Dependencies**: `Customer`, `FollowUpTask`, and `Message` models.
-   **Business Rules**: If a lead remains unowned or has no logged interactions for `CRM_LEAD_REASSIGN_MINUTES`, the backend automatically reassigns it to another active sales owner.

---

## 8. CRM Won Deals to Procurement and Vendor Fulfillment

### Overview
Transitioning won sales contracts to the Procurement workspace, ordering inventory from preferred suppliers, and updating stock levels.

### Flow Diagram
```mermaid
graph TD
  A[Sales marks CRM lead Won] --> B[CRM locks Lead & submits Handoff]
  B --> C[Purchase Desk receives Handoff request]
  C --> D[Purchase Coordinator drafts Purchase Order PO]
  D -->|Selects Preferred Vendor| E[Generate PO PDF & Send to Supplier]
  E --> F[Supplier logs in & clicks Accept PO]
  F -->|Ships inventory & uploads Invoice URL| G[Mark PO Shipped & Delivered]
  G --> H[Confirm Delivery / Stock In]
  H --> I[Auto-increment inventory levels & log InventoryMovement]
```

### Details
-   **Decision Points**: Create direct Purchase Order (PO) to preferred supplier or submit Request for Quotations (RFQ) to multiple suppliers.
-   **Validations**:
    -   Verify the selected vendor is active.
    -   Ensure purchase order details match inventory SKU configurations.
-   **Success Scenario**: Supplier fulfills the PO, uploads a digital invoice link, the purchase desk confirms delivery, and inventory stock balances auto-increment.
-   **Failure Scenario**: Purchase order generation is blocked if the associated CRM deal is not in the *Won* stage or is missing financial parameters.
-   **Permissions**: Sales (Won stage updates), Purchase (PO drafting, Stock In), Supplier (PO acceptance, invoice upload).
-   **Dependencies**: `PurchaseOrder`, `Supplier`, `InventoryItem`, and `InventoryMovement` schemas.
-   **Business Rules**: PO delivery confirmation triggers an automatic `in` type `InventoryMovement` entry, updating stock balances in the item master.

---

## 9. Invoice Verification & Financial Ledger Reconciliation

### Overview
Processing customer-facing invoices and reconciling incoming supplier invoices against purchase order registers in the financial ledger.

### Flow Diagram
```mermaid
graph TD
  A[Supplier uploads Invoice URL & Amount] --> B[Accounts user reviews Invoices queue]
  B --> C[Compare Invoice total with PO total]
  C -->|Total mismatch| D[Flag transaction as Discrepancy for Audit]
  C -->|Totals match| E[Reconcile Ledger status]
  E --> F[Update transactional journal to Reconciled]
  F --> G[Generate PDF billing receipts]
```

### Details
-   **Decision Points**: Confirm payment reconciliation; flag discrepant transactions.
-   **Validations**: Checks that the uploaded invoice amount matches the associated PO total.
-   **Success Scenario**: Transaction matches, ledger status updates to *Reconciled*, expense journal records update, and receipt PDFs are generated.
-   **Failure Scenario**: Mismatched totals block automatic reconciliation and flag the transaction in the ledger tab.
-   **Permissions**: Accounts, Client, Admin roles.
-   **Dependencies**: `Invoice`, `PurchaseOrder`, and `User` (Billing profiles) models.
-   **Business Rules**: Discrepant invoices are highlighted in red on the ledger dashboard and require manual override by an Accounts user or Administrator.

---

## 10. Performance Reporting & Data Exports

### Overview
Aggregating conversation wait times, SLA breaches, sales revenue, and supplier fulfillment metrics to generate export-ready reports.

### Flow Diagram
```mermaid
graph TD
  A[Manager/Client/Admin requests Report] --> B{Verify Website Scope Permissions}
  B -->|Scope check fails| C[Block request with 403 Forbidden]
  B -->|Scope check passes| D[Aggregate activity logs & metrics]
  D --> E[Render charts: growth, SLA compliance, revenue]
  E -->|User clicks Export CSV| F[Generate and download CSV sheet]
```

### Details
-   **Decision Points**: Select date range preset (7d, 30d, 90d, custom), filter by website domain, and group by agent or supplier.
-   **Validations**: Verify that the user has permission to access the requested website scope.
-   **Success Scenario**: Charts populate, and CSV download matches the selected filters.
-   **Failure Scenario**: Empty analytics dashboards if query timestamps fall outside database ranges.
-   **Permissions**: Manager, Accounts, Client, Admin roles.
-   **Dependencies**: `ActivityEvent`, `ChatSession`, `Ticket`, and `Invoice` schemas.
-   **Business Rules**: Enterprise data is aggregated on demand. The client scope is restricted to their website IDs; global admins can query data across all tenants.

---

## Related Articles
*   [Quick Start Role Guide](file:///e:/Chat%20Support/Documentation/01_Getting_Started/02_quick_start.md)
*   [Sales Lead Pipelines](file:///e:/Chat%20Support/Documentation/13_CRM/01_lead_pipeline.md)
*   [Support Ticket SLA Management Policies](file:///e:/Chat%20Support/Documentation/14_Tickets/02_sla_management.md)
