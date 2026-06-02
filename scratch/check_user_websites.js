import mongoose from "mongoose";
import { User } from "../backend/src/models/User.js";
import { Website } from "../backend/src/models/Website.js";
import { getOwnedWebsiteIds } from "../backend/src/utils/roleUtils.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

async function checkUserWebsites() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ role: "sales" });
  if (user) {
    const ownedIds = await getOwnedWebsiteIds(user);
    const websites = await Website.find({ _id: { $in: ownedIds } }).select("websiteName domain");
    console.log(`User: ${user.name} (${user.role})`);
    console.log("Owned Websites:", websites.map(w => ({ id: w._id, name: w.websiteName })));
  } else {
    console.log("Sales user not found");
  }
  await mongoose.disconnect();
}

checkUserWebsites().catch(console.error);
