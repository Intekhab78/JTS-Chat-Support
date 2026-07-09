import mongoose from "mongoose";
import { Website } from "../models/Website.js";
import { env } from "../config/env.js";

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log("Database connected.");

  const website = await Website.findById("6a2d64d4dc4011615028ba2a");
  if (!website) {
    console.error("Website not found!");
    process.exit(1);
  }

  console.log("UAE Invoice Website Info:");
  console.log(JSON.stringify({
    _id: website._id,
    websiteName: website.websiteName,
    botEnabled: website.botEnabled,
    botFlow: website.botFlow
  }, null, 2));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
