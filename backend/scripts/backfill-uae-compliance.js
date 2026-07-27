import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Customer } from "../src/models/Customer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function backfillUaeComplianceData() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/jts-crm";
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    const customers = await Customer.find({
      $or: [
        { serviceType: { $exists: false } },
        { workStatus: { $exists: false } },
        { paymentStatus: { $exists: false } },
        { trn: { $exists: false } },
        { tradeLicenseNumber: { $exists: false } }
      ]
    });

    console.log(`Found ${customers.length} customer records requiring UAE compliance backfill.`);

    let updatedCount = 0;
    for (const customer of customers) {
      if (!customer.serviceType) customer.serviceType = "Corporate Tax Registration";
      if (!customer.workStatus) customer.workStatus = "Pending";
      if (!customer.paymentStatus) customer.paymentStatus = "Pending";
      if (customer.trn === undefined) customer.trn = "";
      if (customer.tradeLicenseNumber === undefined) customer.tradeLicenseNumber = "";
      if (!customer.lastFollowUpActivityAt) {
        customer.lastFollowUpActivityAt = customer.updatedAt || customer.createdAt || new Date();
      }

      await customer.save();
      updatedCount++;
    }

    console.log(`Successfully backfilled ${updatedCount} customer records with UAE Compliance defaults.`);
  } catch (err) {
    console.error("Backfill failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

backfillUaeComplianceData();
