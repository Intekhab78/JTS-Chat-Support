# CRM User Guide

## Overview
A concise, UI-focused user guide for the CRM features: roles, pipeline, leads, quotations, payments, reports, notifications, and common troubleshooting.

## Roles & Permissions
- **Admin**: Full tenant control — user management, billing, webhooks, pipeline config, reports.
- **Client**: Website owner-level access — view reports, manage sites, approve quotations if permitted.
- **Manager**: Team lead — edit pipeline stages, approve/deny quotations, bulk update leads, view full reports, assign owners.
- **Sales**: Work assigned leads — create notes, follow-ups, quotations, move leads through stages.
- **Agent**: Limited CRM interactions (follow-ups, reply, small edits) depending on tenant settings.

## Quick Start
1. Log in to the Dashboard.
2. Select the target Website (top-left selector).
3. Open the `CRM` / `Sales` section from the main navigation.

## Main UI Areas
- **Board (Pipeline)**: Columns are active stages. Drag cards between columns to change stage. Moving to `Won` triggers post-win actions.
- **Table (List)**: Search, filter, sort, and bulk-manage leads.
- **Detail Panel**: Click a lead to view Overview, Activity, Tasks, Messages, Files, Quotations.
- **Quotations Tab**: Create, send, approve, deny, and pay for quotes.
- **Reports**: View won revenue, conversion time, pipeline value, agent leaderboards.

## Lead Lifecycle (UI Steps)
- Create lead: `+ New Lead` → fill fields → `Create`.
- Edit lead: Open detail panel → click edit icons → Save.
- Add note or email: Use `Notes` or `Send Email` within the lead detail.
- Create task: `Create Task` inside the lead — appears in `My Tasks` or `CRM Tasks`.
- Move stage: Drag a card to new column. If moved to `Won`, post-win automation runs.

## Pipeline Stage Editor (Manager/Admin)
- Open `Edit Stages` from the Board view.
- Add stage: `Add Stage` → name, color, probability.
- Hide stage: Toggle `Active` to hide (recommended instead of delete).
- Reorder: Drag stages to change column order.
- Save: Persist changes for your tenant/website (if backend persistence is enabled).

## Post-Win Workflow (What happens)
When a lead is moved to `Won` the system (if enabled):
- Converts lead into a `Customer` record.
- Sets status and `dealStage` to `won`.
- Creates onboarding follow-up tasks for the owner.
- Drafts a `Quotation` and optionally generates a PDF.
- Records analytics (won revenue and conversion time).
- Sends in-app/email notifications to owner/manager.
- Logs activity and audit events for tracing.

## Quotations & Payments (UI)
- Create quote: Lead Detail → `Quotations` → `New Quotation` → add items → `Save Draft`.
- Send quote: Open draft → `Send` → status becomes `Sent` and PDF is generated if enabled.
- Approve/Deny: Manager can `Approve` or `Deny` from quote UI.
- Pay: If Stripe is configured, `Pay` creates a PaymentIntent and the client confirms payment via the frontend.
- On successful payment: Quotation marked accepted and lead may be finalized as won.

## Reports (UI Features)
- Filters: Time range (Today/Week/Month), Website, Owner, Stage.
- Widgets: Won Revenue, Avg Conversion Time, Pipeline Value, Weighted Revenue, Agent Leaderboard.
- Export: CSV/JSON export for widgets (if enabled by tenant).

## Notifications & Activity
- In-app notifications show assignments, quote events, payments.
- Activity timeline records changes to lead (notes, emails, stage changes, quotation events).
- Audit logs capture managerial operations and critical state changes.

## Admin Setup Checklist
- Set environment variables in backend: `MONGODB_URI`, `JWT_SECRET`, `PORT` (optional), `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`.
- Optional: `npm install pdfkit sanitize-filename` in `backend` for PDF generation.
- Ensure the backend port (default 5000) is free, or set `PORT` to an alternate value.
- Configure email/SMTP for outgoing emails and a Socket server for real-time notifications.

## Troubleshooting
- Server crash due to missing PDF deps: Install `pdfkit` + `sanitize-filename` or rely on lazy-load fallback.
- `Port 5000` conflict: free the port or set `PORT` env before running backend.
- Stripe payments failing: Verify `STRIPE_SECRET` and webhook `STRIPE_WEBHOOK_SECRET` match Stripe dashboard and confirm the frontend confirms the PaymentIntent with Stripe.js.
- Stage order not persisting: Check backend pipeline persistence is enabled — stage edits might be in-memory if not persisted to DB.

## Quick UI Walkthroughs
- Create & send quotation: CRM → Lead → Quotations → `New Quotation` → items → `Save Draft` → `Send`.
- Mark lead won: Board → drag card to `Won` → confirm post-win actions (if prompted).
- Reorder stages (Manager): Board → `Edit Stages` → drag to reorder → `Save`.
- Run report: CRM → `Reports` → choose filters → `Export`.

## FAQ
- Q: Who can edit pipeline stages? A: Managers and Admins only.
- Q: Can Sales send quotes? A: Yes, if they are the owner or manager allows it.
- Q: What happens on payment success? A: The quote is accepted and analytics are updated; automation can mark the deal won.

## Next Steps & Optional Deliverables
- I can create role-specific one-page cheat sheets (Sales, Manager, Admin).
- I can add UI screenshots and annotated flows if you provide them or want me to capture the running app.
- I can wire this guide into `README.md` or `HELP_MANUAL.md` with quick links.

---
Generated by the project assistant. For changes or to expand any section, tell me which role or feature to detail next.
