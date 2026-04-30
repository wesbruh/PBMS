jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  useLocation: () => ({ pathname: "/admin" }),
}));

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import { useAuth } from "../../../../src/context/AuthContext";
import ProtectedRoute from "../../../../src/admin/components/shared/ProtectedRoute.jsx";

describe("ProtectedRoute Component", () => {
  // --- Loading State ---
  describe("Loading", () => {
    it("renders loading message while checking auth", () => {
      useAuth.mockReturnValue({ profile: null, loading: true });
      render(<ProtectedRoute><div>Child</div></ProtectedRoute>);
      expect(screen.getByText(/Loading your account/i)).toBeInTheDocument();
    });

    it("does not render children while loading", () => {
      useAuth.mockReturnValue({ profile: null, loading: true });
      render(<ProtectedRoute><div>Child</div></ProtectedRoute>);
      expect(screen.queryByText("Child")).not.toBeInTheDocument();
    });
  });

  // --- No Profile ---
  describe("Unauthenticated", () => {
    it("redirects to /login when there is no profile", () => {
      useAuth.mockReturnValue({ profile: null, loading: false });
      render(<ProtectedRoute><div>Child</div></ProtectedRoute>);
      const nav = screen.getByTestId("navigate");
      expect(nav).toHaveAttribute("data-to", "/login");
    });
  });

  // --- Non-Admin ---
  describe("Non-Admin role", () => {
    it("redirects to /dashboard when user is not Admin", () => {
      useAuth.mockReturnValue({ profile: { roleName: "Client" }, loading: false });
      render(<ProtectedRoute><div>Child</div></ProtectedRoute>);
      const nav = screen.getByTestId("navigate");
      expect(nav).toHaveAttribute("data-to", "/dashboard");
    });
  });

  // --- Admin ---
  describe("Admin role", () => {
    it("renders children when user is Admin", () => {
      useAuth.mockReturnValue({ profile: { roleName: "Admin" }, loading: false });
      render(<ProtectedRoute><div>Child Content</div></ProtectedRoute>);
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });
  });
});