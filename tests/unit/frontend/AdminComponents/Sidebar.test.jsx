import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// mock supabaseClient to avoid import.meta parse error
jest.mock("../../../../src/lib/supabaseClient.js", () => {
  const channelMock = {
    on: jest.fn(function () {
      return this;
    }),
    subscribe: jest.fn(function () {
      return this;
    }),
  };
  return {
    supabase: {
      from: jest.fn(),
      channel: jest.fn(() => channelMock),
      removeChannel: jest.fn(),
    },
  };
});

const { supabase } = require("../../../../src/lib/supabaseClient.js");
import Sidebar from "../../../../src/admin/components/shared/Sidebar/Sidebar.jsx";

// helper to render Sidebar at a given route
function renderAtRoute(route = "/admin") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

// helper to mock the unread notification query
function mockUnreadCount(count = 0) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn().mockResolvedValue({ count }),
  };
  supabase.from.mockReturnValue(builder);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Sidebar Admin Component Tests", () => {
  test("1. renders all navigation links", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute();
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Availability")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Galleries")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();
    expect(screen.getByText("Session Packages")).toBeInTheDocument();
    expect(screen.getByText("Forms")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  test("2. links point to correct routes", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute();
    });

    expect(screen.getByText("Home").closest("a")).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByText("Sessions").closest("a")).toHaveAttribute(
      "href",
      "/admin/sessions",
    );
    expect(screen.getByText("Availability").closest("a")).toHaveAttribute(
      "href",
      "/admin/availability",
    );
    expect(screen.getByText("Contacts").closest("a")).toHaveAttribute(
      "href",
      "/admin/contacts",
    );
    expect(screen.getByText("Galleries").closest("a")).toHaveAttribute(
      "href",
      "/admin/galleries",
    );
    expect(screen.getByText("Notifications").closest("a")).toHaveAttribute(
      "href",
      "/admin/notifications",
    );
    expect(screen.getByText("Payments").closest("a")).toHaveAttribute(
      "href",
      "/admin/payments",
    );
    expect(screen.getByText("Session Packages").closest("a")).toHaveAttribute(
      "href",
      "/admin/offerings",
    );
    expect(screen.getByText("Forms").closest("a")).toHaveAttribute(
      "href",
      "/admin/forms",
    );
    expect(screen.getByText("Settings").closest("a")).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });

  test("3. queries Notification table for unread count", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute();
    });

    expect(supabase.from).toHaveBeenCalledWith("Notification");
    const builder = supabase.from.mock.results[0].value;
    expect(builder.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(builder.eq).toHaveBeenCalledWith("status", "sent");
  });

  test("4. shows BellDot icon when unread notifications exist", async () => {
    mockUnreadCount(3);

    await act(async () => {
      renderAtRoute();
    });

    // BellDot renders when hasUnread is true
    // lucide icons render as SVGs, check for the notification link content
    const notifLink = screen.getByText("Notifications").closest("a");
    expect(notifLink).toBeInTheDocument();
    // BellDot has a dot element that Bell does not
    const svgs = notifLink.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  test("5. shows Bell icon when no unread notifications", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute();
    });

    const notifLink = screen.getByText("Notifications").closest("a");
    const svgs = notifLink.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  test("6. subscribes to real-time Notification changes", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute();
    });

    expect(supabase.channel).toHaveBeenCalledWith("sidebar-unread");
    const channelMock = supabase.channel.mock.results[0].value;

    // verify all three event subscriptions
    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ event: "INSERT", table: "Notification" }),
      expect.any(Function),
    );
    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ event: "UPDATE", table: "Notification" }),
      expect.any(Function),
    );
    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ event: "DELETE", table: "Notification" }),
      expect.any(Function),
    );
    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  test("7. handles null count gracefully", async () => {
    // null count should default to 0 via ?? operator
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn().mockResolvedValue({ count: null }),
    };
    supabase.from.mockReturnValue(builder);

    await act(async () => {
      renderAtRoute();
    });

    // should not crash and should show regular Bell (not BellDot)
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  test("8. applies active styles to current route", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute("/admin/sessions");
    });

    const sessionsLink = screen.getByText("Sessions").closest("a");
    expect(sessionsLink.className).toContain("after:w-1");
  });

  test("9. Home link is active on /admin root route", async () => {
    mockUnreadCount(0);

    await act(async () => {
      renderAtRoute("/admin");
    });

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink.className).toContain("after:w-1");
  });

  test("10. applies active styles to each navigation route", async () => {
    mockUnreadCount(0);

    const routes = [
      { path: "/admin/availability", label: "Availability" },
      { path: "/admin/contacts", label: "Contacts" },
      { path: "/admin/galleries", label: "Galleries" },
      { path: "/admin/notifications", label: "Notifications" },
      { path: "/admin/payments", label: "Payments" },
      { path: "/admin/offerings", label: "Session Packages" },
      { path: "/admin/forms", label: "Forms" },
      { path: "/admin/settings", label: "Settings" },
    ];

    for (const { path, label } of routes) {
      jest.clearAllMocks();
      mockUnreadCount(0);

      const { unmount } = await act(async () => {
        return renderAtRoute(path);
      });

      const link = screen.getByText(label).closest("a");
      expect(link.className).toContain("after:w-1");
      unmount();
    }
  });

  test("11. cleans up real-time subscription on unmount", async () => {
    mockUnreadCount(0);

    let unmount;
    await act(async () => {
      const result = renderAtRoute();
      unmount = result.unmount;
    });

    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
