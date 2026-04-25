import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
    },
  },
}));

import { AuthProvider, useAuth } from "../../../src/context/AuthContext.jsx";

function Consumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="session">{auth.session?.access_token || "none"}</span>
      <span data-testid="user">{auth.user?.id || "none"}</span>
      <span data-testid="profile">{auth.profile?.roleName || "none"}</span>
      <button onClick={() => auth.setProfile({ roleName: "Edited" })}>Edit</button>
    </div>
  );
}

describe("AuthProvider", () => {
  let subscription;
  let originalFetch;

  beforeEach(() => {
    subscription = { unsubscribe: jest.fn() };
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "user-1",
        role_name: "User",
      }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("loads the initial session and profile, then exposes setters", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-1",
          user: { id: "user-1" },
        },
      },
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("session")).toHaveTextContent("token-1");
    expect(screen.getByTestId("user")).toHaveTextContent("user-1");
    expect(screen.getByTestId("profile")).toHaveTextContent("User");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/profile/user-1"),
      expect.objectContaining({ method: "GET" })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    });
    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("Edited");
    });
  });

  test("handles missing profiles and auth state changes, then unsubscribes", async () => {
    let authHandler;
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });
    mockOnAuthStateChange.mockImplementation((handler) => {
      authHandler = handler;
      return { data: { subscription } };
    });

    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "user-2",
          role_name: "Admin",
        }),
      });

    const { unmount } = render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("profile")).toHaveTextContent("none");

    await act(async () => {
      await authHandler("SIGNED_IN", {
        access_token: "token-2",
        user: { id: "user-2" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("Admin");
    });

    await act(async () => {
      await authHandler("SIGNED_OUT", null);
    });
    await waitFor(() => {
      expect(screen.getByTestId("session")).toHaveTextContent("none");
      expect(screen.getByTestId("profile")).toHaveTextContent("none");
    });

    unmount();
    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  test("keeps profile null when the API returns no row or a non-ok response", async () => {
    let authHandler;
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-3",
          user: { id: "user-3" },
        },
      },
    });
    mockOnAuthStateChange.mockImplementation((handler) => {
      authHandler = handler;
      return { data: { subscription } };
    });

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "denied" }),
      });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("none");
    });

    await act(async () => {
      await authHandler("TOKEN_REFRESHED", {
        access_token: "token-4",
        user: { id: "user-4" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("none");
    });
  });

  test("leaves the profile unset when the initial profile request is not ok", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-5",
          user: { id: "user-5" },
        },
      },
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription },
    });
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "denied" }),
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("profile")).toHaveTextContent("none");
    expect(screen.getByTestId("session")).toHaveTextContent("token-5");
  });

  test("clears the profile when an auth change returns no user row", async () => {
    let authHandler;
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-6",
          user: { id: "user-6" },
        },
      },
    });
    mockOnAuthStateChange.mockImplementation((handler) => {
      authHandler = handler;
      return { data: { subscription } };
    });
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "user-6",
          role_name: "User",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("User");
    });

    await act(async () => {
      await authHandler("USER_UPDATED", {
        access_token: "token-6b",
        user: { id: "user-6" },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("profile")).toHaveTextContent("none");
    });
  });

  test("starts and stays anonymous when no session exists", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("profile")).toHaveTextContent("none");
    expect(fetch).not.toHaveBeenCalled();
  });
});
