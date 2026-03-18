import { ChevronLeft, ChevronRight } from "lucide-react";

function SectionPager({ page, setPage, totalItems, itemsPerPage = 4 }) {
  const hasPrev = page > 0;
  const hasNext = (page + 1) * itemsPerPage < totalItems;

  if (totalItems <= itemsPerPage) return null;

  return (
    <div className="flex justify-center items-center gap-3 mt-4">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(p - 1, 0))}
        disabled={!hasPrev}
        className={`px-3 py-1 rounded border transition ${
          !hasPrev
            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            : "bg-white hover:bg-neutral-50 text-brown border-[#E7DFCF]"
        }`}
      >
        <ChevronLeft size={16} />
      </button>

      <span className="text-sm text-neutral-500">
        Page {page + 1} of {Math.ceil(totalItems / itemsPerPage)}
      </span>

      <button
        type="button"
        onClick={() => setPage((p) => (hasNext ? p + 1 : p))}
        disabled={!hasNext}
        className={`px-3 py-1 rounded border transition ${
          !hasNext
            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            : "bg-white hover:bg-neutral-50 text-brown border-[#E7DFCF]"
        }`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
export default SectionPager;