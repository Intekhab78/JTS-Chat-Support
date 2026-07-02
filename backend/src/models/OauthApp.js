import mongoose from "mongoose";

const oauthAppSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    clientId: { type: String, required: true, unique: true, index: true },
    clientSecret: { type: String, required: true },
    redirectUri: { type: String, required: true },
    scopes: [{ type: String }] // e.g. ["crm:read", "crm:write"]
  },
  { timestamps: true }
);

export const OauthApp = mongoose.model("OauthApp", oauthAppSchema);
