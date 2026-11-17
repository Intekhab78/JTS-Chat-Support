import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

import { createApp } from "../src/app.js";
import { PERMISSIONS, hasPermission, requireAnyPermission } from "../src/utils/permissions.js";
import { requireRole } from "../src/middleware/auth.js";
import { Flow } from "../src/models/Flow.js";
import { Ticket } from "../src/models/Ticket.js";
import { Invoice } from "../src/models/Invoice.js";
import { Quotation } from "../src/models/Quotation.js";
import { SalesOrder } from "../src/models/SalesOrder.js";
import { Role } from "../src/models/Role.js";

let passed = 0;
let failed = 0;

async function run(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

// 1. Live HTTP Express App Integration Tests (ephemeral port, no external DB required)
const app = createApp();
const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

try {
  await run("HTTP GET /api/health returns 200 ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });

  await run("HTTP GET /api/unknown-route returns 404 JSON error", async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-endpoint-check`);
    assert.equal(res.status, 404);
  });

  const protectedEndpoints = [
    ["GET", "/api/users/agents"],
    ["POST", "/api/users/agents"],
    ["POST", "/api/websites"],
    ["POST", "/api/billing/checkout"],
    ["GET", "/api/audit-logs"],
    ["POST", "/api/roles"],
    ["GET", "/api/inventory/items"],
    ["POST", "/api/procurement/orders"],
    ["GET", "/api/crm/customer-portal/overview"]
  ];

  for (const [method, endpoint] of protectedEndpoints) {
    await run(`HTTP ${method} ${endpoint} blocks unauthenticated requests with 401`, async () => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify({})
      });
      assert.equal(res.status, 401);
    });
  }

  await run("HTTP rejects tampered Bearer JWT token with 401", async () => {
    const res = await fetch(`${baseUrl}/api/websites`, {
      headers: { Authorization: "Bearer invalid.jwt.token" }
    });
    assert.equal(res.status, 401);
  });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

// 2. Express Router Pipeline Integration Tests for Granular Permissions
function buildPermissionTestServer(userFactory) {
  const testApp = express();
  testApp.use(express.json());
  testApp.use((req, _res, next) => {
    req.user = userFactory(req);
    next();
  });

  testApp.post(
    "/websites",
    requireRole("admin", "client", "manager"),
    requireAnyPermission(PERMISSIONS.SETTINGS_MANAGE),
    (_req, res) => res.status(201).json({ ok: true })
  );
  testApp.post(
    "/roles",
    requireRole("admin", "client"),
    requireAnyPermission(PERMISSIONS.ROLE_MANAGE, PERMISSIONS.SETTINGS_MANAGE),
    (_req, res) => res.status(201).json({ ok: true })
  );
  testApp.delete(
    "/inventory/items/:id",
    requireRole("admin", "client", "manager", "sales", "purchase"),
    requireAnyPermission(PERMISSIONS.INVENTORY_DELETE, PERMISSIONS.INVENTORY_MANAGE),
    (_req, res) => res.json({ ok: true })
  );
  testApp.post(
    "/procurement/orders",
    requireRole("admin", "client", "manager", "purchase", "sales"),
    requireAnyPermission(PERMISSIONS.PURCHASE_CREATE, PERMISSIONS.PURCHASE_MANAGE),
    (_req, res) => res.status(201).json({ ok: true })
  );
  testApp.patch(
    "/procurement/orders/:id",
    requireRole("admin", "client", "manager", "purchase", "sales"),
    requireAnyPermission(PERMISSIONS.PURCHASE_UPDATE, PERMISSIONS.PURCHASE_MANAGE),
    (_req, res) => res.json({ ok: true })
  );

  testApp.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ message: err.message });
  });
  return testApp;
}

const permApp = buildPermissionTestServer((req) => {
  const role = req.headers["x-test-role"] || "agent";
  const permsHeader = req.headers["x-test-perms"];
  return {
    _id: "507f1f77bcf86cd799439011",
    name: "Test User",
    role,
    permissions: permsHeader ? JSON.parse(String(permsHeader)) : undefined
  };
});
const permServer = http.createServer(permApp);
await new Promise((resolve) => permServer.listen(0, "127.0.0.1", resolve));
const permBase = `http://127.0.0.1:${permServer.address().port}`;

try {
  await run("Permission pipeline allows client/admin on settings-protected website create", async () => {
    const res = await fetch(`${permBase}/websites`, {
      method: "POST",
      headers: { "x-test-role": "client" }
    });
    assert.equal(res.status, 201);
  });

  await run("Permission pipeline blocks manager without settings.manage from creating website (403)", async () => {
    const res = await fetch(`${permBase}/websites`, {
      method: "POST",
      headers: {
        "x-test-role": "manager",
        "x-test-perms": JSON.stringify([PERMISSIONS.CRM_VIEW, PERMISSIONS.TEAM_VIEW])
      }
    });
    assert.equal(res.status, 403);
  });

  await run("Permission pipeline allows manager when Role Master grants settings.manage (201)", async () => {
    const res = await fetch(`${permBase}/websites`, {
      method: "POST",
      headers: {
        "x-test-role": "manager",
        "x-test-perms": JSON.stringify([PERMISSIONS.SETTINGS_MANAGE])
      }
    });
    assert.equal(res.status, 201);
  });

  await run("Permission pipeline blocks sales with only inventory.view from deleting inventory (403)", async () => {
    const res = await fetch(`${permBase}/inventory/items/123`, {
      method: "DELETE",
      headers: {
        "x-test-role": "sales",
        "x-test-perms": JSON.stringify([PERMISSIONS.INVENTORY_VIEW])
      }
    });
    assert.equal(res.status, 403);
  });

  await run("Permission pipeline allows purchase.create on PO create but blocks PO update without purchase.update", async () => {
    const headers = {
      "x-test-role": "purchase",
      "x-test-perms": JSON.stringify([PERMISSIONS.PURCHASE_VIEW, PERMISSIONS.PURCHASE_CREATE])
    };
    const createRes = await fetch(`${permBase}/procurement/orders`, { method: "POST", headers });
    assert.equal(createRes.status, 201);

    const updateRes = await fetch(`${permBase}/procurement/orders/PO-1`, { method: "PATCH", headers });
    assert.equal(updateRes.status, 403);
  });
} finally {
  await new Promise((resolve) => permServer.close(resolve));
}

// 3. E2E Flow, Role & CRM Pipeline Schema Verification
await run("hasPermission static matrix allows purchase.create for purchase role and denies inventory.delete for sales", async () => {
  assert.equal(hasPermission({ role: "purchase" }, PERMISSIONS.PURCHASE_CREATE), true);
  assert.equal(hasPermission({ role: "sales" }, PERMISSIONS.INVENTORY_DELETE), false);
});

await run("Flow schema validates complete chatbot decision tree nodes (trigger -> form -> crm_lead -> business_hours -> ai_knowledge -> auto_ticket -> live_agent)", async () => {
  const flow = new Flow({
    websiteId: "507f1f77bcf86cd799439011",
    name: "IT Software Sales & Support",
    triggerType: "on_widget_open",
    isActive: true,
    nodes: [
      { id: "n1", type: "trigger", label: "Welcome", message: "Hi!", branches: [{ label: "Get Started", nextNodeId: "n2" }] },
      { id: "n2", type: "question", label: "Main Menu", message: "Choose:", branches: [{ label: "Pricing", nextNodeId: "n5" }] },
      { id: "n3", type: "form", label: "Lead Form", fields: [{ name: "email", label: "Work Email", type: "email", required: true }], nextNodeId: "n4" },
      { id: "n4", type: "crm_lead", label: "Capture CRM Lead", message: "Saved!", branches: [{ label: "Back to Menu", nextNodeId: "n2" }] },
      { id: "n5", type: "business_hours", label: "Office Hours Check", nextNodeId: "n6", branches: [{ label: "Closed", nextNodeId: "n7" }] },
      { id: "n6", type: "ai_knowledge", label: "Product & Pricing AI", message: "Ask away!" },
      { id: "n7", type: "auto_ticket", label: "Create Support Ticket", message: "Ticket created" },
      { id: "n8", type: "live_agent", label: "Transfer to Live Agent", message: "Connecting..." }
    ]
  });
  assert.equal(flow.validateSync(), undefined);
});

await run("CRM Quotation -> SalesOrder -> Invoice & Ticket & Role schemas validate end-to-end fields", async () => {
  const websiteId = "507f1f77bcf86cd799439011";
  const customerId = "507f1f77bcf86cd799439012";
  const ownerId = "507f1f77bcf86cd799439013";
  const productId = "507f1f77bcf86cd799439014";

  const quotation = new Quotation({
    websiteId,
    customerId,
    ownerId,
    quotationId: "QT-E2E-1001",
    quotationNumber: "QT-E2E-1001",
    status: "sent",
    subtotal: 1000,
    tax: 50,
    total: 1050,
    validUntil: new Date(Date.now() + 7 * 86400000),
    items: [{ productId, description: "Annual License", quantity: 1, price: 1000, total: 1050 }]
  });
  assert.equal(quotation.validateSync(), undefined);

  const salesOrder = new SalesOrder({
    websiteId,
    customerId,
    orderNumber: "SO-E2E-1001",
    quotationId: quotation._id,
    status: "confirmed",
    subtotal: 1000,
    taxAmount: 50,
    totalAmount: 1050,
    items: [{ productId, sku: "SKU-LIC-01", name: "Annual License", quantity: 1, unitPrice: 1000, subtotal: 1000, total: 1050 }],
    createdBy: ownerId
  });
  assert.equal(salesOrder.validateSync(), undefined);

  const invoice = new Invoice({
    websiteId,
    customerId,
    ownerId,
    invoiceId: "INV-E2E-1001",
    salesOrderId: salesOrder._id,
    status: "sent",
    subtotal: 1000,
    tax: 50,
    total: 1050,
    items: [{ description: "Annual License", quantity: 1, price: 1000, total: 1050 }]
  });
  assert.equal(invoice.validateSync(), undefined);

  const ticket = new Ticket({
    websiteId,
    ticketId: "TKT-E2E-1001",
    subject: "Support Request",
    visitorName: "Test Visitor",
    visitorEmail: "visitor@example.com",
    status: "open",
    priority: "high",
    messages: [{ sender: "visitor", content: "Need help with setup" }]
  });
  assert.equal(ticket.validateSync(), undefined);

  const role = new Role({
    name: "custom_auditor",
    permissions: [PERMISSIONS.AUDIT_VIEW, PERMISSIONS.REPORTS_VIEW],
    isActive: true
  });
  assert.equal(role.validateSync(), undefined);
});

console.log(`\nIntegration suite finished: ${passed} passed, ${failed} failed`);
if (failed > 0 || process.exitCode) {
  process.exit(1);
}
