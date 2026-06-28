# Glossary of Terms

This document provides a glossary of technical, business, and product terms used in the JTS Chat Support application.

---

## 1. Glossary Terms

### 1.1 Customer Reference Number (CRN)
*   **Term**: Customer Reference Number (CRN)
*   **Definition**: An auto-generated unique identifier assigned to every customer profile promoted to the CRM.
*   **Business Meaning**: Allows support agents, sales representatives, and accountants to reference a customer's history across chats, tickets, quotes, and billing files.
*   **Technical Meaning**: A indexed string field in the Mongoose schema (e.g., `CRN-2026-0001`) generated using a seed counter format.
*   **Related Modules**: CRM, Customer Management
*   **Related Documentation**: [Customer Relationship Management and Pipelines](file:///e:/Chat%20Support/Documentation/13_CRM/01_crm_leads.md)
*   **Example**: `CRN-2026-9812`

### 1.2 Service Level Agreement (SLA)
*   **Term**: Service Level Agreement (SLA)
*   **Definition**: Commitment targets defining response and resolution times for support inquiries.
*   **Business Meaning**: Helps teams meet customer service quality targets and manage support workloads.
*   **Technical Meaning**: Timestamps calculated on ticket creation based on priority levels: Urgent (15m response/2h resolution), High (1h/8h), Medium (2h/24h), and Low (4h/48h).
*   **Related Modules**: Support Ticketing
*   **Related Documentation**: [Support Ticket Lifecycle and SLAs](file:///e:/Chat%20Support/Documentation/14_Tickets/01_ticket_lifecycle.md)
*   **Example**: Urgent priority tickets must be resolved within 2 hours of creation.

### 1.3 Two-Factor Authentication (2FA)
*   **Term**: Two-Factor Authentication (2FA)
*   **Definition**: A security process requiring two forms of verification to access user accounts.
*   **Business Meaning**: Protects sensitive customer data, system configurations, and billing settings from unauthorized access.
*   **Technical Meaning**: TOTP-based authentication utilizing a base32 secret and clock-drift verification.
*   **Related Modules**: Authentication, Security
*   **Related Documentation**: [Two-Factor Authentication Setup](file:///e:/Chat%20Support/Documentation/02_Account/02_two_factor_auth.md)
*   **Example**: Entering an authenticator app code after entering credentials at login.

### 1.4 Flow Canvas Node
*   **Term**: Flow Canvas Node
*   **Definition**: A modular step configured inside the Chat Flow Builder.
*   **Business Meaning**: Represents a specific action or conversation point in the automated chat widget workflow (e.g., sending messages, presenting menu options, collecting contact details).
*   **Technical Meaning**: A node entry in the Mongoose Mixed schema array containing configuration fields like buttons, text, and condition rules.
*   **Related Modules**: Flow Builder
*   **Related Documentation**: [Interactive Flow Builder Canvas](file:///e:/Chat%20Support/Documentation/12_Chat_Flow_Builder/01_flow_canvas.md)
*   **Example**: A welcome message node containing option buttons to redirect users.

### 1.5 Heuristic Sentiment Score
*   **Term**: Heuristic Sentiment Score
*   **Definition**: A local normalized decimal rating between `-1.00` and `1.00` representing chat sentiment.
*   **Business Meaning**: Evaluates visitor frustration or satisfaction in real-time during conversations.
*   **Technical Meaning**: Calculated locally by scanning visitor messages for positive (`+0.3` weight) and negative (`-0.5` weight) keywords.
*   **Related Modules**: AI Assistant
*   **Related Documentation**: [Heuristics AI Assistant and CRM Analytics](file:///e:/Chat%20Support/Documentation/11_AI/01_ai_assistant.md)
*   **Example**: A sentiment score of `-0.75` indicates a frustrated visitor.

### 1.6 Supervisor Critical Alert
*   **Term**: Supervisor Critical Alert
*   **Definition**: An automated de-escalation warning sent to managers.
*   **Business Meaning**: Alerts managers to step in and handle frustrated customers before they churn.
*   **Technical Meaning**: Triggers when a chat session's normalized sentiment score falls below `-0.6`, sending a socket broadcast to online managers.
*   **Related Modules**: AI Assistant, Live Chat
*   **Related Documentation**: [Heuristics AI Assistant and CRM Analytics](file:///e:/Chat%20Support/Documentation/11_AI/01_ai_assistant.md)
*   **Example**: A manager receives an alert: "Customer sentiment is critical (negative, score: -0.70) on chat session X."

### 1.7 Next Best Action (NBA)
*   **Term**: Next Best Action (NBA)
*   **Definition**: Recommended tasks for leads or support tickets based on their current status.
*   **Business Meaning**: Recommends the next action for sales reps or support agents to improve conversion and resolution rates.
*   **Technical Meaning**: Evaluated using lead and ticket parameters (e.g. stage updates, idle time, ownership, categories).
*   **Related Modules**: CRM, Support Ticketing, AI Assistant
*   **Related Documentation**: [Heuristics AI Assistant and CRM Analytics](file:///e:/Chat%20Support/Documentation/11_AI/01_ai_assistant.md)
*   **Example**: A recommendation to call a customer because a proposal was sent 3 days ago.

### 1.8 Compound Uniqueness Index
*   **Term**: Compound Uniqueness Index
*   **Definition**: A database constraint that prevents duplicate records within a website domain scope.
*   **Business Meaning**: Helps maintain clean customer data by preventing duplicate profiles.
*   **Technical Meaning**: A Mongoose index configuration that enforces uniqueness across multiple fields (e.g. `email` + `websiteId`).
*   **Related Modules**: CRM, Database Settings
*   **Related Documentation**: [Customer Relationship Management and Pipelines](file:///e:/Chat%20Support/Documentation/13_CRM/01_crm_leads.md)
*   **Example**: Enforcing uniqueness on `email` + `websiteId` ensures a customer can only register once per website domain.

### 1.9 Role-Based Access Control (RBAC)
*   **Term**: Role-Based Access Control (RBAC)
*   **Definition**: A method of restricting system access to authorized users based on their assigned role.
*   **Business Meaning**: Secures workspace configurations, customer data, and billing settings by restricting permissions.
*   **Technical Meaning**: Permissions mapped to role documents (`crm.view`, `ticket.update`, `settings.manage`) that are verified via route middlewares.
*   **Related Modules**: Settings, Security
*   **Related Documentation**: [Workspace Settings and System Administration](file:///e:/Chat%20Support/Documentation/18_Settings/01_system_configurations.md)
*   **Example**: A user with the `sales` role cannot modify billing configurations or access custom role settings.

### 1.10 Webhook Signing Secret
*   **Term**: Webhook Signing Secret
*   **Definition**: A secure key used to verify the origin and integrity of webhook payloads.
*   **Business Meaning**: Prevents malicious actors from spoofing event data sent to your servers.
*   **Technical Meaning**: A HMAC SHA-256 signature key configured for webhook endpoints.
*   **Related Modules**: Settings, Integrations
*   **Related Documentation**: [Workspace Settings and System Administration](file:///e:/Chat%20Support/Documentation/18_Settings/01_system_configurations.md)
*   **Example**: Verifying the signature header before accepting `ticket.created` webhook payloads.

### 1.11 Agent Queue Claim Limit
*   **Term**: Agent Queue Claim Limit
*   **Definition**: The maximum number of active chat sessions an agent can handle concurrently.
*   **Business Meaning**: Helps maintain chat response quality and prevent agent overload.
*   **Technical Meaning**: A backend check that rejects chat claims if an agent's active chat session count is 5 or more.
*   **Related Modules**: Live Chat
*   **Related Documentation**: [Live Chat Desk and Conversation Queue](file:///e:/Chat%20Support/Documentation/10_Live_Chat/01_live_chat.md)
*   **Example**: An agent with 5 active chats is blocked from claiming new incoming chats until they close a session.

### 1.12 Public Share Token
*   **Term**: Public Share Token
*   **Definition**: A secure, unique token that allows visitors to track ticket status without logging in.
*   **Business Meaning**: Allows unauthenticated visitors to securely view ticket status updates.
*   **Technical Meaning**: An auto-generated token in the ticket document that authorizes access to the `/api/tickets/public/:ticketId` route.
*   **Related Modules**: Support Ticketing, Widget
*   **Related Documentation**: [Support Ticket Lifecycle and SLAs](file:///e:/Chat%20Support/Documentation/14_Tickets/01_ticket_lifecycle.md)
*   **Example**: A tracking link sent to a customer's email containing the ticket ID and its secure share token.
