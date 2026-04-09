// src/admin/pages/Offerings/SessionTypeEditor.jsx
//
// Creates or edits a single SessionType row.
// Works for both:
//   - Master (is_master=true)  → represents the category itself
//   - Child  (is_master=false) → a specific session type under a category
//
// Route params:
//   mode="create", isMasterDefault=true  → /admin/offerings/new
//   mode="create", isMasterDefault=false → /admin/offerings/:categoryName/session-types/new
//   mode="edit"                          → /admin/offerings/:id/edit

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import { Upload, X, Plus, GripVertical, Trash2 } from "lucide-react";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET       = "session-images";

function getPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export default function SessionTypeEditor({ mode, isMasterDefault = false }) {
  const { id, categoryName } = useParams();
  const navigate             = useNavigate();
  const isEdit               = mode === "edit";

  // ── Form fields ───────────────────────────────────────────────────────────
  const [name,            setName]            = useState("");
  const [category,        setCategory]        = useState(
    // Pre-fill category when adding a child under an existing one
    categoryName ? decodeURIComponent(categoryName) : ""
  );
  const [description,     setDescription]     = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [basePrice,       setBasePrice]       = useState("");
  const [priceLabel,      setPriceLabel]      = useState("");
  const [bulletPoints,    setBulletPoints]    = useState([""]);
  const [displayOrder,    setDisplayOrder]    = useState(0);
  const [active,          setActive]          = useState(true);
  const [isMaster,        setIsMaster]        = useState(isMasterDefault);

  // ── Existing category names for the dropdown ──────────────────────────────
  const [existingCategories, setExistingCategories] = useState([]);

  // ── Image ─────────────────────────────────────────────────────────────────
  const [existingImagePath, setExistingImagePath] = useState(null);
  const [imageFile,         setImageFile]         = useState(null);
  const [imagePreview,      setImagePreview]      = useState(null);
  const fileInputRef = useRef(null);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error,   setError]   = useState("");

  // ── Load existing categories for dropdown ─────────────────────────────────
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("SessionType")
        .select("category")
        .eq("is_master", true)
        .order("category", { ascending: true });
      const cats = [...new Set((data ?? []).map((r) => r.category).filter(Boolean))];
      setExistingCategories(cats);
    }
    fetchCategories();
  }, []);

  // ── Load existing session type in edit mode ───────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    async function load() {
      setLoading(true);
      try {
        const { data, error: e } = await supabase
          .from("SessionType").select("*").eq("id", id).single();
        if (e) throw e;

        setName(data.name ?? "");
        setCategory(data.category ?? "");
        setDescription(data.description ?? "");
        setDurationMinutes(data.default_duration_minutes ?? "");
        setBasePrice(data.base_price ?? "");
        setPriceLabel(data.price_label ?? "");
        setBulletPoints(
          Array.isArray(data.bullet_points) && data.bullet_points.length > 0
            ? data.bullet_points : [""]
        );
        setDisplayOrder(data.display_order ?? 0);
        setActive(data.active ?? true);
        setIsMaster(data.is_master ?? false);
        setExistingImagePath(data.image_path ?? null);
        if (data.image_path) setImagePreview(getPublicUrl(data.image_path));
      } catch (e) {
        setError(e.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isEdit, id]);

  // ── Image helpers ─────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }
  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setExistingImagePath(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Bullet helpers ────────────────────────────────────────────────────────
  function updateBullet(i, v) { setBulletPoints((p) => p.map((b, idx) => idx === i ? v : b)); }
  function addBullet()         { setBulletPoints((p) => [...p, ""]); }
  function removeBullet(i)     { setBulletPoints((p) => p.filter((_, idx) => idx !== i)); }

  // ── Upload image ──────────────────────────────────────────────────────────
  async function uploadImage(rowId) {
    if (!imageFile) return existingImagePath;
    const ext      = imageFile.name.split(".").pop();
    const filePath = `session-types/${rowId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imageFile, { upsert: true, contentType: imageFile.type });
    if (upErr) throw upErr;
    return filePath;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setError("");
    if (!name.trim())     { setError("Name is required."); return; }
    if (!category.trim()) { setError("Category is required."); return; }

    setSaving(true);
    try {
      const cleanBullets = bulletPoints.map((b) => b.trim()).filter(Boolean);

      // If marking this as master, demote any existing master in the same category
      if (isMaster) {
        await supabase
          .from("SessionType")
          .update({ is_master: false })
          .eq("category", category.trim())
          .neq("id", id ?? "00000000-0000-0000-0000-000000000000");
      }

      const payload = {
        name:                     name.trim(),
        category:                 category.trim(),
        description:              description.trim() || null,
        default_duration_minutes: durationMinutes ? Number(durationMinutes) : null,
        base_price:               basePrice ? Number(basePrice) : null,
        price_label:              priceLabel.trim() || null,
        bullet_points:            cleanBullets.length > 0 ? cleanBullets : null,
        display_order:            Number(displayOrder),
        active,
        is_master:                isMaster,
      };

      if (isEdit) {
        const imagePath = await uploadImage(id);
        const { error: upErr } = await supabase
          .from("SessionType").update({ ...payload, image_path: imagePath ?? null }).eq("id", id);
        if (upErr) throw upErr;
      } else {
        const { data: newRow, error: insErr } = await supabase
          .from("SessionType").insert(payload).select("id").single();
        if (insErr) throw insErr;

        const imagePath = await uploadImage(newRow.id);
        if (imagePath) {
          await supabase.from("SessionType").update({ image_path: imagePath }).eq("id", newRow.id);
        }
      }

      navigate("/admin/offerings");
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCls = "block text-xs font-medium text-neutral-600 uppercase tracking-wide mb-1";

  const pageTitle = isEdit
    ? (isMaster ? "Edit Category" : "Edit Session Type")
    : (isMaster ? "Create Category" : "Add Session Type");

  if (loading) return <p className="text-sm p-6">Loading...</p>;

  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex w-1/5 min-w-50 overflow-y-auto">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="relative flex flex-col bg-[#fdfbf7] p-5 md:p-6 w-full rounded-2xl shadow-inner overflow-y-scroll">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                {!isMaster && category && (
                  <p className="text-xs text-neutral-400 uppercase tracking-wide mb-0.5">
                    Category: {category}
                  </p>
                )}
                <h1 className="text-2xl font-semibold">{pageTitle}</h1>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate("/admin/offerings")}
                  className="px-4 py-2 rounded-lg border text-sm">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50">
                  {saving ? "Saving..." : isEdit ? "Save Changes" : pageTitle}
                </button>
              </div>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="space-y-5 max-w-2xl">

              {/* Image upload */}
              <div>
                <label className={labelCls}>
                  {isMaster ? "Category Image" : "Session Type Image"}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition hover:border-[#AB8C4B]/60 hover:bg-neutral-50
                    ${imagePreview ? "border-transparent overflow-hidden" : "border-neutral-300 h-40"}`}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="preview" className="w-full h-48 object-cover rounded-xl" />
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); clearImage(); }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border">
                        <X size={14} className="text-neutral-600" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-neutral-400">
                      <Upload size={24} className="mx-auto mb-2" />
                      <p className="text-sm">Click to upload image</p>
                      <p className="text-xs mt-1">JPG, PNG, WebP · Max 10 MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden" onChange={handleFileChange} />
              </div>

              {/* Name */}
              <div>
                <label className={labelCls}>
                  {isMaster ? "Category Name *" : "Session Type Name *"}
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder={isMaster ? "e.g. Weddings" : "e.g. Ivory"} />
                {isMaster && (
                  <p className="text-xs text-neutral-400 mt-1">
                    This name is shown as the category card on the booking page.
                  </p>
                )}
              </div>

              {/* Category — dropdown of existing + free-type for new */}
              <div>
                <label className={labelCls}>Category *</label>
                {isMaster ? (
                  // Master = defines a new or renamed category — free text
                  <input type="text" value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Weddings" />
                ) : (
                  // Child = must belong to an existing category
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className={inputCls}>
                    <option value="">Select a category</option>
                    {existingCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-neutral-400 mt-1">
                  {isMaster
                    ? "The category groups related session types together (e.g. all Wedding packages)."
                    : "The category this session type belongs to."}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description</label>
                <textarea rows={3} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputCls}
                  placeholder="Short description shown to clients" />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Base Price ($)</label>
                  <input type="number" min="0" step="0.01" value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className={inputCls} placeholder="375.00" />
                </div>
                <div>
                  <label className={labelCls}>Price Display Label</label>
                  <input type="text" value={priceLabel}
                    onChange={(e) => setPriceLabel(e.target.value)}
                    className={inputCls} placeholder="FROM: $375" />
                  <p className="text-xs text-neutral-400 mt-1">Overrides price number if set</p>
                </div>
              </div>

              {/* Duration + Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Duration (minutes)</label>
                  <input type="number" min="0" value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className={inputCls} placeholder="60" />
                  <p className="text-xs text-neutral-400 mt-1">Used to block the time slot on booking</p>
                </div>
                <div>
                  <label className={labelCls}>Display Order</label>
                  <input type="number" min="0" value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className={inputCls} placeholder="0" />
                  <p className="text-xs text-neutral-400 mt-1">Lower = shown first</p>
                </div>
              </div>

              {/* Bullet points */}
              <div>
                <label className={labelCls}>What's Included</label>
                <div className="space-y-2">
                  {bulletPoints.map((pt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-neutral-300"><GripVertical size={14} /></span>
                      <input type="text" value={pt}
                        onChange={(e) => updateBullet(i, e.target.value)}
                        className={`${inputCls} flex-1`}
                        placeholder={`e.g. ${["1 hour", "35+ edited images", "Online gallery", "Location guidance"][i % 4]}`} />
                      <button type="button" onClick={() => removeBullet(i)}
                        disabled={bulletPoints.length === 1}
                        className="p-1 rounded hover:bg-red-50 disabled:opacity-30">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addBullet}
                  className="mt-2 flex items-center gap-1 text-xs text-[#AB8C4B] underline">
                  <Plus size={12} /> Add bullet point
                </button>
              </div>

              {/* Is master toggle — only relevant when editing (not creating, where it's pre-set) */}
              {isEdit && (
                <div className="flex items-start gap-3 rounded-xl border border-[#AB8C4B]/30 bg-[#AB8C4B]/5 p-4">
                  <input id="is-master" type="checkbox" checked={isMaster}
                    onChange={(e) => setIsMaster(e.target.checked)}
                    className="h-4 w-4 mt-0.5" />
                  <label htmlFor="is-master" className="text-sm">
                    <span className="font-medium">Category representative (master)</span>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      The master is shown as the category card on the booking page.
                      Its image and name represent the entire category.
                      Only one session type per category can be the master.
                    </p>
                  </label>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input id="active-toggle" type="checkbox" checked={active}
                  onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="active-toggle" className="text-sm">
                  Visible to clients (active)
                </label>
              </div>

            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}