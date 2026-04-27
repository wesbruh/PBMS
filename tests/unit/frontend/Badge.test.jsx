jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import Badge from "../../../src/admin/components/shared/Badge/Badge.jsx";

describe("Badge Component", () => {
  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders a span element", () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText("Active").tagName).toBe("SPAN");
    });

    it("renders children text", () => {
      render(<Badge>Pending</Badge>);
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("renders the dot span when dot prop is true", () => {
      const { container } = render(<Badge dot>Active</Badge>);
      expect(container.querySelector(".badge__dot")).toBeInTheDocument();
    });

    it("does not render dot span when dot prop is false", () => {
      const { container } = render(<Badge>Active</Badge>);
      expect(container.querySelector(".badge__dot")).not.toBeInTheDocument();
    });
  });

  // --- Class Names ---
  describe("Class names", () => {
    it("applies default variant and size classes", () => {
      render(<Badge>Test</Badge>);
      const span = screen.getByText("Test");
      expect(span.className).toContain("badge--neutral");
      expect(span.className).toContain("badge--medium");
    });

    it("applies custom variant class", () => {
      render(<Badge variant="success">Test</Badge>);
      expect(screen.getByText("Test").className).toContain("badge--success");
    });

    it("applies custom size class", () => {
      render(<Badge size="small">Test</Badge>);
      expect(screen.getByText("Test").className).toContain("badge--small");
    });

    it("applies badge--dot class when dot is true", () => {
      render(<Badge dot>Test</Badge>);
      expect(screen.getByText("Test").className).toContain("badge--dot");
    });

    it("applies extra className prop", () => {
      render(<Badge className="custom-class">Test</Badge>);
      expect(screen.getByText("Test").className).toContain("custom-class");
    });
  });
});