import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InquirySuccess from "../../../../src/pages/Inquiry/InquirySuccess.jsx";

/* NOTE
added instanbul comments to the file where code is unreachable. 
This is mainly because these areas should honestly enver be null 
if we are requiring this information from the users.
*/

// mocks
// mock apiUrl so fetch calls resolve to a test url
jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// mock useAuth to provide a fake session and profile.
// the component uses these to fetch session data from the API.
const mockSession = { access_token: "fake-token" };
const mockProfile = { id: "user-uuid-123" };

jest.mock("../../../../src/context/AuthContext.jsx", () => ({
  useAuth: () => ({
    session: mockSession,
    profile: mockProfile,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// helpers
// wraps the component in MemoryRouter with a session_id search param.
// the component reads session_id from the URL to fetch session details.
function renderWithRouter(searchParams = "?session_id=session-abc") {
  return render(
    <MemoryRouter initialEntries={[`/inquiry-success${searchParams}`]}>
      <Routes>
        <Route path="/inquiry-success" element={<InquirySuccess />} />
      </Routes>
    </MemoryRouter>,
  );
}

// mirrors the shape of the API response the component expects.
// User.id must match mockProfile.id or the component throws an ownership error.
const mockSessionData = {
  User: {
    id: "user-uuid-123",
    first_name: "Test",
    last_name: "Man",
    email: "testman@example.com",
  },
  SessionType: { name: "Testing Session Type" },
  start_at: "2026-04-024T09:00:00+00:00",
  location_text: "Sacramento, CA",
};

function mockFetchSuccess(data = mockSessionData) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

function mockFetchFailure() {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: "Not found" }),
  });
}

// TESTS

describe("InquirySuccess PAGE", () => {
  // fetch never resolves so the component stays in its loading branch
  test("1. shows loading text while fetching session data", () => {
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    renderWithRouter();
    expect(screen.getByText("Loading details...")).toBeInTheDocument();
  });

  // the component checks for session_id on mount and redirects if missing.
  // passing an empty string simulates no query params in the URL.
  test("2. navigates to inquiry page when session_id is missing", () => {
    renderWithRouter("");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry", {
      replace: true,
    });
  });

  test("3. renders the page heading", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /request received/i }),
      ).toBeInTheDocument();
    });
  });

  // the component concatenates User.first_name and User.last_name from the API response
  test("4. renders the client name in the subtitle", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/Test Man/i)).toBeInTheDocument();
    });
  });

  test("5. renders the session type", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Testing Session Type")).toBeInTheDocument();
    });
  });

  test("6. renders the location", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Sacramento, CA")).toBeInTheDocument();
    });
  });

  test("7. renders the contact email", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("testman@example.com")).toBeInTheDocument();
    });
  });

  test("8. renders the confirmation subheading", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/here's what i received/i)).toBeInTheDocument();
    });
  });

  test("9. renders the spam folder reminder", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      expect(
        screen.getByText(/check your spam\/junk folder/i),
      ).toBeInTheDocument();
    });
  });

  test("10. renders Back to Home link", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /back to home/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });
  });

  test("11. renders Go to Dashboard link", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /go to dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard");
    });
  });

  test("12. renders Submit Another Inquiry link", async () => {
    mockFetchSuccess();
    renderWithRouter();
    await waitFor(() => {
      const link = screen.getByRole("link", {
        name: /submit another inquiry/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/dashboard/inquiry");
    });
  });

  // verifies the component builds the correct API URL using the session_id
  // from the search params and passes the auth token from useAuth
  test("13. calls fetch with correct URL and auth header", () => {
    global.fetch.mockReturnValueOnce(new Promise(() => {}));
    renderWithRouter();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/sessions/session-abc"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
        }),
      }),
    );
  });

  // when the API returns a non-ok response, the component catches the error
  // and redirects back to the inquiry form
  test("14. redirects to inquiry page on fetch failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockFetchFailure();
    renderWithRouter();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry", {
        replace: true,
      });
    });
  });

  // technically this should NEVER be missing since its required at time of submitting a booking request
  test("15. renders N/A when session type is missing", async () => {
    mockFetchSuccess({ ...mockSessionData, SessionType: null });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  // technically this should NEVER be missing since its required at time of submitting a booking request
  // when User email is null, the component renders N/A instead
  test("16. renders 'N/A' when email is missing", async () => {
    mockFetchSuccess({
      ...mockSessionData,
      User: { ...mockSessionData.User, email: null },
    });
    renderWithRouter();
    await waitFor(() => {
      const notAvail = screen.getAllByText("N/A");
      expect(notAvail.length).toBeGreaterThanOrEqual(1);
    });
  });

  // when location_text is null, the component renders N/A instead
  test("18. renders 'N/A' when location is missing", async () => {
    mockFetchSuccess({ ...mockSessionData, location_text: null });
    renderWithRouter();
    await waitFor(() => {
      const notAvail = screen.getAllByText("N/A");
      expect(notAvail.length).toBeGreaterThanOrEqual(1);
    });
  });

  // when the session belongs to a different user, the component catches
  // the ownership error and redirects back to the inquiry form
  test("19. redirects when session does not belong to current user", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockFetchSuccess({
      ...mockSessionData,
      User: { ...mockSessionData.User, id: "different-user-id" },
    });
    renderWithRouter();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry", {
        replace: true,
      });
    });
  });
});
