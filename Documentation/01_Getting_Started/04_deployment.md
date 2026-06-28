# Production Deployment Guidelines

This document provides deployment guidelines for hosting JTS Chat Support in production, including building static assets, configuring reverse proxies, securing backend Node.js endpoints, and verifying SMTP servers.

---

## Overview

Deploying JTS Chat Support in a production environment requires a multi-part hosting layout:
1.  **Backend Host**: Express.js server hosted on a Node.js container (e.g. AWS EC2, Heroku, or DigitalOcean droplet) managed by a process manager (such as PM2).
2.  **Dashboard Host**: Static React dashboard SPA compiled using Vite and deployed to static hosting platforms (such as Vercel, Netlify, Cloudflare Pages, or AWS S3/CloudFront).
3.  **Embeddable Widget Host**: Served directly from the backend server (`/chat-widget.js`) to target websites.
4.  **Database Instance**: A managed MongoDB cluster (such as MongoDB Atlas) with active replication and automated backups.

---

## Purpose

The purpose of this guide is to explain the production deployment process, detail Nginx configurations, and outline safety measures to ensure platform stability.

---

## Build Directories Mapping

During compilation, output files are generated in these folders:

*   **Compiled Dashboard**: `dashboard/dist/` (static HTML, JS, and CSS files).
*   **Compiled Widget**: `chat-widget/dist/` (Rollup/Vite IIFE script).
*   **Backend Assets**: `backend/src/public/` (receives the compiled `chat-widget.js` script to serve to website visitors).
*   **File Uploads**: `backend/uploads/` (directory for user attachments, generated quotation PDFs, and commercial invoices).

---

## Prerequisites

Ensure you have prepared the following infrastructure before deploying:

*   **Server Nodes**: Node.js runtime environment (v18+) with PM2 installed globally: `npm install -g pm2`.
*   **MongoDB Atlas Cluster**: Dedicated cluster instance (Atlas M10+ recommended for operational workloads).
*   **Domains & DNS**: Register domain names for the dashboard (e.g., `chat.company.com`) and the API server (e.g., `api.company.com`).
*   **SSL Certificates**: Let's Encrypt certificates or equivalent SSL configurations for both domains.
*   **SMTP Service Provider**: Production SMTP account details (such as SendGrid, AWS SES, or Mailgun).

---

## Step-by-Step Deployment Guide

Follow these steps to deploy JTS Chat Support to production:

### Step 1: Clone and Install Dependencies
Clone the repository and install all workspace dependencies:
```bash
git clone <repository-url>
cd "Chat Support"
npm install
```

### Step 2: Compile Static Assets
Run the build script to compile the React dashboard and bundle the widget:
```bash
npm run build
```
This command performs the following actions:
1.  Compiles the dashboard React application into `dashboard/dist/`.
2.  Bundles the widget into `chat-widget/dist/chat-widget.iife.js`.
3.  Copies the compiled widget bundle into the backend public folder: `backend/src/public/chat-widget.js`.

### Step 3: Deploy Dashboard Static Assets
Upload the contents of `dashboard/dist/` to your static host (e.g., Vercel or AWS S3).
Ensure your routing is configured to redirect all fallbacks to `index.html` (Single Page Application routing). For Vercel hosting, the configuration is already present in [vercel.json](file:///dashboard/vercel.json).

### Step 4: Configure Production Backend Environment
On your server node, create the production `backend/.env` file. Refer to the **Environment Variables Configuration** section below to adjust values for production.

### Step 5: Start the Backend Server using PM2
Navigate to the backend directory and launch the server using PM2. This ensures the Node process automatically restarts in case of exceptions or server reboots:
```bash
cd backend
pm2 start src/server.js --name "jts-chat-backend" --update-env
pm2 save
```

### Step 6: Configure Nginx Reverse Proxy
Install Nginx and create a configuration file at `/etc/nginx/sites-available/jts-chat` to proxy requests to port `5000` and handle SSL handshakes:

```nginx
server {
    listen 80;
    server_name api.company.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.company.com;

    ssl_certificate /etc/letsencrypt/live/api.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.company.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploads folder directly
    location /uploads/ {
        alias /var/www/jts-chat/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```
Enable the site configuration and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/jts-chat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Production Environment Variables Configuration

The following overrides are required in the production `backend/.env` file:

| Variable | Target Production Value | Notes |
| :--- | :--- | :--- |
| **NODE_ENV** | `production` | Enables production checks, disables logging stack traces to API responses. |
| **CLIENT_URL** | `https://chat.company.com` | Origin URL of the hosted React dashboard. |
| **ALLOWED_ORIGINS** | `https://chat.company.com,https://your-client-site.com` | Comma-separated list of allowed origins. |
| **WIDGET_PUBLIC_URL** | `https://api.company.com/chat-widget.js` | Absolute URL path visitors use to download the widget script. |
| **JWT_SECRET** | Random 64-char Hex String | Do not use local placeholders. |

---

## Notes

- **Persistent Disk Storage**: The `backend/uploads/` directory stores user attachments and generated documents. Ensure this directory is located on a persistent storage volume (not on ephemeral instances like Heroku Dynos) to avoid losing files during deployments.
- **WebSocket Gateway Timeout**: When configuring reverse proxies (like Cloudflare or Nginx), verify that the WebSocket gateway connection timeout limits are set to at least 3600 seconds to prevent active socket drops.

---

## Best Practices

*   **Implement SSL Everywhere**: Always load the widget and establish socket streams over secure connections (`https://` and `wss://`). Attempting to load the widget via HTTP on an HTTPS site will cause mixed-content errors, blocking widget load.
*   **Configure Nginx Upload Path directly**: Set Nginx to serve the `uploads/` folder directly rather than routing requests through Express.js middleware. This reduces overhead on the Node process.
*   **Enable CORS Origins Carefully**: Do not set `ALLOWED_ORIGINS=*` in production. Only include the dashboard host domain and the domains of client websites using the chat widget.

---

## Tips

*   **PM2 Log Rotations**: Install `pm2-logrotate` to prevent disk space issues on the backend hosting server:
    ```bash
    pm2 install pm2-logrotate
    ```
*   **Health Check Endpoint**: Set up external system monitors to query `https://api.company.com/health` at regular intervals to track backend availability.

---

## Warnings

> [!CAUTION]
> **Stripe Webhook Endpoint Registration Required**
> Ensure the endpoint `https://api.company.com/api/stripe-webhooks` is registered in your Stripe Developer Dashboard, and that the signing secret matches the one in your environment variables. Failing to register this path will prevent user plans from updating on successful payment completion.

---

## Common Mistakes

*   **Ephemeral Disk Storage**: Storing files locally on ephemeral cloud containers (such as default Heroku dynos or AWS ECS tasks without mount drives) will delete generated quotation PDFs and invoice attachments during server updates.
*   **JWT Secret Key Reused**: Reusing development JWT secret keys in production makes the application vulnerable to token forgery.
*   **Rate Limits active on Loopback**: Forgetting to configure rate limits exception rules for internal domains will cause local automated worker scripts to trigger `429 Too Many Requests` API blockades.

---

## FAQs

### How do I configure SSL certificates?
Use Let's Encrypt Certbot:
```bash
sudo certbot --nginx -d api.company.com
```

### Can I run the server in cluster mode?
Yes. Execute `pm2 start src/server.js -i max` to run PM2 in cluster mode. Ensure you use a redis adapter for Socket.IO when running in cluster mode to sync events across backend instances.

### How do we back up files?
Configure an automated cron job on your server to sync the `backend/uploads/` directory with a cloud storage bucket (e.g., AWS S3 or Google Cloud Storage).

---

## Troubleshooting Production Deployments

### Issue: "Blocked loading mixed active content"
*   **Probable Cause**: The website is served via HTTPS, but the widget code tries to load resources via HTTP.
*   **Resolution**: Update `WIDGET_PUBLIC_URL` in `backend/.env` to use the `https://` prefix.

### Issue: Generated PDFs are empty or corrupted
*   **Probable Cause**: The PDF generator resolved before the write stream fully completed writing the file to disk (race condition).
*   **Resolution**: Ensure you are using the updated `pdfService.js` script, which resolves only after the stream's `finish` event fires.

---

## Related Articles

*   [Local Installation and Development Setup](file:///e:/Chat%20Support/Documentation/01_Getting_Started/03_installation.md)
*   [Developer API Architecture & Endpoint Reference](file:///e:/Chat%20Support/Documentation/19_API/01_api_overview.md)
*   [Troubleshooting Common Platform Issues](file:///e:/Chat%20Support/Documentation/21_Troubleshooting/01_system_troubleshooting.md)
