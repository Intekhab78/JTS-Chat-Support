import mongoose from "mongoose";

const formSubmissionSchema = new mongoose.Schema(
  {
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: "LowCodeStudioPage", required: true, index: true },
    pageName: { type: String, required: true },
    answers: { type: Object, default: {} },
    submitterIp: { type: String, default: "" },
    submitterUserAgent: { type: String, default: "" },
    associatedCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    associatedTicketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null, index: true },
    conversionStatus: {
      type: String,
      enum: ["saved", "lead_created", "ticket_created", "processed"],
      default: "saved",
      index: true
    }
  },
  { timestamps: true }
);

export const FormSubmission = mongoose.model("FormSubmission", formSubmissionSchema);
