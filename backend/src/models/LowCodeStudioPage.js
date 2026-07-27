import mongoose from "mongoose";

const studioComponentSchema = new mongoose.Schema({
  componentType: {
    type: String,
    enum: ["text", "input", "select", "checkbox", "date", "table", "chart", "kanban", "calendar", "maps", "rich_text", "file_upload"],
    required: true
  },
  label: { type: String, required: true },
  props: { type: Object, default: {} }
});

const lowCodeStudioPageSchema = new mongoose.Schema(
  {
    pageName: { type: String, required: true, trim: true },
    pageType: {
      type: String,
      enum: ["form", "dashboard", "report", "page", "kanban"],
      default: "dashboard",
      index: true
    },
    layoutComponents: [studioComponentSchema],
    themeConfig: {
      primaryColor: { type: String, default: "#4f46e5" },
      darkMode: { type: Boolean, default: false },
      fontFamily: { type: String, default: "Inter, sans-serif" }
    },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const LowCodeStudioPage = mongoose.model("LowCodeStudioPage", lowCodeStudioPageSchema);
