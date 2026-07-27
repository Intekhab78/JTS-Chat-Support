import mongoose from "mongoose";

const offlineSyncItemSchema = new mongoose.Schema({
  action: { type: String, required: true },
  payload: { type: Object, default: {} },
  status: { type: String, enum: ["queued", "synced", "failed"], default: "queued" },
  queuedAt: { type: Date, default: Date.now },
  syncedAt: { type: Date, default: null }
});

const mobileReadinessSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceInfo: {
      platform: { type: String, default: "Browser / PWA" },
      userAgent: { type: String, default: "" },
      isMobile: { type: Boolean, default: true },
      isPwaInstalled: { type: Boolean, default: true }
    },
    offlineSyncQueue: [offlineSyncItemSchema],
    mobileTelemetry: {
      pwaVersion: { type: String, default: "v1.0.0" },
      offlineCacheSizeMb: { type: Number, default: 14.5 },
      pushNotificationsEnabled: { type: Boolean, default: true },
      biometricsSupported: { type: Boolean, default: true },
      gpsEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export const MobileReadiness = mongoose.model("MobileReadiness", mobileReadinessSchema);
