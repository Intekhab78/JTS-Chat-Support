import mongoose from "mongoose";

const customFieldSchema = new mongoose.Schema({
  fieldKey: { type: String, required: true, trim: true },
  fieldName: { type: String, required: true, trim: true },
  fieldType: { type: String, enum: ["text", "number", "date", "select", "boolean", "relation"], required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }]
});

const customRecordSchema = new mongoose.Schema({
  recordData: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

const customCrmModuleSchema = new mongoose.Schema(
  {
    moduleKey: { type: String, required: true, trim: true, unique: true, index: true },
    moduleName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    fields: [customFieldSchema],
    records: [customRecordSchema],
    apiEndpoint: { type: String, required: true },
    isMenuEnabled: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const CustomCrmModule = mongoose.model("CustomCrmModule", customCrmModuleSchema);
