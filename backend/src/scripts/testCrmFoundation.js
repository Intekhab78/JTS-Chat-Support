import mongoose from "mongoose";
import assert from "assert";
import { connectDatabase } from "../config/database.js";
import { Company } from "../models/Company.js";
import { Contact } from "../models/Contact.js";
import { Deal } from "../models/Deal.js";
import { Activity } from "../models/Activity.js";
import { Customer } from "../models/Customer.js";

import * as companyService from "../services/companyService.js";
import * as contactService from "../services/contactService.js";
import * as dealService from "../services/dealService.js";
import * as activityService from "../services/activityService.js";
import { getTimelineForEntity } from "../services/timelineService.js";

async function runTests() {
  console.log("=== CONNECTING TO DATABASE ===");
  await connectDatabase();

  const websiteId = new mongoose.Types.ObjectId();
  const actorId = new mongoose.Types.ObjectId();

  console.log("\n=== STARTING INTEGRATION TESTS ===");

  try {
    // 1. Test Company Service CRUD
    console.log("-> Testing Company Service...");
    const companyData = {
      websiteId,
      companyName: "Enterprise LLC",
      industry: "Technology",
      website: "https://enterprise.llc",
      gstVat: "GSTIN12345",
      pan: "ABCDE1234F",
      notes: "VIP Client",
      addresses: [
        { label: "HQ", street: "123 Tech Lane", city: "Bangalore", state: "Karnataka", zip: "560001", country: "India", type: "billing" }
      ]
    };

    const company = await companyService.createCompany(companyData, actorId);
    assert.strictEqual(company.companyName, "Enterprise LLC");
    assert.strictEqual(company.pan, "ABCDE1234F");
    assert.strictEqual(company.isDeleted, false);

    const updatedCompany = await companyService.updateCompany(company._id, { notes: "Super VIP Client" }, actorId);
    assert.strictEqual(updatedCompany.notes, "Super VIP Client");

    // 2. Test Contact Service CRUD
    console.log("-> Testing Contact Service...");
    const contactData = {
      websiteId,
      companyId: company._id,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@enterprise.llc",
      emails: ["john.doe@enterprise.llc", "john.doe.alternate@enterprise.llc"],
      whatsApp: "9988776655",
      jobTitle: "CTO",
      department: "Engineering",
      isPrimary: true
    };

    const contact = await contactService.createContact(contactData, actorId);
    assert.strictEqual(contact.displayName, "John Doe");
    assert.strictEqual(contact.isPrimary, true);
    assert.strictEqual(contact.emails.length, 2);

    // 3. Test Deal/Opportunity Service CRUD
    console.log("-> Testing Opportunity Service...");
    const dealData = {
      websiteId,
      companyId: company._id,
      primaryContactId: contact._id,
      dealName: "Enterprise Software License",
      dealValue: 50000,
      stage: "proposal",
      probability: 60
    };

    const deal = await dealService.createDeal(dealData, actorId);
    assert.strictEqual(deal.dealName, "Enterprise Software License");
    assert.strictEqual(deal.stage, "proposal");

    // 4. Test Activity Service CRUD
    console.log("-> Testing Activity Service...");
    const activityData = {
      websiteId,
      type: "meeting",
      title: "CTO Alignment Call",
      description: "Discussing customization requirements.",
      dueDate: new Date(),
      companyId: company._id,
      contactId: contact._id,
      dealId: deal._id
    };

    const activity = await activityService.createActivity(activityData, actorId);
    assert.strictEqual(activity.title, "CTO Alignment Call");
    assert.strictEqual(activity.status, "pending");

    const updatedActivity = await activityService.updateActivity(activity._id, { status: "completed", outcomeNotes: "Highly successful meeting" }, actorId);
    assert.strictEqual(updatedActivity.status, "completed");
    assert.strictEqual(updatedActivity.outcomeNotes, "Highly successful meeting");
    assert.notStrictEqual(updatedActivity.completedAt, null);

    // 5. Test Customer 360 Timeline
    console.log("-> Testing Customer 360 Timeline...");
    // Let's create a temporary Customer document to test timeline linking
    const customer = await Customer.create({
      crn: "CRN-TEST-123",
      name: "John Doe Customer",
      email: "john.doe@enterprise.llc",
      websiteId,
      internalNotes: [{ text: "This is a customer internal note" }]
    });

    // Update activity and quotation and invoice to link to customer
    await Activity.create({
      websiteId,
      type: "call",
      title: "Introductory Call",
      dueDate: new Date(),
      customerId: customer._id
    });

    const timeline = await getTimelineForEntity(customer._id, websiteId);
    assert.ok(timeline.length >= 2, "Timeline should return populated events");
    assert.strictEqual(timeline[0].type, "call");
    assert.strictEqual(timeline[1].type, "note");

    console.log("\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("\n❌ INTEGRATION TESTS FAILED:", error);
  } finally {
    console.log("\n=== CLEANING UP DATABASE ===");
    await Company.deleteMany({ websiteId });
    await Contact.deleteMany({ websiteId });
    await Deal.deleteMany({ websiteId });
    await Activity.deleteMany({ websiteId });
    await Customer.deleteMany({ websiteId });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
