jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));
import React from "react";
import { render, screen } from "@testing-library/react";
import About from "../../../src/pages/About/About.jsx";

describe("About Component", () => {
  beforeEach(() => {
    render(<About />);
  });

  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders the root wrapper div", () => {
      const wrapper = document.querySelector(
        ".bg-cover.bg-center.bg-no-repeat"
      );
      expect(wrapper).toBeInTheDocument();
    });

    it("renders the hero image", () => {
      const img = screen.getByAltText("Photographer portrait in a field");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/images/Aboutmeimage.jpg");
    });

    it("renders the decorative SVG path", () => {
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  // --- Text Content ---
  describe("Text Content", () => {
    it("renders the pre-title text", () => {
      expect(
        screen.getByText(/Before you share your story/i)
      ).toBeInTheDocument();
    });

    it("renders the main heading", () => {
      expect(
        screen.getByRole("heading", { name: /let me tell you mine/i })
      ).toBeInTheDocument();
    });

    it("renders the opening greeting paragraph", () => {
      expect(screen.getByText(/Hello!!/)).toBeInTheDocument();
    });

    it("renders the photography origin paragraph", () => {
      expect(
        screen.getByText(/I've been drawn to photography for as long/i)
      ).toBeInTheDocument();
    });

    it("renders the Northern California paragraph", () => {
      expect(
        screen.getByText(/Being born and raised in Northern California/i)
      ).toBeInTheDocument();
    });

    it("renders the 'first photoshoot' paragraph", () => {
      expect(
        screen.getByText(/After my very first photoshoot/i)
      ).toBeInTheDocument();
    });

    it("renders the closing paragraph", () => {
      expect(
        screen.getByText(/I can't wait to meet you/i)
      ).toBeInTheDocument();
    });

    it("renders exactly 5 body paragraphs", () => {
      // Targets the space-y-6 body div specifically
      const bodyDiv = document.querySelector(".space-y-6");
      const paragraphs = bodyDiv.querySelectorAll("p");
      expect(paragraphs).toHaveLength(5);
    });
  });

  // --- Personal Details ---
  describe("Personal details mentioned in copy", () => {
    it("mentions her age", () => {
      expect(screen.getByText(/24-year-old/i)).toBeInTheDocument();
    });

    it("mentions Northern California", () => {
      expect(screen.getAllByText(/Northern California/i).length).toBeGreaterThan(0);
    });

    it("mentions 2023 as the year she turned photography into a career", () => {
      expect(screen.getByText(/2023/i)).toBeInTheDocument();
    });

    it("mentions her baby boy born in April 2024", () => {
      expect(screen.getByText(/April 2024/i)).toBeInTheDocument();
    });
  });
});
