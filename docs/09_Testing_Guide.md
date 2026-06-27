# Testing Guide

Related documents: [Bug Tracker](12_Bug_Tracker.md), [Production Readiness](11_Production_Readiness.md), [API Documentation](04_API_Documentation.md).

Current test evidence:

- `backend/scripts/run-health-tests.mjs`
- `backend/tests/health.test.js`
- Root `npm test` delegates to backend tests.
- Tests cover website scope helper, PDF output path, env validation, and uploads directory.

## Unit Test Checklist

- Auth controller: register, login, refresh, 2FA.
- Role utilities: normalize role, website ownership.
- Permission utilities: CRM permissions by role.
- Validators: ticket, CRM, task, password reset.
- PDF service: quote, invoice, PO.
- Currency formatter.
- Inventory quantity calculations.
- Procurement status transitions.
- Notification payload creation.
- Audit log sanitization.

## Integration Test Checklist

- Login then `/api/auth/me`.
- Website CRUD with tenant scoping.
- Agent/client creation and role restrictions.
- Chat session create/read/update.
- Chat to ticket conversion.
- Ticket update, bulk update, delete.
- CRM create/update/archive/search.
- CRM bulk update/delete tenant isolation.
- Quotation create/send/approve/deny/pay.
- Invoice create/update/delete/PDF tenant isolation.
- Inventory item/movement/master flows.
- PO create/deliver -> inventory movement.
- Supplier portal order status update.
- Billing checkout and portal.
- Mock checkout disabled outside dev.
- Audit/security endpoints by plan.

## E2E Checklist

- Admin creates client.
- Client creates website and gets embed script.
- Visitor opens widget and starts chat.
- Agent accepts chat and replies.
- Agent converts chat to ticket.
- Sales promotes visitor to lead.
- Sales moves lead through pipeline.
- Quote is created and sent.
- Invoice is created.
- Purchase user receives won customer workflow.
- PO is created and delivered.
- Inventory increases.
- Reports reflect activity.

## Regression Checklist

- Procurement website scoping cannot be bypassed.
- PDF URLs use `/uploads/`.
- PDF file exists before response path is returned.
- JWT placeholder is rejected in non-local environments.
- CRM reports do not use `dangerouslySetInnerHTML`.
- Widget does not inject unsafe visitor-provided HTML.
- Route-level lazy loading still works.

## Manual QA Checklist

- Login for every role.
- Confirm navigation access per role.
- Confirm unauthorized routes redirect or return 403.
- Confirm responsive layouts on mobile/tablet/desktop.
- Confirm dark mode readability.
- Confirm empty states and loaders.
- Confirm file upload limits and invalid file handling.
- Confirm PDF download/open.
- Confirm notifications appear in real time.

## Smoke Test Checklist

- Backend app imports.
- `/health` responds.
- Dashboard builds.
- Widget builds and copies to backend public file.
- Backend smoke tests pass.
- Static safety checks pass.

## Production Verification Checklist

- Production env variables set.
- MongoDB connectivity verified.
- JWT secret strong.
- Stripe live/test mode intentional.
- SMTP sends test email.
- Widget loads from production backend.
- CORS origins locked down.
- Rate limits active.
- Backups configured.
- Monitoring/logging configured.

