import mongoose from "mongoose";

const documentVersionSchema = new mongoose.Schema({
  versionNumber: {
    type: Number,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: ""
  },
  fileSize: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  changeNotes: {
    type: String,
    default: ""
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const customerDocumentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  documentName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      "Trade License", "VAT Certificate", "Corporate Tax Certificate", "TRN Certificate",
      "Passport", "Emirates ID", "Visa", "MOA", "POA", "Invoice", "Receipt",
      "Government Letter", "Compliance Report", "Bank Document", "Other"
    ],
    default: "Other",
    index: true
  },
  description: {
    type: String,
    default: ""
  },
  fileUrl: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: ""
  },
  fileSize: {
    type: Number,
    default: 0
  },
  versionNumber: {
    type: Number,
    default: 1
  },
  versionHistory: [documentVersionSchema],
  status: {
    type: String,
    enum: ["Pending Verification", "Verified", "Rejected", "Expired", "Archived"],
    default: "Verified",
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Website",
    required: true,
    index: true
  },
  archivedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export const CustomerDocument = mongoose.model("CustomerDocument", customerDocumentSchema);
