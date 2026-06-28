# Screenshot & Media Production Guide

This guide details the media assets required for the JTS Chat Support documentation system, including screenshot names, annotation guidelines, zoom requirements, sensitive data filters, and video capture sequences.

---

## 1. Media Production Guidelines

*   **Format**: Use PNG for static screenshots to ensure text clarity. Use WebP or GIF animations for loop files. Use MP4 for video tutorials.
*   **Resolution**: Capture all dashboard screenshots at **1920x1080** (16:9 ratio). Capture mobile widget screens at **375x812** (iPhone portrait ratio).
*   **Browser Setup**: Enable clean profiles (deactivate all extensions and developer bars). Set scale zoom to **100%** (unless specified otherwise). Use clean workspace databases containing seeding mock records.
*   **Masking Rules**: Always blur or obscure API secret keys, Stripe payment details, password parameters, and user sessions.

---

## 2. Screenshot Production Checklist

### 2.1 Registration & Login Page
*   **Screenshot Name**: `login_portal_view.png`
*   **Sequence Number**: 01
*   **Module**: Authentication
*   **Screen**: Login Gateway `/login`
*   **Purpose**: Demonstrates the email/password entry screen and the 2FA redirect panel.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Email input field, password input field, login submit button, and Register Account link.
*   **Sensitive Data to Hide**: Do not input active passwords; use mock placeholder values (e.g. `••••••••`).

### 2.2 Two-Factor Setup Page
*   **Screenshot Name**: `two_factor_setup_form.png`
*   **Sequence Number**: 02
*   **Module**: Security & Accounts
*   **Screen**: Profile settings modal (`/client?tab=profile`)
*   **Purpose**: Displays the QR code and secret base32 setup keys.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 110% (Zoomed to modal container)
*   **Annotation Areas**: Authenticator QR code block, base32 raw string key, and authentication verification code input.
*   **Sensitive Data to Hide**: Blur or obscure the active QR code and raw secret strings.

### 2.3 Subscription Billing Portal
*   **Screenshot Name**: `billing_plans_grid.png`
*   **Sequence Number**: 03
*   **Module**: Billing & Subscriptions
*   **Screen**: Billing management console (`/client?tab=billing`)
*   **Purpose**: Compares features and limits of Basic, Standard, and Pro plans.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Plan pricing cards, mock sandbox upgrade buttons, and website limits progress bar.
*   **Sensitive Data to Hide**: Stripe test card numbers.

### 2.4 Website Setup Portal
*   **Screenshot Name**: `website_snippet_modal.png`
*   **Sequence Number**: 04
*   **Module**: Website Management
*   **Screen**: Onboarding websites tab (`/client?tab=websites`)
*   **Purpose**: Displays the script snippet containing the API integration key.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 120% (Zoomed to code block container)
*   **Annotation Areas**: Copy code snippet button, website name input field, and webhook configurations.
*   **Sensitive Data to Hide**: Obscure the website API keys and webhook signing secrets.

### 2.5 Active Chat Queue Dashboard
*   **Screenshot Name**: `chat_workspace_desk.png`
*   **Sequence Number**: 05
*   **Module**: Live Chat
*   **Screen**: Agent chat console (`/agent?tab=chats`)
*   **Purpose**: Displays active and unassigned conversation queues, chat text threads, and customer profile details.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Chat lists, claim buttons, yellow internal notes tab, and visitor metadata panels.
*   **Sensitive Data to Hide**: Blur visitor IP addresses and email addresses in details panels.

### 2.6 Chat Flow Builder Canvas
*   **Screenshot Name**: `flow_builder_editor.png`
*   **Sequence Number**: 06
*   **Module**: Flow Builder
*   **Screen**: Canvas builder workspace (`/client?tab=flows`)
*   **Purpose**: Displays node tree views, editing sidebars, and diagnostic validation warnings.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Nodes list tree, options configurator drawer, and Save validation badge.
*   **Sensitive Data to Hide**: None.

### 2.7 CRM Kanban Pipeline
*   **Screenshot Name**: `crm_kanban_board.png`
*   **Sequence Number**: 07
*   **Module**: CRM
*   **Screen**: CRM board view (`/client?tab=crm`)
*   **Purpose**: Displays lead cards arranged by pipeline stage columns.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Pipeline stage columns, lead cards, search filters, and CRM promote buttons.
*   **Sensitive Data to Hide**: Customer phone numbers and email addresses.

### 8. Support Tickets Queue
*   **Screenshot Name**: `ticket_dashboard_list.png`
*   **Sequence Number**: 08
*   **Module**: Support Ticketing
*   **Screen**: Tickets dashboard table (`/client?tab=tickets`)
*   **Purpose**: Displays active tickets lists, priority badges, SLA indicators, and owner assignments.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: SLA warning badges, priority columns, and Create Ticket manual forms.
*   **Sensitive Data to Hide**: None.

### 2.9 Next Best Action Dashboard
*   **Screenshot Name**: `crm_lead_nba_card.png`
*   **Sequence Number**: 09
*   **Module**: AI Assistant / CRM
*   **Screen**: Lead details drawer (`/client?tab=crm` -> select card)
*   **Purpose**: Displays recommended next actions based on lead status.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 120% (Zoomed to drawer content)
*   **Annotation Areas**: Next Best Action recommendation panel, action priority status, and follow-up buttons.
*   **Sensitive Data to Hide**: None.

### 2.10 Executive Reports Center
*   **Screenshot Name**: `reports_dashboard_main.png`
*   **Sequence Number**: 10
*   **Module**: Reports & Analytics
*   **Screen**: Executive reports tab (`/client?tab=reports`)
*   **Purpose**: Displays customizable reports, date range filters, and Recharts line, bar, area, and funnel charts.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Date range selector, Customize Dashboard layouts button, and export menu.
*   **Sensitive Data to Hide**: None.

### 2.11 Security Roles Configuration Panel
*   **Screenshot Name**: `admin_roles_grid.png`
*   **Sequence Number**: 11
*   **Module**: Settings & Administration
*   **Screen**: Roles configuration workspace (`/client?tab=roles`)
*   **Purpose**: Displays the custom roles grid and permissions matrix.
*   **Required Resolution**: 1920x1080
*   **Zoom Requirements**: 100%
*   **Annotation Areas**: Custom roles list, permission groups toggle boxes, and create role form fields.
*   **Sensitive Data to Hide**: None.

---

## 3. Video & Interactive Workflow Recording Runbooks

### 3.1 [Video Tutorial] Chat to Support Ticket Escalation
*   **Recording Name**: `ticket_conversion_process`
*   **Module**: Support Ticketing, Live Chat
*   **Recording Length**: 20-30 seconds
*   **Sequence Actions**:
    1.  Start on the active chat workspace (`/agent?tab=chats`).
    2.  Click **Convert to Ticket** in the options panel.
    3.  Enter a sample subject and select a category.
    4.  Click **Submit** and observe the ticket tracking card appearing in the chat stream.
*   **Visual Highlights**: Highlight the conversion card and the public tracking link.

### 3.2 [Video Tutorial] Lead Promotion & Quotation Payment
*   **Recording Name**: `crm_lead_pipeline_flow`
*   **Module**: CRM, Billing
*   **Recording Length**: 25-30 seconds
*   **Sequence Actions**:
    1.  Start on the CRM Kanban board `/client?tab=crm`.
    2.  Click a lead card to open the profile details drawer.
    3.  Select the **Quotations** tab and click **Create Quotation**.
    4.  Add a line item and click **Save**.
    5.  Request manager approval, then send the quotation email containing the Stripe checkout link.
*   **Visual Highlights**: Highlight the Stripe checkout portal and the update to won status.

### 3.3 [GIF Loop] Customizable Reports Layout drag-and-drop
*   **Recording Name**: `reports_customization_export`
*   **Module**: Reports & Analytics
*   **Recording Length**: 10-15 seconds (looped)
*   **Sequence Actions**:
    1.  Start on the Executive Reports panel.
    2.  Click **Customize Dashboard**.
    3.  Drag the active websites card and place it before the active clients card.
    4.  Click **Done Editing** and observe the layout save confirmation.
*   **Visual Highlights**: Reordering animation.

### 3.4 [GIF Loop] Real-time Supervisor Critical Alert
*   **Recording Name**: `intel_supervisor_alert`
*   **Module**: Heuristics AI Assistant
*   **Recording Length**: 10-15 seconds (looped)
*   **Sequence Actions**:
    1.  Simulate a visitor sending a frustrated message in the chat widget.
    2.  Observe the supervisor dashboard showing a notification: **Critical Sentiment Alert**.
    3.  Click the notification link to open the active chat session.
*   **Visual Highlights**: The notification popup and sentiment badge.
