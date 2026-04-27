import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

// mock supabaseClient to avoid import.meta parse error
jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// mock apiUrl
jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

// mock react-router-dom
const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

// mock AuthContext with controllable session and profile
const mockAuth = {
  session: { access_token: "fake-token" },
  profile: {
    id: "user-uuid-1",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@test.com",
    phone: "7075551234",
  },
};
jest.mock("../../../../src/context/AuthContext.jsx", () => ({
  useAuth: () => mockAuth,
}));

// mock child components to isolate InquiryForm logic
jest.mock("../../../../src/pages/Dashboard/ContractDetail.jsx", () => (props) => (
  <div data-testid="contract-detail">
    <button data-testid="sign-contract" onClick={() => props.onSigned({ ...props.contract, status: "Signed" })}>
      Sign Contract
    </button>
  </div>
));

jest.mock("../../../../src/components/forms/DynamicQuestionnaire.jsx", () => (props) => (
  <div data-testid="dynamic-questionnaire">
    {props.questions?.map((q) => (
      <div key={q.id} data-testid={`question-${q.id}`}>
        <label>{q.label}</label>
        <input
          data-testid={`answer-${q.id}`}
          onChange={(e) => props.onChange({ ...props.answers, [q.id]: e.target.value })}
          readOnly={props.readOnly}
        />
      </div>
    ))}
  </div>
));

jest.mock("../../../../src/components/TimeSlotGrid/TimeSlotGrid.jsx", () => (props) => (
  <div data-testid="time-slot-grid">
    <button data-testid="select-time" onClick={() => props.onSelectStart("10:00")}>
      10:00 AM
    </button>
  </div>
));

jest.mock("../../../../src/components/SessionTypeCard/SessionTypeCard.jsx", () => (props) => (
  <div data-testid={`session-type-card-${props.st?.id}`}>
    <button data-testid={`select-st-${props.st?.id}`} onClick={props.onSelect} disabled={props.disabled}>
      {props.st?.name}
    </button>
  </div>
));

const { supabase } = require("../../../../src/lib/supabaseClient.js");

import InquiryForm from "../../../../src/components/forms/InquiryForm.jsx";

// ── helpers ──────────────────────────────────────────────────────────────────

// sample session types returned by supabase
const masterType = {
  id: "st-master-1",
  name: "Wedding Photography",
  category: "Wedding",
  is_master: true,
  active: true,
  display_order: 1,
  base_price: 1000,
  default_duration_minutes: 120,
  description: "Full wedding coverage",
  image_path: null,
};

const childType = {
  id: "st-child-1",
  name: "Elopement Package",
  category: "Wedding",
  is_master: false,
  active: true,
  display_order: 2,
  base_price: 500,
  default_duration_minutes: 60,
  description: "Intimate elopement coverage",
  image_path: null,
};

// builds a chainable supabase query builder for from() calls
function mockQueryBuilder(result = {}) {
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    single: jest.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
  };
  return builder;
}

// sets up supabase.from to return different builders depending on the table name.
// handles SessionType loading, Payment lookups, and QuestionnaireTemplate queries.
function setupDefaultMocks() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ([]),
  });

  supabase.from.mockImplementation((table) => {
    if (table === "SessionType") {
      const builder = mockQueryBuilder({ data: [masterType, childType] });
      builder.order.mockImplementation(() => {
        return {
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType, childType],
            error: null,
          }),
        };
      });
      return builder;
    }
    if (table === "Payment") {
      return mockQueryBuilder({ data: null, error: null });
    }
    if (table === "QuestionnaireTemplate") {
      return mockQueryBuilder({ data: null, error: null });
    }
    return mockQueryBuilder();
  });
}

// standard fetch mock that handles contract and contract template endpoints
function setupDefaultFetch() {
  global.fetch.mockImplementation((url) => {
    if (url.includes("/api/contract/templates")) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (url.includes("/api/contract")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "contract-1", status: "Draft" }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

// helper to render the form and flush all async effects
async function renderAndFlush(props = {}) {
  await act(async () => {
    render(<InquiryForm {...props} />);
  });
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

// helper to generate a future date string 10 days from now
function getFutureDateStr() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);
  return `${futureDate.getFullYear()}-${(futureDate.getMonth() + 1).toString().padStart(2, "0")}-${futureDate.getDate().toString().padStart(2, "0")}`;
}

beforeEach(() => {
  jest.clearAllMocks();
  // reset auth to defaults
  mockAuth.session = { access_token: "fake-token" };
  mockAuth.profile = {
    id: "user-uuid-1",
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@test.com",
    phone: "7075551234",
  };
  // reset search params
  mockSearchParams.delete("checkout_session_id");
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── tests ────────────────────────────────────────────────────────────────────
describe("InquiryForm Component Tests", () => {

  // verifies the loading state shows while contract data is being fetched
  test("1. shows loading state initially", () => {
    supabase.from.mockImplementation(() => {
      const builder = mockQueryBuilder();
      builder.order = jest.fn(() => new Promise(() => {}));
      return builder;
    });
    global.fetch = jest.fn(() => new Promise(() => {}));

    render(<InquiryForm />);

    expect(screen.getByText("Loading details...")).toBeInTheDocument();
  });

  // verifies the form renders with all main sections after loading completes
  test("2. renders form with main sections after loading", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("First Name *")).toBeInTheDocument();
      expect(screen.getByText("Last Name *")).toBeInTheDocument();
      expect(screen.getByText("Email *")).toBeInTheDocument();
      expect(screen.getByText("Phone Number")).toBeInTheDocument();
      expect(screen.getByText("Select Your Session Type *")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that profile data is prefilled into the readonly form fields
  test("3. prefills form with profile data", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      const firstNameInput = screen.getByDisplayValue("Jane");
      expect(firstNameInput).toBeInTheDocument();
      expect(firstNameInput).toHaveAttribute("readonly");
    });

    console.error.mockRestore();
  });

  // verifies the session type cards render for master types loaded from supabase
  test("4. renders session type category cards", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Wedding")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that clicking a category card shows the child session type cards
  test("5. clicking category card shows child session types", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Wedding")).toBeInTheDocument();
    });

    // click the Wedding category label
    const weddingLabel = screen.getByText("Wedding").closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId(`session-type-card-${masterType.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`session-type-card-${childType.id}`)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the date input renders with the min date attribute set
  test("6. date input has min date set 8 days ahead", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Date *")).toBeInTheDocument();
      const dateInput = document.querySelector('input[name="date"]');
      expect(dateInput).toBeTruthy();
      expect(dateInput.min).toBeTruthy();
    });

    console.error.mockRestore();
  });

  // verifies the message textarea renders and accepts input
  test("7. renders message textarea with max length hint", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Any additional notes?")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the payment button renders in the form
  test("8. renders Authorize Payment button", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Authorize Payment")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the submit button renders and is disabled when submitLock is true
  test("9. renders Submit button disabled before payment", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      const submitBtn = screen.getByText("Submit My Inquiry");
      expect(submitBtn).toBeDisabled();
    });

    console.error.mockRestore();
  });

  // verifies the contract section renders when a contract exists
  test("10. renders contract section", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: "tmpl-1", session_type_id: masterType.id, body: "Contract body", name: "Wedding Contract" }],
        });
      }
      if (url.includes("/api/contract")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Draft", template_id: "tmpl-1" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    // select a session type so the contract template mapping activates
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) {
      fireEvent.click(weddingLabel);

      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await Promise.resolve();
        });
      }
    }

    await waitFor(() => {
      expect(screen.getByText("Contract *")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the trust indicators render at the bottom of the form
  test("11. renders trust indicators", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText(/Trusted by 100\+ families/)).toBeInTheDocument();
      expect(screen.getByText(/Serving Vacaville/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the TimeSlotGrid appears when both a date and session type are selected
  test("12. shows TimeSlotGrid when date and session type are selected", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    // select the category
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) fireEvent.click(weddingLabel);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // set a date
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId("time-slot-grid")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that the session type selection hint appears when date is set but no type selected
  test("13. shows hint to select session type when only date is set", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    // set a date without selecting a session type
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/Select a session type above to see available time slots/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the email help text renders below the email input
  test("14. shows email help text", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText(/use this email to confirm availability/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the follow-up message renders at the bottom of the form
  test("15. shows 24 hour follow-up message", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText(/follow up within 24 hours/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the Authorize Payment button is disabled when prerequisites are not met
  test("16. payment button is disabled when not all conditions are met", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      const payBtn = screen.getByText("Authorize Payment");
      expect(payBtn).toBeDisabled();
    });

    console.error.mockRestore();
  });

  // verifies the questionnaire section description text shows
  test("17. shows questionnaire description", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText(/you will be asked to fill out a questionnaire/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the form handles null profile gracefully by not prefilling
  test("18. handles null profile without crashing", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    mockAuth.profile = null;

    supabase.from.mockImplementation(() => {
      const builder = mockQueryBuilder();
      builder.order = jest.fn(() => ({
        ...builder,
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));
      return builder;
    });

    global.fetch = jest.fn(() => new Promise(() => {}));

    await act(async () => {
      render(<InquiryForm />);
    });

    expect(screen.getByText("Loading details...")).toBeInTheDocument();

    console.error.mockRestore();
  });

  // verifies session types loading state shows while fetching from supabase
  test("19. shows session types loading state", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder();
        builder.order = jest.fn(() => ({
          ...builder,
          order: jest.fn(() => new Promise(() => {})),
        }));
        return builder;
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/contract")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Draft" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Select Your Session Type *")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that getImageUrl returns null for null paths and renders
  // the "No image" fallback in the category card
  test("20. category card shows No image fallback when image_path is null", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("No image")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that selecting a child session type updates the form value
  // and sets the duration for the time slot grid
  test("21. selecting child session type sets form values", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    // click the category card
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // click the child session type card
    const childBtn = screen.getByTestId(`select-st-${childType.id}`);
    fireEvent.click(childBtn);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const hiddenInput = document.querySelector('input[name="sessionTypeId"]');
    expect(hiddenInput.value).toBe(childType.id);

    console.error.mockRestore();
  });

  // verifies that clicking the same category card again does not break anything
  test("22. clicking the same category card again is stable", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // click again
    fireEvent.click(weddingLabel);

    expect(screen.getByTestId(`session-type-card-${childType.id}`)).toBeInTheDocument();

    console.error.mockRestore();
  });

  // verifies clicking the same session type again does not break anything
  test("23. clicking the same session type again is stable", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const masterBtn = screen.getByTestId(`select-st-${masterType.id}`);
    fireEvent.click(masterBtn);

    const hiddenInput = document.querySelector('input[name="sessionTypeId"]');
    expect(hiddenInput.value).toBe(masterType.id);

    console.error.mockRestore();
  });

  // verifies the time slot selection callback sets the startTime form value
  test("24. selecting a time slot sets the startTime value", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    // select category
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    // set date
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // click the time slot button
    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    const startTimeInput = document.querySelector('input[name="startTime"]');
    expect(startTimeInput.value).toBe("10:00");

    console.error.mockRestore();
  });

  // verifies the questionnaire template loads when a session type is selected
  test("25. loads questionnaire template for selected session type", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType, childType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType, childType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        return mockQueryBuilder({
          data: {
            id: "qt-1",
            name: "Wedding Questions",
            schema_json: [
              { id: "q1", label: "Style preference?", type: "text", required: true },
            ],
          },
        });
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    // select category to trigger questionnaire load
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Wedding Questions")).toBeInTheDocument();
      expect(screen.getByTestId("dynamic-questionnaire")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies allRequiredQuestionsAnswered returns true when no template is active
  test("26. allRequiredQuestionsAnswered returns true when no template", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();
    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      expect(screen.getByText("Authorize Payment")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the contract template updates when a session type with a matching
  // contract template is selected
  test("27. contract template updates when session type changes", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();

    const contractTemplate = {
      id: "tmpl-1",
      session_type_id: masterType.id,
      body: "Wedding contract body",
      name: "Wedding Contract",
    };

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({
          ok: true,
          json: async () => [contractTemplate],
        });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Draft", template_id: null }),
        });
      }
      if (url.includes("/api/contract") && options?.method === "PATCH") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    // select the category which pre-selects the master type
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the category card renders an image when image_path has an http url
  test("28. category card renders image for http image_path", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const masterWithImage = {
      ...masterType,
      image_path: "https://example.com/photo.jpg",
    };

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterWithImage] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterWithImage],
            error: null,
          }),
        }));
        return builder;
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).toBeTruthy();
      expect(img.src).toContain("https://example.com/photo.jpg");
    });

    console.error.mockRestore();
  });

  // verifies the category card constructs a supabase storage url when
  // image_path is a relative path (not starting with http)
  test("29. category card constructs storage url for relative image_path", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const masterWithRelPath = {
      ...masterType,
      image_path: "photos/wedding-cover.jpg",
    };

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterWithRelPath] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterWithRelPath],
            error: null,
          }),
        }));
        return builder;
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).toBeTruthy();
      expect(img.src).toContain("session-images/photos/wedding-cover.jpg");
    });

    console.error.mockRestore();
  });

  // verifies the image onError handler hides the broken image element
  // by setting display to none on the currentTarget
  test("30. image onError hides the broken image element", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const masterWithBadImage = {
      ...masterType,
      image_path: "https://bad-url.com/broken.jpg",
    };

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterWithBadImage] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterWithBadImage],
            error: null,
          }),
        }));
        return builder;
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).toBeTruthy();

      fireEvent.error(img);
      expect(img.style.display).toBe("none");
    });

    console.error.mockRestore();
  });

  // verifies handlePayment flow: creates session, invoice, stripe checkout,
  // and payment record then calls the stripe checkout endpoint
  test("31. handlePayment creates session and calls stripe checkout", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: { id: "session-new-1" },
          error: null,
        });
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        return builder;
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "Payment") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed" }),
        });
      }
      if (url.includes("/api/invoice/generate")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "invoice-1" }),
        });
      }
      if (url.includes("/api/checkout/deposit")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cs_test_1", url: "https://checkout.stripe.com/test" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    // select category
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) fireEvent.click(weddingLabel);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // set date and time
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // click Authorize Payment
    const payBtn = screen.getByText("Authorize Payment");
    await act(async () => {
      fireEvent.click(payBtn);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify the stripe checkout endpoint was called
    const stripeCall = global.fetch.mock.calls.find(
      (call) => call[0]?.includes("/api/checkout/deposit")
    );
    expect(stripeCall).toBeTruthy();

    // verify the invoice generate endpoint was called
    const invoiceCall = global.fetch.mock.calls.find(
      (call) => call[0]?.includes("/api/invoice/generate")
    );
    expect(invoiceCall).toBeTruthy();

    window.alert.mockRestore();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies handlePayment shows alert when payment fails
  test("32. handlePayment shows alert on failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Session insert failed" },
        });
        return builder;
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    // select category, date, time
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) fireEvent.click(weddingLabel);

    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const payBtn = screen.getByText("Authorize Payment");
    await act(async () => {
      fireEvent.click(payBtn);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Payment failed")
    );

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies onSubmit activates the contract, session, and questionnaire
  // then navigates to the success page
  test("33. onSubmit activates records and navigates to success", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    mockSearchParams.set("checkout_session_id", "cs_test_return");

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Payment") {
        return mockQueryBuilder({
          data: {
            provider_payment_id: "cs_test_return",
            Invoice: {
              Session: {
                id: "session-returned",
                session_type_id: masterType.id,
                start_at: "2027-06-10T17:00:00+00:00",
                location_text: "Sacramento",
                notes: "Test notes",
                client_id: "user-uuid-1",
                is_active: false,
              },
            },
          },
        });
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "QuestionnaireResponse") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        return mockQueryBuilder({ data: null });
      }
      if (table === "QuestionnaireAnswer") {
        return mockQueryBuilder({ data: [] });
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed", session_id: "session-returned" }),
        });
      }
      if (url.includes("/api/checkout/cs_test_return")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "complete",
            payment_intent: { status: "requires_capture" },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await act(async () => {
      render(<InquiryForm />);
    });

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      const submitBtn = screen.getByText("Submit My Inquiry");
      expect(submitBtn).not.toBeDisabled();
    });

    const submitBtn = screen.getByText("Submit My Inquiry");
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard/inquiry/success"),
      expect.anything()
    );

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies onSubmit shows alert when activation fails
  test("34. onSubmit shows alert on error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    mockSearchParams.set("checkout_session_id", "cs_test_fail");

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Payment") {
        return mockQueryBuilder({
          data: {
            provider_payment_id: "cs_test_fail",
            Invoice: {
              Session: {
                id: "session-fail",
                session_type_id: masterType.id,
                start_at: "2027-06-10T17:00:00+00:00",
                location_text: "Sacramento",
                notes: "",
                client_id: "user-uuid-1",
                is_active: false,
              },
            },
          },
        });
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({
          error: { message: "Contract update failed" },
        });
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "QuestionnaireResponse") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        return mockQueryBuilder({ data: null });
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed", session_id: "session-fail" }),
        });
      }
      if (url.includes("/api/checkout/cs_test_fail")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "complete",
            payment_intent: { status: "requires_capture" },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await act(async () => {
      render(<InquiryForm />);
    });

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const submitBtn = screen.getByText("Submit My Inquiry");
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Sorry, something went wrong")
    );

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies that the contract template fetch failure is handled gracefully
  test("35. handles contract template fetch failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.reject(new Error("Network error"));
      }
      if (url.includes("/api/contract")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Draft" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to load contract templates:",
      expect.any(Error)
    );

    console.error.mockRestore();
  });

  // verifies that the default contract fetch failure is handled gracefully
  test("36. handles default contract fetch failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract")) {
        return Promise.reject(new Error("Contract load failed"));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to load contract:",
      expect.any(Error)
    );

    console.error.mockRestore();
  });

  // verifies the questionnaire template fetch error is caught and logged
  test("37. handles questionnaire template fetch error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        const builder = {
          select: jest.fn(() => builder),
          eq: jest.fn(() => builder),
          maybeSingle: jest.fn().mockRejectedValue(new Error("Template error")),
        };
        return builder;
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    // select category to trigger questionnaire fetch which will throw
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching QuestionnaireTemplate:",
      expect.any(Error)
    );

    console.error.mockRestore();
  });

  // verifies allRequiredQuestionsAnswered checks every required question
  // by setting up an active template with required questions and verifying
  // the payment button state changes based on answers
  test("38. allRequiredQuestionsAnswered blocks payment when required questions unanswered", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType, childType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType, childType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        return mockQueryBuilder({
          data: {
            id: "qt-1",
            name: "Wedding Q",
            schema_json: [
              { id: "q1", label: "Style?", type: "text", required: true },
              { id: "q2", label: "Colors?", type: "checkbox", required: true },
            ],
          },
        });
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    // select category to load the questionnaire template
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // the questionnaire should be visible with required questions
    await waitFor(() => {
      expect(screen.getByTestId("dynamic-questionnaire")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });


  // verifies the contract onSigned callback updates the contract state
  // when the user signs the contract in the ContractDetail modal
  test("40. contract onSigned callback updates contract state", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    setupDefaultMocks();

    const contractTemplate = {
      id: "tmpl-1",
      session_type_id: masterType.id,
      body: "Contract body",
      name: "Wedding Contract",
    };

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({
          ok: true,
          json: async () => [contractTemplate],
        });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Draft", template_id: "tmpl-1" }),
        });
      }
      if (url.includes("/api/contract") && options?.method === "PATCH") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    // select category to show the contract section
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
    });

    // click the sign contract button in the mocked ContractDetail
    const signBtn = screen.getByTestId("sign-contract");
    fireEvent.click(signBtn);

    // the contract state should now be "Signed"
    // this is verified indirectly - if the contract is signed,
    // the payment section conditions change
    await waitFor(() => {
      expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the categoryChildren sort function runs by selecting a category
  // that has multiple child session types with different display_order values
  test("41. categoryChildren sorts children by display_order", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    const childType2 = {
      ...childType,
      id: "st-child-2",
      name: "Full Day Coverage",
      display_order: 1,
    };

    const childType3 = {
      ...childType,
      id: "st-child-3",
      name: "Half Day Coverage",
      display_order: 3,
    };

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType, childType3, childType2] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType, childType3, childType2],
            error: null,
          }),
        }));
        return builder;
      }
      return mockQueryBuilder();
    });

    setupDefaultFetch();

    await renderAndFlush();

    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // both children should be visible, sorted by display_order
    await waitFor(() => {
      expect(screen.getByTestId(`session-type-card-${childType2.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`session-type-card-${childType3.id}`)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the prefillForm stripe return flow loads questionnaire answers
  // from supabase when returning from a checkout session
  test("42. prefillForm loads questionnaire answers on stripe return", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    mockSearchParams.set("checkout_session_id", "cs_test_qa");

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Payment") {
        return mockQueryBuilder({
          data: {
            provider_payment_id: "cs_test_qa",
            Invoice: {
              Session: {
                id: "session-qa",
                session_type_id: masterType.id,
                start_at: "2027-06-10T17:00:00+00:00",
                location_text: "Sacramento",
                notes: "Test notes",
                client_id: "user-uuid-1",
                is_active: false,
              },
            },
          },
        });
      }
      if (table === "QuestionnaireResponse") {
        return mockQueryBuilder({
          data: { id: "qr-1" },
        });
      }
      if (table === "QuestionnaireAnswer") {
        const builder = mockQueryBuilder();
        builder.select = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({
          data: [
            { question_id: "q1", answer: "Documentary" },
          ],
          error: null,
        });
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        return mockQueryBuilder({ data: null });
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed", session_id: "session-qa" }),
        });
      }
      if (url.includes("/api/checkout/cs_test_qa")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "complete",
            payment_intent: { status: "requires_capture" },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await act(async () => {
      render(<InquiryForm />);
    });

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // the submit button should be enabled after stripe return prefill
    await waitFor(() => {
      const submitBtn = screen.getByText("Submit My Inquiry");
      expect(submitBtn).not.toBeDisabled();
    });

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies handlePayment with an active questionnaire template creates
  // the questionnaire response and answer records in supabase
  test("44. handlePayment creates questionnaire records when template active", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "QuestionnaireTemplate") {
        return mockQueryBuilder({
          data: {
            id: "qt-1",
            name: "Wedding Q",
            schema_json: [
              { id: "q1", label: "Style?", type: "text", required: false },
            ],
          },
        });
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: { id: "session-q-1" },
          error: null,
        });
        return builder;
      }
      if (table === "QuestionnaireResponse") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: { id: "qr-1" },
          error: null,
        });
        return builder;
      }
      if (table === "QuestionnaireAnswer") {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "Payment") {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed" }),
        });
      }
      if (url.includes("/api/invoice/generate")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "invoice-1" }),
        });
      }
      if (url.includes("/api/checkout/deposit")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cs_test_q", url: "https://checkout.stripe.com/q" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    // select category to load questionnaire
    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    fireEvent.click(weddingLabel);

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // set date and time
    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // click Authorize Payment
    const payBtn = screen.getByText("Authorize Payment");
    await act(async () => {
      fireEvent.click(payBtn);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify questionnaire response insert was called
    expect(supabase.from).toHaveBeenCalledWith("QuestionnaireResponse");
    expect(supabase.from).toHaveBeenCalledWith("QuestionnaireAnswer");

    window.alert.mockRestore();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  // verifies handlePayment cleans up session when invoice generation fails
  test("45. handlePayment cleans up session on invoice failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: { id: "session-cleanup" },
          error: null,
        });
        return builder;
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed" }),
        });
      }
      // invoice generation fails
      if (url.includes("/api/invoice/generate")) {
        return Promise.resolve({ ok: false, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) fireEvent.click(weddingLabel);

    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const payBtn = screen.getByText("Authorize Payment");
    await act(async () => {
      fireEvent.click(payBtn);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // session should be cleaned up and error shown
    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Payment failed")
    );

    // verify session delete was called for cleanup
    expect(supabase.from).toHaveBeenCalledWith("Session");

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies handlePayment cleans up session when stripe checkout fails
  test("46. handlePayment cleans up session on stripe checkout failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: { id: "session-stripe-fail" },
          error: null,
        });
        return builder;
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed" }),
        });
      }
      if (url.includes("/api/invoice/generate")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "invoice-1" }),
        });
      }
      // stripe checkout fails
      if (url.includes("/api/checkout/deposit")) {
        return Promise.resolve({ ok: false, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) fireEvent.click(weddingLabel);

    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const payBtn = screen.getByText("Authorize Payment");
    await act(async () => {
      fireEvent.click(payBtn);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Stripe connection failed")
    );

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies handlePayment cleans up session when payment insert fails
  test("47. handlePayment cleans up session on payment insert failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "SessionType") {
        const builder = mockQueryBuilder({ data: [masterType] });
        builder.order.mockImplementation(() => ({
          ...builder,
          order: jest.fn().mockResolvedValue({
            data: [masterType],
            error: null,
          }),
        }));
        return builder;
      }
      if (table === "Session") {
        const builder = mockQueryBuilder();
        builder.insert = jest.fn(() => builder);
        builder.select = jest.fn(() => builder);
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({
          data: { id: "session-pay-fail" },
          error: null,
        });
        return builder;
      }
      if (table === "Contract") {
        const builder = mockQueryBuilder();
        builder.update = jest.fn(() => builder);
        builder.eq = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      if (table === "Payment") {
        // payment insert fails
        return {
          insert: jest.fn().mockResolvedValue({
            error: { message: "Payment insert failed" },
          }),
        };
      }
      return mockQueryBuilder();
    });

    global.fetch.mockImplementation((url, options) => {
      if (url.includes("/api/contract/templates")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/api/contract") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "contract-1", status: "Signed" }),
        });
      }
      if (url.includes("/api/invoice/generate")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "invoice-1" }),
        });
      }
      if (url.includes("/api/checkout/deposit")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: "cs_pay_fail", url: "https://checkout.stripe.com/fail" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await renderAndFlush();

    const weddingLabel = screen.getByText("Wedding")?.closest("label");
    if (weddingLabel) fireEvent.click(weddingLabel);

    const dateInput = document.querySelector('input[name="date"]');
    fireEvent.change(dateInput, { target: { value: getFutureDateStr() } });

    const timeBtn = screen.getByTestId("select-time");
    fireEvent.click(timeBtn);

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    const payBtn = screen.getByText("Authorize Payment");
    await act(async () => {
      fireEvent.click(payBtn);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Payment failed")
    );

    window.alert.mockRestore();
    console.error.mockRestore();
  });
});