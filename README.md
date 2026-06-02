# Multi-Tenant Chat Support Platform

This repository contains:

- `backend`: Express, MongoDB, Socket.io API
- `dashboard`: React admin dashboard for managers and agents
- `chat-widget`: production widget bundle source used for the embeddable customer chat experience

## Quick start

1. Run `npm install`
2. Create `backend/.env`
3. Start backend with `npm run dev:backend`
4. Start dashboard with `npm run dev:dashboard`
5. Optional seed: `npm run seed`

Example `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/chat-support
JWT_SECRET=change-me
CLIENT_URL=http://localhost:5173
WIDGET_PUBLIC_URL=http://localhost:5000/chat-widget.js
```

## Environment variables

- `PORT`: Optional locally; Render and most hosting providers inject this automatically. The server binds to whatever value the platform passes in.
- `MONGODB_URI` (required): The connection string for your MongoDB cluster (Atlas, Render managed database, etc.). The backend now throws an error before starting if this is missing so you can catch configuration issues early.
- `JWT_SECRET`: Used by the authentication flows; set something unpredictable in production.
- `CLIENT_URL` / `WIDGET_PUBLIC_URL`: Update these to the deployed dashboard and widget endpoints so CORS and script imports work during development and production; `WIDGET_PUBLIC_URL` should point to the same host that serves `/chat-widget.js` in production so the Manager snippet and widget loader both reference the live API.

## Deploying to Render

1. Provision a MongoDB instance (Atlas, Render deploy, or another cloud provider) and copy its connection string.
2. In the Render dashboard, add `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `WIDGET_PUBLIC_URL` (if you host the widget separately) as environment variables for the backend service.
3. Render injects `PORT` automatically and honors the port binding instructions from the docs, so no additional `PORT` configuration is necessary.
4. Trigger a deploy. If `MONGODB_URI` is missing, the service now fails with an explicit error instead of attempting to connect to `127.0.0.1` and timing out the port scan.

## Dashboard environment variables

- `VITE_API_URL`: Full base URL for the deployed backend (for example `https://chat-backend-3pcj.onrender.com`). When missing the dashboard defaults to `http://localhost:5000` locally and to the current Render URL in production builds, but you still need to configure it in Vercel (or whichever host you use) so the site calls the live service. The Manager dashboard recomposes the embed snippet from this value, so update it and trigger a rebuild whenever the backend hostname changes so visitors always receive the live script instead of the localhost fallback.
- Deployments on Vercel should add this variable in the project settings to point at your Render backend; `.env.example` in the `dashboard` package shows the expected format.

Seeded credentials:

- Manager: `manager@example.com` / `Password123!`
- Agent: `agent@example.com` / `Password123!`
