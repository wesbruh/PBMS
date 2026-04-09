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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Star } from "lucide-react";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";

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
            <div className="space-y-6">
              {grouped.map(({ category, master, children }) => {
                const isExpanded = !!expandedCategories[category];
                const imageUrl   = getImageUrl(master?.image_path);

                return (
                  <div key={category} className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">

                    {/* ── Master / category row ─────────────────────────── */}
                    <div className="flex items-center gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-neutral-100">
                        {imageUrl
                          ? <img src={imageUrl} alt={category} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">No image</div>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-serif text-lg text-neutral-900">{category}</p>
                          <span className="flex items-center gap-1 text-[10px] text-[#AB8C4B] font-mono uppercase bg-[#AB8C4B]/10 px-1.5 py-0.5 rounded">
                            <Star size={9} /> category
                          </span>
                          {master && !master.active && (
                            <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">inactive</span>
                          )}
                        </div>
                        {master?.description && (
                          <p className="mt-0.5 text-xs text-neutral-500 truncate">{master.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {(master?.price_label || master?.base_price) && (
                            <p className="text-xs text-[#7E4C3C] font-semibold">
                              {master.price_label || `From $${Number(master.base_price).toLocaleString()}`}
                            </p>
                          )}
                          <p className="text-xs text-neutral-400">
                            {children.length === 0
                              ? "Standalone (no sub-types)"
                              : `${children.length} session type${children.length > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Add child session type */}
                        <button
                          onClick={() => navigate(`/admin/offerings/${encodeURIComponent(category)}/session-types/new`)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400 hover:border-[#AB8C4B]/50 hover:text-[#AB8C4B] transition"
                          title="Add session type under this category"
                        >
                          <Plus size={11} /> Add session type
                        </button>
                        {master && (
                          <button
                            onClick={() => navigate(`/admin/offerings/${master.id}/edit`)}
                            className="p-1.5 rounded-lg border hover:bg-neutral-50"
                            title="Edit category"
                          >
                            <Pencil size={13} className="text-neutral-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(master?.id, true, category)}
                          className="p-1.5 rounded-lg border hover:bg-red-50"
                          title="Delete category and all its session types"
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                        {/* Expand/collapse children */}
                        {children.length > 0 && (
                          <button
                            onClick={() => toggleExpand(category)}
                            className="p-1.5 rounded-lg border hover:bg-neutral-50"
                            title={isExpanded ? "Collapse" : "Show session types"}
                          >
                            {isExpanded
                              ? <ChevronUp size={13} className="text-neutral-500" />
                              : <ChevronDown size={13} className="text-neutral-500" />
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Child session types (expanded) ────────────────── */}
                    {isExpanded && children.length > 0 && (
                      <div className="border-t border-neutral-100 bg-neutral-50/60 divide-y divide-neutral-100">
                        {children
                          .slice()
                          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                          .map((child) => {
                            const childImg = getImageUrl(child.image_path);
                            return (
                              <div key={child.id} className="flex items-center gap-3 px-4 py-3">
                                {/* Thumbnail */}
                                <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-neutral-100">
                                  {childImg
                                    ? <img src={childImg} alt={child.name} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-neutral-300 text-[9px]">No img</div>
                                  }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800">{child.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {(child.price_label || child.base_price) && (
                                      <p className="text-[11px] text-[#7E4C3C]">
                                        {child.price_label || `From $${Number(child.base_price).toLocaleString()}`}
                                      </p>
                                    )}
                                    {!child.active && (
                                      <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">inactive</span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => navigate(`/admin/offerings/${child.id}/edit`)}
                                    className="p-1.5 rounded-lg border hover:bg-neutral-50"
                                    title="Edit"
                                  >
                                    <Pencil size={12} className="text-neutral-500" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(child.id, false, category)}
                                    className="p-1.5 rounded-lg border hover:bg-red-50"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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