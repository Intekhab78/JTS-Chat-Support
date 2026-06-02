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
    const item = await InventoryItem.findById(itemId).populate("websiteId");
    if (!item || !item.preferredSupplierId) return null;

    // Check if there's already a draft PO for this supplier and website
    // to avoid creating 50 draft POs if multiple items go low.
    // Or we could append to an existing draft. 
    // For now, let's create a specific "Low Stock Replenishment" draft.
    
    let draftPo = await PurchaseOrder.findOne({
      supplierId: item.preferredSupplierId,
      websiteId: item.websiteId,
      status: "draft",
      notes: /Auto-Replenishment/i
    });

    const qty = quantityRequested || (item.reorderLevel * 2); // Rule of thumb: order 2x reorder level
    const lineTotal = item.unitCost * qty;

    if (draftPo) {
      // Check if item already in draft
      const itemExists = draftPo.items.find(i => i.itemId.toString() === itemId.toString());
      if (!itemExists) {
        draftPo.items.push({
          itemId: item._id,
          description: item.name,
          quantity: qty,
          unitPrice: item.unitCost,
          total: lineTotal
        });
        draftPo.total += lineTotal;
        draftPo.subtotal += lineTotal;
        await draftPo.save();
      }
    } else {
      // Create new draft
      const count = await PurchaseOrder.countDocuments();
      const poNumber = `PO-AUTO-${(count + 1).toString().padStart(4, '0')}`;
      
      draftPo = await PurchaseOrder.create({
        poNumber,
        supplierId: item.preferredSupplierId,
        websiteId: item.websiteId,
        items: [{
          itemId: item._id,
          description: item.name,
          quantity: qty,
          unitPrice: item.unitCost,
          total: lineTotal
        }],
        subtotal: lineTotal,
        total: lineTotal,
        status: "draft",
        notes: "Auto-Replenishment: Generated due to low stock alert.",
        createdBy: item.websiteId.managerId // Default to website manager
      });
    }

    return draftPo;
  } catch (error) {
    console.error("Failed to create draft PO:", error);
    return null;
  }
}
