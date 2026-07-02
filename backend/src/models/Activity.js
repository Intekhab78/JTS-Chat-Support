import mongoose from "mongoose";

const activityParticipantSchema = new mongoose.Schema({
  participantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  participantType: { type: String, enum: ["User", "Contact", "Customer"], required: true }
}, { _id: false });

const activitySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    type: {
      type: String,
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    activityAt: { type: Date, default: Date.now, index: true },
    duration: { type: Number, default: 0 }, // in minutes
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    participants: [activityParticipantSchema],
    status: { type: String, default: "completed", index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    attachments: [{
      filename: { type: String, trim: true },
      url: { type: String, trim: true }
    }],
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", default: null, index: true },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null, index: true }
  },
  { timestamps: true }
);

export const Activity = mongoose.model("Activity", activitySchema);
