# Introduction to JTS Chat Support

This document provides a comprehensive overview of the JTS Chat Support platform, details the unified system architecture, describes main layout sections, and provides a guide for initial dashboard access.

---

## Overview

**JTS Chat Support** is a multi-role customer operations, ticketing, CRM, and supply-chain reconciliation SaaS platform. Built on an enterprise-grade stack (React, Node.js, Express, MongoDB, and Socket.IO), the platform allows businesses to manage the entire lifecycle of a customer transaction:
- **First Contact**: Engaging website visitors using a customizable, embeddable chat widget.
- **Support Tracking**: Escalating complex customer inquiries into structured tickets with strict Service Level Agreements (SLAs).
- **Sales Conversions**: Moving prospective deals through a multi-stage Sales CRM pipeline.
- **Supply Chain Fulfillment**: Handing off won CRM sales contracts to a dedicated Purchase and Procurement workspace that drafts purchase orders, requests bids from preferred vendors, tracks inventory balances, and processes invoices.
- **Financial Reconciliation**: Reviewing transactions, billing compliance, and revenue journals within an Accounts dashboard.

---

## Purpose

The primary purpose of JTS Chat Support is to eliminate silos between customer support, sales pipelines, inventory tracking, and financial reconciliation. Instead of using separate software solutions for chat, ticketing, CRM, and inventory, the JTS Chat Support platform integrates these steps into a single logical pipeline:

```
[ Visitor Chat Widget ] ──(socket.io)──> [ Agent Support Queue ]
                                                   │
                                     ┌─────────────┴─────────────┐
                                     ▼                           ▼
                           [ Convert to Ticket ]       [ Convert to CRM Lead ]
                                     │                           │
                                     ▼                           ▼
                           [ Resolve SLA Case ]        [ Move Stage to Won ]
                                                                 │
                                                                 ▼
                                                       [ Handoff to Procurement ]
                                                                 │
                                                                 ▼
                                                       [ Fulfill PO via Supplier ]
                                                                 │
                                                                 ▼
                                                       [ Reconcile in Accounts ]
```

By connecting these processes, the platform ensures that customer information is maintained across departments. For example:
- A customer ticket has direct links to their previous chat sessions.
- A procurement purchase order has links to the CRM customer contract.
- A supplier invoice is matched against purchase records in the Accounts ledger automatically.

---

## Navigation

All workspaces in JTS Chat Support share a unified layout split into three structural sections:
1. **Desktop Sidebar Panel**: Handles navigation between tabs and features. When expanded, it lists main tabs and sub-menus (e.g., Inventory categories under the Purchase tab). When collapsed, it shows icon representations.
2. **Top Header**: Hosts the global search trigger, active notification center bell, database sync indicators, dark/light theme toggle, and the logged-in user profile avatar.
3. **Primary Content Window**: Displays the workspace tabs, table grids, Kanban boards, interactive flow builder canvases, or reporting graphs.

### Universal Navigation Elements

- **Global Search Button**: Located in the top header. Clickable or triggered using `Ctrl + K` (Windows) or `Cmd + K` (macOS). Focuses the omni-search input across customers, sessions, and tickets.
- **Notification Bell**: Displays a red badge indicating unread notifications (e.g., new assigned chat, SLA breach warnings, low stock alerts).
- **User Avatar Panel**: Displays the initials of the logged-in user with a role indicator label (e.g., "Global Admin", "Sales", "Supplier"). Contains the Sign Out button.

---

## Prerequisites

Before logging in to the dashboard, ensure you meet the following requirements:

### Role Assignment
A platform administrator or client owner must register your user profile and assign a specific system role. The available roles are:
*   `admin`: Global administrator.
*   `client`: Tenant account owner.
*   `manager`: Operations supervisor.
*   `agent` / `user`: Customer support handlers.
*   `sales`: CRM and lead qualifiers.
*   `purchase`: Procurement and inventory controllers.
*   `supplier`: Product vendors.
*   `accounts`: Finance bookkeepers.

### System Requirements
*   **Browser Compatibility**: Microsoft Edge (latest 2 versions), Google Chrome, Safari, or Mozilla Firefox.
*   **WebSockets Enablement**: Network connections must permit WebSocket traffic (`ws://` and `wss://`) for real-time messaging, status updates, and notification alerts.
*   **Session Cookies**: Cookies must be enabled to store JWT session tokens.

---

## Step-by-Step Guide: Initial Access

Follow these steps to access the command center:

1.  **Navigate to the Dashboard URL**:
    Open your browser and navigate to the dashboard application URL (default local port is `http://localhost:5173`).
2.  **Input Authentication Credentials**:
    Enter your registered email address and secure password.
3.  **Complete Two-Factor Authentication (If Enabled)**:
    If 2FA is active, open your authenticator app, retrieve the temporary 6-digit verification code, and enter it into the token input box.
4.  **Confirm Role Landing Page**:
    The application will automatically determine your role and redirect you to the designated workspace routing path (e.g., `/sales` for sales users, `/purchase` for procurement users).
5.  **Set Status to Active**:
    For support agents and procurement handlers, click the settings tab in the sidebar and ensure your **Desk Availability** is toggled to **Online/Available**. This registers your profile in the automatic routing queue.
6.  **Perform a Test Global Search**:
    Press `Ctrl + K` or `Cmd + K` to open the search bar, type a keyword, and check that search results populate.

---

## Field Descriptions

The following table describes the main interface controls found across the dashboard:

| Component | Control Type | Description |
| :--- | :--- | :--- |
| **Search Input** | Button / Dialog | Clicking this opens a floating search container that query lists customers, chat sessions, and tickets by keyword. |
| **Notification Bell** | Icon Button | Toggles a slide-out panel listing read/unread events with link shortcuts. |
| **Notification Filter Pills** | Buttons | Filters notifications by category: All, New Chat, New Ticket, Low Stock, CRM Due, SLA Breach. |
| **Theme Toggle Switch** | Icon Button | Switches the UI mode between light (default) and dark mode (adjusting theme colors instantly). |
| **Sidebar Collapse Toggle** | Chevron Button | Toggles the desktop sidebar between expanded (labels shown) and collapsed (icons only) state. |
| **Desk Availability Toggle** | Checkbox / Toggle | Controls whether the server routes active chats and ticket allocations to the user. |
| **Sign Out Button** | Button | Invalidates cookies, clears localStorage tokens, disconnects websocket links, and redirects to `/login`. |

---

## Notes

- **JWT Expiry**: The secure authentication token stored in your browser cookie has a default lifetime of 24 hours. After expiration, you will be prompted to log in again.
- **Session Timeout Warnings**: If session timeouts are active, a warning modal will display 5 minutes before your session ends, prompting you to extend your session.
- **Automatic Offline Transition**: If an agent closes their browser window without signing out, the socket disconnection will automatically transition their status to **Offline** on the server after a 30-second heartbeat check.

---

## Best Practices

*   **Explicitly Log Out**: Always click the **Sign Out** button when leaving your workstation to ensure session keys are cleared from browser memory.
*   **Toggle Offline When Away**: If you step away from your desk, toggle your availability to **Away** or **Offline** to prevent live chat requests from routing to your inactive workspace.
*   **Monitor the Connection Indicator**: Regularly inspect the small socket indicator in the top-left branding header of the sidebar. A pulsing green indicator confirms an active websocket stream.

---

## Tips

*   **Search Shortcut**: Use the shortcut key `Ctrl + K` (Windows) or `Meta + K` (Mac) to open the Search utility quickly from any page.
*   **Collapse the Sidebar**: If you need more workspace space (for example, when working on a large Kanban pipeline or a complex chat flow design), click the collapse chevron to expand the content canvas.
*   **Desktop Alerts**: When logging in, select **Allow Notifications** on the browser prompt to receive desktop alerts for incoming messages and SLA warnings when working in other tabs.

---

## Warnings

> [!WARNING]
> **Strict Role Security Policies Active**
> Attempting to manually modify the browser address bar to visit routes outside your assigned role (e.g., a Sales user trying to access `/admin`) will trigger the RBAC authorization gateway. You will be logged out or redirected back to your home workspace page.

---

## Common Mistakes

*   **Forgetting to Set Active Availability**: Logged-in agents sometimes wonder why they aren't receiving chats, only to realize their availability toggle is still set to offline.
*   **Leaving Active Sessions on Shared Devices**: Not signing out on shared computers allows other users to perform modifications under your user identity.
*   **Disallowing Browser Alerts**: Blocking browser notification permissions means you will miss real-time SLA breach warnings.

---

## FAQs

### Why can't I see the "Clients" or "Subscriptions" tab?
These tabs are restricted to the `admin` (global platform administrator) role. Tenant client accounts are limited to the website and local agent configuration options.

### How do I check if my real-time connection is working?
Observe the socket indicator pulse in the sidebar. If it turns yellow or red, your browser is attempting to reconnect to the Socket.IO server.

### Can I log in on multiple tabs simultaneously?
Yes, you can open multiple dashboard tabs. The real-time notification sockets will update across all open tabs simultaneously.

---

## Troubleshooting

### Issue: The page remains stuck on a "Loading..." screen
*   **Probable Cause**: The backend API server is unreachable, or your browser was unable to read the local session storage token.
*   **Resolution**:
    1.  Verify the backend server status indicator is active (ping `http://localhost:5000/health`).
    2.  Clear your browser cache, delete the cookies for the domain, and perform a hard reload (`Ctrl + F5`).

### Issue: Real-time chat messages are delayed or not loading
*   **Probable Cause**: WebSocket traffic is blocked by a network proxy or firewall.
*   **Resolution**: Check your browser console network tab. If socket connections are failing, ensure port `5000` allows websocket protocols.

---

## Related Articles

*   [Quick Start Role Guide](file:///e:/Chat%20Support/Documentation/01_Getting_Started/02_quick_start.md)
*   [Local Installation and Development Setup](file:///e:/Chat%20Support/Documentation/01_Getting_Started/03_installation.md)
*   [System Role Master & Dynamic RBAC Settings](file:///e:/Chat%20Support/Documentation/07_Roles/01_role_master.md)
