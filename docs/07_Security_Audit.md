# Security Audit

Related documents: [API Documentation](04_API_Documentation.md), [Bug Tracker](12_Bug_Tracker.md), [Production Readiness](11_Production_Readiness.md).

## Security Score

Current security score: 5/10.

This score reflects solid foundations but critical authorization gaps and production-hardening gaps.

## Authentication

Evidence:

- JWT-based auth middleware.
- Tokens accepted from `Authorization: Bearer`, cookie `jwt`, and query `token`.
- Password hashing uses bcrypt.
- 2FA setup/verify/disable routes exist.

Concerns:

- Query-token authentication increases leakage risk.
- CSRF protection is `NOT FOUND` while cookie auth is supported.

## Authorization and RBAC

Evidence:

- `requireRole`.
- `normalizeRole`.
- CRM permissions utility.
- Plan access middleware.
- Website scope helper.

Critical issues:

- Invoice create/update/delete/PDF operations do not consistently verify tenant ownership.
- CRM bulk update/delete updates by raw IDs without tenant scoping.
- RFQ list is available before procurement role gate to any authenticated user.
- Mock checkout route allows subscription mutation for any authenticated user in route layer.

## Tenant Isolation

Strength: many controllers use `getOwnedWebsiteIds` and `assertWebsiteAccess`.

Risk: tenant isolation is inconsistent. High-risk modules: invoices, CRM bulk operations, billing mock checkout, some flow/template operations.

## JWT

Strength: env validation rejects placeholder secret outside allowed local contexts.

Risk: query token support, cookie CSRF exposure, unknown token rotation/refresh policy details.

## Password Security

Evidence: bcryptjs dependency and hashing in auth/user flows. Password policy beyond minimum length is `UNKNOWN`.

## Rate Limiting

Evidence: login/reset routes and `/api` general limiter in `app.js`.

Risk: widget and public tracking endpoints may need stricter abuse protection.

## CSRF

Status: `NOT FOUND`.

Recommendation: either implement CSRF protection for cookie-based auth or remove cookie auth and standardize on bearer tokens.

## XSS

Positive: previous report documents widget DOM injection fixes and removal of `dangerouslySetInnerHTML` in CRM reports.

Risk: widget still builds some dynamic HTML strings for forms. Review all `innerHTML` usage before production.

## SQL/NoSQL Injection

SQL injection: not applicable to MongoDB/Mongoose.

NoSQL risk: regex search and direct query construction exist. Validate and sanitize all query filters and prevent operator injection in body/query payloads.

## Secrets

Evidence:

- Env validation for `MONGODB_URI` and `JWT_SECRET`.
- Stripe/SMTP config read from env.

Risks:

- Webhook secrets in website config appear as ordinary schema fields.
- 2FA secret storage approach needs security review.
- Mock/default SMTP values exist in services.

## Uploads

Evidence: Multer config and upload routes.

Risks:

- Malware scanning `NOT FOUND`.
- Signed/private file access `NOT FOUND`.
- Retention cleanup `NOT FOUND`.

## Logging and Audit

Evidence: `AuditLog`, `ActivityEvent`, security center, logger utility.

Risks:

- Audit coverage is inconsistent.
- Production structured logging/monitoring `NOT FOUND`.

## Critical Recommendations

1. Enforce tenant ownership for every invoice read/write/PDF operation.
2. Scope CRM bulk update/delete by owned websites.
3. Disable mock checkout outside local development or remove it.
4. Add CSRF protection or stop using auth cookies.
5. Define production CSP.
6. Harden uploads with file scanning, content-type verification, and private storage.
7. Add permission regression tests.
8. Encrypt sensitive webhook and 2FA data.

