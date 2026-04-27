import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockUseAuth = jest.fn();

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import ProtectedRoute from "../../../../src/components/ProtectedRoute.jsx";

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route path="/" element={<div>Home Screen</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  test("shows a loading message while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ loading: true, profile: null });
    renderProtectedRoute();

    expect(screen.getByText(/loading your account/i)).toBeInTheDocument();
  });

  test("redirects anonymous users to login", () => {
    mockUseAuth.mockReturnValue({ loading: false, profile: null });
    renderProtectedRoute();

    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  test("redirects non-user roles home and allows normal users through", () => {
    mockUseAuth.mockReturnValue({ loading: false, profile: { roleName: "Admin" } });
    const { unmount } = renderProtectedRoute();
    expect(screen.getByText("Home Screen")).toBeInTheDocument();

    unmount();
    mockUseAuth.mockReturnValue({ loading: false, profile: { roleName: "User" } });
    renderProtectedRoute();

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
