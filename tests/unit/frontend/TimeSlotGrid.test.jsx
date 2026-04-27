import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TimeSlotGrid from "../../../src/components/TimeSlotGrid/TimeSlotGrid";
import { supabase } from "../../../src/lib/supabaseClient";

jest.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function setupSupabaseMock({
  settingsResponse = {
    data: {
      work_start_time: "09:00:00",
      work_end_time: "17:00:00",
    },
    error: null,
  },
  blocksResponse = { data: [], error: null },
  sessionsResponse = { data: [], error: null },
  settingsReject = null,
  blocksReject = null,
  sessionsReject = null,
} = {}) {
  supabase.from.mockImplementation((table) => {
    if (table === "AvailabilitySettings") {
      return {
        select: jest.fn(() => ({
          limit: jest.fn(() => ({
            single: jest.fn(() => {
              if (settingsReject) {
                return Promise.reject(settingsReject);
              }
              return Promise.resolve(settingsResponse);
            }),
          })),
        })),
      };
    }

    if (table === "AvailabilityBlocks") {
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => {
              if (blocksReject) {
                return Promise.reject(blocksReject);
              }
              return Promise.resolve(blocksResponse);
            }),
          })),
        })),
      };
    }

    if (table === "Session") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => {
                if (sessionsReject) {
                  return Promise.reject(sessionsReject);
                }
                return Promise.resolve(sessionsResponse);
              }),
            })),
          })),
        })),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("TimeSlotGrid", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  test("renders empty-state message when no selectedDate is provided", () => {
    setupSupabaseMock();

    render(
      <TimeSlotGrid
        selectedDate=""
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    expect(
      screen.getByText("Select a date above to see available time slots.")
    ).toBeInTheDocument();
  });

  test("renders slots using fetched work hours and rounds start up to nearest 15 minutes", async () => {
    setupSupabaseMock({
      settingsResponse: {
        data: {
          work_start_time: "09:10:00",
          work_end_time: "10:00:00",
        },
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    expect(await screen.findByRole("button", { name: "9:15 AM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9:30 AM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9:45 AM" })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "9:00 AM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "10:00 AM" })).not.toBeInTheDocument();
  });

  test("falls back to default work hours when AvailabilitySettings returns no data", async () => {
    setupSupabaseMock({
      settingsResponse: {
        data: null,
        error: { message: "No row found" },
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    expect(await screen.findByRole("button", { name: "9:00 AM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4:45 PM" })).toBeInTheDocument();
  });

  test("shows loading state while availability is being fetched and then shows selected summary", async () => {
    const blocksDeferred = deferred();

    setupSupabaseMock({
      blocksResponse: blocksDeferred.promise,
      sessionsResponse: { data: [], error: null },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime="09:00"
        onSelectStart={jest.fn()}
      />
    );

    expect(await screen.findByText("Loading availability…")).toBeInTheDocument();

    blocksDeferred.resolve({ data: [], error: null });

    expect(
      await screen.findByText("9:00 AM → 10:00 AM (60 min)")
    ).toBeInTheDocument();
  });

  test("disables an exact blocked slot from AvailabilityBlocks and does not call onSelectStart", async () => {
    const onSelectStart = jest.fn();

    setupSupabaseMock({
      blocksResponse: {
        data: [
          {
            start_time: "2026-02-23T09:00:00.000Z",
            end_time: "2026-02-23T09:30:00.000Z",
          },
        ],
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={30}
        startTime=""
        onSelectStart={onSelectStart}
      />
    );

    const blockedButton = await screen.findByRole("button", { name: "9:00 AM" });

    expect(blockedButton).toBeDisabled();
    expect(blockedButton).toHaveAttribute("title", "Not available");
    expect(blockedButton.className).toContain("line-through");

    fireEvent.click(blockedButton);
    expect(onSelectStart).not.toHaveBeenCalled();
  });

  test("disables overlap slot from booked session without line-through styling", async () => {
    setupSupabaseMock({
      sessionsResponse: {
        data: [
          {
            start_at: "2026-02-23T10:00:00.000Z",
            end_at: "2026-02-23T11:00:00.000Z",
          },
        ],
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    const overlapButton = await screen.findByRole("button", { name: "9:15 AM" });

    expect(overlapButton).toBeDisabled();
    expect(overlapButton).toHaveAttribute("title", "Not available");
    expect(overlapButton.className).not.toContain("line-through");
  });

  test("disables slots whose selected session would run past the end of the work day", async () => {
    setupSupabaseMock({
      settingsResponse: {
        data: {
          work_start_time: "09:00:00",
          work_end_time: "10:00:00",
        },
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    expect(await screen.findByRole("button", { name: "9:00 AM" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "9:15 AM" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "9:30 AM" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "9:45 AM" })).toBeDisabled();
  });

  test("calls onSelectStart with computed end time for a valid slot and marks in-range slots", async () => {
    const onSelectStart = jest.fn();

    setupSupabaseMock();

    const { rerender } = render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={onSelectStart}
      />
    );

    const target = await screen.findByRole("button", { name: "9:15 AM" });
    fireEvent.click(target);

    expect(onSelectStart).toHaveBeenCalledWith("09:15", "10:15");

    rerender(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime="09:15"
        onSelectStart={onSelectStart}
      />
    );

    expect(await screen.findByText("9:15 AM → 10:15 AM (60 min)")).toBeInTheDocument();

    const selected = screen.getByRole("button", { name: "9:15 AM" });
    const inRange = screen.getByRole("button", { name: "9:30 AM" });

    expect(selected.className).toContain("bg-brown");
    expect(inRange.className).toContain("bg-[#F4EFE6]");
  });

  test("disables all slots in readOnly mode", async () => {
    setupSupabaseMock();

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
        readOnly={true}
      />
    );

    const firstButton = await screen.findByRole("button", { name: "9:00 AM" });
    const secondButton = screen.getByRole("button", { name: "9:15 AM" });

    expect(firstButton).toBeDisabled();
    expect(secondButton).toBeDisabled();
  });

  test("does not call onSelectStart when clicking a slot in readOnly mode", async () => {
    const onSelectStart = jest.fn();

    setupSupabaseMock();

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={onSelectStart}
        readOnly={true}
      />
    );

    const button = await screen.findByRole("button", { name: "9:00 AM" });
    fireEvent.click(button);

    expect(onSelectStart).not.toHaveBeenCalled();
  });

  test("shows no available slots message when work hours produce zero slots", async () => {
    setupSupabaseMock({
      settingsResponse: {
        data: {
          work_start_time: "09:00:00",
          work_end_time: "09:00:00",
        },
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    expect(
      await screen.findByText("No available slots on this date.")
    ).toBeInTheDocument();
  });

  test("supports plain HH:MM:SS time strings from blocks and marks matching slot unavailable", async () => {
    setupSupabaseMock({
      blocksResponse: {
        data: [
          {
            start_time: "09:00:00",
            end_time: "09:30:00",
          },
        ],
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={30}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    const blockedButton = await screen.findByRole("button", { name: "9:00 AM" });
    expect(blockedButton).toBeDisabled();
    expect(blockedButton).toHaveAttribute("title", "Not available");
  });

  test("ignores malformed block times that cannot be parsed", async () => {
    setupSupabaseMock({
      blocksResponse: {
        data: [
          {
            start_time: "bad-value",
            end_time: "still-bad",
          },
        ],
        error: null,
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={30}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    const button = await screen.findByRole("button", { name: "9:00 AM" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("title", "9:00 AM");
  });

  test("logs AvailabilityBlocks query error when Supabase returns abErr", async () => {
    setupSupabaseMock({
      blocksResponse: {
        data: [],
        error: { message: "availability query failed" },
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "TimeSlotGrid: Availability fetch error",
        { message: "availability query failed" }
      );
    });
  });

  test("logs Session query error when Supabase returns bsErr", async () => {
    setupSupabaseMock({
      sessionsResponse: {
        data: [],
        error: { message: "session query failed" },
      },
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "TimeSlotGrid: Session fetch error",
        { message: "session query failed" }
      );
    });
  });

  test("logs error when fetching AvailabilitySettings fails", async () => {
    setupSupabaseMock({
      settingsReject: new Error("settings fetch failed"),
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "TimeSlotGrid: failed to fetch AvailabilitySettings",
        expect.any(Error)
      );
    });
  });

  test("logs error when fetching blocked intervals fails", async () => {
    setupSupabaseMock({
      blocksReject: new Error("blocks fetch failed"),
    });

    render(
      <TimeSlotGrid
        selectedDate="2026-02-23"
        durationMinutes={60}
        startTime=""
        onSelectStart={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "TimeSlotGrid: unexpected error fetching blocks",
        expect.any(Error)
      );
    });
  });
});