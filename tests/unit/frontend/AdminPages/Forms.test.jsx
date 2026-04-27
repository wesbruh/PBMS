import { createSupabaseMock } from "../../../utils/backend/createSupabaseMock.js";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

// mocks
const mockNavigate = jest.fn();
const mockLocation = { pathname: "/admin/forms" };

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation
}));

let mockSupabase;

jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  get supabase() {
    return mockSupabase;
  }
}));

jest.mock("../../../../src/admin/components/shared/Sidebar/Sidebar.jsx", () =>
  () =>
    <div data-testid="sidebar">Sidebar</div>
);

jest.mock("../../../../src/admin/components/shared/Frame/Frame.jsx", () =>
  ({ children }) =>
    <div data-testid="frame">{children}</div>
);

// mockData
beforeEach(() => {
  jest.clearAllMocks();

  mockSupabase = createSupabaseMock({
    QuestionnaireTemplate: {
      data: [
        {
          id: "123qtemplateid",
          name: "QTemplate",
          active: true,
          SessionType: { name: "Testing Session Type" },
        },
      ],
      error: null,
    },

    ContractTemplate: {
      data: [
        {
          id: "123ctemplateid",
          name: "CTemplate",
          active: false,
          SessionType: { name: "Testing Session Type2" },
        },
      ],
      error: null,
    },
  });
});

// silence console.error during each test
let consoleSpy;
beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => {
  consoleSpy.mockRestore();
});

import Forms from "../../../../src/admin/pages/Forms/Forms.jsx";

// 23 TESTS //
describe("Forms", () => {
  test("1. shows loading indicator while fetching", () => {
    // freeze BOTH queries so loading state stays active
    mockSupabase.from = jest.fn(() => ({
      select: () => ({
        order: () =>
          new Promise(() => {
            // never resolves → keeps loading state
          }),
      }),
    }));

    render(<Forms />);
    expect(screen.getByText("Loading templates...")).toBeInTheDocument();
  });

  test("2. shows error catching qTemplates", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: null,
        error: { message: "Error" },
      },
      ContractTemplate: {
        data: [
          {
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          },
        ],
        error: null,
      },
    });

    await act(async () => {
      render(<Forms />);
    });
    expect(console.error).toHaveBeenCalled();

    expect(await screen.getByText("Failed to load templates.")).toBeInTheDocument();
  });

  test("3. shows error catching cTemplates", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: [
          {
            id: "123qtemplateid",
            name: "QTemplate",
            active: true,
            SessionType: { name: "Testing Session Type" },
          },
        ],
        error: null,
      },
      ContractTemplate: {
        data: null,
        error: { message: "Error" },
      },
    });

    await act(async () => {
      render(<Forms />);
    });
    expect(console.error).toHaveBeenCalled();

    expect(await screen.getByText("Failed to load templates.")).toBeInTheDocument();
  });

  test("4. show catch for non-error no templates found", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: null,
        error: null,
      },

      ContractTemplate: {
        data: null,
        error: null,
      },
    });

    await act(async () => {
      render(<Forms />);
    });

    expect(await screen.getByText("No templates yet. Create one to get started.")).toBeInTheDocument();
  });

  test("5. render templates in table", async () => {
    await act(async () => {
      render(<Forms />);
    });

    const cells = document.querySelectorAll(".table__cell");
    const values = [...cells].map(c => c.textContent.trim()).filter(Boolean);;

    expect(values).toContain("QTemplate");
    expect(values).toContain("Questionnaire");
    expect(values).toContain("Testing Session Type");

    expect(values).toContain("Active");
    expect(values).toContain("CTemplate");
    expect(values).toContain("Contract");
    expect(values).toContain("Testing Session Type2");
    expect(values).toContain("Draft");
  });

  test("6. ensure templates are filtered with appropriate tab", async () => {
    await act(async () => {
      render(<Forms />);
    });

    let cells, values;

    const tabs = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("type") === "radio");

    const questionnaireTab = tabs.find(
      el => el.textContent.trim() === "Questionnaire"
    );

    fireEvent.click(questionnaireTab);

    cells = document.querySelectorAll(".table__cell");
    values = [...cells].map(c => c.textContent.trim()).filter(Boolean);;

    expect(values).toContain("QTemplate");
    expect(values).toContain("Questionnaire");
    expect(values).toContain("Testing Session Type");
    expect(values).toContain("Active");

    expect(values).not.toContain("CTemplate");
    expect(values).not.toContain("Contract");
    expect(values).not.toContain("Testing Session Type2");
    expect(values).not.toContain("Draft");

    const contractTab = tabs.find(
      el => el.textContent.trim() === "Contract"
    );

    fireEvent.click(contractTab);

    cells = document.querySelectorAll(".table__cell");
    values = [...cells].map(c => c.textContent.trim()).filter(Boolean);;

    expect(values).not.toContain("QTemplate");
    expect(values).not.toContain("Questionnaire");
    expect(values).not.toContain("Testing Session Type");
    expect(values).not.toContain("Active");

    expect(values).toContain("CTemplate");
    expect(values).toContain("Contract");
    expect(values).toContain("Testing Session Type2");
    expect(values).toContain("Draft");
  });

  test("8. ensure new template buttons navigate to appropriate editor", async () => {
    await act(async () => {
      render(<Forms />);
    });

    const [newQuestionnaireButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "New Questionnaire");

    fireEvent.click(newQuestionnaireButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/forms/questionnaires/new")

    const [newContractButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "New Contract");

    fireEvent.click(newContractButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/forms/contracts/new")
  });

  test("8. ensure questionnaire edit button navigates to questionnaire editor", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: [
          {
            id: "123qtemplateid",
            name: "QTemplate",
            active: true,
            SessionType: { name: "Testing Session Type" },
          },
        ],
        error: null,
      },
      ContractTemplate: {
        data: null,
        error: null,
      },
    });

    await act(async () => {
      render(<Forms />);
    });

    const [editButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Edit Template");

    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/forms/questionnaires/123qtemplateid/edit")
  });

  test("9. ensure contract edit button navigates to contract editor", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: null,
        error: null,
      },
      ContractTemplate: {
        data: [{
          id: "123ctemplateid",
          name: "CTemplate",
          active: false,
          SessionType: { name: "Testing Session Type2" },
        }],
        error: null,
      },
    });

    await act(async () => {
      render(<Forms />);
    });

    const [editButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Edit Template");

    fireEvent.click(editButton);
  });
  test("10. ensure delete buttons need confirmation", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: [
          {
            id: "123qtemplateid",
            name: "QTemplate",
            active: true,
            SessionType: { name: "Testing Session Type" },
          },
        ],
        error: null,
      },
      ContractTemplate: {
        data: [{
          id: "123ctemplateid",
          name: "CTemplate",
          active: false,
          SessionType: { name: "Testing Session Type2" },
        }],
        error: null,
      },
    });

    const confirm = jest.spyOn(window, "confirm").mockImplementation(() => false);
    await act(async () => {
      render(<Forms />);
    });

    const deleteButtons = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    deleteButtons.forEach((deleteButton) => {
      fireEvent.click(deleteButton);
      expect(confirm).toHaveBeenCalled();
      confirm.mockClear();
    });

    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  test("11. check error catching on questionnaire template delete failure", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [
          {
            data: [
              {
                id: "123qtemplateid",
                name: "QTemplate",
                active: true,
                SessionType: { name: "Testing Session Type" },
              }
            ],
            error: null
          },
          {
            data: [
              {
                id: "123qtemplateid",
                name: "QTemplate",
                active: true,
                SessionType: { name: "Testing Session Type2" },
              }
            ],
            error: { message: "Error" }
          }
        ],
        ContractTemplate: [
          {
            data: null,
            error: null
          }
        ]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to delete QTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("12. ensure questionnaire delete button successfully deletes", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: [
          {
            id: "123qtemplateid",
            name: "QTemplate",
            active: true,
            SessionType: { name: "Testing Session Type" },
          },
        ],
        error: null
      },
      ContractTemplate: {
        data: null,
        error: null
      },
    });

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "QTemplate was successfully deleted."
      );
    });
  });

  test("13. check error catching on contract select failure", async () => {
    mockSupabase = createSupabaseMock({
      QuestionnaireTemplate: {
        data: null,
        error: null,
      },
      ContractTemplate: {
        data: [{
          id: "123ctemplateid",
          name: "CTemplate",
          active: true,
          SessionType: { name: "Testing Session Type2" },
        }],
        error: null,
      },
      Contract: {
        data: null,
        error: { message: "Error" }
      }
    });

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to delete CTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("14. check error catching on contract template delete failure with no related contract data", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [{
          data: null,
          error: null
        }],
        ContractTemplate: [{
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        },
        {
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: { message: "Error" }
        }],
        Contract: [{
          data: null,
          error: null
        }]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to delete CTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("15. ensure contract template deletes succesfully with no related contract data", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [{
          data: null,
          error: null
        }],
        ContractTemplate: [{
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        },
        {
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        }],
        Contract: [{
          data: null,
          error: null
        }]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "CTemplate was successfully deleted."
      );
    });

    alertSpy.mockRestore();
  });

  test("16. check error catching on contract template delete failure with related contract data", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [{
          data: null,
          error: null
        }],
        ContractTemplate: [{
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        },
        {
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: { message: "Error" }
        }],
        Contract: [{
          data: { id: "123contractid" },
          error: null
        }]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to delete CTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("17. ensure contract template deletes succesfully with no related contract data", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [{
          data: null,
          error: null
        }],
        ContractTemplate: [{
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        },
        {
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        }],
        Contract: [{
          data: { id: "123contractid" },
          error: null
        }]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Delete Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "CTemplate was successfully deleted."
      );
    });

    alertSpy.mockRestore();
  });

  test("18. check error catching on questionnaire template basic duplicate failure", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [
          {
            data: [
              {
                id: "123qtemplateid",
                name: "QTemplate",
                active: true,
                SessionType: { name: "Testing Session Type" },
                schema_json: [{ id: "123questionid", question: "hi" }]
              }
            ],
            error: null
          },
          {
            data: [
              {
                id: "123newqtemplateid",
                name: "QTemplate Copy",
                active: false,
                SessionType: { name: "Testing Session Type" },
              }
            ],
            error: { message: "Error" }
          }
        ],
        ContractTemplate: [
          {
            data: null,
            error: null
          }
        ]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Duplicate Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to duplicate QTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("19. check error catching on questionnaire template question upsert failure", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [
          {
            data: [
              {
                id: "123qtemplateid",
                name: "QTemplate",
                active: true,
                SessionType: { name: "Testing Session Type" },
                schema_json: [{ id: "123questionid", question: "hi" }]
              }
            ],
            error: null
          },
          {
            data: [
              {
                id: "123newqtemplateid",
                name: "QTemplate Copy",
                active: false,
                SessionType: { name: "Testing Session Type" },
              }
            ],
            error: null
          }
        ],
        ContractTemplate: [
          {
            data: null,
            error: null
          }
        ],
        Questions: [
          {
            data: null,
            error: { message: "Error" }
          }
        ]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Duplicate Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to duplicate QTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("20. check error catching on questionnaire template new questionnaire update failure", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [
          {
            data: [
              {
                id: "123qtemplateid",
                name: "QTemplate",
                active: true,
                SessionType: { name: "Testing Session Type" },
                schema_json: [{ id: "123questionid", question: "hi" }]
              }
            ],
            error: null
          },
          {
            data: [
              {
                id: "123newqtemplateid",
                name: "QTemplate Copy",
                active: false,
                SessionType: { name: "Testing Session Type" }
              }
            ],
            error: null
          },
          {
            error: { message: "Error" }
          }
        ],
        ContractTemplate: [
          {
            data: null,
            error: null
          }
        ],
        Questions: [
          {
            data: null,
            error: null
          }
        ]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Duplicate Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to duplicate QTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("21. ensure questionnaire duplicate button successfully duplicates", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [
          {
            data: [
              {
                id: "123qtemplateid",
                name: "QTemplate",
                active: true,
                SessionType: { name: "Testing Session Type" },
                schema_json: [{ id: "123questionid", question: "hi" }]
              }
            ],
            error: null
          },
          {
            data: [
              {
                id: "123newqtemplateid",
                name: "QTemplate Copy",
                active: false,
                SessionType: { name: "Testing Session Type" }
              }
            ],
            error: null
          },
          {
            error: null
          }
        ],
        ContractTemplate: [
          {
            data: null,
            error: null
          }
        ],
        Questions: [
          {
            data: null,
            error: null
          }
        ]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Duplicate Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "QTemplate was successfully duplicated."
      );
    });

    alertSpy.mockRestore();
  });

  test("22. check error catching on contract template duplicate failure", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [{
          data: null,
          error: null
        }],
        ContractTemplate: [{
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        },
        {
          error: { message: "Error" }
        }]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Duplicate Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to duplicate CTemplate: Error"
      );
    });

    alertSpy.mockRestore();
  });

  test("23. ensure contract duplicate button successfully duplicates", async () => {
    mockSupabase = createSupabaseMock(
      {
        QuestionnaireTemplate: [{
          data: null,
          error: null
        }],
        ContractTemplate: [{
          data: [{
            id: "123ctemplateid",
            name: "CTemplate",
            active: true,
            SessionType: { name: "Testing Session Type2" },
          }],
          error: null
        },
        {
          error: null
        }]
      },
      {},
      true
    );

    jest.spyOn(window, "confirm").mockImplementation(() => true);
    const alertSpy = jest.spyOn(window, "alert").mockImplementation();

    await act(async () => {
      render(<Forms />);
    });

    const [deleteButton] = screen
      .getAllByRole("button")
      .filter(el => el.getAttribute("title") === "Duplicate Template");

    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "CTemplate was successfully duplicated."
      );
    });

    alertSpy.mockRestore();
  });
});