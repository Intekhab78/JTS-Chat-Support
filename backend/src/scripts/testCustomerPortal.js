import mongoose from "mongoose";
import assert from "assert";
import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { Customer } from "../models/Customer.js";
import { Quotation } from "../models/Quotation.js";
import { Ticket } from "../models/Ticket.js";

import * as portalController from "../controllers/crmCustomerPortalController.js";

async function runTests() {
  console.log("=== CONNECTING TO DATABASE ===");
  await connectDatabase();

  const websiteId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();
  const anotherCustomerId = new mongoose.Types.ObjectId();

  console.log("\n=== STARTING ENTERPRISE CUSTOMER PORTAL INTEGRATION TESTS ===");

  try {
    // Cleanup beforehand to prevent duplicate key errors
    await Customer.deleteMany({ email: "portal-user@acme.com" });
    await User.deleteMany({ email: "portal-user@acme.com" });
    await Quotation.deleteMany({ quotationNumber: { $in: ["QT-ACME-001", "QT-OTHER-999"] } });

    // 1. Setup Mock Customer & Portal User
    console.log("-> Initializing Mock Customer and User accounts...");
    const customer = await Customer.create({
      _id: customerId,
      websiteId,
      name: "Acme Corp Customer",
      email: "portal-user@acme.com",
      phone: "+919876543210",
      crn: "CUSTOMER_ACME",
      pipelineStage: "qualified"
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("acme_pass_123", salt);

    const user = await User.create({
      name: "Acme Corp Portal Account",
      email: "portal-user@acme.com",
      password: hashedPassword,
      role: "customer",
      customerId: customer._id,
      websiteIds: [websiteId]
    });

    assert.ok(user);
    assert.strictEqual(user.role, "customer");
    assert.strictEqual(String(user.customerId), String(customer._id));

    // 2. Setup Mock Quotations (one belonging to customer, one belonging to another customer)
    console.log("-> Setting up Mock Quotation records...");
    const ownQuote = await Quotation.create({
      quotationId: "QT-ACME-001-V1",
      quotationNumber: "QT-ACME-001",
      websiteId,
      customerId: customer._id,
      ownerId: user._id,
      totalAmount: 15000,
      total: 15000,
      validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "sent"
    });

    const otherQuote = await Quotation.create({
      quotationId: "QT-OTHER-999-V1",
      quotationNumber: "QT-OTHER-999",
      websiteId,
      customerId: anotherCustomerId,
      ownerId: user._id,
      totalAmount: 45000,
      total: 45000,
      validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "sent"
    });

    // 3. Test Quotation Accept & Reject with Tenant Isolation Verification
    console.log("-> Testing Quotation Acceptance & Multi-Tenant boundaries...");
    
    // Simulate req/res context for controller execution
    const mockReq = {
      user,
      params: { id: ownQuote._id },
      body: { action: "accept" }
    };
    
    let responseStatus, responseJson;
    const mockRes = {
      status: (s) => { responseStatus = s; return mockRes; },
      json: (j) => { responseJson = j; return mockRes; }
    };

    // Call controller directly
    await portalController.updateQuotationStatus(mockReq, mockRes);
    await new Promise(r => setTimeout(r, 150));
    const updatedOwnQuote = await Quotation.findById(ownQuote._id);
    assert.strictEqual(updatedOwnQuote.status, "accepted");

    // Test isolation breach attempt on otherQuote
    console.log("-> Asserting that access to another tenant's quote fails with 403...");
    const maliciousReq = {
      user,
      params: { id: otherQuote._id },
      body: { action: "accept" }
    };

    let nextError = null;
    const mockNext = (err) => {
      if (err) console.error("NEXT ERR CALLBACK TRIGGERED:", err);
      nextError = err;
    };

    await portalController.updateQuotationStatus(maliciousReq, mockRes, mockNext);
    await new Promise(r => setTimeout(r, 150));

    assert.ok(nextError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.message, "Access denied. Multi-tenant isolation boundary violated.");

    // 4. Test Support Ticket Logging & Replies
    console.log("-> Testing Logging Support Ticket via Portal...");
    const createReq = {
      user,
      body: {
        subject: "Database connection timeouts on staging",
        description: "Staging database connections are timing out regularly.",
        category: "technical",
        priority: "high"
      }
    };

    let loggedTicket;
    const createRes = {
      status: (s) => { responseStatus = s; return createRes; },
      json: (j) => { loggedTicket = j; return createRes; }
    };

    await portalController.createTicket(createReq, createRes, mockNext);
    await new Promise(r => setTimeout(r, 150));
    assert.ok(loggedTicket);
    assert.strictEqual(loggedTicket.subject, "Database connection timeouts on staging");
    assert.strictEqual(String(loggedTicket.customerId), String(customer._id));
    assert.strictEqual(loggedTicket.status, "open");

    // Post Reply to Ticket
    console.log("-> Testing Customer reply to support ticket...");
    const replyReq = {
      user,
      params: { id: loggedTicket._id },
      body: {
        message: "Staging DB seems to be back up, but please check server configurations."
      }
    };

    let updatedTicket;
    const replyRes = {
      status: (s) => { responseStatus = s; return replyRes; },
      json: (j) => { updatedTicket = j; return replyRes; }
    };

    await portalController.replyToTicket(replyReq, replyRes, mockNext);
    await new Promise(r => setTimeout(r, 150));
    assert.ok(updatedTicket);
    assert.strictEqual(updatedTicket.notes.length, 1);
    assert.strictEqual(updatedTicket.notes[0].content, "Staging DB seems to be back up, but please check server configurations.");
    assert.strictEqual(updatedTicket.notes[0].isPublic, true);

    console.log("\n✅ ALL ENTERPRISE CUSTOMER PORTAL INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("\n❌ CUSTOMER PORTAL INTEGRATION TESTS FAILED:", error);
  } finally {
    console.log("\n=== CLEANING UP DATABASE ===");
    await Customer.deleteMany({ websiteId });
    await User.deleteMany({ email: "portal-user@acme.com" });
    await Quotation.deleteMany({ websiteId });
    await Ticket.deleteMany({ websiteId });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
