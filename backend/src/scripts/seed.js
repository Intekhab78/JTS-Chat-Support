import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";

async function seed() {
  await connectDatabase();

  let admin = await User.findOne({ email: "jtsadmin@gmail.com" });
  if (!admin) {
    admin = await User.create({
      name: "Admin",
      email: "jtsadmin@gmail.com",
      password: await bcrypt.hash("jts@123", 10),
      role: "admin"
    });
  } else {
    admin.password = await bcrypt.hash("jts@123", 10);
    admin.role = "admin";
    await admin.save();
  }

  let client = await User.findOne({ email: "client@gmail.com" });
  if (!client) {
    client = await User.create({
      name: "Client",
      email: "client@gmail.com",
      password: await bcrypt.hash("123456", 10),
      role: "client"
    });
  } else {
    client.password = await bcrypt.hash("123456", 10);
    client.role = "client";
    await client.save();
  }

  let agent = await User.findOne({ email: "agent@gmail.com" });
  if (!agent) {
    agent = await User.create({
      name: "Agent",
      email: "agent@gmail.com",
      password: await bcrypt.hash("123456", 10),
      role: "agent",
      managerId: client._id
    });
  } else {
    agent.password = await bcrypt.hash("123456", 10);
    agent.role = "agent";
    agent.managerId = client._id;
    await agent.save();
  }

  // --- Add a Default Supplier ---
  // Import Supplier model at the top ideally, or define it dynamically.
  // Since we don't have it imported, let's just create a User with role 'supplier'
  // But wait, it needs a valid supplierId to work perfectly. 
  // Let's import Supplier dynamically
  const { Supplier } = await import("../models/Supplier.js");
  const { Website } = await import("../models/Website.js");
  const { InventoryItem } = await import("../models/InventoryItem.js");
  const { PurchaseOrder } = await import("../models/PurchaseOrder.js");
  
  let defaultSupplier = await Supplier.findOne({ email: "supplier@gmail.com" });
  if (!defaultSupplier) {
    defaultSupplier = await Supplier.create({
      companyName: "Global Tech Supplies",
      contactPerson: "Sam Supplier",
      email: "supplier@gmail.com",
      phone: "1234567890",
      taxId: "GST1234567",
      address: "123 Supplier Street, Warehouse District",
      createdBy: admin._id
    });
  }

  let supplierUser = await User.findOne({ email: "supplier@gmail.com" });
  if (!supplierUser) {
    supplierUser = await User.create({
      name: "Global Tech Supplies",
      email: "supplier@gmail.com",
      password: await bcrypt.hash("123456", 10),
      role: "supplier",
      supplierId: defaultSupplier._id
    });
  } else {
    supplierUser.password = await bcrypt.hash("123456", 10);
    supplierUser.role = "supplier";
    supplierUser.supplierId = defaultSupplier._id;
    await supplierUser.save();
  }

  // --- Create Dummy Purchase Orders for Supplier Dashboard ---
  let defaultWebsite = await Website.findOne();
  if (!defaultWebsite) {
    defaultWebsite = await Website.create({
      websiteName: "Demo CRM",
      url: "https://demo.com",
      status: "active",
      clientId: client._id
    });
  }

  let defaultItem = await InventoryItem.findOne();
  if (!defaultItem) {
    defaultItem = await InventoryItem.create({
      websiteId: defaultWebsite._id,
      name: "Premium Widget",
      sku: "WIDG-001",
      quantity: 100,
      minQuantity: 10,
      unitPrice: 50,
      status: "active",
      createdBy: admin._id
    });
  }

  const existingPOs = await PurchaseOrder.find({ supplierId: defaultSupplier._id });
  if (existingPOs.length === 0) {
    const poStatuses = ["sent", "accepted", "shipped", "delivered", "delivered"];
    const baseDate = new Date();
    
    for (let i = 0; i < 5; i++) {
      const quantity = Math.floor(Math.random() * 50) + 10;
      const unitPrice = 1200;
      const total = quantity * unitPrice;
      
      const orderDate = new Date(baseDate);
      orderDate.setMonth(baseDate.getMonth() - i); // distribute over last 5 months
      
      await PurchaseOrder.create({
        poNumber: `PO-2026-${1000 + i}`,
        supplierId: defaultSupplier._id,
        websiteId: defaultWebsite._id,
        items: [{
          itemId: defaultItem._id,
          description: i % 2 === 0 ? "Premium Keyboard (Mechanical)" : "Ultra-Wide Monitor 34-inch",
          quantity,
          unitPrice,
          total
        }],
        subtotal: total,
        total: total,
        status: poStatuses[i],
        createdAt: orderDate,
        createdBy: admin._id
      });
    }
    console.log("Seeded 5 Purchase Orders for the supplier.");
  }

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
