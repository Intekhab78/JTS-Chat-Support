import mongoose from "mongoose";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { Quotation } from "../models/Quotation.js";
import { env } from "../config/env.js";

async function run() {
  console.log("Connecting to Database...");
  await mongoose.connect(env.mongoUri);
  console.log("Connected.");

  const websiteId = "6a2d64d4dc4011615028ba2a";
  const website = await Website.findById(websiteId);
  if (!website) {
    console.error("Website not found!");
    process.exit(1);
  }

  // Find owner (Client/Admin)
  const owner = await User.findOne({ role: { $in: ["client", "admin"] } });
  if (!owner) {
    console.error("Owner user not found!");
    process.exit(1);
  }
  const ownerId = owner._id;

  // Clean old sample data on this website
  await Product.deleteMany({ websiteId });
  await Quotation.deleteMany({ websiteId });

  // Create 3 Sample Products
  console.log("Creating products...");
  const p1 = await Product.create({
    websiteId,
    sku: "LIC-CHAT-ENT",
    name: "High-Speed Enterprise Chat Widget License",
    type: "digital",
    category: "Software License",
    brand: "JTS",
    description: "Enterprise grade real-time live chat widget license.",
    unit: "pcs",
    price: 15000,
    cost: 2000,
    taxRate: 18,
    status: "active"
  });

  const p2 = await Product.create({
    websiteId,
    sku: "SRV-SLA-PREM",
    name: "24/7 Dedicated Support Agent Service SLA",
    type: "service",
    category: "Professional Services",
    brand: "JTS",
    description: "Monthly premium support SLA service with guaranteed response times.",
    unit: "hrs",
    price: 50000,
    cost: 25000,
    taxRate: 18,
    status: "active"
  });

  const p3 = await Product.create({
    websiteId,
    sku: "PKG-CRM-ONB",
    name: "Custom CRM Integration & Onboarding Package",
    type: "bundle",
    category: "Onboarding Packages",
    brand: "JTS",
    description: "End-to-end custom CRM alignment, data import, and staff training bundle.",
    unit: "pcs",
    price: 120000,
    cost: 40000,
    taxRate: 18,
    status: "active"
  });
  console.log("Products created successfully.");

  // Find Customers
  const mohitCustomer = await Customer.findOne({ websiteId, name: "Mohit Kumar Maurya" });
  const riyaCustomer = await Customer.findOne({ websiteId, name: "riya" });

  if (mohitCustomer) {
    console.log("Creating quote 1 for Mohit...");
    const subtotal = 30000;
    const tax = 5400; // 18% of 30,000
    const total = 35400;
    
    await Quotation.create({
      quotationId: "QT-1002-V1",
      quotationNumber: "QT-1002",
      version: 1,
      customerId: mohitCustomer._id,
      websiteId,
      ownerId,
      items: [
        {
          productId: p1._id,
          description: p1.name,
          quantity: 2,
          price: p1.price,
          discount: 0,
          taxRate: 18,
          taxAmount: tax,
          subtotal,
          total
        }
      ],
      subtotal,
      discountAmount: 0,
      shippingCharges: 0,
      tax,
      total,
      currency: "INR",
      status: "sent",
      approvalStatus: "none",
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });
  }

  if (riyaCustomer) {
    console.log("Creating quote 2 for riya...");
    const subtotal = 50000;
    const tax = 9000; // 18% of 50,000
    const total = 59000;

    await Quotation.create({
      quotationId: "QT-1003-V1",
      quotationNumber: "QT-1003",
      version: 1,
      customerId: riyaCustomer._id,
      websiteId,
      ownerId,
      items: [
        {
          productId: p2._id,
          description: p2.name,
          quantity: 1,
          price: p2.price,
          discount: 0,
          taxRate: 18,
          taxAmount: tax,
          subtotal,
          total
        }
      ],
      subtotal,
      discountAmount: 0,
      shippingCharges: 0,
      tax,
      total,
      currency: "INR",
      status: "pending_approval",
      approvalStatus: "pending_manager",
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });
  }

  console.log("Seeding complete. Closing database connection.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
