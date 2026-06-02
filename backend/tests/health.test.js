import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { assertWebsiteAccess } from "../src/utils/websiteScope.js";
import { generateQuotationPDF, generateInvoicePDF } from "../src/services/pdfService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const uploadsDir = path.resolve(backendRoot, "uploads");

test("assertWebsiteAccess allows admin regardless of website scope", () => {
  assert.doesNotThrow(() => assertWebsiteAccess({ role: "admin" }, [], "other-site"));
});

test("assertWebsiteAccess blocks unauthorized website access for non-admin users", () => {
  assert.throws(
    () => assertWebsiteAccess({ role: "manager" }, ["site-a", "site-b"], "site-c"),
    { message: "You do not have access to this website scope." }
  );
});

test("assertWebsiteAccess allows authorized website access for non-admin users", () => {
  assert.doesNotThrow(() => assertWebsiteAccess({ role: "manager" }, ["site-a", "site-b"], "site-b"));
});

test("generateQuotationPDF returns a public uploads path", async () => {
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

test("generateInvoicePDF returns a public uploads path", async () => {
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

test("env validation rejects placeholder JWT secret outside development", () => {
  const script = "import('./src/config/env.js').then(() => process.exit(0)).catch(() => process.exit(1));";
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://example.test/app",
      JWT_SECRET: "change-me"
    }
  });

  assert.equal(result.status, 1);
});

test("uploads directory exists for document generation", () => {
  assert.ok(fs.existsSync(uploadsDir));
});
