import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Template name is required"], 
      trim: true 
    },
    subject: { 
      type: String, 
      required: [true, "Email subject line is required"], 
      trim: true 
    },
    htmlContent: { 
      type: String, 
      required: [true, "HTML layout content is required"] 
    },
    websiteId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Website", 
      required: [true, "Website scope configuration is required"] 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    }
  },
  { 
    timestamps: true 
  }
);

// Prevent duplicate template names inside the same website domain context
emailTemplateSchema.index({ websiteId: 1, name: 1 }, { unique: true });

export const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);
