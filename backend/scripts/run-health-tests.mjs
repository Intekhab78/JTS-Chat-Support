import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertWebsiteAccess } from "../src/utils/websiteScope.js";
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
