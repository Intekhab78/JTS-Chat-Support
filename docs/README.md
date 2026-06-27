# CTO Documentation Suite

This folder contains the CTO-level documentation suite generated from the current codebase, local reports, project documentation, git history, tests, and build configuration.

Evidence scope: source files in `backend`, `dashboard`, `chat-widget`, root workspace configuration, existing reports, and git history available in this checkout. Items not found in source evidence are marked `NOT FOUND` or `UNKNOWN`.

## Documents

1. [Project Overview](01_Project_Overview.md)
2. [Architecture](02_Architecture.md)
3. [Database Documentation](03_Database_Documentation.md)
4. [API Documentation](04_API_Documentation.md)
5. [Feature Matrix](05_Feature_Matrix.md)
6. [Business Workflows](06_Business_Workflows.md)
7. [Security Audit](07_Security_Audit.md)
8. [Performance Audit](08_Performance_Audit.md)
9. [Testing Guide](09_Testing_Guide.md)
10. [Deployment Guide](10_Deployment_Guide.md)
11. [Production Readiness](11_Production_Readiness.md)
12. [Bug Tracker](12_Bug_Tracker.md)
13. [Technical Debt](13_Technical_Debt.md)
14. [Product Roadmap](14_Product_Roadmap.md)
15. [CTO Master Report](15_CTO_Master_Report.md)

## Maintenance Rules

- Update [API Documentation](04_API_Documentation.md) whenever `backend/src/routes` changes.
- Update [Database Documentation](03_Database_Documentation.md) whenever `backend/src/models` changes.
- Update [Feature Matrix](05_Feature_Matrix.md) and [Production Readiness](11_Production_Readiness.md) after each release.
- Keep bug and debt status synchronized with [Bug Tracker](12_Bug_Tracker.md) and [Technical Debt](13_Technical_Debt.md).
