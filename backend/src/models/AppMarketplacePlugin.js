import mongoose from "mongoose";

const manifestSchema = new mongoose.Schema({
  permissions: [{ type: String }],
  apiHooks: [{ type: String }],
  uiHooks: [{ type: String }]
});

const pluginHealthSchema = new mongoose.Schema({
  status: { type: String, enum: ["healthy", "warning", "error"], default: "healthy" },
  memoryUsageMb: { type: Number, default: 8.5 },
  uptimePercent: { type: Number, default: 99.98 }
});

const appMarketplacePluginSchema = new mongoose.Schema(
  {
    pluginKey: { type: String, required: true, trim: true, unique: true, index: true },
    pluginName: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["crm_extensions", "dashboard_widgets", "reports", "ai_plugins", "payment_plugins", "communication", "storage", "analytics", "compliance"],
      default: "crm_extensions",
      index: true
    },
    version: { type: String, default: "1.0.0" },
    author: { type: String, default: "JTS Enterprise Labs" },
    rating: { type: Number, default: 4.9 },
    downloadsCount: { type: Number, default: 1250 },
    isInstalled: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: false, index: true },
    manifest: { type: manifestSchema, default: () => ({ permissions: ["CRM_READ"], apiHooks: ["ON_CUSTOMER_CREATE"], uiHooks: ["DASHBOARD_WIDGET"] }) },
    health: { type: pluginHealthSchema, default: () => ({ status: "healthy", memoryUsageMb: 8.5, uptimePercent: 99.98 }) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const AppMarketplacePlugin = mongoose.model("AppMarketplacePlugin", appMarketplacePluginSchema);
