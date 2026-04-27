import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Mock navigation and route params because this component depends on React Router.
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

// Mock auth because the component needs the session access token.
const mockUseAuth = jest.fn();


jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

import AdminContractView from "../../../../src/admin/pages/Contacts/AdminContractView.jsx";

jest.mock("react-router-dom", () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../src/pages/Dashboard/ContractDetail.jsx", () => {
  return function MockContractDetail(props) {
    return (
      <div data-testid="contract-detail">
        <p>Mock Contract Detail</p>
        <p data-testid="contract-id">{props.contract.id}</p>
        <p data-testid="template-title">{props.contractTemplate.title}</p>
        <p data-testid="read-only">{String(props.readOnly)}</p>

        {/* This button lets us trigger the onSigned callback */}
        <button
          onClick={() =>
            props.onSigned({
              ...props.contract,
              updated_at: "2026-04-16T12:00:00.000Z",
            })
          }
        >
          Trigger Signed
        </button>
      </div>
    );
  };
});

describe("AdminContractView", () => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;

  const mockSession = {
    access_token: "mock-access-token",
  };

  const mockContract = {
    id: "contract-123",
    template_id: "template-456",
    created_at: "2026-04-15T19:34:39.000Z",
    updated_at: "2026-04-15T19:34:39.000Z",
  };

  const mockTemplate = {
    id: "template-456",
    title: "Base Template",
    body: "This is a sample agreement used for testing.",
  };

  beforeEach(() => {
    global.fetch = jest.fn();
    console.error = jest.fn();

    mockNavigate.mockClear();
    mockUseParams.mockReturnValue({ contractId: "contract-123" });
    mockUseAuth.mockReturnValue({ session: mockSession });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  // Test case 1: The component should show the loading message before data finishes loading.
  test("1.) Shows loading message while contract data is being fetched", () => {
    global.fetch.mockImplementation(() => new Promise(() => { }));

    render(<AdminContractView />);

    expect(screen.getByText("Loading contract...")).toBeInTheDocument();
  });

  // Test case 2: The component should fetch the contract, then fetch its template, then render ContractDetail.
  test("2.) Fetches contract and template, then renders the contract detail view", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockContract,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/contract/contract-123"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-access-token",
          "Content-Type": "application/json",
        }),
      })
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/contract/templates/template-456"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-access-token",
          "Content-Type": "application/json",
        }),
      })
    );

    expect(screen.getByTestId("contract-id")).toHaveTextContent("contract-123");
    expect(screen.getByTestId("template-title")).toHaveTextContent("Base Template");
    expect(screen.getByTestId("read-only")).toHaveTextContent("true");
  });

  // Test case 3: If the contract fetch fails, the page should show the failed load message.
  test("3.) Shows failed message when the contract cannot be loaded", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load contract.")).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalledWith("Contract does not exist.");
  });

  // Test case 4: If the contract template fetch fails, the page should also show the failed load message.
  test("4.) Shows failed message when the contract template cannot be loaded", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockContract,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load contract.")).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalledWith("Contract template does not exist.");
  });

  // Test case 5: Ensure contract state is updated when onSigned is triggered
  test("5.) Updates contract state when onSigned is triggered", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockContract,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Trigger Signed"));

    await waitFor(() => {
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
  });

  // Test case 6: The back button should send the admin back to the previous page.
  test("6.) Navigates back when the back button is clicked", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockContract,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByText("← Back")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("← Back"));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  // Test case 7: Handles network error when fetching contract
  test("7.) Handles error when contract fetch throws", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load contract.")).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching contract:",
      expect.any(Error)
    );
  });
  // Test case 8: handles network error when fetching contract template
  test("8.) Handles error when contract template fetch throws", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockContract,
      })
      .mockRejectedValueOnce(new Error("Template error"));

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load contract.")).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching contract template:",
      expect.any(Error)
    );
  });

  // Test case 9: Does not fetch contract when contract id is missing.
  test("9.) Does not fetch contract when contract id is missing", () => {
    mockUseParams.mockReturnValue({ contractId: undefined });

    render(<AdminContractView />);

    expect(screen.getByText("Loading contract...")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Test case 10: Shows created date when updated date is missing.
  test("10.) Uses created date when updated date is missing", async () => {
    const contractWithoutUpdatedAt = {
      ...mockContract,
      updated_at: null,
      created_at: "2026-04-15T19:34:39.000Z",
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => contractWithoutUpdatedAt,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate,
      });

    render(<AdminContractView />);

    await waitFor(() => {
      expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
    });

    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});