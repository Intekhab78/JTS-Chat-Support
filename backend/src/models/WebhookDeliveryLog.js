import mongoose from "mongoose";

const webhookDeliveryLogSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    eventName: { type: String, required: true, index: true },
    url: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed"], default: "sent", index: true },
    httpStatus: { type: Number },
    latencyMs: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const WebhookDeliveryLog = mongoose.model("WebhookDeliveryLog", webhookDeliveryLogSchema);
