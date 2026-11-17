import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { ApiKey } from "../models/ApiKey.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWebsiteApiKey } from "../middleware/apiKey.js";
import { logAuditEvent } from "../services/auditService.js";

function maskApiKey(key = "") {
  if (!key) return "";
  return key.length > 14 ? `${key.slice(0, 10)}••••${key.slice(-4)}` : "••••••••";
}

function classifyMiddlewareAuth(handles = [], fullPath = "") {
  let hasJwt = false;
  let hasWebsiteKey = false;
  let hasRbac = false;

  for (const fn of handles) {
    if (typeof fn !== "function") continue;
    if (fn === requireAuth) hasJwt = true;
    if (fn === requireWebsiteApiKey) hasWebsiteKey = true;

    const src = fn.toString();
    if (src.includes("getUserFromToken") || src.includes("req.headers.authorization")) {
      hasJwt = true;
    }
    if (src.includes("requireWebsiteApiKey") || src.includes("matchesWebsiteDomain")) {
      hasWebsiteKey = true;
    }
    if (src.includes("allowedRoles") && src.includes("normalizeRole")) {
      hasRbac = true;
    }
  }

  if (hasJwt && hasRbac) return "JWT Bearer + RBAC";
  if (hasJwt) return "JWT Bearer";
  if (hasWebsiteKey) return "Website API Key (x-api-key)";
  if (fullPath.includes("webhook")) return "Webhook Signature / Secret";
  return "Public";
}

function extractPathParams(fullPath = "") {
  const matches = fullPath.match(/:[A-Za-z0-9_]+/g) || [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

function extractExpressRoutes(app) {
  const routes = [];
  const seen = new Set();

  function cleanRegexPath(regex) {
    if (!regex) return "";
    let str = regex.source || "";
    str = str
      .replace("^\\", "")
      .replace("\\/?(?=\\/|$)", "")
      .replace("?(?=\\/|$)", "")
      .replace(/\\\//g, "/")
      .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ":param")
      .replace(/\$$/, "");
    if (str === "/" || str === "") return "";
    return str.startsWith("/") ? str : `/${str}`;
  }

  function walkStack(stack, prefix = "", inheritedHandles = []) {
    if (!Array.isArray(stack)) return;
    const activeHandles = [...inheritedHandles];

    for (const layer of stack) {
      if (layer.route && layer.route.path) {
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        const methods = Object.keys(layer.route.methods || {})
          .filter((m) => layer.route.methods[m])
          .map((m) => m.toUpperCase());

        const routeHandles = (layer.route.stack || []).map((s) => s.handle).filter(Boolean);
        const combinedHandles = [...activeHandles, ...routeHandles];

        for (const p of paths) {
          const fullPath = `${prefix}${p === "/" ? "" : p}` || "/";
          if (!fullPath.startsWith("/api")) continue;
          const segs = fullPath.split("/").filter(Boolean);
          const category = (segs[1] || "core").toUpperCase();
          const auth = classifyMiddlewareAuth(combinedHandles, fullPath);
          const pathParams = extractPathParams(fullPath);

          for (const method of methods) {
            const key = `${method} ${fullPath}`;
            if (seen.has(key)) continue;
            seen.add(key);
            routes.push({
              method,
              path: fullPath,
              category,
              auth,
              pathParams,
              hasBody: ["POST", "PUT", "PATCH"].includes(method),
              description: `${category} endpoint (${method})`
            });
          }
        }
      } else if (layer.name === "router" && layer.handle?.stack) {
        const subPrefix = `${prefix}${cleanRegexPath(layer.regexp)}`;
        walkStack(layer.handle.stack, subPrefix, activeHandles);
      } else if (typeof layer.handle === "function") {
        // Track router-level middleware (e.g., router.use(requireAuth))
        if (layer.regexp?.fast_star || layer.regexp?.fast_slash || cleanRegexPath(layer.regexp) === "") {
          activeHandles.push(layer.handle);
        }
      }
    }
  }

  walkStack(app?._router?.stack || []);
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

function readBackendPkg() {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return {};
  }
}

export const getDeveloperOverview = asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const pkg = readBackendPkg();
  const depsCount = Object.keys(pkg.dependencies || {}).length;
  const routes = extractExpressRoutes(req.app);

  const schemasList = Object.keys(mongoose.models)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      collectionName: mongoose.models[name].collection?.name || name.toLowerCase() + "s",
      fieldCount: Object.keys(mongoose.models[name].schema.paths).length,
      indexesCount: mongoose.models[name].schema.indexes().length
    }));

  const distExists = fs.existsSync(path.resolve(process.cwd(), "../dashboard/dist/index.html"));
  const mongoHost = mongoose.connection.host || "localhost";
  const mem = process.memoryUsage();

  const envConfigMasked = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: String(process.env.PORT || 5000),
    NODE_VERSION: process.version,
    CPU_CORES: `${os.cpus()?.length || 1} Cores (${os.arch()})`,
    MONGODB_HOST: mongoHost,
    JWT_SECRET: process.env.JWT_SECRET ? "Configured (Masked)" : "Not Set",
    BUILD_BUNDLE: distExists ? "dist/index.html Ready" : "Not Built"
  };

  const engineeringMetrics = {
    registeredRoutesCount: routes.length,
    mongooseModelsCount: schemasList.length,
    packageDependenciesCount: depsCount,
    heapMemoryMb: `${Math.round(mem.heapUsed / 1024 / 1024)} / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    expressVersion: pkg.dependencies?.express || "4.x",
    mongooseVersion: pkg.dependencies?.mongoose || "8.x"
  };

  return res.json({
    summary: {
      version: `v${pkg.version || "1.0.0"}`,
      buildStatus: distExists ? "PASSED (dist Ready)" : "PENDING (Run build)",
      apiStatus: `HEALTHY (${routes.length} Endpoints)`,
      dbStatus: dbState === 1 ? `CONNECTED (${schemasList.length} Models)` : "DISCONNECTED",
      runtimeStatus: `Node ${process.version} (${os.cpus()?.length || 1} Cores)`,
      productionStatus: dbState === 1 ? "ACTIVE & HEALTHY" : "DEGRADED"
    },
    apiEndpoints: routes,
    schemasList,
    envConfigMasked,
    engineeringMetrics
  });
});

export const searchApiCatalog = asyncHandler(async (req, res) => {
  const { search, method } = req.query;
  let catalog = extractExpressRoutes(req.app);

  if (method && method !== "ALL") {
    catalog = catalog.filter((a) => a.method === method.toUpperCase());
  }
  if (search) {
    const q = String(search).toLowerCase();
    catalog = catalog.filter(
      (a) =>
        a.path.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.method.toLowerCase().includes(q) ||
        a.auth.toLowerCase().includes(q)
    );
  }

  return res.json(catalog);
});

export const getOpenApiSpec = asyncHandler(async (req, res) => {
  const pkg = readBackendPkg();
  const routes = extractExpressRoutes(req.app);

  const paths = {};
  for (const r of routes) {
    const openApiPath = r.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    if (!paths[openApiPath]) paths[openApiPath] = {};

    const security = r.auth.startsWith("JWT")
      ? [{ bearerAuth: [] }]
      : r.auth.includes("API Key")
      ? [{ apiKeyAuth: [] }]
      : [];

    const parameters = (r.pathParams || []).map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" }
    }));

    paths[openApiPath][r.method.toLowerCase()] = {
      tags: [r.category],
      summary: r.description,
      security,
      ...(parameters.length ? { parameters } : {}),
      ...(r.hasBody
        ? {
            requestBody: {
              required: false,
              content: {
                "application/json": {
                  schema: { type: "object" }
                }
              }
            }
          }
        : {}),
      responses: {
        200: { description: "Successful response" },
        401: { description: "Unauthorized" }
      }
    };
  }

  return res.json({
    openapi: "3.0.3",
    info: {
      title: "JTS Support & CRM Enterprise API",
      version: pkg.version || "1.0.0",
      description: "Auto-generated live OpenAPI 3.0 specification from Express router stack."
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        apiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" }
      }
    },
    paths
  });
});

export const getSchemaDetail = asyncHandler(async (req, res) => {
  const { modelName } = req.params;
  const model = mongoose.models[modelName];
  if (!model) {
    throw new AppError(`Mongoose model '${modelName}' not found`, 404);
  }

  const fields = Object.entries(model.schema.paths)
    .filter(([name]) => name !== "__v")
    .map(([name, schemaType]) => {
      const enumVals =
        Array.isArray(schemaType.enumValues) && schemaType.enumValues.length > 0
          ? schemaType.enumValues
          : Array.isArray(schemaType.options?.enum)
          ? schemaType.options.enum
          : null;

      let defaultVal = null;
      if (schemaType.options?.default !== undefined) {
        defaultVal =
          typeof schemaType.options.default === "function"
            ? "[Function]"
            : JSON.stringify(schemaType.options.default);
      }

      return {
        name,
        type: schemaType.instance || "Mixed",
        required: Boolean(schemaType.isRequired),
        unique: Boolean(schemaType.options?.unique),
        indexed: Boolean(schemaType.options?.index),
        ref: schemaType.options?.ref || schemaType.caster?.options?.ref || null,
        enumValues: enumVals,
        defaultValue: defaultVal
      };
    });

  const indexes = (model.schema.indexes() || []).map(([keys, opts]) => ({
    keys,
    unique: Boolean(opts?.unique),
    sparse: Boolean(opts?.sparse)
  }));

  return res.json({
    name: modelName,
    collectionName: model.collection?.name || modelName.toLowerCase() + "s",
    fieldCount: fields.length,
    indexesCount: indexes.length,
    fields,
    indexes
  });
});

export const listDeveloperApiKeys = asyncHandler(async (req, res) => {
  const keys = await ApiKey.find({})
    .populate("createdBy", "name email")
    .populate("websiteId", "name domain")
    .sort({ createdAt: -1 });

  const formatted = keys.map((k) => ({
    _id: k._id,
    name: k.name,
    keyMasked: maskApiKey(k.key),
    scopes: k.scopes?.length ? k.scopes : ["read"],
    status: k.status,
    rateLimitLimit: k.rateLimitLimit || 1000,
    requestCount: k.requestCount || 0,
    lastUsedAt: k.lastUsedAt || null,
    website: k.websiteId || null,
    createdBy: k.createdBy || null,
    createdAt: k.createdAt
  }));

  return res.json(formatted);
});

export const createDeveloperApiKey = asyncHandler(async (req, res) => {
  const { name, scopes = ["read"], rateLimitLimit = 1000, websiteId = null } = req.body || {};
  if (!name || !String(name).trim()) {
    throw new AppError("API Key name is required", 400);
  }

  const allowedScopes = ["read", "write", "webhooks", "admin"];
  const cleanScopes = Array.isArray(scopes)
    ? scopes.filter((s) => allowedScopes.includes(s))
    : ["read"];
  if (cleanScopes.length === 0) cleanScopes.push("read");

  const rawKey = `jts_live_${crypto.randomBytes(24).toString("hex")}`;
  const parsedLimit = Math.max(10, Math.min(1000000, Number(rateLimitLimit) || 1000));

  const record = await ApiKey.create({
    name: String(name).trim(),
    key: rawKey,
    scopes: cleanScopes,
    rateLimitLimit: parsedLimit,
    websiteId: websiteId || null,
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId: websiteId || null,
    action: "DEVELOPER_API_KEY_CREATED",
    resource: "ApiKey",
    resourceId: record._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name: record.name, scopes: cleanScopes, rateLimitLimit: parsedLimit }
  });

  return res.status(201).json({
    _id: record._id,
    name: record.name,
    rawKey, // Returned once upon creation
    keyMasked: maskApiKey(rawKey),
    scopes: record.scopes,
    status: record.status,
    rateLimitLimit: record.rateLimitLimit,
    requestCount: 0,
    createdAt: record.createdAt
  });
});

export const revokeDeveloperApiKey = asyncHandler(async (req, res) => {
  const record = await ApiKey.findById(req.params.id);
  if (!record) throw new AppError("API Key not found", 404);

  record.status = "revoked";
  await record.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: record.websiteId || null,
    action: "DEVELOPER_API_KEY_REVOKED",
    resource: "ApiKey",
    resourceId: record._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name: record.name }
  });

  return res.json({ message: "API key revoked", _id: record._id, status: record.status });
});

export const deleteDeveloperApiKey = asyncHandler(async (req, res) => {
  const record = await ApiKey.findByIdAndDelete(req.params.id);
  if (!record) throw new AppError("API Key not found", 404);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: record.websiteId || null,
    action: "DEVELOPER_API_KEY_DELETED",
    resource: "ApiKey",
    resourceId: record._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name: record.name }
  });

  return res.json({ message: "API key deleted", _id: record._id });
});
