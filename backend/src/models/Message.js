import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true },
    sender: { type: String, enum: ["visitor", "agent", "system"], required: true },
    message: { type: String, trim: true, default: "" },
    attachmentUrl: { type: String, default: null },
    attachmentType: { type: String, enum: ["image", "pdf", "file", null], default: null },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    channel: { type: String, default: "chat" },
    deliveryStatus: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
      index: true
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    providerMessageId: { type: String, index: true, default: null },

    // Multilingual Translation Engine
    translatedText: { type: String, default: "" },
    detectedLanguage: { type: String, default: "en" },
    detectedLanguageName: { type: String, default: "English" },
    flagSymbol: { type: String, default: "🇬🇧" }
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
