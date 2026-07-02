import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "revoked"], default: "active", index: true },
    rateLimitLimit: { type: Number, default: 1000 } // requests per hour limit
  },
  { timestamps: true }
);

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
