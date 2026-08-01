import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import websiteRoutes from "./routes/websiteRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import widgetRoutes from "./routes/widgetRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import cannedResponseRoutes from "./routes/cannedResponseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import crmRoutes from "./routes/crmRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import stripeWebhookRoutes from "./routes/stripeWebhookRoutes.js";
import razorpayWebhookRoutes from "./routes/razorpayWebhookRoutes.js";
import whatsappWebhookRoutes from "./routes/whatsappWebhookRoutes.js";
import flowRoutes from "./routes/flowRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import subscriptionPlanRoutes from "./routes/subscriptionPlanRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import helpRoutes from "./routes/helpRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import procurementRoutes from "./routes/procurementRoutes.js";
import knowledgeBaseRoutes from "./routes/knowledgeBaseRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";
import saasFinancialRoutes from "./routes/saasFinancialRoutes.js";
import slaCenterRoutes from "./routes/slaCenterRoutes.js";
import observabilityRoutes from "./routes/observabilityRoutes.js";
import loadTestRoutes from "./routes/loadTestRoutes.js";
import releaseManagementRoutes from "./routes/releaseManagementRoutes.js";
import developerPortalRoutes from "./routes/developerPortalRoutes.js";
import productManagementRoutes from "./routes/productManagementRoutes.js";
import aiAutomationRoutes from "./routes/aiAutomationRoutes.js";
import complianceGovernanceRoutes from "./routes/complianceGovernanceRoutes.js";
import mobileReadinessRoutes from "./routes/mobileReadinessRoutes.js";
import enterpriseIntegrationRoutes from "./routes/enterpriseIntegrationRoutes.js";
import noCodeWorkflowRoutes from "./routes/noCodeWorkflowRoutes.js";
import appMarketplaceRoutes from "./routes/appMarketplaceRoutes.js";
import lowCodeStudioRoutes from "./routes/lowCodeStudioRoutes.js";
import customCrmModuleRoutes from "./routes/customCrmModuleRoutes.js";
import enterpriseBiAnalyticsRoutes from "./routes/enterpriseBiAnalyticsRoutes.js";
import multiOrganizationRoutes from "./routes/multiOrganizationRoutes.js";
import missionControlRoutes from "./routes/missionControlRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import healthRoutes from "./routes/health.js";
import { env } from "./config/env.js";

import errorMiddleware from "./middleware/errorMiddleware.js";
import AppError from "./utils/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  const publicCorsPaths = [
    "/chat-widget.js",
    "/api/widget/",
    "/api/tickets/submit",
    "/api/tickets/public/",
    "/api/tracking/",
    "/uploads/"
  ];

  function isLocalRequest(req) {
    const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const candidateIp = forwardedFor || req.ip || req.socket?.remoteAddress || "";
    const origin = String(req.headers.origin || "");
    const host = String(req.headers.host || "");

    return (
      candidateIp === "::1" ||
      candidateIp === "127.0.0.1" ||
      candidateIp === "::ffff:127.0.0.1" ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      host.includes("localhost") ||
      host.includes("127.0.0.1")
    );
  }

  app.use((req, res, next) => {
    req.url = req.url.replace(/\/{2,}/g, "/");
    next();
  });

  const allowedOrigins = new Set(env.allowedOrigins);
  const corsOptionsDelegate = (req, callback) => {
    const origin = req.headers.origin;
    const isPublicPath = publicCorsPaths.some((path) => req.path === path || req.path.startsWith(path));

    if (!origin) {
      return callback(null, { origin: true, credentials: true });
    }

    if (isPublicPath) {
      return callback(null, { origin: true, credentials: false });
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, { origin: true, credentials: true });
    }

    return callback(null, { origin: false });
  };

  app.use(cors(corsOptionsDelegate));
  app.options("*", cors(corsOptionsDelegate));

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
  }));

  if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
  }

  // -------------------------------------------------------------
  // Enterprise High-Scale Rate Limiter Configuration
  // Designed for 5,000+ concurrent agents/visitors without IP blocks
  // -------------------------------------------------------------
  const authLimiter = rateLimit({
    max: 1000, // High ceiling per minute per account
    windowMs: 1 * 60 * 1000,
    message: { status: "error", message: "Too many login attempts for this account. Please try again in 1 minute." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => {
      // Partition rate limiting per account (email + IP) so 5000 users behind the same corporate office NAT/VPN never block each other
      const email = req.body && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      const ip = forwardedFor || req.ip || req.socket?.remoteAddress || "";
      return email ? `${ip}_${email}` : ip;
    },
    skip: (req) => process.env.NODE_ENV === "development" || isLocalRequest(req)
  });

  const generalLimiter = rateLimit({
    max: 500000, // Unlimited capacity for enterprise traffic
    windowMs: 15 * 60 * 1000,
    message: { status: "error", message: "Too many requests. Please slow down." },
    validate: false,
    skip: (req) => {
      // Completely skip rate limiting for authenticated dashboard users, widget traffic, sockets, and health endpoints
      if (process.env.NODE_ENV === "development" || isLocalRequest(req)) return true;
      if (req.headers.authorization || req.headers["x-api-key"] || req.path.startsWith("/api/widget/") || req.path.startsWith("/api/notifications") || req.path.startsWith("/api/health") || req.path.startsWith("/api/chat")) {
        return true;
      }
      return false;
    }
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  app.use("/api/auth/reset-password", authLimiter);
  app.use("/api", generalLimiter);

  // STRIPE WEBHOOK NEEDS TO BE REGISTERED BEFORE EXPRESS.JSON
  app.use("/api/stripe-webhooks", stripeWebhookRoutes);
  app.use("/api/razorpay-webhooks", razorpayWebhookRoutes);
  app.use("/api/whatsapp-webhooks", whatsappWebhookRoutes);

  app.use(express.json({ limit: "50kb" }));
  app.use(cookieParser());

  app.use(express.static(path.join(__dirname, "public")));
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
  // Self-healing fallback to serve uploads from root to support legacy database entries missing '/uploads' prefix
  app.use(express.static(path.join(__dirname, "../uploads")));

  app.get("/", (_, res) => res.json({ status: "success", message: "JTS Chat Backend is Live", version: "1.0.0" }));
  app.get("/health", (_, res) => res.json({ ok: true, timestamp: new Date() }));
  app.use("/api/health-check", healthRoutes);

  app.use(widgetRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/websites", websiteRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/canned-responses", cannedResponseRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/departments", departmentRoutes);
  app.use("/api/crm", crmRoutes);
  app.use("/api/crm/reminders", reminderRoutes);
  app.use("/api/audit-logs", auditRoutes);
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/flows", flowRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/subscription-plans", subscriptionPlanRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/roles", roleRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/supplier", supplierRoutes);
  app.use("/api/procurement", procurementRoutes);
  app.use("/api/knowledge-base", knowledgeBaseRoutes);
  app.use("/api/risks", riskRoutes);
  app.use("/api/financial-analytics", saasFinancialRoutes);
  app.use("/api/sla-center", slaCenterRoutes);
  app.use("/api/observability", observabilityRoutes);
  app.use("/api/load-testing", loadTestRoutes);
  app.use("/api/release-management", releaseManagementRoutes);
  app.use("/api/developer-portal", developerPortalRoutes);
  app.use("/api/product-management", productManagementRoutes);
  app.use("/api/ai-automation", aiAutomationRoutes);
  app.use("/api/compliance-governance", complianceGovernanceRoutes);
  app.use("/api/mobile-readiness", mobileReadinessRoutes);
  app.use("/api/enterprise-integrations", enterpriseIntegrationRoutes);
  app.use("/api/workflow-builder", noCodeWorkflowRoutes);
  app.use("/api/app-marketplace", appMarketplaceRoutes);
  app.use("/api/lowcode-studio", lowCodeStudioRoutes);
  app.use("/api/custom-crm-modules", customCrmModuleRoutes);
  app.use("/api/enterprise-bi", enterpriseBiAnalyticsRoutes);
  app.use("/api/multi-organization", multiOrganizationRoutes);
  app.use("/api/mission-control", missionControlRoutes);
  app.use("/api/help", helpRoutes);

  app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

  app.use(errorMiddleware);
  return app;
}
