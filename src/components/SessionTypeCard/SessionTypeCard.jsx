// src/components/SessionTypeCard/SessionTypeCard.jsx

import { useState } from "react";
import { Clock, Image } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "session-images";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * SessionTypeCard - Reusable card component for displaying session types
 * 
 * @param {Object} st - Session type object with name, description, image_path, etc.
 * @param {boolean} isSelected - Whether this card is currently selected
 * @param {function} onSelect - Callback when card is clicked (optional)
 * @param {boolean} disabled - Whether the card is disabled/read-only
 * @param {boolean} isOnlyOption - Whether this is the only option (shows as static)
 * @param {boolean} showEditControls - Whether to show admin edit/delete buttons
 * @param {function} onEdit - Callback for edit button (admin only)
 * @param {function} onDelete - Callback for delete button (admin only)
 * @param {string} variant - "grid" for grid layout (default), "list" for list layout
 */
export default function SessionTypeCard({
  st,
  isSelected = false,
  onSelect,
  disabled = false,
  isOnlyOption = false,
  showEditControls = false,
  onEdit,
  onDelete,
  variant = "grid"
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(st.image_path);
  const isClickable = !isOnlyOption && !disabled && onSelect;

  const handleClick = () => {
    if (isClickable) {
      onSelect();
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(st);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(st);
  };

  // Grid variant (side by side cards)
  if (variant === "grid") {
    return (
      <div
        //onClick={handleClick}
        className={`relative group rounded-xl border overflow-hidden bg-white shadow-sm transition-all
          ${isOnlyOption
            ? "border-[#7E4C3C]/30 cursor-default"
            : isSelected
              ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20 shadow-md"
              : `border-black/10 hover:border-[#7E4C3C]/40 hover:shadow-md ${isClickable || showEditControls}`
          }
          ${disabled ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {/* Admin Controls (top-right overlay) */}
        {showEditControls && (
          <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(e);
              }}
              className="px-2 py-1 rounded-md bg-white/95 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-medium shadow-sm cursor-pointer transition-colors"
              type="button"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(e);
              }}
              className="px-2 py-1 rounded-md bg-white/95 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-medium shadow-sm cursor-pointer transition-colors"
              type="button"
            >
              Delete
            </button>
          </div>
        )}

        {/* Image Section */}
        <div className="relative h-48 w-full bg-linear-to-br from-neutral-50 to-neutral-100 overflow-hidden">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={st.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center text-neutral-300">
                <span className="flex flex-col items-center text-md"> <Image size={32} /> No image </span>
                {/* <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg> */}
                {/* <span className="text-sm">No image</span> */}
              </div>
            </div>
          )}
          
          {/* Selected indicator overlay */}
          {/* {!isOnlyOption && isSelected && (
            <div className=" border border-red-500 absolute top-3 right-3 h-7 w-7 rounded-full bg-[#ff0000] flex items-center justify-center shadow-lg">
              <svg className="border border-red-500 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )} */}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Title & Price */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif text-base font-semibold text-neutral-900 leading-snug">
                {st.name}
              </h3>
              {st.is_master && !isOnlyOption && (
                <span className="px-2 py-0.5 rounded-full bg-[#AB8C4B]/10 text-[12px] text-[#AB8C4B] font-mono uppercase tracking-wide shrink-0">
                  Standard
                </span>
              )}
            </div>
            
            {(st.price_label || st.base_price) && (
              <p className="text-sm text-[#7E4C3C] font-semibold mt-1">
                {st.price_label || `From $${Number(st.base_price).toLocaleString()}`}
              </p>
            )}
          </div>

          {/* Description */}
          {st.description && (
            <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
              {st.description}
            </p>
          )}

          {/* Bullet Points */}
          {Array.isArray(st.bullet_points) && st.bullet_points.length > 0 && (
            <ul className="space-y-1.5 text-xs text-neutral-600">
              {st.bullet_points.slice(0, 4).map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#AB8C4B] mt-0.5 shrink-0">•</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
              {st.bullet_points.length > 4 && (
                <li className="text-[10px] text-neutral-400 italic pl-4">
                  +{st.bullet_points.length - 4} more...
                </li>
              )}
            </ul>
          )}

          {/* Duration indicator (if available) */}
          {st.default_duration_minutes && (
            <div className="pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="flex gap-1"> <Clock size={16} />{st.default_duration_minutes} minutes</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List variant (horizontal layout)
  if (variant === "list") {
    return (
      <div
        onClick={handleClick}
        className={`relative group flex gap-4 rounded-xl border p-4 bg-white transition-all
          ${isOnlyOption
            ? "border-[#7E4C3C]/30 cursor-default"
            : isSelected
              ? "border-[#7E4C3C] ring-1 ring-[#7E4C3C]/20 shadow-sm"
              : `border-neutral-200 hover:border-[#7E4C3C]/40 ${isClickable ? "cursor-pointer" : "cursor-default"}`
          }
          ${disabled ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {/* Admin Controls */}
        {showEditControls && (
          <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="px-2 py-1 rounded-md bg-white/95 hover:bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium shadow-sm "
              type="button"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 rounded-md bg-white/95 hover:bg-red-50 border border-red-200 text-red-600 text-xs font-medium shadow-sm"
              type="button"
            >
              Delete
            </button>
          </div>
        )}

        {/* Image */}
        {imageUrl && !imageError && (
          <div className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-neutral-100">
            <img
              src={imageUrl}
              alt={st.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-sm font-medium text-neutral-900">
                {st.name}
                {st.is_master && !isOnlyOption && (
                  <span className="ml-2 text-[9px] text-[#AB8C4B] font-mono uppercase">standard</span>
                )}
              </p>
              {(st.price_label || st.base_price) && (
                <p className="text-xs text-[#7E4C3C] font-semibold mt-0.5">
                  {st.price_label || `From $${Number(st.base_price).toLocaleString()}`}
                </p>
              )}
            </div>
            {!isOnlyOption && isSelected && (
              <span className="text-[#7E4C3C] text-xs shrink-0 mt-0.5">✓</span>
            )}
          </div>

          {st.description && (
            <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed line-clamp-2">
              {st.description}
            </p>
          )}

          {Array.isArray(st.bullet_points) && st.bullet_points.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-neutral-500 list-disc list-inside">
              {st.bullet_points.slice(0, 3).map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return null;
}