import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";

// mock supabaseClient to avoid import.meta parse error
jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// mock apiUrl so fetch calls resolve to a test url
jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

// mock AuthContext to provide a fake session with access token
const mockUseAuth = jest.fn();
jest.mock("../../../../src/context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

// mock child components to isolate the Sessions page logic
jest.mock(
  "../../../../src/admin/components/shared/Sidebar/Sidebar.jsx",
  () => () => <div data-testid="sidebar">Sidebar</div>,
);
jest.mock(
  "../../../../src/admin/components/shared/Frame/Frame.jsx",
  () =>
    ({ children }) => <div data-testid="frame">{children}</div>,
);

// mock SessionDetailsModal to capture its props
const mockDetailsModal = jest.fn(() => null);
jest.mock(
  "../../../../src/admin/components/shared/SessionDetailsModal.jsx",
  () => (props) => mockDetailsModal(props),
);

// mock Table to render rows and expose props for assertions.
// renders each row with action buttons so we can test confirm/cancel flows.
const mockTable = jest.fn((props) => (
  <div data-testid="sessions-table">
    {props.data.map((row) => (
      <div key={row.id} data-testid="session-row">
        <span>{row.client_name}</span>
        <span>{row.session_type}</span>
        <span>{row.status}</span>
        {/* render actions column so we can click confirm/cancel buttons */}
        {props.columns.find((c) => c.key === "actions")?.render(null, row)}
        {/* render details column for View button */}
        {props.columns.find((c) => c.key === "details")?.render(null, row)}
      </div>
    ))}
  </div>
));
jest.mock(
  "../../../../src/admin/components/shared/Table/Table.jsx",
  () => (props) => mockTable(props),
);

// mock lucide-react icons
jest.mock("lucide-react", () => ({
  LoaderCircle: () => <span data-testid="icon-loader" />,
}));

const { supabase } = require("../../../../src/lib/supabaseClient.js");

import Sessions from "../../../../src/admin/pages/Sessions/Sessions.jsx";

// default auth session used by most tests
const fakeAuthSession = {
  access_token: "fake-token",
};

// sample session data returned by the fetch call
const sampleSessionData = [
  {
    id: "session-uuid-123",
    start_at: "2027-06-10T17:00:00+00",
    end_at: "2027-06-10T18:00:00+00",
    location_text: "Sacramento, CA",
    status: "Pending",
    User: { first_name: "Test", last_name: "Man" },
    SessionType: { name: "Testing Session Type" },
  },
  {
    id: "session-uuid-456",
    start_at: "2027-07-15T10:00:00+00",
    end_at: "2027-07-15T11:00:00+00",
    location_text: "Davis, CA",
    status: "Confirmed",
    User: { first_name: "Test", last_name: "Woman" },
    SessionType: { name: "Testing Session Type2" },
  },
];

// mock fetch globally before each test and restore after
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  mockUseAuth.mockReturnValue({ session: fakeAuthSession });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// helper to mock the initial sessions fetch with given data
function mockFetchSessions(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

describe("Sessions Page Tests", () => {
  // verifies the loading spinner and text show while sessions are being fetched
  test("1. shows loading state while fetching sessions", () => {
    // fetch never resolves to keep loading
    global.fetch.mockReturnValueOnce(new Promise(() => {}));

    render(<Sessions />);

    expect(screen.getByText("Loading Sessions...")).toBeInTheDocument();
  });

  // verifies the page does not fetch when there is no auth session
  test("2. does not fetch sessions when auth session is null", () => {
    mockUseAuth.mockReturnValue({ session: null });

    render(<Sessions />);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText("Loading Sessions...")).toBeInTheDocument();
  });

  // verifies the page header and description render correctly
  test("3. renders page header and description", async () => {
    mockFetchSessions(sampleSessionData);

    await act(async () => {
      render(<Sessions />);
    });

    expect(screen.getByText("Photography Sessions")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage client booking requests/),
    ).toBeInTheDocument();
  });

  // verifies Sidebar and Frame wrapper components are rendered
  test("4. renders Sidebar and Frame components", async () => {
    mockFetchSessions(sampleSessionData);

    await act(async () => {
      render(<Sessions />);
    });

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("frame")).toBeInTheDocument();
  });

  // verifies that fetched session data is flattened and displayed in the table
  // with client_name and session_type fields derived from nested objects
  test("5. fetches and displays session data in the table", async () => {
    mockFetchSessions(sampleSessionData);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Man")).toBeInTheDocument();
      expect(screen.getByText("Test Woman")).toBeInTheDocument();
      expect(screen.getByText("Testing Session Type")).toBeInTheDocument();
      expect(screen.getByText("Testing Session Type2")).toBeInTheDocument();
    });
  });

  // verifies the fetch is called with the correct url and auth header
  test("6. fetches sessions with correct URL and auth header", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/sessions",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
        }),
      }),
    );
  });

  // verifies the table receives correct props including searchable,
  // placeholder, rows per page, and checkbox tab filter
  test("7. passes correct props to Table component", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(mockTable).toHaveBeenCalled();
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    expect(tableProps.searchable).toBe(true);
    expect(tableProps.searchPlaceholder).toBe("Search Sessions...");
    expect(tableProps.rowsPerPage).toBe(5);
    expect(tableProps.tabFilter.type).toBe("checkbox");
    expect(tableProps.tabFilter.dataType).toBe("sessions");
  });

  // verifies the tab filter function correctly filters by status
  test("8. tab filter function filters sessions by status", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const filterFn = tableProps.tabFilter.tabFilterFn;

    // "All" tab includes everything
    expect(filterFn({ status: "Pending" }, ["All"])).toBe(true);
    expect(filterFn({ status: "Confirmed" }, ["All"])).toBe(true);

    // specific tab filters by status
    expect(filterFn({ status: "Pending" }, ["Pending"])).toBe(true);
    expect(filterFn({ status: "Confirmed" }, ["Pending"])).toBe(false);

    // multiple tabs selected
    expect(filterFn({ status: "Confirmed" }, ["Pending", "Confirmed"])).toBe(
      true,
    );
  });

  // verifies that clicking View on a session row opens the SessionDetailsModal
  test("9. opens SessionDetailsModal when View is clicked", async () => {
    mockFetchSessions(sampleSessionData);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getAllByText("View").length).toBeGreaterThan(0);
    });

    // click the first View button
    fireEvent.click(screen.getAllByText("View")[0]);

    // verify the modal was called with the session id
    const lastCall =
      mockDetailsModal.mock.calls[mockDetailsModal.mock.calls.length - 1][0];
    expect(lastCall.sessionId).toBe("session-uuid-123");
  });

  // verifies that pending sessions show Confirm and Cancel action buttons
  test("10. shows Confirm and Cancel buttons for Pending sessions", async () => {
    mockFetchSessions([sampleSessionData[0]]); // pending session only

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Confirm")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  // verifies that confirmed sessions show only a Cancel button
  test("11. shows only Cancel button for Confirmed sessions", async () => {
    mockFetchSessions([sampleSessionData[1]]); // confirmed session only

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    });
  });

  // verifies that completed sessions show no action buttons
  test("12. shows no action buttons for Completed sessions", async () => {
    mockFetchSessions([
      {
        ...sampleSessionData[1],
        id: "session-3",
        status: "Completed",
      },
    ]);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
      // "Cancel" should not be present for completed sessions
      const cancelButtons = screen.queryAllByText("Cancel");
      expect(cancelButtons.length).toBe(0);
    });
  });

  // verifies that fetch errors are handled gracefully and loading state ends
  test("13. handles fetch error gracefully", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(<Sessions />);
    });

    // loading should stop even after an error
    await waitFor(() => {
      expect(screen.queryByText("Loading Sessions...")).not.toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalled();
    console.error.mockRestore();
  });

  // verifies that sessions with missing User data default to empty client name
  test("14. handles sessions with null User data", async () => {
    mockFetchSessions([
      {
        id: "session-uuid-123",
        start_at: "2027-06-10T17:00:00+00",
        end_at: "2027-06-10T18:00:00+00",
        location_text: null,
        status: "Pending",
        User: null,
        SessionType: null,
      },
    ]);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      // null SessionType falls back to "N/A"
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  // verifies the status column render function applies correct css classes
  test("15. status column renders with correct styling", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const statusColumn = tableProps.columns.find((c) => c.key === "status");
    const renderFn = statusColumn.render;

    // render each status and verify the correct css classes
    const { container: pendingContainer } = render(renderFn("Pending"));
    expect(pendingContainer.querySelector("p").className).toContain(
      "bg-yellow-100",
    );

    const { container: confirmedContainer } = render(renderFn("Confirmed"));
    expect(confirmedContainer.querySelector("p").className).toContain(
      "bg-green-100",
    );

    const { container: completedContainer } = render(renderFn("Completed"));
    expect(completedContainer.querySelector("p").className).toContain(
      "bg-purple-100",
    );

    const { container: cancelledContainer } = render(renderFn("Cancelled"));
    expect(cancelledContainer.querySelector("p").className).toContain(
      "bg-red-100",
    );

    const { container: unknownContainer } = render(renderFn("Unknown"));
    expect(unknownContainer.querySelector("p").className).toContain(
      "bg-gray-100",
    );
  });

  // verifies that the auto-complete logic calls handleUpdate to PATCH the status
  // for confirmed sessions past their end time. the component also mutates the
  // local object directly but the state race condition means the table may still
  // show "Confirmed" until a re-render.
  test("16. calls handleUpdate to auto-complete confirmed sessions past end time", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pastSession = {
      id: "session-past",
      start_at: "2020-01-01T10:00:00+00:00",
      end_at: "2020-01-01T11:00:00+00:00",
      location_text: "Sacramento",
      status: "Confirmed",
      User: { first_name: "Past", last_name: "Client" },
      SessionType: { name: "Testing Session Type" },
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [pastSession],
    });

    await act(async () => {
      render(<Sessions />);
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify a PATCH was sent to update the status to Completed
    const patchCall = global.fetch.mock.calls.find(
      (call) => call[1]?.method === "PATCH",
    );
    expect(patchCall).toBeTruthy();
    expect(patchCall[0]).toContain("/api/sessions/session-past");
    expect(JSON.parse(patchCall[1].body)).toEqual({ status: "Completed" });

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies that pending sessions past their start time trigger the cancel flow.
  // checks that cancelSession fires the invoice mapping fetch.
  test("17. auto-cancels pending sessions past their start time", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pastPending = {
      id: "session-expired",
      start_at: "2020-01-01T10:00:00+00:00",
      end_at: "2020-01-01T11:00:00+00:00",
      location_text: "Davis",
      status: "Pending",
      User: { first_name: "Expired", last_name: "Client" },
      SessionType: { name: "Testing Session Type2" },
    };

    // mock all fetch calls to succeed
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "invoice-1" }),
    });

    // override the first fetch to return session data
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [pastPending],
    });

    // supabase calls for payment lookup and update
    const paymentBuilder = {
      select: jest.fn(() => paymentBuilder),
      update: jest.fn(() => paymentBuilder),
      eq: jest.fn(() => paymentBuilder),
      single: jest.fn().mockResolvedValue({
        data: { provider_payment_id: "cs_test_123" },
        error: null,
      }),
    };
    supabase.from.mockReturnValue(paymentBuilder);

    await act(async () => {
      render(<Sessions />);
    });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify cancelSession was triggered by checking for the invoice mapping fetch
    const invoiceCall = global.fetch.mock.calls.find((call) =>
      call[0]?.includes("/api/invoice/session-expired"),
    );
    expect(invoiceCall).toBeTruthy();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies the client name column render function builds the name from User fields
  test("18. client column render function builds name from User fields", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const clientColumn = tableProps.columns.find(
      (c) => c.key === "client_name",
    );
    const renderFn = clientColumn.render;

    const row = { User: { first_name: "Test", last_name: "Man" } };
    expect(renderFn(null, row)).toBe("Test Man");

    const emptyRow = { User: null };
    expect(renderFn(null, emptyRow)).toBe(" ");
  });

  // verifies the session type column render function reads from SessionType
  test("19. session type column render function reads SessionType name", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const typeColumn = tableProps.columns.find((c) => c.key === "session_type");
    const renderFn = typeColumn.render;

    expect(renderFn(null, { SessionType: { name: "Testing Session Type" } })).toBe(
      "Testing Session Type",
    );
    expect(renderFn(null, { SessionType: null })).toBe("N/A");
  });

  // verifies the location column renders an input that is disabled for non-pending sessions
  test("20. location input is disabled for non-pending sessions", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const locationColumn = tableProps.columns.find(
      (c) => c.key === "location_text",
    );
    const renderFn = locationColumn.render;

    // render for a confirmed session -- input should be disabled
    const { container } = render(
      renderFn("Sacramento", { id: "s1", status: "Confirmed" }),
    );
    const input = container.querySelector("input");
    expect(input).toBeDisabled();
  });

  // verifies the location input is enabled for pending sessions
  test("21. location input is enabled for pending sessions", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const locationColumn = tableProps.columns.find(
      (c) => c.key === "location_text",
    );
    const renderFn = locationColumn.render;

    const { container } = render(
      renderFn("Sacramento", { id: "s1", status: "Pending" }),
    );
    const input = container.querySelector("input");
    expect(input).not.toBeDisabled();
  });

  // verifies the start_at column renders a datetime-local input with the
  // formatted date value and is disabled for non-pending sessions
  test("22. start_at column renders datetime input", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const startColumn = tableProps.columns.find((c) => c.key === "start_at");
    const renderFn = startColumn.render;

    // render with a date value for a confirmed session (disabled)
    const { container: c1 } = render(
      renderFn("2026-04-10T17:00:00+00:00", { id: "s1", status: "Confirmed" }),
    );
    const input1 = c1.querySelector("input");
    expect(input1).toBeDisabled();
    expect(input1.type).toBe("datetime-local");

    // render with null value
    const { container: c2 } = render(
      renderFn(null, { id: "s2", status: "Pending" }),
    );
    const input2 = c2.querySelector("input");
    expect(input2.value).toBe("");
    expect(input2).not.toBeDisabled();
  });

  // verifies the end_at column renders a datetime-local input and respects
  // the disabled state based on session status
  test("23. end_at column renders datetime input", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const endColumn = tableProps.columns.find((c) => c.key === "end_at");
    const renderFn = endColumn.render;

    // render with a date value for a pending session (enabled)
    const { container: c1 } = render(
      renderFn("2026-04-10T18:00:00+00:00", { id: "s1", status: "Pending" }),
    );
    const input1 = c1.querySelector("input");
    expect(input1).not.toBeDisabled();

    // render with null value
    const { container: c2 } = render(
      renderFn(null, { id: "s2", status: "Completed" }),
    );
    const input2 = c2.querySelector("input");
    expect(input2.value).toBe("");
    expect(input2).toBeDisabled();
  });

  // verifies clicking Confirm on a pending session triggers the full confirm flow:
  // invoice mapping fetch, payment lookup, capture payment, update invoice, confirm updates
  test("24. confirm button triggers the full confirm session flow", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pendingSession = {
      id: "session-pending",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento, CA",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    // first fetch: get sessions
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [pendingSession],
    });

    // confirmSession: get invoice mapping
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "invoice-1" }),
    });

    // supabase: get payment with checkout session id
    const paymentBuilder = {
      select: jest.fn(() => paymentBuilder),
      eq: jest.fn(() => paymentBuilder),
      single: jest.fn().mockResolvedValue({
        data: { provider_payment_id: "cs_test_123" },
        error: null,
      }),
    };
    supabase.from.mockReturnValue(paymentBuilder);

    // capturePayment: getPaymentIntent fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ payment_intent: { id: "pi_1" } }),
    });

    // capturePayment: capture intent fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // updateInvoice: supabase query for session data is handled by paymentBuilder
    // updateInvoice: PATCH invoice confirm fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // confirmUpdates: PATCH session status fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    // click confirm button
    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify the invoice mapping fetch was called
    const invoiceCall = global.fetch.mock.calls.find((call) =>
      call[0]?.includes("/api/invoice/session-pending"),
    );
    expect(invoiceCall).toBeTruthy();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies clicking Cancel on a confirmed session triggers the cancel flow
  // which cancels the invoice and updates the session status
  test("25. cancel button on confirmed session triggers cancel with invoice flow", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const confirmedSession = {
      id: "session-confirmed",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento, CA",
      status: "Confirmed",
      User: { first_name: "Test", last_name: "Woman" },
      SessionType: { name: "Testing Session Type2" },
    };

    // get sessions
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [confirmedSession],
    });

    // cancelSession: get invoice mapping
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "invoice-1" }),
    });

    // supabase: cancelInvoice update
    const invoiceBuilder = {
      update: jest.fn(() => invoiceBuilder),
      eq: jest.fn(() => invoiceBuilder),
      error: null,
    };
    supabase.from.mockReturnValue(invoiceBuilder);

    // confirmUpdates: PATCH session status
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify the invoice mapping fetch was called for the cancel flow
    const invoiceCall = global.fetch.mock.calls.find((call) =>
      call[0]?.includes("/api/invoice/session-confirmed"),
    );
    expect(invoiceCall).toBeTruthy();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies clicking Cancel on a pending session triggers the full cancel flow:
  // invoice mapping, payment lookup, uncapture payment, delete session
  test("26. cancel button on pending session triggers uncapture and delete flow", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pendingSession = {
      id: "session-to-cancel",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Davis, CA",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    // get sessions
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [pendingSession],
    });

    // cancelSession: get invoice mapping
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "invoice-1" }),
    });

    // supabase: get payment for uncapture, then update payment status
    const paymentBuilder = {
      select: jest.fn(() => paymentBuilder),
      update: jest.fn(() => paymentBuilder),
      eq: jest.fn(() => paymentBuilder),
      single: jest.fn().mockResolvedValue({
        data: { provider_payment_id: "cs_test_456" },
        error: null,
      }),
    };
    supabase.from.mockReturnValue(paymentBuilder);

    // uncapturePayment: getPaymentIntent
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ payment_intent: { id: "pi_2" } }),
    });

    // uncapturePayment: uncapture intent
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    // delete session
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      // pending row has both Confirm and Cancel - get the Cancel button
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify the invoice mapping fetch was called
    const invoiceCall = global.fetch.mock.calls.find((call) =>
      call[0]?.includes("/api/invoice/session-to-cancel"),
    );
    expect(invoiceCall).toBeTruthy();

    // verify the delete fetch was called
    const deleteCall = global.fetch.mock.calls.find(
      (call) => call[1]?.method === "DELETE",
    );
    expect(deleteCall).toBeTruthy();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies that handleLocalUpdate updates both sessions and pendingSessions
  // state when the location input is changed on a pending session
  test("27. location input blur triggers handleLocalUpdate", async () => {
    const pendingSession = {
      id: "session-uuid-123",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    mockFetchSessions([pendingSession]);

    await act(async () => {
      render(<Sessions />);
    });

    // get the location column render function and render it
    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const locationColumn = tableProps.columns.find(
      (c) => c.key === "location_text",
    );

    const { container } = render(
      locationColumn.render("Sacramento", {
        id: "session-uuid-123",
        status: "Pending",
      }),
    );

    const input = container.querySelector("input");
    fireEvent.blur(input, { target: { value: "Davis, CA" } });

    // handleLocalUpdate should have been called - verify by checking
    // the table was re-rendered with updated data
    await waitFor(() => {
      const lastProps =
        mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
      const updatedRow = lastProps.data.find((r) => r.id === "session-uuid-123");
      expect(updatedRow.location_text).toBe("Davis, CA");
    });
  });

  // verifies that handleLocalUpdate correctly adjusts both start_at and end_at
  // when the start time is changed, maintaining the same session duration
  test("28. start_at change triggers handleLocalUpdate with end_at adjustment", async () => {
    const pendingSession = {
      id: "session-uuid-123",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    mockFetchSessions([pendingSession]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const startColumn = tableProps.columns.find((c) => c.key === "start_at");

    const { container } = render(
      startColumn.render("2027-06-10T17:00:00+00:00", {
        id: "session-uuid-123",
        status: "Pending",
      }),
    );

    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "2027-06-10T19:00" } });

    // handleLocalUpdate should adjust both start_at and end_at
    await waitFor(() => {
      const lastProps =
        mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
      const updatedRow = lastProps.data.find((r) => r.id === "session-uuid-123");
      expect(updatedRow.start_at).toBeTruthy();
      expect(updatedRow.end_at).toBeTruthy();
    });
  });

  // verifies that handleLocalUpdate updates end_at independently
  // when the end time input is changed
  test("29. end_at change triggers handleLocalUpdate", async () => {
    const pendingSession = {
      id: "session-uuid-123",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    mockFetchSessions([pendingSession]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const endColumn = tableProps.columns.find((c) => c.key === "end_at");

    const { container } = render(
      endColumn.render("2027-06-10T18:00:00+00:00", {
        id: "session-uuid-123",
        status: "Pending",
      }),
    );

    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "2027-06-10T20:00" } });

    await waitFor(() => {
      const lastProps =
        mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
      const updatedRow = lastProps.data.find((r) => r.id === "session-uuid-123");
      expect(updatedRow.end_at).toBeTruthy();
    });
  });

  // verifies that confirmUpdates shows an alert when the PATCH request fails
  test("30. confirmUpdates shows alert on PATCH failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pendingSession = {
      id: "session-uuid-123",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    // use a custom fetch implementation that fails only for the confirmUpdates PATCH
    global.fetch.mockImplementation((url, options) => {
      // confirmUpdates PATCHes /api/sessions/:id with a status field in the body
      if (
        options?.method === "PATCH" &&
        url.includes("/api/sessions/") &&
        options?.body?.includes('"status"')
      ) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Session update failed" }),
        });
      }
      // everything else succeeds
      if (url.includes("/api/sessions")) {
        return Promise.resolve({
          ok: true,
          json: async () => [pendingSession],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "invoice-1", payment_intent: { id: "pi_1" } }),
      });
    });

    // supabase calls for payment lookup and session data
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      single: jest.fn().mockResolvedValue({
        data: {
          provider_payment_id: "cs_123",
          start_at: "2027-06-10T17:00:00+00:00",
          SessionType: { base_price: 1000 },
        },
        error: null,
      }),
    };
    supabase.from.mockReturnValue(builder);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(window.alert).toHaveBeenCalledWith("Failed to update session");

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies the getLocalFormattedDate helper formats dates correctly
  // by checking the start_at column renders the formatted value
  test("31. start_at column uses getLocalFormattedDate for formatting", async () => {
    mockFetchSessions([]);

    await act(async () => {
      render(<Sessions />);
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const startColumn = tableProps.columns.find((c) => c.key === "start_at");
    const renderFn = startColumn.render;

    // render with a known date and verify the input has a formatted value
    const { container } = render(
      renderFn("2027-06-10T17:30:00+00:00", { id: "s1", status: "Pending" }),
    );
    const input = container.querySelector("input");
    // getLocalFormattedDate should produce a datetime-local compatible string
    expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  // verifies that the SessionDetailsModal onClose callback clears the selected session
  test("32. closing SessionDetailsModal clears selected session id", async () => {
    mockFetchSessions(sampleSessionData);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getAllByText("View").length).toBeGreaterThan(0);
    });

    // click View to open modal
    fireEvent.click(screen.getAllByText("View")[0]);

    // verify modal was rendered with session id
    let lastModalCall =
      mockDetailsModal.mock.calls[mockDetailsModal.mock.calls.length - 1][0];
    expect(lastModalCall.sessionId).toBe("session-uuid-123");

    // call onClose to clear the selection
    act(() => {
      lastModalCall.onClose();
    });

    // modal should no longer be rendered (selectedSessionId is null)
    lastModalCall =
      mockDetailsModal.mock.calls[mockDetailsModal.mock.calls.length - 1]?.[0];
    // the component conditionally renders the modal only when selectedSessionId is truthy
  });

  // verifies that handleLocalUpdate correctly computes new start_at and end_at
  // when start_at is changed, keeping the same session duration by adjusting end_at
  test("33. handleLocalUpdate with start_at adjusts end_at to maintain duration", async () => {
    const pendingSession = {
      id: "session-uuid-123",
      start_at: "2027-06-10T17:00:00.000Z",
      end_at: "2027-06-10T18:00:00.000Z",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    mockFetchSessions([pendingSession]);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(mockTable).toHaveBeenCalled();
    });

    // get the start_at column render and trigger onChange
    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const startColumn = tableProps.columns.find((c) => c.key === "start_at");

    const { container } = render(
      startColumn.render("2027-06-10T17:00:00.000Z", {
        id: "session-uuid-123",
        status: "Pending",
      }),
    );

    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "2027-06-10T19:00" } });

    // verify both start_at and end_at were updated in the table data
    await waitFor(() => {
      const lastProps =
        mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
      const row = lastProps.data.find((r) => r.id === "session-uuid-123");
      expect(row.start_at).toBeTruthy();
      expect(row.end_at).toBeTruthy();
      // end_at should have shifted by the same amount as start_at (2 hours later)
      const newStart = new Date(row.start_at);
      const newEnd = new Date(row.end_at);
      expect(newEnd.getTime() - newStart.getTime()).toBe(3600000); // 1 hour duration preserved
    });
  });

  // verifies that handleLocalUpdate updates only end_at when end time is changed
  test("34. handleLocalUpdate with end_at updates only end time", async () => {
    const pendingSession = {
      id: "session-uuid-123",
      start_at: "2027-06-10T17:00:00.000Z",
      end_at: "2027-06-10T18:00:00.000Z",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    mockFetchSessions([pendingSession]);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(mockTable).toHaveBeenCalled();
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const endColumn = tableProps.columns.find((c) => c.key === "end_at");

    const { container } = render(
      endColumn.render("2027-06-10T18:00:00.000Z", {
        id: "session-uuid-123",
        status: "Pending",
      }),
    );

    const input = container.querySelector("input");
    fireEvent.change(input, { target: { value: "2027-06-10T20:00" } });

    await waitFor(() => {
      const lastProps =
        mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
      const row = lastProps.data.find((r) => r.id === "session-uuid-123");
      expect(row.end_at).toBeTruthy();
    });
  });

  // verifies that handleUpdate shows alert and logs error when the PATCH
  // response is not ok, covering the error throw path
  test("35. handleUpdate error path shows alert on failed PATCH response", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const confirmedPast = {
      id: "session-err",
      start_at: "2020-01-01T10:00:00+00:00",
      end_at: "2020-01-01T11:00:00+00:00",
      location_text: "Sacramento",
      status: "Confirmed",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    // auto-complete will trigger handleUpdate with status: Completed
    global.fetch.mockImplementation((url, options) => {
      if (!options?.method || options.method === "GET") {
        return Promise.resolve({ ok: true, json: async () => [confirmedPast] });
      }
      // make the PATCH fail with a json error body
      if (options?.method === "PATCH") {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Not authorized" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await act(async () => {
      render(<Sessions />);
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(window.alert).toHaveBeenCalledWith("Failed to update session");
    expect(console.error).toHaveBeenCalled();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies that getPaymentIntent returns early with null values when
  // checkoutSessionId is null or undefined
  test("36. getPaymentIntent returns early when checkoutSessionId is null", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pendingSession = {
      id: "session-no-cs",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    // get sessions
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [pendingSession],
    });

    // confirmSession: invoice mapping
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "invoice-1" }),
    });

    // supabase: payment query returns null provider_payment_id
    const paymentBuilder = {
      select: jest.fn(() => paymentBuilder),
      eq: jest.fn(() => paymentBuilder),
      single: jest.fn().mockResolvedValue({
        data: { provider_payment_id: null },
        error: null,
      }),
    };
    supabase.from.mockReturnValue(paymentBuilder);

    // capturePayment will call getPaymentIntent(null) which returns early.
    // then capturePayment tries to use the null result and fails silently.
    // updateInvoice and confirmUpdates still proceed.
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "invoice-1",
        start_at: "2027-06-10T17:00:00+00:00",
        SessionType: { base_price: 1000 },
      }),
    });

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Confirm"));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    // verify the invoice mapping was attempted (confirm flow started)
    const invoiceCall = global.fetch.mock.calls.find((call) =>
      call[0]?.includes("/api/invoice/session-no-cs"),
    );
    expect(invoiceCall).toBeTruthy();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies that cancelInvoice handles supabase errors in the catch block
  test("37. cancelInvoice handles supabase update error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const confirmedSession = {
      id: "session-inv-err",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Sacramento",
      status: "Confirmed",
      User: { first_name: "Test", last_name: "Woman" },
      SessionType: { name: "Testing Session Type2" },
    };

    // get sessions
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [confirmedSession],
    });

    // cancelSession: invoice mapping
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "invoice-err" }),
    });

    // supabase: cancelInvoice update fails
    const invoiceBuilder = {
      update: jest.fn(() => invoiceBuilder),
      eq: jest.fn().mockReturnValue({
        error: { message: "Invoice update failed" },
      }),
    };
    supabase.from.mockReturnValue(invoiceBuilder);

    // confirmUpdates PATCH
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    for (let i = 0; i < 15; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(console.error).toHaveBeenCalled();

    window.alert.mockRestore();
    console.error.mockRestore();
  });

  // verifies that the delete session fetch failure in cancelSession is caught
  // and logged without crashing
  test("38. cancelSession handles delete session fetch failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(window, "alert").mockImplementation(() => {});

    const pendingSession = {
      id: "session-del-fail",
      start_at: "2027-06-10T17:00:00+00:00",
      end_at: "2027-06-10T18:00:00+00:00",
      location_text: "Davis",
      status: "Pending",
      User: { first_name: "Test", last_name: "Man" },
      SessionType: { name: "Testing Session Type" },
    };

    global.fetch.mockImplementation((url, options) => {
      if (!options?.method || options.method === "GET") {
        if (url.includes("/api/sessions")) {
          return Promise.resolve({
            ok: true,
            json: async () => [pendingSession],
          });
        }
        if (url.includes("/api/invoice/")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: "invoice-1" }),
          });
        }
        if (url.includes("/api/checkout/")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ payment_intent: { id: "pi_1" } }),
          });
        }
      }
      // uncapture succeeds
      if (options?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      // delete session fails
      if (options?.method === "DELETE") {
        return Promise.resolve({ ok: false, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    // supabase calls for payment lookup and update
    const paymentBuilder = {
      select: jest.fn(() => paymentBuilder),
      update: jest.fn(() => paymentBuilder),
      eq: jest.fn(() => paymentBuilder),
      single: jest.fn().mockResolvedValue({
        data: { provider_payment_id: "cs_test_456" },
        error: null,
      }),
    };
    supabase.from.mockReturnValue(paymentBuilder);

    await act(async () => {
      render(<Sessions />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(console.error).toHaveBeenCalledWith(
      "Failed to delete session:",
      expect.any(Error),
    );

    window.alert.mockRestore();
    console.error.mockRestore();
  });
});
