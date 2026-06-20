import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import { connectDatabase } from "../config/database.js";

import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { Supplier } from "../models/Supplier.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { InventoryItem } from "../models/InventoryItem.js";

async function seedProcurement() {
  try {
    await connectDatabase();
    
    const admin = await User.findOne({ email: "jtsadmin@gmail.com" });
    const client = await User.findOne({ email: "client@gmail.com" });
    const website = await Website.findOne({ managerId: client._id });

    if (!website || !admin) {
      console.error("Required data not found");
      process.exit(1);
    }

    console.log("Creating 20 Suppliers...");
    const suppliers = [];
    for (let i = 0; i < 20; i++) {
      suppliers.push({
        companyName: faker.company.name() + " Supplies",
        contactPerson: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number(),
        taxId: "GST" + faker.string.alphanumeric(10).toUpperCase(),
        address: faker.location.streetAddress(),
        websiteIds: [website._id],
        createdBy: admin._id
      });
    }
    await Supplier.deleteMany({});
    const insertedSuppliers = await Supplier.insertMany(suppliers);

    console.log("Fetching Inventory Items...");
    const items = await InventoryItem.find({ websiteId: website._id });
    
    if (items.length === 0) {
      console.log("No inventory items found. Run populate_inventory.js first.");
      process.exit(0);
    }

    console.log("Creating 100 Purchase Orders...");
    const pos = [];
    const baseDate = new Date();
    
    for (let i = 0; i < 100; i++) {
      const supplier = faker.helpers.arrayElement(insertedSuppliers);
      const item = faker.helpers.arrayElement(items);
      const quantity = faker.number.int({ min: 10, max: 200 });
      const unitPrice = item.unitCost || faker.number.int({ min: 50, max: 2000 });
      const total = quantity * unitPrice;
      
      const orderDate = new Date(baseDate);
      orderDate.setDate(baseDate.getDate() - faker.number.int({ min: 0, max: 180 })); // Last 6 months
      
      const status = faker.helpers.arrayElement(["draft", "sent", "accepted", "shipped", "delivered"]);
      
      pos.push({
        poNumber: `PO-2026-${String(1000 + i).padStart(5, '0')}`,
        supplierId: supplier._id,
        websiteId: website._id,
        items: [{
          itemId: item._id,
          description: item.name,
          quantity,
          unitPrice,
          total
        }],
        subtotal: total,
        total: total,
        status: status,
        createdAt: orderDate,
        createdBy: admin._id,
        stockReceived: status === "delivered"
      });
    }
    
    await PurchaseOrder.deleteMany({});
    await PurchaseOrder.insertMany(pos);
    console.log("Procurement seed complete.");
    process.exit(0);

  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seedProcurement();
