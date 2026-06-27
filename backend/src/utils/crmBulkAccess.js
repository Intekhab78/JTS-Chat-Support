import mongoose from "mongoose";

const UNAUTHORIZED_TENANT_RESPONSE = {
  success: false,
  message: "Unauthorized tenant access."
};

export function sendUnauthorizedTenant(res) {
  return res.status(403).json(UNAUTHORIZED_TENANT_RESPONSE);
}

export function normalizeBulkCustomerIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "At least one customer ID is required." };
  }

  const normalizedIds = ids.map((id) => String(id || "").trim()).filter(Boolean);
  if (normalizedIds.length !== ids.length || normalizedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    return { error: "Invalid customer ID." };
  }

  const uniqueIds = [...new Set(normalizedIds)];
  if (uniqueIds.length !== normalizedIds.length) {
    return { error: "Duplicate customer IDs are not allowed." };
  }

  return { ids: uniqueIds };
}

export function buildTenantScopedCustomerFilter(customerIds, websiteIds, extra = {}) {
  return {
    _id: { $in: customerIds },
    websiteId: { $in: websiteIds },
    ...extra
  };
}
