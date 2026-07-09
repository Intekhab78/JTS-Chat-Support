import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  console.log("Connected");
  const count = await mongoose.connection.db.collection("customers").countDocuments({});
  console.log("Total customers:", count);
  process.exit(0);
}

run().catch(console.error);
