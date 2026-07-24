import mongoose from "mongoose";

const cannedResponseSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", default: null, index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    shortcut: { type: String, required: true, trim: true },
    text: { type: String, trim: true, default: "" },
    content: { type: String, trim: true, default: "" },
    title: { type: String, default: "" },
    category: { type: String, default: "general", index: true },
    visibility: { type: String, enum: ["shared", "personal"], default: "shared" },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

// Synchronize text & content before saving so both fields are always populated
cannedResponseSchema.pre("save", function (next) {
  if (!this.content && this.text) {
    this.content = this.text;
  } else if (!this.text && this.content) {
    this.text = this.content;
  }
  next();
});

cannedResponseSchema.index({ managerId: 1, shortcut: 1 });

export const CannedResponse = mongoose.model("CannedResponse", cannedResponseSchema);

// Auto-drop legacy unique index websiteId_1_shortcut_1 if present in MongoDB collection
const dropLegacyIndex = async () => {
  try {
    await CannedResponse.collection.dropIndex("websiteId_1_shortcut_1");
    console.log("[CannedResponse] Successfully dropped legacy index websiteId_1_shortcut_1");
  } catch (err) {
    // Index doesn't exist or already dropped
  }
};

if (mongoose.connection.readyState === 1) {
  dropLegacyIndex();
} else {
  mongoose.connection.on("connected", dropLegacyIndex);
}
