# Billing & Subscription Plan Administration

This document describes how subscriptions are managed, features are gated, and billing options (Stripe vs Mock Checkout) are administered in JTS Chat Support.

---

## 1. Overview & Business Purpose

JTS Chat Support operates on a SaaS billing model. Subscriptions determine:
1.  **Module Access**: Enabled features (e.g., tickets, CRM tools, or advanced reporting).
2.  **Resource Limits**: The maximum number of websites and agent profiles a client tenant can create.
3.  **Billing Invoicing**: Credit card payments processed securely through Stripe Checkout and managed in Stripe's Customer Portal.

---

## 2. Navigation Paths

*   **Tenant Billing Settings**: `/client?tab=billing` or `/admin?tab=subscriptions` (depending on role).
*   **Accounts Billing Auditor**: `/accounts?tab=billing` (workspace tab for accountants).

---

## 3. User Roles & Required Permissions

*   **Client Owner Privileges**: Only users holding the `client` (or `admin`) role can initiate Stripe portal sessions or alter subscription tiers.
*   **Administration Access**: Global admin and accounts roles can audit all client subscription states.

---

## 4. Prerequisites

*   **Stripe Price IDs Configured**: For production, the Stripe Price IDs (Product Price API codes) for basic, standard, and pro plans must be set in the `backend/.env` file.
*   **Stripe Webhook Registered**: The backend webhook route (`/api/stripe-webhooks`) must be configured to process incoming payment events from Stripe.

---

## 5. Step-by-Step Instructions

### 5.1 Reviewing Your Subscription Status
1.  Log in as a Client Owner.
2.  Navigate to the **Billing** tab in the sidebar.
3.  The console will display:
    -   Your current **Active Plan** title (Basic, Standard, Pro).
    -   **Subscription Status** indicator (trial, active, suspended, expired).
    -   **Resource Utilization** bars (showing current vs maximum agents and websites).
    -   **Enabled Modules** list.

### 5.2 Upgrading / Changing Plans via Stripe
1.  Go to the Billing dashboard.
2.  Click **Upgrade Plan** on the target tier card.
3.  The application will request a Stripe Checkout session from the API (`/api/billing/checkout`) and redirect your browser to the secure Stripe hosting gateway.
4.  Enter your credit card details and confirm the transaction.
5.  On completion, Stripe will redirect you back to `/client?tab=billing&success=true`.

### 5.3 Accessing the Stripe Customer Billing Portal
1.  Navigate to the Billing tab.
2.  Click **Manage Billing Account**.
3.  The API request (`/api/billing/portal`) will redirect your browser to the Stripe billing portal.
4.  Update your billing information and click **Return to JTS Chat Support** to return to your dashboard.

### 5.4 Performing Mock Sandbox Payments (Staging / Local Testing Only)
1.  Select the target plan card in the Billing settings interface.
2.  Click **Activate Plan (Mock Payment)**.
3.  The client app calls the mock API endpoint `/api/billing/mock-checkout`.
4.  The server updates the database status to **Active** and sets the plan limits instantly, simulating a successful Stripe webhook payment.

---

## 6. Field & Button Reference

### 6.1 Schema Subscription Parameters
*   **subscription.plan**: Activated billing tier: `basic`, `standard`, or `pro`.
*   **subscription.status**: Billing status: `trial`, `active`, `suspended`, or `expired`.
*   **limits.agents**: Maximum allowed agents.
*   **limits.websites**: Maximum website domain instances allowed.
*   **enabledModules**: Permitted modules: `chat`, `tickets`, `crm`, `shortcuts`, `reports`, `security`.

### 6.2 Button Actions
*   **Upgrade Plan**: Initiates a Stripe Checkout session.
*   **Manage Billing Account**: Redirects to Stripe Customer Portal.
*   **Activate Plan (Mock Payment)**: Triggers local mock billing updates.

---

## 7. Plan Tiers & Specifications

The platform dynamically enforces the following definitions (configured in `planUtils.js`):

| Feature / Limit | Basic Tier | Standard Tier | Pro Tier (Default) |
| :--- | :--- | :--- | :--- |
| **Active Agents Limit** | Max 2 Agents | Max 5 Agents | Max 20 Agents |
| **Website Domains Limit** | Max 1 Website | Max 2 Websites | Max 10 Websites |
| **Live Chat** | Included | Included | Included |
| **Canned Shortcuts** | Included | Included | Included |
| **Security Center / 2FA** | Included | Included | Included |
| **Ticketing Desk & SLAs** | Locked | Included | Included |
| **CRM Pipelines & Quotes** | Locked | Locked | Included |
| **Advanced Reports** | Locked | Included | Included |

---

## 8. Operational Flows

### 8.1 Success Flow (Stripe Webhook Update)
1.  Stripe processes a successful subscription payment.
2.  Stripe sends a webhook event `customer.subscription.created` (or updated) to the backend.
3.  The server validates the payload, updates the database, and increments the plan limits.
4.  The client's workspace modules unlock instantly on the next page reload.

### 8.2 Failure Flow (Stripe Redirection Failure)
1.  Client clicks Upgrade Plan, but `STRIPE_SECRET_KEY` is missing on the server.
2.  The API returns a `500 Internal Server Error`.
3.  The frontend displays: "Stripe API key is missing. Please set STRIPE_SECRET_KEY in your .env file."
4.  Redirection is blocked, keeping the user on the billing dashboard.

---

## 9. API Reference & Database Models

### 9.1 Endpoints List
*   `POST /api/billing/checkout` (Generates Stripe Checkout session).
*   `POST /api/billing/portal` (Generates Stripe Customer Portal session).
*   `GET /api/billing/status` (Retrieves user subscription limits).
*   `POST /api/billing/mock-checkout` (Performs sandbox mock upgrades).

### 9.2 Models In Use
*   [User Model](file:///backend/src/models/User.js): Holds subscription objects.

---

## 10. Business Rules

*   **Production Mock Billing Lock**: The mock checkout endpoint `/api/billing/mock-checkout` is restricted. If `NODE_ENV=production` and mock billing is disabled, any request to it returns a `403 Forbidden` error.
*   **Grace Period**: If a subscription transaction fails, Stripe will retry payments over a 7-day grace period. If it fails permanently, the status becomes `suspended`, locking the dashboard.

---

## 11. Troubleshooting & FAQ

### Issue: Stripe redirected successfully, but the plan is still locked
*   **Probable Cause**: The backend server has not received the webhook notification from Stripe.
*   **Resolution**: Wait 1–2 minutes and refresh the page. Check the Stripe dashboard for webhook delivery status.

### Issue: "Mock billing is disabled." error message
*   **Probable Cause**: Attempting mock checkout in production or when `ENABLE_MOCK_BILLING` is false.
*   **Resolution**: Set `ENABLE_MOCK_BILLING=true` in `backend/.env` (development only) to bypass Stripe integration.

---

## 12. Best Practices

*   **Set Up Webhook Security**: Always verify the webhook signing secret in production to prevent spoofed requests from granting unauthorized subscription upgrades.
*   **Avoid Committing env Secrets**: Never commit `.env` files containing Stripe keys to source repositories.

---

## 13. Screenshot & Video Checklists

### Screenshot 1: Billing Dashboard
*   **Screenshot Name**: `billing_dashboard.png`
*   **Page**: `/client?tab=billing`
*   **Screen Location**: Central pricing cards and status bars.
*   **Why it is needed**: Shows current resource limits utilization and available upgrade options.
*   **Annotation required**: Callouts showing limit bars, active plan status, and upgrade buttons.
*   **Highlight areas**: Pricing cards buttons.
*   **Zoom areas**: None.

### Video Walkthrough: Subscription Upgrade Flow
*   **Recording Name**: `billing_upgrade_flow`
*   **Target Page**: `/client?tab=billing`
*   **Actions to Record**: Open Billing tab -> Click Upgrade on Pro card -> Complete Stripe sandbox checkout form -> Redirect back to dashboard -> Verify updated limits.
*   **Duration Limit**: Max 30 seconds.

---

## 14. Related Documentation

*   [Registration, Login, and Session Gateway](file:///e:/Chat%20Support/Documentation/02_Account/01_registration_login.md)
*   [Website Management and Scoping](file:///e:/Chat%20Support/Documentation/04_Website/01_website_management.md)
*   [Outbound SMTP Server Setup](file:///e:/Chat%20Support/Documentation/18_Settings/01_system_configurations.md)
