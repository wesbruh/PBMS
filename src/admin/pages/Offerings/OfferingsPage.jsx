// src/admin/pages/Offerings/OfferingsPage.jsx
//
// Displays ALL SessionType rows grouped by their `category` column.
// Within each category group:
//   - The row with is_master=true is the category representative card
//   - All other rows in the same category are child session types (e.g. Ivory, Champagne)
//
// Admin can:
//   - Create a new category (creates the master session type)
//   - Add a child session type under a category
//   - Edit or delete any session type

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

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
  // Track which category groups are expanded to show children
  const [expandedCategories, setExpandedCategories] = useState({});

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
  // Returns: [{ category, master, children }]
  const grouped = (() => {
    const map = {};
    allSessionTypes.forEach((st) => {
      const cat = st.category || "Uncategorized";
      if (!map[cat]) map[cat] = { category: cat, master: null, children: [] };
      if (st.is_master) map[cat].master = st;
      else map[cat].children.push(st);
    });
    // Sort categories by master's display_order, then alphabetically
    return Object.values(map).sort((a, b) => {
      const ao = a.master?.display_order ?? 999;
      const bo = b.master?.display_order ?? 999;
      return ao !== bo ? ao - bo : a.category.localeCompare(b.category);
    });
  })();

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id, isMaster, category) {
    const msg = isMaster
      ? `Delete the entire "${category}" category? All session types under it will also be deleted.`
      : "Delete this session type?";
    if (!window.confirm(msg)) return;
    try {
      if (isMaster) {
        // Delete all rows in this category
        const { error: e } = await supabase
          .from("SessionType").delete().eq("category", category);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("SessionType").delete().eq("id", id);
        if (e) throw e;
      }
      loadAll();
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  // ── Edit handler ──────────────────────────────────────────────────────────
  function handleEdit(st) {
    navigate(`/admin/offerings/${st.id}/edit`);
  }

  function toggleExpand(category) {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }

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
                <h1 className="text-2xl font-semibold">Sessions &amp; Categories</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Manage your service categories and the session types within each.
                  Active categories are visible to clients on the booking page.
                </p>
              </div>
              <button
                onClick={() => navigate("/admin/offerings/new")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
              >
                <Plus size={15} />
                New Category
              </button>
            </div>

            {loading && <p className="text-sm text-neutral-500">Loading...</p>}
            {error   && <p className="text-sm text-red-600">{error}</p>}

            {!loading && !error && grouped.length === 0 && (
              <div className="text-center py-16 text-neutral-400">
                <p className="text-lg font-serif">No categories yet.</p>
                <p className="text-sm mt-2">Create your first category to get started.</p>
              </div>
            )}

            {/* Category groups */}
            <div className="space-y-8">
              {grouped.map(({ category, master, children }) => {
                const isExpanded = !!expandedCategories[category];
                const imageUrl   = getImageUrl(master?.image_path);

                return (
                  <div key={category} className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">

                    {/* ── Category Header ────────────────────────────────── */}
                    <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-100">
                      {/* Category thumbnail */}
                      <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 shadow-sm">
                        {imageUrl ? (
                          <img src={imageUrl} alt={category} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Category info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="font-serif text-xl text-neutral-900">{category}</h2>
                          <span className="px-2 py-0.5 rounded-full bg-[#AB8C4B]/10 text-[9px] text-[#AB8C4B] font-mono uppercase tracking-wide">
                            Category
                          </span>
                          {master && !master.active && (
                            <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-[10px] text-neutral-400 uppercase">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500">
                          {children.length === 0
                            ? "Standalone category (no packages)"
                            : `${children.length + 1} package${children.length > 0 ? "s" : ""} available`}
                        </p>
                      </div>

                      {/* Category actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/admin/offerings/${encodeURIComponent(category)}/session-types/new`)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[#AB8C4B]/30 bg-[#AB8C4B]/5 text-xs text-[#AB8C4B] hover:border-[#AB8C4B]/50 hover:bg-[#AB8C4B]/10 transition font-medium"
                          title="Add session type under this category"
                        >
                          <Plus size={13} /> Add Package
                        </button>
                        
                        {children.length > 0 && (
                          <button
                            onClick={() => toggleExpand(category)}
                            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
                            title={isExpanded ? "Collapse packages" : "Show packages"}
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} className="text-neutral-500" />
                            ) : (
                              <ChevronDown size={16} className="text-neutral-500" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Package Grid ──────────────────────────────────── */}
                    {isExpanded && (
                      <div className="p-6 bg-[#FAF7F2]">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">
                          Available packages in {category}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Master card */}
                          {master && (
                            <SessionTypeCard
                              st={master}
                              isSelected={false}
                              showEditControls={true}
                              onEdit={handleEdit}
                              onDelete={(st) => handleDelete(st.id, true, category)}
                              variant="grid"
                            />
                          )}

                          {/* Child session types */}
                          {children
                            .slice()
                            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                            .map((child) => (
                              <SessionTypeCard
                                key={child.id}
                                st={child}
                                isSelected={false}
                                showEditControls={true}
                                onEdit={handleEdit}
                                onDelete={(st) => handleDelete(st.id, false, category)}
                                variant="grid"
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* ── Collapsed view (master only as preview) ───────── */}
                    {!isExpanded && master && (
                      <div className="p-5 border-t border-neutral-100">
                        <div className="max-w-md">
                          <SessionTypeCard
                            st={master}
                            isSelected={false}
                            showEditControls={true}
                            onEdit={handleEdit}
                            onDelete={(st) => handleDelete(st.id, true, category)}
                            variant="list"
                          />
                        </div>
                        {children.length > 0 && (
                          <button
                            onClick={() => toggleExpand(category)}
                            className="mt-3 text-xs text-[#AB8C4B] hover:text-[#7E4C3C] font-medium flex items-center gap-1"
                          >
                            View all {children.length + 1} packages
                            <ChevronDown size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </Frame>
      </div>
    </div>
  );
}