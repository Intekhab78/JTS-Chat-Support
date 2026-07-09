import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import { ChatSession } from "../models/ChatSession.js";
import { env } from "../config/env.js";

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log("Database connected.");

  const websiteId = "6a2d64d4dc4011615028ba2a";

  const totalCustomers = await Customer.countDocuments({ websiteId });
  console.log(`Total Customers in Website ${websiteId}: ${totalCustomers}`);

  const stages = await Customer.aggregate([
    { $match: { websiteId: new mongoose.Types.ObjectId(websiteId) } },
    { $group: { _id: "$pipelineStage", count: { $sum: 1 } } }
  ]);
  console.log("Pipeline stages breakdown:", stages);

  const tasksCount = await FollowUpTask.countDocuments({ websiteId });
  console.log(`Follow-up Tasks count: ${tasksCount}`);

  const activeSessions = await ChatSession.countDocuments({ websiteId });
  console.log(`Chat sessions count: ${activeSessions}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
