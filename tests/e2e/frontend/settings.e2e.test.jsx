import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithRouter } from "../../utils/frontend/renderWithRouter.jsx";

jest.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    storage: {
      from: jest.fn(() => ({
        list: jest.fn(),
        download: jest.fn(),
        upload: jest.fn(),
        remove: jest.fn(),
      })),
    },
  },
}));

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    profile: {
      first_name: "Casey",
      last_name: "Photographer",
    },
  }),
}));

jest.mock("../../../src/admin/components/shared/Sidebar/Sidebar", () => () => (
  <aside data-testid="sidebar" />
));

jest.mock("../../../src/admin/components/shared/Frame/Frame", () => ({ children }) => (
  <div data-testid="frame">{children}</div>
));

import AdminSettings from "../../../src/admin/pages/Settings/Settings.jsx";

describe("Admin settings e2e flow", () => {
  test("renders the screen and blocks saving when no user is logged in", async () => {
    renderWithRouter(<AdminSettings />);

    await screen.findByRole("heading", { name: /personal settings/i });

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Casey Photographer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/you must be logged in to save settings/i)).toBeInTheDocument();
    });
  });
});
