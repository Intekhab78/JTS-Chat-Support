# Enterprise Reports & Analytics Dashboards

This document explains the JTS Chat Support Reports & Analytics dashboards, custom layout drag-and-drop configurations, data export utilities, and backend aggregation pipelines.

---

## 1. Overview & Business Purpose

The **Reports & Analytics** module compiles metrics across live chat queues, ticketing metrics, CRM deal funnels, agent performance times, and AI sentiment scores. The module provides:
*   **Drag-and-Drop Dashboard Customization**: Allows managers to rearrange dashboard layouts to fit their priorities.
*   **Multi-View Dashboards**: Includes role-specific layouts for Executive summaries, CRM sales reps, and Support Desk agents.
*   **Data Export Center**: Exports metrics to PDF reports, Excel spreadsheets, and raw CSV files.
*   **Funnel and Trend Visualizations**: Uses interactive line, bar, area, pie, and conversion funnel charts.

---

## 2. Navigation Paths

*   **Executive Reports Console**: `/client?tab=reports` (Renders the customizable Enterprise Reports Center).
*   **Sales Performance Dashboard**: `/sales?tab=reports` or `/client?tab=crm&view=reports` (Renders sales conversion analytics).
*   **Agent Productivity Stats**: `/agent?tab=reports` (Renders individual agent response times and chat counts).

---

## 3. User Roles & Required Permissions

*   **Read Access**: Scoped based on role settings:
    -   `sales`: Access to CRM sales performance metrics.
    -   `agent` / `user`: Access to personal productivity statistics.
    -   `manager` / `client` / `admin`: Full access to the Enterprise Reports Center.
*   **Permissions Required**: `REPORTS_VIEW` or administrator status.

---

## 4. Prerequisites

1.  **Subscription Tier Verification**: PDF and Excel exports are restricted to Pro and Standard plans.
2.  **Tracking Data Seeding**: Requires active communication and transaction logs to populate metrics.

---

## 5. Step-by-Step Instructions

### 5.1 Customizing the Executive Summary Layout
The Executive Summary dashboard supports drag-and-drop customization using `@hello-pangea/dnd`:
1.  Navigate to `/client?tab=reports` and select the **Executive Summary** tab.
2.  Click **Customize Dashboard** in the header.
3.  Drag widgets (Active Clients, Active Websites, Revenue/MRR, and CSAT Score) to rearrange their order.
4.  Click **Done Editing** to save your layout preferences to the database:
    ```javascript
    await api('/api/users/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ dashboardPreferences: { executiveLayout: newLayout } })
    });
    ```

### 5.2 Filtering Reports by Date Range
1.  Open the Reports Center page.
2.  Locate the **Calendar filter dropdown** in the header.
3.  Select a range: `day` (Last 24 hours), `week` (Last 7 days), `month` (Last 30 days), or `year` (Last 365 days).
4.  The dashboard automatically refreshes all charts and KPI cards to display data from the selected time frame.

### 5.3 Exporting Reports
1.  In the Reports Center header, click the **Export** button.
2.  Select an export format:
    -   **PDF**: Generates a formatted report page layout.
    -   **Excel**: Exports structured data for spreadsheet analysis.
    -   **CSV**: Exports raw data vectors.
3.  The file downloads automatically to your device.

---

## 6. Visualization & Widget Catalog

The Enterprise Reports Center displays the following widgets and charts:

### 6.1 KPI Metric Cards
*   **Active Clients**: Total registered tenant accounts on the platform.
*   **Active Websites**: Total domains actively running the tracking script.
*   **Total Revenue (MRR)**: Monthly Recurring Revenue compiled from active Stripe subscriptions.
*   **CSAT Score**: Average customer satisfaction score (percentage) submitted via widget feedback forms.

### 6.2 Chart Visualizations
*   **Area Chart (Revenue Trends)**: Displays monthly recurring revenue (MRR) growth over time.
*   **Bar Chart (Ticket Volumes)**: Compares ticket volumes across open, resolved, and closed statuses.
*   **Pie Chart (Customer Satisfaction)**: Breaks down star ratings from customer feedback.
*   **Funnel Chart (Sales Conversions)**: Tracks deal progression from new leads to won deals:
    ```
    Flow Started ➔ Form Started ➔ Form Completed ➔ Transferred to Agent ➔ Won Conversion
    ```
*   **Line Chart (Chat Trends)**: Displays message volumes and peak chat hours to help plan agent scheduling.

---

## 7. Business Rules & Calculations

*   **SLA Compliance Rate**: Calculated as the percentage of resolved tickets that did not breach their `resolutionDueAt` target:
    ```
    SLA Compliance % = (Compliant Tickets / Total Resolved Tickets) * 100
    ```
*   **Layout Synchronization**: Custom dashboard layouts are saved per user profile, ensuring preferences persist across sessions and devices.

---

## 8. Operational Flows

### 8.1 Success Flow (Dashboard Data Load)
1.  The user opens the Reports tab.
2.  The dashboard fetches metrics from the enterprise analytics route `/api/analytics/enterprise/executive?range=month`.
3.  The database aggregates records and returns the aggregated values:
    ```json
    {
      "totalClients": { "value": 142, "trend": 8 },
      "activeWebsites": { "value": 285, "trend": 12 },
      "mrr": { "value": 14200, "trend": 5 },
      "csat": { "value": 94, "trend": 2 }
    }
    ```
4.  The frontend applies custom layout settings and renders the dashboard cards.

### 8.2 Failure Flow (No Data State)
1.  A user opens reports for a newly registered domain.
2.  The API returns zero or empty metrics.
3.  The dashboard displays the **EmptyState** panel: "We need a bit more data to calculate these insights."

---

## 9. API Reference & Database Relations

### 9.1 REST Endpoints
*   `GET /api/analytics/` (Retrieves general dashboard metrics).
*   `GET /api/analytics/enterprise/executive` (Retrieves executive summary metrics).
*   `GET /api/analytics/enterprise/leads` (Retrieves CRM deal funnel metrics).
*   `GET /api/analytics/enterprise/tickets` (Retrieves ticketing resolution metrics).
*   `GET /api/analytics/export/csv` (Exports CSV data vectors).

### 9.2 Models In Use
*   [User Model](file:///backend/src/models/User.js): Stores user dashboard layout preferences under `dashboardPreferences`.
*   [Ticket Model](file:///backend/src/models/Ticket.js): Aggregated to calculate SLA compliance and ticket volumes.
*   [Customer Model](file:///backend/src/models/Customer.js): Aggregated to calculate lead conversions and revenue.

---

## 10. Troubleshooting & FAQ

### Why is the export menu disabled or missing?
*   **Probable Cause**: The client's subscription plan is basic (exports are locked to standard and pro tiers).
*   **Resolution**: Upgrade your subscription plan in the Billing tab to unlock PDF, Excel, and CSV exports.

### Why do some charts look empty?
*   **Probable Cause**: The selected date range has no activity logs.
*   **Resolution**: Select a wider date filter range (e.g. Last Year) or check if your widget is installed correctly on the host website.

---

## 11. Best Practices

*   **Review Reports Regularly**: Check agent performance and CSAT scores weekly to identify support bottlenecks.
*   **Monitor Peak Hours**: Use chat trend lines to schedule agents during peak traffic hours.

---

## 12. Screenshot & Video Checklists

### Screenshot 1: Enterprise Reports Workspace
*   **Screenshot Name**: `reports_dashboard_main.png`
*   **Page**: `/client?tab=reports`
*   **Screen Location**: Central customizable report grid.
*   **Why it is needed**: Displays KPI cards, Recharts visualizations, and date range filters.
*   **Annotation required**: Callouts pointing to the date selector, export button, Customize Dashboard button, and chart types.
*   **Highlight areas**: Customize Dashboard button.

### Video Walkthrough: Customizing and Exporting Reports
*   **Recording Name**: `reports_customization_export`
*   **Target Page**: `/client?tab=reports`
*   **Actions to Record**: Select monthly range -> Click Customize Dashboard -> Drag widgets to change layout order -> Click Done -> Click Export -> Select Export as PDF.
*   **Duration Limit**: Max 30 seconds.

---

## 13. Related Documentation

*   [Customer Relationship Management and Pipelines](file:///e:/Chat%20Support/Documentation/13_CRM/01_crm_leads.md)
*   [Support Ticket Lifecycle and SLAs](file:///e:/Chat%20Support/Documentation/14_Tickets/01_ticket_lifecycle.md)
*   [Billing and Subscription Plan Administration](file:///e:/Chat%20Support/Documentation/02_Account/04_billing_subscriptions.md)
