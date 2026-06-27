# Deployment Guide

Related documents: [Architecture](02_Architecture.md), [Production Readiness](11_Production_Readiness.md), [Security Audit](07_Security_Audit.md).

## Environment Variables

Backend evidence:

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | Backend port. Hosting platforms may inject it. |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | JWT signing secret. |
| `CLIENT_URL` | Yes for production | Dashboard URL. |
| `WIDGET_PUBLIC_URL` | Yes for production | Public widget JS URL. |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated CORS origins. |
| `SMTP_HOST` | For email | SMTP host. |
| `SMTP_PORT` | For email | SMTP port. |
| `SMTP_USER` | For email | SMTP username. |
| `SMTP_PASS` | For email | SMTP password. |
| `SMTP_FROM` | For email | Sender address. |
| `STRIPE_SECRET_KEY` | For Stripe | Stripe API key. |
| `STRIPE_WEBHOOK_SECRET` | For Stripe webhooks | Stripe signature verification. |
| `STRIPE_BASIC_PRICE_ID` | For checkout | Price ID. |
| `STRIPE_STANDARD_PRICE_ID` | For checkout | Price ID. |
| `STRIPE_PRO_PRICE_ID` | For checkout | Price ID. |
| `SLA_QUEUE_ALERT_MINUTES` | Optional | SLA alert threshold. |
| `SLA_TICKET_ALERT_HOURS` | Optional | Ticket SLA hours. |
| `CRM_LEAD_REASSIGN_MINUTES` | Optional | Lead reassignment threshold. |

Dashboard:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL. |

## Development Setup

```bash
npm install
npm run dev:backend
npm run dev:dashboard
```

Optional seed:

```bash
npm run seed
```

## Production Setup

1. Provision MongoDB.
2. Configure backend env variables.
3. Build dashboard and widget.
4. Deploy backend Node service.
5. Deploy dashboard static site.
6. Verify widget served from backend `/chat-widget.js`.
7. Lock CORS origins.
8. Run smoke tests.

## PM2

PM2 config is `NOT FOUND`. Future example:

```bash
pm2 start backend/src/server.js --name chat-support-api
pm2 save
```

## Docker

Dockerfile and compose files are `NOT FOUND`.

Future plan:

- Backend Dockerfile.
- Dashboard static build served by Nginx or CDN.
- Compose file for local MongoDB only.

## Nginx

Nginx config is `NOT FOUND`. Future reverse proxy:

- `/api` -> backend.
- `/socket.io` -> backend with websocket upgrade.
- `/chat-widget.js` -> backend.
- Dashboard served separately or proxied.

## SSL and Domain

Use managed SSL from Render/Vercel/Cloudflare/Nginx. Ensure:

- Dashboard URL matches `CLIENT_URL`.
- Widget public URL matches deployed backend.
- `ALLOWED_ORIGINS` includes dashboard domain only.

## Backups and Restore

Backup automation is `NOT FOUND`.

Required:

- Daily MongoDB backups.
- Restore runbook.
- Uploads backup if local filesystem is used.

## Monitoring

Monitoring/APM is `NOT FOUND`.

Recommended:

- Uptime checks for `/health`.
- Error logging.
- MongoDB slow query monitoring.
- Socket connection metrics.
- Disk usage monitoring for uploads.

## Rollback

Rollback plan is `NOT FOUND`.

Required:

- Keep previous backend release.
- Keep previous dashboard build.
- Database migration rollback policy.
- Widget bundle versioning.

## CI/CD

CI config is `NOT FOUND`.

Recommended pipeline:

```bash
npm ci
npm run lint
npm test
npm run build
```

