jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import Frame from "../../../../src/admin/components/shared/Frame/Frame.jsx";

describe("Frame Component", () => {
  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders the wrapper div", () => {
      const { container } = render(<Frame><p>Test</p></Frame>);
      const div = container.firstChild;
      expect(div).toBeInTheDocument();
      expect(div.tagName).toBe("DIV");
    });

    it("renders children", () => {
      render(<Frame><p>Hello Frame</p></Frame>);
      expect(screen.getByText("Hello Frame")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(<Frame><p>Child One</p><p>Child Two</p></Frame>);
      expect(screen.getByText("Child One")).toBeInTheDocument();
      expect(screen.getByText("Child Two")).toBeInTheDocument();
    });
  });

  // --- Class Names ---
  describe("Class names", () => {
    it("applies the expected classes to the wrapper", () => {
      const { container } = render(<Frame><p>Test</p></Frame>);
      const div = container.firstChild;
      expect(div.className).toContain("bg-white");
      expect(div.className).toContain("rounded-lg");
      expect(div.className).toContain("shadow-inner");
      expect(div.className).toContain("overflow-auto");
    });
  });
});