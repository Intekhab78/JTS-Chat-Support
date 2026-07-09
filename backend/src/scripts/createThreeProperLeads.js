import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { CustomerSuccess } from "../models/CustomerSuccess.js";
import { Quotation } from "../models/Quotation.js";
import { SalesOrder } from "../models/SalesOrder.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log("Database connected.");

  const websiteId = new mongoose.Types.ObjectId("6a2d64d4dc4011615028ba2a");

  // Find owner/agent
  const owner = await User.findOne({ name: "rohan" }) || await User.findOne({});
  if (!owner) {
    console.error("Owner user not found!");
    process.exit(1);
  }
  const ownerId = owner._id;

  // Ensure a Product exists
  let product = await Product.findOne({});
  if (!product) {
    product = await Product.create({
      name: "Enterprise SLA Support Module",
      sku: "PROD-SLA-99",
      price: 50000,
      description: "24/7 dedicated support SLA for enterprise customers",
      category: "software"
    });
  }

  // Define the 3 CRM Leads to create
  const leadsData = [
    {
      name: "Amit Sharma",
      email: "amit.sharma@acmedigital.com",
      phone: "+91 98765 43210",
      companyName: "Acme Digital Solutions",
      leadValue: 120000,
      recordType: "customer",
      pipelineStage: "won",
      leadStatus: "qualified",
      leadSource: "website",
      quoteNumber: "QT-2001",
      orderNumber: "SO-2001",
      onboarding: {
        status: "in_progress",
        checklist: {
          workspaceCreated: true,
          adminInvited: true,
          usersAdded: true,
          dataImported: true,
          trainingCompleted: false,
          goLive: false
        }
      },
      tasks: [
        { title: "Initialize Workspace Setup", status: "completed", dueOffset: -2 },
        { title: "Schedule Staff Training Session", status: "open", dueOffset: 2 }
      ]
    },
    {
      name: "Sarah Jenkins",
      email: "s.jenkins@globallogistics.com",
      phone: "+1 (555) 019-2834",
      companyName: "Global Logistics Ltd",
      leadValue: 50000,
      recordType: "customer",
      pipelineStage: "won",
      leadStatus: "qualified",
      leadSource: "referral",
      quoteNumber: "QT-2002",
      orderNumber: "SO-2002",
      onboarding: {
        status: "completed",
        checklist: {
          workspaceCreated: true,
          adminInvited: true,
          usersAdded: true,
          dataImported: true,
          trainingCompleted: true,
          goLive: true
        }
      },
      tasks: [
        { title: "Verify CRM Integration", status: "completed", dueOffset: -3 },
        { title: "Client Training and Handover", status: "completed", dueOffset: -1 }
      ]
    },
    {
      name: "Rohan Verma",
      email: "rohan.verma@innovatetech.com",
      phone: "+91 99998 88888",
      companyName: "Innovate Tech Corp",
      leadValue: 30000,
      recordType: "lead",
      pipelineStage: "proposal",
      leadStatus: "new",
      leadSource: "chat",
      quoteNumber: "QT-2003",
      onboarding: {
        status: "pending",
        checklist: {
          workspaceCreated: false,
          adminInvited: false,
          usersAdded: false,
          dataImported: false,
          trainingCompleted: false,
          goLive: false
        }
      },
      tasks: [
        { title: "Follow up on sent quote proposal", status: "open", dueOffset: 1 }
      ]
    }
  ];

  for (const data of leadsData) {
    // Check if customer already exists, if so delete them and their quotes/orders/tasks to ensure clean seed
    await Customer.deleteMany({ email: data.email, websiteId });
    await FollowUpTask.deleteMany({ websiteId, customerId: { $in: await Customer.find({ email: data.email, websiteId }).select("_id") } });
    
    const crn = "CRN-" + Math.floor(100000 + Math.random() * 90000);

    const customer = await Customer.create({
      crn,
      name: data.name,
      email: data.email,
      phone: data.phone,
      companyName: data.companyName,
      recordType: data.recordType,
      pipelineStage: data.pipelineStage,
      leadStatus: data.leadStatus,
      leadSource: data.leadSource,
      leadValue: data.leadValue,
      websiteId,
      ownerId,
      firstInteraction: new Date(),
      lastInteraction: new Date(),
      lastActivity: new Date()
    });

    console.log(`Created Customer: ${customer.name} (CRN: ${customer.crn})`);

    // Create Customer Success / Onboarding record
    await CustomerSuccess.deleteMany({ customerId: customer._id });
    await CustomerSuccess.create({
      websiteId,
      customerId: customer._id,
      healthScore: data.onboarding.status === "completed" ? 95 : 80,
      onboardingStatus: data.onboarding.status,
      onboardingChecklist: data.onboarding.checklist,
      successManager: ownerId
    });

    // Create Quotation
    await Quotation.deleteMany({ customerId: customer._id });
    const subtotal = data.leadValue;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const quotation = await Quotation.create({
      quotationId: `${data.quoteNumber}-V1`,
      quotationNumber: data.quoteNumber,
      version: 1,
      customerId: customer._id,
      websiteId,
      ownerId,
      items: [{
        productId: product._id,
        description: product.description,
        quantity: 1,
        price: data.leadValue,
        taxRate: 18,
        taxAmount: tax,
        subtotal,
        total
      }],
      subtotal,
      tax,
      total,
      status: data.pipelineStage === "won" ? "accepted" : "sent",
      approvalStatus: data.pipelineStage === "won" ? "approved" : "none",
      validUntil
    });

    console.log(`Created Quotation: ${quotation.quotationNumber} for ${customer.name}`);

    // Create Sales Order if deal is won
    if (data.orderNumber) {
      await SalesOrder.deleteMany({ customerId: customer._id });
      await SalesOrder.create({
        websiteId,
        orderNumber: data.orderNumber,
        customerId: customer._id,
        quotationId: quotation._id,
        status: data.onboarding.status === "completed" ? "completed" : "processing",
        items: [{
          productId: product._id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPrice: data.leadValue,
          taxRate: 18,
          taxAmount: tax,
          subtotal,
          total
        }],
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        paymentStatus: data.onboarding.status === "completed" ? "paid" : "pending",
        ownerId
      });
      console.log(`Created Sales Order: ${data.orderNumber} for ${customer.name}`);
    }

    // Create tasks
    for (const t of data.tasks) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + t.dueOffset);

      await FollowUpTask.create({
        websiteId,
        customerId: customer._id,
        title: t.title,
        status: t.status,
        dueAt,
        priority: "medium",
        ownerId
      });
    }
  }

  console.log("All 3 leads and their workflows seeded successfully!");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Seeder failed:", err);
  process.exit(1);
});
