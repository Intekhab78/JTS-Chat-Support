# Workspace Settings & System Administration

This document details workspace setup, custom roles configuration, permission groups, staff invitations, department routing, SMTP integration, webhook triggers, audit events logging, validation schemas, and troubleshooting in JTS Chat Support.

---

## 1. Overview & Business Purpose

The **Settings & Administration** module enables client owners and global administrators to manage workspace environments. 
-   **User Provisioning**: Configures staff accounts, invite links, and active availability flags.
*   **Granular RBAC System**: Customizes security roles by enabling/disabling permissions across CRM, Live Chat, Tickets, Accounting, and Analytics.
*   **Routing Classifications**: Defines categories and departments to balance chat and ticket queues.
*   **Integration Webhooks**: Bridges real-time updates to external services.
*   **Security Auditing**: Logs administrative actions, data edits, and logins to maintain data visibility.

---

## 2. Navigation Paths

*   **Workspace Admin Panel**: `/client?tab=settings` (General company profiles and billing management).
*   **User Provisioning Workspace**: `/client?tab=staff` (Staff invitation form and status toggles).
*   **Departments Workspace**: `/client?tab=departments` (Department queue setups).
*   **Routing Categories Settings**: `/client?tab=categories` (Automatic categorization tags).
*   **Security Roles Panel**: `/client?tab=roles` (Custom roles designer and permission grids).

---

## 3. User Roles & Required Permissions

*   **Agents, Sales, and Purchase Reps**: Read-only settings access (cannot modify roles, departments, or API parameters).
*   **Client Owners & Admins**: Full write access to settings, user management, and security configurations.
*   **Required Permissions**:
    -   *Read Settings*: `settings.manage` checks.
    -   *Manage Roles*: `role.manage` authorization checks.

---

## 4. Prerequisites

1.  **Administrative Privileges**: Only users holding the client owner or global admin roles can access administrative tabs.
2.  **Stripe Subscription Plan limits**: Active user counts and domain capacities are bounded by the tenant's current billing tier.

---

## 5. Step-by-Step Instructions

### 5.1 Inviting Staff and Managing Accounts
1.  Navigate to the **Staff** settings workspace (`/client?tab=staff`).
2.  Click **Invite Staff**.
3.  Enter the recipient's **Name**, **Email**, and select their **Workspace Role** (e.g. agent, sales).
4.  Click **Send Invitation**.
5.  To edit active profiles: Locate their staff card, click the edit cog, and update their department bindings or toggle the **Active Status** switch.

### 5.2 Creating a Custom Security Role
1.  Navigate to `/client?tab=roles`.
2.  Click **Create Role**.
3.  Enter a descriptive role title (e.g. Sales Auditor) and description.
4.  In the permission panel, toggle checkboxes inside the permission categories (CRM, Ticketing, Live Chat, Accounting, System).
5.  Click **Create Role**. You can now assign this role to invited staff members.

### 5.3 Configuring Departments and Routing
1.  Navigate to `/client?tab=departments`.
2.  Click **Add Department**.
3.  Enter the department name (e.g. Billing Team) and descriptive notes.
4.  Assign staff members to the department by checking their names.
5.  Click **Save**. This department can now be selected in ticket transfers, chat routing nodes, and categories.

### 5.4 Registering Dynamic API Webhooks
1.  Navigate to `/client?tab=websites` and click **Manage** on your website card.
2.  Locate the **Webhooks** panel and click **Add Webhook**.
3.  Enter your target server URL and a secure webhook signing secret key.
4.  Check the event triggers (e.g. `ticket.created`, `chat.started`, `lead.won`).
5.  Click **Save Settings**. The JTS backend will POST JSON payloads to your server on these events.

---

## 6. Field & Button Reference

### 6.1 Security Permissions Catalog

The Role Manager console groups permissions into five core areas:

| Permission Group | Permission ID | Description |
| :--- | :--- | :--- |
| **CRM Management** | `crm.view` | Access customer details and history. |
| | `crm.create` | Add new prospects to the pipeline. |
| | `crm.update` | Modify customer profiles. |
| | `crm.archive` | Archive leads. |
| | `crm.delete` | Hard delete customer records. |
| | `crm.assign` | Modify lead ownership assignments. |
| | `crm.merge` | Consolidate duplicate records. |
| **Support Ticketing**| `ticket.view` | Access the support ticket queue. |
| | `ticket.create` | Open new support tickets. |
| | `ticket.update` | Modify ticket statuses and priority levels. |
| | `ticket.delete` | Hard delete support tickets. |
| | `ticket.comment` | Post public replies and private internal notes. |
| **Live Chat Ops** | `chat.view` | Claim and reply to active live chats. |
| | `chat.transfer` | Transfer chat sessions to agents/departments. |
| | `chat.note` | Log private internal notes in chat threads. |
| | `chat.history` | View resolved chat transcripts. |
| | `chat.archive` | Archive completed chat sessions. |
| **Accounting & Billing**| `accounts.view`| Access ledger summaries and reports. |
| | `invoice.manage`| Generate and manage customer invoices. |
| | `billing.view` | View subscription tiers and payments history. |
| **System & Analytics**| `reports.view` | Access executive analytics dashboards. |
| | `audit.view` | View audit logs and security event histories. |
| | `settings.manage`| Configure website and general application settings. |
| | `role.manage` | Create and modify security roles. |

### 6.2 Outbound Webhook JSON Payload Schema
When an event triggers, the system POSTs a signature-verified JSON payload to your server:
```json
{
  "event": "ticket.created",
  "timestamp": "2026-06-28T12:00:00Z",
  "websiteId": "WEB_ID_HEX",
  "data": {
    "ticketId": "TKT-2026-XXXX",
    "subject": "System crash on load",
    "priority": "high",
    "status": "open"
  }
}
```

---

## 7. Outbound Mail SMTP Configurations

Outbound mail configurations (OTP codes, invitations, password resets, quotations) are set via system environment variables in `backend/.env`. These settings cannot be modified in the dashboard UI:
*   `SMTP_HOST`: The SMTP server host address (e.g. `smtp.mailgun.org`).
*   `SMTP_PORT`: Port used for mail delivery (default: `587`).
*   `SMTP_USER`: SMTP username credential.
*   `SMTP_PASS`: SMTP password secret.
*   `SMTP_FROM`: E-mail address shown as the sender (e.g. `JTS Chat Support <no-reply@jts.com>`).

---

## 8. Planned Capabilities [Coming Soon]

The following settings are **Not Implemented**:
*   *Custom Company Logos & Favicon Uploads* (Header styles are currently locked to text presets).
*   *IP Restrictions / IP Allow-Listing* (Access is permitted from any network origin).
*   *OAuth Integrations* (Slack, MS Teams integrations are pending).
*   *Manual Backup & Restore* (Database maintenance is managed on the server host).
*   *Global Maintenance Mode triggers*

---

## 9. API Reference & Database Relations

### 9.1 REST Endpoints
*   `GET /api/users` (Lists all active staff accounts).
*   `POST /api/users` (Invites a new staff member).
*   `GET /api/roles` (Lists all custom security roles).
*   `POST /api/roles` (Creates a security role).
*   `PATCH /api/roles/:id` (Updates role permission arrays).
*   `GET /api/audits` (Retrieves security audit history).

### 9.2 Models In Use
*   [User Model](file:///backend/src/models/User.js): Stores passwords, 2FA states, departments, and active statuses.
*   [Role Model](file:///backend/src/models/Role.js): Stores role titles, descriptions, and permission configurations.
*   [Audit Model](file:///backend/src/models/AuditLog.js): Logs actors, actions, timestamps, and resource hashes.

---

## 10. Security Audit Log Catalog

The platform logs administrative and security events, queried via `/api/audits`:

| Action Event | Actor | Metadata Logged |
| :--- | :---: | :--- |
| `user.login` | User | IP address, timestamp, device metadata. |
| `user.invite` | Owner | Invited email address, assigned role. |
| `role.created` | Owner | Role name, enabled permission flags. |
| `website.created` | Owner | Website name, target domain. |
| `chat.taken_over` | Agent | Chat session ID, takeover timestamp. |
| `ticket.deleted` | Manager | Deleted Ticket ID, deletion reason. |

---

## 11. Troubleshooting & FAQ

### An invited staff member has not received their invitation email
*   **Probable Cause**: The backend SMTP configuration is invalid or missing in `.env`.
*   **Resolution**: Verify `SMTP_HOST` and `SMTP_USER` environment variables are correct. Check the backend server logs for mail delivery errors.

### Why is an agent unable to access the live chat queue?
*   **Probable Cause**: The agent's custom role lacks the `chat.view` permission, or they are not assigned to the website's scope.
*   **Resolution**: Edit the agent's role settings in the Roles panel to ensure `chat.view` is checked. Check the staff profile to confirm website assignments are active.

---

## 12. Best Practices

*   **Apply the Principle of Least Privilege**: Restrict staff permissions to only the tools required for their role (e.g. restrict sales reps from deleting tickets or CRM records).
*   **Verify Webhook Security**: Secure your webhook endpoints by verifying the signing signature included in header requests.

---

## 13. Screenshot & Video Checklists

### Screenshot 1: Custom Roles Panel
*   **Screenshot Name**: `admin_roles_grid.png`
*   **Page**: `/client?tab=roles`
*   **Screen Location**: Central roles list grid.
*   **Why it is needed**: Displays enabled permission toggles and custom security roles.
*   **Annotation required**: Callouts pointing to permission groups, toggle checkboxes, and Save buttons.
*   **Highlight areas**: Permission toggles.

### Video Walkthrough: Role Creation & Assignment
*   **Recording Name**: `admin_role_setup`
*   **Target Page**: `/client?tab=roles`
*   **Actions to Record**: Click Create Role -> Enter title -> Enable CRM view and ticket reply permissions -> Click Save -> Go to Staff tab -> Assign the new role to a staff member.
*   **Duration Limit**: Max 30 seconds.

---

## 14. Related Documentation

*   [Registration, Login, and Session Gateway](file:///e:/Chat%20Support/Documentation/02_Account/01_registration_login.md)
*   [Website Management and Scoping](file:///e:/Chat%20Support/Documentation/04_Website/01_website_management.md)
*   [Live Chat Queue Operations](file:///e:/Chat%20Support/Documentation/10_Live_Chat/01_live_chat.md)
