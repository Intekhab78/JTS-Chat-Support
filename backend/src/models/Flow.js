import mongoose from "mongoose";

const flowSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    isPublished: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    
    // The nodes object contains the entire flow graph as a dictionary.
    // Example: { "root": { type: "message", message: "Hi", next: "node_2" }, ... }
    // Node Types: message, question, button_group, form, condition, action, ticket, lead, knowledge_base
    nodes: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        root: {
          type: "message",
          message: "Hi 👋 How can we help you today?",
          next: null
        }
      }
    },
    
    // Analytics specific to this flow
    stats: {
      started: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      dropped: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export const Flow = mongoose.model("Flow", flowSchema);
