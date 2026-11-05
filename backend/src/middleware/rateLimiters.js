import rateLimit from "express-rate-limit";

function getClientIdentifier(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || "unknown_ip";
  const visitorId = req.body?.visitorId || req.query?.visitorId || "";
  return visitorId ? `${ip}_${visitorId}` : ip;
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Rate Limiter for AI Voice simulation calls (protects LLM tokens & compute)
 * Allows up to 30 voice exchanges per minute per visitor.
 */
export const voiceCallLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 120 : 30,
  keyGenerator: getClientIdentifier,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    status: "error",
    error: "Too many voice requests. Please wait a moment before speaking again."
  }
});

/**
 * Rate Limiter for public file uploads
 * Max 20 file uploads per 10 minutes per IP/visitor.
 */
export const widgetUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 100 : 20,
  keyGenerator: getClientIdentifier,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    status: "error",
    error: "File upload limit reached. Please wait a few minutes before uploading more attachments."
  }
});

/**
 * Rate Limiter for public ticket and lead submissions
 * Max 15 submissions per 15 minutes per IP/visitor.
 */
export const widgetSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 80 : 15,
  keyGenerator: getClientIdentifier,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    status: "error",
    error: "Submission limit reached. Please wait a few minutes before submitting another request."
  }
});

/**
 * Rate Limiter for widget text AI responses
 * Max 40 requests per minute per IP/visitor.
 */
export const widgetAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 150 : 40,
  keyGenerator: getClientIdentifier,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    status: "error",
    error: "AI assistant is busy. Please wait a few seconds before sending another message."
  }
});

