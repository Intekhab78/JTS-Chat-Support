import { Activity } from "../models/Activity.js";

export async function logCrmActivity({
  websiteId,
  type,
  title,
  description = "",
  duration = 0,
  ownerId = null,
  participants = [],
  customerId = null,
  contactId = null,
  companyId = null,
  dealId = null,
  ticketId = null,
  invoiceId = null,
  quoteId = null,
  attachments = []
}) {
  try {
    if (!websiteId) return null;
    
    const activity = await Activity.create({
      websiteId,
      type,
      title,
      description,
      duration,
      ownerId,
      participants,
      customerId,
      contactId,
      companyId,
      dealId,
      ticketId,
      invoiceId,
      quoteId,
      attachments
    });
    
    return activity;
  } catch (err) {
    console.error("[Activity Logger] Failed to create log:", err);
    return null;
  }
}
