import mongoose from "mongoose";

const customFieldDefinitionSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    entityName: { type: String, enum: ["Lead", "Ticket", "Invoice"], required: true, index: true },
    fieldName: { type: String, required: true, trim: true },
    fieldType: { type: String, enum: ["text", "number", "boolean"], default: "text" },
    isRequired: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const CustomFieldDefinition = mongoose.model("CustomFieldDefinition", customFieldDefinitionSchema);
