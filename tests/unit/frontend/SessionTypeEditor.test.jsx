import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─────────────────────────────────────────────────────────────────────────────
// Mock queues
// ─────────────────────────────────────────────────────────────────────────────

let mockSingleQueue = [];
let mockSingleIndex = 0;
function nextSingle() {
  const r = mockSingleQueue[mockSingleIndex] ?? { data: null, error: null };
  mockSingleIndex += 1;
  return Promise.resolve(r);
}

let mockThenQueue = [];
let mockThenIndex = 0;
function nextThen() {
  const r = mockThenQueue[mockThenIndex] ?? { data: null, error: null };
  mockThenIndex += 1;
  return Promise.resolve(r);
}

let mockUploadQueue = [];
let mockUploadIndex = 0;
function nextUpload() {
  const r = mockUploadQueue[mockUploadIndex] ?? { data: null, error: null };
  mockUploadIndex += 1;
  return Promise.resolve(r);
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockStorageChain = {
  from: jest.fn(),
  upload: jest.fn(),
};

const mockChain = {
  from: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  in: jest.fn(),
  order: jest.fn(),
  maybeSingle: jest.fn(),
  single: jest.fn(),
  then: (resolve, reject) => nextThen().then(resolve, reject),
};

function resetChainDefaults() {
  Object.keys(mockChain).forEach((key) => {
    if (key === "then") return;
    if (key === "single" || key === "maybeSingle") {
      mockChain[key].mockImplementation(() => nextSingle());
    } else {
      mockChain[key].mockReturnValue(mockChain);
    }
  });

  mockChain.then = (resolve, reject) => nextThen().then(resolve, reject);

  mockStorageChain.from.mockReturnValue(mockStorageChain);
  mockStorageChain.upload.mockImplementation(() => nextUpload());
}

jest.mock("../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: (...args) => mockChain.from(...args),
    storage: {
      from: (...args) => mockStorageChain.from(...args),
    },
  },
}));

jest.mock("../../../src/lib/viteApiUrl.js", () => ({
  SUPABASE_URL: "https://test.supabase.co",
}));

// ─────────────────────────────────────────────────────────────────────────────
// Router mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DnD mocks
// ─────────────────────────────────────────────────────────────────────────────

let mockOnDragEnd = null;

jest.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragEnd }) => {
    mockOnDragEnd = onDragEnd;
    return <div data-testid="dnd-provider">{children}</div>;
  },
}));

jest.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: jest.fn(),
    handleRef: jest.fn(),
    isDragSource: false,
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Icon mocks
// ─────────────────────────────────────────────────────────────────────────────

jest.mock("lucide-react", () => ({
  Upload: () => <span data-testid="icon-upload" />,
  ImageMinus: () => <span data-testid="icon-image-minus" />,
  Plus: () => <span data-testid="icon-plus" />,
  GripVertical: () => <span data-testid="icon-grip" />,
  Trash2: () => <span data-testid="icon-trash" />,
  LoaderCircle: () => <span data-testid="icon-loader" />,
}));

global.URL.createObjectURL = jest.fn(() => "blob:mock-url");

// ─────────────────────────────────────────────────────────────────────────────
// Component under test
// ─────────────────────────────────────────────────────────────────────────────

import SessionTypeEditor from "../../../src/admin/pages/Offerings/SessionTypeEditor.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Queue helpers
// ─────────────────────────────────────────────────────────────────────────────

function setThenQueue(...results) {
  mockThenQueue = results;
  mockThenIndex = 0;
}

function setSingleQueue(...results) {
  mockSingleQueue = results;
  mockSingleIndex = 0;
}

function setUploadQueue(...results) {
  mockUploadQueue = results;
  mockUploadIndex = 0;
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
// Render helpers
// ─────────────────────────────────────────────────────────────────────────────

async function renderCreate({ isMasterDefault = false, categories } = {}) {
  mockUseParams.mockReturnValue({ id: undefined, categoryName: undefined });
  setThenQueue({
    data: categories ?? [{ category: "Weddings" }, { category: "Portraits" }],
    error: null,
  });
  setSingleQueue();

  let result;
  await act(async () => {
    result = render(
      <SessionTypeEditor mode="create" isMasterDefault={isMasterDefault} />
    );
  });
  return result;
}

async function renderCreateWithCategoryParam(categoryName, isMasterDefault = false) {
  mockUseParams.mockReturnValue({ id: undefined, categoryName });
  setThenQueue({ 
    data: [{ category: "Weddings" }, { category: "Portraits" }], 
    error: null 
  });
  setSingleQueue();

  let result;
  await act(async () => {
    result = render(
      <SessionTypeEditor mode="create" isMasterDefault={isMasterDefault} />
    );
  });
  return result;
}

async function renderEdit({
  sessionTypeData = defaultSessionType,
  loadError = null,
  extraThen = [],
  extraSingle = [],
} = {}) {
  mockUseParams.mockReturnValue({ id: "st-123", categoryName: undefined });

  setThenQueue(
    { data: [{ category: "Weddings" }], error: null },
    ...extraThen
  );

  setSingleQueue(
    { data: sessionTypeData, error: loadError },
    ...extraSingle
  );

  let result;
  await act(async () => {
    result = render(<SessionTypeEditor mode="edit" />);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM helpers
// ─────────────────────────────────────────────────────────────────────────────

function getBulletSection() {
  return screen.getByText(/what's included/i).parentElement;
}

function getBulletInputs() {
  return Array.from(
    getBulletSection().querySelectorAll('input[type="text"]')
  );
}

async function fillValidMasterCreateForm() {
  const textboxes = screen.getAllByRole("textbox");

  fireEvent.change(textboxes[0], { target: { value: "Weddings" } });
  fireEvent.change(textboxes[1], { target: { value: "Weddings" } });
  fireEvent.change(screen.getByPlaceholderText("375.00"), {
    target: { value: "375" },
  });
  fireEvent.change(screen.getByPlaceholderText("60"), {
    target: { value: "60" },
  });
  fireEvent.change(screen.getByPlaceholderText(/short description/i), {
    target: { value: "A desc" },
  });
}

async function fillValidChildCreateForm() {
  const textboxes = screen.getAllByRole("textbox");

  fireEvent.change(textboxes[0], { target: { value: "Ivory Package" } });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "Weddings" },
  });
  fireEvent.change(screen.getByPlaceholderText("375.00"), {
    target: { value: "375" },
  });
  fireEvent.change(screen.getByPlaceholderText("60"), {
    target: { value: "60" },
  });
  fireEvent.change(screen.getByPlaceholderText(/short description/i), {
    target: { value: "A desc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Global hooks
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSingleQueue = [];
  mockSingleIndex = 0;
  mockThenQueue = [];
  mockThenIndex = 0;
  mockUploadQueue = [];
  mockUploadIndex = 0;
  mockOnDragEnd = null;

  jest.clearAllMocks();
  resetChainDefaults();

  jest.spyOn(window, "confirm").mockReturnValue(true);
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("getPublicUrl helper (via rendered preview)", () => {
  it("renders no img when image_path is null", async () => {
    await renderEdit({ sessionTypeData: { ...defaultSessionType, image_path: null } });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("passes an http URL through unchanged", async () => {
    await renderEdit({
      sessionTypeData: {
        ...defaultSessionType,
        image_path: "https://cdn.example.com/photo.jpg",
      },
    });
    expect(screen.getByRole("img").src).toBe("https://cdn.example.com/photo.jpg");
  });

  it("builds a supabase storage URL for a relative path", async () => {
    await renderEdit({
      sessionTypeData: {
        ...defaultSessionType,
        image_path: "folder/image.jpg",
      },
    });
    expect(screen.getByRole("img").src).toMatch(
      /test\.supabase\.co.*folder\/image\.jpg/
    );
  });
});

describe("page title and loading", () => {
  it("shows create category heading", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(screen.getByRole("heading")).toHaveTextContent("Create Category");
  });

  it("shows add session type heading", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByRole("heading")).toHaveTextContent("Add Session Type");
  });

  it("shows edit category heading", async () => {
    await renderEdit({ sessionTypeData: masterSessionType });
    expect(screen.getByRole("heading")).toHaveTextContent("Edit Category");
  });

  it("shows spinner while loading edit mode", async () => {
    mockUseParams.mockReturnValue({ id: "st-123", categoryName: undefined });
    setThenQueue({ data: [], error: null });
    mockChain.single.mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<SessionTypeEditor mode="edit" />);
    });

    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.getByText(/loading session type editor/i)).toBeInTheDocument();
  });
});

describe("load in edit mode", () => {
  it("populates all loaded fields", async () => {
    await renderEdit();

    expect(screen.getByDisplayValue("Ivory Package")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Weddings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A beautiful ivory package")).toBeInTheDocument();
    expect(screen.getByDisplayValue("375")).toBeInTheDocument();
    expect(screen.getByDisplayValue("FROM: $375")).toBeInTheDocument();
    expect(screen.getByDisplayValue("60")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1 Hour Coverage")).toBeInTheDocument();
    expect(screen.getByDisplayValue("35+ edited photos")).toBeInTheDocument();
  });

  it("falls back to a single empty bullet when bullet_points is null", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, bullet_points: null },
    });

    const bullets = getBulletInputs();
    expect(bullets).toHaveLength(1);
    expect(bullets[0].value).toBe("");
  });

  it("falls back to a single empty bullet when bullet_points is empty", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, bullet_points: [] },
    });

    const bullets = getBulletInputs();
    expect(bullets).toHaveLength(1);
    expect(bullets[0].value).toBe("");
  });

  it("shows load error message", async () => {
    await renderEdit({
      sessionTypeData: null,
      loadError: { message: "Not found" },
    });

    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("shows fallback load error message", async () => {
    await renderEdit({
      sessionTypeData: null,
      loadError: {},
    });

    expect(screen.getByText("Failed to load.")).toBeInTheDocument();
  });
});

describe("fetchCategories", () => {
  it("populates child category dropdown", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByRole("option", { name: "Weddings" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Portraits" })).toBeInTheDocument();
  });

  it("deduplicates and filters falsy categories", async () => {
    await renderCreate({
      isMasterDefault: false,
      categories: [
        { category: "Weddings" },
        { category: "Weddings" },
        { category: "" },
        { category: null },
      ],
    });

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
  });

  it("prefills category from route param", async () => {
    await renderCreateWithCategoryParam("Portraits", false);
    expect(screen.getByRole("combobox")).toHaveValue("Portraits");
  });
});

describe("image helpers", () => {
  it("shows upload placeholder when no image is set", async () => {
    await renderCreate();
    expect(screen.getByText(/click to upload image/i)).toBeInTheDocument();
  });

  it("shows image preview after file selection", async () => {
    await renderCreate();

    const input = document.querySelector('input[type="file"]');
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByRole("img", { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /preview/i }).src).toBe("blob:mock-url");
  });

  it("clears image preview", async () => {
    await renderCreate();

    const input = document.querySelector('input[type="file"]');
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle("Remove Image"));
    });

    expect(screen.queryByRole("img", { name: /preview/i })).not.toBeInTheDocument();
  });
});

describe("bullet point helpers", () => {
  it("renders one empty bullet by default in create mode", async () => {
    await renderCreate();
    expect(getBulletInputs()).toHaveLength(1);
  });

  it("addBullet appends a new row", async () => {
    await renderCreate();

    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });

    expect(getBulletInputs()).toHaveLength(2);
  });

  it("updateBullet changes the correct bullet text", async () => {
    await renderCreate();

    fireEvent.change(getBulletInputs()[0], {
      target: { value: "My bullet" },
    });

    expect(getBulletInputs()[0].value).toBe("My bullet");
  });

  it("removeBullet removes the correct row", async () => {
    await renderCreate();

    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });

    const trashButtons = screen
      .getAllByTestId("icon-trash")
      .map((el) => el.closest("button"));

    await act(async () => {
      fireEvent.click(trashButtons[0]);
    });

    expect(getBulletInputs()).toHaveLength(1);
  });

  it("remove button is disabled when only one bullet remains", async () => {
    await renderCreate();
    expect(screen.getByTestId("icon-trash").closest("button")).toBeDisabled();
  });
});

describe("drag and drop", () => {
  async function setupTwoBullets() {
    await renderCreate();

    await act(async () => {
      fireEvent.click(screen.getByText(/add bullet point/i));
    });

    const inputs = getBulletInputs();
    fireEvent.change(inputs[0], { target: { value: "Bullet A" } });
    fireEvent.change(inputs[1], { target: { value: "Bullet B" } });
  }

  it("reorders bullets when drag ends normally", async () => {
    await setupTwoBullets();

    let inputs = getBulletInputs();
    const firstid = inputs[0].getAttribute("data-bullet-id");
    const secondid = inputs[1].getAttribute("data-bullet-id");
    
    await act(async () => {
      mockOnDragEnd({
        canceled: false,
        operation: {
          source: { id: firstid },
          target: { id: secondid },
        },
      });
    });

    inputs = getBulletInputs();
    expect(inputs[0].value).toBe("Bullet B");
    expect(inputs[1].value).toBe("Bullet A");
  });

  it("does nothing when drag is canceled", async () => {
    await setupTwoBullets();

    await act(async () => {
      mockOnDragEnd({
        canceled: true,
        operation: {
          source: { id: "b-1" },
          target: { id: "b-2" },
        },
      });
    });

    const inputs = getBulletInputs();
    expect(inputs[0].value).toBe("Bullet A");
    expect(inputs[1].value).toBe("Bullet B");
  });

  it("does nothing when target is null", async () => {
    await setupTwoBullets();

    await act(async () => {
      mockOnDragEnd({
        canceled: false,
        operation: {
          source: { id: "b-1" },
          target: null,
        },
      });
    });

    const inputs = getBulletInputs();
    expect(inputs[0].value).toBe("Bullet A");
    expect(inputs[1].value).toBe("Bullet B");
  });

  it("does nothing when source and target are the same", async () => {
    await setupTwoBullets();

    await act(async () => {
      mockOnDragEnd({
        canceled: false,
        operation: {
          source: { id: "b-1" },
          target: { id: "b-1" },
        },
      });
    });

    const inputs = getBulletInputs();
    expect(inputs[0].value).toBe("Bullet A");
    expect(inputs[1].value).toBe("Bullet B");
  });
});

describe("cancel and dirty state", () => {
  it("navigates immediately when create form is clean", async () => {
    await renderCreate();
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
  });

  it("prompts before leaving when form is dirty", async () => {
    window.confirm.mockReturnValue(false);

    await renderCreate();
    fireEvent.change(getBulletInputs()[0], {
      target: { value: "changed" },
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("save button is disabled in edit mode when form is clean", async () => {
    await renderEdit();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  it("save button becomes enabled after a change in edit mode", async () => {
    await renderEdit();

    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated" },
    });

    expect(screen.getByRole("button", { name: "Save Changes" })).not.toBeDisabled();
  });
});

describe("validation", () => {
  it("shows validation errors for missing required fields", async () => {
    await renderCreate({ isMasterDefault: true });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Category" }));
    });

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("shows invalid duration error", async () => {
    await renderCreate({ isMasterDefault: true });

    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "Weddings" } });
    fireEvent.change(textboxes[1], { target: { value: "Weddings" } });
    fireEvent.change(screen.getByPlaceholderText("375.00"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByPlaceholderText("60"), {
      target: { value: "17" },
    });
    fireEvent.change(screen.getByPlaceholderText(/short description/i), {
      target: { value: "A desc" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Category" }));
    });

    expect(
      screen.getByText("Duration (Minutes) must be a multiple of 15 minutes.")
    ).toBeInTheDocument();
  });
});

describe("handleSave - create mode", () => {
  it("creates a master category as inactive even if create mode active toggle exists", async () => {
    await renderCreate({ isMasterDefault: true });
    await fillValidMasterCreateForm();

    setThenQueue({ data: null, error: null });
    setSingleQueue({ data: { id: "new-id" }, error: null });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Category" }));
    });

    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Weddings",
        category: "Weddings",
        active: false,
        is_master: true,
      })
    );

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("was successfully created")
    );
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
  });

  it("creates a child session type without demoting when isMaster is false", async () => {
    await renderCreate({ isMasterDefault: false });
    await fillValidChildCreateForm();

    setSingleQueue({ data: { id: "new-child" }, error: null });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Session Type" }));
    });

    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ivory Package",
        category: "Weddings",
        active: false,
        is_master: false,
      })
    );

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("was successfully created")
    );
  });

  it("shows save error when insert fails", async () => {
    await renderCreate({ isMasterDefault: true });
    await fillValidMasterCreateForm();

    setThenQueue({ data: null, error: null });
    setSingleQueue({ data: null, error: { message: "Insert failed" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Category" }));
    });

    expect(screen.getByText("Insert failed")).toBeInTheDocument();
  });

  it("uploads image and updates row after create", async () => {
    await renderCreate({ isMasterDefault: true });
    await fillValidMasterCreateForm();

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(document.querySelector('input[type="file"]'), {
        target: { files: [file] },
      });
    });

    setThenQueue(
      { data: null, error: null },
      { data: null, error: null }
    );
    setSingleQueue({ data: { id: "new-id" }, error: null });
    setUploadQueue({ data: {}, error: null });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create Category" }));
    });

    expect(mockStorageChain.upload).toHaveBeenCalled();
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ image_path: expect.any(String) })
    );
  });
});

describe("handleSave - edit mode", () => {
  it("updates row and navigates on success", async () => {
    await renderEdit();

    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated" },
    });

    setThenQueue({ data: null, error: null });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated",
        active: true,
      })
    );

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("was successfully updated")
    );
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings");
  });

  it("shows update error when update fails", async () => {
    await renderEdit();

    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated" },
    });

    setThenQueue({ data: null, error: { message: "Update failed" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    });

    expect(screen.getByText("Update failed")).toBeInTheDocument();
  });

  it("demotes existing master when checkbox is toggled on", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, is_master: false },
    });

    fireEvent.click(
      screen.getByRole("checkbox", { name: /category representative/i })
    );
    fireEvent.change(screen.getByDisplayValue("Ivory Package"), {
      target: { value: "Updated" },
    });

    setThenQueue(
      { data: null, error: null },
      { data: null, error: null }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_master: false })
    );
  });

  it("disables is-master checkbox when loaded record is already master", async () => {
    await renderEdit({ sessionTypeData: masterSessionType });

    expect(
      screen.getByRole("checkbox", { name: /category representative/i })
    ).toBeDisabled();
  });
});

describe("updateActive", () => {
  it("is disabled in create mode", async () => {
    await renderCreate();
    expect(
      screen.getByRole("checkbox", { name: /visible to clients/i })
    ).toBeDisabled();
  });

  it("sets active when both contract and questionnaire exist in edit mode", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, active: false },
    });

    const toggle = screen.getByRole("checkbox", { name: /visible to clients/i });

    setSingleQueue(
      { data: { id: "ct-1" }, error: null },
      { data: { id: "qt-1" }, error: null }
    );

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle).toBeChecked();
  });

  it("shows error when no active contract exists", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, active: false },
    });

    const toggle = screen.getByRole("checkbox", { name: /visible to clients/i });

    setSingleQueue({ data: null, error: { message: "contract error" } });

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByText(/no active contract found/i)).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  it("shows error when no active questionnaire exists", async () => {
    await renderEdit({
      sessionTypeData: { ...defaultSessionType, active: false },
    });

    const toggle = screen.getByRole("checkbox", { name: /visible to clients/i });

    setSingleQueue(
      { data: { id: "ct-1" }, error: null },
      { data: null, error: { message: "questionnaire error" } }
    );

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByText(/no active questionnaire found/i)).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });
});

describe("UI rendering", () => {
  it("renders category image label for master", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(screen.getByText(/category image/i)).toBeInTheDocument();
  });

  it("renders session type image label for child", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByText(/session type image/i)).toBeInTheDocument();
  });

  it("renders free text category input for master", async () => {
    await renderCreate({ isMasterDefault: true });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders select dropdown for child", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows is-master checkbox only in edit mode", async () => {
    await renderCreate({ isMasterDefault: false });
    expect(
      screen.queryByRole("checkbox", { name: /category representative/i })
    ).not.toBeInTheDocument();

    await renderEdit();
    expect(
      screen.getByRole("checkbox", { name: /category representative/i })
    ).toBeInTheDocument();
  });
});