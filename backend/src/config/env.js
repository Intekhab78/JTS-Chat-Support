import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

export function validateEnvConfig(source = process.env) {
  const mongoUri = source.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is required. Set it to your MongoDB connection string (Atlas, Render managed database, etc.) before starting the server."
    );
  }

  const jwtSecret = source.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET is required. Set it to a long random secret string before starting the server."
    );
  }

  const nodeEnv = source.NODE_ENV || "development";
  if (jwtSecret === "change-me" && nodeEnv !== "development" && nodeEnv !== "test") {
    throw new Error("JWT_SECRET must be replaced before running outside local development.");
  }

  return { mongoUri, jwtSecret, nodeEnv };
}

const { mongoUri, jwtSecret, nodeEnv } = validateEnvConfig(process.env);

const stripePriceIds = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || "",
  standard: process.env.STRIPE_STANDARD_PRICE_ID || "",
  pro: process.env.STRIPE_PRO_PRICE_ID || ""
};

if (nodeEnv !== "test") {
  const missingPriceIds = Object.entries(stripePriceIds)
    .filter(([, value]) => !value)
    .map(([key]) => `STRIPE_${key.toUpperCase()}_PRICE_ID`);

  if (missingPriceIds.length > 0) {
    console.warn(
      `[env] Missing Stripe price ID env vars: ${missingPriceIds.join(", ")}. Stripe checkout will fail until these are set.`
    );
  }

  if (jwtSecret === "change-me") {
    console.warn("[env] JWT_SECRET is still set to the default placeholder. Replace it before sharing or deploying this app.");
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv,
  mongoUri,
  jwtSecret,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  widgetPublicUrl: process.env.WIDGET_PUBLIC_URL || (
    nodeEnv === "production"
      ? "https://chat-backend-3pcj.onrender.com/chat-widget.js"
      : "http://localhost:5000/chat-widget.js"
  ),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:4173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "noreply@chatsupport.app",
  slaQueueAlertMinutes: Number(process.env.SLA_QUEUE_ALERT_MINUTES || 5),
  slaTicketAlertHours: Number(process.env.SLA_TICKET_ALERT_HOURS || 24),
  crmLeadReassignMinutes: Number(process.env.CRM_LEAD_REASSIGN_MINUTES || 10),
  enableMockBilling: process.env.ENABLE_MOCK_BILLING === "true",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  stripePriceIds
};
