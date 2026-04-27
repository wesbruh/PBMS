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

// mock Sidebar and Frame so we don't need their full dependency trees
jest.mock(
  "../../../../src/admin/components/shared/Sidebar/Sidebar.jsx",
  () => () => <div data-testid="sidebar">Sidebar</div>,
);
jest.mock(
  "../../../../src/admin/components/shared/Frame/Frame.jsx",
  () =>
    ({ children }) => <div data-testid="frame">{children}</div>,
);

// mock the Table component to expose its props for assertions.
// renders column headers and row data so we can verify the mapped data.
const mockTable = jest.fn((props) => (
  <div data-testid="galleries-table">
    {props.data.map((row) => (
      <div key={row.id} data-testid="gallery-row">
        <span>{row.clientName}</span>
        <span>{row.type}</span>
        <span>{row.date}</span>
        <span>{row.status}</span>
        <span>{row.location}</span>
        {/* render the actions column so we can click upload/view buttons */}
        {props.columns.find((c) => c.key === "actions")?.render(null, row)}
      </div>
    ))}
  </div>
));
jest.mock(
  "../../../../src/admin/components/shared/Table/Table.jsx",
  () => (props) => mockTable(props),
);

// mock the UploadGalleryModal to capture its props without rendering the full modal
const mockUploadModal = jest.fn(() => null);
jest.mock(
  "../../../../src/admin/pages/Galleries/UploadGalleryModal.jsx",
  () => (props) => mockUploadModal(props),
);

// mock lucide-react icons
jest.mock("lucide-react", () => ({
  Upload: () => <span data-testid="icon-upload" />,
  FolderCheck: () => <span data-testid="icon-folder-check" />,
  LoaderCircle: () => <span data-testid="icon-loader" />,
}));

const { supabase } = require("../../../../src/lib/supabaseClient.js");

import AdminGalleries from "../../../../src/admin/pages/Galleries/Galleries.jsx";

// builds a fake chainable supabase query builder.
// the last method in the chain (order) resolves with the provided result.
function mockQueryBuilder(result = {}) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn().mockResolvedValue({
      data: result.data ?? [],
      error: result.error ?? null,
    }),
  };
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Admin Galleries Page Tests", () => {
  // verifies the loading spinner and text appear while data is being fetched
  test("1. shows loading state while fetching galleries", () => {
    // return a builder whose order() never resolves to keep loading state
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      order: jest.fn(() => new Promise(() => {})),
    };
    supabase.from.mockReturnValue(builder);

    render(<AdminGalleries />);

    expect(screen.getByText("Loading galleries...")).toBeInTheDocument();
  });

  // verifies the page header and subheader render correctly
  test("2. renders page header and description", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(mockQueryBuilder({ data: [], error: null }));

    await act(async () => {
      render(<AdminGalleries />);
    });

    expect(screen.getByText("Galleries")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload, organize, and manage galleries/),
    ).toBeInTheDocument();

    console.error.mockRestore();
  });

  // verifies that Sidebar and Frame wrapper components are rendered
  test("3. renders Sidebar and Frame components", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(mockQueryBuilder({ data: [], error: null }));

    await act(async () => {
      render(<AdminGalleries />);
    });

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("frame")).toBeInTheDocument();

    console.error.mockRestore();
  });

  // verifies that an error message is shown when the supabase fetch fails
  test("4. shows error message when fetch fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        error: { message: "Database connection failed" },
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Database connection failed"),
      ).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalled();
    console.error.mockRestore();
  });

  // verifies that session data from supabase is correctly mapped and passed
  // to the Table component with all expected fields
  test("5. maps supabase session data to table rows", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-uuid-123",
            start_at: "2026-04-26T09:00:00+00",
            end_at: "2026-04-26T18=0:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Tesing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Man")).toBeInTheDocument();
      expect(screen.getByText("Tesing Session Type")).toBeInTheDocument();
      expect(screen.getByText("Sacramento, CA")).toBeInTheDocument();
      expect(screen.getByText("Awaiting Gallery")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that a session with an existing gallery shows "Gallery Uploaded" status
  test("6. shows Gallery Uploaded status when gallery exists", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-20T09:00:00+00",
            end_at: "2026-04-20T10:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Tesing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [
              {
                id: "gallery-1",
                published_at: "2026-04-15T10:00:00+00",
                created_at: "2026-04-14T10:00:00+00",
              },
            ],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Gallery Uploaded")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the upload button appears for sessions without a gallery
  test("7. shows Upload Gallery button for sessions awaiting gallery", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies the notified button appears for sessions that already have a gallery
  test("8. shows Notified button for sessions with uploaded gallery", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [
              { id: "gallery-1", published_at: "2026-04-15T10:00:00+00" },
            ],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Notified on/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies clicking Upload Gallery opens the upload modal by setting isUploadModalOpen
  test("9. opens upload modal when Upload Gallery is clicked", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Upload Gallery"));

    // verify the modal was called with isOpen true after clicking upload
    const lastCall =
      mockUploadModal.mock.calls[mockUploadModal.mock.calls.length - 1][0];
    expect(lastCall.isOpen).toBe(true);
    expect(lastCall.session).toBeTruthy();

    console.error.mockRestore();
  });

  // verifies the correct supabase query structure: Session table with
  // proper joins, filters for is_active and Completed status, ordered descending
  test("10. queries Session table with correct filters and joins", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(mockQueryBuilder({ data: [], error: null }));

    await act(async () => {
      render(<AdminGalleries />);
    });

    expect(supabase.from).toHaveBeenCalledWith("Session");

    const builder = supabase.from.mock.results[0].value;
    expect(builder.select).toHaveBeenCalledWith(
      expect.stringContaining("User"),
    );
    expect(builder.select).toHaveBeenCalledWith(
      expect.stringContaining("SessionType"),
    );
    expect(builder.select).toHaveBeenCalledWith(
      expect.stringContaining("Invoice"),
    );
    expect(builder.select).toHaveBeenCalledWith(
      expect.stringContaining("Gallery"),
    );
    expect(builder.eq).toHaveBeenCalledWith("is_active", true);
    expect(builder.eq).toHaveBeenCalledWith("status", "Completed");
    expect(builder.order).toHaveBeenCalledWith("start_at", {
      ascending: false,
    });

    console.error.mockRestore();
  });

  // verifies that missing user data falls back to "Unknown Client"
  test("11. handles missing User data gracefully", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: null,
            location_text: null,
            status: "Completed",
            User: null,
            SessionType: null,
            Invoice: null,
            Gallery: null,
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      // null User should fall back to "Unknown Client"
      expect(screen.getByText("Unknown Client")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that missing SessionType, location, and Invoice data use fallback values
  test("12. handles null SessionType and location with fallback dashes", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: null,
            end_at: null,
            location_text: null,
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: null,
            Invoice: null,
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      // null start_at uses a dash for date
      expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);
    });

    console.error.mockRestore();
  });

  // verifies the table receives the correct props including searchable,
  // searchPlaceholder, rowsPerPage, and tabFilter
  test("13. passes correct props to Table component", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(mockQueryBuilder({ data: [], error: null }));

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(mockTable).toHaveBeenCalled();
    });

    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    expect(tableProps.searchable).toBe(true);
    expect(tableProps.searchPlaceholder).toBe("Search Galleries...");
    expect(tableProps.rowsPerPage).toBe(5);
    expect(tableProps.tabFilter).toBeTruthy();
    expect(tableProps.tabFilter.dataType).toBe("sessions");

    console.error.mockRestore();
  });

  // verifies that a Gallery returned as a single object (not array) is
  // handled correctly and still shows "Gallery Uploaded"
  test("14. handles Gallery as a single object instead of array", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Davis, CA",
            status: "Completed",
            User: { first_name: "Bob", last_name: "Smith" },
            SessionType: { name: "Portrait" },
            Invoice: { remaining: 0 },
            // gallery as a single object instead of an array
            Gallery: {
              id: "gallery-1",
              published_at: "2026-04-15T10:00:00+00",
              created_at: "2026-04-14T10:00:00+00",
            },
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Gallery Uploaded")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that clicking upload on a session with remaining balance
  // triggers a window.confirm dialog before opening the modal.
  // uses window.confirm mock to simulate user clicking "OK".
  test("15. shows confirmation dialog when uploading for session with remaining balance", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 500 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Upload Gallery"));

    expect(confirmSpy).toHaveBeenCalledWith(
      "The session has not been fully paid for. Continue?",
    );

    // modal should still open since user confirmed
    const lastCall =
      mockUploadModal.mock.calls[mockUploadModal.mock.calls.length - 1][0];
    expect(lastCall.isOpen).toBe(true);

    confirmSpy.mockRestore();
    console.error.mockRestore();
  });

  // verifies that cancelling the confirmation dialog does not open the modal
  test("16. does not open modal when confirmation is cancelled", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 500 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Upload Gallery"));

    // modal should not open since user cancelled the confirmation
    const lastCall =
      mockUploadModal.mock.calls[mockUploadModal.mock.calls.length - 1][0];
    expect(lastCall.isOpen).toBe(false);

    confirmSpy.mockRestore();
    console.error.mockRestore();
  });

  // verifies that handleUploadSuccess updates the table row status and
  // shows an alert with the upload details
  test("17. updates gallery status after successful upload", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    });

    // open the modal
    fireEvent.click(screen.getByText("Upload Gallery"));

    // grab the onUploadSuccess callback from the modal props and call it
    const modalCall =
      mockUploadModal.mock.calls[mockUploadModal.mock.calls.length - 1][0];
    act(() => {
      modalCall.onUploadSuccess({
        photoCount: 10,
        failedCount: 0,
        clientEmail: "jane@test.com",
      });
    });

    // verify the alert was shown with upload details
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("10 photos"));

    alertSpy.mockRestore();
    console.error.mockRestore();
  });

  // verifies that the UploadGalleryModal receives an onClose callback
  // that sets isUploadModalOpen back to false
  test("18. closes upload modal via onClose callback", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText("Upload Gallery")).toBeInTheDocument();
    });

    // open the modal
    fireEvent.click(screen.getByText("Upload Gallery"));

    let lastCall =
      mockUploadModal.mock.calls[mockUploadModal.mock.calls.length - 1][0];
    expect(lastCall.isOpen).toBe(true);

    // call the onClose callback to close the modal
    act(() => {
      lastCall.onClose();
    });

    lastCall =
      mockUploadModal.mock.calls[mockUploadModal.mock.calls.length - 1][0];
    expect(lastCall.isOpen).toBe(false);

    console.error.mockRestore();
  });

  // verifies that supabase returning null data is handled without crashing
  test("19. handles null data from supabase gracefully", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({ data: null, error: null }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    // should render the table with empty data
    await waitFor(() => {
      expect(screen.getByTestId("galleries-table")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  // verifies that a gallery with created_at but no published_at still
  // shows the upload date from created_at as a fallback
  test("20. uses created_at as fallback when published_at is missing", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-1",
            start_at: "2026-04-10T17:00:00+00",
            end_at: "2026-04-10T18:00:00+00",
            location_text: "Sacramento, CA",
            status: "Completed",
            User: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            // gallery has created_at but no published_at
            Gallery: [
              {
                id: "gallery-1",
                published_at: null,
                created_at: "2026-04-14T10:00:00+00",
              },
            ],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Notified on/)).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  test("21. tab filters shows only fully paid sessions when Fully Paid tab is selected", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    supabase.from.mockReturnValue(
      mockQueryBuilder({
        data: [
          {
            id: "session-uuid-1",
            start_at: "2026-04-122T09:00:00+00",
            end_at: "2026-04-122T10:00:00+00",
            location_text: "Sacramento, CA",
            status: { first_name: "Test", last_name: "Man" },
            SessionType: { name: "Testing Session Type" },
            Invoice: { remaining: 0 },
            Gallery: [],
          },
          {
            id: "session-uuid-2",
            start_at: "2026-04-23T09:00:00+00",
            end_at: "2026-04-23T10:00:00+00",
            location_text: "Sacramento, CA",
            status: { first_name: "Test", last_name: "Woman" },
            SessionType: { name: "Testing Session Type2" },
            Invoice: { remaining: 5000 },
            Gallery: [],
          },
        ],
        error: null,
      }),
    );

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(mockTable).toHaveBeenCalled();
    });

    // grab the tableFilterFn from props passed to Table
    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const filterFn = tableProps.tabFilter.tabFilterFn;

    // "All" tab should include every row
    expect(filterFn({ remainingDue: 0 }, "All")).toBe(true);
    expect(filterFn({ remainingDue: 500 }, "All")).toBe(true);
    // "Fully Paid" tab should only include rows with remainingDue === 0
    expect(filterFn({ remainingDue: 0 }, "Fully Paid")).toBe(true);
    expect(filterFn({ remainingDue: 500 }, "Fully Paid")).toBe(false);

    console.error.mockRestore();
  });

  // verifies the status column render function produces the correct css classes
  // for "Awaiting Gallery" and "Gallery Uploaded" statuses
  test("22. status column render function applies correct styling", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockReturnValue(mockQueryBuilder({ data: [], error: null }));

    await act(async () => {
      render(<AdminGalleries />);
    });

    await waitFor(() => {
      expect(mockTable).toHaveBeenCalled();
    });

    // grab the status column render function from the table props
    const tableProps = mockTable.mock.calls[mockTable.mock.calls.length - 1][0];
    const statusColumn = tableProps.columns.find((c) => c.key === "status");
    const renderFn = statusColumn.render;

    // render "Awaiting Gallery" status and check for orange styling
    const { container: awaitingContainer } = render(
      renderFn("Awaiting Gallery"),
    );
    const awaitingSpan = awaitingContainer.querySelector("span");
    expect(awaitingSpan.textContent).toBe("Awaiting Gallery");
    expect(awaitingSpan.className).toContain("bg-orange-100");

    // render "Gallery Uploaded" status and check for green styling
    const { container: uploadedContainer } = render(
      renderFn("Gallery Uploaded"),
    );
    const uploadedSpan = uploadedContainer.querySelector("span");
    expect(uploadedSpan.textContent).toBe("Gallery Uploaded");
    expect(uploadedSpan.className).toContain("bg-green-100");

    // render an unknown status and check for gray fallback styling
    const { container: unknownContainer } = render(renderFn("Something Else"));
    const unknownSpan = unknownContainer.querySelector("span");
    expect(unknownSpan.className).toContain("bg-gray-100");

    console.error.mockRestore();
  });
});
