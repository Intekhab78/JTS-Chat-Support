# Frequently Asked Questions (FAQ)

This document contains answers to frequently asked questions about JTS Chat Support, organized by module and difficulty level.

---

## 1. Authentication & Security FAQs

### 1.1 [Basic] Why is my account locked out after multiple login failures?
*   **Question**: I received a "Too many login attempts" error. Why did this happen?
*   **Short Answer**: Your account has been temporarily locked due to security rate limits.
*   **Detailed Explanation**: The backend login gateway implements rate limiting to prevent brute-force attacks. If an IP address registers more than 5 failed login attempts within a 15-minute window, further authentication requests are blocked.
*   **Common Cause**: Typing an incorrect password or attempting to log in repeatedly.
*   **Resolution**: Wait 15 minutes for the rate limit to reset, or contact your administrator to verify your credentials.
*   **Related Documentation**: [Registration, Login, and Session Gateway](file:///e:/Chat%20Support/Documentation/02_Account/01_registration_login.md)
*   **Related Screenshots**: `login_rate_limit_error.png`

### 1.2 [Intermediate] How do I recover my account if I lose my 2FA device?
*   **Question**: I lost access to my authenticator app. How can I log in?
*   **Short Answer**: An administrator must manually disable 2FA for your account in the database.
*   **Detailed Explanation**: For security, JTS Chat Support does not generate automated backup recovery codes. If you lose your 2FA device, you cannot bypass the login screen.
*   **Common Cause**: Lost, broken, or replaced mobile device containing the authenticator app.
*   **Resolution**: Ask your system administrator to clear your 2FA settings in the database:
    ```bash
    mongosh
    use jts_chat_support
    db.users.updateOne({ email: "user@domain.com" }, { $set: { "twoFactor.enabled": false, "twoFactor.secret": "" } })
    ```
*   **Related Documentation**: [Two-Factor Authentication Setup](file:///e:/Chat%20Support/Documentation/02_Account/02_two_factor_auth.md)
*   **Related Screenshots**: `two_factor_login_prompt.png`

### 1.3 [Advanced] Why do I get an "Invalid 2FA Code" error even when entering the correct numbers?
*   **Question**: My authenticator app code is rejected. How do I fix this?
*   **Short Answer**: Your mobile device's system clock is out of sync with the server's clock.
*   **Detailed Explanation**: Two-Factor Authentication uses Time-Based One-Time Passwords (TOTP). If your device's system time differs from the server's time by more than 30 seconds, generated codes will be rejected.
*   **Common Cause**: Network clock drift or manual time offsets on your mobile device.
*   **Resolution**: Go to your device's system settings and enable automatic time synchronization (network-provided time).
*   **Related Documentation**: [Two-Factor Authentication Setup](file:///e:/Chat%20Support/Documentation/02_Account/02_two_factor_auth.md)
*   **Related Screenshots**: `two_factor_setup_form.png`

---

## 2. Billing & Subscriptions FAQs

### 2.1 [Basic] What happens when my website limits are exceeded?
*   **Question**: I received a limit error when adding a website. Why?
*   **Short Answer**: You have reached the maximum number of websites allowed for your subscription plan.
*   **Detailed Explanation**: Subscriptions limit the number of websites you can register:
    -   **Basic Plan**: Max 1 Website.
    -   **Standard Plan**: Max 2 Websites.
    -   **Pro Plan**: Max 10 Websites.
*   **Common Cause**: Attempting to add a new website domain when your quota is full.
*   **Resolution**: Navigate to the Billing tab and upgrade your plan, or delete an existing website.
*   **Related Documentation**: [Billing and Subscription Plan Administration](file:///e:/Chat%20Support/Documentation/02_Account/04_billing_subscriptions.md)
*   **Related Screenshots**: `billing_limit_reached.png`

### 2.2 [Intermediate] Why does mock checkout fail with a "Mock billing is disabled" error?
*   **Question**: I clicked the mock payment upgrade button but received an error. How do I enable it?
*   **Short Answer**: Mock checkout is disabled when the application is running in production mode.
*   **Detailed Explanation**: The mock checkout endpoint (`/api/billing/mock-checkout`) is restricted. If `NODE_ENV=production` or `ENABLE_MOCK_BILLING=false` is set in the environment variables, the API returns a `403 Forbidden` error to protect against billing bypasses.
*   **Common Cause**: Running the application in production mode or missing the mock billing flag in configurations.
*   **Resolution**: To use mock billing in development, verify the backend `.env` configuration contains:
    ```env
    NODE_ENV=development
    ENABLE_MOCK_BILLING=true
    ```
*   **Related Documentation**: [Billing and Subscription Plan Administration](file:///e:/Chat%20Support/Documentation/02_Account/04_billing_subscriptions.md)
*   **Related Screenshots**: `mock_checkout_btn.png`

---

## 3. Website & Widget FAQs

### 3.1 [Basic] Where do I find my website's widget integration code?
*   **Question**: How do I embed the chat widget on my website?
*   **Short Answer**: Copy the script snippet from your website settings page.
*   **Detailed Explanation**: Each website registered in JTS Chat Support receives a unique integration script snippet containing the website's API key.
*   **Common Cause**: Setting up the widget for the first time on a new site.
*   **Resolution**: Navigate to `/client?tab=websites`, locate your website card, click **Code Snippet**, copy the script tag, and paste it before the closing `</body>` tag in your HTML file.
*   **Related Documentation**: [Website Management and Scoping](file:///e:/Chat%20Support/Documentation/04_Website/01_website_management.md)
*   **Related Screenshots**: `website_snippet_modal.png`

### 3.2 [Intermediate] Why is the chat widget failing to upload files?
*   **Question**: Visitors receive "Upload failed" errors when attaching images. Why?
*   **Short Answer**: The attachment exceeds the 10MB limit or uses an unsupported file format.
*   **Detailed Explanation**: The widget file uploader restricts attachments to protect server storage. Files must be under **10MB** and use supported formats: JPEG, PNG, GIF, WEBP, or PDF.
*   **Common Cause**: Attempting to upload large files or unsupported formats (e.g. DOCX, ZIP).
*   **Resolution**: Instruct visitors to verify their file size is under 10MB and save documents as PDFs.
*   **Related Documentation**: [Chat Widget Integration](file:///e:/Chat%20Support/Documentation/05_Widget/01_chat_widget.md)
*   **Related Screenshots**: `widget_upload_error.png`

---

## 4. Live Chat Operations FAQs

### 4.1 [Basic] Why can't I claim an incoming visitor chat?
*   **Question**: I clicked "Claim Session" but received a limit warning. why?
*   **Short Answer**: You have reached the maximum limit of 5 active chats.
*   **Detailed Explanation**: To maintain response times and agent focus, JTS Chat Support limits each agent to a maximum of **5 concurrent active chats** (`status: "active"`).
*   **Common Cause**: Having 5 unresolved chats in your queue.
*   **Resolution**: Resolve and close completed chats in your queue to free up capacity.
*   **Related Documentation**: [Live Chat Desk and Conversation Queue](file:///e:/Chat%20Support/Documentation/10_Live_Chat/01_live_chat.md)
*   **Related Screenshots**: `chat_limit_error.png`

### 4.2 [Intermediate] How do I transfer a customer conversation to a different department?
*   **Question**: Can I move an active chat session to another team?
*   **Short Answer**: Yes, use the Transfer Chat option in the conversation header.
*   **Detailed Explanation**: Agents can transfer active sessions to other online agents or support departments (e.g. Billing, Technical Support).
*   **Common Cause**: A visitor asks a question that requires assistance from another department.
*   **Resolution**: Click the **Transfer Chat** button in the chat header, select the target department or agent, and confirm.
*   **Related Documentation**: [Live Chat Desk and Conversation Queue](file:///e:/Chat%20Support/Documentation/10_Live_Chat/01_live_chat.md)
*   **Related Screenshots**: `chat_transfer_modal.png`

---

## 5. Chat Flow Builder FAQs

### 5.1 [Basic] Why is my chatbot displaying a blank screen?
*   **Question**: The chat widget opens but displays no options. How do I fix this?
*   **Short Answer**: The root node of your active flow has no option buttons configured.
*   **Detailed Explanation**: The widget checks the `root` node of your active flow. If the root node has no options configured, the widget cannot render the menu.
*   **Common Cause**: Creating a flow but forgetting to add options to the welcome node.
*   **Resolution**: Navigate to the Flow Builder, select the `root` node, click **Add Button** to add options, and save.
*   **Related Documentation**: [Interactive Flow Builder Canvas](file:///e:/Chat%20Support/Documentation/12_Chat_Flow_Builder/01_flow_canvas.md)
*   **Related Screenshots**: `flow_root_settings.png`

### 5.2 [Intermediate] Why does saving a flow fail with a "Validation Error"?
*   **Question**: I clicked Save but received a validation warning block. why?
*   **Short Answer**: The flow has broken node connections or is missing a root node.
*   **Detailed Explanation**: The Flow Builder runs validation checks before saving to prevent broken visitor journeys (e.g. options pointing to deleted nodes, circular loops, or missing welcome messages).
*   **Common Cause**: Deleting a node that was linked to an option button.
*   **Resolution**: Open the diagnostics panel, identify the listed errors (e.g. `BROKEN_LINK`), update the connections, and save.
*   **Related Documentation**: [Interactive Flow Builder Canvas](file:///e:/Chat%20Support/Documentation/12_Chat_Flow_Builder/01_flow_canvas.md)
*   **Related Screenshots**: `flow_validation_alert.png`

---

## 6. CRM & Customer Management FAQs

### 6.1 [Basic] Why can't I update a lead's stage on the pipeline board?
*   **Question**: I tried to move a lead card on the Kanban board, but the change was rejected. why?
*   **Short Answer**: Users with the sales role are restricted from moving deals to won or lost stages.
*   **Detailed Explanation**: To maintain data quality and audit control, JTS Chat Support implements a transition permission matrix:
    -   *Sales Representative (`sales`)*: Can move cards through contacted, qualified, and proposal stages, but cannot set deal stages to `won` or `lost` directly.
    -   *Managers and Admins*: Can update leads to any stage.
*   **Common Cause**: A sales representative attempting to mark a deal as won or lost.
*   **Resolution**: Request a manager or administrator to review the deal details and update the stage.
*   **Related Documentation**: [Customer Relationship Management and Pipelines](file:///e:/Chat%20Support/Documentation/13_CRM/01_crm_leads.md)
*   **Related Screenshots**: `crm_permission_error.png`

### 6.2 [Intermediate] What happens to notes when duplicate customer profiles are merged?
*   **Question**: How are customer notes managed when merging duplicate records?
*   **Short Answer**: Notes from the secondary profile are moved to the primary profile.
*   **Detailed Explanation**: Merging duplicate profiles consolidates customer information:
    -   The system appends the notes from the secondary profile's `internalNotes` array to the primary profile.
    -   The secondary profile's status updates to `inactive` and is archived to prevent duplicate listings.
*   **Common Cause**: Consolidating multiple records for the same customer.
*   **Resolution**: Select the duplicate records in the CRM table, click **Merge Profiles**, choose the primary record, and confirm.
*   **Related Documentation**: [Customer Relationship Management and Pipelines](file:///e:/Chat%20Support/Documentation/13_CRM/01_crm_leads.md)
*   **Related Screenshots**: `crm_merge_modal.png`

---

## 7. Support Ticketing FAQs

### 7.1 [Basic] How are ticket priorities used to calculate SLA deadlines?
*   **Question**: How are first response and resolution targets determined?
*   **Short Answer**: The system calculates deadlines based on the ticket's priority level.
*   **Detailed Explanation**: The SLA engine calculates response and resolution due dates from the ticket creation timestamp:
    -   **Urgent**: Response in 15 mins, resolution in 2 hours.
    -   **High**: Response in 1 hour, resolution in 8 hours.
    -   **Medium**: Response in 2 hours, resolution in 24 hours.
    -   **Low**: Response in 4 hours, resolution in 48 hours.
*   **Common Cause**: Setting up SLA policies for support teams.
*   **Resolution**: Choose the appropriate priority level when creating a ticket to apply the correct SLA targets.
*   **Related Documentation**: [Support Ticket Lifecycle and SLAs](file:///e:/Chat%20Support/Documentation/14_Tickets/01_ticket_lifecycle.md)
*   **Related Screenshots**: `ticket_priority_select.png`

### 7.2 [Intermediate] What happens when a ticket breaches its SLA?
*   **Question**: I received an SLA breach alert. What automated changes occurred?
*   **Short Answer**: The ticket is flagged as breached, the escalation level is incremented, and notifications are sent.
*   **Detailed Explanation**: The background escalation engine checks active tickets against their due dates. If a ticket breaches its SLA:
    -   `slaBreachedAt` is set to the current time.
    -   The ticket's `escalationLevel` is incremented by 1.
    -   If the status was `open`, it updates to `waiting`.
    -   An `sla_breach` notification is sent to the assigned agent and their manager.
*   **Common Cause**: A ticket resolution time has exceeded its SLA target.
*   **Resolution**: Review the ticket details, reply to the customer, or transfer the ticket to a specialized agent to resolve it.
*   **Related Documentation**: [Support Ticket Lifecycle and SLAs](file:///e:/Chat%20Support/Documentation/14_Tickets/01_ticket_lifecycle.md)
*   **Related Screenshots**: `ticket_sla_alert.png`

---

## 8. Heuristics AI Assistant FAQs

### 8.1 [Basic] Why is a customer's sentiment flagged as critical?
*   **Question**: I received a system alert: "Customer sentiment is critical." Why?
*   **Short Answer**: The visitor has sent multiple negative messages, lowering their sentiment score below -0.6.
*   **Detailed Explanation**: The heuristics AI engine scans visitor messages for positive and negative words. If the score falls below `-0.6`, the system flags the chat and sends a notification to the manager.
*   **Common Cause**: A visitor expresses frustration (e.g. using words like "angry", "broken", "worst").
*   **Resolution**: Open the active chat session, review the message thread, and take over the conversation to resolve the issue.
*   **Related Documentation**: [Heuristics AI Assistant and CRM Analytics](file:///e:/Chat%20Support/Documentation/11_AI/01_ai_assistant.md)
*   **Related Screenshots**: `ai_sentiment_alert.png`

---

## 9. Reports & Settings FAQs

### 9.1 [Basic] How do I customize my Executive Reports dashboard?
*   **Question**: Can I change the order of the KPI cards on my dashboard?
*   **Short Answer**: Yes, use the Customize Dashboard option to drag and rearrange widgets.
*   **Detailed Explanation**: The Executive Summary dashboard supports drag-and-drop customization using `@hello-pangea/dnd`. Layout preferences are saved per user profile.
*   **Common Cause**: Customizing the dashboard view for your business priorities.
*   **Resolution**: Click **Customize Dashboard**, drag the cards (Clients, Websites, Revenue, CSAT) to reorder them, and click **Done Editing** to save.
*   **Related Documentation**: [Enterprise Reports and Analytics Dashboards](file:///e:/Chat%20Support/Documentation/17_Reports/01_analytics_dashboards.md)
*   **Related Screenshots**: `reports_dashboard_customize.png`

### 9.2 [Intermediate] Why are staff invitations failing to send?
*   **Question**: I invited a new agent, but they didn't receive the email. why?
*   **Short Answer**: The backend SMTP configuration is invalid or missing.
*   **Detailed Explanation**: User invitation links and notifications are sent via nodemailer. If SMTP configurations are missing in the server environment variables, emails cannot be sent.
*   **Common Cause**: Missing or incorrect `SMTP_HOST` or credentials in the backend `.env` file.
*   **Resolution**: Verify your SMTP configurations in `.env` and restart the backend server.
*   **Related Documentation**: [Workspace Settings and System Administration](file:///e:/Chat%20Support/Documentation/18_Settings/01_system_configurations.md)
*   **Related Screenshots**: `staff_invite_modal.png`
