import AppError from "./AppError.js";

export function assertWebsiteAccess(user, websiteIds, websiteId, message = "You do not have access to this website scope.") {
  if (!websiteId) return;
  if (user?.role === "admin") return;

  const requestedId = String(websiteId);
  const hasAccess = websiteIds.some((id) => String(id) === requestedId);
  if (!hasAccess) {
    throw new AppError(message, 403);
  }
}
