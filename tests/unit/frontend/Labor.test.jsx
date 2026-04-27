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
import Labor from "../../../src/pages/Special/Labor.jsx";

describe("Labor Component", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue({ user: null });
  });

  // --- Layout & Structure ---
  describe("Layout", () => {
    it("renders the hero heading", () => {
      render(<Labor />);
      expect(screen.getByText(/LABOR & DELIVERY PACKAGES/i)).toBeInTheDocument();
    });

    it("renders the packages title", () => {
      render(<Labor />);
      expect(screen.getByText(/Labor and Delivery Packages & Pricing/i)).toBeInTheDocument();
    });

    it("renders the Q&A section heading", () => {
      render(<Labor />);
      expect(screen.getByText("Q&A")).toBeInTheDocument();
    });

    it("renders the GoToTop component", () => {
      render(<Labor />);
      expect(screen.getByTestId("go-to-top")).toBeInTheDocument();
    });
  });

  // --- Packages ---
  describe("Packages", () => {
    it("renders all 4 package cards", () => {
      render(<Labor />);
      const headings = screen.getAllByRole("heading", { level: 2 });
      expect(headings).toHaveLength(4);
    });

    it("renders First Breath package", () => {
      render(<Labor />);
      expect(screen.getByText("First Breath")).toBeInTheDocument();
    });

    it("renders The Birth Story package", () => {
      render(<Labor />);
      expect(screen.getByText("The Birth Story")).toBeInTheDocument();
    });

    it("renders From Womb to World package", () => {
      render(<Labor />);
      expect(screen.getByText("From Womb to World")).toBeInTheDocument();
    });

    it("renders Positive Test to First Breath package", () => {
      render(<Labor />);
      expect(screen.getByText("Positive Test to First Breath")).toBeInTheDocument();
    });

    it("renders package prices", () => {
      render(<Labor />);
      expect(screen.getByText("FROM: $400")).toBeInTheDocument();
      expect(screen.getByText("FROM: $1000")).toBeInTheDocument();
      expect(screen.getByText("$1750")).toBeInTheDocument();
    });
  });

  // --- Navigation ---
  describe("Package click navigation", () => {
    it("navigates to /signup when user is not logged in", async () => {
      render(<Labor />);
      await userEvent.click(screen.getByText("First Breath"));
      expect(mockNavigate).toHaveBeenCalledWith("/signup");
    });

    it("navigates to inquiry page with package name when user is logged in", async () => {
      useAuth.mockReturnValue({ user: { id: "123" } });
      render(<Labor />);
      await userEvent.click(screen.getByText("First Breath"));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry", {
        state: { selectedPackage: "First Breath" },
      });
    });
  });

  // --- Q&A ---
  describe("Q&A section", () => {
    it("renders all 5 Q&A items", () => {
      render(<Labor />);
      const questions = screen.getAllByText(/\d\./);
      expect(questions).toHaveLength(5);
    });

    it("renders the deposit question", () => {
      render(<Labor />);
      expect(screen.getByText(/How do we officially book with you/i)).toBeInTheDocument();
    });

    it("renders the gallery turnaround question", () => {
      render(<Labor />);
      expect(screen.getByText(/How long does it take to receive our final gallery/i)).toBeInTheDocument();
    });
  });
});