// src/admin/pages/Offerings/OfferingsPage.jsx
//
// Admin view that mirrors the user booking experience:
// Step 1: Show category cards (masters only) in a grid
// Step 2: When category clicked, expand to show all packages in that category
// - All packages are clickable to edit
// - Packages have delete buttons on hover

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import { Plus } from "lucide-react";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import SessionTypeCard from "../../../components/SessionTypeCard/SessionTypeCard.jsx";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "session-images";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export default function OfferingsPage() {
  const navigate = useNavigate();
  const [allSessionTypes, setAllSessionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  
  // Track which category is currently selected/expanded
  const [selectedCategory, setSelectedCategory] = useState(null);

  // ── Load all session types ────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("SessionType")
        .select("*")
        .order("display_order", { ascending: true })
        .order("name",          { ascending: true });

      if (e) throw e;
      setAllSessionTypes(data ?? []);
    } catch (e) {
      setError(e.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── Group by category ─────────────────────────────────────────────────────
  // masters: all is_master=true rows (shown as category cards)
  // childrenByCategory: all non-master rows grouped by category name
  const { masters, childrenByCategory } = (() => {
    const mastersList = allSessionTypes.filter((st) => st.is_master);
    const childMap    = {};
    allSessionTypes
      .filter((st) => !st.is_master)
      .forEach((st) => {
        const cat = st.category || "";
        if (!childMap[cat]) childMap[cat] = [];
        childMap[cat].push(st);
      });
    return { masters: mastersList, childrenByCategory: childMap };
  })();

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(st) {
    const msg = st.is_master
      ? `Delete the entire "${st.category}" category? All session types under it will also be deleted.`
      : `Delete "${st.name}"?`;
    if (!window.confirm(msg)) return;
    
    try {
      if (st.is_master) {
        // Delete all rows in this category
        const { error: e } = await supabase
          .from("SessionType").delete().eq("category", st.category);
        if (e) throw e;
        // If we deleted the selected category, clear selection
        if (selectedCategory?.id === st.id) {
          setSelectedCategory(null);
        }
      } else {
        const { error: e } = await supabase
          .from("SessionType").delete().eq("id", st.id);
        if (e) throw e;
      }
      loadAll();
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  // ── Category card clicked ─────────────────────────────────────────────────
  function handleSelectCategory(master) {
    // Toggle: if clicking the already-selected category, deselect it
    if (selectedCategory?.id === master.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(master);
    }
  }

  // ── Edit handler (for package cards in expanded view) ────────────────────
  function handleEdit(st) {
    navigate(`/admin/offerings/${st.id}/edit`);
  }

  // Get children for the selected category
  const categoryChildren = selectedCategory
    ? (childrenByCategory[selectedCategory.category] ?? [])
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex w-1/5 min-w-50 overflow-y-auto">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="m-6 md:m-8">

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sessions &amp; Packages</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Click a category to view and edit its packages. All cards are clickable to edit.
                </p>
              </div>
              <button
                onClick={() => navigate("/admin/offerings/new")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 transition"
              >
                <Plus size={15} />
                New Category
              </button>
            </div>

            {loading && <p className="text-sm text-neutral-500">Loading...</p>}
            {error   && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && masters.length === 0 && (
              <div className="text-center py-16 text-neutral-400">
                <p className="text-lg font-serif">No categories yet.</p>
                <p className="text-sm mt-2">Create your first category to get started.</p>
              </div>
            )}

            {!loading && !error && masters.length > 0 && (
              <div className="space-y-6">
                
                {/* ── Step 1: Category Grid (Masters Only) ─────────────── */}
                <div>
                  <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
                    Select a Category
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {masters.map((master) => {
                      const isSelected = selectedCategory?.id === master.id;
                      const imageUrl = getImageUrl(master.image_path);

                      return (
                        <div
                          key={master.id}
                          onClick={() => handleSelectCategory(master)}
                          className={`group cursor-pointer rounded-xl border overflow-hidden bg-white shadow-sm transition-all
                            ${isSelected
                              ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20 shadow-md"
                              : "border-black/10 hover:border-black/20 hover:shadow-md"
                            }
                          `}
                        >
                          {/* Image */}
                          <div className="h-28 w-full bg-neutral-100 overflow-hidden relative">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={master.category}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-neutral-50">
                                <span className="text-neutral-300 text-xs">No image</span>
                              </div>
                            )}
                            {!master.active && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[9px] text-neutral-500 uppercase tracking-wide">
                                Inactive
                              </div>
                            )}
                          </div>

                          {/* Label */}
                          <div className="flex items-center gap-2 px-3 py-2.5">
                            <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition
                              ${isSelected ? "border-[#7E4C3C]" : "border-black/30"}`}>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-[#7E4C3C]" />}
                            </span>
                            <span className="font-serif text-sm text-neutral-800">{master.category}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Step 2: Expanded Package Grid ────────────────────── */}
                {selectedCategory && (
                  <div className="mt-6 rounded-xl border border-[#7E4C3C]/20 bg-[#FAF7F2] p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                        Available packages in {selectedCategory.category}
                      </p>
                      <button
                        onClick={() => navigate(`/admin/offerings/${encodeURIComponent(selectedCategory.category)}/session-types/new`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#AB8C4B]/30 bg-white text-xs text-[#AB8C4B] hover:border-[#AB8C4B]/50 hover:bg-[#AB8C4B]/5 transition font-medium"
                      >
                        <Plus size={12} /> Add Package
                      </button>
                    </div>

                    {/* Grid of all packages (master + children) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Master card */}
                      <SessionTypeCard
                        st={selectedCategory}
                        isSelected={false}
                        onSelect={() => handleEdit(selectedCategory)}
                        showEditControls={true}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        variant="grid"
                      />

                      {/* Child packages */}
                      {categoryChildren.map((child) => (
                        <SessionTypeCard
                          key={child.id}
                          st={child}
                          isSelected={false}
                          onSelect={() => handleEdit(child)}
                          showEditControls={true}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          variant="grid"
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </Frame>
      </div>
    </div>
  );
}