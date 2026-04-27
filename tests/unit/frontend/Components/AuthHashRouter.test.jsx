import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthHashRouter from "../../../../src/components/AuthHashRouter.jsx";

function renderAuthHashRouter(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route
          path="*"
          element={
            <AuthHashRouter>
              <div>Child Content</div>
            </AuthHashRouter>
          }
        />
        <Route path="/auth/callback" element={<div>Callback Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AuthHashRouter", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    window.location.hash = "";
  });

  test("passes children through when there is no auth token in the URL", () => {
    renderAuthHashRouter("/");

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  test("redirects auth hashes to the callback route", async () => {
    window.location.hash = "#access_token=abc123";

    renderAuthHashRouter("/");

    await waitFor(() => {
      expect(screen.getByText("Callback Page")).toBeInTheDocument();
    });
  });

  test("redirects auth query params to the callback route unless already there", async () => {
    window.history.replaceState({}, "", "/?code=pkce-code");
    renderAuthHashRouter("/?code=pkce-code");

    await waitFor(() => {
      expect(screen.getByText("Callback Page")).toBeInTheDocument();
    });

    window.history.replaceState({}, "", "/auth/callback?code=pkce-code");
    cleanup();
    render(
      <MemoryRouter initialEntries={["/auth/callback?code=pkce-code"]}>
        <Routes>
          <Route
            path="*"
            element={
              <AuthHashRouter>
                <div>Already Here</div>
              </AuthHashRouter>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Already Here")).toBeInTheDocument();
  });

  test("ignores empty hashes and non-auth query params", () => {
    window.location.hash = "#";
    window.history.replaceState({}, "", "/?foo=bar");

    renderAuthHashRouter("/?foo=bar");

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });
});
