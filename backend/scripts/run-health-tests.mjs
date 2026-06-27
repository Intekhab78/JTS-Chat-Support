import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertWebsiteAccess } from "../src/utils/websiteScope.js";
import { buildTenantScopedCustomerFilter, normalizeBulkCustomerIds } from "../src/utils/crmBulkAccess.js";
import { assertSameWebsite, buildInvoiceTenantFilter, toWebsiteIdStrings } from "../src/utils/invoiceAccess.js";
import { canUseMockBilling, isFlagEnabled } from "../src/utils/mockBillingAccess.js";
import { buildArticleSlug, buildArticleSort, normalizeArticleTags } from "../src/utils/knowledgeBaseUtils.js";
import { generateQuotationPDF, generateInvoicePDF } from "../src/services/pdfService.js";
import { validateEnvConfig } from "../src/config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const uploadsDir = path.resolve(backendRoot, "uploads");

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

await run("assertWebsiteAccess allows admin", async () => {
  assert.doesNotThrow(() => assertWebsiteAccess({ role: "admin" }, [], "other-site"));
});

await run("assertWebsiteAccess blocks unauthorized website access", async () => {
  assert.throws(
    () => assertWebsiteAccess({ role: "manager" }, ["site-a", "site-b"], "site-c"),
    { message: "You do not have access to this website scope." }
  );
});

await run("assertWebsiteAccess allows authorized website access", async () => {
  assert.doesNotThrow(() => assertWebsiteAccess({ role: "manager" }, ["site-a", "site-b"], "site-b"));
});

await run("buildInvoiceTenantFilter includes invoice id and website scope", async () => {
  assert.deepEqual(buildInvoiceTenantFilter("invoice-a", ["site-a", "site-b"]), {
    _id: "invoice-a",
    websiteId: { $in: ["site-a", "site-b"] }
  });
});

await run("assertSameWebsite blocks cross-website invoice/customer mismatch", async () => {
  assert.throws(
    () => assertSameWebsite("site-a", "site-b"),
    { message: "Access denied" }
  );
});

await run("toWebsiteIdStrings normalizes website ObjectId-like values", async () => {
  assert.deepEqual(toWebsiteIdStrings(["site-a", null, { toString: () => "site-b" }]), ["site-a", "site-b"]);
});

await run("normalizeBulkCustomerIds rejects empty ID lists", async () => {
  assert.deepEqual(normalizeBulkCustomerIds([]), { error: "At least one customer ID is required." });
});

await run("normalizeBulkCustomerIds rejects duplicate IDs", async () => {
  const id = "507f1f77bcf86cd799439011";
  assert.deepEqual(normalizeBulkCustomerIds([id, id]), { error: "Duplicate customer IDs are not allowed." });
});

await run("normalizeBulkCustomerIds rejects invalid ObjectIds", async () => {
  assert.deepEqual(normalizeBulkCustomerIds(["not-an-object-id"]), { error: "Invalid customer ID." });
});

await run("buildTenantScopedCustomerFilter includes customer IDs and website scope", async () => {
  const customerIds = ["507f1f77bcf86cd799439011"];
  assert.deepEqual(buildTenantScopedCustomerFilter(customerIds, ["site-a"], { archivedAt: null }), {
    _id: { $in: customerIds },
    websiteId: { $in: ["site-a"] },
    archivedAt: null
  });
});

await run("mock billing is allowed in development mode", async () => {
  assert.equal(canUseMockBilling({ nodeEnv: "development", enableMockBilling: false }), true);
});

await run("mock billing can be enabled outside production by env flag", async () => {
  assert.equal(canUseMockBilling({ nodeEnv: "test", enableMockBilling: true }), true);
  assert.equal(canUseMockBilling({ nodeEnv: "test", enableMockBilling: "true" }), true);
});

await run("mock billing is forbidden in production even when env flag is true", async () => {
  assert.equal(canUseMockBilling({ nodeEnv: "production", enableMockBilling: true }), false);
});

await run("mock billing is forbidden when production flag is missing", async () => {
  assert.equal(canUseMockBilling({ nodeEnv: "production" }), false);
});

await run("mock billing env flag parser only accepts true", async () => {
  assert.equal(isFlagEnabled("true"), true);
  assert.equal(isFlagEnabled("false"), false);
  assert.equal(isFlagEnabled(undefined), false);
});

await run("buildArticleSlug creates stable URL-safe slugs", async () => {
  assert.equal(buildArticleSlug(" How to Reset Password!! "), "how-to-reset-password");
});

await run("normalizeArticleTags accepts arrays and comma-separated strings", async () => {
  assert.deepEqual(normalizeArticleTags(["FAQ", "FAQ", " billing "]), ["FAQ", "billing"]);
  assert.deepEqual(normalizeArticleTags("sales, support, sales"), ["sales", "support"]);
});

await run("buildArticleSort rejects unsupported sort values", async () => {
  assert.equal(buildArticleSort("title"), "title");
  assert.equal(buildArticleSort("unknown"), "-updatedAt");
});

await run("generateQuotationPDF returns a public uploads path", async () => {
  const result = await generateQuotationPDF({
    quotationId: "QT-TEST-001",
    createdAt: new Date().toISOString(),
    items: [{ description: "Support plan", quantity: 1, price: 1000, total: 1000 }],
    total: 1000
  });

  assert.ok(result.path.startsWith("/uploads/"));
  assert.ok(fs.existsSync(result.filePath));
  fs.unlinkSync(result.filePath);
});

await run("generateInvoicePDF returns a public uploads path", async () => {
  const result = await generateInvoicePDF({
    invoiceId: "INV-TEST-001",
    createdAt: new Date().toISOString(),
    issuedAt: new Date().toISOString(),
    items: [{ description: "Support plan", quantity: 1, price: 1000, total: 1000 }],
    total: 1000
  });

  assert.ok(result.path.startsWith("/uploads/"));
  assert.ok(fs.existsSync(result.filePath));
  fs.unlinkSync(result.filePath);
});

await run("env validation rejects placeholder JWT secret outside development", async () => {
  assert.throws(
    () => validateEnvConfig({
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://example.test/app",
      JWT_SECRET: "change-me"
    }),
    { message: "JWT_SECRET must be replaced before running outside local development." }
  );
});

await run("uploads directory exists", async () => {
  assert.ok(fs.existsSync(uploadsDir));
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
