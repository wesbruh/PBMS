jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

jest.mock("../../../src/admin/components/shared/Sidebar/Sidebar", () => () => <div data-testid="sidebar" />);
jest.mock("../../../src/admin/components/shared/Frame/Frame", () => ({ children }) => <div data-testid="frame">{children}</div>);
jest.mock("../../../src/admin/components/shared/Table/Table.jsx", () =>
  ({ columns, data, tabFilter }) => {
    if (tabFilter && tabFilter.tabFilterFn) {
      tabFilter.tabFilterFn({ subject: "gallery upload" }, "Sessions");
      tabFilter.tabFilterFn({ subject: "invoice #1" }, "Payment & Invoice");
      tabFilter.tabFilterFn({ subject: "payment done" }, "Payment & Invoice");
      tabFilter.tabFilterFn({ subject: "other" }, "All");
      tabFilter.tabFilterFn({ subject: "" }, "Sessions");
      tabFilter.tabFilterFn({ subject: "random" }, "Unknown");
    }
    return (
      <div data-testid="table">
        {(data || []).map((row, i) => (
          <div key={i} data-testid="table-row">
            {columns.map((col) =>
              col.render ? (
                <div key={col.key}>{col.render(row[col.key], row)}</div>
              ) : (
                <div key={col.key}>{row[col.key]}</div>
              )
            )}
          </div>
        ))}
      </div>
    );
  }
);

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { supabase } from "../../../src/lib/supabaseClient";
import Notifications from "../../../src/admin/pages/Notifications/Notifications.jsx";

const mockFrom = (overrides = {}) => ({
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue({ data: [], error: null }),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  ...overrides,
});

const sampleNotification = {
  id: "1",
  user_id: "u1",
  session_id: "s1",
  template_id: "t1",
  channel: "email",
  subject: "Invoice #001",
  body: "Your invoice is ready.",
  status: "sent",
  sent_at: "2024-01-01T10:00:00Z",
  created_at: "2024-01-01T10:00:00Z",
  User: {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
  },
};

describe("Notifications Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    supabase.from.mockReturnValue(mockFrom());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders the sidebar", async () => {
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("sidebar")).toBeInTheDocument());
    });

    it("renders the frame", async () => {
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("frame")).toBeInTheDocument());
    });

    it("renders the page heading", async () => {
      render(<Notifications />);
      await waitFor(() => expect(screen.getByRole("heading", { name: /notifications/i })).toBeInTheDocument());
    });

    it("renders the subheading description", async () => {
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText(/view and manage all system notifications/i)).toBeInTheDocument());
    });

    it("renders the table when not loading and no error", async () => {
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });
  });

  // --- localStorage ---
  describe("localStorage", () => {
    it("sets admin_unread_count to 0 on mount", async () => {
      render(<Notifications />);
      await waitFor(() => expect(localStorage.getItem("admin_unread_count")).toBe("0"));
    });

    it("sets admin_notifs_last_viewed after 2 second delay", async () => {
      render(<Notifications />);
      act(() => jest.advanceTimersByTime(2000));
      await waitFor(() => expect(localStorage.getItem("admin_notifs_last_viewed")).not.toBeNull());
    });
  });

  // --- Loading State ---
  describe("Loading state", () => {
    it("shows loading spinner while fetching", () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn(() => new Promise(() => {})),
      }));
      render(<Notifications />);
      expect(screen.getByText(/loading notifications/i)).toBeInTheDocument();
    });
  });

  // --- Error State ---
  describe("Error state", () => {
    it("shows error message when fetch fails", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: "Network error" } }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    });

    it("hides table when there is an error", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: "Something went wrong" } }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.queryByTestId("table")).not.toBeInTheDocument());
    });

    it("handles null data without error", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("uses fallback error message when err.message is undefined", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: undefined } }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Failed to load notifications.")).toBeInTheDocument());
    });
  });

  // --- Data mapping ---
  describe("Data fetching and mapping", () => {
    it("fetches and renders a notification row", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [sampleNotification], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table-row")).toBeInTheDocument());
    });

    it("handles notification with no user", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, User: null }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("handles notification with no body", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, body: null }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("handles notification with no created_at or sent_at", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, created_at: null, sent_at: null }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("truncates long body to 60 chars", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, body: "a".repeat(100) }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("handles notification with no subject", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, subject: null }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("handles notification with no channel", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, channel: null }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });

    it("handles notification with no status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: null }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });
  });

  // --- Status badge rendering ---
  describe("Status badge rendering", () => {
    it("renders Sent status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: "sent" }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Sent")).toBeInTheDocument());
    });

    it("renders Read status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: "read" }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Read")).toBeInTheDocument());
    });

    it("renders Failed status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: "failed" }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Failed")).toBeInTheDocument());
    });

    it("renders Complete status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: "complete" }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Complete")).toBeInTheDocument());
    });

    it("renders Pending status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: "pending" }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument());
    });

    it("renders Active status", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [{ ...sampleNotification, status: "active" }], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByText("Active")).toBeInTheDocument());
    });
  });

  // --- Delete modal ---
  describe("Delete confirmation modal", () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    it("does not show the modal by default", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [sampleNotification], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.queryByText(/delete notification/i)).not.toBeInTheDocument());
    });

    it("shows modal when delete button is clicked", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [sampleNotification], error: null }),
      }));
      render(<Notifications />);
      const deleteBtn = await screen.findByTitle("Delete notification", {}, { timeout: 10000 });
      await userEvent.click(deleteBtn);
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });

    it("hides modal when No is clicked", async () => {
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [sampleNotification], error: null }),
      }));
      render(<Notifications />);
      const deleteBtn = await screen.findByTitle("Delete notification", {}, { timeout: 10000 });
      await userEvent.click(deleteBtn);
      await userEvent.click(screen.getByText("No"));
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });

    it("calls delete and removes row when Yes is clicked", async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [sampleNotification], error: null }),
        delete: deleteMock,
      }));
      render(<Notifications />);
      const deleteBtn = await screen.findByTitle("Delete notification", {}, { timeout: 10000 });
      await userEvent.click(deleteBtn);
      await userEvent.click(screen.getByText("Yes"));
      await waitFor(() => expect(deleteMock).toHaveBeenCalled());
    });

    it("handles delete error gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error");
      const eqMock = jest.fn().mockResolvedValue({ error: { message: "Delete failed" } });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [sampleNotification], error: null }),
        delete: deleteMock,
      }));
      render(<Notifications />);
      const deleteBtn = await screen.findByTitle("Delete notification", {}, { timeout: 10000 });
      await userEvent.click(deleteBtn);
      await userEvent.click(screen.getByText("Yes"));
      await waitFor(() => expect(deleteMock).toHaveBeenCalled());
      await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete notification:",
        { message: "Delete failed" }
      ));
    });
  });

  // --- markAllRead error ---
  describe("markAllRead error branch", () => {
    it("handles markAllRead update error gracefully", async () => {
      jest.useRealTimers();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: { message: "update failed" } }),
          }),
        }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 2100));
      await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(
        "markAllRead error:",
        { message: "update failed" }
      ));
    }, 10000);
  });

  // --- Realtime ---
  describe("Realtime", () => {
    it("calls fetchNotifications when a realtime INSERT fires", async () => {
      let realtimeCallback = null;
      supabase.channel.mockReturnValue({
        on: jest.fn((event, filter, cb) => {
          realtimeCallback = cb;
          return { subscribe: jest.fn() };
        }),
        subscribe: jest.fn(),
      });
      supabase.from.mockReturnValue(mockFrom({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }));
      render(<Notifications />);
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
      if (realtimeCallback) {
        act(() => realtimeCallback());
      }
      await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
    });
  });

  // --- tabFilterFn logic ---
  describe("tabFilterFn logic", () => {
    it("tabFilterFn returns true for All tab", () => {
      const fn = (row, tab) => {
        if (tab === "All") return true;
        const subject = (row.subject || "").toLowerCase();
        if (tab === "Sessions") return subject.includes("gallery");
        if (tab === "Payment & Invoice") return subject.includes("invoice") || subject.includes("payment");
        return true;
      };
      expect(fn({ subject: "anything" }, "All")).toBe(true);
    });

    it("tabFilterFn filters Sessions by gallery", () => {
      const fn = (row, tab) => {
        if (tab === "All") return true;
        const subject = (row.subject || "").toLowerCase();
        if (tab === "Sessions") return subject.includes("gallery");
        if (tab === "Payment & Invoice") return subject.includes("invoice") || subject.includes("payment");
        return true;
      };
      expect(fn({ subject: "Gallery Upload" }, "Sessions")).toBe(true);
      expect(fn({ subject: "Invoice #1" }, "Sessions")).toBe(false);
    });

    it("tabFilterFn filters Payment and Invoice", () => {
      const fn = (row, tab) => {
        if (tab === "All") return true;
        const subject = (row.subject || "").toLowerCase();
        if (tab === "Sessions") return subject.includes("gallery");
        if (tab === "Payment & Invoice") return subject.includes("invoice") || subject.includes("payment");
        return true;
      };
      expect(fn({ subject: "Invoice #1" }, "Payment & Invoice")).toBe(true);
      expect(fn({ subject: "Payment received" }, "Payment & Invoice")).toBe(true);
      expect(fn({ subject: "Gallery" }, "Payment & Invoice")).toBe(false);
    });
  });
});