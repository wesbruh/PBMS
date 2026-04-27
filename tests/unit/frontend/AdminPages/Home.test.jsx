import React from "react";
import { render, screen } from "@testing-library/react";

// mock supabaseClient to prevent import.meta parse errors in child components
jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: { from: jest.fn() },
}));

// mock AuthContext so we can control the profile returned to the component
const mockUseAuth = jest.fn();
jest.mock("../../../../src/context/AuthContext.jsx", () => ({
  useAuth: () => mockUseAuth(),
}));

// mock child components to isolate the AdminHome page logic
// each renders a simple div with a test id to verify that they mount
jest.mock(
  "../../../../src/admin/components/shared/Sidebar/Sidebar.jsx",
  () => () => <div data-testid="sidebar">Sidebar</div>,
);
jest.mock(
  "../../../../src/admin/components/shared/Frame/Frame.jsx",
  () =>
    ({ children }) => <div data-testid="frame">{children}</div>,
);
jest.mock(
  "../../../../src/admin/components/shared/YTDBarChart/YTDBarChart.jsx",
  () => () => <div data-testid="ytd-bar-chart">YTDBarChart</div>,
);
jest.mock(
  "../../../../src/admin/components/shared/MetricsGrid/MetricsGrid.jsx",
  () => () => <div data-testid="metrics-grid">MetricsGrid</div>,
);
jest.mock(
  "../../../../src/admin/components/shared/SessionCalendar/SessionCalendar.jsx",
  () => () => <div data-testid="session-calendar">SessionCalendar</div>,
);

import AdminHome from "../../../../src/admin/pages/Home/Home.jsx";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AdminHome Page Tests", () => {
  // verifies the loading message is shown when the profile has not loaded yet
  test("1. shows loading state when profile is null", () => {
    mockUseAuth.mockReturnValue({ profile: null });

    render(<AdminHome />);

    expect(screen.getByText("Loading your account...")).toBeInTheDocument();
  });

  // verifies the loading message is shown when profile exists but has no name.
  // an empty first_name and last_name results in a falsy username after trim.
  test("2. shows loading state when profile has empty name fields", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "", last_name: "" },
    });

    render(<AdminHome />);

     expect(screen.getByText("Welcome back,")).toBeInTheDocument();
     expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  // verifies the sidebar and frame wrapper components render when profile is loaded
  test("3. renders Sidebar and Frame when profile is loaded", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "Username" },
    });

    render(<AdminHome />);

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("frame")).toBeInTheDocument();
  });

  // verifies the welcome header displays the user's full name from the profile
  test("4. shows welcome message with username", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "Username" },
    });

    render(<AdminHome />);

    expect(screen.getByText("Welcome back, Test Username")).toBeInTheDocument();
  });

  // verifies the page subtitle renders below the welcome header
  test("5. shows page description subtitle", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "Username" },
    });

    render(<AdminHome />);

    expect(
      screen.getByText(/Here's what's happening within Your Roots Photography/),
    ).toBeInTheDocument();
  });

  // verifies the MetricsGrid child component mounts on the page
  test("6. renders MetricsGrid component", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "Username" },
    });

    render(<AdminHome />);

    expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
  });

  // verifies the YTDBarChart child component mounts on the page
  test("7. renders YTDBarChart component", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "Username" },
    });

    render(<AdminHome />);

    expect(screen.getByTestId("ytd-bar-chart")).toBeInTheDocument();
  });

  // verifies the SessionCalendar child component mounts on the page
  test("8. renders SessionCalendar component", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "Username" },
    });

    render(<AdminHome />);

    expect(screen.getByTestId("session-calendar")).toBeInTheDocument();
  });

  // verifies that none of the dashboard components render during loading state.
  // only the loading message should be visible, not the sidebar or charts.
  test("9. does not render dashboard components when loading", () => {
    mockUseAuth.mockReturnValue({ profile: null });

    render(<AdminHome />);

    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("metrics-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ytd-bar-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-calendar")).not.toBeInTheDocument();
  });

  // verifies the welcome message uses only the first name when last name is missing
  test("10. handles profile with only first name", () => {
    mockUseAuth.mockReturnValue({
      profile: { first_name: "Test", last_name: "" },
    });

    render(<AdminHome />);

    expect(screen.getByText("Welcome back, Test")).toBeInTheDocument();
  });
});
