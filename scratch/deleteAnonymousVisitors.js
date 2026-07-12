import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

const rootDir = process.cwd(); // E:\Chat Support
dotenv.config({ path: path.join(rootDir, "backend/.env") });

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jts-chat";

// Import model dynamically using absolute file URL
const modelPath = "file:///" + path.join(rootDir, "backend/src/models/Customer.js").replace(/\\/g, "/");
const { Customer } = await import(modelPath);

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, { family: 4 });
    console.log("Connected successfully!");

    console.log("Searching for Anonymous Visitors in Customer collection...");
    const result = await Customer.deleteMany({
      name: { $regex: /^Anonymous Visitor$/i }
    });

    console.log(`✅ Success! Deleted ${result.deletedCount} Anonymous Visitor record(s) from database.`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

run();
