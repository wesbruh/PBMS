// src/admin/pages/Sessions/PackageEditor.jsx
// Create or edit a Package row linked to a SessionType.
// Accessed from SessionsPage when admin clicks "Add Package" or "Edit" on a package row.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import { Upload, X, Plus, Trash2, GripVertical } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET       = "session-images";

function getPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export default function PackageEditor({ mode }) {
  // URL params:
  //   /admin/sessions/:sessionId/packages/new        → create
  //   /admin/sessions/:sessionId/packages/:pkgId/edit → edit
  const { sessionId, pkgId } = useParams();
  const navigate              = useNavigate();
  const isEdit                = mode === "edit";

  // ── Form state ────────────────────────────────────────────────────────────
  const [sessionName,  setSessionName]  = useState("");
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [basePrice,    setBasePrice]    = useState("");
  const [priceLabel,   setPriceLabel]   = useState("");
  const [bulletPoints, setBulletPoints] = useState([""]);
  const [isDefault,    setIsDefault]    = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  // ── Image state ───────────────────────────────────────────────────────────
  const [existingImagePath, setExistingImagePath] = useState(null);
  const [imageFile,         setImageFile]         = useState(null);
  const [imagePreview,      setImagePreview]      = useState(null);
  const fileInputRef = useRef(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Load parent session name + existing package ───────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Always load parent session name for context
        const { data: st } = await supabase
          .from("SessionType")
          .select("name")
          .eq("id", sessionId)
          .single();
        setSessionName(st?.name ?? "");

        if (isEdit && pkgId) {
          const { data, error: e } = await supabase
            .from("Package")
            .select("*")
            .eq("id", pkgId)
            .single();
          if (e) throw e;

          setName(data.name ?? "");
          setDescription(data.description ?? "");
          setBasePrice(data.base_price ?? "");
          setPriceLabel(data.price_label ?? "");
          setBulletPoints(
            Array.isArray(data.bullet_points) && data.bullet_points.length > 0
              ? data.bullet_points
              : [""]
          );
          setIsDefault(data.is_default ?? false);
          setDisplayOrder(data.display_order ?? 0);
          setExistingImagePath(data.image_path ?? null);
          if (data.image_path) setImagePreview(getPublicUrl(data.image_path));
        }
      } catch (e) {
        setError(e.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isEdit, sessionId, pkgId]);

  // ── Image handling ────────────────────────────────────────────────────────
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
  function updateBullet(i, v) { setBulletPoints((p) => p.map((b, idx) => (idx === i ? v : b))); }
  function addBullet()        { setBulletPoints((p) => [...p, ""]); }
  function removeBullet(i)    { setBulletPoints((p) => p.filter((_, idx) => idx !== i)); }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function uploadImage(packageId) {
    if (!imageFile) return existingImagePath;
    const ext      = imageFile.name.split(".").pop();
    const filePath = `packages/${packageId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imageFile, { upsert: true, contentType: imageFile.type });
    if (upErr) throw upErr;
    return filePath;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setError("");
    if (!name.trim()) { setError("Package name is required."); return; }

    setSaving(true);
    try {
      const cleanBullets = bulletPoints.map((b) => b.trim()).filter(Boolean);

      if (isEdit) {
        const imagePath = await uploadImage(pkgId);

        // If setting this as default, unset others first
        if (isDefault) {
          await supabase
            .from("Package")
            .update({ is_default: false })
            .eq("session_type_id", sessionId)
            .neq("id", pkgId);
        }

        const { error: upErr } = await supabase
          .from("Package")
          .update({
            name:          name.trim(),
            description:   description.trim() || null,
            base_price:    basePrice ? Number(basePrice) : null,
            price_label:   priceLabel.trim() || null,
            bullet_points: cleanBullets.length > 0 ? cleanBullets : null,
            is_default:    isDefault,
            display_order: Number(displayOrder),
            image_path:    imagePath ?? null,
            updated_at:    new Date().toISOString(),
          })
          .eq("id", pkgId);
        if (upErr) throw upErr;
      } else {
        const { data: newRow, error: insErr } = await supabase
          .from("Package")
          .insert({
            session_type_id: sessionId,
            name:            name.trim(),
            description:     description.trim() || null,
            base_price:      basePrice ? Number(basePrice) : null,
            price_label:     priceLabel.trim() || null,
            bullet_points:   cleanBullets.length > 0 ? cleanBullets : null,
            is_default:      isDefault,
            display_order:   Number(displayOrder),
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        // If setting as default, unset others
        if (isDefault) {
          await supabase
            .from("Package")
            .update({ is_default: false })
            .eq("session_type_id", sessionId)
            .neq("id", newRow.id);
        }

        const imagePath = await uploadImage(newRow.id);
        if (imagePath) {
          await supabase.from("Package").update({ image_path: imagePath }).eq("id", newRow.id);
        }
      }

      navigate(`/admin/sessions`);
    } catch (e) {
      setError(e.message || "Failed to save package.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCls = "block text-xs font-medium text-neutral-600 uppercase tracking-wide mb-1";

  if (loading) return <p className="text-sm p-6">Loading...</p>;

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide">{sessionName}</p>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit Package" : "Add Package"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/admin/sessions")}
            className="px-4 py-2 rounded-lg border text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Package"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 mb-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-5">

        {/* Image upload */}
        <div>
          <label className={labelCls}>Package Image</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex items-center justify-center rounded-xl border-2 border-dashed
              cursor-pointer transition hover:border-[#AB8C4B]/60 hover:bg-neutral-50
              ${imagePreview ? "border-transparent p-0 overflow-hidden" : "border-neutral-300 h-40"}
            `}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border"
                >
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Name */}
        <div>
          <label className={labelCls}>Package Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Ivory"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            placeholder="Short description of this package"
          />
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Base Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className={inputCls}
              placeholder="1600.00"
            />
          </div>
          <div>
            <label className={labelCls}>Price Display Label</label>
            <input
              type="text"
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              className={inputCls}
              placeholder="FROM: $1,600"
            />
          </div>
        </div>

        {/* Order */}
        <div>
          <label className={labelCls}>Display Order</label>
          <input
            type="number"
            min="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            className={`${inputCls} w-32`}
          />
        </div>

        {/* Bullet points */}
        <div>
          <label className={labelCls}>What's Included</label>
          <div className="space-y-2">
            {bulletPoints.map((pt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-neutral-300"><GripVertical size={14} /></span>
                <input
                  type="text"
                  value={pt}
                  onChange={(e) => updateBullet(i, e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="e.g. 3 hour coverage"
                />
                <button
                  type="button"
                  onClick={() => removeBullet(i)}
                  disabled={bulletPoints.length === 1}
                  className="p-1 rounded hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBullet}
            className="mt-2 flex items-center gap-1 text-xs text-[#AB8C4B] underline"
          >
            <Plus size={12} /> Add bullet point
          </button>
        </div>

        {/* Default package toggle */}
        <div className="flex items-start gap-3 rounded-xl border border-[#AB8C4B]/30 bg-[#AB8C4B]/5 p-4">
          <input
            id="is-default"
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 mt-0.5"
          />
          <label htmlFor="is-default" className="text-sm">
            <span className="font-medium">Set as default package</span>
            <p className="text-xs text-neutral-500 mt-0.5">
              The default package is pre-selected when a client chooses this session type.
              Only one package per session type can be the default.
            </p>
          </label>
        </div>

      </div>
    </div>
  );
}
