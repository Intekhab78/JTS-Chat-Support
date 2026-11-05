import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Supplier } from "../models/Supplier.js";
import { Website } from "../models/Website.js";
import { createNotification } from "./notificationService.js";

/**
 * Automatically creates a Draft Purchase Order when an item hits low stock.
 */
export async function createDraftFromLowStock(itemId, quantityRequested = null) {
  try {
    const item = await InventoryItem.findOne({ _id: itemId, isDeleted: { $ne: true } }).populate("websiteId");
    if (!item || !item.preferredSupplierId) return null;

    let draftPo = await PurchaseOrder.findOne({
      supplierId: item.preferredSupplierId,
      websiteId: item.websiteId?._id || item.websiteId,
      status: "draft",
      notes: /Auto-Replenishment/i
    });

    const qty = Math.max(1, Number(quantityRequested) || (Number(item.reorderLevel || 5) * 2));
    const unitCost = Number(item.unitCost || 0);
    const lineTotal = unitCost * qty;

    if (draftPo) {
      // Check if item already in draft
      const itemExists = draftPo.items.find(i => i.itemId && i.itemId.toString() === itemId.toString());
      if (!itemExists) {
        draftPo.items.push({
          itemId: item._id,
          description: item.name,
          quantity: qty,
          unitPrice: unitCost,
          total: lineTotal
        });
        draftPo.total = Number(draftPo.total || 0) + lineTotal;
        draftPo.subtotal = Number(draftPo.subtotal || 0) + lineTotal;
        await draftPo.save();
      }
    } else {
      // Create new collision-safe draft
      const poNumber = `PO-AUTO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      
      draftPo = await PurchaseOrder.create({
        poNumber,
        supplierId: item.preferredSupplierId,
        websiteId: item.websiteId?._id || item.websiteId,
        items: [{
          itemId: item._id,
          description: item.name,
          quantity: qty,
          unitPrice: unitCost,
          total: lineTotal
        }],
        subtotal: lineTotal,
        total: lineTotal,
        status: "draft",
        notes: "Auto-Replenishment: Generated due to low stock alert.",
        createdBy: item.websiteId?.managerId || null
      });
    }

    return draftPo;
  } catch (error) {
    console.error("Failed to create draft PO:", error);
    return null;
  }
}
