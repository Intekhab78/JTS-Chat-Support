# Bug Tracker

Related documents: [Security Audit](07_Security_Audit.md), [Technical Debt](13_Technical_Debt.md), [Production Readiness](11_Production_Readiness.md).

## Active Bugs and Risks

| ID | Bug | Severity | Status | Module | Priority | Fix Recommendation | Est. |
|---|---|---|---|---|---|---|---:|
| BUG-001 | Invoice create does not verify customer/website ownership before create | Critical | Pending | CRM Invoice | P0 | Load customer, assert website access, match invoice website to customer website | 0.5d |
| BUG-002 | Invoice update mutates by ID without tenant scope | Critical | Pending | CRM Invoice | P0 | Load invoice, assert website access, restrict allowed fields | 0.5d |
| BUG-003 | Invoice delete deletes by ID without tenant scope | Critical | Pending | CRM Invoice | P0 | Load invoice and assert website access before delete | 0.25d |
| BUG-004 | Invoice PDF generation lacks null/tenant checks | Critical | Pending | CRM Invoice | P0 | Check invoice exists and caller owns website | 0.25d |
| BUG-005 | CRM bulk update not tenant-scoped | Critical | Pending | CRM | P0 | Add `websiteId: { $in: ownedWebsiteIds }` to query | 0.5d |
| BUG-006 | CRM bulk delete not tenant-scoped | Critical | Pending | CRM | P0 | Add tenant filter and audit event | 0.5d |
| BUG-007 | Mock checkout route can activate subscription | Critical | Pending | Billing | P0 | Remove or restrict to development/admin only | 0.5d |
| BUG-008 | Knowledge-base UI calls missing API | High | Pending | Knowledge base | P1 | Implement routes/controllers or hide UI | 1.5d |
| BUG-009 | RFQ list is before procurement role gate | High | Pending | Procurement | P1 | Add explicit role guard or scoped supplier behavior | 0.25d |
| BUG-010 | CSRF protection not found | High | Pending | Auth | P1 | Add CSRF or bearer-only auth | 1d |
| BUG-011 | CSP disabled | High | Pending | Security | P1 | Define CSP compatible with dashboard/widget | 1d |
| BUG-012 | Upload malware scanning/private storage not found | High | Pending | Uploads | P1 | Add file validation, scanning, storage policy | 2d |
| BUG-013 | Minimal automated test coverage | High | Pending | QA | P1 | Add integration and E2E suites | 10d |
| BUG-014 | Several list APIs lack pagination | Medium | Pending | API | P2 | Standardize pagination/filtering | 3d |
| BUG-015 | Large React components may degrade performance | Medium | Pending | Frontend | P2 | Split components and add virtualization | 4d |

## Fixed Bugs from Existing Report

| Bug | Module | Status |
|---|---|---|
| Quotation payment crash from missing env import | CRM | Fixed |
| Quotation approve/deny route crash | CRM | Fixed |
| Procurement website scope override | Procurement | Fixed |
| PDF URL used `/api/uploads` | PDF | Fixed |
| PDF generation race condition | PDF | Fixed |
| Widget unsafe DOM injection risk | Widget | Partially fixed |
| JWT placeholder secret handling | Env/security | Fixed |
| Dashboard eager bundle loading | Frontend | Improved |
| CRM reports inline unsafe HTML style | Frontend | Fixed |

