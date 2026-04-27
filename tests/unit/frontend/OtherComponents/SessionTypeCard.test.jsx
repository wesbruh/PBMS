// tests/unit/frontend/SessionTypeCard.test.jsx
//
// 100% branch + statement coverage for
// ../src/components/SessionTypeCard/SessionTypeCard.jsx
//
// Coverage targets
// ─────────────────────────────────────────────────────────────────────────────
//  getImageUrl            – null / http / relative path
//  handleClick            – isClickable true / false (isOnlyOption, disabled, no onSelect)
//  handleEdit             – stopPropagation + onEdit called / onEdit undefined
//  handleDelete           – stopPropagation + onDelete called / onDelete undefined
//  imageError state       – onError sets imageError → shows placeholder
//
//  GRID variant (variant="grid" or default)
//    – image shown / image missing / image error
//    – showEditControls true / false
//    – isSelected styles / isOnlyOption styles / disabled styles
//    – is_master badge shown / hidden (isOnlyOption hides it)
//    – price_label shown / base_price fallback / neither shown
//    – description shown / absent
//    – bullet_points: ≤4 items / >4 items ("+N more…") / empty / null
//    – default_duration_minutes shown / absent
//
//  LIST variant (variant="list")
//    – image shown / image absent / image error
//    – showEditControls true / false
//    – isSelected ✓ tick / not selected
//    – isOnlyOption cursor / selected-ring styles
//    – disabled styles
//    – is_master inline "standard" badge shown / hidden
//    – price_label / base_price fallback / neither
//    – description shown / absent
//    – bullet_points: ≤3 items / >3 items (only first 3 shown) / absent
//
//  null / unknown variant → returns null (renders nothing)

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// ── lucide-react mock ─────────────────────────────────────────────────────────
jest.mock("lucide-react", () => ({
  Clock:      ({ size }) => <span data-testid="icon-clock" data-size={size} />,
  Image:      ({ size }) => <span data-testid="icon-image" data-size={size} />,
  PencilLine: ({ size }) => <span data-testid="icon-pencil" data-size={size} />,
  Trash2:     ({ size }) => <span data-testid="icon-trash" data-size={size} />,
}));

// ─────────────────────────────────────────────────────────────────────────────
// viteApiUrl
// ─────────────────────────────────────────────────────────────────────────────
jest.mock("../../../../src/lib/viteApiUrl.js", () => ({
  SUPABASE_URL: "https://test.supabase.co",
}));

// ── Component under test ──────────────────────────────────────────────────────
import SessionTypeCard from "../../../../src/components/SessionTypeCard/SessionTypeCard.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const base = {
  id:                       "st-1",
  name:                     "Ivory Package",
  category:                 "Weddings",
  description:              "A beautiful package.",
  base_price:               375,
  price_label:              null,
  bullet_points:            ["1 Hour Coverage", "35+ edited photos", "Online gallery"],
  default_duration_minutes: 60,
  is_master:                false,
  active:                   true,
  image_path:               null,
};

const withHttpImage   = { ...base, image_path: "https://cdn.example.com/photo.jpg" };
const withRelImage    = { ...base, image_path: "folder/photo.jpg" };
const masterSt        = { ...base, is_master: true };
const withPriceLabel  = { ...base, price_label: "FROM: $375" };
const noPriceSt       = { ...base, base_price: null,  price_label: null };
const noDescSt        = { ...base, description: null };
const noBulletsSt     = { ...base, bullet_points: null };
const emptyBulletsSt  = { ...base, bullet_points: [] };
const manyBulletsSt   = { ...base, bullet_points: ["A", "B", "C", "D", "E", "F"] };
const noDurationSt    = { ...base, default_duration_minutes: null };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderCard(props) {
  return render(<SessionTypeCard {...props} />);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. getImageUrl helper  (via rendered output)
// ═════════════════════════════════════════════════════════════════════════════

describe("getImageUrl (via rendered output)", () => {
  it("renders 'No image' placeholder when image_path is null (grid)", () => {
    renderCard({ st: base, variant: "grid" });
    expect(screen.getByText(/no image/i)).toBeInTheDocument();
  });

  it("passes an http URL straight through (grid)", () => {
    renderCard({ st: withHttpImage, variant: "grid" });
    const img = screen.getByRole("img");
    expect(img.src).toBe("https://cdn.example.com/photo.jpg");
  });

  it("builds a supabase storage URL for a relative path (grid)", () => {
    renderCard({ st: withRelImage, variant: "grid" });
    const img = screen.getByRole("img");
    expect(img.src).toMatch(/test\.supabase\.co.*folder\/photo\.jpg/);
  });

  it("renders no image element in list variant when image_path is null", () => {
    renderCard({ st: base, variant: "list" });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders image in list variant when image_path is an http URL", () => {
    renderCard({ st: withHttpImage, variant: "list" });
    const img = screen.getByRole("img");
    expect(img.src).toBe("https://cdn.example.com/photo.jpg");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. imageError state
// ═════════════════════════════════════════════════════════════════════════════

describe("imageError state", () => {
  it("shows placeholder after onError fires in grid variant", () => {
    renderCard({ st: withHttpImage, variant: "grid" });
    const img = screen.getByRole("img");
    // Simulate broken image
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/no image/i)).toBeInTheDocument();
  });

  it("hides the image container after onError fires in list variant", () => {
    renderCard({ st: withHttpImage, variant: "list" });
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. handleClick
// ═════════════════════════════════════════════════════════════════════════════

describe("handleClick", () => {
  it("calls onSelect when isClickable (not disabled, not isOnlyOption, onSelect provided)", () => {
    const onSelect = jest.fn();
    renderCard({ st: base, onSelect, variant: "grid" });
    fireEvent.click(screen.getByText("Ivory Package").closest("[class*='rounded-xl']") ?? document.querySelector("[class*='rounded-xl']"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSelect when onSelect is not provided", () => {
    // No onSelect prop — isClickable is false
    renderCard({ st: base, variant: "grid" });
    // Should not throw
    fireEvent.click(document.querySelector("[class*='rounded-xl']"));
    // Nothing to assert other than no error
  });

  it("does NOT call onSelect when disabled=true", () => {
    const onSelect = jest.fn();
    renderCard({ st: base, onSelect, disabled: true, variant: "grid" });
    fireEvent.click(document.querySelector("[class*='rounded-xl']"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does NOT call onSelect when isOnlyOption=true", () => {
    const onSelect = jest.fn();
    renderCard({ st: base, onSelect, isOnlyOption: true, variant: "grid" });
    fireEvent.click(document.querySelector("[class*='rounded-xl']"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onSelect in list variant when isClickable", () => {
    const onSelect = jest.fn();
    renderCard({ st: base, onSelect, variant: "list" });
    fireEvent.click(document.querySelector("[class*='rounded-xl']"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onSelect in list variant when isOnlyOption=true", () => {
    const onSelect = jest.fn();
    renderCard({ st: base, onSelect, isOnlyOption: true, variant: "list" });
    fireEvent.click(document.querySelector("[class*='rounded-xl']"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. handleEdit / handleDelete  (grid variant)
// ═════════════════════════════════════════════════════════════════════════════

describe("handleEdit and handleDelete – grid variant", () => {
  it("calls onEdit with the session type object when edit button is clicked", () => {
    const onEdit = jest.fn();
    renderCard({ st: base, showEditControls: true, onEdit, variant: "grid" });
    fireEvent.click(screen.getByTitle("Edit Session Type"));
    expect(onEdit).toHaveBeenCalledWith(base);
  });

  it("calls onDelete with the session type object when delete button is clicked", () => {
    const onDelete = jest.fn();
    renderCard({ st: base, showEditControls: true, onDelete, variant: "grid" });
    fireEvent.click(screen.getByTitle("Delete Session Type"));
    expect(onDelete).toHaveBeenCalledWith(base);
  });

  it("edit click does not propagate to the card click handler", () => {
    const onSelect = jest.fn();
    const onEdit   = jest.fn();
    renderCard({ st: base, onSelect, showEditControls: true, onEdit, variant: "grid" });
    fireEvent.click(screen.getByTitle("Edit Session Type"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
  });

  it("delete click does not propagate to the card click handler", () => {
    const onSelect = jest.fn();
    const onDelete = jest.fn();
    renderCard({ st: base, onSelect, showEditControls: true, onDelete, variant: "grid" });
    fireEvent.click(screen.getByTitle("Delete Session Type"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("does not throw when onEdit is undefined and edit button is clicked", () => {
    renderCard({ st: base, showEditControls: true, onEdit: undefined, variant: "grid" });
    expect(() => fireEvent.click(screen.getByTitle("Edit Session Type"))).not.toThrow();
  });

  it("does not throw when onDelete is undefined and delete button is clicked", () => {
    renderCard({ st: base, showEditControls: true, onDelete: undefined, variant: "grid" });
    expect(() => fireEvent.click(screen.getByTitle("Delete Session Type"))).not.toThrow();
  });

  it("does NOT render edit/delete buttons when showEditControls=false", () => {
    renderCard({ st: base, showEditControls: false, variant: "grid" });
    expect(screen.queryByTitle("Edit Session Type")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete Session Type")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. handleEdit / handleDelete  (list variant)
// ═════════════════════════════════════════════════════════════════════════════

describe("handleEdit and handleDelete – list variant", () => {
  it("calls onEdit with the session type when edit button is clicked", () => {
    const onEdit = jest.fn();
    renderCard({ st: base, showEditControls: true, onEdit, variant: "list" });
    fireEvent.click(screen.getByTitle("Edit Session Type"));
    expect(onEdit).toHaveBeenCalledWith(base);
  });

  it("calls onDelete with the session type when delete button is clicked", () => {
    const onDelete = jest.fn();
    renderCard({ st: base, showEditControls: true, onDelete, variant: "list" });
    fireEvent.click(screen.getByTitle("Delete Session Type"));
    expect(onDelete).toHaveBeenCalledWith(base);
  });

  it("does not throw when onEdit is undefined (list variant)", () => {
    renderCard({ st: base, showEditControls: true, onEdit: undefined, variant: "list" });
    expect(() => fireEvent.click(screen.getByTitle("Edit Session Type"))).not.toThrow();
  });

  it("does not throw when onDelete is undefined (list variant)", () => {
    renderCard({ st: base, showEditControls: true, onDelete: undefined, variant: "list" });
    expect(() => fireEvent.click(screen.getByTitle("Delete Session Type"))).not.toThrow();
  });

  it("does NOT render edit/delete buttons when showEditControls=false in list variant", () => {
    renderCard({ st: base, showEditControls: false, variant: "list" });
    expect(screen.queryByTitle("Edit Session Type")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete Session Type")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. GRID variant – content rendering
// ═════════════════════════════════════════════════════════════════════════════

describe("grid variant – content rendering", () => {
  it("renders the session type name", () => {
    renderCard({ st: base, variant: "grid" });
    expect(screen.getByText("Ivory Package")).toBeInTheDocument();
  });

  it("renders price_label when provided (overrides base_price)", () => {
    renderCard({ st: withPriceLabel, variant: "grid" });
    expect(screen.getByText("FROM: $375")).toBeInTheDocument();
  });

  it("renders 'From $X' price when price_label is null but base_price is set", () => {
    renderCard({ st: { ...base, price_label: null, base_price: 375 }, variant: "grid" });
    expect(screen.getByText("From $375")).toBeInTheDocument();
  });

  it("does NOT render price row when both price_label and base_price are null/falsy", () => {
    renderCard({ st: noPriceSt, variant: "grid" });
    expect(screen.queryByText(/from \$/i)).not.toBeInTheDocument();
  });

  it("renders description when provided", () => {
    renderCard({ st: base, variant: "grid" });
    expect(screen.getByText("A beautiful package.")).toBeInTheDocument();
  });

  it("does NOT render description paragraph when description is null", () => {
    renderCard({ st: noDescSt, variant: "grid" });
    expect(screen.queryByText("A beautiful package.")).not.toBeInTheDocument();
  });

  it("renders bullet_points list when array is non-empty (up to 4)", () => {
    renderCard({ st: base, variant: "grid" });
    expect(screen.getByText("1 Hour Coverage")).toBeInTheDocument();
    expect(screen.getByText("35+ edited photos")).toBeInTheDocument();
    expect(screen.getByText("Online gallery")).toBeInTheDocument();
  });

  it("shows '+N more…' when bullet_points has more than 4 items", () => {
    renderCard({ st: manyBulletsSt, variant: "grid" });
    // First 4 shown
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    // E and F should NOT be individually shown
    expect(screen.queryByText("E")).not.toBeInTheDocument();
    // "+2 more..." label
    expect(screen.getByText(/\+2 more/i)).toBeInTheDocument();
  });

  it("does NOT render bullet list when bullet_points is null", () => {
    renderCard({ st: noBulletsSt, variant: "grid" });
    expect(screen.queryByText("1 Hour Coverage")).not.toBeInTheDocument();
  });

  it("does NOT render bullet list when bullet_points is empty array", () => {
    renderCard({ st: emptyBulletsSt, variant: "grid" });
    expect(document.querySelector("ul")).not.toBeInTheDocument();
  });

  it("renders duration when default_duration_minutes is set", () => {
    renderCard({ st: base, variant: "grid" });
    expect(screen.getByText(/60 minutes/i)).toBeInTheDocument();
  });

  it("does NOT render duration section when default_duration_minutes is null", () => {
    renderCard({ st: noDurationSt, variant: "grid" });
    expect(screen.queryByTestId("icon-clock")).not.toBeInTheDocument();
  });

  it("shows 'Standard' badge for master when NOT isOnlyOption", () => {
    renderCard({ st: masterSt, isOnlyOption: false, variant: "grid" });
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });

  it("hides 'Standard' badge when isOnlyOption=true", () => {
    renderCard({ st: masterSt, isOnlyOption: true, variant: "grid" });
    expect(screen.queryByText("Standard")).not.toBeInTheDocument();
  });

  it("does NOT show 'Standard' badge when is_master=false", () => {
    renderCard({ st: base, variant: "grid" });
    expect(screen.queryByText("Standard")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. GRID variant – style classes
// ═════════════════════════════════════════════════════════════════════════════

describe("grid variant – conditional CSS classes", () => {
  function getCard() {
    return document.querySelector("[class*='rounded-xl']");
  }

  it("applies isOnlyOption border class when isOnlyOption=true", () => {
    renderCard({ st: base, isOnlyOption: true, variant: "grid" });
    expect(getCard().className).toContain("border-[#7E4C3C]/30");
  });

  it("applies selected ring class when isSelected=true", () => {
    renderCard({ st: base, isSelected: true, onSelect: jest.fn(), variant: "grid" });
    expect(getCard().className).toContain("ring-2");
  });

  it("applies opacity-60 and pointer-events-none when disabled=true", () => {
    renderCard({ st: base, disabled: true, variant: "grid" });
    expect(getCard().className).toContain("opacity-60");
    expect(getCard().className).toContain("pointer-events-none");
  });

  it("does NOT apply disabled classes when disabled=false", () => {
    renderCard({ st: base, disabled: false, variant: "grid" });
    expect(getCard().className).not.toContain("opacity-60");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. LIST variant – content rendering
// ═════════════════════════════════════════════════════════════════════════════

describe("list variant – content rendering", () => {
  it("renders the session type name in list layout", () => {
    renderCard({ st: base, variant: "list" });
    expect(screen.getByText("Ivory Package")).toBeInTheDocument();
  });

  it("renders price_label in list variant", () => {
    renderCard({ st: withPriceLabel, variant: "list" });
    expect(screen.getByText("FROM: $375")).toBeInTheDocument();
  });

  it("renders 'From $X' price when only base_price is set in list variant", () => {
    renderCard({ st: { ...base, price_label: null, base_price: 1200 }, variant: "list" });
    expect(screen.getByText("From $1,200")).toBeInTheDocument();
  });

  it("does NOT render price row when both are absent in list variant", () => {
    renderCard({ st: noPriceSt, variant: "list" });
    expect(screen.queryByText(/from \$/i)).not.toBeInTheDocument();
  });

  it("renders description in list variant", () => {
    renderCard({ st: base, variant: "list" });
    expect(screen.getByText("A beautiful package.")).toBeInTheDocument();
  });

  it("does NOT render description when null in list variant", () => {
    renderCard({ st: noDescSt, variant: "list" });
    expect(screen.queryByText("A beautiful package.")).not.toBeInTheDocument();
  });

  it("renders up to 3 bullet_points in list variant", () => {
    renderCard({ st: base, variant: "list" });
    expect(screen.getByText("1 Hour Coverage")).toBeInTheDocument();
    expect(screen.getByText("35+ edited photos")).toBeInTheDocument();
    expect(screen.getByText("Online gallery")).toBeInTheDocument();
  });

  it("only renders first 3 bullets when array has more than 3 items in list variant", () => {
    renderCard({ st: manyBulletsSt, variant: "list" });
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.queryByText("D")).not.toBeInTheDocument();
    // list variant has no "+N more" label
    expect(screen.queryByText(/more\.\.\./i)).not.toBeInTheDocument();
  });

  it("does NOT render bullet list when bullet_points is null in list variant", () => {
    renderCard({ st: noBulletsSt, variant: "list" });
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows ✓ tick when isSelected=true and NOT isOnlyOption", () => {
    renderCard({ st: base, isSelected: true, variant: "list" });
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("does NOT show ✓ tick when isSelected=false", () => {
    renderCard({ st: base, isSelected: false, variant: "list" });
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  it("does NOT show ✓ tick when isOnlyOption=true even if isSelected=true", () => {
    renderCard({ st: base, isSelected: true, isOnlyOption: true, variant: "list" });
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  it("shows inline 'standard' badge for master in list variant when NOT isOnlyOption", () => {
    renderCard({ st: masterSt, isOnlyOption: false, variant: "list" });
    expect(screen.getByText("standard")).toBeInTheDocument();
  });

  it("hides 'standard' badge in list variant when isOnlyOption=true", () => {
    renderCard({ st: masterSt, isOnlyOption: true, variant: "list" });
    expect(screen.queryByText("standard")).not.toBeInTheDocument();
  });

  it("does NOT show 'standard' badge when is_master=false in list variant", () => {
    renderCard({ st: base, variant: "list" });
    expect(screen.queryByText("standard")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. LIST variant – style classes
// ═════════════════════════════════════════════════════════════════════════════

describe("list variant – conditional CSS classes", () => {
  function getCard() {
    return document.querySelector("[class*='rounded-xl']");
  }

  it("applies isOnlyOption border class when isOnlyOption=true", () => {
    renderCard({ st: base, isOnlyOption: true, variant: "list" });
    expect(getCard().className).toContain("border-[#7E4C3C]/30");
  });

  it("applies selected ring when isSelected=true", () => {
    renderCard({ st: base, isSelected: true, onSelect: jest.fn(), variant: "list" });
    expect(getCard().className).toContain("ring-1");
  });

  it("applies cursor-pointer when isClickable in list variant", () => {
    renderCard({ st: base, onSelect: jest.fn(), variant: "list" });
    expect(getCard().className).toContain("cursor-pointer");
  });

  it("applies cursor-default when NOT isClickable in list variant", () => {
    renderCard({ st: base, variant: "list" });
    expect(getCard().className).toContain("cursor-default");
  });

  it("applies opacity-60 and pointer-events-none when disabled=true", () => {
    renderCard({ st: base, disabled: true, variant: "list" });
    expect(getCard().className).toContain("opacity-60");
    expect(getCard().className).toContain("pointer-events-none");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. Unknown / null variant → renders nothing
// ═════════════════════════════════════════════════════════════════════════════

describe("unknown variant", () => {
  it("renders nothing when variant is an unrecognised string", () => {
    const { container } = renderCard({ st: base, variant: "unknown" });
    expect(container.firstChild).toBeNull();
  });

  it("renders grid by default when no variant prop is supplied", () => {
    renderCard({ st: base });
    // Grid variant renders the image section with h-48 class
    expect(document.querySelector("[class*='h-48']")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. Edge-case / invalid input combinations
// ═════════════════════════════════════════════════════════════════════════════

describe("edge cases and invalid input", () => {
  it("renders with bare minimum props (name only, grid)", () => {
    const minimal = { name: "Minimal" };
    expect(() => renderCard({ st: minimal, variant: "grid" })).not.toThrow();
    expect(screen.getByText("Minimal")).toBeInTheDocument();
  });

  it("renders with bare minimum props (name only, list)", () => {
    const minimal = { name: "Minimal" };
    expect(() => renderCard({ st: minimal, variant: "list" })).not.toThrow();
  });

  it("formats large base_price with locale separators in grid variant", () => {
    renderCard({ st: { ...base, base_price: 1500000, price_label: null }, variant: "grid" });
    expect(screen.getByText("From $1,500,000")).toBeInTheDocument();
  });

  it("formats large base_price with locale separators in list variant", () => {
    renderCard({ st: { ...base, base_price: 2000, price_label: null }, variant: "list" });
    expect(screen.getByText("From $2,000")).toBeInTheDocument();
  });

  it("grid: exactly 4 bullet points shows all 4 without '+N more'", () => {
    const fourBullets = { ...base, bullet_points: ["A", "B", "C", "D"] };
    renderCard({ st: fourBullets, variant: "grid" });
    ["A", "B", "C", "D"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
    expect(screen.queryByText(/more\.\.\./i)).not.toBeInTheDocument();
  });

  it("grid: exactly 5 bullet points shows 4 + '+1 more…'", () => {
    const fiveBullets = { ...base, bullet_points: ["A", "B", "C", "D", "E"] };
    renderCard({ st: fiveBullets, variant: "grid" });
    expect(screen.queryByText("E")).not.toBeInTheDocument();
    expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
  });

  it("list: exactly 3 bullet points shows all 3 without extra label", () => {
    const threeBullets = { ...base, bullet_points: ["X", "Y", "Z"] };
    renderCard({ st: threeBullets, variant: "list" });
    ["X", "Y", "Z"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it("showEditControls=true with no onEdit/onDelete props does not crash on click", () => {
    renderCard({ st: base, showEditControls: true, variant: "grid" });
    expect(() => {
      fireEvent.click(screen.getByTitle("Edit Session Type"));
      fireEvent.click(screen.getByTitle("Delete Session Type"));
    }).not.toThrow();
  });

  it("isOnlyOption=true with showEditControls=true still shows edit controls in grid", () => {
    renderCard({ st: base, isOnlyOption: true, showEditControls: true, onEdit: jest.fn(), onDelete: jest.fn(), variant: "grid" });
    expect(screen.getByTitle("Edit Session Type")).toBeInTheDocument();
    expect(screen.getByTitle("Delete Session Type")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. Regression snapshots
// ═════════════════════════════════════════════════════════════════════════════

describe("regression snapshots", () => {
  it("matches snapshot: grid default state", () => {
    const { container } = renderCard({ st: base, variant: "grid" });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: grid selected + showEditControls", () => {
    const { container } = renderCard({
      st: masterSt,
      isSelected: true,
      showEditControls: true,
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      variant: "grid",
    });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: grid disabled + many bullets + image", () => {
    const { container } = renderCard({
      st: { ...manyBulletsSt, image_path: "https://cdn.example.com/img.jpg" },
      disabled: true,
      variant: "grid",
    });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: list default state", () => {
    const { container } = renderCard({ st: base, variant: "list" });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: list selected + showEditControls", () => {
    const { container } = renderCard({
      st: masterSt,
      isSelected: true,
      showEditControls: true,
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      variant: "list",
    });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: list isOnlyOption=true", () => {
    const { container } = renderCard({
      st: base,
      isOnlyOption: true,
      variant: "list",
    });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: unknown variant (renders null)", () => {
    const { container } = renderCard({ st: base, variant: "unknown" });
    expect(container).toMatchSnapshot();
  });
});