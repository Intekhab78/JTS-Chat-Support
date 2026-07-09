import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { env } from "../config/env.js";

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log("Database connected.");

  const rohan = await User.findOne({ name: "rohan" });
  if (!rohan) {
    console.error("Rohan not found!");
    process.exit(1);
  }
  console.log("Rohan user info:", {
    _id: rohan._id,
    role: rohan.role,
    websiteIds: rohan.websiteIds
  });

  const websites = await Website.find({});
  console.log("Websites in system:");
  websites.forEach(w => {
    console.log(`- ${w.websiteName} (ID: ${w._id})`);
  });

  const ownedIds = await getOwnedWebsiteIds(rohan);
  console.log("Owned website IDs resolved by getOwnedWebsiteIds helper:", ownedIds.map(id => id.toString()));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
