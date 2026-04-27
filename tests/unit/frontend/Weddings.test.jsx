jest.mock("../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../src/GoToTop", () => () => <div data-testid="go-to-top" />);
jest.mock("../../../src/components/Buttons/BookNowButton", () => () => <div data-testid="book-now-button" />);

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../src/context/AuthContext";
import Weddings from "../../../src/pages/Special/Weddings.jsx";

describe("Weddings Component", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue({ user: null });
  });

  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders the hero heading", () => {
      render(<Weddings />);
      expect(screen.getByText(/WEDDING & ELOPEMENT PACKAGES/i)).toBeInTheDocument();
    });

    it("renders the packages title", () => {
      render(<Weddings />);
      expect(screen.getByText(/Wedding Packages & Pricing/i)).toBeInTheDocument();
    });

    it("renders the Q&A section heading", () => {
      render(<Weddings />);
      expect(screen.getByText("Q&A")).toBeInTheDocument();
    });

    it("renders the GoToTop component", () => {
      render(<Weddings />);
      expect(screen.getByTestId("go-to-top")).toBeInTheDocument();
    });
  });

  // --- Packages ---
  describe("Packages", () => {
    it("renders all 3 package cards", () => {
      render(<Weddings />);
      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(3);
    });

    it("renders Ivory package", () => {
      render(<Weddings />);
      expect(screen.getByText("Ivory")).toBeInTheDocument();
    });

    it("renders Champagne package", () => {
      render(<Weddings />);
      expect(screen.getByText("Champagne")).toBeInTheDocument();
    });

    it("renders Pearl package", () => {
      render(<Weddings />);
      expect(screen.getByText("Pearl")).toBeInTheDocument();
    });

    it("renders package prices", () => {
      render(<Weddings />);
      expect(screen.getByText("FROM: $1600")).toBeInTheDocument();
      expect(screen.getByText("FROM: $2400")).toBeInTheDocument();
      expect(screen.getByText("FROM: $3800")).toBeInTheDocument();
    });
  });

  // --- Navigation ---
  describe("Package click navigation", () => {
    it("navigates to /signup when user is not logged in", async () => {
      render(<Weddings />);
      await userEvent.click(screen.getByText("Ivory"));
      expect(mockNavigate).toHaveBeenCalledWith("/signup");
    });

    it("navigates to inquiry page with package name when user is logged in", async () => {
      useAuth.mockReturnValue({ user: { id: "123" } });
      render(<Weddings />);
      await userEvent.click(screen.getByText("Ivory"));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry", {
        state: { selectedPackage: "Ivory" },
      });
    });
  });

  // --- Q&A ---
  describe("Q&A section", () => {
    it("renders all 3 Q&A items", () => {
      render(<Weddings />);
      const questions = screen.getAllByText(/\d\./);
      expect(questions).toHaveLength(3);
    });

    it("renders the deposit question", () => {
      render(<Weddings />);
      expect(screen.getByText(/How do we officially book with you/i)).toBeInTheDocument();
    });

    it("renders the gallery turnaround question", () => {
      render(<Weddings />);
      expect(screen.getByText(/How long does it take to receive our final gallery/i)).toBeInTheDocument();
    });

    it("renders the custom packages question", () => {
      render(<Weddings />);
      expect(screen.getByText(/Do you offer custom packages/i)).toBeInTheDocument();
    });
  });
});