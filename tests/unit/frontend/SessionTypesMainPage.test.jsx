// tests/unit/frontend/SessionTypesMainPage.test.jsx
//
// Unit tests for src/admin/pages/Offerings/SessionTypesMainPage.jsx
// Tests component rendering, layout structure, and Outlet integration.

import React from "react";
import { render, screen } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock Sidebar and Frame so we don't pull in their dependencies
jest.mock("../../../src/admin/components/shared/Sidebar/Sidebar", () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

jest.mock("../../../src/admin/components/shared/Frame/Frame", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="frame">{children}</div>,
}));

// Mock Outlet directly — avoids the duplicate-React / missing-router-context
// issue that arises when Outlet calls useContext outside a real router tree.
// We expose a Jest spy so individual tests can swap the rendered content.
const mockOutletContent = { current: null };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Outlet: () => mockOutletContent.current ?? null,
}));

// Import AFTER mocks are registered
import Offerings from "../../../src/admin/pages/Offerings/SessionTypesMainPage";

// ── Helper ────────────────────────────────────────────────────────────────────

function renderOfferings() {
  return render(<Offerings />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SessionTypesMainPage (Offerings)", () => {
  beforeEach(() => {
    // Reset outlet content before each test
    mockOutletContent.current = null;
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders without crashing", () => {
      expect(() => renderOfferings()).not.toThrow();
    });

    it("renders the Sidebar component", () => {
      renderOfferings();
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });

    it("renders the Frame component", () => {
      renderOfferings();
      expect(screen.getByTestId("frame")).toBeInTheDocument();
    });

    it("renders with an empty Outlet (no child route matched)", () => {
      // mockOutletContent.current is null — Outlet renders nothing
      renderOfferings();
      // Shell components should still be present
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("frame")).toBeInTheDocument();
    });

    it("renders child route content projected through the Outlet", () => {
      mockOutletContent.current = (
        <div data-testid="outlet-child">Outlet Content</div>
      );
      renderOfferings();
      expect(screen.getByTestId("outlet-child")).toBeInTheDocument();
      expect(screen.getByText("Outlet Content")).toBeInTheDocument();
    });

    it("renders multiple distinct child elements through the Outlet", () => {
      mockOutletContent.current = (
        <>
          <span data-testid="child-a">A</span>
          <span data-testid="child-b">B</span>
        </>
      );
      renderOfferings();
      expect(screen.getByTestId("child-a")).toBeInTheDocument();
      expect(screen.getByTestId("child-b")).toBeInTheDocument();
    });
  });

  // ── Layout structure ───────────────────────────────────────────────────────

  describe("layout structure", () => {
    it("outer wrapper has the flex class", () => {
      const { container } = renderOfferings();
      const outer = container.firstChild;
      expect(outer).toHaveClass("flex");
    });

    it("outer wrapper has the bg-[#faf8f4] class", () => {
      const { container } = renderOfferings();
      const outer = container.firstChild;
      expect(outer).toHaveClass("bg-[#faf8f4]");
    });

    it("outer wrapper has the rounded-lg class", () => {
      const { container } = renderOfferings();
      const outer = container.firstChild;
      expect(outer).toHaveClass("rounded-lg");
    });

    it("outer wrapper has the overflow-clip class", () => {
      const { container } = renderOfferings();
      const outer = container.firstChild;
      expect(outer).toHaveClass("overflow-clip");
    });

    it("sidebar wrapper div wraps the Sidebar component", () => {
      renderOfferings();
      const sidebar = screen.getByTestId("sidebar");
      // The immediate parent is the sidebar wrapper div
      const sidebarWrapper = sidebar.parentElement;
      expect(sidebarWrapper).toBeInTheDocument();
      expect(sidebarWrapper.tagName).toBe("DIV");
    });

    it("sidebar wrapper has the flex class", () => {
      renderOfferings();
      const sidebar = screen.getByTestId("sidebar");
      const sidebarWrapper = sidebar.parentElement;
      expect(sidebarWrapper).toHaveClass("flex");
    });

    it("content area contains the Frame component", () => {
      renderOfferings();
      expect(screen.getByTestId("frame")).toBeInTheDocument();
    });

    it("inner content div (inside Frame) has w-screen class", () => {
      renderOfferings();
      const frame = screen.getByTestId("frame");
      const innerDiv = frame.querySelector("div");
      expect(innerDiv).toHaveClass("w-screen");
    });

    it("inner content div (inside Frame) has flex-col class", () => {
      renderOfferings();
      const frame = screen.getByTestId("frame");
      const innerDiv = frame.querySelector("div");
      expect(innerDiv).toHaveClass("flex-col");
    });

    it("inner content div (inside Frame) has p-6 class", () => {
      renderOfferings();
      const frame = screen.getByTestId("frame");
      const innerDiv = frame.querySelector("div");
      expect(innerDiv).toHaveClass("p-6");
    });

    it("Sidebar appears before Frame in the DOM", () => {
      renderOfferings();
      const sidebar = screen.getByTestId("sidebar");
      const frame = screen.getByTestId("frame");
      // DOCUMENT_POSITION_FOLLOWING (4) means frame comes after sidebar
      expect(
        sidebar.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  // ── Outlet behaviour ───────────────────────────────────────────────────────

  describe("Outlet behaviour", () => {
    it("does not render outlet content when Outlet returns null", () => {
      mockOutletContent.current = null;
      renderOfferings();
      expect(screen.queryByTestId("outlet-child")).not.toBeInTheDocument();
    });

    it("replaces Outlet content between renders", () => {
      mockOutletContent.current = <div data-testid="first">First</div>;
      const { unmount } = renderOfferings();
      expect(screen.getByTestId("first")).toBeInTheDocument();
      unmount();

      mockOutletContent.current = <div data-testid="second">Second</div>;
      renderOfferings();
      expect(screen.getByTestId("second")).toBeInTheDocument();
      expect(screen.queryByTestId("first")).not.toBeInTheDocument();
    });
  });

  // ── Snapshot / regression ──────────────────────────────────────────────────

  describe("regression", () => {
    it("matches snapshot with no outlet content", () => {
      const { container } = renderOfferings();
      expect(container).toMatchSnapshot();
    });

    it("matches snapshot with outlet content", () => {
      mockOutletContent.current = (
        <p data-testid="child">Child Page</p>
      );
      const { container } = renderOfferings();
      expect(container).toMatchSnapshot();
    });

    it("renders the same HTML across two independent mounts", () => {
      const { container: c1 } = renderOfferings();
      const { container: c2 } = renderOfferings();
      expect(c1.innerHTML).toBe(c2.innerHTML);
    });
  });
});