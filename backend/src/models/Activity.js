import mongoose from "mongoose";

const activityParticipantSchema = new mongoose.Schema({
  participantId: { type: mongoose.Schema.Types.ObjectId, required: false },
  participantType: { type: String, enum: ["User", "Contact", "Customer", "external"], default: "external" },
  email: { type: String, trim: true }   // for external participants without a DB record
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
    status: { type: String, default: "pending", index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    dueDate: { type: Date, default: Date.now, index: true },
    endAt: { type: Date, default: null },
    timezone: { type: String, default: "Asia/Kolkata" },
    meetingType: { type: String, default: "zoom" },
    meetingLink: { type: String, trim: true, default: null },   // auto-generated join URL
    meetingRoomId: { type: String, trim: true, default: null }, // room ID portion
    reminderDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    outcomeNotes: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false, index: true },
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
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null, index: true },
    participantEmails: [{ type: String, trim: true }]  // simple email list for external attendees
  },
  { timestamps: true }
);

activitySchema.pre("validate", function(next) {
  if (this.activityAt && !this.dueDate) {
    this.dueDate = this.activityAt;
  } else if (this.dueDate && !this.activityAt) {
    this.activityAt = this.dueDate;
  }
  next();
});

export const Activity = mongoose.model("Activity", activitySchema);
