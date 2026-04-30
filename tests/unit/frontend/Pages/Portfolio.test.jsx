import { render, screen, fireEvent } from "@testing-library/react";
import Portfolio from "../../../../src/pages/Portfolio/Portfolio.jsx";

describe("Portfolio", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  test("renders portfolio header and overview text", () => {
    render(<Portfolio />);

    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(
      screen.getByText(/a curated selection of my work across different session types/i)
    ).toBeInTheDocument();
  });

  test("renders category tiles in overview mode", () => {
    render(<Portfolio />);

    expect(screen.getByText("Couples & Engagements")).toBeInTheDocument();
    expect(screen.getByText("Weddings & Elopements")).toBeInTheDocument();
    expect(screen.getByText("Maternity")).toBeInTheDocument();
    expect(screen.getByText("Lifestyle")).toBeInTheDocument();
  });
test("does not open category gallery when a non-Enter key is pressed on a category tile", () => {
  const { container } = render(<Portfolio />);

  const couplesTile = Array.from(container.querySelectorAll('[role="button"]')).find(
    (el) => el.textContent.includes("Couples & Engagements")
  );

  fireEvent.keyDown(couplesTile, { key: "Space" });

  expect(screen.queryByText("← Back")).not.toBeInTheDocument();
});
  test("opens category gallery when a category tile is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Couples & Engagements"));

    expect(screen.getByText("← Back")).toBeInTheDocument();
    expect(screen.getAllByText("Couples & Engagements").length).toBeGreaterThan(0);
    expect(screen.getByText(/8 photos/i)).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  test("returns to overview when back button is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Maternity"));
    expect(screen.getByText("← Back")).toBeInTheDocument();

    fireEvent.click(screen.getByText("← Back"));
    expect(screen.queryByText(/photos/i)).not.toBeInTheDocument();
    expect(screen.getByText("Lifestyle")).toBeInTheDocument();
  });

  test("renders correct photo count for selected category", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Lifestyle"));
    expect(screen.getByText(/8 photos/i)).toBeInTheDocument();
  });

  test("opens lightbox when gallery image is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Lifestyle"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();
    expect(screen.getByText("Prev")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  test("closes lightbox when overlay is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Lifestyle"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();

    const overlay = screen.getByText(/press ← \/ → to navigate/i).closest(".fixed");
    fireEvent.click(overlay);

    expect(screen.queryByText(/press ← \/ → to navigate/i)).not.toBeInTheDocument();
  });

  test("does not close lightbox when image container is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Lifestyle"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();

    const lightboxText = screen.getByText(/press ← \/ → to navigate/i);
    const imageContainer = lightboxText.parentElement;
    fireEvent.click(imageContainer);

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();
  });

  test("navigates to next image when Next button is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Weddings & Elopements"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();
  });

  test("navigates to previous image when Prev button is clicked", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Weddings & Elopements"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    fireEvent.click(screen.getByText("Prev"));

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();
  });

  test("closes lightbox when Escape key is pressed", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Couples & Engagements"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByText(/press ← \/ → to navigate/i)).not.toBeInTheDocument();
  });

  test("navigates lightbox with ArrowRight key", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Maternity"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();
  });

  test("navigates lightbox with ArrowLeft key", () => {
    render(<Portfolio />);

    fireEvent.click(screen.getByText("Maternity"));

    const imageButtons = screen.getAllByRole("button");
    fireEvent.click(imageButtons[1]);

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(screen.getByText(/press ← \/ → to navigate/i)).toBeInTheDocument();
  });
});
