import mongoose from "mongoose";
import { InventoryItem } from "../backend/src/models/InventoryItem.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

async function checkItem() {
  await mongoose.connect(process.env.MONGODB_URI);
  const item = await InventoryItem.findOne({ name: "Drip Coffee Maker" });
  if (item) {
    console.log(`Item: ${item.name}`);
    console.log(`Quantity: ${item.quantity}`);
    console.log(`Reorder Level: ${item.reorderLevel}`);
  } else {
    console.log("Item 'Drip Coffee Maker' not found");
  }
  await mongoose.disconnect();
}

checkItem().catch(console.error);
