const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });

const MONGODB_URI = process.env.MONGODB_URI;
const WEBSITE_ID = "6a3f74eab1508ca35a980475"; // jtsmiddleeast.com

const crmProcessDocument = {
  websiteId: new mongoose.Types.ObjectId(WEBSITE_ID),
  name: "JTS CRM Process and Workflow Documentation",
  type: "document",
  content: `JTS Support CRM System Process and Workflow Documentation:

1. Overview:
The JTS Support CRM is designed to streamline customer onboarding, relationship management, lead tracking, meeting scheduling, and communication management. The system is operated by multiple roles including Admin, Client, Manager, Agent, Sales, Purchase, and Accounts.

2. CRM Lifecycle & Pipelines:
The customer onboarding and deal conversion pipeline flows through standard, customizable stages:
- New: Initial lead captured from chat widgets or manual entries.
- Contacted: Sales agent has initiated communication via chat, email, or phone.
- Qualified: Lead has verified requirements and budget.
- Proposal: Custom quotation or proposal has been sent.
- Negotiation: Discussing pricing, terms, or product details.
- Won: Closed deal. Triggers account activation or sales order creation.
- Lost: Deal closed without conversion. Requires reason mapping.

3. Meeting Scheduling and Platforms:
Users can schedule events directly from the Centralized CRM Calendar (accessible via Month, Week, Day, and Agenda views).
- Supported Event Types: Meeting, Call, and Task.
- Dynamic Meeting Platforms: Configured per-website. Includes built-in JTS Meet, Zoom, Google Meet, Microsoft Teams, Phone Calls, and In-Person meetings.
- JTS Meet Integration: Uses the URL template "https://meet.jtsmiddleeast.com/meet/{roomId}". The backend automatically replaces "{roomId}" with a unique, secure ID (e.g., "jts-e7f0abd3af") during creation.
- Invites and Emails: When a meeting or call is scheduled, the backend sends responsive HTML invitation emails to all listed participants. These emails contain meeting metadata, description/agenda, and a prominent "Join Meeting" call-to-action button linking directly to the room.

4. Client Portal Access & Roles:
- Client Portal: Clients can login to view invoices, make payments via Stripe, download quotations, track support tickets, and update profile settings.
- Permission Levels:
  * Admin / Client: Full workspace control.
  * Manager: Can manage team assignments, custom fields, and pipelines.
  * Agent / Sales: Restricted access focused on assigned leads and activities.
  * Accounts: Restricted to invoicing, credit notes, and payment status updates.`
};

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB Atlas.");

    // Dynamic import of AI provider manager to generate real embeddings
    const { AiProviderManager } = await import("../backend/src/services/aiProviderManager.js");
    const provider = AiProviderManager.getProvider("gemini");
    console.log("Generating embedding vector via Gemini...");
    const embeddingVector = await provider.generateEmbedding(crmProcessDocument.content);

    // Save to DB
    const { AiKnowledgeSource } = await import("../backend/src/models/AiKnowledgeSource.js");
    
    // Remove existing if any to avoid duplication
    await AiKnowledgeSource.deleteOne({ websiteId: WEBSITE_ID, name: crmProcessDocument.name });

    const newSource = await AiKnowledgeSource.create({
      ...crmProcessDocument,
      embeddingPlaceholder: embeddingVector
    });

    console.log("SUCCESS: Knowledge source successfully seeded!", newSource._id.toString());
    process.exit(0);
  } catch (error) {
    console.error("Seeder failed:", error);
    process.exit(1);
  }
}

seed();
