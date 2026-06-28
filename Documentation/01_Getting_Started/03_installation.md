# Local Installation and Development Setup

This document provides a technical guide for developers and system administrators to install JTS Chat Support locally, configure environment variables, seed database collections, and start the development servers.

---

## Overview

JTS Chat Support is built using npm workspaces. The root directory manages three modular projects:
*   `backend`: The Express server and WebSocket connection hub.
*   `dashboard`: The Vite-powered React single page application (SPA).
*   `chat-widget`: The embeddable client-side chat script.

Installing dependencies at the root directory links these workspaces, allowing you to run, build, and test the full application from a single command line.

---

## Purpose

The purpose of this guide is to explain the installation process, prevent configuration mismatches, and describe the environment parameters required to achieve a working local instance of the platform.

---

## Workspace Navigation

When configuring or debugging the installation, refer to these directories:

*   **Root Configuration**: [/package.json](file:///package.json) (Defines workspaces, root build commands, and script links).
*   **Server Code**: [/backend/src/app.js](file:///backend/src/app.js) (API endpoints registration and Express middleware configs).
*   **Database Seeding Script**: [/backend/src/scripts/seed.js](file:///backend/src/scripts/seed.js) (Inserts default roles, client settings, and default admin login).
*   **Vite Configurations**: [/dashboard/vite.config.js](file:///dashboard/vite.config.js) (Vite bundler options).

---

## Prerequisites

Before starting the installation, ensure the following software is installed on your local host:

### Required Software
*   **Node.js**: Version `18.0.0` or higher (verified up to Node v20 LTS). Check version: `node -v`.
*   **npm**: Version `9.0.0` or higher. Check version: `npm -v`.
*   **MongoDB**: Local MongoDB Community Server running on `mongodb://127.0.0.1:27017` OR access to an active MongoDB Atlas cluster.
*   **Git**: Required to clone and branch the source repository.

---

## Step-by-Step Installation Guide

Follow these steps to set up JTS Chat Support:

### Step 1: Clone the Repository
Open a terminal shell and clone the project repository:
```bash
git clone <repository-url>
cd "Chat Support"
```

### Step 2: Install Node Dependencies
Run the installation command at the workspace root directory. This command installs dependencies for all workspace modules:
```bash
npm install
```

### Step 3: Configure Backend Environment
Navigate to the `backend/` folder and create a `.env` file (copied from `.env.example`):
```bash
cd backend
copy .env.example .env
```
Open `backend/.env` in your text editor and input the configuration values:
-   Set your local MongoDB URI.
-   Generate a secure, random string for the `JWT_SECRET`.
-   Configure the SMTP variables for outbound notification mailings.

### Step 4: Configure Dashboard Environment (Optional)
If you need to override the default local backend port mapping (default is `http://localhost:5000`), create a `.env` file in the `dashboard/` folder:
```bash
cd ../dashboard
copy .env.example .env
```
Ensure `VITE_API_URL` or `VITE_LOCAL_API_URL` points to the correct backend host.

### Step 5: Seed the Database
Return to the root workspace directory and seed the database. This script creates the platform metadata, registers system roles, creates default categories/departments, and generates a default administrator account:
```bash
cd ..
npm run seed
```
> **Default Admin Account Generated**:
> *   **Username/Email**: `admin@admin.com`
> *   **Password**: `admin123`

### Step 6: Start Backend Dev Server
Open a separate terminal window and execute:
```bash
npm run dev:backend
```
This launches the server using `nodemon`. The console will display:
`Server running on port 5000` and `Database connected successfully`.

### Step 7: Start Dashboard Dev Server
Open another terminal window and execute:
```bash
npm run dev:dashboard
```
Vite will start the client dev server, usually exposing the dashboard at `http://localhost:5173`.

### Step 8: Build and Copy Chat Widget
To compile the embeddable chat widget script and copy the bundle into the backend public folder for visitor access:
```bash
npm run build
```

---

## Environment Variables Configuration

The following parameters must be configured in `backend/.env`:

| Variable | Format / Preset | Description |
| :--- | :--- | :--- |
| **PORT** | `5000` | The network port the Express server binds to locally. |
| **MONGODB_URI** | Connection string | MongoDB connection path (local string or remote replica set URL). |
| **JWT_SECRET** | 64-char Hex String | Key used to sign and verify JSON Web Tokens. |
| **CLIENT_URL** | `http://localhost:5173` | The origin URL of the React dashboard (enforces CORS rules). |
| **WIDGET_PUBLIC_URL** | `http://localhost:5000/chat-widget.js` | The absolute HTTP path where the client widget script is served. |
| **ALLOWED_ORIGINS** | Comma-separated list | Allowed origins for CORS requests. |
| **SMTP_HOST** | `smtp.gmail.com` | Outbound mail server hostname. |
| **SMTP_PORT** | `587` | Network port for SMTP (TLS port `587` or SSL port `465`). |
| **SMTP_USER** | Email address | Username for authenticating SMTP sessions. |
| **SMTP_PASS** | App passcode string | Password or app password for the SMTP account. |
| **SMTP_FROM** | `Name <email>` | Default sender headers displayed on notifications. |
| **SLA_QUEUE_ALERT_MINUTES**| Integer | Unassigned chat queue wait limits before alert triggers. |
| **SLA_TICKET_ALERT_HOURS** | Integer | Open support ticket SLA limit before breach escalation. |

---

## Notes

- **Workspace Node Resolution**: Avoid executing `npm install` inside the `backend/` or `dashboard/` subfolders individually. Installing dependencies at the workspace root ensures shared package links are created correctly in the root `node_modules/` folder.
- **Port Clashes**: The dashboard uses port `5173` and the backend uses port `5000` by default. Ensure no other local services (such as PostgreSQL or local web hosts) occupy these ports.

---

## Best Practices

*   **Avoid Committing env Files**: Always verify that `backend/.env` and `dashboard/.env` are added to your local `.gitignore` files to prevent committing secrets to git branches.
*   **Generate Unique JWT Secret keys**: For local staging testing, avoid using generic keys. Use a hex generator (`openssl rand -hex 32`) to produce secure tokens.
*   **Configure Local SMTP Mocking**: For testing mailings locally, use local mail services (like Maildev or Mailhog) to catch outgoing notifications without sending real emails.

---

## Tips

*   **Fast Seeding Check**: If you want to check if the database was seeded successfully, use a database client (like MongoDB Compass) to verify that the `users`, `roles`, and `websites` collections contain active records.
*   **Quick Build Execution**: Use the command `npm run check` to execute import tests, static safety checks, and production builds simultaneously.

---

## Warnings

> [!CAUTION]
> **Do Not Run Seed Scripts In Production Environments**
> Executing `npm run seed` or running database seeding scripts in a production database will clear existing platform records, delete client user setups, reset active subscriptions, and replace profiles with default settings.

---

## Common Mistakes

*   **Not Running Root Build First**: Developers sometimes embed the chat widget in a page, only to get `404 Not Found` errors because they did not run `npm run build` to copy the compiled script to `backend/src/public/`.
*   **Using Deprecated Node Versions**: Attempting to compile the project using Node.js v14 or lower will cause Vite compilation errors during the build step. Ensure Node v18+ is active.
*   **Omit MongoDB connection strings parameters**: Missing variables in connection strings, such as `authSource=admin`, can cause local connection attempts to fail on authenticated servers.

---

## FAQs

### What should I do if npm install fails with dependency conflicts?
Run `npm install --legacy-peer-deps` to bypass dependency resolution conflicts between library versions.

### How do I modify the default port of the Express server?
Update the `PORT` variable in `backend/.env` (e.g., `PORT=8000`) and configure the `VITE_API_URL` or `VITE_LOCAL_API_URL` in `dashboard/.env` to point to the new port URL.

### Can I seed custom data?
Yes. You can edit the seed source code in `backend/src/scripts/seed.js` to add custom client users, default categories, or website instances before running the seed script.

---

## Troubleshooting Local Startup Issues

### Issue: "EADDRINUSE: address already in use :::5000"
*   **Probable Cause**: Another service is running on port 5000.
*   **Resolution**:
    -   *Windows (PowerShell)*: Run `Get-NetTCPConnection -LocalPort 5000` to find the process ID (PID), then execute `Stop-Process -Id <PID> -Force` to stop it.
    -   *Alternative*: Modify the server port to `5001` in your `backend/.env` file.

### Issue: "MongooseServerSelectionError: connect ECONNREFUSED"
*   **Probable Cause**: MongoDB service is not active locally, or the connection URI is incorrect.
*   **Resolution**:
    -   Ensure your local MongoDB service is running (`net start MongoDB` on Windows, or `sudo systemctl start mongod` on Linux).
    -   Verify the `MONGODB_URI` value matches your database connection path.

---

## Related Articles

*   [Introduction to JTS Chat Support](file:///e:/Chat%20Support/Documentation/01_Getting_Started/01_introduction.md)
*   [Production Deployment Guidelines](file:///e:/Chat%20Support/Documentation/01_Getting_Started/04_deployment.md)
*   [Developer API Endpoints Reference](file:///e:/Chat%20Support/Documentation/19_API/02_endpoints_reference.md)
