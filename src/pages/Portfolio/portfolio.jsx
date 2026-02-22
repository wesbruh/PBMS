import { useMemo, useState, useEffect } from "react";

const ITEMS = [
  // Couples & Engagements
  { id: 1, category: "Couples & Engagements", src: "/images/couples1.jpg" },
  { id: 2, category: "Couples & Engagements", src: "/images/couples2.jpg" },
  { id: 3, category: "Couples & Engagements", src: "/images/couples3.jpg" },
  { id: 4, category: "Couples & Engagements", src: "/images/couples4.jpg" },
  { id: 5, category: "Couples & Engagements", src: "/images/couples5.jpg" },
  { id: 6, category: "Couples & Engagements", src: "/images/Portfolio4.jpg" },
  { id: 7, category: "Couples & Engagements", src: "/images/Portfolio10.jpg" },
  { id: 8, category: "Couples & Engagements", src: "/images/temp_cb.jpg" },


  // Weddings & Elopements
  { id: 10, category: "Weddings & Elopements", src: "/images/Weddinghands.jpg" },
  { id: 11, category: "Weddings & Elopements", src: "/images/Weddings1.jpeg" },
  { id: 12, category: "Weddings & Elopements", src: "/images/Weddings2.jpg" },
  { id: 13, category: "Weddings & Elopements", src: "/images/Weddings3.jpg" },
  { id: 13, category: "Weddings & Elopements", src: "/images/Weddings4.jpg" },
  { id: 14, category: "Weddings & Elopements", src: "/images/Weddings5.jpg" },
  { id: 15, category: "Weddings & Elopements", src: "/images/Weddings6.jpg" },
  { id: 16, category: "Weddings & Elopements", src: "/images/Weddings7.jpg" },

  // Maternity
  { id: 20, category: "Maternity", src: "/images/Maternity1.jpg" },
  { id: 21, category: "Maternity", src: "/images/Maternity2.jpg" },
  { id: 20, category: "Maternity", src: "/images/Maternity3.jpg" },
  { id: 21, category: "Maternity", src: "/images/Maternity4.jpg" },
  { id: 22, category: "Maternity", src: "/images/Maternity5.jpg" },
  { id: 22, category: "Maternity", src: "/images/Maternity6.jpg" },
  { id: 21, category: "Maternity", src: "/images/temp_scan.jpg" },
  { id: 22, category: "Maternity", src: "/images/temp_MB.jpg" },

  // Lifestyle
  { id: 30, category: "Lifestyle", src: "/images/temp_tr.jpg" },
  { id: 31, category: "Lifestyle", src: "/images/temp_b.jpg" },
  { id: 32, category: "Lifestyle", src: "/images/temp_champagne.jpg" },
  { id: 33, category: "Lifestyle", src: "/images/temp_lp.jpg" },
  { id: 34, category: "Lifestyle", src: "/images/Portfolio9.jpg" },
  { id: 35, category: "Lifestyle", src: "/images/Gradpic.jpg" },
  { id: 36, category: "Lifestyle", src: "/images/Lifestyle.jpg" },
  { id: 37, category: "Lifestyle", src: "/images/Lifestyle2.jpg" },


];

const CATEGORY_TILES = {
  "Couples & Engagements": {
    title: "Couples & Engagements",
    src: "/images/couples2.jpg",
  },
  "Weddings & Elopements": {
    title: "Weddings & Elopements",
    src: "/images/Weddinghands.jpg",
  },
  Maternity: {
    title: "Maternity",
    src: "/images/Maternity1.jpg",
  },
  Lifestyle: {
    title: "Lifestyle",
    src: "/images/Lifestyle3.jpg",
  },
};

export default function Portfolio() {
  // which category is currently open (null = overview)
  const [openCategory, setOpenCategory] = useState(null);

  // lightbox index in visibleItems
  const [selectedIndex, setSelectedIndex] = useState(null);

  // show items only for openCategory
  const visibleItems = useMemo(() => {
    if (!openCategory) return [];
    return ITEMS.filter((i) => i.category === openCategory);
  }, [openCategory]);

  const selectedItem = selectedIndex !== null ? visibleItems[selectedIndex] : null;

  // keyboard navigation for lightbox
  useEffect(() => {
    function onKey(e) {
      if (selectedIndex === null) return;
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowLeft") {
        setSelectedIndex((s) =>
          s === null ? null : (s - 1 + visibleItems.length) % visibleItems.length
        );
      }
      if (e.key === "ArrowRight") {
        setSelectedIndex((s) =>
          s === null ? null : (s + 1) % visibleItems.length
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, visibleItems.length]);

  function openCategoryGallery(category) {
    setOpenCategory(category);
    setSelectedIndex(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeCategoryGallery() {
    setOpenCategory(null);
    setSelectedIndex(null);
  }

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-semibold">Portfolio</h1>
        <p className="mt-2 text-gray-600">
          A curated selection of my work across different session types.
        </p>
      </div>

      {/* Overview (big category tiles) */}
      {!openCategory && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.keys(CATEGORY_TILES).map((cat) => {
            const tile = CATEGORY_TILES[cat];
            if (!tile) return null;

            return (
              <div
                key={cat}
                className="relative rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => openCategoryGallery(cat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && openCategoryGallery(cat)}
              >
                {/* Image with soft blur + zoom on hover */}
                <img
                  src={tile.src}
                  alt={tile.title}
                  className="w-full h-[420px] object-cover transition-all duration-300 group-hover:scale-105 group-hover:blur-[2px]"
                  loading="lazy"
                />

                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-colors duration-300" />

                {/* Title fades in on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-white text-2xl md:text-3xl font-semibold text-center px-4">
                    {tile.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gallery view (openCategory is set) */}
      {openCategory && (
        <>
          <div className="mt-8 flex items-center justify-between">
            <div>
              <button
                onClick={closeCategoryGallery}
                className="px-3 py-1 border rounded text-sm mr-3"
              >
                ← Back
              </button>
              <span className="text-lg font-semibold">{openCategory}</span>
              <span className="text-sm text-gray-600 ml-3">
                — {visibleItems.length} photos
              </span>
            </div>
          </div>

          {/* Grid of images for that category */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(idx)}
                className="group rounded overflow-hidden"
              >
                <img
                  src={item.src}
                  alt={item.category}
                  className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105 rounded"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Lightbox */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedItem.src}
              alt={selectedItem.category}
              className="w-full max-h-[80vh] object-contain rounded"
            />

            {/* Prev/Next */}
            {visibleItems.length > 1 && (
              <div className="mt-4 flex justify-between text-white">
                <button
                  onClick={() =>
                    setSelectedIndex((s) => (s === 0 ? visibleItems.length - 1 : s - 1))
                  }
                  className="px-4 py-2 border border-white/40 rounded hover:bg-white/10"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setSelectedIndex((s) => (s === null ? null : (s + 1) % visibleItems.length))
                  }
                  className="px-4 py-2 border border-white/40 rounded hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            )}

            <div className="text-center text-white/70 text-xs mt-3">
              Press ← / → to navigate • Esc to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}