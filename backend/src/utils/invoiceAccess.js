import AppError from "./AppError.js";

export function toWebsiteIdStrings(websiteIds = []) {
  return (Array.isArray(websiteIds) ? websiteIds : []).filter(Boolean).map((id) => String(id));
}

export function buildInvoiceTenantFilter(invoiceId, websiteIds = []) {
  return {
    _id: invoiceId,
    websiteId: { $in: websiteIds }
  };
}

export function assertSameWebsite(leftWebsiteId, rightWebsiteId, message = "Access denied") {
  if (String(leftWebsiteId) !== String(rightWebsiteId)) {
    throw new AppError(message, 403);
  }
}
