import mongoose from "mongoose";
import dotenv from "dotenv";
import { Color } from "../models/Color.js";
import { Website } from "../models/Website.js";

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const website = await Website.findOne({ websiteName: /UEA-INVOICE/i });
  if (!website) {
    console.log("Website not found");
    process.exit(1);
  }
  const colors = await Color.find({ websiteId: website._id });
  console.log(`Found ${colors.length} colors for ${website.websiteName} (${website._id})`);
  process.exit(0);
}
check();
