import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      await mongoose.connect(env.mongoUri, {
        family: 4,
        serverSelectionTimeoutMS: 8000
      });
      logger.log("MongoDB connected");
      return;
    } catch (error) {
      if (attempt < maxRetries) {
        logger.log(`MongoDB connection attempt ${attempt} failed (${error.message}). Retrying in 1.5s...`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

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
        logger.log("Database connection failed. Attempting local fallback...");
        try {
          await mongoose.connect(process.env.LOCAL_MONGODB_URI || "mongodb://127.0.0.1:27018/chat-support", {
            family: 4,
            serverSelectionTimeoutMS: 5000
          });
          logger.log("MongoDB connected via Local Fallback");
          return;
        } catch (fallbackError) {
          throw new Error(
            `MongoDB connection failed: ${error.message}. Please verify your MongoDB service is running.`
          );
        }
      }

      throw error;
    }
  }
}

