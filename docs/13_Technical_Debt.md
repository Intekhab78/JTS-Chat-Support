# Technical Debt

Related documents: [Bug Tracker](12_Bug_Tracker.md), [Architecture](02_Architecture.md), [Product Roadmap](14_Product_Roadmap.md).

## Critical Debt

| Debt | Impact | Estimated Effort |
|---|---|---:|
| Inconsistent tenant isolation | Security blocker | 2-4d |
| Mock billing path in product routes | Production blocker | 0.5d |
| Missing knowledge-base backend | Broken feature | 1-3d |
| Minimal automated tests | Regression risk | 10-15d |

## High Debt

| Debt | Impact | Estimated Effort |
|---|---|---:|
| Validation not standardized | Bad data/security risk | 3-5d |
| No transaction strategy | Financial/inventory inconsistency | 3-5d |
| Missing pagination/indexes | Scalability risk | 3-5d |
| Disabled/missing CSP and CSRF | Security risk | 2-3d |
| Upload hardening incomplete | Security/compliance risk | 2-4d |

## Medium Debt

| Debt | Impact | Estimated Effort |
|---|---|---:|
| Large inline flow routes | Maintainability | 1-2d |
| Large frontend components | Maintainability/performance | 4-6d |
| Duplicate audit/activity models | Product clarity | 2-3d |
| Alert/console usage | UX/ops polish | 1-2d |
| No OpenAPI contract | Integration risk | 2-4d |

## Low Debt

| Debt | Impact | Estimated Effort |
|---|---|---:|
| Encoding artifacts in comments/docs | Polish | 0.5d |
| Unmounted pages/components | Clarity | 0.5d |
| Timestamp Vite config artifact committed | Repo hygiene | 0.25d |

## Refactoring Tasks

1. Move `flowRoutes.js` inline handlers to controller/service files.
2. Add shared pagination utility for all list endpoints.
3. Add shared validation schemas for invoice, procurement, billing, website, flow.
4. Add tenant-scope middleware or helper applied consistently.
5. Split `EnterpriseReportsCenter`, `FlowBuilder`, `WebsiteManager`, and `ChatPanel`.
6. Consolidate audit timeline strategy.
7. Standardize error response shapes.
8. Add OpenAPI generation or maintained spec.

## Dependencies

Installed dependencies are generally modern. Vulnerability audit was `NOT RUN` in this documentation pass.

