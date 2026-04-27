import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContractView from "../../../src/pages/Dashboard/ContractView.jsx";

const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "123" }),
}));

jest.mock("../../../src/pages/Dashboard/ContractDetail", () => {
  return function MockContractDetail(props) {
    return (
      <div data-testid="contract-detail">
        <div>Contract Detail Mock</div>
        <div>Contract ID: {props.contract?.id}</div>
        <div>Template Name: {props.contractTemplate?.name}</div>
        <button
          onClick={() =>
            props.onSigned({
              ...props.contract,
              status: "Signed",
              signed_pdf_url: "https://example.com/signed.png",
            })
          }
        >
          Mock Signed Callback
        </button>
      </div>
    );
  };
});

describe("ContractView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("shows loading state initially", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<ContractView />);

    expect(screen.getByText(/loading contract/i)).toBeInTheDocument();
  });

  test("shows failed state when contract fetch fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({ ok: false });

    render(<ContractView />);

    expect(await screen.findByText(/failed to load contract/i)).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  test("renders contract detail when contract and template load successfully", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          template_id: 77,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          status: "Draft",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 77,
          name: "Wedding Contract",
          body: "Contract body",
        }),
      });

    render(<ContractView />);

    expect(await screen.findByTestId("contract-detail")).toBeInTheDocument();
  });

  test("back button navigates to dashboard contracts", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          template_id: 77,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          status: "Draft",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 77,
          name: "Wedding Contract",
          body: "Contract body",
        }),
      });

    render(<ContractView />);

    await screen.findByTestId("contract-detail");

    // FIXED LINE
    fireEvent.click(screen.getByText("← Back"));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/contracts");
  });

  test("updates contract state when ContractDetail onSigned callback fires", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 123,
          template_id: 77,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          status: "Draft",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 77,
          name: "Wedding Contract",
          body: "Contract body",
        }),
      });

    render(<ContractView />);

    await screen.findByTestId("contract-detail");
    fireEvent.click(screen.getByRole("button", { name: /mock signed callback/i }));

    expect(screen.getByTestId("contract-detail")).toBeInTheDocument();
  });
});