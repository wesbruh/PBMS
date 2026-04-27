jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  Link: ({ to, children, className }) => <a href={to} className={className}>{children}</a>,
}));

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../src/context/AuthContext";
import Services from "../../../src/pages/Services/Services.jsx";

describe("Services Component", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue({ user: null });
  });

  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders the hero image", () => {
      render(<Services />);
      const imgs = document.querySelectorAll("img");
      expect(imgs.length).toBeGreaterThan(0);
    });

    it("renders the Investment heading", () => {
      render(<Services />);
      expect(screen.getByText("Investment")).toBeInTheDocument();
    });

    it("renders the Photography Packages heading", () => {
      render(<Services />);
      expect(screen.getByText("Photography Packages")).toBeInTheDocument();
    });

    it("renders the Special Services section", () => {
      render(<Services />);
      expect(screen.getByText("Special Services")).toBeInTheDocument();
    });

    it("renders the CTA text", () => {
      render(<Services />);
      expect(screen.getByText(/Let's get you booked/i)).toBeInTheDocument();
    });
  });

  // --- Packages ---
  describe("Packages", () => {
    it("renders all 6 package cards", () => {
      render(<Services />);
      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(6);
    });

    it("renders Mini Session package", () => {
      render(<Services />);
      expect(screen.getByText("Mini Session")).toBeInTheDocument();
    });

    it("renders Full Session package", () => {
      render(<Services />);
      expect(screen.getByText("Full Session")).toBeInTheDocument();
    });

    it("renders Family Session package", () => {
      render(<Services />);
      expect(screen.getByText("Family Session")).toBeInTheDocument();
    });

    it("renders Maternity package", () => {
      render(<Services />);
      expect(screen.getByText("Maternity")).toBeInTheDocument();
    });

    it("renders Newborn package", () => {
      render(<Services />);
      expect(screen.getByText("Newborn (Lifestyle)")).toBeInTheDocument();
    });

    it("renders Couples / Engagement package", () => {
      render(<Services />);
      expect(screen.getByText("Couples / Engagement")).toBeInTheDocument();
    });

    it("renders package prices", () => {
      render(<Services />);
      expect(screen.getByText("$250")).toBeInTheDocument();
      expect(screen.getByText("$400")).toBeInTheDocument();
      expect(screen.getByText("$450")).toBeInTheDocument();
    });
  });

  // --- Navigation ---
  describe("Package click navigation", () => {
    it("navigates to /signup when user is not logged in", async () => {
      render(<Services />);
      await userEvent.click(screen.getByText("Mini Session"));
      expect(mockNavigate).toHaveBeenCalledWith("/signup");
    });

    it("navigates to inquiry page with package name when user is logged in", async () => {
      useAuth.mockReturnValue({ user: { id: "123" } });
      render(<Services />);
      await userEvent.click(screen.getByText("Mini Session"));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry", {
        state: { selectedPackage: "Mini Session" },
      });
    });
  });

  // --- Special Services Links ---
  describe("Special Services links", () => {
    it("renders the Weddings link", () => {
      render(<Services />);
      expect(screen.getByText("Weddings")).toBeInTheDocument();
    });

    it("renders the Labor & Delivery link", () => {
      render(<Services />);
      expect(screen.getByText("Labor & Delivery")).toBeInTheDocument();
    });

    it("weddings link points to /services/weddings", () => {
      render(<Services />);
      const link = screen.getByText("Weddings").closest("a");
      expect(link).toHaveAttribute("href", "/services/weddings");
    });

    it("labor link points to /services/labor-and-delivery", () => {
      render(<Services />);
      const link = screen.getByText("Labor & Delivery").closest("a");
      expect(link).toHaveAttribute("href", "/services/labor-and-delivery");
    });
  });
});