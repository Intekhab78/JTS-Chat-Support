import mongoose from "mongoose";

const dayHoursSchema = new mongoose.Schema({
  isOpen: { type: Boolean, default: true },
  open: { type: String, default: "09:00" },
  close: { type: String, default: "17:00" }
}, { _id: false });

const webhookSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  secret: { type: String, trim: true, default: "" },
  events: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true }
}, { _id: true });

const websiteSchema = new mongoose.Schema(
  {
    websiteName: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    primaryColor: { type: String, default: "#004e64" },
    accentColor: { type: String, default: "#00a5cf" },
    launcherIcon: { type: String, default: "💬" },
    welcomeMessage: { type: String, default: "Hi there! How can we help you today?" },
    position: { type: String, enum: ["left", "right"], default: "right" },

    isActive: { type: Boolean, default: true },
    businessHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: "Asia/Kolkata" },
      monday: { type: dayHoursSchema, default: () => ({}) },
      tuesday: { type: dayHoursSchema, default: () => ({}) },
      wednesday: { type: dayHoursSchema, default: () => ({}) },
      thursday: { type: dayHoursSchema, default: () => ({}) },
      friday: { type: dayHoursSchema, default: () => ({}) },
      saturday: { type: dayHoursSchema, default: () => ({ isOpen: false }) },
      sunday: { type: dayHoursSchema, default: () => ({ isOpen: false }) },
    },
    webhooks: [webhookSchema],
    botEnabled: { type: Boolean, default: true },
    enableChat: { type: Boolean, default: true },
    enableLeadGeneration: { type: Boolean, default: true },
    enableTicketing: { type: Boolean, default: true },
    enableKnowledgeBase: { type: Boolean, default: true },
    enableLiveAgent: { type: Boolean, default: true },
    enableAutomation: { type: Boolean, default: true },
    enabledModules: {
      type: [String],
      default: ["crm", "operations", "finance", "compliance", "service", "automation"]
    },
    botWelcomeMessage: { type: String, default: "Hi 👋 How can we help you today?" },
    pipelineStages: {
      type: [
        {
          key:    { type: String, required: true, trim: true },
          label:  { type: String, required: true, trim: true },
          color:  { type: String, default: "" },
          dot:    { type: String, default: "" },
          active: { type: Boolean, default: true }
        }
      ],
      default: undefined   // undefined means "not configured — use frontend defaults"
    },
    activeFlowId: { type: mongoose.Schema.Types.ObjectId, ref: "Flow", default: null },

    // ── Currency / Localisation ─────────────────────────────────────────────
    currencySettings: {
      currency:          { type: String, default: "Indian Rupee" },
      currencyCode:      { type: String, default: "INR" },
      currencySymbol:    { type: String, default: "₹" },
      symbolPosition:    { type: String, enum: ["before", "after"], default: "before" },
      decimalPlaces:     { type: Number, default: 2 },
      thousandSeparator: { type: String, default: "," },
      decimalSeparator:  { type: String, default: "." }
    }
  },
  { timestamps: true }
);

export const Website = mongoose.model("Website", websiteSchema);
