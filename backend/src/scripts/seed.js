import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";

// Models
import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Category } from "../models/Category.js";
import { Article } from "../models/Article.js";
import { Department } from "../models/Department.js";
import { Analytics } from "../models/Analytics.js";
import { AnalyticsSnapshot } from "../models/AnalyticsSnapshot.js";

const NUM_CLIENTS = 20;
const NUM_AGENTS = 100;
const MIN_WEBSITES = 3;
const MAX_WEBSITES = 10;
const NUM_ARTICLES = 800;
const NUM_LEADS = 10000;
const NUM_TICKETS = 20000;

const BATCH_SIZE = 1000;

async function clearDatabase() {
  console.log("Clearing existing data...");
  await User.deleteMany({ email: { $nin: ["jtsadmin@gmail.com", "client@gmail.com"] } });
  await Website.deleteMany({});
  await Customer.deleteMany({});
  await Ticket.deleteMany({});
  await Category.deleteMany({});
  await Article.deleteMany({});
  await Department.deleteMany({});
  await Analytics.deleteMany({});
  await AnalyticsSnapshot.deleteMany({});
  console.log("Database cleared.");
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seed() {
  try {
    await connectDatabase();
    await clearDatabase();

    // 1. Admin & Default Client
    let admin = await User.findOne({ email: "jtsadmin@gmail.com" });
    if (!admin) {
      admin = await User.create({
        name: "Admin",
        email: "jtsadmin@gmail.com",
        password: await bcrypt.hash("jts@123", 10),
        role: "admin"
      });
    }

    const clientPwd = await bcrypt.hash("123456", 10);
    let defaultClient = await User.findOne({ email: "client@gmail.com" });
    if (!defaultClient) {
      defaultClient = await User.create({
        name: "Demo Client",
        email: "client@gmail.com",
        password: clientPwd,
        role: "manager",
        phone: "1234567890",
        companyName: "Demo Company"
      });
    }

    // 2. Clients (Managers)
    console.log(`Creating ${NUM_CLIENTS} Clients...`);
    const clients = [defaultClient];
    for (let i = 1; i < NUM_CLIENTS; i++) {
      clients.push({
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        password: clientPwd,
        role: "manager",
        phone: faker.phone.number(),
        companyName: faker.company.name()
      });
    }
    const insertedClients = await User.insertMany(clients.slice(1));
    const allClients = [defaultClient, ...insertedClients];

    // 3. Agents
    console.log(`Creating ${NUM_AGENTS} Agents...`);
    const agents = [];
    for (let i = 0; i < NUM_AGENTS; i++) {
      const isSales = faker.datatype.boolean();
      agents.push({
        name: faker.person.fullName(),
        email: `agent${i}@example.com`,
        password: clientPwd,
        role: isSales ? "sales" : "agent",
        phone: faker.phone.number(),
        managerId: faker.helpers.arrayElement(allClients)._id,
        isOnline: faker.datatype.boolean(),
        lastActiveAt: new Date()
      });
    }
    const insertedAgents = await User.insertMany(agents);

    // 4. Websites & Chat Flows
    console.log("Creating Websites and Chat Flows...");
    const websites = [];
    let websiteIndex = 1;
    for (const client of allClients) {
      const numSites = faker.number.int({ min: MIN_WEBSITES, max: MAX_WEBSITES });
      for (let i = 0; i < numSites; i++) {
        websites.push({
          websiteName: faker.company.name(),
          domain: faker.internet.domainName(),
          apiKey: `sk_test_${faker.string.alphanumeric(24)}_${websiteIndex++}`,
          managerId: client._id,
          primaryColor: faker.color.rgb(),
          accentColor: faker.color.rgb(),
          botEnabled: true,
          botFlow: {
            nodes: {
              root: {
                message: "Welcome! How can we help you today?",
                options: [
                  { text: "Sales Inquiry", next: "sales" },
                  { text: "Technical Support", next: "support" },
                  { text: "Billing", next: "billing" },
                  { text: "Raise Ticket", next: "ticket_form" }
                ]
              },
              sales: {
                message: "Great! Are you looking for a new service or an upgrade?",
                options: [
                  { text: "New Service", next: "sales_new" },
                  { text: "Upgrade", next: "sales_form" }
                ]
              },
              sales_new: {
                message: "Please fill out this form to get started.",
                isForm: true,
                formType: "service_inquiry"
              },
              sales_form: {
                message: "Please fill out this form so our sales team can contact you.",
                isForm: true,
                formType: "service_inquiry"
              },
              support: {
                message: "Please briefly describe your issue or raise a ticket.",
                options: [
                  { text: "Talk to Agent", next: "agent_escalation" },
                  { text: "Raise Ticket", next: "ticket_form" }
                ]
              },
              billing: {
                message: "For billing, please raise a ticket and our finance team will respond within 24 hours.",
                isForm: true,
                formType: "raise_ticket"
              },
              ticket_form: {
                message: "Please provide the details below.",
                isForm: true,
                formType: "raise_ticket"
              },
              agent_escalation: {
                message: "Connecting you to the next available agent...",
                escalate: true,
                department: "Support"
              }
            }
          }
        });
      }
    }
    const insertedWebsites = await Website.insertMany(websites);

    // 5. Departments & Categories
    console.log("Creating Departments and Services (Categories)...");
    const deptNames = ["Sales", "Support", "Technical", "Billing", "Management"];
    const baseServices = ["Website Development", "Mobile App Development", "CRM Development", "ERP Development", "SEO", "Digital Marketing", "AI Chatbots", "Cloud Hosting", "API Integration", "Cyber Security"];
    
    const departments = [];
    const categories = [];

    for (const site of insertedWebsites) {
      for (const name of deptNames) {
        departments.push({
          name,
          websiteId: site._id,
          managerId: site.managerId,
          isActive: true
        });
      }

      // Add roughly 3-5 categories per website to match the "100+ categories" across sites
      for(let i = 0; i < 5; i++) {
        categories.push({
          name: faker.helpers.arrayElement(baseServices),
          department: faker.helpers.arrayElement(deptNames).toLowerCase(),
          subcategories: [faker.commerce.productAdjective(), faker.commerce.productMaterial()],
          websiteId: site._id,
          managerId: site.managerId
        });
      }
    }
    
    // We can just use standard Mongoose .create() or .insertMany() with `{ ordered: false }` to ignore duplicate unique index errors.
    await Department.insertMany(departments, { ordered: false }).catch(() => {});
    await Category.insertMany(categories, { ordered: false }).catch(() => {});

    // 6. Knowledge Base (Articles)
    console.log(`Creating ${NUM_ARTICLES} Knowledge Base Articles...`);
    const allCategories = await Category.find();
    const articles = [];
    for (let i = 0; i < NUM_ARTICLES; i++) {
      const site = faker.helpers.arrayElement(insertedWebsites);
      const category = faker.helpers.arrayElement(allCategories) || { _id: new mongoose.Types.ObjectId() };
      articles.push({
        title: faker.lorem.sentence({ min: 4, max: 8 }),
        content: faker.lorem.paragraphs(3, "<br/>\n"),
        websiteId: site._id,
        categoryId: category._id,
        isPublished: true,
        authorId: site.managerId,
        views: faker.number.int({ min: 0, max: 5000 }),
        tags: [faker.lorem.word(), faker.lorem.word()],
        createdAt: randomDate(new Date(2025, 0, 1), new Date()),
        updatedAt: new Date()
      });
    }
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      await Article.insertMany(articles.slice(i, i + BATCH_SIZE));
    }

    // 7. Leads (Customers)
    console.log(`Creating ${NUM_LEADS} Leads...`);
    const leads = [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    for (let i = 0; i < NUM_LEADS; i++) {
      const site = faker.helpers.arrayElement(insertedWebsites);
      const possibleAgents = insertedAgents.filter(a => String(a.managerId) === String(site.managerId));
      const ownerId = possibleAgents.length ? faker.helpers.arrayElement(possibleAgents)._id : null;
      
      const createdAt = randomDate(oneYearAgo, new Date());
      leads.push({
        crn: `CRN-${createdAt.getFullYear()}-${String(i + 1).padStart(5, '0')}-${Math.floor(Math.random()*1000)}`,
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number(),
        companyName: faker.company.name(),
        recordType: faker.helpers.arrayElement(["lead", "deal", "customer"]),
        leadStatus: faker.helpers.arrayElement(["new", "contacted", "qualified", "lost"]),
        dealStage: faker.helpers.arrayElement(["discovery", "proposal_sent", "negotiation", "won", "lost"]),
        pipelineStage: faker.helpers.arrayElement(["new", "qualified", "proposal", "won", "lost"]),
        budget: faker.number.int({ min: 500, max: 50000 }),
        requirement: faker.lorem.sentence(),
        leadSource: faker.helpers.arrayElement(["Website Chat", "Organic Search", "Referral", "Cold Call"]),
        websiteId: site._id,
        ownerId,
        firstInteraction: createdAt,
        lastInteraction: randomDate(createdAt, new Date()),
        createdAt,
        updatedAt: createdAt
      });
    }
    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      await Customer.insertMany(leads.slice(i, i + BATCH_SIZE), { ordered: false }).catch(() => {});
      console.log(`Inserted ${Math.min(i + BATCH_SIZE, leads.length)} leads...`);
    }

    const insertedLeads = await Customer.find().select('_id email name websiteId crn');

    // 8. Tickets
    console.log(`Creating ${NUM_TICKETS} Support Tickets...`);
    const tickets = [];
    for (let i = 0; i < NUM_TICKETS; i++) {
      const lead = faker.helpers.arrayElement(insertedLeads);
      const siteOwnerId = insertedWebsites.find(w => String(w._id) === String(lead.websiteId))?.managerId;
      const possibleAgents = insertedAgents.filter(a => String(a.managerId) === String(siteOwnerId));
      const assignedAgent = possibleAgents.length ? faker.helpers.arrayElement(possibleAgents)._id : null;
      
      const createdAt = randomDate(oneYearAgo, new Date());
      const isResolved = faker.datatype.boolean(0.8); // 80% resolved
      
      tickets.push({
        ticketId: `TKT-${createdAt.getTime()}-${Math.floor(Math.random()*10000)}`,
        websiteId: lead.websiteId,
        customerId: lead._id,
        crn: lead.crn,
        assignedAgent,
        subject: faker.hacker.phrase(),
        priority: faker.helpers.arrayElement(["low", "medium", "high", "urgent"]),
        status: isResolved ? faker.helpers.arrayElement(["resolved", "closed"]) : faker.helpers.arrayElement(["open", "in_progress", "waiting"]),
        category: faker.helpers.arrayElement(["Technical", "Billing", "Sales", "General"]),
        department: faker.helpers.arrayElement(["support", "billing", "sales", "technical"]),
        lastMessagePreview: faker.lorem.sentence(),
        isRead: true,
        resolvedAt: isResolved ? randomDate(createdAt, new Date()) : null,
        createdAt,
        updatedAt: randomDate(createdAt, new Date())
      });
    }
    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      await Ticket.insertMany(tickets.slice(i, i + BATCH_SIZE), { ordered: false }).catch(() => {});
      console.log(`Inserted ${Math.min(i + BATCH_SIZE, tickets.length)} tickets...`);
    }

    // 9. Analytics Snapshots
    console.log("Generating 12 months of Analytics...");
    const snapshots = [];
    const today = new Date();
    
    for (const site of insertedWebsites) {
      for (let d = 0; d < 365; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - d);
        date.setHours(12, 0, 0, 0);
        
        snapshots.push({
          websiteId: site._id,
          hour: date,
          totalVisitors: faker.number.int({ min: 10, max: 500 }),
          totalCustomers: faker.number.int({ min: 1, max: 20 }),
          activeChats: faker.number.int({ min: 0, max: 10 }),
          resolvedChats: faker.number.int({ min: 5, max: 50 }),
          avgWaitTimeSeconds: faker.number.int({ min: 10, max: 300 }),
          avgHandleTimeSeconds: faker.number.int({ min: 120, max: 1800 }),
          totalRevenue: faker.number.int({ min: 0, max: 5000 }),
          conversions: faker.number.int({ min: 0, max: 5 }),
        });
      }
      
      await Analytics.create({
        websiteId: site._id,
        totalVisitors: faker.number.int({ min: 10000, max: 500000 }),
        totalCustomers: faker.number.int({ min: 1000, max: 5000 }),
        activeChats: faker.number.int({ min: 0, max: 50 }),
        resolvedChats: faker.number.int({ min: 5000, max: 20000 }),
        avgResponseTimeSeconds: faker.number.int({ min: 30, max: 300 }),
        totalRevenue: faker.number.int({ min: 50000, max: 1000000 }),
        conversions: faker.number.int({ min: 500, max: 3000 })
      });
    }

    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      await AnalyticsSnapshot.insertMany(snapshots.slice(i, i + BATCH_SIZE), { ordered: false }).catch(() => {});
      console.log(`Inserted ${Math.min(i + BATCH_SIZE, snapshots.length)} analytics snapshots...`);
    }

    console.log("====================================");
    console.log("🔥 Seed Script Completed Successfully 🔥");
    console.log(`Clients: ${allClients.length}`);
    console.log(`Agents: ${insertedAgents.length}`);
    console.log(`Websites: ${insertedWebsites.length}`);
    console.log(`Categories: Seeded`);
    console.log(`Departments: Seeded`);
    console.log(`Articles: ${articles.length}`);
    console.log(`Leads: ${leads.length}`);
    console.log(`Tickets: ${tickets.length}`);
    console.log(`Analytics Snapshots: ${snapshots.length}`);
    console.log("====================================");
    process.exit(0);
  } catch (error) {
    console.error("Seed script failed:", error);
    process.exit(1);
  }
}

seed();
