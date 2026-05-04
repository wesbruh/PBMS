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
import {
  Upload,
  ImageMinus,
  Plus,
  GripVertical,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { SUPABASE_URL } from "../../../lib/viteApiUrl.js";

const BUCKET = "session-images";

function getPublicUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function SortableBullet({
  id,
  index,
  value,
  onChange,
  onRemove,
  canRemove,
  placeholder,
  inputCls,
}) {
  const { ref, handleRef, isDragSource } = useSortable({ id, index });
  return (
    <div
      ref={ref}
      className={`flex gap-2 items-center ${isDragSource ? "opacity-50" : ""}`}
    >
      <span
        ref={handleRef}
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={14} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} flex-1`}
        placeholder={placeholder}
        data-bullet-id={id}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="p-1 rounded hover:bg-red-50 disabled:opacity-30 cursor-pointer"
      >
        <Trash2 size={16} className="text-red-400" />
      </button>
    </div>
  );
}

export default function SessionTypeEditor({ mode, isMasterDefault = false }) {
  const { id, categoryName } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  // ── Form fields ───────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState(
    // Pre-fill category when adding a child under an existing one
    categoryName ? decodeURIComponent(categoryName) : "",
  );
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [priceLabel, setPriceLabel] = useState("");

  // bullet ids, useSortable needs an id to work properly
  const bulletIdCounter = useRef(0);
  const makeBulletId = () => `b-${++bulletIdCounter.current}`;
  const [bulletPoints, setBulletPoints] = useState([{ id: makeBulletId(), text: "" },]);

  const [displayOrder, setDisplayOrder] = useState(0);
  const [active, setActive] = useState(false);
  const [isMaster, setIsMaster] = useState(isMasterDefault);
  const [initialState, setInitialState] = useState(null);

  // ── Existing category names for the dropdown ──────────────────────────────
  const [existingCategories, setExistingCategories] = useState([]);

  // ── Image ─────────────────────────────────────────────────────────────────
  const [existingImagePath, setExistingImagePath] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  // capture initial state of data on load
  useEffect(() => {
    if (loading) return;
    if (initialState !== null) return;

    setInitialState({
      name,
      category,
      description,
      basePrice,
      priceLabel,
      durationMinutes,
      displayOrder,
      bulletPoints: JSON.parse(JSON.stringify(bulletPoints)),
      isMaster,
      active,
      imagePreview,
    });
  }, [
    loading,
    name,
    category,
    basePrice,
    priceLabel,
    durationMinutes,
    displayOrder,
    bulletPoints,
    isMaster,
    active,
    imagePreview,
    initialState,
  ]);

  const isDirty =
    initialState !== null &&
    (name !== initialState.name ||
      category !== initialState.category ||
      description !== initialState.description ||
      basePrice !== initialState.basePrice ||
      priceLabel !== initialState.priceLabel ||
      durationMinutes !== initialState.durationMinutes ||
      displayOrder !== initialState.displayOrder ||
      JSON.stringify(bulletPoints.map((b) => b.text)) !==
      JSON.stringify(initialState.bulletPoints.map((b) => b.text)) ||
      isMaster !== initialState.isMaster ||
      active !== initialState.active ||
      imagePreview !== initialState.imagePreview);

  // warn admin of unsaved changes if they press cancel, otherwise if no changes have been made before saving just redirect back
  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
      );
      if (!confirmed) return;
    }
    navigate("/admin/offerings");
  };

  // ── Load existing categories for dropdown ─────────────────────────────────
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("SessionType")
        .select("category")
        .eq("is_master", true)
        .order("category", { ascending: true });
      const cats = [
        ...new Set((data ?? []).map((r) => r.category).filter(Boolean)),
      ];
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
          .from("SessionType")
          .select("*")
          .eq("id", id)
          .single();
        if (e) throw e;

        setName(data.name ?? "");
        setCategory(data.category ?? "");
        setDescription(data.description ?? "");
        setDurationMinutes(data.default_duration_minutes ?? "");
        setBasePrice(data.base_price ?? "");
        setPriceLabel(data.price_label ?? "");
        setBulletPoints(
          Array.isArray(data.bullet_points) && data.bullet_points.length > 0
            ? data.bullet_points.map((text) => ({
              id: makeBulletId(),
              text,
            }))
            : [{ id: makeBulletId(), text: "" }],
        );
        setDisplayOrder(data.display_order ?? 0);
        setActive(data.active ?? false);
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
  function updateBullet(i, v) {
    setBulletPoints((p) =>
      p.map((b, idx) => (idx === i ? { ...b, text: v } : b)),
    );
  }
  function addBullet() {
    setBulletPoints((p) => [...p, { id: makeBulletId(), text: "" }]);
  }
  function removeBullet(i) {
    setBulletPoints((p) => p.filter((_, idx) => idx !== i));
  }

  // ── Upload image ──────────────────────────────────────────────────────────
  async function uploadImage(rowId) {
    if (!imageFile) return existingImagePath;
    const ext = imageFile.name.split(".").pop();
    const filePath = `session-types/${rowId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, imageFile, {
        upsert: true,
        contentType: imageFile.type,
      });
    if (upErr) throw upErr;
    return filePath;
  }

  async function updateActive(value) {
  setError("");

  if (!isEdit || !id) {
    setActive(value);
    return;
  }

  try {
    const { error: contractError } = await supabase
      .from("ContractTemplate")
      .select()
      .eq("session_type_id", id)
      .eq("active", true)
      .single();

    if (contractError) {
      throw new Error(
        "No active contract found. Save this and create one for this session type first!"
      );
    }

    setActive(value);
  } catch (e) {
    setError(e.message);
    console.error(e.message ?? "Could not set SessionType active.");
  }
}

  function validate() {
    if (!name.trim()) return "Name is required.";
    if (!category.trim()) return "Category is required.";
    if (!basePrice) return "Base Price is required.";
    if (!durationMinutes) return "Duration (Minutes) is required.";
    else if ((durationMinutes % 15) !== 0) return "Duration (Minutes) must be a multiple of 15 minutes.";
    if (!description.trim()) return "Description is required."
    return "";
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave()  {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    try {
      const cleanBullets = bulletPoints
        .map((b) => b.text.trim())
        .filter(Boolean);

      // If marking this as master, demote any existing master in the same category
      if (isMaster) {
        await supabase
          .from("SessionType")
          .update({ is_master: false })
          .eq("category", category.trim())
          .neq("id", id ?? "00000000-0000-0000-0000-000000000000");
      }

      const payload = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || null,
        default_duration_minutes: durationMinutes
          ? Number(durationMinutes)
          : null,
        base_price: basePrice ? Number(basePrice) : null,
        price_label: priceLabel.trim() || null,
        bullet_points: cleanBullets.length > 0 ? cleanBullets : null,
        display_order: Number(displayOrder),
        active: isEdit? active: false,
        is_master: isMaster,
      };

      if (isEdit) {
        const imagePath = await uploadImage(id);
        const { error: upErr } = await supabase
          .from("SessionType")
          .update({ ...payload, image_path: imagePath ?? null })
          .eq("id", id);
        if (upErr) throw upErr;
      } else {
        const { data: newRow, error: insErr } = await supabase
          .from("SessionType")
          .insert(payload)
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

      // successful save
      alert(
        isEdit
          ? `"${name}" was successfully updated.`
          : `"${name}" was successfully created.`,
      );
      navigate("/admin/offerings");
    } catch (e) {
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCls =
    "block text-xs font-medium text-gray-600 uppercase tracking-wide mt-2";
  const imgCls =
    "block text-xs font-medium text-gray-600 uppercase tracking-wide mt-1"; // added just for image styling on page, for some reason was BARELY triggerig overflow scroll

  const pageTitle = isEdit
    ? isMaster
      ? "Edit Category"
      : "Edit Session Type"
    : isMaster
      ? "Create Category"
      : "Add Session Type";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          {!isMaster && category && (
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">
              Category: {category}
            </p>
          )}
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border text-sm cursor-pointer hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (isEdit && !isDirty)}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-700 transition-all"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : pageTitle}
          </button>
        </div>
      </div>

      {/* body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center grow text-gray-500">
          <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
          <p className="text-sm">Loading session type editor...</p>
        </div>
      ) : (
        <div>
          {error && (
            <div className="grow flex flex-col text-center items-center justify-center">
              <p className="text-sm text-red-600 mb-2">{error}</p>
            </div>)}
          <div className="grid grid-cols-1 space-y-4 md:grid-cols-2 md:gap-10 max-w-2xl md:max-w-full">
            <div className="min-h-0">
              {/* Image upload */}
              <div>
                <label className={imgCls}>
                  {isMaster ? "Category Image" : "Session Type Image"}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition hover:border-[#AB8C4B]/60 hover:bg-gray-50
                    ${imagePreview ? "border-transparent overflow-hidden" : "border-gray-300 h-40"}`}
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full sm:h-32 md:h-58 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearImage();
                      }}
                      className="absolute top-2 right-2 bg-white/95 hover:bg-red-100 rounded-full p-1"
                      title="Remove Image"
                    >
                      <ImageMinus
                        size={18}
                        className=" text-red-600 cursor-pointer"
                      />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-gray-400">
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
                <label className={labelCls}>
                  {isMaster ? "Category Name *" : "Session Type Name *"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder={isMaster ? "e.g. Weddings" : "e.g. Ivory"}
                />
                {isMaster && (
                  <p className="text-xs text-gray-400 mt-1">
                    This name is shown as the category card on the booking page.
                  </p>
                )}
              </div>

              {/* Category — dropdown of existing + free-type for new */}
              <div>
                <label className={labelCls}>Category *</label>
                {isMaster ? (
                  // Master = defines a new or renamed category — free text
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Weddings"
                  />
                ) : (
                  // Child = must belong to an existing category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Select a category
                    </option>
                    {existingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-400 mb-2">
                  {isMaster
                    ? "The category groups related session types together (e.g. all Wedding packages)."
                    : "The category this session type belongs to."}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputCls}
                  placeholder="Short description shown to clients"
                />
              </div>
            </div>
            {/* RIGHT COLUMN. on bigger screens */}
            {/* Price */}
            <div className="space-y-5 mt-5 md:mt-0 md:overflow-y-auto md:min-h-0 md:pr-2 border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Base Price ($) *</label>
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
                  <p className="text-xs text-gray-400 mt-1">
                    Overrides price number if set
                  </p>
                </div>
              </div>

              {/* Duration + Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Duration (minutes) *</label>
                  <input
                    type="number"
                    min="0"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className={inputCls}
                    placeholder="60"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Used to block the time slot on booking
                  </p>
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
                  <p className="text-xs text-gray-400 mt-1">
                    Lower = shown first
                  </p>
                </div>
              </div>

              {/* Bullet points */}
              <div>
                <label className={labelCls}>What's Included</label>
                <DragDropProvider
                  onDragEnd={(event) => {
                    if (event.canceled) return;
                    const { source, target } = event.operation;
                    if (!target || source.id === target.id) return;

                    const oldIndex = bulletPoints.findIndex(
                      (b) => b.id === source.id,
                    );
                    const newIndex = bulletPoints.findIndex(
                      (b) => b.id === target.id,
                    );
                    if (oldIndex === -1 || newIndex === -1) return;

                    const reordered = [...bulletPoints];
                    const [moved] = reordered.splice(oldIndex, 1);
                    reordered.splice(newIndex, 0, moved);
                    setBulletPoints(reordered);
                  }}
                >
                  <div className="space-y-2">
                    {bulletPoints.map((bullet, i) => (
                      <SortableBullet
                        key={bullet.id}
                        id={bullet.id}
                        index={i}
                        value={bullet.text}
                        onChange={(text) => updateBullet(i, text)}
                        onRemove={() => removeBullet(i)}
                        canRemove={bulletPoints.length > 1}
                        placeholder={`e.g. ${["1 Hour Coverage", "35+ edited photos", "Full Online Gallery"][i % 3]}`}
                        inputCls={inputCls}
                      />
                      // {/* <div key={i} className="flex gap-2 items-center">
                      //   <span className="text-gray-300">
                      //     <GripVertical size={14} />
                      //   </span>
                      //   <input
                      //     type="text"
                      //     value={pt}
                      //     onChange={(e) => updateBullet(i, e.target.value)}
                      //     className={`${inputCls} flex-1`}
                      //     placeholder={`e.g. ${["1 hour", "35+ edited images", "Online gallery", "Location guidance"][i % 4]}`}
                      //   />
                      //   <button
                      //     type="button"
                      //     onClick={() => removeBullet(i)}
                      //     disabled={bulletPoints.length === 1}
                      //     className="p-1 rounded hover:bg-red-50 disabled:opacity-30"
                      //   >
                      //     <Trash2 size={13} className="text-red-400" />
                      //   </button>
                      // </div> */}
                    ))}
                  </div>
                </DragDropProvider>
                <button
                  type="button"
                  onClick={addBullet}
                  className="mt-2 flex items-center gap-1 text-xs text-[#AB8C4B] hover:text-[#725e32] underline cursor-pointer"
                >
                  <Plus size={16} /> Add bullet point
                </button>
              </div>

              {/* Is master toggle — only relevant when editing (not creating, where it's pre-set) */}
              {isEdit && (
                <div className="flex items-start gap-3 rounded-lg border border-[#AB8C4B]/30 bg-[#AB8C4B]/5 p-4">
                  <input
                    id="is-master"
                    type="checkbox"
                    checked={isMaster}
                    onChange={(e) => setIsMaster(e.target.checked)}
                    disabled={initialState?.isMaster === true}
                    className="h-4 w-4 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="is-master" className="text-sm">
                    <span className="font-medium">
                      Category representative (master)
                    </span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      The master is shown as the category card on the booking
                      page. Its image and name represent the entire category. Only
                      one session type per category can be the master.
                    </p>
                  </label>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  id="active-toggle"
                  type="checkbox"
                  checked={isEdit? active : false}
                  onChange={(e) => updateActive(e.target.checked)}
                  disabled={!isEdit}
                  className="h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div>
                  <label htmlFor="active-toggle" className="text-md">
                    Visible to clients (active)
                  </label>
                  {!isEdit && (
                    <p className="test-xs text-gray-400 mt-1">
                      You can enable this after creating an active contract and questionnaire
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
