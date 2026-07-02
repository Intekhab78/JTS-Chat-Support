import mongoose from "mongoose";

const documentVersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { _id: false });

const documentPermissionSchema = new mongoose.Schema({
  role: { type: String, required: true },
  access: { type: String, enum: ["read", "write"], default: "read" }
}, { _id: false });

const crmDocumentSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["contract", "gst", "pan", "proposal", "quotation", "invoice", "purchase_order", "nda", "image", "other"],
      default: "other",
      index: true
    },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    fileType: { type: String, default: "application/octet-stream" },
    folderPath: { type: String, default: "/", index: true },
    version: { type: Number, default: 1 },
    versionHistory: [documentVersionSchema],
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    permissions: [documentPermissionSchema]
  },
  { timestamps: true }
);

export const CrmDocument = mongoose.model("CrmDocument", crmDocumentSchema);
