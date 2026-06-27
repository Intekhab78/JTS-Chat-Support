# Project Overview

Related documents: [Architecture](02_Architecture.md), [Feature Matrix](05_Feature_Matrix.md), [CTO Master Report](15_CTO_Master_Report.md).

## Vision

The project is a multi-tenant customer operations platform that combines website live chat, support tickets, CRM, sales follow-up, procurement, inventory, reports, billing, and an embeddable chat widget.

## Business Goal

Enable businesses to capture website visitors, resolve support issues, convert sales opportunities, manage operational teams, and report performance from one SaaS dashboard.

## Product Scope

Evidence in code shows these product areas:

- React dashboard in `dashboard`.
- Express/MongoDB/Socket.IO backend in `backend`.
- Embeddable chat widget in `chat-widget`.
- CRM, tickets, chat, websites, users, roles, departments, categories, canned responses, analytics, audit logs, billing, inventory, procurement, supplier portal, notifications, flows, webhooks, and tracking.

Out of scope or `NOT FOUND` as complete implementations: HR, POS, expense management, full accounting ledger, tax/GST engine, mobile app, WhatsApp integration, SMS gateway, Google/Microsoft login.

## Target Users

| User | Evidence | Purpose |
|---|---|---|
| Admin | `App.jsx`, `requireRole("admin")` | Platform owner and global operator. |
| Client | `ClientPage`, website and billing routes | Tenant owner. |
| Manager | `ManagerPage`, role utilities | Operational supervisor. |
| Agent/User | `AgentPage`, chat routes | Live support operator. |
| Sales | `SalesPage`, CRM routes | Lead and deal owner. |
| Purchase | `PurchasePage`, procurement/inventory routes | Procurement and stock workflow user. |
| Supplier | `SupplierPage`, supplier routes | External supplier portal user. |
| Accounts | `AccountsPage`, invoice/billing routes | Finance/accounts user. |

## Business Model

The code supports SaaS-style subscriptions through Stripe Checkout/Billing Portal and plan access middleware. Razorpay is installed but a complete Razorpay flow is `NOT FOUND`.

## SaaS Model

Evidence:

- `User.subscription` includes plan/status/limits.
- `planAccess` middleware gates modules.
- Billing routes include subscription status, checkout, portal, and admin subscription listing.
- Website count is limited by subscription limits in `websiteController`.

Risk: `/api/billing/mock-checkout` exists and should not be enabled in production. See [Security Audit](07_Security_Audit.md).

## Current Status

Current stage: advanced prototype / pre-production.

| Area | Status |
|---|---|
| Feature breadth | High |
| Production readiness | Needs improvement |
| Security | Critical tenant-scope gaps remain |
| Testing | Minimal smoke tests only |
| Documentation | Existing user docs and this CTO suite |
| Deployment | Render/Vercel guidance exists; CI/CD `NOT FOUND` |

