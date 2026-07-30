import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jts_chat_db";

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected to Mongo");

  const customers = await mongoose.connection.db.collection("customers").find({}).limit(10).toArray();
  console.log("Total customers count:", await mongoose.connection.db.collection("customers").countDocuments());
  if (customers.length > 0) {
    console.log("Sample customer keys:", Object.keys(customers[0]));
    console.log("Sample customer data:", JSON.stringify(customers.slice(0, 3), null, 2));
  } else {
    console.log("No customers found in collection!");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
