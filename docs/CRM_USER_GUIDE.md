# CRM User Guide

## Overview

A concise, UI-focused user guide for the CRM features: roles, pipeline, leads, quotations, payments, reports, notifications, and common troubleshooting.

## Roles & Permissions

- **Admin**: Full tenant control, user management, billing, webhooks, pipeline config, reports.
- **Client**: Website owner-level access, reports, site management, quotation approval when permitted.
- **Manager**: Team lead, pipeline editing, quotation approval/denial, lead bulk management, reports, owner assignment.
- **Sales**: Assigned lead work, notes, follow-ups, quotations, stage movement.
- **Agent**: Limited CRM interactions depending on tenant settings.

## Quick Start

1. Log in to the Dashboard.
2. Select the target Website when a selector is available.
3. Open the CRM or Sales section from navigation.

## Main UI Areas

- **Board / Pipeline**: Stage columns for lead movement.
- **Table / List**: Search, filter, sort, and bulk-manage leads.
- **Detail Panel**: Lead overview, activity, tasks, messages, files, quotations.
- **Quotations Tab**: Create, send, approve, deny, and pay for quotes where configured.
- **Reports**: Won revenue, conversion time, pipeline value, and leaderboards where enabled.

## Lead Lifecycle

1. Create lead with `New Lead`.
2. Edit lead from the detail panel.
3. Add notes, tasks, or email.
4. Move stage through the pipeline.
5. Moving to won triggers post-win behavior where enabled.

## Pipeline Stage Editor

Managers and admins can edit stages where the UI exposes this control. Stage persistence depends on backend website pipeline configuration.

## Post-Win Workflow

When a lead is moved to won, the system may:

- Convert or mark the record as a customer.
- Create onboarding or follow-up tasks.
- Draft or prepare quotation/invoice workflow.
- Record activity and analytics.
- Notify responsible users.

## Quotations and Payments

- Create quote from a lead's quotation tab.
- Send quote to generate or attach a PDF where configured.
- Managers can approve or deny qualifying quotations.
- Stripe payment intent support exists for quotations when Stripe is configured.

## Reports

CRM reports support filters and summaries where enabled by role and plan. Export support exists for selected analytics/reporting screens.

## Notifications and Activity

In-app notifications and activity timelines record assignments, stage changes, quote events, task activity, and other operational events where implemented.

## Admin Setup Checklist

- Configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `WIDGET_PUBLIC_URL`.
- Configure SMTP for outgoing CRM email.
- Configure Stripe keys for payment flows.
- Ensure backend, dashboard, and widget URLs match deployed domains.

## Troubleshooting

- CRM email not sending: verify SMTP configuration and lead email.
- Stripe payments failing: verify Stripe secret and webhook configuration.
- Stage order not persisting: verify backend website pipeline persistence.
- User cannot access CRM: verify role, website assignment, and plan access.

