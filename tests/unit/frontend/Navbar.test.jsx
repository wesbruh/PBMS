import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../../../src/components/Navbar/Navbar";

const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();
const mockSignOut = jest.fn();

jest.mock("../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      signOut: (...args) => mockSignOut(...args),
    },
  },
}));

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Navbar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReset();
    mockSignOut.mockReset();
    global.fetch = jest.fn();
  });

  test("renders common navigation links for logged out users", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/home/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/about/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/testimonials/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/portfolio/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/^services$/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/special services/i)[0]).toBeInTheDocument();
  });

  test("shows login and signup actions when logged out", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/log in/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/book with me/i).length).toBeGreaterThan(0);
  });

  test("shows dashboard and logout when logged in as user", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "User" },
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/dashboard/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/log out/i)[0]).toBeInTheDocument();
  });

  test('shows "Book with me" nav link for logged in user role', () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "User" },
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const matches = screen.getAllByText(/book with me/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  test("shows admin dashboard link when logged in as admin", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "Admin" },
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const dashboardLinks = screen.getAllByText(/dashboard/i);
    expect(dashboardLinks.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/log out/i)[0]).toBeInTheDocument();
  });

  test('does not show dashboard inquiry "Book with me" nav link for admin role', () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "Admin" },
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const links = screen.queryAllByRole("link", { name: /^book with me$/i });
    const dashboardInquiryLink = links.find(
      (link) => link.getAttribute("href") === "/dashboard/inquiry"
    );

    expect(dashboardInquiryLink).toBeUndefined();
  });

  test("renders non-homepage navbar styling", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/about"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(container.querySelector("nav")).toHaveClass("bg-[#FFFDF4]");
  });

  test("marks special services route as active", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    render(
      <MemoryRouter initialEntries={["/services/weddings"]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/special services/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/weddings/i).length).toBeGreaterThan(0);
  });

  test("opens mobile menu when toggle button is clicked", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));
    expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
  });

  test("closes mobile menu when close button is clicked", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    expect(sidebar).toHaveClass("translate-x-0");

    fireEvent.click(screen.getByLabelText(/close menu/i));
    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("closes mobile menu when overlay is clicked", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    expect(sidebar).toHaveClass("translate-x-0");

    const overlay = container.querySelector(".fixed.inset-0");
    fireEvent.click(overlay);

    expect(sidebar).toHaveClass("translate-x-full");
    expect(container.querySelector(".fixed.inset-0")).not.toBeInTheDocument();
  });

  test("opens special services accordion in mobile menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));
    fireEvent.click(screen.getAllByText(/special services/i)[1]);

    expect(screen.getAllByText(/weddings/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/labor & delivery/i).length).toBeGreaterThan(0);
  });

  test("shows mobile user book-with-me link when logged in as user", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "User" },
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const matches = screen.getAllByText(/book with me/i);
    expect(matches.length).toBeGreaterThan(1);
  });

  test("clicking mobile Home link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/about"]}>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    expect(sidebar).toHaveClass("translate-x-0");

    fireEvent.click(screen.getAllByText(/home/i)[1]);
    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile About link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/about/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile Services link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/^services$/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile Weddings link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));
    fireEvent.click(screen.getAllByText(/special services/i)[1]);

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/weddings/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile Labor & Delivery link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));
    fireEvent.click(screen.getAllByText(/special services/i)[1]);

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/labor & delivery/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("shows mobile logged-out auth links when menu is open", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const loginMatches = screen.getAllByText(/log in/i);
    const bookMatches = screen.getAllByText(/book with me/i);

    expect(loginMatches.length).toBeGreaterThan(1);
    expect(bookMatches.length).toBeGreaterThan(1);
  });

  test("clicking mobile logged-out login link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/log in/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile logged-out book with me link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      profile: null,
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/book with me/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile user dashboard link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "User" },
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/dashboard/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("clicking mobile user book-with-me link closes the menu", () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token" },
      profile: { id: "123", roleName: "User" },
    });

    const { container } = render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));

    const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
    fireEvent.click(screen.getAllByText(/book with me/i)[1]);

    expect(sidebar).toHaveClass("translate-x-full");
  });

  test("logs out successfully and navigates to login", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token123" },
      profile: { id: "abc123", roleName: "User" },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    mockSignOut.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText(/log out/i)[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("mobile logout button logs out successfully", async () => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token123" },
      profile: { id: "abc123", roleName: "User" },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    mockSignOut.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText(/toggle menu/i));
    fireEvent.click(screen.getAllByText(/log out/i)[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
test("clicking mobile Testimonials link closes the menu", () => {
  mockUseAuth.mockReturnValue({
    session: null,
    profile: null,
  });

  const { container } = render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByLabelText(/toggle menu/i));

  const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
  fireEvent.click(screen.getAllByText(/testimonials/i)[1]);

  expect(sidebar).toHaveClass("translate-x-full");
});

test("clicking mobile Portfolio link closes the menu", () => {
  mockUseAuth.mockReturnValue({
    session: null,
    profile: null,
  });

  const { container } = render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByLabelText(/toggle menu/i));

  const sidebar = container.querySelector(".lg\\:hidden.fixed.top-0.right-0");
  fireEvent.click(screen.getAllByText(/portfolio/i)[1]);

  expect(sidebar).toHaveClass("translate-x-full");
});
  test("logout handles failed inactive-status update and still signs out", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockUseAuth.mockReturnValue({
      session: { access_token: "token123" },
      profile: { id: "abc123", roleName: "User" },
    });

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "bad request" }),
    });

    mockSignOut.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByText(/log out/i)[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    errorSpy.mockRestore();
  });
});