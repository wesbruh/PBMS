import { createSupabaseMock } from "../../../../../../utils/backend/createSupabaseMock.js";
import { render, screen, act, fireEvent, waitFor, logRoles } from "@testing-library/react";

// mocks
const mockNavigate = jest.fn();
const mockParams = { id: "123qtemplateid" };

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams
}));

jest.mock("../../../../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

let mockSupabase;

jest.mock("../../../../../../../src/lib/supabaseClient.js", () => ({
  get supabase() {
    return mockSupabase;
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

let mockUseAuth;

jest.mock("../../../../../../../src/context/AuthContext.jsx", () => ({
  get useAuth() {
    return mockUseAuth;
  }
}));

jest.mock("../../../../../../../src/admin/components/shared/Sidebar/Sidebar.jsx", () =>
  () =>
    <div data-testid="sidebar">Sidebar</div>
);

jest.mock("../../../../../../../src/admin/components/shared/Frame/Frame.jsx", () =>
  ({ children }) =>
    <div data-testid="frame">{children}</div>
);

// silence console.error during each test
let consoleSpy;
beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => {
  consoleSpy.mockRestore();
});

import QuestionnairesEditor from "../../../../../../../src/admin/pages/Forms/Questionnaires/QuestionnairesEditor.jsx";

// replace the real fetch with a Jest mock before each test so no actual HTTP requests are made
beforeEach(() => {
  global.fetch = jest.fn();
});

//  clears all mock call history before each test
afterEach(() => {
  jest.restoreAllMocks();
});

// simulates a successful API response. The component will receive this data when it calls fetch()
function mockFetchSuccess(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

// simulates a failed API response with a given HTTP status code. The component will see res.ok === false and throw an error
function mockFetchFailure(status = 500, error = "Internal Server Error") {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => { return { error } }
  });
}

describe("QuestionnairesEditor", () => {
  test("1. attempt to render in create mode without a valid session", () => {
    mockUseAuth = () => { return { session: null } };

    render(<QuestionnairesEditor mode={"create"} />);

    expect(screen.getByText("Create Questionnaire Template")).toBeInTheDocument();
    expect(screen.queryByText("Loading Template Editor...")).not.toBeInTheDocument();
  });

  test("2. attempt to render in edit mode without a valid session", () => {
    mockUseAuth = () => { return { session: null } };

    render(<QuestionnairesEditor mode={"edit"} />);

    expect(screen.getByText("Edit Questionnaire Template")).toBeInTheDocument();
    expect(screen.getByText("Loading Template Editor...")).toBeInTheDocument();
  });

  test("3. handle back non-dirty navigation back to /admin/forms", () => {
    mockUseAuth = () => { return { session: null } };

    render(<QuestionnairesEditor mode={"edit"} />);

    const [backButton] = screen.getAllByRole("button").filter(el => el.textContent === "Back to Templates");

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/admin/forms");
  });

  test("4. handle back dirty navigation cancel", async () => {
    mockUseAuth = () => { return { session: null } };

    const confirm = jest.spyOn(window, "confirm").mockImplementation(() => false);
    render(<QuestionnairesEditor mode={"create"} />);

    const [templateNameInput] = screen.getAllByRole("textbox");

    // make dirty
    await fireEvent.change(templateNameInput, { target: { value: "New Questionnaire Name" } });

    const [backButton] = screen.getAllByRole("button").filter(el => el.textContent === "Back to Templates");
    await fireEvent.click(backButton);

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Are you sure you want to leave? Your changes will be lost.");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    confirm.mockRestore();
  });

  test("5. handle back dirty navigation", async () => {
    mockUseAuth = () => { return { session: null } };

    const confirm = jest.spyOn(window, "confirm").mockImplementation(() => true);
    render(<QuestionnairesEditor mode={"create"} />);

    const [templateNameInput] = screen.getAllByRole("textbox");

    // make dirty
    await fireEvent.change(templateNameInput, { target: { value: "New Questionnaire Name" } });

    const [backButton] = screen.getAllByRole("button").filter(el => el.textContent === "Back to Templates");
    await fireEvent.click(backButton);

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Are you sure you want to leave? Your changes will be lost.");
      expect(mockNavigate).toHaveBeenCalledWith("/admin/forms");
    });

    confirm.mockRestore();
  });

  test("6. handle session types load error", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    mockFetchFailure();

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
      const sessionTypeOptions = screen.getAllByRole("option");
      expect(sessionTypeOptions.length).toBe(1)
    });
  });

  test("7. handle session types load success", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    render(<QuestionnairesEditor mode={"edit"} />);
    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
    });
  });

  test("8. handle questionnaire template load error with proper message", async () => {
    mockSupabase = createSupabaseMock({});
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchFailure(500, { message: "Internal Server Error" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });

  test("9. handle questionnaire template load error with default message", async () => {
    mockSupabase = createSupabaseMock({});
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchFailure();

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      expect(screen.getByText("Failed to load template.")).toBeInTheDocument();
    });
  });

  test("10. handle session type resolve error with default message", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ name: "QTemplate", session_type_id: "123sessiontypeid", schema_json: [] });
    mockFetchFailure(500, { message: "session type resolve error" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      expect(screen.getByText("session type resolve error")).toBeInTheDocument();
    });
  });

  test("11. load existing template in edit mode", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ name: "QTemplate", session_type_id: "123sessiontypeid", schema_json: [{ id: "1", label: "1" }, { id: "2", "label": "2" }, { id: "3", "label": "3" }] });
    mockFetchSuccess({ name: "hi" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });
  });

  test("12. add/remove questions to/from template", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };

    render(<QuestionnairesEditor mode={"create"} />);

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(2)")).toBeInTheDocument();

    const removeQButtons = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Remove Question");

    expect(screen.getByText("(2)")).toBeInTheDocument();
    fireEvent.click(removeQButtons[1]);
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  test("13. update question in template", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    render(<QuestionnairesEditor mode={"create"} />);

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabel, { target: { value: "q1 label" } });
    expect(updateQLabel.value).toBe("q1 label");

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "short_text" } });
    expect(updateQType.value).toBe("short_text");
  });

  test("14. update question in template to cycle through question types", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    render(<QuestionnairesEditor mode={"create"} />);

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    const TYPE_OPTIONS = ["short_text", "long_text", "select", "radio", "checkbox", "date"];

    TYPE_OPTIONS.forEach((type) => {
      fireEvent.change(updateQType, { target: { value: type } });
      expect(updateQType.value).toBe(type);
    })
  });

  test("15. update question to toggle required on/off", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    render(<QuestionnairesEditor mode={"create"} />);

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQRequired] = screen
      .getAllByRole("checkbox")
      .filter(el => el.getAttribute("title") === "Update Question Required");

    fireEvent.click(updateQRequired);
    expect(updateQRequired.checked).toBe(true);
    fireEvent.click(updateQRequired);
    expect(updateQRequired.checked).toBe(false);
  });

  test("16. add/update/remove option", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    render(<QuestionnairesEditor mode={"create"} />);

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "radio" } });
    expect(updateQType.value).toBe("radio");

    const [addOptionButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Option");

    expect(screen.queryByPlaceholderText("Option 1")).not.toBeInTheDocument();
    fireEvent.click(addOptionButton);
    fireEvent.click(addOptionButton);

    const option = screen.getByPlaceholderText("Option 2");
    expect(option).toBeInTheDocument();

    const optionInputs = screen.getAllByPlaceholderText(/option/i);

    expect(option.value).toBe("");
    fireEvent.change(option, {
      target: { value: "updated option" },
    });
    expect(option.value).toBe("updated option");

    const removeButtons = screen.getAllByTitle("Remove Option");
    expect(optionInputs[1]).toBeInTheDocument();
    fireEvent.click(removeButtons[1]);
    expect(screen.queryByPlaceholderText("updated option")).not.toBeInTheDocument();
  });

  test("17. load existing template in edit mode, move questions around, and remove", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ name: "QTemplate", session_type_id: "123sessiontypeid", schema_json: [{ id: "1", label: "1" }, { id: "2", "label": "2" }, { id: "3", "label": "3" }] });
    mockFetchSuccess({ name: "hi" });

    render(<QuestionnairesEditor mode={"edit"} />);

    expect(await screen.findByText("(3)")).toBeInTheDocument();

    await waitFor(() => {
      const moveUp = screen.getAllByTitle("Move question up in the list");
      fireEvent.click(moveUp[1]);
      const moveDown = screen.getAllByTitle("Move question down in the list");
      fireEvent.click(moveDown[1]);
      const removeQButtons = screen.getAllByTitle("Remove Question");
      fireEvent.click(removeQButtons[1]);
    });

    expect(await screen.findByText("(2)")).toBeInTheDocument();
    const removeQButtons = screen.getAllByTitle("Remove Question");
    fireEvent.click(removeQButtons[0]);
    expect(await screen.findByText("(1)")).toBeInTheDocument();

    const moveUp = screen.getByTitle("Move question up in the list");
    fireEvent.click(moveUp);
    const moveDown = screen.getByTitle("Move question down in the list");
    fireEvent.click(moveDown);
  });

  test("18. create and save template as draft error on no template name", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("");
    });

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    expect(screen.getByText("Template name is required.")).toBeInTheDocument();
  });

  test("19. create and save template as draft error on no selected session type", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("");
    });

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    expect(screen.getByText("Session type is required.")).toBeInTheDocument();
  });

  test("20. create and save template as draft error on no question label", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      fireEvent.change(select, { target: { value: "hi" } });
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    expect(updateQLabel.value).toBe("");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    expect(screen.getByText("Question 1: label is required.")).toBeInTheDocument();
  });

  test("21. create and save template as draft error on no question option for required type", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      fireEvent.change(select, { target: { value: "hi" } });
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabel, { target: { value: "q1 label" } });
    expect(updateQLabel.value).toBe("q1 label");

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "radio" } });
    expect(updateQType.value).toBe("radio");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    expect(screen.getByText("Question 1: \"radio\" requires at least 1 option.")).toBeInTheDocument();
  });

  test("22. create and save template as draft error on session type resolve", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchFailure();

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      fireEvent.change(select, { target: { value: "hi" } });
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabel, { target: { value: "q1 label" } });
    expect(updateQLabel.value).toBe("q1 label");

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "radio" } });
    expect(updateQType.value).toBe("radio");

    const [addOptionButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Option");

    expect(screen.queryByPlaceholderText("Option 1")).not.toBeInTheDocument();
    fireEvent.click(addOptionButton);

    const option = screen.getByPlaceholderText("Option 1");
    expect(option).toBeInTheDocument();

    fireEvent.change(option, {
      target: { value: "updated option" },
    });
    expect(option.value).toBe("updated option");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.getByText(`SessionType "hi" not found`)).toBeInTheDocument();
    });
  });

  test("23. create and save template as draft error on basic posts", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchFailure();

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      fireEvent.change(select, { target: { value: "hi" } });
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabel, { target: { value: "q1 label" } });
    expect(updateQLabel.value).toBe("q1 label");

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "radio" } });
    expect(updateQType.value).toBe("radio");

    const [addOptionButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Option");

    expect(screen.queryByPlaceholderText("Option 1")).not.toBeInTheDocument();
    fireEvent.click(addOptionButton);

    const option = screen.getByPlaceholderText("Option 1");
    expect(option).toBeInTheDocument();

    fireEvent.change(option, {
      target: { value: "updated option" },
    });
    expect(option.value).toBe("updated option");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save draft.")).toBeInTheDocument();
    });
  });

  test("24. create and save template as draft success on basic post", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      fireEvent.change(select, { target: { value: "hi" } });
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabel, { target: { value: "q1 label" } });
    expect(updateQLabel.value).toBe("q1 label");

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "radio" } });
    expect(updateQType.value).toBe("radio");

    const [addOptionButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Option");

    expect(screen.queryByPlaceholderText("Option 1")).not.toBeInTheDocument();
    fireEvent.click(addOptionButton);

    const option = screen.getByPlaceholderText("Option 1");
    expect(option).toBeInTheDocument();

    fireEvent.change(option, {
      target: { value: "updated option" },
    });
    expect(option.value).toBe("updated option");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save draft.")).not.toBeInTheDocument();
    });
  });

  test("25. create and save template as draft error on basic post", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });

    await act(async () => {
      render(<QuestionnairesEditor mode={"create"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      fireEvent.change(templateNameInput, { target: { value: "Test Template Name" } });
      expect(templateNameInput.value).toBe("Test Template Name");
      const select = screen.getByTitle("session-type-select");
      fireEvent.change(select, { target: { value: "hi" } });
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(0)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(1)")).toBeInTheDocument();

    const [updateQLabel] = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabel, { target: { value: "q1 label" } });
    expect(updateQLabel.value).toBe("q1 label");

    const [updateQType] = screen
      .getAllByRole("combobox")
      .filter(el => el.getAttribute("title") === "Update Question Type");

    fireEvent.change(updateQType, { target: { value: "radio" } });
    expect(updateQType.value).toBe("radio");

    const [addOptionButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Option");

    expect(screen.queryByPlaceholderText("Option 1")).not.toBeInTheDocument();
    fireEvent.click(addOptionButton);

    const option = screen.getByPlaceholderText("Option 1");
    expect(option).toBeInTheDocument();

    fireEvent.change(option, {
      target: { value: "updated option" },
    });
    expect(option.value).toBe("updated option");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save draft.")).not.toBeInTheDocument();
    });
  });

  test("26. load and save existing template as draft error on basic patch error", async () => {
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ name: "QTemplate", session_type_id: "123sessiontypeid", schema_json: [{ id: "1", label: "1" }, { id: "2", "label": "2" }, { id: "3", "label": "3" }] });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchFailure();

    await act(async () => {
      render(<QuestionnairesEditor mode={"edit"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const removeQButtons = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Remove Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(removeQButtons[1]);
    expect(screen.getByText("(2)")).toBeInTheDocument();

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save draft.")).toBeInTheDocument();
    });
  });

  test("27. load and save existing template as draft deleting old questions", async () => {
    mockSupabase = createSupabaseMock({ Questions: { status: 204 } })
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({ name: "QTemplate", session_type_id: "123sessiontypeid", schema_json: [{ id: "1", label: "1" }, { id: "2", "label": "2" }, { id: "3", "label": "3" }] });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });

    await act(async () => {
      render(<QuestionnairesEditor mode={"edit"} />);
    });

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const removeQButtons = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Remove Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(removeQButtons[1]);
    expect(screen.getByText("(2)")).toBeInTheDocument();

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);
  });

  test("28. load and save existing template as draft error on inserting new questions", async () => {
    mockSupabase = createSupabaseMock({ Questions: { error: "Error" } })
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({
      id: "123qtemplateid",
      name: "QTemplate",
      session_type_id: "123sessiontypeid",
      schema_json: [
        { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
        { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
        { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
      ]
    });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(4)")).toBeInTheDocument();

    const updateQLabels = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabels[3], { target: { value: "q4 label" } });
    expect(updateQLabels[3].value).toBe("q4 label");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save questions to the database.")).toBeInTheDocument();
    });
  });

  test("29. load and save existing template as draft error reinserting old questions", async () => {
    mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: "Error" }] }, {}, true)
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({
      id: "123qtemplateid",
      name: "QTemplate",
      session_type_id: "123sessiontypeid",
      schema_json: [
        { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
        { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
        { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
      ]
    });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(4)")).toBeInTheDocument();

    const updateQLabels = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabels[3], { target: { value: "q4 label" } });
    expect(updateQLabels[3].value).toBe("q4 label");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save questions to the database.")).toBeInTheDocument();
    });
  });

  test("30. load and save existing template as draft error on refetching questions", async () => {
    mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: null }, { error: "Error" }] }, {}, true)
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({
      id: "123qtemplateid",
      name: "QTemplate",
      session_type_id: "123sessiontypeid",
      schema_json: [
        { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "radio", required: false, options: ["nice","bad",""] },
        { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
        { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
      ]
    });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(4)")).toBeInTheDocument();

    const updateQLabels = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabels[3], { target: { value: "q4 label" } });
    expect(updateQLabels[3].value).toBe("q4 label");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to fetch updated questions from the database.")).toBeInTheDocument();
    });
  });

  test("31. load and save existing template as draft error on basic patch after refetching questions", async () => {
    mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: null }, { error: null }] }, {}, true)
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({
      id: "123qtemplateid",
      name: "QTemplate",
      session_type_id: "123sessiontypeid",
      schema_json: [
        { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
        { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
        { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
      ]
    });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });
    mockFetchFailure();

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(4)")).toBeInTheDocument();

    const updateQLabels = screen
      .getAllByRole("textbox")
      .filter(el => el.getAttribute("title") === "Update Question Label");

    fireEvent.change(updateQLabels[3], { target: { value: "q4 label" } });
    expect(updateQLabels[3].value).toBe("q4 label");

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(screen.queryByText("Failed to save draft.")).toBeInTheDocument();
    });
  });

  test("32. load and save existing template as draft success", async () => {
    mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: null }, { error: null }] }, {}, true)
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({
      id: "123qtemplateid",
      name: "QTemplate",
      session_type_id: "123sessiontypeid",
      schema_json: [
        { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
        { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
        { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
      ]
    });
    mockFetchSuccess({ name: "hi" });
    mockFetchSuccess({ id: "123sessiontypeid" });
    mockFetchSuccess({ id: "123qtemplateid" });
    mockFetchSuccess();

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const saveDraftButton = screen.getByTitle("Save Draft");
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/forms");
    });
  });

  test("33. load and publish template error on validate", async () => {
    mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: null }, { error: null }] }, {}, true)
    mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
    const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
    mockFetchSuccess(sessionTypes);
    mockFetchSuccess({
      id: "123qtemplateid",
      name: "QTemplate",
      session_type_id: "123sessiontypeid",
      schema_json: [
        { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
        { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
        { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
      ]
    });
    mockFetchSuccess({ name: "hi" });

    render(<QuestionnairesEditor mode={"edit"} />);

    await waitFor(() => {
      const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
      expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
      const [templateNameInput] = screen.getAllByRole("textbox");
      expect(templateNameInput.value).toBe("QTemplate");
      const select = screen.getByTitle("session-type-select");
      expect(select.value).toBe("hi");
    });

    const [addQButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Add Question");

    expect(screen.getByText("(3)")).toBeInTheDocument();
    fireEvent.click(addQButton);
    expect(screen.getByText("(4)")).toBeInTheDocument();

    const publishButton = screen.getByTitle("Publish");
    fireEvent.click(publishButton);

    expect(screen.getByText("Question 4: label is required.")).toBeInTheDocument();
  });

test("34. load and publish template error on setting only itself active", async () => {
  mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: null }, { error: null }] }, {}, true)
  mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
  const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
  mockFetchSuccess(sessionTypes);
  mockFetchSuccess({
    id: "123qtemplateid",
    name: "QTemplate",
    session_type_id: "123sessiontypeid",
    schema_json: [
      { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
      { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
      { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
    ]
  });
  mockFetchSuccess({ name: "hi" });
  mockFetchSuccess({ id: "123sessiontypeid" });
  mockFetchSuccess({ id: "123qtemplateid" });
  mockFetchSuccess();
  mockFetchFailure();

  render(<QuestionnairesEditor mode={"edit"} />);

  await waitFor(() => {
    const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
    expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
    const [templateNameInput] = screen.getAllByRole("textbox");
    expect(templateNameInput.value).toBe("QTemplate");
    const select = screen.getByTitle("session-type-select");
    expect(select.value).toBe("hi");
  });

  const publishButton = screen.getByTitle("Publish");
  fireEvent.click(publishButton);

  expect(await screen.findByText("Failed to publish template.")).toBeInTheDocument();
});

test("35. load and publish template success", async () => {
  mockSupabase = createSupabaseMock({ Questions: [{ error: null }, { error: null }, { error: null }] }, {}, true)
  mockUseAuth = () => { return { session: { access_token: "fake-token" } } };
  const sessionTypes = [{ name: "hi" }, { name: "nice" }, { name: "to" }, { name: "meet" }, { name: "you" }]
  mockFetchSuccess(sessionTypes);
  mockFetchSuccess({
    id: "123qtemplateid",
    name: "QTemplate",
    session_type_id: "123sessiontypeid",
    schema_json: [
      { id: "1", questionnaire_id: "123qtemplateid", "label": "1", type: "short_text", required: false },
      { id: "2", questionnaire_id: "123qtemplateid", "label": "2", type: "short_text", required: false },
      { id: "3", questionnaire_id: "123qtemplateid", "label": "3", type: "short_text", required: false }
    ]
  });
  mockFetchSuccess({ name: "hi" });
  mockFetchSuccess({ id: "123sessiontypeid" });
  mockFetchSuccess({ id: "123qtemplateid" });
  mockFetchSuccess();
  mockFetchSuccess();

  render(<QuestionnairesEditor mode={"edit"} />);

  await waitFor(() => {
    const sessionTypeOptions = screen.getAllByRole("option").filter(el => el.label === "session-type-options");
    expect(sessionTypeOptions.length).toBe(sessionTypes.length + 1)
    const [templateNameInput] = screen.getAllByRole("textbox");
    expect(templateNameInput.value).toBe("QTemplate");
    const select = screen.getByTitle("session-type-select");
    expect(select.value).toBe("hi");
  });

  const publishButton = screen.getByTitle("Publish");
  fireEvent.click(publishButton);

  await waitFor(() => {
    expect(screen.queryByText("Failed to publish template.")).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/admin/forms");
  });
});
});