import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["in", "out", "adjust"],
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousQuantity: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    reference: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ websiteId: 1, createdAt: -1 });
inventoryMovementSchema.index({ itemId: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model("InventoryMovement", inventoryMovementSchema);
