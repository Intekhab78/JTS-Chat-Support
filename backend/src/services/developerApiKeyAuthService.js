import { ApiKey } from "../models/ApiKey.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import AppError from "../utils/AppError.js";

const ONE_HOUR_MS = 60 * 60 * 1000;
const hourlyUsageMap = new Map();

function enforceScopes(scopes, req) {
  if (scopes.includes("admin")) return;

  const url = req.originalUrl || req.url || "";
  if (url.startsWith("/api/developer-portal") || url.startsWith("/api/observability")) {
    throw new AppError("API key lacks 'admin' scope for this endpoint.", 403);
  }

  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    if (!scopes.includes("read") && !scopes.includes("write")) {
      throw new AppError("API key lacks 'read' scope.", 403);
    }
    return;
  }

  if (url.includes("webhook") || url.includes("enterprise-integrations")) {
    if (!scopes.includes("webhooks") && !scopes.includes("write")) {
      throw new AppError("API key lacks 'webhooks' or 'write' scope.", 403);
    }
    return;
  }

  if (!scopes.includes("write")) {
    throw new AppError("API key lacks 'write' scope for mutating requests.", 403);
  }
}

function enforceHourlyRateLimit(keyDoc) {
  const keyId = String(keyDoc._id);
  const limit = Number(keyDoc.rateLimitLimit || 1000);
  const now = Date.now();

  let bucket = hourlyUsageMap.get(keyId);
  if (!bucket || now - bucket.windowStart >= ONE_HOUR_MS) {
    bucket = { windowStart: now, count: 0 };
  }

  if (bucket.count >= limit) {
    throw new AppError(`API key hourly rate limit (${limit} req/hr) exceeded.`, 429);
  }

  bucket.count += 1;
  hourlyUsageMap.set(keyId, bucket);
}

export async function authenticateWithDeveloperApiKey(rawKey, req) {
  const keyDoc = await ApiKey.findOne({ key: rawKey });
  if (!keyDoc) {
    throw new AppError("Invalid API key.", 401);
  }
  if (keyDoc.status !== "active") {
    throw new AppError("This API key has been revoked.", 403);
  }

  const scopes = Array.isArray(keyDoc.scopes) && keyDoc.scopes.length > 0 ? keyDoc.scopes : ["read"];
  enforceScopes(scopes, req);
  enforceHourlyRateLimit(keyDoc);

  // Track live requestCount & lastUsedAt without blocking the request
  void ApiKey.updateOne(
    { _id: keyDoc._id },
    { $inc: { requestCount: 1 }, $set: { lastUsedAt: new Date() } }
  ).catch(() => {});

  let user = null;
  if (keyDoc.createdBy) {
    user = await User.findById(keyDoc.createdBy).select("-password");
  }
  if (!user) {
    user = await User.findOne({ role: "admin" }).select("-password");
  }
  if (!user) {
    throw new AppError("No owner account associated with this API key.", 401);
  }

  user.permissions = await Role.resolvePermissionsForUser(user);

  return { user, apiKeyDoc: keyDoc };
}

