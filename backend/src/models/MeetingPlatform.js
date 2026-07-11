import mongoose from "mongoose";

const meetingPlatformSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },          // "JTS Meet", "Zoom"
    key: { type: String, required: true, trim: true },            // "jts_meet", "zoom"
    icon: { type: String, default: "🎥" },                        // emoji
    color: { type: String, default: "#6366f1" },                  // brand color hex
    urlTemplate: { type: String, trim: true, default: "" },       // "https://meet.jts.com/{roomId}"
    description: { type: String, trim: true, default: "" },       // short description
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

// Compound index: one default per website
meetingPlatformSchema.index({ websiteId: 1, key: 1 }, { unique: true });

export const MeetingPlatform = mongoose.model("MeetingPlatform", meetingPlatformSchema);
