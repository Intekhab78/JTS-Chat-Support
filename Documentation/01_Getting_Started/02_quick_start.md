# Quick Start Guide

This document provides daily workflow guides, role routing, navigation paths, and operation checklists for Support Agents, Sales Executives, Procurement Specialists, Suppliers, and Financial Accountants.

---

## Overview

To get started quickly, this guide is split into role-specific workflows. Each workflow represents a typical daily operational path derived from the platform's user interface.

---

## Purpose

The purpose of this guide is to onboard new team members. It details the step-by-step procedures required to manage customer communication, qualify sales leads, execute supply chain purchases, fulfill vendor orders, and reconcile statements.

---

## Navigation Paths by Role

Upon login, the routing engine directs you to your dedicated dashboard. The URLs and sub-tabs for each workspace are:

*   **Support Agent Desk**: `/agent` (default tab: Performance; operational tab: Active Queue `/agent?tab=chats`).
*   **Sales CRM Desk**: `/sales` (default tab: Pipeline Kanban Board `/sales?tab=pipeline`; follow-up tab: Tasks `/sales?tab=tasks`).
*   **Procurement Coordinator Desk**: `/purchase` (default tab: Dashboard stats `/purchase`; operational queues: Requests `/purchase?tab=requests` and Procurement `/purchase?tab=procurement`).
*   **Supplier Portal**: `/supplier` (default tab: Vendor Dashboard `/supplier?tab=dashboard`; orders tab: Purchase Orders `/supplier?tab=orders`).
*   **Finance Desk**: `/accounts` (default tab: Overview stats `/accounts`; details tab: Invoices `/accounts?tab=invoices`).

---

## Prerequisites

1.  **Assigned Role Permissions**: Ensure your profile has the correct role in the User collection.
2.  **Website Scope Configuration**: A site owner must assign you to one or more websites (`websiteIds`) to view associated conversations, inventory masters, and tickets.
3.  **Active Email Credentials**: Verify that your contact email is valid for customer communications.

---

## Role-Based Step-by-Step Guides

### 1. Support Agent Daily Workflow

#### Step 1: Initialize Workspace Status
Log in and navigate to the settings tab (`/agent?tab=settings`). Ensure **Availability Status** is toggled to **Online/Available**.

#### Step 2: Open Active Chats Queue
Click **Active Queue** in the sidebar. You will see three columns:
-   **Unassigned Queue**: Fresh chats from visitors currently waiting on the website widget.
-   **My Active Chats**: Live sessions currently assigned to you.
-   **Closed Sessions**: Past chat histories.

#### Step 3: Claim and Engage
Select a chat session from the Unassigned Queue and click **Claim Session**. Type a message in the input text area. Use **Canned Responses** by typing `/` followed by a keyword (e.g., `/hello`) to insert saved templates.

#### Step 4: Add Internal Handover Notes
If another agent needs to assist, type an internal note in the conversation drawer. These notes are colored yellow and are hidden from the website visitor.

#### Step 5: Convert Chat to Support Ticket
If the visitor's issue requires longer-term follow-up:
1.  Click **Convert to Ticket** in the chat drawer.
2.  Enter the **Ticket Subject**, select the **Category** (e.g., Billing, Tech support), and assign a **Priority** (Low, Medium, High, Urgent).
3.  Click Submit. A tracking link is automatically sent to the visitor in the chat window.

#### Step 6: Close Session
Once the conversation is complete, click **Close Session** in the top header of the chat drawer to clear the session from your active queue.

---

### 2. Sales Executive Daily Workflow

#### Step 1: Review the Sales Kanban Board
Log in to the Sales Workspace (`/sales?tab=pipeline`). You will see CRM leads arranged by sales stage:
-   `New` -> `Contacted` -> `Qualified` -> `Proposal` -> `Negotiation` -> `Won` / `Lost`.

#### Step 2: Analyze AI Deal Scoring
Click on a lead card to open the CRM detail drawer. Review the AI-driven markers:
-   **Win Probability**: A dynamic percentage showing the likelihood of closing the deal.
-   **Heat Score**: Engagement depth score (based on visitor interaction volume).
-   **Next Best Action (NBA)**: AI recommendations, such as "Stalled negotiation. Call client." or "Qualify and send proposal."

#### Step 3: Complete Follow-up Tasks
Click the **Tasks** tab in the drawer. Complete pending tasks (calls, emails, meetings). Once complete, mark the task as **Completed** to update the lead's activity velocity score.

#### Step 4: Draft and Dispatch Quotations
1.  Open the lead drawer and click **Quotations** -> **Create Quotation**.
2.  Search inventory items using the autocompletion search box. Select items, input discount margins, and click **Generate Quotation PDF**.
3.  Click **Send Proposal** to email the proposal to the customer.

#### Step 5: Transition Deal to Won
When the client accepts the proposal:
1.  Update the pipeline stage to **Won**.
2.  Select **Handoff to Purchase** in the prompt. This locks the CRM lead, assigns a Customer Relationship Number (CRN), and submits a handoff request to the Procurement Desk.

---

### 3. Procurement Specialist Daily Workflow

#### Step 1: Review Handoff Requests Queue
Navigate to the requests page (`/purchase?tab=requests`). Here you will find won CRM deals that are ready for procurement.

#### Step 2: Launch RFQ / Purchase Order
Select a handoff request:
1.  Click **Start Review** to move the workflow status to **In Review**.
2.  Click **Create Purchase Order (PO)**.
3.  Select a registered vendor from the supplier list.
4.  Add the required SKUs, quantities, and agreed prices.
5.  Click **Generate PO PDF** and select **Dispatch to Supplier**.

#### Step 3: Track Supplier Delivery
As the supplier updates the shipment status, monitor updates in the procurement queue. Once the shipment arrives at your warehouse, click **Confirm Delivery / Stock In**. This automatically increases the stock balance of the SKUs in your Inventory Item Master.

---

### 4. Vendor Supplier Daily Workflow

#### Step 1: Fulfill Incoming Orders
Log in to the Supplier Portal (`/supplier?tab=orders`). You will see newly dispatched Purchase Orders under **Pending Orders**.

#### Step 2: Accept PO and Ship
1.  Review the PO details and click **Accept PO**. The status updates to *Accepted*.
3.  Package the inventory items. Once shipped, click **Mark as Shipped** and enter shipping tracking details.

#### Step 3: Submit Invoice & Mark Delivered
1.  Once the shipment is delivered to the customer, click **Mark as Delivered**.
2.  Click **Upload Invoice**. Enter the public URL link of your digital invoice PDF and enter the total billing amount. Click Submit to initiate reconciliation.

---

### 5. Financial Accountant Daily Workflow

#### Step 1: Verify Customer Invoices
Log in to the Accounts Workspace (`/accounts?tab=invoices`). Review customer-facing invoices generated by sales or purchase divisions.

#### Step 2: Reconcile Supplier Invoices
Open the **Ledger** page (`/accounts?tab=ledger`). Match incoming supplier invoices against corresponding Purchase Order records. If the PO total matches the uploaded invoice amount, mark the transaction as **Reconciled**.

#### Step 3: Audit Subscriptions & Revenue Trends
Navigate to `/accounts?tab=billing` to verify client subscription plans (Basic, Standard, Pro) and check Stripe billing logs.

---

## Field Descriptions

The following table describes the core status indicators found on dashboard cards:

| Field Label | Workspace Location | Description |
| :--- | :--- | :--- |
| **Win Probability** | CRM Lead Card / Drawer | AI-calculated conversion probability (0% to 100%). |
| **Heat Score** | CRM Detail Drawer | Visitor engagement score (0 to 100) based on message frequency. |
| **SLA Countdown** | Support Ticket Detail | Remaining time (hours/minutes) before a response or resolution breach occurs. |
| **Fulfillment Rate** | Supplier Dashboard | Percentage of POs delivered on time by the vendor. |
| **Low Stock Counter** | Purchase Dashboard | Number of SKUs with stock levels below the configured minimum threshold. |
| **Ledger Entry Type** | Accounts Ledger Table | Transaction type: `income` (from customer invoices) or `expense` (from supplier POs). |

---

## Notes

-   **Workflow Locks**: Once a CRM lead is transitioned to the **Won** stage, the lead record is locked. Further modifications to base customer details must be performed through the **Customer Master** registry.
-   **Offline Queues**: If a customer submits a support ticket through the widget while the business is closed, the ticket is routed to the unassigned queue with an open SLA countdown based on the next business day's opening hours.

---

## Best Practices

*   **Move CRM Stages Sequentially**: Do not skip pipeline stages (e.g., moving directly from `New` to `Won`). The AI pipeline velocity metric relies on the history of stage transitions to calculate win probabilities.
*   **Submit Invoices Promptly**: Suppliers should upload invoice files immediately after shipment delivery to ensure timely accounts reconciliation and payment release.
*   **Regularly Reconcile Ledgers**: Accounts staff should perform daily ledger checks to ensure matching records are reconciled.

---

## Tips

*   **Use Autocomplete for Items**: When building quotations or drafting POs, type at least 3 characters in the SKU selector to trigger the inventory lookup index.
*   **Monitor low-stock items**: Purchase managers should check the *Low Stock* alert badge daily to trigger replenishment POs before inventory is depleted.
*   **Convert, Don't Recreate**: When handling a customer inquiry that turns into a sales opportunity, convert the chat session to a CRM lead rather than creating a new record manually to maintain the chat history.

---

## Warnings

> [!WARNING]
> **Plan Access Gating Policies Active**
> Some tabs or features (e.g., Advanced Reports or Chat Flow Builder) may be disabled if your client tenant account is on a basic subscription tier. Contact your administrator if you encounter an "Access Denied / Plan Upgrade Required" warning.

---

## Common Mistakes

*   **Supplier Uploads Incorrect Invoice Amounts**: Entering an invoice amount that does not match the purchase order total will flag the transaction in the Accounts ledger, preventing automatic reconciliation.
*   **Ignoring SLA Timers**: Support agents sometimes prioritize older tickets, allowing urgent open tickets to breach their SLA countdown.
*   **Duplicate Lead Generation**: Creating new CRM leads for existing customers instead of searching the customer registry creates duplicate files and splits communication histories.

---

## FAQs

### Can a support agent access the CRM pipeline?
Yes, support agents have read-only access to CRM records. This allows them to view customer sales stages and context when resolving support tickets.

### How do we handle manual inventory stock corrections?
Navigate to `/purchase?tab=inventory-adjustment`. Select the item SKU, input the correction amount (positive or negative), select the adjustment reason (e.g., damage, discrepancy), and save the entry.

### What happens when an SLA timer breaches?
The ticket status color transitions to red, and an automatic notification is sent to the assigned supervisor or manager.

---

## Troubleshooting

### Issue: "Access Denied / Insufficient Privileges" on CRM Quotations
*   **Probable Cause**: Your user role does not have write access to financial documents.
*   **Resolution**: Ask your system administrator to verify your role in the Roles Master database and check your permissions.

### Issue: Search auto-suggest is empty when creating a Purchase Order
*   **Probable Cause**: The selected website scope has no registered suppliers or inventory items.
*   **Resolution**: Verify that items are populated under the Item Master (`/purchase?tab=inventory-master`) for the selected website scope.

---

## Related Articles

*   [Introduction to JTS Chat Support](file:///e:/Chat%20Support/Documentation/01_Getting_Started/01_introduction.md)
*   [Inventory Catalog Masters Configuration](file:///e:/Chat%20Support/Documentation/18_Settings/03_catalog_masters.md)
*   [Support Ticket SLA Management Policies](file:///e:/Chat%20Support/Documentation/14_Tickets/02_sla_management.md)
