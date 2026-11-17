export function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeUpdatePayload(body = {}) {
  if (!body || typeof body !== "object") return {};
  const cleaned = { ...body };
  delete cleaned._id;
  delete cleaned.id;
  delete cleaned.websiteId;
  delete cleaned.organizationId;
  delete cleaned.ownerId;
  delete cleaned.createdBy;
  delete cleaned.__v;
  return cleaned;
}
