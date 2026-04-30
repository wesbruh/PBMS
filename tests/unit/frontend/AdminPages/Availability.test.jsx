import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../../src/admin/components/shared/Sidebar/Sidebar.jsx", () => {
  return function Sidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock("../../../../src/admin/components/shared/Frame/Frame.jsx", () => {
  return function Frame({ children }) {
    return <div data-testid="frame">{children}</div>;
  };
});

import Availability from "../../../../src/admin/pages/Availability/Availability";
import { useAuth } from "../../../../src/context/AuthContext";

describe("Availability", () => {
  const originalFetch = global.fetch;
  const originalAlert = global.alert;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.alert = jest.fn();
    console.error = jest.fn();

    useAuth.mockReturnValue({
      session: {
        access_token: "test-token",
      },
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.alert = originalAlert;
    console.error = originalConsoleError;
  });

  function getVisibleDateStrings() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    return {
      startIso: `${yyyy}-${mm}-${dd}T09:00:00`,
      endIso: `${yyyy}-${mm}-${dd}T09:15:00`,
    };
  }

  function mockInitialAvailabilityResponse({
    settings = {
      work_start_time: "09:00:00",
      work_end_time: "17:00:00",
    },
    blocks = [],
    ok = true,
  } = {}) {
    global.fetch.mockResolvedValueOnce({
      ok,
      json: jest.fn().mockResolvedValue({
        settings,
        blocks,
      }),
    });
  }

  async function waitForLoadedGrid() {
    await waitForElementToBeRemoved(() =>
      screen.queryByText("Loading availability...")
    );

    expect(
      await screen.findByRole("button", { name: "Set Default" })
    ).toBeInTheDocument();
  }

  test("renders loading state then loads settings and availability grid", async () => {
    mockInitialAvailabilityResponse();

    render(<Availability />);

    expect(screen.getByText("Loading availability...")).toBeInTheDocument();

    await waitForLoadedGrid();

    expect(screen.getByText("Photographer Availability")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Start time hour" })).toHaveValue("9");
    expect(screen.getByRole("combobox", { name: "Start time minute" })).toHaveValue("00");
    expect(screen.getByRole("combobox", { name: "Start time period" })).toHaveValue("AM");
    expect(screen.getByRole("combobox", { name: "End time hour" })).toHaveValue("5");
    expect(screen.getByRole("combobox", { name: "End time minute" })).toHaveValue("00");
    expect(screen.getByRole("combobox", { name: "End time period" })).toHaveValue("PM");
  });

  test("correctly displays 00:00 as 12:00 AM in custom selectors", async () => {
    mockInitialAvailabilityResponse({
      settings: {
        work_start_time: "00:00:00",
        work_end_time: "23:45:00",
      },
    });

    render(<Availability />);

    await waitForLoadedGrid();

    expect(screen.getByRole("combobox", { name: "Start time hour" })).toHaveValue("12");
    expect(screen.getByRole("combobox", { name: "Start time minute" })).toHaveValue("00");
    expect(screen.getByRole("combobox", { name: "Start time period" })).toHaveValue("AM");
    expect(screen.getByRole("combobox", { name: "End time hour" })).toHaveValue("11");
    expect(screen.getByRole("combobox", { name: "End time minute" })).toHaveValue("45");
    expect(screen.getByRole("combobox", { name: "End time period" })).toHaveValue("PM");
  });

  test("loads selected blocks as unavailable cells", async () => {
    const { startIso, endIso } = getVisibleDateStrings();

    mockInitialAvailabilityResponse({
      blocks: [
        {
          start_time: startIso,
          end_time: endIso,
        },
      ],
    });

    render(<Availability />);

    await waitForLoadedGrid();

    await waitFor(() => {
      expect(screen.getAllByTitle("Unavailable").length).toBeGreaterThan(0);
    });
  });

  test("shows error message when fetchAvailability response is not ok", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn(),
    });

    render(<Availability />);

    expect(
      await screen.findByText("Failed to load availability.")
    ).toBeInTheDocument();
  });

  test("shows error message when fetchAvailability throws", async () => {
    global.fetch.mockRejectedValueOnce(new Error("network error"));

    render(<Availability />);

    expect(
      await screen.findByText("Failed to load availability.")
    ).toBeInTheDocument();

    expect(console.error).toHaveBeenCalledWith(
      "Error loading availability:",
      expect.any(Error)
    );
  });

  test("does not fetch when session is missing", async () => {
    useAuth.mockReturnValue({
      session: null,
    });

    render(<Availability />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  test("saves settings and sends 24-hour HH:MM values from selectors", async () => {
    mockInitialAvailabilityResponse();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn(),
    });

    render(<Availability />);

    await waitForLoadedGrid();

    fireEvent.change(screen.getByRole("combobox", { name: "Start time hour" }), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Start time minute" }), {
      target: { value: "00" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Start time period" }), {
      target: { value: "AM" },
    });

    fireEvent.change(screen.getByRole("combobox", { name: "End time hour" }), {
      target: { value: "11" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "End time minute" }), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "End time period" }), {
      target: { value: "PM" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Set Default" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:5001/api/availability/settings",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
          body: expect.stringContaining('"start":"00:00"'),
        })
      );
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:5001/api/availability/settings",
      expect.objectContaining({
        body: expect.stringContaining('"end":"23:45"'),
      })
    );
  });

  test("alerts when end time is not later than start time", async () => {
    mockInitialAvailabilityResponse();

    render(<Availability />);

    await waitForLoadedGrid();

    fireEvent.change(screen.getByRole("combobox", { name: "Start time hour" }), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Start time minute" }), {
      target: { value: "00" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Start time period" }), {
      target: { value: "PM" },
    });

    fireEvent.change(screen.getByRole("combobox", { name: "End time hour" }), {
      target: { value: "9" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "End time minute" }), {
      target: { value: "00" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "End time period" }), {
      target: { value: "AM" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Set Default" }));

    expect(global.alert).toHaveBeenCalledWith("End time must be later than start time.");
  });

  test("alerts when saving settings fails", async () => {
    mockInitialAvailabilityResponse();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn(),
    });

    render(<Availability />);

    await waitForLoadedGrid();

    fireEvent.click(screen.getByRole("button", { name: "Set Default" }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Error saving settings");
    });
  });

  test("toggles a future slot on mouse down", async () => {
    mockInitialAvailabilityResponse();

    render(<Availability />);

    await waitForLoadedGrid();

    const availableCells = screen.getAllByTitle("Available");
    fireEvent.mouseDown(availableCells[0]);

    expect(screen.getAllByTitle("Unavailable").length).toBeGreaterThan(0);
  });

  test("dragging across cells toggles selection", async () => {
    mockInitialAvailabilityResponse();

    render(<Availability />);

    await waitForLoadedGrid();

    const availableCellsBefore = screen.getAllByTitle("Available");
    fireEvent.mouseDown(availableCellsBefore[0]);

    const availableCellsAfter = screen.getAllByTitle("Available");
    if (availableCellsAfter.length > 0) {
      fireEvent.mouseEnter(availableCellsAfter[0]);
    }

    fireEvent.mouseUp(screen.getByRole("table"));

    expect(screen.getAllByTitle("Unavailable").length).toBeGreaterThan(0);
  });

  test("saves selected blocks successfully", async () => {
    mockInitialAvailabilityResponse();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn(),
    });

    render(<Availability />);

    await waitForLoadedGrid();

    const availableCells = screen.getAllByTitle("Available");
    fireEvent.mouseDown(availableCells[0]);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:5001/api/availability/blocks",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    expect(global.alert).toHaveBeenCalledWith("Schedule saved successfully!");
  });

  test("alerts when saving blocks fails", async () => {
    mockInitialAvailabilityResponse();

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn(),
    });

    render(<Availability />);

    await waitForLoadedGrid();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Error saving schedule");
    });
  });

  test("prev button is disabled on initial today view", async () => {
    mockInitialAvailabilityResponse();

    render(<Availability />);

    await waitForLoadedGrid();

    expect(screen.getByRole("button", { name: /prev/i })).toBeDisabled();
  });

  test("next button changes the visible range", async () => {
    mockInitialAvailabilityResponse();

    render(<Availability />);

    await waitForLoadedGrid();

    const before = screen.getAllByRole("row")[1].textContent;
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const after = screen.getAllByRole("row")[1].textContent;

    expect(after).not.toEqual(before);
  });
});