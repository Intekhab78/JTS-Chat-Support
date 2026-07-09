import mongoose from "mongoose";
import { AiPrompt } from "../models/AiPrompt.js";
import { AiKnowledgeSource } from "../models/AiKnowledgeSource.js";
import { env } from "../config/env.js";

async function run() {
  console.log("Connecting to Database...");
  await mongoose.connect(env.mongoUri);
  console.log("Connected.");

  const websiteId = "6a2d64d4dc4011615028ba2a";

  // Clean old AI sample data for this website
  await AiPrompt.deleteMany({ websiteId, name: "agent_chat" });
  await AiKnowledgeSource.deleteMany({ websiteId, name: { $in: ["Customer Onboarding Stages", "JTS Support Portal FAQs"] } });

  // 1. Create Default Prompt Template
  console.log("Creating default system prompt 'agent_chat'...");
  await AiPrompt.create({
    websiteId,
    name: "agent_chat",
    category: "general",
    promptText: "You are JTS Support AI, a highly professional CRM assistant. Answer client questions query accurately using only the reference documents provided. Keep responses clear and bulleted.",
    variables: [],
    isActive: true
  });

  // 2. Create RAG Knowledge Sources
  console.log("Creating RAG knowledge documents...");
  await AiKnowledgeSource.create({
    websiteId,
    name: "Customer Onboarding Stages",
    type: "document",
    content: `JTS Customer Onboarding has the following 6 core sequential stages:
1. Workspace Creation: Setting up the primary digital workspace environment.
2. Admin Invitation: Sending the login instructions and setup link to the customer admin.
3. Users & Agents Setup: Adding team profiles and assigning role permissions.
4. Data Import: Importing client accounts, contacts, and historical database records.
5. Team Training: Organizing walkthrough training sessions for staff.
6. Go-Live Phase: Activating domain mapping and launch checklist.`
  });

  await AiKnowledgeSource.create({
    websiteId,
    name: "JTS Support Portal FAQs",
    type: "faq",
    content: `Q: How can a customer request client portal credentials?
A: An agent can grant portal access from the Customer Management list. A system-generated email with their unique ID, secure login link, and temporary password will be dispatched immediately.

Q: How do we change client permission levels?
A: Go to CRM Settings > Team Members, choose the user, and select their new role (e.g. Sales, Accounts, Client, Customer).`
  });

  console.log("Seeding complete. Closing database connection.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
