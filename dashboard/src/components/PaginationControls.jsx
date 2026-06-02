export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  itemLabel = "records",
  onPageChange
}) {
  if (totalPages <= 1) return null;

  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        Showing {start}-{end} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 hover:bg-white disabled:opacity-30 transition-all"
        >
          Previous
        </button>
        <div className="px-4 py-2.5 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.18em]">
          {currentPage} / {totalPages}
        </div>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black hover:bg-indigo-700 disabled:opacity-30 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
