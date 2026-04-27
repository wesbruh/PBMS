jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(),
}));

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../src/context/AuthContext";
import AdminNotificationToast, { triggerAdminToast } from "../../../src/components/AdminNotificationToast.jsx";

describe("AdminNotificationToast Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ profile: { roleName: "Admin" } });
    useLocation.mockReturnValue({ pathname: "/admin/dashboard" });
  });

  // --- Hidden states ---
  describe("Hidden states", () => {
    it("renders nothing when not on an admin page", () => {
      useLocation.mockReturnValue({ pathname: "/home" });
      const { container } = render(<AdminNotificationToast />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when on admin page but no message", () => {
      const { container } = render(<AdminNotificationToast />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when on /admin/notifications page", () => {
      useLocation.mockReturnValue({ pathname: "/admin/notifications" });
      localStorage.setItem("admin_unread_count", "3");
      const { container } = render(<AdminNotificationToast />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when user is not admin", () => {
      useAuth.mockReturnValue({ profile: { roleName: "Client" } });
      localStorage.setItem("admin_unread_count", "2");
      const { container } = render(<AdminNotificationToast />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when profile is null", () => {
      useAuth.mockReturnValue({ profile: null });
      localStorage.setItem("admin_unread_count", "2");
      const { container } = render(<AdminNotificationToast />);
      expect(container.firstChild).toBeNull();
    });

    it("does not show toast when triggerAdminToast called on non-admin page", () => {
      useLocation.mockReturnValue({ pathname: "/home" });
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      expect(screen.queryByText("New Notification")).not.toBeInTheDocument();
    });
  });

  // --- Login toast ---
  describe("Login toast", () => {
    it("shows toast on admin login when unread count > 0", () => {
      localStorage.setItem("admin_unread_count", "3");
      render(<AdminNotificationToast />);
      expect(screen.getByText(/you have 3 new notifications/i)).toBeInTheDocument();
    });

    it("shows singular when unread count is 1", () => {
      localStorage.setItem("admin_unread_count", "1");
      render(<AdminNotificationToast />);
      expect(screen.getByText(/you have 1 new notification$/i)).toBeInTheDocument();
    });

    it("does not show toast when unread count is 0", () => {
      localStorage.setItem("admin_unread_count", "0");
      const { container } = render(<AdminNotificationToast />);
      expect(container.firstChild).toBeNull();
    });

    it("does not show login toast again on re-render", () => {
      localStorage.setItem("admin_unread_count", "1");
      const { rerender } = render(<AdminNotificationToast />);
      rerender(<AdminNotificationToast />);
      expect(screen.getAllByText(/you have 1 new notification/i)).toHaveLength(1);
    });

    it("skips showing toast on second render when already shown", () => {
      localStorage.setItem("admin_unread_count", "2");
      const { rerender } = render(<AdminNotificationToast />);
      expect(screen.getByText(/you have 2 new notifications/i)).toBeInTheDocument();
      localStorage.setItem("admin_unread_count", "5");
      rerender(<AdminNotificationToast />);
      expect(screen.queryByText(/you have 5 new notifications/i)).not.toBeInTheDocument();
    });

    it("skips login toast when hasShownLoginToast is already true", () => {
      localStorage.setItem("admin_unread_count", "2");
      const { rerender } = render(<AdminNotificationToast />);
      expect(screen.getByText(/you have 2 new notifications/i)).toBeInTheDocument();
      localStorage.setItem("admin_unread_count", "9");
      rerender(<AdminNotificationToast />);
      expect(screen.queryByText(/you have 9/i)).not.toBeInTheDocument();
    });
  });

  // --- Toast structure ---
  describe("Toast structure", () => {
    it("renders the New Notification title", () => {
      localStorage.setItem("admin_unread_count", "2");
      render(<AdminNotificationToast />);
      expect(screen.getByText("New Notification")).toBeInTheDocument();
    });

    it("renders the dismiss button", () => {
      localStorage.setItem("admin_unread_count", "2");
      render(<AdminNotificationToast />);
      expect(screen.getByLabelText("Dismiss notification")).toBeInTheDocument();
    });

    it("renders the toast message text", () => {
      localStorage.setItem("admin_unread_count", "2");
      render(<AdminNotificationToast />);
      expect(screen.getByText(/you have 2 new notifications/i)).toBeInTheDocument();
    });

    it("clears existing timer when a second toast is triggered", () => {
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      act(() => triggerAdminToast());
      expect(screen.getByText(/you have a new notification/i)).toBeInTheDocument();
    });

    it("clears existing timer when showToast is called while timer is active", () => {
      jest.useFakeTimers();
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      act(() => jest.advanceTimersByTime(100));
      act(() => triggerAdminToast());
      expect(screen.getByText(/you have a new notification/i)).toBeInTheDocument();
      jest.useRealTimers();
    });
  });

  // --- Dismiss ---
  describe("Dismiss", () => {
    it("hides the toast when dismiss is clicked", async () => {
      localStorage.setItem("admin_unread_count", "2");
      render(<AdminNotificationToast />);
      await act(async () => {
        screen.getByLabelText("Dismiss notification").click();
      });
      expect(screen.queryByText("New Notification")).not.toBeInTheDocument();
    });

    it("clears toast when navigating away from admin pages", () => {
      localStorage.setItem("admin_unread_count", "2");
      const { rerender } = render(<AdminNotificationToast />);
      expect(screen.getByText("New Notification")).toBeInTheDocument();
      useLocation.mockReturnValue({ pathname: "/home" });
      rerender(<AdminNotificationToast />);
      expect(screen.queryByText("New Notification")).not.toBeInTheDocument();
    });

    it("clears timer when dismiss is called while toast is showing", async () => {
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      act(() => triggerAdminToast());
      await act(async () => {
        screen.getByLabelText("Dismiss notification").click();
      });
      expect(screen.queryByText("New Notification")).not.toBeInTheDocument();
    });

    it("cleans up timer on unmount", () => {
      jest.useFakeTimers();
      const { unmount } = render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      unmount();
      jest.runAllTimers();
      jest.useRealTimers();
    });

    it("cleans up _showToast on unmount", () => {
      const { unmount } = render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      unmount();
      act(() => triggerAdminToast());
      expect(screen.queryByText("New Notification")).not.toBeInTheDocument();
    });

    it("auto-dismisses toast after timeout", () => {
      jest.useFakeTimers();
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      expect(screen.getByText(/you have a new notification/i)).toBeInTheDocument();
      act(() => jest.advanceTimersByTime(10000));
      expect(screen.queryByText("New Notification")).not.toBeInTheDocument();
      jest.useRealTimers();
    });
  });

  // --- triggerAdminToast ---
  describe("triggerAdminToast", () => {
    it("increments admin_unread_count in localStorage", () => {
      localStorage.setItem("admin_unread_count", "2");
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      expect(localStorage.getItem("admin_unread_count")).toBe("3");
    });

    it("shows a new notification toast when triggered", () => {
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      expect(screen.getByText(/you have a new notification/i)).toBeInTheDocument();
    });

    it("increments from 0 when no prior count in localStorage", () => {
      render(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      expect(localStorage.getItem("admin_unread_count")).toBe("1");
    });

    it("does nothing to toast when _showToast is null (component unmounted)", () => {
      const { unmount } = render(<AdminNotificationToast />);
      unmount();
      expect(() => triggerAdminToast()).not.toThrow();
    });

    it("cleans up _showToast registration on re-render", () => {
      const { rerender } = render(<AdminNotificationToast />);
      rerender(<AdminNotificationToast />);
      act(() => triggerAdminToast());
      expect(screen.getByText(/you have a new notification/i)).toBeInTheDocument();
    });
  });
});
