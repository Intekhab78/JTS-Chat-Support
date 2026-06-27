export function buildArticleSlug(title = "") {
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeArticleTags(tags = []) {
  if (typeof tags === "string") {
    tags = tags.split(",");
  }

  if (!Array.isArray(tags)) return [];

  return [...new Set(
    tags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .slice(0, 20)
  )];
}

export function buildArticleSort(sort = "-updatedAt") {
  const allowedSorts = new Set(["createdAt", "-createdAt", "updatedAt", "-updatedAt", "title", "-title", "views", "-views"]);
  return allowedSorts.has(sort) ? sort : "-updatedAt";
}
