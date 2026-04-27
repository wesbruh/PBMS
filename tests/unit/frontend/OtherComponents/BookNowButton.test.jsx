import { render, screen, fireEvent } from "@testing-library/react";
import BookNowButton from "../../../../src/components/Buttons/BookNowButton";

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("BookNowButton", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReset();
  });

  test("renders with default label", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<BookNowButton />);
    expect(screen.getByRole("button", { name: /book now/i })).toBeInTheDocument();
  });

  test("renders custom label", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<BookNowButton label="Start Booking" />);
    expect(
      screen.getByRole("button", { name: /start booking/i })
    ).toBeInTheDocument();
  });

  test("navigates to signup when user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<BookNowButton />);
    fireEvent.click(screen.getByRole("button", { name: /book now/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });

  test("navigates to dashboard inquiry when user is logged in", () => {
    mockUseAuth.mockReturnValue({ user: { id: 1 }, loading: false });

    render(<BookNowButton />);
    fireEvent.click(screen.getByRole("button", { name: /book now/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/inquiry");
  });

  test("is disabled while loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(<BookNowButton />);
    expect(screen.getByRole("button", { name: /book now/i })).toBeDisabled();
  });

  test("does not navigate while loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(<BookNowButton />);
    fireEvent.click(screen.getByRole("button", { name: /book now/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
