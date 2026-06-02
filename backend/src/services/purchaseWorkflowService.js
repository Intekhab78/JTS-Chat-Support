import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { createActivityEvent } from "./activityService.js";
import { createNotification } from "./notificationService.js";
import { getSocketServer } from "../sockets/index.js";

export const PURCHASE_WORKFLOW_STEPS = Object.freeze(["new", "in_review", "quotation_ready", "invoice_ready", "completed"]);

const LABELS = Object.freeze({
  new: "New",
  in_review: "In Review",
  quotation_ready: "Quotation Ready",
  invoice_ready: "Invoice Ready",
  completed: "Completed"
});

function labelFor(status) {
  return LABELS[status] || String(status || "Unknown").replaceAll("_", " ");
}

async function notifyPurchaseWorkflow({ customer, actor, fromStatus, toStatus, reason }) {
  const recipientIds = new Set();
  if (customer.ownerId) recipientIds.add(String(customer.ownerId));

  const website = await Website.findById(customer.websiteId).select("managerId");
  if (website?.managerId) recipientIds.add(String(website.managerId));

  const relatedUsers = await User.find({
    role: { $in: ["manager", "accounts"] },
    $or: [
      { websiteIds: customer.websiteId },
      ...(website?.managerId ? [{ managerId: website.managerId }] : [])
    ]
  }).select("_id");

  relatedUsers.forEach((user) => recipientIds.add(String(user._id)));
  if (actor?._id) recipientIds.delete(String(actor._id));

  const io = getSocketServer();
  await Promise.all([...recipientIds].map(async (recipient) => {
    const notification = await createNotification({
      recipient,
      type: "activity_alert",
      title: "Purchase workflow updated",
      message: `${customer.name || customer.companyName || customer.crn} moved to ${labelFor(toStatus)}.`,
      link: "/purchase?tab=requests",
      actor,
      entityType: "customer",
      entityId: customer._id,
      metadata: { fromStatus, toStatus, reason }
    });

    if (notification && io) {
      io.to(`us_${recipient}`).emit("notification:new", notification);
    }
  }));
}

export async function advancePurchaseWorkflow({
  customerId,
  status,
  actor = null,
  reason = "manual_update",
  allowSame = false,
  notify = true
}) {
  if (!PURCHASE_WORKFLOW_STEPS.includes(status)) return null;

  const customer = await Customer.findById(customerId);
  if (!customer) return null;

  const fromStatus = customer.purchaseWorkflowStatus || "new";
  const currentIndex = PURCHASE_WORKFLOW_STEPS.indexOf(fromStatus);
  const nextIndex = PURCHASE_WORKFLOW_STEPS.indexOf(status);
  if (nextIndex < currentIndex || (!allowSame && nextIndex === currentIndex)) {
    return customer;
  }

  customer.purchaseWorkflowStatus = status;
  customer.purchaseUpdatedAt = new Date();
  if (status === "completed") {
    customer.purchaseCompletedAt = customer.purchaseCompletedAt || new Date();
  }
  await customer.save();

  await createActivityEvent({
    actor,
    websiteId: customer.websiteId,
    entityType: "customer",
    entityId: customer._id,
    type: "status_changed",
    summary: `Purchase workflow moved to ${labelFor(status)}`,
    metadata: {
      workflow: "purchase",
      fromStatus,
      toStatus: status,
      reason
    }
  });

  if (notify) {
    await notifyPurchaseWorkflow({ customer, actor, fromStatus, toStatus: status, reason });
  }

  return customer;
}
