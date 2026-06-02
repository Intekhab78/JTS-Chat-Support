import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Supplier } from "../models/Supplier.js";

/**
 * Reconcile a Purchase Order against an uploaded invoice
 */
export async function reconcilePO(poId, invoiceAmount, userId) {
  try {
    const po = await PurchaseOrder.findById(poId);
    if (!po) return null;

    let status = "matched";
    let mismatchReason = "";

    // Allow a small tolerance (e.g., 0.01 for rounding)
    const difference = Math.abs(po.total - invoiceAmount);
    if (difference > 0.5) {
      status = "mismatch";
      mismatchReason = `Price mismatch: PO Total ${po.total} vs Invoice Amount ${invoiceAmount}`;
    }

    po.reconciliation = {
      status,
      invoiceAmount,
      mismatchReason,
      reconciledAt: new Date(),
      reconciledBy: userId
    };

    await po.save();
    console.log(`[Reconciliation] PO #${po.poNumber} result: ${status}`);
    return po;
  } catch (error) {
    console.error("[Reconciliation] Error:", error);
    return null;
  }
}

/**
 * Calculate and update performance metrics for a supplier
 */
export async function updateSupplierPerformance(supplierId) {
  try {
    // Find all completed (delivered) orders for this supplier
    const orders = await PurchaseOrder.find({ 
      supplierId, 
      status: "delivered",
      sentAt: { $ne: null },
      receivedAt: { $ne: null }
    });

    if (orders.length === 0) return;

    let totalLeadTimeHours = 0;
    let onTimeOrders = 0;
    let fulfilledOrders = 0;

    for (const order of orders) {
      // 1. Lead Time
      const leadTimeMs = new Date(order.receivedAt) - new Date(order.sentAt);
      totalLeadTimeHours += leadTimeMs / (1000 * 60 * 60);

      // 2. On-Time Delivery
      if (order.expectedDeliveryDate && new Date(order.receivedAt) <= new Date(order.expectedDeliveryDate)) {
        onTimeOrders++;
      }

      // 3. Fulfillment (in this simple version, delivered means fulfilled)
      fulfilledOrders++;
    }

    const avgLeadTimeHours = totalLeadTimeHours / orders.length;
    const onTimeDeliveryRate = (onTimeOrders / orders.length) * 100;
    const fulfillmentRate = 100; // Simplified

    // Calculate overall rating (0-100)
    // Weight: 60% On-time, 40% Lead Time (relative to a 7-day benchmark)
    const leadTimeScore = Math.max(0, 100 - (avgLeadTimeHours / 168) * 50); // 168h = 1 week
    const rating = Math.round((onTimeDeliveryRate * 0.6) + (leadTimeScore * 0.4));

    await Supplier.findByIdAndUpdate(supplierId, {
      performanceMetrics: {
        avgLeadTimeHours,
        fulfillmentRate,
        onTimeDeliveryRate,
        totalOrdersCompleted: orders.length
      },
      rating
    });

    console.log(`[Performance] Supplier ${supplierId} rating updated: ${rating}`);
  } catch (error) {
    console.error("[Performance] Error updating metrics:", error);
  }
}

/**
 * Add an entry to the PO history
 */
export async function addPOHistory(po, status, userId, note = "") {
  po.history.push({
    status,
    updatedAt: new Date(),
    updatedBy: userId,
    note
  });

  // Update convenience timestamps
  if (status === "sent") po.sentAt = new Date();
  if (status === "accepted") po.acceptedAt = new Date();
  if (status === "shipped") po.shippedAt = new Date();
  if (status === "delivered") po.receivedAt = new Date();

  return po;
}
