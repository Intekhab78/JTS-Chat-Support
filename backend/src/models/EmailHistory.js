import mongoose from "mongoose";

const emailHistorySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    direction: { type: String, enum: ["incoming", "outgoing"], default: "outgoing", index: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "sent", "delivered", "opened", "clicked", "bounced"],
      default: "sent",
      index: true
    },
    sentAt: { type: Date, default: Date.now },
    attachments: [{
      filename: { type: String, trim: true },
      url: { type: String, trim: true }
    }],
    templateName: { type: String, trim: true, default: "" },
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "EmailHistory" }]
  },
  { timestamps: true }
);

export const EmailHistory = mongoose.model("EmailHistory", emailHistorySchema);
