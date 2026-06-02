import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri, {
      family: 4,
      serverSelectionTimeoutMS: 10000
    });
    logger.log("MongoDB connected");
  } catch (error) {
    const nestedMessage = [
      error?.message,
      error?.cause?.message,
      error?.reason?.servers ? Array.from(error.reason.servers.values()).map((server) => server?.error?.message).join(" | ") : ""
    ]
      .filter(Boolean)
      .join(" | ");

    if (nestedMessage.includes("ENOTFOUND")) {
      throw new Error(
        "MongoDB host lookup failed. Your Atlas hostname or DNS resolution is incorrect. Use the mongodb+srv connection string from Atlas, or verify the cluster hostnames in MONGODB_URI."
      );
    }

    if (nestedMessage.includes("ETIMEOUT") || nestedMessage.includes("querySrv")) {
      throw new Error(
        "MongoDB DNS lookup timed out. Check your internet/DNS settings, or try a different network before starting the server again."
      );
    }

    if (error?.name === "MongooseServerSelectionError") {
      throw new Error(
        "MongoDB Atlas is reachable, but this machine is not allowed to connect. Add your current IP to Atlas Network Access or temporarily allow 0.0.0.0/0 for local development."
      );
    }

    throw error;
  }
}
