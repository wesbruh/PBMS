// src/admin/components/SessionCard/SessionCard.jsx
//
// Shared card component used on BOTH:
//   - Admin side  (adminMode=true)  → shows Edit / Delete controls, inline editing
//   - Client side (adminMode=false) → read-only, used in Services page & InquiryForm
//
// Props:
//   session      — SessionType row + packages array
//   adminMode    — bool
//   onEdit       — () => void   (admin only)
//   onDelete     — () => void   (admin only)
//   selected     — bool         (client: is this session type selected?)
//   onSelect     — () => void   (client: called when card is clicked)
//   compact      — bool         (true = inquiry form card, false = services page card)

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/session-images/${path}`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SessionCard({
  session,
  adminMode     = false,
  onEdit,
  onDelete,
  selected      = false,
  onSelect,
  compact       = false,
  // for client-side package selection within a session
  selectedPackageId,
  onSelectPackage,
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPackages = Array.isArray(session.packages) && session.packages.length > 0;

  // In admin mode, clicking the card expands the package list
  // In client mode, clicking selects this session type
  function handleCardClick() {
    if (adminMode) {
      if (hasPackages) setExpanded((v) => !v);
    } else {
      onSelect?.();
      if (hasPackages) setExpanded(true);
    }
  }

  const imageUrl = getImageUrl(session.image_path);

  return (
    <div
      className={`
        group relative rounded-2xl border overflow-hidden bg-white shadow-sm
        transition-all duration-200
        ${adminMode ? "cursor-default" : "cursor-pointer"}
        ${selected && !adminMode
          ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20 shadow-md"
          : "border-neutral-200 hover:shadow-md hover:border-neutral-300"
        }
        ${compact ? "" : ""}
      `}
    >
      {/* ── Image ──────────────────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden bg-neutral-100 ${compact ? "h-28" : "h-52"}`}
        onClick={handleCardClick}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={session.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-neutral-50">
            <span className="text-neutral-300 text-xs">No image</span>
          </div>
        )}

        {/* Selected checkmark (client mode) */}
        {!adminMode && selected && (
          <div className="absolute top-2 right-2 bg-white rounded-full shadow">
            <CheckCircle2 size={20} className="text-[#7E4C3C]" />
          </div>
        )}

        {/* Admin controls overlay */}
        {adminMode && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1.5 bg-white rounded-full shadow hover:bg-neutral-50 border"
              title="Edit session"
            >
              <Pencil size={13} className="text-neutral-700" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-1.5 bg-white rounded-full shadow hover:bg-red-50 border"
              title="Delete session"
            >
              <Trash2 size={13} className="text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* ── Card body ──────────────────────────────────────────────────────── */}
      <div className="p-4" onClick={handleCardClick}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={`font-serif ${compact ? "text-base" : "text-xl"} text-neutral-900`}>
              {session.name}
            </h3>
            {session.base_price != null && (
              <p className={`font-semibold mt-0.5 text-[#7E4C3C] ${compact ? "text-xs" : "text-sm"}`}>
                {session.price_label || `FROM: $${Number(session.base_price).toLocaleString()}`}
              </p>
            )}
          </div>

          {/* Expand/collapse chevron when there are packages */}
          {hasPackages && (
            <span className="mt-1 text-neutral-400 shrink-0">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>

        {/* Bullet points (full card only) */}
        {!compact && Array.isArray(session.bullet_points) && session.bullet_points.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-neutral-600 list-disc list-inside">
            {session.bullet_points.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        )}

        {/* Description */}
        {!compact && session.description && (
          <p className="mt-2 text-xs text-neutral-500 leading-relaxed">{session.description}</p>
        )}

        {/* Packages badge */}
        {hasPackages && !expanded && (
          <p className="mt-2 text-[11px] text-[#AB8C4B] font-medium">
            {session.packages.length} package{session.packages.length > 1 ? "s" : ""} available →
          </p>
        )}
      </div>

      {/* ── Package list (expanded) ─────────────────────────────────────────── */}
      {hasPackages && expanded && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 px-4 pb-4 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">
            Available Packages
          </p>
          <div className="space-y-3">
            {session.packages
              .slice()
              .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
              .map((pkg) => (
                <PackageRow
                  key={pkg.id}
                  pkg={pkg}
                  adminMode={adminMode}
                  isSelected={selectedPackageId === pkg.id}
                  isGreyed={!!selectedPackageId && selectedPackageId !== pkg.id}
                  onSelect={() => onSelectPackage?.(pkg.id)}
                  onEditPackage={pkg.onEdit}
                  onDeletePackage={pkg.onDelete}
                  sessionSelected={selected}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PackageRow — shown inside expanded session card ───────────────────────────
function PackageRow({ pkg, adminMode, isSelected, isGreyed, onSelect, onEditPackage, onDeletePackage, sessionSelected }) {
  const imageUrl = getImageUrl(pkg.image_path);

  return (
    <div
      onClick={!adminMode ? onSelect : undefined}
      className={`
        flex gap-3 rounded-xl border p-3 bg-white transition-all duration-150
        ${adminMode ? "" : "cursor-pointer"}
        ${isSelected
          ? "border-[#7E4C3C] ring-1 ring-[#7E4C3C]/30 shadow-sm"
          : isGreyed
            ? "opacity-40"
            : "border-neutral-200 hover:border-neutral-300"
        }
      `}
    >
      {/* Package image thumbnail */}
      {imageUrl && (
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-neutral-100">
          <img src={imageUrl} alt={pkg.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-serif text-sm font-medium text-neutral-900">
              {pkg.name}
              {pkg.is_default && (
                <span className="ml-2 text-[10px] text-[#AB8C4B] font-mono uppercase tracking-wide">
                  standard
                </span>
              )}
            </p>
            <p className="text-xs text-[#7E4C3C] font-semibold mt-0.5">
              {pkg.price_label || (pkg.base_price ? `FROM: $${Number(pkg.base_price).toLocaleString()}` : "")}
            </p>
          </div>

          {/* Admin package controls */}
          {adminMode && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEditPackage?.(); }}
                className="p-1 rounded hover:bg-neutral-100"
                title="Edit package"
              >
                <Pencil size={11} className="text-neutral-500" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeletePackage?.(); }}
                className="p-1 rounded hover:bg-red-50"
                title="Delete package"
              >
                <Trash2 size={11} className="text-red-400" />
              </button>
            </div>
          )}

          {/* Client selected indicator */}
          {!adminMode && isSelected && (
            <CheckCircle2 size={16} className="text-[#7E4C3C] shrink-0 mt-0.5" />
          )}
        </div>

        {/* Bullet points */}
        {Array.isArray(pkg.bullet_points) && pkg.bullet_points.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-neutral-500 list-disc list-inside">
            {pkg.bullet_points.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
