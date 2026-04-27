import { render } from "@testing-library/react";

const mockUseAuth = jest.fn();
const mockSignOut = jest.fn();

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}));

import IdleLogout from "../../../../src/components/IdleLogout.jsx";

describe("IdleLogout", () => {
  let originalFetch;

  beforeEach(() => {
    jest.useFakeTimers();
    originalFetch = global.fetch;
    mockSignOut.mockClear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("logs out inactive authenticated users and marks them inactive first", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      loading: false,
      user: { id: "user-1" },
      session: { access_token: "access-token" },
    });

    render(<IdleLogout timeoutMs={1000} />);

    await jest.advanceTimersByTimeAsync(1000);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/profile/user-1"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  test("logs server errors and reschedules on activity", async () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");

    mockUseAuth.mockReturnValue({
      loading: false,
      user: { id: "user-2" },
      session: { access_token: "access-token" },
    });

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "cannot update" }),
    });

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<IdleLogout timeoutMs={1000} />);

    window.dispatchEvent(new Event("mousemove"));
    await jest.advanceTimersByTimeAsync(1000);

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to mark user inactive:",
      "cannot update"
    );
    expect(addSpy).toHaveBeenCalled();

    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });

  test("does not schedule logout while auth is still loading or missing", async () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      user: null,
      session: null,
    });

    render(<IdleLogout timeoutMs={1000} />);
    await jest.advanceTimersByTimeAsync(1000);

    expect(fetch).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test("uses the default timeout and ignores activity without a session", async () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      user: { id: "user-3" },
      session: null,
    });

    render(<IdleLogout />);
    window.dispatchEvent(new Event("click"));
    await jest.advanceTimersByTimeAsync(30 * 60 * 1000);

    expect(fetch).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
