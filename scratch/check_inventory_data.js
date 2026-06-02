import mongoose from "mongoose";
import { InventoryItem } from "../backend/src/models/InventoryItem.js";
import { Website } from "../backend/src/models/Website.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

async function checkInventory() {
  await mongoose.connect(process.env.MONGODB_URI);
  const website = await Website.findOne({ websiteName: "Uea-Invoice" });
  if (website) {
    const items = await InventoryItem.find({ websiteId: website._id });
    console.log(`Website: ${website.websiteName} (ID: ${website._id})`);
    console.log(`Inventory Items Count: ${items.length}`);
    if (items.length > 0) {
      console.log("Items:", items.map(i => ({ name: i.name, sku: i.sku, qty: i.quantity })));
    }
  } else {
    console.log("Website 'Uea-Invoice' not found");
  }
  await mongoose.disconnect();
}

checkInventory().catch(console.error);
