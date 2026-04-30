import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ContractsPage from "../../../../src/pages/Dashboard/Contracts.jsx";

const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("ContractsPage", () => {
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

    render(<ContractsPage />);

    expect(screen.getByText(/loading contracts/i)).toBeInTheDocument();
  });

  test("shows empty state when no contracts are returned", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ContractsPage />);

    expect(await screen.findByText(/you don’t have any contracts yet/i)).toBeInTheDocument();
  });

  test("shows empty state when fetch fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: false,
    });

    render(<ContractsPage />);

    expect(await screen.findByText(/you don’t have any contracts yet/i)).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test("renders contract rows when data is returned", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          status: "Draft",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          ContractTemplate: { name: "Wedding Contract" },
        },
      ],
    });

    render(<ContractsPage />);

    expect(await screen.findByText("Wedding Contract")).toBeInTheDocument();
    expect(screen.getByText(/your contracts/i)).toBeInTheDocument();
    expect(screen.getByText(/review and sign any contracts assigned to you/i)).toBeInTheDocument();
    expect(screen.getAllByText(/draft/i).length).toBeGreaterThan(0);
  });

  test("calls fetch with the expected URL and headers", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token-123" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ContractsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/contract/user/42"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer token-123",
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  test("does not fetch when session is missing", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: { id: 42 },
    });

    render(<ContractsPage />);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/loading contracts/i)).toBeInTheDocument();
  });

  test("does not fetch when profile is missing", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: null,
    });

    render(<ContractsPage />);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/loading contracts/i)).toBeInTheDocument();
  });

  test("back button navigates to dashboard", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<ContractsPage />);

    await screen.findByText(/you don’t have any contracts yet/i);

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("clicking contract title navigates to contract detail page", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 11,
          status: "Draft",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          ContractTemplate: { name: "Wedding Contract" },
        },
      ],
    });

    render(<ContractsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Wedding Contract" }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/contracts/11", { replace: true });
  });

  test('review button shows "Review & Sign" for unsigned contracts', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 11,
          status: "Draft",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          ContractTemplate: { name: "Wedding Contract" },
        },
      ],
    });

    render(<ContractsPage />);

    expect(await screen.findByRole("button", { name: /review & sign/i })).toBeInTheDocument();
  });

  test('review button shows "View Signed Document" for signed contracts', async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 11,
          status: "Signed",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          ContractTemplate: { name: "Wedding Contract" },
        },
      ],
    });

    render(<ContractsPage />);

    expect(await screen.findByRole("button", { name: /view signed document/i })).toBeInTheDocument();
  });

  test("clicking action button navigates to contract detail page", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 22,
          status: "Signed",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          ContractTemplate: { name: "Portrait Contract" },
        },
      ],
    });

    render(<ContractsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /view signed document/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/contracts/22", { replace: true });
  });

  test("renders updated date when updated_at exists", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: 42 },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          status: "Draft",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          ContractTemplate: { name: "Wedding Contract" },
        },
      ],
    });

    render(<ContractsPage />);

    expect(await screen.findByText(/updated/i)).toBeInTheDocument();
  });
});
