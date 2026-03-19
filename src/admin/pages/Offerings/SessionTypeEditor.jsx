// src/admin/pages/Sessions/SessionEditor.jsx
// Create or edit a SessionType row, including image upload to the
// `session-images` Supabase storage bucket.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import { Upload, X, Plus, GripVertical, Trash2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET       = "session-images";

function getPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export default function SessionEditor({ mode }) {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = mode === "edit";

  // ── Form state ────────────────────────────────────────────────────────────
  const [name,            setName]            = useState("");
  const [description,     setDescription]     = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [basePrice,       setBasePrice]       = useState("");
  const [priceLabel,      setPriceLabel]      = useState("");
  const [bulletPoints,    setBulletPoints]    = useState([""]);
  const [displayOrder,    setDisplayOrder]    = useState(0);
  const [active,          setActive]          = useState(true);

  // ── Image state ───────────────────────────────────────────────────────────
  const [existingImagePath, setExistingImagePath] = useState(null); // path already in DB
  const [imageFile,         setImageFile]         = useState(null); // new file chosen
  const [imagePreview,      setImagePreview]      = useState(null); // preview URL
  const fileInputRef = useRef(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error,   setError]   = useState("");

  // ── Load existing session ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    async function load() {
      setLoading(true);
      try {
        const { data, error: e } = await supabase
          .from("SessionType")
          .select("*")
          .eq("id", id)
          .single();
        if (e) throw e;

        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setDurationMinutes(data.default_duration_minutes ?? "");
        setBasePrice(data.base_price ?? "");
        setPriceLabel(data.price_label ?? "");
        setBulletPoints(
          Array.isArray(data.bullet_points) && data.bullet_points.length > 0
            ? data.bullet_points
            : [""]
        );
        setDisplayOrder(data.display_order ?? 0);
        setActive(data.active ?? true);
        setExistingImagePath(data.image_path ?? null);
        if (data.image_path) setImagePreview(getPublicUrl(data.image_path));
      } catch (e) {
        setError(e.message || "Failed to load session.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isEdit, id]);

  // ── Image selection ───────────────────────────────────────────────────────
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

  // ── Bullet point helpers ──────────────────────────────────────────────────
  function updateBullet(index, value) {
    setBulletPoints((prev) => prev.map((b, i) => (i === index ? value : b)));
  }
  function addBullet() {
    setBulletPoints((prev) => [...prev, ""]);
  }
  function removeBullet(index) {
    setBulletPoints((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Upload image to bucket ────────────────────────────────────────────────
  async function uploadImage(sessionId) {
    if (!imageFile) return existingImagePath; // no change

    const ext      = imageFile.name.split(".").pop();
    const filePath = `session-types/${sessionId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imageFile, { upsert: true, contentType: imageFile.type });

    if (upErr) throw upErr;
    return filePath;
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate() {
    if (!name.trim()) return "Session name is required.";
    return "";
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    try {
      const cleanBullets = bulletPoints.map((b) => b.trim()).filter(Boolean);

      if (isEdit) {
        // Upload image first (needs existing id)
        const imagePath = await uploadImage(id);

        const { error: upErr } = await supabase
          .from("SessionType")
          .update({
            name:                     name.trim(),
            description:              description.trim() || null,
            default_duration_minutes: durationMinutes ? Number(durationMinutes) : null,
            base_price:               basePrice ? Number(basePrice) : null,
            price_label:              priceLabel.trim() || null,
            bullet_points:            cleanBullets.length > 0 ? cleanBullets : null,
            display_order:            Number(displayOrder),
            active,
            image_path:               imagePath ?? null,
          })
          .eq("id", id);
        if (upErr) throw upErr;
      } else {
        // Insert first to get the ID, then upload
        const { data: newRow, error: insErr } = await supabase
          .from("SessionType")
          .insert({
            name:                     name.trim(),
            description:              description.trim() || null,
            default_duration_minutes: durationMinutes ? Number(durationMinutes) : null,
            base_price:               basePrice ? Number(basePrice) : null,
            price_label:              priceLabel.trim() || null,
            bullet_points:            cleanBullets.length > 0 ? cleanBullets : null,
            display_order:            Number(displayOrder),
            active,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        const imagePath = await uploadImage(newRow.id);
        if (imagePath) {
          await supabase
            .from("SessionType")
            .update({ image_path: imagePath })
            .eq("id", newRow.id);
        }
      }

      navigate("/admin/sessions");
    } catch (e) {
      setError(e.message || "Failed to save session.");
    } finally {
      setSaving(false);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCls = "block text-xs font-medium text-neutral-600 uppercase tracking-wide mb-1";

  if (loading) return <p className="text-sm p-6">Loading...</p>;

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Edit Session Type" : "Create Session Type"}
        </h1>
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
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Session"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-5">

        {/* Image upload */}
        <div>
          <label className={labelCls}>Session Image</label>
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
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
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
          <label className={labelCls}>Session Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Maternity"
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
            placeholder="Short description shown to clients"
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
              placeholder="375.00"
            />
          </div>
          <div>
            <label className={labelCls}>Price Display Label</label>
            <input
              type="text"
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              className={inputCls}
              placeholder="FROM: $375"
            />
            <p className="text-xs text-neutral-400 mt-1">Overrides numeric price if set</p>
          </div>
        </div>

        {/* Duration + Order */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Duration (minutes)</label>
            <input
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className={inputCls}
              placeholder="60"
            />
          </div>
          <div>
            <label className={labelCls}>Display Order</label>
            <input
              type="number"
              min="0"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className={inputCls}
              placeholder="0"
            />
            <p className="text-xs text-neutral-400 mt-1">Lower = shown first</p>
          </div>
        </div>

        {/* Bullet points */}
        <div>
          <label className={labelCls}>What's Included (bullet points)</label>
          <div className="space-y-2">
            {bulletPoints.map((pt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-neutral-300"><GripVertical size={14} /></span>
                <input
                  type="text"
                  value={pt}
                  onChange={(e) => updateBullet(i, e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder={`e.g. ${["1 hour", "35+ edited images", "Online gallery", "Location guidance"][i % 4]}`}
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

        {/* Active toggle */}
        <div className="flex items-center gap-3 pt-2">
          <input
            id="active-toggle"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="active-toggle" className="text-sm">
            Visible to clients (active)
          </label>
        </div>

      </div>
    </div>
  );
}
