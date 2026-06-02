export const PAGE_SIZE = 10;

export function getPaginationMeta(items = [], currentPage = 1, pageSize = PAGE_SIZE) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    currentPage: safePage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    pageItems: items.slice(startIndex, endIndex)
  };
}
