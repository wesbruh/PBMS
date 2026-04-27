// tests/unit/frontend/OfferingsPage.test.jsx
//
// 100% coverage tests for ../src/admin/pages/Offerings/OfferingsPage.jsx

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock
//
// jest.mock() factories are hoisted above imports by Babel, so the factory
// body cannot reference variables that are declared later in the file — UNLESS
// those names start with "mock" (case-insensitive). We keep all mutable state
// in `mockCallQueue` / `mockCallIndex` and build a single chainable object
// (`mockChain`) whose methods are jest.fn()s that consume queued results.
// ─────────────────────────────────────────────────────────────────────────────

let mockCallQueue = [];
let mockCallIndex = 0;

function nextResult() {
  const result = mockCallQueue[mockCallIndex] ?? { data: null, error: null };
  mockCallIndex += 1;
  return Promise.resolve(result);
}

// One shared chainable object. Every builder method returns `mockChain` so
// arbitrary-length chains work (.from().select().eq().order()…).
// The object is also thenable so `await supabase.from(…)…` resolves directly.
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

// Attach implementations (done outside the factory to keep the factory lean)
Object.keys(mockChain).forEach((key) => {
  if (key === "then") return;
  if (key === "maybeSingle" || key === "single") {
    mockChain[key].mockImplementation(() => nextResult());
  } else {
    mockChain[key].mockReturnValue(mockChain);
  }
});

jest.mock("../../../../src/lib/viteApiUrl.js", () => ({
  SUPABASE_URL: "https://test.supabase.co",
}));

jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: new Proxy(
    {},
    {
      get(_, prop) {
        // Delegate every property access to mockChain.
        // mockChain is mock-prefixed so Jest's hoisting rules allow it.
        return (...args) => mockChain[prop](...args);
      },
    }
  ),
}));

// ── react-router-dom ──────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// ── SessionTypeCard ───────────────────────────────────────────────────────────
jest.mock("../../../../src/components/SessionTypeCard/SessionTypeCard.jsx", () => ({
  __esModule: true,
  default: ({ st, onEdit, onDelete, showEditControls }) => (
    <div data-testid={`session-card-${st.id}`}>
      <span>{st.name}</span>
      {showEditControls && (
        <>
          <button onClick={() => onEdit(st)}   data-testid={`edit-${st.id}`}>Edit</button>
          <button onClick={() => onDelete(st)} data-testid={`delete-${st.id}`}>Delete</button>
        </>
      )}
    </div>
  ),
}));

// ── lucide-react ──────────────────────────────────────────────────────────────
jest.mock("lucide-react", () => ({
  Plus:         () => <span data-testid="icon-plus" />,
  LoaderCircle: () => <span data-testid="icon-loader" />,
}));


// ── Component under test (imported AFTER all mocks are registered) ────────────
import OfferingsPage from "../../../../src/admin/pages/Offerings/OfferingsPage.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function queueResults(results) {
  mockCallQueue = results;
  mockCallIndex = 0;
}

async function renderPage() {
  let result;
  await act(async () => {
    result = render(<OfferingsPage />);
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const masterWeddings = {
  id: "master-1",
  name: "Weddings Master",
  category: "Weddings",
  is_master: true,
  active: true,
  image_path: null,
  display_order: 0,
};

const masterPortraits = {
  id: "master-2",
  name: "Portraits Master",
  category: "Portraits",
  is_master: true,
  active: false,                                      // inactive → "Inactive" badge
  image_path: "portraits/hero.jpg",                   // relative path
  display_order: 1,
};

const childIvory = {
  id: "child-1",
  name: "Ivory Package",
  category: "Weddings",
  is_master: false,
  active: true,
  image_path: "https://cdn.example.com/ivory.jpg",    // full http URL
  display_order: 2,
};

const childPearl = {
  id: "child-2",
  name: "Pearl Package",
  category: "Weddings",
  is_master: false,
  active: true,
  image_path: null,
  display_order: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Global beforeEach
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCallQueue = [];
  mockCallIndex = 0;
  jest.clearAllMocks();

  // Re-apply implementations after clearAllMocks wipes them
  Object.keys(mockChain).forEach((key) => {
    if (key === "then") return;
    if (key === "maybeSingle" || key === "single") {
      mockChain[key].mockImplementation(() => nextResult());
    } else {
      mockChain[key].mockReturnValue(mockChain);
    }
  });
  // Restore the thennable after clearAllMocks
  mockChain.then = (resolve, reject) => nextResult().then(resolve, reject);

  jest.spyOn(window, "confirm").mockReturnValue(false);
  jest.spyOn(window, "alert").mockImplementation(() => {});
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. getImageUrl (exercised via rendered <img> tags)
// ═════════════════════════════════════════════════════════════════════════════

describe("getImageUrl helper (via rendered output)", () => {
  it("renders 'No image' placeholder when image_path is null", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    expect(screen.getByText(/no image/i)).toBeInTheDocument();
  });

  it("builds a supabase storage URL for a relative image_path", async () => {
    queueResults([{ data: [masterPortraits], error: null }]);
    await renderPage();
    const img = screen.getByRole("img");
    expect(img.src).toMatch(/test\.supabase\.co.*portraits\/hero\.jpg/);
  });

  it("passes a full http URL through unchanged", async () => {
    const master = { ...masterWeddings, image_path: "https://cdn.example.com/photo.jpg" };
    queueResults([{ data: [master], error: null }]);
    await renderPage();
    const img = screen.getByRole("img");
    expect(img.src).toBe("https://cdn.example.com/photo.jpg");
  });

  it("prefixes VITE_SUPABASE_URL + storage path for any relative path", async () => {
    const master = { ...masterWeddings, image_path: "folder/sub/img.png" };
    queueResults([{ data: [master], error: null }]);
    await renderPage();
    const img = screen.getByRole("img");
    expect(img.src).toContain("test.supabase.co");
    expect(img.src).toContain("folder/sub/img.png");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. loadAll – initial data-loading states
// ═════════════════════════════════════════════════════════════════════════════

describe("loadAll", () => {
  it("shows loading spinner while fetching", async () => {
    // Never resolve so the component stays in loading state
    mockChain.then = () => new Promise(() => {});
    await act(async () => { render(<OfferingsPage />); });
    expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
    expect(screen.getByText(/loading questionnaire templates/i)).toBeInTheDocument();
    // restore for subsequent tests
    mockChain.then = (resolve, reject) => nextResult().then(resolve, reject);
  });

  it("shows 'No categories yet' when data is an empty array", async () => {
    queueResults([{ data: [], error: null }]);
    await renderPage();
    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first category/i)).toBeInTheDocument();
  });

  it("treats null data as an empty array", async () => {
    queueResults([{ data: null, error: null }]);
    await renderPage();
    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("shows a supabase error message", async () => {
    queueResults([{ data: null, error: { message: "DB connection failed" } }]);
    await renderPage();
    expect(screen.getByText("DB connection failed")).toBeInTheDocument();
  });

  it("shows 'Failed to load.' when error has no message property", async () => {
    queueResults([{ data: null, error: {} }]);
    await renderPage();
    expect(screen.getByText("Failed to load.")).toBeInTheDocument();
  });

  it("renders category cards when masters are present", async () => {
    queueResults([{ data: [masterWeddings, masterPortraits], error: null }]);
    await renderPage();
    expect(screen.getByText("Weddings")).toBeInTheDocument();
    expect(screen.getByText("Portraits")).toBeInTheDocument();
  });

  it("renders 'Select a Category' label when at least one master exists", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    expect(screen.getByText(/select a category/i)).toBeInTheDocument();
  });

  it("shows 'Inactive' badge for inactive masters", async () => {
    queueResults([{ data: [masterPortraits], error: null }]);
    await renderPage();
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
  });

  it("does NOT show 'Inactive' badge for active masters", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    expect(screen.queryByText(/inactive/i)).not.toBeInTheDocument();
  });

  it("always renders the page title and description", async () => {
    queueResults([{ data: [], error: null }]);
    await renderPage();
    expect(screen.getByText(/sessions & packages/i)).toBeInTheDocument();
    expect(screen.getByText(/click on a category/i)).toBeInTheDocument();
  });

  it("always renders the New Category button", async () => {
    queueResults([{ data: [], error: null }]);
    await renderPage();
    expect(screen.getByText(/new category/i)).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Header navigation
// ═════════════════════════════════════════════════════════════════════════════

describe("header navigation", () => {
  it("navigates to /admin/offerings/new when New Category is clicked", async () => {
    queueResults([{ data: [], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText(/new category/i));
    expect(mockNavigate).toHaveBeenCalledWith("/admin/offerings/new");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. handleSelectCategory – toggle / switch behaviour
// ═════════════════════════════════════════════════════════════════════════════

describe("handleSelectCategory", () => {
  it("selects a category and shows the expanded panel", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.getByText(/available packages in Weddings/i)).toBeInTheDocument();
  });

  it("deselects the category when the same card is clicked again", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.queryByText(/available packages in Weddings/i)).not.toBeInTheDocument();
  });

  it("switches to a different category when another card is clicked", async () => {
    queueResults([{ data: [masterWeddings, masterPortraits], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    fireEvent.click(screen.getByText("Portraits"));
    expect(screen.queryByText(/available packages in Weddings/i)).not.toBeInTheDocument();
    expect(screen.getByText(/available packages in Portraits/i)).toBeInTheDocument();
  });

  it("shows the master card inside the expanded panel", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.getByTestId(`session-card-${masterWeddings.id}`)).toBeInTheDocument();
  });

  it("shows child cards sorted by display_order inside the expanded panel", async () => {
    queueResults([{ data: [masterWeddings, childIvory, childPearl], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    const cards = screen.getAllByTestId(/^session-card-/);
    // master first, then Pearl (order 1) then Ivory (order 2)
    expect(cards[1].getAttribute("data-testid")).toBe(`session-card-${childPearl.id}`);
    expect(cards[2].getAttribute("data-testid")).toBe(`session-card-${childIvory.id}`);
  });

  it("shows only the master card when the category has no children", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.getAllByTestId(/^session-card-/)).toHaveLength(1);
  });

  it("shows the Add Package button in the expanded panel", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.getByText(/add package/i)).toBeInTheDocument();
  });

  it("navigates to the new session-type route when Add Package is clicked", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    fireEvent.click(screen.getByText(/add package/i));
    expect(mockNavigate).toHaveBeenCalledWith(
      `/admin/offerings/${encodeURIComponent("Weddings")}/session-types/new`
    );
  });

  it("does not show the expanded panel before any selection", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    expect(screen.queryByText(/available packages/i)).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. handleEdit
// ═════════════════════════════════════════════════════════════════════════════

describe("handleEdit", () => {
  it("navigates to the edit route for a master card", async () => {
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    fireEvent.click(screen.getByTestId(`edit-${masterWeddings.id}`));
    expect(mockNavigate).toHaveBeenCalledWith(`/admin/offerings/${masterWeddings.id}/edit`);
  });

  it("navigates to the edit route for a child card", async () => {
    queueResults([{ data: [masterWeddings, childIvory], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    fireEvent.click(screen.getByTestId(`edit-${childIvory.id}`));
    expect(mockNavigate).toHaveBeenCalledWith(`/admin/offerings/${childIvory.id}/edit`);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. handleDelete – user cancels (confirm returns false)
// ═════════════════════════════════════════════════════════════════════════════

describe("handleDelete – cancelled by user", () => {
  it("shows the correct confirm message for a master and aborts on cancel", async () => {
    window.confirm.mockReturnValue(false);
    queueResults([{ data: [masterWeddings], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(window.confirm).toHaveBeenCalledWith(
      `Delete the entire "${masterWeddings.category}" category? All session types under it will also be deleted.`
    );
    expect(mockChain.delete).not.toHaveBeenCalled();
  });

  it("shows the correct confirm message for a child and aborts on cancel", async () => {
    window.confirm.mockReturnValue(false);
    queueResults([{ data: [masterWeddings, childIvory], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.confirm).toHaveBeenCalledWith(`Delete "${childIvory.name}"?`);
    expect(mockChain.delete).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. handleDelete – child confirmed (happy path)
// ═════════════════════════════════════════════════════════════════════════════

describe("handleDelete – child confirmed (happy path)", () => {
  it("deactivates templates, deletes the row and reloads", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null }, // 1 initial loadAll
      { data: null,                error: null },           // 2 markActiveDelete maybeSingle (no template)
      { data: null,                error: null },           // 3 ContractTemplate update active=false
      { data: null,                error: null },           // 4 QuestionnaireTemplate update active=false
      { data: null,                error: null },           // 5 SessionType delete
      { data: [masterWeddings],    error: null },           // 6 reload
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(mockChain.delete).toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. handleDelete – master confirmed (happy path)
// ═════════════════════════════════════════════════════════════════════════════

describe("handleDelete – master confirmed (happy path)", () => {
  it("deletes the entire category, clears selection and reloads", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings],         error: null }, // 1 loadAll
      { data: null,                     error: null }, // 2 markActiveDelete maybeSingle
      { data: [{ id: "master-1" }],     error: null }, // 3 select ids in category
      { data: null,                     error: null }, // 4 ContractTemplate update active=false
      { data: null,                     error: null }, // 5 QuestionnaireTemplate update active=false
      { data: null,                     error: null }, // 6 SessionType delete
      { data: [],                       error: null }, // 7 reload
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(screen.queryByText(/available packages in Weddings/i)).not.toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("clears selectedCategory when the currently-selected master is deleted", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings],     error: null },
      { data: null,                 error: null },
      { data: [{ id: "master-1" }], error: null },
      { data: null,                 error: null },
      { data: null,                 error: null },
      { data: null,                 error: null },
      { data: [],                   error: null },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.getByText(/available packages in Weddings/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(screen.queryByText(/available packages in Weddings/i)).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. markActiveDelete branches
// ═════════════════════════════════════════════════════════════════════════════

describe("markActiveDelete – template referenced by contracts", () => {
  it("marks is_deleted=true on the template when contracts reference it", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: { id: "tmpl-1" },             error: null }, // template found
      { data: [{ id: "c1" }],               error: null }, // contracts exist
      { data: null,                         error: null }, // is_deleted update
      { data: null,                         error: null }, // ContractTemplate active=false
      { data: null,                         error: null }, // QuestionnaireTemplate active=false
      { data: null,                         error: null }, // delete
      { data: [masterWeddings],             error: null }, // reload
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).not.toHaveBeenCalled();
    expect(mockChain.update).toHaveBeenCalled();
  });
});

describe("markActiveDelete – template NOT referenced by contracts", () => {
  it("skips the is_deleted update when no contracts reference the template", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: { id: "tmpl-1" },             error: null },
      { data: [],                           error: null }, // no contracts
      { data: null,                         error: null }, // ContractTemplate active=false
      { data: null,                         error: null }, // QuestionnaireTemplate active=false
      { data: null,                         error: null }, // delete
      { data: [masterWeddings],             error: null }, // reload
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. handleDelete – every individual supabase error path
// ═════════════════════════════════════════════════════════════════════════════

describe("handleDelete – supabase error paths", () => {
  it("alerts when markActiveDelete activeTemplateError fires", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: null, error: { message: "Template query failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Template query failed"));
  });

  it("alerts when Contract.select inside markActiveDelete throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: { id: "tmpl-1" },             error: null },
      { data: null, error: { message: "Contract select failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Contract select failed"));
  });

  it("alerts when ContractTemplate is_deleted update throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: { id: "tmpl-1" },             error: null },
      { data: [{ id: "c1" }],               error: null },
      { data: null, error: { message: "Update is_deleted failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Update is_deleted failed"));
  });

  it("alerts when child ContractTemplate deactivation throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: null, error: null },
      { data: null, error: { message: "Contract deactivate failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Contract deactivate failed"));
  });

  it("alerts when child QuestionnaireTemplate deactivation throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: { message: "Questionnaire deactivate failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Questionnaire deactivate failed"));
  });

  it("alerts when child SessionType delete throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings, childIvory], error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: { message: "SessionType delete failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${childIvory.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("SessionType delete failed"));
  });

  it("alerts when master select-ids-in-category throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings], error: null },
      { data: null,             error: null },
      { data: null, error: { message: "Select ids failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Select ids failed"));
  });

  it("alerts when master ContractTemplate deactivation throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings],         error: null },
      { data: null,                     error: null },
      { data: [{ id: "master-1" }],     error: null },
      { data: null, error: { message: "Master contract deactivate failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Master contract deactivate failed"));
  });

  it("alerts when master QuestionnaireTemplate deactivation throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings],         error: null },
      { data: null,                     error: null },
      { data: [{ id: "master-1" }],     error: null },
      { data: null,                     error: null },
      { data: null, error: { message: "Master questionnaire deactivate failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Master questionnaire deactivate failed"));
  });

  it("alerts when master SessionType delete throws", async () => {
    window.confirm.mockReturnValue(true);
    queueResults([
      { data: [masterWeddings],         error: null },
      { data: null,                     error: null },
      { data: [{ id: "master-1" }],     error: null },
      { data: null,                     error: null },
      { data: null,                     error: null },
      { data: null, error: { message: "Master delete failed" } },
    ]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    await act(async () => {
      fireEvent.click(screen.getByTestId(`delete-${masterWeddings.id}`));
    });
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Master delete failed"));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. categoryChildren – display_order edge cases
// ═════════════════════════════════════════════════════════════════════════════

describe("categoryChildren sorting", () => {
  it("sorts children ascending by display_order", async () => {
    const cHigh = { ...childIvory, id: "c-high", display_order: 10 };
    const cLow  = { ...childPearl, id: "c-low",  display_order: 1  };
    queueResults([{ data: [masterWeddings, cHigh, cLow], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    const cards = screen.getAllByTestId(/^session-card-/);
    expect(cards[1].getAttribute("data-testid")).toBe("session-card-c-low");
    expect(cards[2].getAttribute("data-testid")).toBe("session-card-c-high");
  });

  it("treats undefined display_order as 0", async () => {
    const cNull = { ...childIvory, id: "c-null", display_order: undefined };
    const cFive = { ...childPearl, id: "c-five", display_order: 5 };
    queueResults([{ data: [masterWeddings, cNull, cFive], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    const cards = screen.getAllByTestId(/^session-card-/);
    expect(cards[1].getAttribute("data-testid")).toBe("session-card-c-null");
    expect(cards[2].getAttribute("data-testid")).toBe("session-card-c-five");
  });

  it("shows no child cards when no category is selected", async () => {
    queueResults([{ data: [masterWeddings, childIvory], error: null }]);
    await renderPage();
    expect(screen.queryByTestId(`session-card-${childIvory.id}`)).not.toBeInTheDocument();
  });

  it("only shows children belonging to the selected category", async () => {
    const childPortrait = { ...childIvory, id: "portrait-child", category: "Portraits" };
    queueResults([{ data: [masterWeddings, masterPortraits, childIvory, childPortrait], error: null }]);
    await renderPage();
    fireEvent.click(screen.getByText("Weddings"));
    expect(screen.getByTestId(`session-card-${childIvory.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`session-card-${childPortrait.id}`)).not.toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. Snapshot / regression
// ═════════════════════════════════════════════════════════════════════════════

describe("regression snapshots", () => {
  it("matches snapshot: loading state", async () => {
    mockChain.then = () => new Promise(() => {});
    let container;
    await act(async () => { ({ container } = render(<OfferingsPage />)); });
    expect(container).toMatchSnapshot();
    mockChain.then = (resolve, reject) => nextResult().then(resolve, reject);
  });

  it("matches snapshot: empty state", async () => {
    queueResults([{ data: [], error: null }]);
    const { container } = await renderPage();
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: error state", async () => {
    queueResults([{ data: null, error: { message: "Snap error" } }]);
    const { container } = await renderPage();
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: masters list without selection", async () => {
    queueResults([{ data: [masterWeddings, masterPortraits], error: null }]);
    const { container } = await renderPage();
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot: expanded category with children", async () => {
    queueResults([{ data: [masterWeddings, childIvory, childPearl], error: null }]);
    const { container } = await renderPage();
    act(() => fireEvent.click(screen.getByText("Weddings")));
    expect(container).toMatchSnapshot();
  });
});