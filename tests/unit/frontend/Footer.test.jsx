import { render, screen } from "@testing-library/react";
import Footer from "../../../src/components/Footer/Footer";

describe("Footer", () => {
  test("renders without crashing", () => {
    render(<Footer />);
  });

  test("renders the logo alt text", () => {
    render(<Footer />);
    expect(
      screen.getAllByAltText(/your roots photography logo/i)[0]
    ).toBeInTheDocument();
  });

  test("renders copyright text", () => {
    render(<Footer />);
    expect(screen.getAllByText(/your roots photography/i)[0]).toBeInTheDocument();
  });

  test("renders social media links", () => {
    render(<Footer />);

    expect(screen.getAllByLabelText(/instagram/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/facebook/i)[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText(/tiktok/i)[0]).toBeInTheDocument();
  });

  test("social media links have correct hrefs", () => {
    render(<Footer />);

    expect(screen.getAllByLabelText(/instagram/i)[0]).toHaveAttribute(
      "href",
      "https://www.instagram.com/your.rootsphotography/"
    );
    expect(screen.getAllByLabelText(/facebook/i)[0]).toHaveAttribute(
      "href",
      "https://www.facebook.com/bailey.palestini"
    );
    expect(screen.getAllByLabelText(/tiktok/i)[0]).toHaveAttribute(
      "href",
      "https://www.tiktok.com/@baileypalestini"
    );
  });
});
