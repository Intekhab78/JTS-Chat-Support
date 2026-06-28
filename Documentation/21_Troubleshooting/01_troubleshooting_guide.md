# Troubleshooting Guide & Operational Runbooks

This guide provides support engineering runbooks for troubleshooting authentication failures, billing blocks, widget disconnections, queue allocation limits, flow builder validation errors, sales transition constraints, and background SLA escalations in JTS Chat Support.

---

## 1. Authentication & Session Recovery

### 1.1 Device Clock-Drift OTP Lockout
*   **Problem**: Authenticator codes are rejected on the login screen.
*   **Symptoms**: The console displays a red alert: "Invalid authentication code. Please try again."
*   **Possible Causes**: The visitor's or agent's mobile device clock has drifted out of sync with the system time by more than 30 seconds.
*   **Resolution Steps**:
    1.  On the mobile device, navigate to **Settings** -> **System** -> **Date & Time**.
    2.  Toggle **Set Time Automatically** (or sync clock with network).
    3.  Attempt login again.
    4.  *Fallback*: If the device is out of sync permanently, an administrator must clear the user's 2FA configurations in the database.
*   **Validation**: Confirm the next generated code is accepted and initiates a redirect.
*   **Prevention**: Advise users during setup to enable automatic network-provided time sync.
*   **Related Module**: Authentication
*   **Related APIs**: `POST /api/auth/login`
*   **Related Settings**: Two-Factor Authentication
*   **Related Database Tables**: [User Model](file:///backend/src/models/User.js) (fields: `twoFactor.secret`, `twoFactor.enabled`)
*   **Screenshot Checklist**: `login_2fa_prompt.png`

---

## 2. Billing & Subscription Quotas

### 2.1 Website Count Limit Block
*   **Problem**: Creating a new website fails with a quota error.
*   **Symptoms**: The creation modal displays: "Your plan allows up to X websites."
*   **Possible Causes**: The tenant has reached the website domain limit for their current plan.
*   **Resolution Steps**:
    1.  Navigate to the Billing dashboard (`/client?tab=billing`).
    2.  Select a higher tier (Standard or Pro) and complete the upgrade.
    3.  Alternatively, delete an unused website to free up capacity.
*   **Validation**: Check the website limits bar in the settings tab to verify quota slots are available.
*   **Prevention**: Monitor limits usage in the billing tab before adding new domains.
*   **Related Module**: Billing & Subscriptions
*   **Related APIs**: `POST /api/websites`
*   **Related Settings**: Website Limits
*   **Related Database Tables**: [Website Model](file:///backend/src/models/Website.js) and [User Model](file:///backend/src/models/User.js)
*   **Screenshot Checklist**: `website_limit_error.png`

### 2.2 Mock Billing Production Lockout
*   **Problem**: Sandbox mock payments fail with an error.
*   **Symptoms**: Clicking the mock payment button returns a `403 Forbidden` error with the message "Mock billing is disabled."
*   **Possible Causes**: Attempting mock checkout in production or when `ENABLE_MOCK_BILLING` is set to false.
*   **Resolution Steps**:
    1.  Access the server environment configuration files.
    2.  Set `ENABLE_MOCK_BILLING=true` in `backend/.env` (development only).
    3.  Restart the backend server.
*   **Validation**: Verify that clicking the mock billing card updates the plan status to active.
*   **Prevention**: Disable mock checkout on production servers to prevent billing bypasses.
*   **Related Module**: Billing & Subscriptions
*   **Related APIs**: `POST /api/billing/mock-checkout`
*   **Related Settings**: Sandbox Configuration
*   **Related Database Tables**: [User Model](file:///backend/src/models/User.js)
*   **Screenshot Checklist**: `mock_billing_error.png`

---

## 3. Website & Widget Integration

### 3.1 Chat Widget Stuck on "Connecting to support..."
*   **Problem**: The chat widget panel displays a connection timeout.
*   **Symptoms**: The widget expands but stays on "Connecting to support..." without loading messages.
*   **Possible Causes**: CORS origin restrictions or network connectivity issues between the widget and the backend.
*   **Resolution Steps**:
    1.  Inspect the browser console for CORS errors.
    2.  Verify the backend server is running and accessible on port `5000`.
    3.  Verify `WIDGET_PUBLIC_URL` is set correctly in `.env`.
*   **Validation**: Confirm the status bar changes to "Connected" after loading the widget.
*   **Prevention**: Add new website domains to the settings dashboard before embedding the tracking script.
*   **Related Module**: Chat Widget
*   **Related APIs**: `GET /api/widget/config`
*   **Related Settings**: CORS Configurations
*   **Related Database Tables**: [Website Model](file:///backend/src/models/Website.js)
*   **Screenshot Checklist**: `widget_connection_timeout.png`

---

## 4. Live Chat Operations

### 4.1 Agent Active Chat Limit Block
*   **Problem**: An agent cannot claim an incoming chat.
*   **Symptoms**: Clicking Claim Session displays a red error: "You can only handle up to 5 active visitors at a time."
*   **Possible Causes**: The agent has reached the maximum of 5 concurrent active chats.
*   **Resolution Steps**:
    1.  Navigate to the Active Chat Queue (`/agent?tab=chats`).
    2.  Review your active conversations in the **My Active Chats** column.
    3.  Close resolved sessions to free up capacity.
*   **Validation**: Verify that your active chat count is below 5, then attempt to claim a new chat.
*   **Prevention**: Close chat sessions promptly once the issue is resolved.
*   **Related Module**: Live Chat
*   **Related APIs**: `PATCH /api/chats/sessions/:sessionId/accept`
*   **Related Settings**: Active Limits
*   **Related Database Tables**: [ChatSession Model](file:///backend/src/models/ChatSession.js)
*   **Screenshot Checklist**: `chat_claim_limit_error.png`

---

## 5. Chat Flow Builder

### 5.1 Flow Validation Failure Block
*   **Problem**: Saving a flow in the builder fails with validation errors.
*   **Symptoms**: The save button is disabled or displays a validation warning listing broken connections.
*   **Possible Causes**: Options or next fields point to deleted or missing nodes.
*   **Resolution Steps**:
    1.  Open the diagnostics panel in the Flow Builder.
    2.  Identify the listed errors (e.g. `BROKEN_LINK` or `MISSING_ROOT`).
    3.  Update the connections in the configuration panel to link options to valid nodes.
*   **Validation**: Confirm the validation badge turns green and the flow saves successfully.
*   **Prevention**: Avoid deleting nodes that are linked to other options in the flow.
*   **Related Module**: Flow Builder
*   **Related APIs**: `POST /api/flows/:id/validate`
*   **Related Settings**: Flow Validation
*   **Related Database Tables**: [Flow Model](file:///backend/src/models/Flow.js)
*   **Screenshot Checklist**: `flow_validation_error.png`

---

## 6. CRM & Customer Management

### 6.1 Sales Rep Transition Block
*   **Problem**: A sales representative cannot move a lead card on the Kanban board.
*   **Symptoms**: Dragging a card to the Won or Lost column is blocked and displays a permission error.
*   **Possible Causes**: Sales representatives are restricted from setting deal statuses to won or lost.
*   **Resolution Steps**:
    1.  Review the lead details and confirm the deal is ready to close.
    2.  Request a manager or administrator to update the lead status.
*   **Validation**: Verify the manager can update the card status to won or lost.
*   **Prevention**: Train sales reps to request manager approval to close deals.
*   **Related Module**: CRM
*   **Related APIs**: `PATCH /api/crm/:id`
*   **Related Settings**: Sales Permissions
*   **Related Database Tables**: [Customer Model](file:///backend/src/models/Customer.js)
*   **Screenshot Checklist**: `crm_transition_error.png`

---

## 7. Support Ticketing

### 7.1 Support Ticket SLA Breach Alert
*   **Problem**: A ticket breaches its resolution target.
*   **Symptoms**: Notifications are sent to the agent and manager indicating a breach.
*   **Possible Causes**: The ticket resolution time has exceeded its SLA target based on its priority level.
*   **Resolution Steps**:
    1.  Open the Tickets tab and locate the breached ticket.
    2.  Review the conversation history and reply to the customer.
    3.  If necessary, escalate or transfer the ticket to a senior resource.
*   **Validation**: Confirm the ticket status updates to Resolved.
*   **Prevention**: Monitor resolution due dates in the tickets table to resolve issues before they breach SLA targets.
*   **Related Module**: Support Ticketing
*   **Related APIs**: `PATCH /api/tickets/:id`
*   **Related Settings**: SLA Target Configurations
*   **Related Database Tables**: [Ticket Model](file:///backend/src/models/Ticket.js)
*   **Screenshot Checklist**: `ticket_sla_breach.png`

---

## 8. Heuristics AI Assistant

### 8.1 Critical Sentiment Alert Interventions
*   **Problem**: Customer sentiment is flagged as critical.
*   **Symptoms**: The supervisor receives a Critical Sentiment Alert notification.
*   **Possible Causes**: The visitor has sent multiple negative messages, lowering their sentiment score below `-0.6`.
*   **Resolution Steps**:
    1.  Click the notification link to open the active chat session.
    2.  Review the message thread to understand the customer's issue.
    3.  Take over the conversation from the bot or current agent to resolve the issue.
*   **Validation**: Confirm the visitor's sentiment improves and the chat is resolved.
*   **Prevention**: Design bot flows to escalate to a live agent early if negative keywords are detected.
*   **Related Module**: AI Assistant
*   **Related APIs**: `POST /api/widget/visitor`
*   **Related Settings**: Heuristics Sentiment Rules
*   **Related Database Tables**: [ChatSession Model](file:///backend/src/models/ChatSession.js)
*   **Screenshot Checklist**: `ai_sentiment_alert.png`

---

## 9. Reports & Dashboards

### 9.1 Dashboard Preferences Resetting
*   **Problem**: Reordered KPI cards reset on page reload.
*   **Symptoms**: Custom widget layouts are lost when refreshing the page.
*   **Possible Causes**: Failures saving preferences to the backend user profile API.
*   **Resolution Steps**:
    1.  Check the browser console network tab for errors on `/api/users/preferences` requests.
    2.  Verify the backend server is running and database updates are succeeding.
*   **Validation**: Customize the layout, reload the page, and verify the custom order persists.
*   **Prevention**: Ensure database write permissions are active for user profiles.
*   **Related Module**: Reports & Analytics
*   **Related APIs**: `PATCH /api/users/preferences`
*   **Related Settings**: Dashboard Preferences
*   **Related Database Tables**: [User Model](file:///backend/src/models/User.js) (field: `dashboardPreferences.executiveLayout`)
*   **Screenshot Checklist**: `reports_layout_save.png`
