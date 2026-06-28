# Website Management & Domain Configurations

This document explains how to add, edit, and configure websites, manage widget script installations, configure business hours, set custom CRM pipeline stages, and update webhook endpoints in JTS Chat Support.

---

## 1. Overview & Business Purpose

The **Website Management** module enables client owners and global administrators to register their target website domains on JTS Chat Support. Registering a website yields a unique API tracking key and generate an embeddable javascript snippet. The module allows managers to:
*   Configure custom widget styles (branding, messages, position).
*   Toggle specific functional modules (ticketing, live chat, automation).
*   Set operational business hours for customer service.
*   Define custom pipeline stages for CRM lead boards.
*   Add outbound webhook targets to receive real-time updates.

---

## 2. Navigation Path

*   **Website Settings Portal**: `/client?tab=websites` (Renders the registered domains list grid and configuration forms).

---

## 3. User Roles & Required Permissions

*   **Read Access**: Accessible to `client`, `admin`, `manager`, `sales`, and `accounts` roles (routes query checks enforce website scoping rules).
*   **Write Access**: Restricted to Client Owners (`client`) and Global Administrators (`admin`).
*   **Required Permission**: Checked using `/api/websites/` endpoints and UI grids. Setting updates require administrative profile status.

---

## 4. Prerequisites

1.  **Subscription Website Quotas**: The client tenant's active plan must have available quota slots (Basic: 1, Standard: 2, Pro: 10 website maximum).
2.  **Domain Name Identity**: You must hold a valid web domain address (e.g. `example.com`) to associate with tracking statistics.

---

## 5. Step-by-Step Instructions

### 5.1 Registering a New Website
1.  Log in as a Client Owner or Administrator.
2.  Navigate to the **Websites** tab on the sidebar.
3.  Click **Add Website** to open the creation modal.
4.  Enter the **Website Name** (e.g. Acme Main Shop) and **Domain URL** (e.g. `acme.com`).
5.  Set the **Primary Color** and **Accent Color** hexadecimal codes or choose presets.
6.  Select the **Widget Position** (Left or Right side of screen).
7.  Click **Create Website**.
8.  The page will display the generated **Tracking Script Code**. Copy this code snippet.
9.  Paste the script tag directly into your website's HTML file before the closing `</body>` tag.

### 5.2 Editing Website Settings & Module Toggles
1.  Go to the Websites dashboard.
2.  Locate your website card, click **Manage** or the settings edit cog.
3.  To toggle functional capabilities, toggle the checkboxes under **Features**:
    -   *Live Chat*: Activates the widget chat window.
    -   *Lead Generation*: Enables custom form fields to collect visitor emails.
    -   *Ticketing*: Connects offline submissions to the ticket queue.
    -   *Knowledge Base*: Enables help center article tabs inside the widget.
4.  Click **Save Settings**.

### 5.3 Configuring Business Hours
1.  Open the website management settings drawer.
2.  Scroll down to the **Business Hours** configurations.
3.  Check the **Enable Business Hours** toggle.
4.  Set your local timezone (defaults to `Asia/Kolkata`).
5.  Define the open/close times for each day of the week, and check `isOpen` toggles to designate workdays.
6.  Click **Save Settings**. When closed, the widget will display the **Away Message** to visitors.

### 5.4 Registering Outbound Webhooks
1.  Navigate to the website settings page and locate the **Webhooks** panel.
2.  Click **Add Endpoint**.
3.  Enter the destination **Webhook Target URL** and a secret verification key string.
4.  Select the event triggers (e.g. `chat.started`, `ticket.created`, `lead.won`).
5.  Click **Add Webhook** and save. The backend will POST JSON payloads to your URL on these events.

---

## 6. Field & Button Reference

### 6.1 Website Settings Form
*   **Website Name**: Descriptive label for the website (e.g. "Acme E-Shop").
*   **Domain URL**: The website domain (e.g. `acme.com`). Trimmed on input.
*   **Primary Color / Accent Color**: Hexadecimal codes used to style the widget header and launch buttons.
*   **Launcher Icon**: Bubble icon character displayed on target websites (default: `💬`).
*   **Widget Position**: Enum options: `left` or `right`.
*   **Welcome Message**: Prompt shown to visitors when opening the widget.
*   **Timezone**: Dropdown selection of active IANA timezones (default: `Asia/Kolkata`).

### 6.2 Action Triggers
*   **Add Website**: Opens the registration form modal.
*   **Create Website**: Sends payload to `POST /api/websites`.
*   **Save Settings**: Sends update fields payload to `PATCH /api/websites/:id`.
*   **Add Webhook**: Appends webhook configurations array parameters.

---

## 7. Validation & Zod Schema Rules

*   **Subscription Capacity Checked**: Count-checking constraints prevent creation if active records exceed quota limits:
    ```javascript
    const websiteCount = await Website.countDocuments({ managerId: tenantId });
    if (websiteCount >= (subscription.limits?.websites || 0)) {
      return res.status(403).json({ message: `Your plan allows up to ${subscription.limits.websites} websites.` });
    }
    ```
*   **Required Fields**: Website Name, Domain URL, and manager ID are mandatory fields in the schema database.

---

## 8. Operational Flows

### 8.1 Success Flow (Website Registration)
1.  Client Owner submits the form with valid details.
2.  The backend verifies the request and creates the database record with a generated API key:
    ```javascript
    apiKey: generateApiKey()
    ```
3.  Default node builder flows and routing categories are seeded in the database:
    ```javascript
    await autoSeedWebsiteData(website._id, tenantId);
    ```
4.  The server returns a `210 Created` response containing the website data and compiled embed script.
5.  The frontend displays the success screen showing the tracking script tag.

### 8.2 Failure Flow (Website Registration)
1.  Client attempts to add a website but has reached their plan's quota limit.
2.  The request is rejected, returning a `403 Forbidden` status code.
3.  The frontend displays a limit alert with a prompt to upgrade the subscription plan.

---

## 9. API Reference & Database Relations

### 9.1 REST Endpoints
*   `GET /api/websites/` (Lists websites within scope).
*   `GET /api/websites/:id` (Retrieves specific website configuration).
*   `POST /api/websites/` (Registers new website instance).
*   `PATCH /api/websites/:id` (Updates website properties).

### 9.2 Models In Use
*   [Website Model](file:///backend/src/models/Website.js): Stores website domains, settings, and configurations.
*   [User Model](file:///backend/src/models/User.js): Linked via `managerId` references.
*   [Flow Model](file:///backend/src/models/Flow.js): Linked via `activeFlowId` references.

---

## 10. Business Rules

*   **Automatic Seeding**: Creating a new website automatically seeds default visual nodes, routing categories, and general departments in the database. This ensures the widget functions correctly immediately after installation.
*   **CORS Validation**: Tracking requests require a valid, matching website API key to prevent unauthorized site logging.
*   **Website Deletion**: No delete route is implemented in the backend API to prevent accidental data loss.

---

## 11. Custom Domains & SSL Status [Coming Soon]

Custom domain routing and SSL verification are **Not Implemented** in JTS Chat Support. The embed script is served directly from the backend server port, and requests use the server's SSL certificate.

---

## 12. Troubleshooting & FAQ

### Issue: Widget does not load on target website
*   **Symptom**: The widget launcher icon is missing on your website.
*   **Resolution**:
    1.  Verify the script snippet is installed correctly before the closing `</body>` tag.
    2.  Check the browser console for CORS errors. Ensure your website's domain is listed in the website configuration.
    3.  Check the `WIDGET_PUBLIC_URL` variable in your backend `.env` file to ensure the script path is correct.

---

## 13. Best Practices

*   **Align Colors with Branding**: Match the Primary and Accent colors with your website's branding for a cohesive look.
*   **Configure Business Hours**: Set your timezone and business hours so the widget automatically displays the Away Message when your agents are offline.

---

## 14. Screenshot & Video Checklists

### Screenshot 1: Website Configuration Form
*   **Screenshot Name**: `website_setup_panel.png`
*   **Page**: `/client?tab=websites`
*   **Screen Location**: Central website registration modal.
*   **Why it is needed**: Displays website setup fields (Name, Domain, Colors, Position) for administrators.
*   **Annotation required**: Callout labels pointing to Name and Domain inputs, and color presets.
*   **Highlight areas**: Domain input text field.

### Video Walkthrough: Registering and Customizing a Website
*   **Recording Name**: `website_setup_flow`
*   **Target Page**: `/client?tab=websites`
*   **Actions to Record**: Click Add Website -> Enter info -> Set widget colors -> Click Create -> Copy tracking script.
*   **Duration Limit**: Max 25 seconds.

---

## 15. Related Documentation

*   [Registration, Login, and Session Gateway](file:///e:/Chat%20Support/Documentation/02_Account/01_registration_login.md)
*   [Interactive Flow Builder Configurations](file:///e:/Chat%20Support/Documentation/12_Chat_Flow_Builder/01_flow_canvas.md)
*   [Webhooks Delivery Auditing](file:///e:/Chat%20Support/Documentation/19_API/01_webhooks_deliveries.md)
