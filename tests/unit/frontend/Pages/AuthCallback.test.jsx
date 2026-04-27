import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockNavigate = jest.fn();
const mockGetSession = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockGetSessionFromUrl = jest.fn();
const mockResend = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("../../../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      exchangeCodeForSession: (...args) => mockExchangeCodeForSession(...args),
      getSessionFromUrl: (...args) => mockGetSessionFromUrl(...args),
      resend: (...args) => mockResend(...args),
      updateUser: (...args) => mockUpdateUser(...args),
    },
  },
}));

import AuthCallback from "../../../../src/pages/Auth/AuthCallback.jsx";

describe("AuthCallback", () => {
  let originalFetch;

  beforeEach(() => {
    jest.useFakeTimers();
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    jest.spyOn(window.history, "replaceState");
    jest.spyOn(window, "alert").mockImplementation(() => {});
    mockNavigate.mockReset();
    mockResend.mockReset();
    mockUpdateUser.mockReset();
    mockExchangeCodeForSession.mockReset();
    mockGetSessionFromUrl.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    window.history.replaceState({}, "", "/auth/callback");
    window.location.hash = "";
  });

  test("handles missing params by redirecting back to login", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<AuthCallback />);

    expect(
      await screen.findByText(/this link is no longer valid\. please log in again\./i)
    ).toBeInTheDocument();

    await jest.advanceTimersByTimeAsync(1500);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  test("processes PKCE logins and marks the user active", async () => {
    window.history.replaceState({}, "", "/auth/callback?code=pkce-code");
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-1",
          user: { id: "user-1" },
        },
      },
      error: null,
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/profile/user-1"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(window.history.replaceState).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/signup/success", { replace: true });
  });

  test("shows resend confirmation UI for auth errors and submits the resend flow", async () => {
    window.location.hash = "#error=access_denied&error_description=Link%20expired";
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<AuthCallback />);

    expect(await screen.findByText("Link expired")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: "signup",
        email: "user@example.com",
        options: {
          emailRedirectTo: "http://localhost/auth/callback",
        },
      });
    });
    expect(
      screen.getByText(/if an account exists for that email, the confirmation link has been resent/i)
    ).toBeInTheDocument();

    await jest.advanceTimersByTimeAsync(1500);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  test("falls back to the default expired-link copy when no error description is present", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    window.location.hash = "#error=access_denied";
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<AuthCallback />);

    expect(await screen.findByText(/link is no longer not valid/i)).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledWith("supabase auth error:", "access_denied", null);
  });

  test("shows the recovery form for existing sessions and resets the password", async () => {
    window.location.hash = "#type=recovery";
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-2",
          user: { id: "user-2" },
        },
      },
    });
    mockUpdateUser.mockResolvedValue({ error: null });

    const { container } = render(<AuthCallback />);
    expect(await screen.findByText(/reset your password/i)).toBeInTheDocument();

    const passwordInputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: "Password1" } });
    fireEvent.change(passwordInputs[1], { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "Password1",
      });
    });
    expect(screen.getByText(/password has been reset/i)).toBeInTheDocument();

    await jest.advanceTimersByTimeAsync(1500);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  test("shows password validation errors for weak or mismatched passwords", async () => {
    window.location.hash = "#type=recovery";
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-2",
          user: { id: "user-2" },
        },
      },
    });

    const { container } = render(<AuthCallback />);
    expect(await screen.findByText(/reset your password/i)).toBeInTheDocument();

    const passwordInputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: "short" } });
    fireEvent.change(passwordInputs[1], { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  test("recovers from auth callback failures and surfaces password reset errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    window.location.hash = "#type=recovery";
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: null } });
    mockGetSessionFromUrl.mockRejectedValueOnce(new Error("exchange failed"));

    render(<AuthCallback />);

    expect(
      await screen.findByText(/could not finish authentication\. please log in again\./i)
    ).toBeInTheDocument();
    await jest.advanceTimersByTimeAsync(1500);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-3",
          user: { id: "user-3" },
        },
      },
    });
    mockUpdateUser.mockResolvedValue({ error: new Error("bad password") });

    const { container } = render(<AuthCallback />);
    expect(await screen.findByText(/reset your password/i)).toBeInTheDocument();

    const passwordInputs = container.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: "Password1" } });
    fireEvent.change(passwordInputs[1], { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Password could not be reset. Please try again."
      );
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  test("logs profile update failures and redirects to login when no session is created", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    window.location.hash = "#type=signup";
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-5",
          user: { id: "user-5" },
        },
      },
    });
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ errorData: { error: "profile update failed" } }),
    });

    render(<AuthCallback />);
    expect(await screen.findByText(/finishing sign-in/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed updating user activity:",
        "profile update failed"
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/signup/success", { replace: true });

    cleanup();
    window.history.replaceState({}, "", "/auth/callback#type=signup");
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockGetSessionFromUrl.mockResolvedValue({
      data: {},
      error: null,
    });

    render(<AuthCallback />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  test("recovers after auth callback errors when a session becomes available", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    window.history.replaceState({}, "", "/auth/callback?code=broken-code");
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: "token-7",
            user: { id: "user-7" },
          },
        },
      });
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: new Error("pkce failed"),
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("getSessionFromUrl error:", expect.any(Error));
    });
    expect(mockNavigate).toHaveBeenCalledWith("/signup/success", { replace: true });
  });

  test("handles getSessionFromUrl response errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    window.location.hash = "#type=signup";
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: null } });
    mockGetSessionFromUrl.mockResolvedValue({
      data: null,
      error: new Error("url exchange failed"),
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("getSessionFromUrl error:", expect.any(Error));
    });
    expect(
      await screen.findByText(/could not finish authentication\. please log in again\./i)
    ).toBeInTheDocument();
  });
});
