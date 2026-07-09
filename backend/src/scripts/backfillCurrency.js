import mongoose from "mongoose";
import { Quotation } from "../models/Quotation.js";
import { Invoice } from "../models/Invoice.js";
import { Website } from "../models/Website.js";
import { env } from "../config/env.js";

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log("Database connected.");

  // Find only websites with non-INR currency (the ones that actually need fixing)
  const websites = await Website.find({
    "currencySettings.currencyCode": { $nin: ["INR", null, ""] }
  });

  if (websites.length === 0) {
    console.log("No non-INR websites found. Checking all...");
    const all = await Website.find({}, { websiteName: 1, currencySettings: 1 });
    for (const w of all) {
      console.log(`  ${w.websiteName}: ${w.currencySettings?.currencyCode}`);
    }
  }

  for (const website of websites) {
    const code = website.currencySettings?.currencyCode || "INR";
    console.log(`\nWebsite "${website.websiteName}" (${website._id}) → currency: ${code}`);

    try {
      const qRes = await Quotation.updateMany(
        { websiteId: website._id },
        { $set: { currency: code } }
      );
      console.log(`  ✓ Quotations updated: ${qRes.modifiedCount}`);

      const iRes = await Invoice.updateMany(
        { websiteId: website._id },
        { $set: { currency: code } }
      );
      console.log(`  ✓ Invoices updated: ${iRes.modifiedCount}`);
    } catch (err) {
      console.error(`  ✗ Error updating ${website.websiteName}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch(console.error);
