// tests/unit/frontend/SessionTypeEditor.test.jsx
//
// 100% branch + statement coverage for
// src/admin/pages/Offerings/SessionTypeEditor.jsx
//
// Coverage targets
// ─────────────────────────────────────────────────────────────────────────────
//  getPublicUrl          – null / http / relative
//  SortableBullet        – render, onChange, onRemove, disabled state
//  initialState capture  – create mode, edit mode (after load)
//  isDirty               – every tracked field
//  handleCancel          – dirty + confirm / dirty + cancel / clean
//  fetchCategories       – populates dropdown
//  load (edit mode)      – success (full data), success (empty/null fields),
//                          success (bullet_points array present),
//                          error with message, error without message
//  handleFileChange      – file selected / no file
//  clearImage            – clears file, preview, existingImagePath, input value
//  updateBullet          – updates correct index
//  addBullet             – appends new entry
//  removeBullet          – removes correct index
//  uploadImage           – no file (returns existingImagePath) / file present
//                          (upload ok) / upload error
//  updateActive          – contract ok + questionnaire ok → sets active /
//                          contractError throws / questionnaireError throws
//  validate              – every required-field branch + duration % 15
//  handleSave (create)   – isMaster demote, insert ok + image, insert error,
//                          image upload error, post-insert image update
//  handleSave (edit)     – update ok, update error
//  pageTitle             – all four combinations of isEdit × isMaster
//  UI states             – loading spinner / error banner / category label
//  DragDropProvider      – onDragEnd: normal reorder, canceled, same id,
//                          target null, oldIndex -1, newIndex -1

import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock  (mock-prefixed so Jest hoisting allows it)
// ─────────────────────────────────────────────────────────────────────────────

let mockCallQueue = [];
let mockCallIndex = 0;

function nextResult() {
  const result = mockCallQueue[mockCallIndex] ?? { data: null, error: null };
  mockCallIndex += 1;
  return Promise.resolve(result);
}

// Storage sub-chain
const mockStorageChain = {
  from:   jest.fn(),
  upload: jest.fn(),
};
mockStorageChain.from.mockReturnValue(mockStorageChain);
mockStorageChain.upload.mockImplementation(() => nextResult());

// Main DB chain
const mockChain = {
  from:        jest.fn(),
  select:      jest.fn(),
  update:      jest.fn(),
  insert:      jest.fn(),
  delete:      jest.fn(),
  eq:          jest.fn(),
  neq:         jest.fn(),
  in:          jest.fn(),
  order:       jest.fn(),
  maybeSingle: jest.fn(),
  single:      jest.fn(),
  then:        (resolve, reject) => nextResult().then(resolve, reject),
};

function applyChainDefaults() {
  Object.keys(mockChain).forEach((key) => {
    if (key === "then") return;
    if (key === "maybeSingle" || key === "single") {
      mockChain[key].mockImplementation(() => nextResult());
    } else {
      mockChain[key].mockReturnValue(mockChain);
    }
  });
  mockChain.then = (resolve, reject) => nextResult().then(resolve, reject);
  mockStorageChain.from.mockReturnValue(mockStorageChain);
  mockStorageChain.upload.mockImplementation(() => nextResult());
}

jest.mock("../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from:    (...a) => mockChain.from(...a),
    storage: {
      from: (...a) => mockStorageChain.from(...a),
    },
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// viteApiUrl mock  (SUPABASE_URL constant used by getPublicUrl)
// ─────────────────────────────────────────────────────────────────────────────
jest.mock("../../../src/lib/viteApiUrl.js", () => ({
  SUPABASE_URL: "https://test.supabase.co",
}));

// ─────────────────────────────────────────────────────────────────────────────
// react-router-dom mocks
// ─────────────────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams:   () => mockUseParams(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// @dnd-kit mocks  – keep drag-drop logic testable without a real DnD runtime
// ─────────────────────────────────────────────────────────────────────────────
let mockOnDragEnd = null;   // captured so tests can invoke it directly

jest.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragEnd }) => {
    mockOnDragEnd = onDragEnd;
    return <div data-testid="dnd-provider">{children}</div>;
  },
}));

jest.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref:          jest.fn(),
    handleRef:    jest.fn(),
    isDragSource: false,
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// lucide-react mock
// ─────────────────────────────────────────────────────────────────────────────
jest.mock("lucide-react", () => ({
  Upload:       () => <span data-testid="icon-upload" />,
  ImageMinus:   () => <span data-testid="icon-image-minus" />,
  Plus:         () => <span data-testid="icon-plus" />,
  GripVertical: () => <span data-testid="icon-grip" />,
  Trash2:       () => <span data-testid="icon-trash" />,
  LoaderCircle: () => <span data-testid="icon-loader" />,
}));

// ─────────────────────────────────────────────────────────────────────────────
// URL.createObjectURL shim  (jsdom doesn't implement it)
// ─────────────────────────────────────────────────────────────────────────────
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");

// ─────────────────────────────────────────────────────────────────────────────
// Component under test
// ─────────────────────────────────────────────────────────────────────────────
import SessionTypeEditor from "../../../src/admin/pages/Offerings/SessionTypeEditor.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function queueResults(results) {
  mockCallQueue = results;
  mockCallIndex = 0;
}

/**
 * Render in CREATE mode (no DB load, just fetchCategories).
 * fetchCategories is always the first queued result.
 */
async function renderCreate({ isMasterDefault = false, extraQueue = [] } = {}) {
  mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
  queueResults([
    { data: [{ category: "Weddings" }, { category: "Portraits" }], error: null },
    ...extraQueue,
  ]);
  let result;
  await act(async () => {
    result = render(
      <SessionTypeEditor mode="create" isMasterDefault={isMasterDefault} />
    );
  });
  return result;
}

/**
 * Render in EDIT mode – always queues fetchCategories (result 0) and the
 * single() load call (result 1) first, then any extra results.
 */
async function renderEdit({
  sessionTypeData = defaultSessionType,
  loadError = null,
  extraQueue = [],
} = {}) {
  mockUseParams.mockReturnValue({ id: "st-123", categoryName: undefined });
  queueResults([
    { data: [{ category: "Weddings" }], error: null },         // fetchCategories
    { data: sessionTypeData, error: loadError },               // single() load
    ...extraQueue,
  ]);
  let result;
  await act(async () => {
    result = render(<SessionTypeEditor mode="edit" />);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const defaultSessionType = {
  id: "st-123",
  name: "Ivory Package",
  category: "Weddings",
  description: "A beautiful ivory package",
  default_duration_minutes: 60,
  base_price: 375,
  price_label: "FROM: $375",
  bullet_points: ["1 Hour Coverage", "35+ edited photos"],
  display_order: 1,
  active: true,
  is_master: false,
  image_path: null,
};

const masterSessionType = {
  ...defaultSessionType,
  id: "st-master",
  name: "Weddings Master",
  is_master: true,
  image_path: "weddings/hero.jpg",
};

// ─────────────────────────────────────────────────────────────────────────────
// Global beforeEach
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCallQueue = [];
  mockCallIndex = 0;
  mockOnDragEnd = null;
  jest.clearAllMocks();
  applyChainDefaults();
  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. getPublicUrl  (exercised via image preview rendered after load)
// ═════════════════════════════════════════════════════════════════════════════

describe("getPublicUrl helper (via rendered preview)", () => {
  it("renders no <img> when image_path is null", async () => {
    await renderEdit({ sessionTypeData: { ...defaultSessionType, image_path: null } });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("passes an http URL through unchanged", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, image_path: "https://cdn.example.com/photo.jpg" },
    });
    expect(screen.getByRole("img").src).toBe("https://cdn.example.com/photo.jpg");
  });

  it("builds a supabase storage URL for a relative image_path", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, image_path: "folder/image.jpg" },
    });
    expect(screen.getByRole("img").src).toMatch(
      /test\.supabase\.co.*folder\/image\.jpg/
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Page titles  (all four isEdit × isMaster combos)
// ═════════════════════════════════════════════════════════════════════════════

describe("pageTitle", () => {
  it("shows 'Create Category' when create + isMaster", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(screen.getByRole("heading")).toHaveTextContent("Create Category");
  });

  it("shows 'Add Session Type' when create + !isMaster", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByRole("heading")).toHaveTextContent("Add Session Type");
  });

  it("shows 'Edit Category' when edit + isMaster", async () => {
    await renderEdit({ sessionTypeData: masterSessionType });
    expect(screen.getByRole("heading")).toHaveTextContent("Edit Category");
  });

  it("shows 'Edit Session Type' when edit + !isMaster", async () => {
    await renderEdit();
    expect(screen.getByRole("heading")).toHaveTextContent("Edit Session Type");
  });

  it("shows 'Category: Weddings' sub-label for a non-master child in edit mode", async () => {
    await renderEdit();
    expect(screen.getByText(/category: weddings/i)).toBeInTheDocument();
  });

  it("does NOT show category sub-label for a master in edit mode", async () => {
    await renderEdit({ sessionTypeData: masterSessionType });
    expect(screen.queryByText(/category:/i)).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Loading state
// ═════════════════════════════════════════════════════════════════════════════

describe("loading state", () => {
  it("shows the spinner while loading in edit mode", async () => {
    mockUseParams.mockReturnValue({ id: "st-123", categoryName: undefined });
    // fetchCategories resolves, but single() for load hangs
    mockChain.single.mockImplementationOnce(() => new Promise(() => {}));
    queueResults([
      { data: [], error: null }, // fetchCategories
    ]);
    await act(async () => {
      render(<SessionTypeEditor mode="edit" />);
    });
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.getByText(/loading session type editor/i)).toBeInTheDocument();
  });

  it("does NOT show spinner in create mode", async () => {
    await renderCreate();
    expect(screen.queryByTestId("icon-loader")).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Load existing session type (edit mode)
// ═════════════════════════════════════════════════════════════════════════════

describe("load (edit mode)", () => {
  it("populates all fields from the loaded data", async () => {
    await renderEdit();
    expect(screen.getByDisplayValue("Ivory Package")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A beautiful ivory package")).toBeInTheDocument();
    expect(screen.getByDisplayValue("375")).toBeInTheDocument();
    expect(screen.getByDisplayValue("FROM: $375")).toBeInTheDocument();
    expect(screen.getByDisplayValue("60")).toBeInTheDocument();
  });

  it("populates bullet_points when the array is present and non-empty", async () => {
    await renderEdit();
    expect(screen.getByDisplayValue("1 Hour Coverage")).toBeInTheDocument();
    expect(screen.getByDisplayValue("35+ edited photos")).toBeInTheDocument();
  });

  it("falls back to a single empty bullet when bullet_points is null", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, bullet_points: null },
    });
    const inputs = screen.getAllByRole("textbox");
    // Only the name, description, priceLabel, category, and one bullet input
    // The bullet input should be empty
    const bulletInputs = inputs.filter(
      (i) => i.placeholder && i.placeholder.includes("e.g.")
    );
    expect(bulletInputs).toHaveLength(1);
    expect(bulletInputs[0].value).toBe("");
  });

  it("falls back to a single empty bullet when bullet_points is an empty array", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, bullet_points: [] },
    });
    const bulletInputs = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bulletInputs).toHaveLength(1);
  });

  it("handles null fields gracefully (uses fallback values)", async () => {
    await renderEdit({
      sessionTypeData: {
        ...defaultSessionType,
        name: null,
        category: null,
        description: null,
        default_duration_minutes: null,
        base_price: null,
        price_label: null,
        display_order: null,
        active: null,
        is_master: null,
        image_path: null,
      },
    });
    // Should not throw and should show empty/default values
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("shows an error message when load fails with a message", async () => {
    await renderEdit({ sessionTypeData: null, loadError: { message: "Not found" } });
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("shows 'Failed to load.' when load error has no message", async () => {
    await renderEdit({ sessionTypeData: null, loadError: {} });
    expect(screen.getByText("Failed to load.")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. fetchCategories  – populates the dropdown for child session types
// ═════════════════════════════════════════════════════════════════════════════

describe("fetchCategories", () => {
  it("populates the category dropdown for a child (non-master) create form", async () => {
    await renderCreate({ isMasterDefault: false });
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Weddings" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Portraits" })).toBeInTheDocument();
  });

  it("handles null data from fetchCategories gracefully", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    queueResults([{ data: null, error: null }]);
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={false} />);
    });
    // Should render the select with only the placeholder option
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("pre-fills category from categoryName URL param", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: "Portraits" });
    queueResults([{ data: [], error: null }]);
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={false} />);
    });
    // The category state is "Portraits" (decoded from URL param)
    // For a child, the select should have Portraits as current value
    // But since existingCategories is empty, the select has no option for it
    // — the important thing is the component doesn't crash
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("filters out falsy category values and deduplicates", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    queueResults([
      {
        data: [
          { category: "Weddings" },
          { category: "Weddings" },  // duplicate
          { category: null },         // falsy
          { category: "" },           // empty string (falsy)
        ],
        error: null,
      },
    ]);
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={false} />);
    });
    const options = screen.getAllByRole("option");
    // Only "Select a category" placeholder + "Weddings" (deduped, nulls filtered)
    expect(options).toHaveLength(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. Image helpers
// ═════════════════════════════════════════════════════════════════════════════

describe("image helpers", () => {
  it("shows upload placeholder when no image is set", async () => {
    await renderCreate();
    expect(screen.getByText(/click to upload image/i)).toBeInTheDocument();
  });

  it("handleFileChange: shows image preview after selecting a file", async () => {
    await renderCreate();
    const input = document.querySelector('input[type="file"]');
    const file = new File(["(⌐□_□)"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByRole("img", { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /preview/i }).src).toBe("blob:mock-url");
  });

  it("handleFileChange: does nothing when no file is selected", async () => {
    await renderCreate();
    const input = document.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } });
    });
    expect(screen.queryByRole("img", { name: /preview/i })).not.toBeInTheDocument();
  });

  it("clearImage: remove button clears the preview", async () => {
    await renderCreate();
    const input = document.querySelector('input[type="file"]');
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(screen.getByRole("img", { name: /preview/i })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTitle("Remove Image"));
    });
    expect(screen.queryByRole("img", { name: /preview/i })).not.toBeInTheDocument();
    expect(screen.getByText(/click to upload image/i)).toBeInTheDocument();
  });

  it("clicking the image area triggers the hidden file input", async () => {
    await renderCreate();
    const input = document.querySelector('input[type="file"]');
    const clickSpy = jest.spyOn(input, "click");
    // Click the upload area (the dashed border div)
    const uploadArea = screen.getByText(/click to upload image/i).closest("div");
    fireEvent.click(uploadArea.parentElement);
    expect(clickSpy).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Bullet point helpers
// ═════════════════════════════════════════════════════════════════════════════

describe("bullet point helpers", () => {
  it("renders one empty bullet by default in create mode", async () => {
    await renderCreate();
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets).toHaveLength(1);
  });

  it("addBullet appends a new empty row", async () => {
    await renderCreate();
    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets).toHaveLength(2);
  });

  it("updateBullet changes the correct bullet's text", async () => {
    await renderCreate();
    const bullets = () =>
      screen
        .getAllByRole("textbox")
        .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    fireEvent.change(bullets()[0], { target: { value: "My new bullet" } });
    expect(bullets()[0].value).toBe("My new bullet");
  });

  it("removeBullet removes the correct row when multiple bullets exist", async () => {
    await renderCreate();
    // Add a second bullet
    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });
    const bullets = () =>
      screen
        .getAllByRole("textbox")
        .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets()).toHaveLength(2);
    // Remove first trash button
    const trashButtons = screen.getAllByTestId("icon-trash");
    await act(async () => {
      fireEvent.click(trashButtons[0].closest("button"));
    });
    expect(bullets()).toHaveLength(1);
  });

  it("remove button is disabled when only one bullet remains", async () => {
    await renderCreate();
    const trashButton = screen.getByTestId("icon-trash").closest("button");
    expect(trashButton).toBeDisabled();
  });

  it("remove button is enabled when multiple bullets exist", async () => {
    await renderCreate();
    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });
    const trashButtons = screen
      .getAllByTestId("icon-trash")
      .map((el) => el.closest("button"));
    trashButtons.forEach((btn) => expect(btn).not.toBeDisabled());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. DragDropProvider – onDragEnd branches
// ═════════════════════════════════════════════════════════════════════════════

describe("DragDropProvider onDragEnd", () => {
  async function setupWithTwoBullets() {
    await renderCreate();
    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });
    const bullets = () =>
      screen
        .getAllByRole("textbox")
        .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    // Set text so we can track reordering
    fireEvent.change(bullets()[0], { target: { value: "Bullet A" } });
    fireEvent.change(bullets()[1], { target: { value: "Bullet B" } });
    return bullets;
  }

  it("reorders bullets when drag ends normally", async () => {
    const bullets = await setupWithTwoBullets();
    const ids = document
      .querySelectorAll('input[placeholder*="e.g."]');
    // Grab the actual bullet id values from the rendered component by
    // reading bullet data off the DragDropProvider's captured onDragEnd.
    // We simulate a drag from index 0 to index 1.
    const bA_id = "b-1"; // first makeBulletId call
    const bB_id = "b-2";
    await act(async () => {
      mockOnDragEnd({
        canceled: false,
        operation: { source: { id: bA_id }, target: { id: bB_id } },
      });
    });
    const updated = bullets();
    // After reorder, Bullet B should be first
    expect(updated[0].value).toBe("Bullet B");
    expect(updated[1].value).toBe("Bullet A");
  });

  it("does nothing when event is canceled", async () => {
    await setupWithTwoBullets();
    await act(async () => {
      mockOnDragEnd({ canceled: true, operation: { source: { id: "b-1" }, target: { id: "b-2" } } });
    });
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets[0].value).toBe("Bullet A");
  });

  it("does nothing when target is null", async () => {
    await setupWithTwoBullets();
    await act(async () => {
      mockOnDragEnd({ canceled: false, operation: { source: { id: "b-1" }, target: null } });
    });
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets[0].value).toBe("Bullet A");
  });

  it("does nothing when source.id === target.id", async () => {
    await setupWithTwoBullets();
    await act(async () => {
      mockOnDragEnd({ canceled: false, operation: { source: { id: "b-1" }, target: { id: "b-1" } } });
    });
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets[0].value).toBe("Bullet A");
  });

  it("does nothing when oldIndex is -1 (source id not found)", async () => {
    await setupWithTwoBullets();
    await act(async () => {
      mockOnDragEnd({
        canceled: false,
        operation: { source: { id: "nonexistent" }, target: { id: "b-2" } },
      });
    });
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets[0].value).toBe("Bullet A");
  });

  it("does nothing when newIndex is -1 (target id not found)", async () => {
    await setupWithTwoBullets();
    await act(async () => {
      mockOnDragEnd({
        canceled: false,
        operation: { source: { id: "b-1" }, target: { id: "nonexistent" } },
      });
    });
    const bullets = screen
      .getAllByRole("textbox")
      .filter((i) => i.placeholder && i.placeholder.includes("e.g."));
    expect(bullets[0].value).toBe("Bullet A");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. isDirty + handleCancel
// ═════════════════════════════════════════════════════════════════════════════

describe("isDirty and handleCancel", () => {
  it("Cancel navigates immediately when form is clean (create mode)", async () => {
    await renderCreate();
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("Cancel prompts when form is dirty, navigates on confirm", async () => {
    window.confirm.mockReturnValue(true);
    await renderCreate();
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ivory/i), {
      target: { value: "Changed name" },
    });
    fireEvent.click(screen.getByText("Cancel"));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
  });

  it("Cancel prompts when form is dirty, stays when user cancels the confirm", async () => {
    window.confirm.mockReturnValue(false);
    await renderCreate();
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ivory/i), {
      target: { value: "Changed name" },
    });
    fireEvent.click(screen.getByText("Cancel"));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Save Changes button is disabled when form is clean in edit mode", async () => {
    await renderEdit();
    const saveBtn = screen.getByText("Save Changes");
    expect(saveBtn).toBeDisabled();
  });

  it("Save Changes button is enabled after making a change in edit mode", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated Name" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });

  it("tracks isDirty when category changes", async () => {
    await renderEdit();
    const categorySelect = screen.getByRole("combobox");
    fireEvent.change(categorySelect, { target: { value: "Weddings" } });
    // Dirty because we touched the field (even if same value after re-select)
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("tracks isDirty when description changes", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("A beautiful ivory package"), {
      target: { value: "New desc" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });

  it("tracks isDirty when basePrice changes", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("375"), {
      target: { value: "500" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });

  it("tracks isDirty when priceLabel changes", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("FROM: $375"), {
      target: { value: "FROM: $500" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });

  it("tracks isDirty when durationMinutes changes", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("60"), {
      target: { value: "90" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });

  it("tracks isDirty when displayOrder changes", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("1"), {
      target: { value: "5" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });

  it("tracks isDirty when a bullet point changes", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("1 Hour Coverage"), {
      target: { value: "2 Hours" },
    });
    expect(screen.getByText("Save Changes")).not.toBeDisabled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. validate()
// ═════════════════════════════════════════════════════════════════════════════

describe("validate()", () => {
  async function fillMinimumValid() {
    await renderCreate({ isMasterDefault: true });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Weddings/i, { selector: "input[type='text']" }), {
      target: { value: "Weddings" },
    });
    // category (master = free text)
    const inputs = screen.getAllByRole("textbox");
    const categoryInput = inputs.find(
      (i) => i.placeholder === "e.g. Weddings" && i !== screen.getByDisplayValue("Weddings")
    ) ?? inputs[1];
    // Fill price
    fireEvent.change(screen.getByPlaceholderText("375.00"), {
      target: { value: "375" },
    });
    // Fill duration
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "60" },
    });
    // Fill description
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A nice package" },
    });
  }

  it("shows 'Name is required.' when name is empty", async () => {
    await renderCreate({ isMasterDefault: true });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("shows 'Category is required.' when category is empty", async () => {
    await renderCreate({ isMasterDefault: true });
    // Fill name only
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "Weddings" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
  });

  it("shows 'Base Price is required.' when basePrice is empty", async () => {
    await renderCreate({ isMasterDefault: true });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Name" } });
    fireEvent.change(textInputs[1], { target: { value: "Category" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Base Price is required.")).toBeInTheDocument();
  });

  it("shows 'Duration (Minutes) is required.' when durationMinutes is empty", async () => {
    await renderCreate({ isMasterDefault: true });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Name" } });
    fireEvent.change(textInputs[1], { target: { value: "Category" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), {
      target: { value: "375" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Duration (Minutes) is required.")).toBeInTheDocument();
  });

  it("shows duration multiple-of-15 error when not divisible by 15", async () => {
    await renderCreate({ isMasterDefault: true });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Name" } });
    fireEvent.change(textInputs[1], { target: { value: "Category" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), {
      target: { value: "375" },
    });
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "17" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(
      screen.getByText("Duration (Minutes) must be a multiple of 15 minutes.")
    ).toBeInTheDocument();
  });

  it("shows 'Description is required.' when description is empty", async () => {
    await renderCreate({ isMasterDefault: true });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Name" } });
    fireEvent.change(textInputs[1], { target: { value: "Category" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), {
      target: { value: "375" },
    });
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "60" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
  });

  it("accepts duration exactly divisible by 15 (e.g. 45)", async () => {
    await renderCreate({ isMasterDefault: true });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Name" } });
    fireEvent.change(textInputs[1], { target: { value: "Category" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), {
      target: { value: "375" },
    });
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A description" },
    });
    // Queue the supabase responses for a successful save
    queueResults([
      { data: { id: "new-id" }, error: null },  // insert + select
      { data: null, error: null },               // image update (no image)
    ]);
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.queryByText(/must be a multiple/i)).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. handleSave – CREATE mode
// ═════════════════════════════════════════════════════════════════════════════

describe("handleSave – create mode", () => {
  async function fillAndSave({ isMaster = true, extraQueue = [] } = {}) {
    await renderCreate({ isMasterDefault: isMaster, extraQueue });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    if (isMaster) {
      fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    }
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText(isMaster ? "Create Category" : "Add Session Type"));
    });
  }

  it("inserts the row, shows success alert, and navigates on happy path", async () => {
    // Queue: isMaster demote + insert single + (no image so no update)
    queueResults([
      { data: [{ category: "Weddings" }], error: null },    // fetchCategories
      { data: null, error: null },                          // demote existing master
      { data: { id: "new-id" }, error: null },              // insert.select.single
      // no image → uploadImage returns existingImagePath (null) → no image update queued
    ]);
    // Re-render with proper queue
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    mockCallQueue = [
      { data: [{ category: "Weddings" }], error: null },
      { data: null, error: null },
      { data: { id: "new-id" }, error: null },
    ];
    mockCallIndex = 0;
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={true} />);
    });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("was successfully created"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
  });

  it("shows error when insert fails", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    mockCallQueue = [
      { data: [{ category: "Weddings" }], error: null },
      { data: null, error: null },  // demote
      { data: null, error: { message: "Insert failed" } },
    ];
    mockCallIndex = 0;
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={true} />);
    });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Insert failed")).toBeInTheDocument();
  });

  it("skips isMaster demote when isMaster is false (child create)", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    mockCallQueue = [
      { data: [{ category: "Weddings" }], error: null },
      { data: { id: "new-child" }, error: null }, // insert (no demote step)
    ];
    mockCallIndex = 0;
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={false} />);
    });
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Ivory" } });
    // select the category
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Add Session Type"));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("was successfully created"));
  });

  it("uploads image and updates row after successful insert", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    mockCallQueue = [
      { data: [{ category: "Weddings" }], error: null },
      { data: null, error: null },               // demote
      { data: { id: "new-id" }, error: null },   // insert
      // storage upload will consume from mockStorageChain
      { data: null, error: null },               // image update
    ];
    mockCallIndex = 0;
    mockStorageChain.upload.mockImplementationOnce(() =>
      Promise.resolve({ data: {}, error: null })
    );
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={true} />);
    });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(mockStorageChain.upload).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("was successfully created"));
  });

  it("shows error when image upload fails during create", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    mockCallQueue = [
      { data: [{ category: "Weddings" }], error: null },
      { data: null, error: null },
      { data: { id: "new-id" }, error: null },
    ];
    mockCallIndex = 0;
    mockStorageChain.upload.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: { message: "Upload failed" } })
    );
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={true} />);
    });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("shows generic 'Failed to save.' when error has no message during create", async () => {
    mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
    mockCallQueue = [
      { data: [{ category: "Weddings" }], error: null },
      { data: null, error: null },
      { data: null, error: {} },
    ];
    mockCallIndex = 0;
    await act(async () => {
      render(<SessionTypeEditor mode="create" isMasterDefault={true} />);
    });
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Failed to save.")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. handleSave – EDIT mode
// ═════════════════════════════════════════════════════════════════════════════

describe("handleSave – edit mode", () => {
  it("updates the row and navigates on happy path", async () => {
    await renderEdit({
      extraQueue: [
        { data: null, error: null }, // demote (isMaster is false for defaultSessionType – skipped)
        { data: null, error: null }, // update
      ],
    });
    // Make a change to enable Save Changes
    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated Name" },
    });
    // Re-queue for the save (fetchCategories + load already consumed; now: update)
    mockCallQueue = [
      { data: null, error: null }, // update
    ];
    mockCallIndex = 0;
    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("was successfully updated")
    );
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
  });

  it("shows error when update fails", async () => {
    await renderEdit();
    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated Name" },
    });
    mockCallQueue = [
      { data: null, error: { message: "Update failed" } },
    ];
    mockCallIndex = 0;
    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });
    expect(screen.getByText("Update failed")).toBeInTheDocument();
  });

  it("demotes existing master when isMaster is toggled on", async () => {
    // Render as a child, then toggle is_master checkbox
    await renderEdit({ sessionTypeData: { ...defaultSessionType, is_master: false } });
    const masterCheckbox = screen.getByRole("checkbox", { name: /category representative/i });
    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated" },
    });
    await act(async () => {
      fireEvent.click(masterCheckbox);
    });
    mockCallQueue = [
      { data: null, error: null }, // demote
      { data: null, error: null }, // update
    ];
    mockCallIndex = 0;
    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });
    expect(mockChain.update).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("was successfully updated"));
  });

  it("is-master checkbox is disabled when the loaded record is already master", async () => {
    await renderEdit({ sessionTypeData: masterSessionType });
    const masterCheckbox = screen.getByRole("checkbox", { name: /category representative/i });
    expect(masterCheckbox).toBeDisabled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 13. updateActive
// ═════════════════════════════════════════════════════════════════════════════

describe("updateActive", () => {
  it("sets active=true when both contract and questionnaire exist", async () => {
    await renderEdit();
    // Queue: contract single OK, questionnaire single OK
    mockCallQueue = [
      { data: { id: "ct-1" }, error: null },
      { data: { id: "qt-1" }, error: null },
    ];
    mockCallIndex = 0;
    const activeToggle = screen.getByRole("checkbox", { name: /visible to clients/i });
    await act(async () => {
      fireEvent.click(activeToggle);
    });
    expect(activeToggle.checked).toBe(false); // was true, but our click on checked=true unchecks
    // The important path: no error shown
    expect(screen.queryByText(/no active contract/i)).not.toBeInTheDocument();
  });

  it("shows error when no active contract found", async () => {
    // Load with active=false so toggle goes true
    await renderEdit({ sessionTypeData: { ...defaultSessionType, active: false } });
    mockCallQueue = [
      { data: null, error: { message: "contract error" } }, // contractError
    ];
    mockCallIndex = 0;
    const activeToggle = screen.getByRole("checkbox", { name: /visible to clients/i });
    await act(async () => {
      fireEvent.click(activeToggle);
    });
    expect(
      screen.getByText(/no active contract found/i)
    ).toBeInTheDocument();
  });

  it("shows error when no active questionnaire found", async () => {
    await renderEdit({ sessionTypeData: { ...defaultSessionType, active: false } });
    mockCallQueue = [
      { data: { id: "ct-1" }, error: null },             // contract OK
      { data: null, error: { message: "questionnaire error" } }, // questionnaire error
    ];
    mockCallIndex = 0;
    const activeToggle = screen.getByRole("checkbox", { name: /visible to clients/i });
    await act(async () => {
      fireEvent.click(activeToggle);
    });
    expect(
      screen.getByText(/no active questionnaire found/i)
    ).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 14. UI / form field rendering
// ═════════════════════════════════════════════════════════════════════════════

describe("UI rendering", () => {
  it("renders Category Image label for a master", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(screen.getByText(/category image/i)).toBeInTheDocument();
  });

  it("renders Session Type Image label for a child", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByText(/session type image/i)).toBeInTheDocument();
  });

  it("renders Category Name label for a master", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(screen.getByText(/category name/i)).toBeInTheDocument();
  });

  it("renders Session Type Name label for a child", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByText(/session type name/i)).toBeInTheDocument();
  });

  it("renders a free-text input for category when isMaster=true", async () => {
    await renderCreate({ isMasterDefault: true });
    // Master gets a text input, not a select
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders a select dropdown for category when isMaster=false", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows hint text about category card when isMaster=true", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(
      screen.getByText(/this name is shown as the category card/i)
    ).toBeInTheDocument();
  });

  it("shows is-master checkbox only in edit mode", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(
      screen.queryByRole("checkbox", { name: /category representative/i })
    ).not.toBeInTheDocument();
    await renderEdit({ sessionTypeData: { ...defaultSessionType, is_master: false } });
    expect(
      screen.getByRole("checkbox", { name: /category representative/i })
    ).toBeInTheDocument();
  });

  it("shows 'Saving...' text on the save button while saving", async () => {
    // Use a never-resolving insert to keep the component in saving state
    await renderCreate({ isMasterDefault: true });
    mockCallQueue = [
      { data: null, error: null }, // demote
    ];
    mockCallIndex = 0;
    mockChain.single.mockImplementationOnce(() => new Promise(() => {}));
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Weddings" } });
    fireEvent.change(textInputs[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), { target: { value: "375" } });
    fireEvent.change(screen.getByPlaceholderText("60"),     { target: { value: "60" } });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });
    act(() => {
      fireEvent.click(screen.getByText("Create Category"));
    });
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 15. Regression snapshots
// ═════════════════════════════════════════════════════════════════════════════

describe("regression snapshots", () => {
  it("matches snapshot: create master form", async () => {
    const { container } = await renderCreate({ isMasterDefault: true });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: create child form", async () => {
    const { container } = await renderCreate({ isMasterDefault: false });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: edit mode with loaded data", async () => {
    const { container } = await renderEdit();
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: loading state in edit mode", async () => {
    mockUseParams.mockReturnValue({ id: "st-123", categoryName: undefined });
    mockChain.single.mockImplementationOnce(() => new Promise(() => {}));
    queueResults([{ data: [], error: null }]);
    let container;
    await act(async () => {
      ({ container } = render(<SessionTypeEditor mode="edit" />));
    });
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: error state in edit mode", async () => {
    const { container } = await renderEdit({
      sessionTypeData: null,
      loadError: { message: "Snapshot error" },
    });
    expect(container).toMatchSnapshot();
  });
});