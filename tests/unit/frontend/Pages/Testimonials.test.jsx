import { render, screen } from "@testing-library/react";
import Testimonials from "../../../../src/pages/Testimonials/Testimonials.jsx";

jest.mock("../../../../src/components/Buttons/BookNowButton", () => {
  return function MockBookNowButton(props) {
    return (
      <button className={props.className}>
        {props.label}
      </button>
    );
  };
});

describe("Testimonials", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("renders hero section content", () => {
    render(<Testimonials />);

    expect(
      screen.getByText(/love notes from people i've photographed/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/love\./i)).toBeInTheDocument();
    expect(screen.getByText(/memories\./i)).toBeInTheDocument();
    expect(screen.getByText(/forever\./i)).toBeInTheDocument();
  });

  test("renders hero and booking images", () => {
    render(<Testimonials />);

    expect(screen.getByAltText(/testimonials hero/i)).toBeInTheDocument();
    expect(screen.getByAltText(/booking section/i)).toBeInTheDocument();
  });

  test("renders review section heading and description", () => {
    render(<Testimonials />);

    expect(
      screen.getByText(/read what my clients are saying!/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/browse live google and yelp reviews from past clients/i)
    ).toBeInTheDocument();
  });

  test("renders Google and Yelp review links with correct URLs", () => {
    render(<Testimonials />);

    const googleLink = screen.getByRole("link", { name: /leave a google review/i });
    const yelpLink = screen.getByRole("link", { name: /leave a yelp review/i });

    expect(googleLink).toBeInTheDocument();
    expect(yelpLink).toBeInTheDocument();

    expect(googleLink).toHaveAttribute("href", expect.stringContaining("google.com"));
    expect(yelpLink).toHaveAttribute("href", expect.stringContaining("yelp.com"));
  });

  test("review links open in a new tab safely", () => {
    render(<Testimonials />);

    const googleLink = screen.getByRole("link", { name: /leave a google review/i });
    const yelpLink = screen.getByRole("link", { name: /leave a yelp review/i });

    expect(googleLink).toHaveAttribute("target", "_blank");
    expect(googleLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(yelpLink).toHaveAttribute("target", "_blank");
    expect(yelpLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("renders Elfsight review widget container", () => {
    const { container } = render(<Testimonials />);

    const widget = container.querySelector(
      ".elfsight-app-6489279b-8ef7-45be-926b-6b213c14ba84"
    );
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveAttribute("data-elfsight-app-lazy");
  });

  test("injects widget script when it does not already exist", () => {
    render(<Testimonials />);

    const script = document.querySelector(
      'script[src="https://elfsightcdn.com/platform.js"]'
    );

    expect(script).toBeInTheDocument();

    // FIXED LINE
    expect(script.async).toBe(true);
  });

  test("does not inject duplicate widget script if it already exists", () => {
    const existingScript = document.createElement("script");
    existingScript.src = "https://elfsightcdn.com/platform.js";
    document.body.appendChild(existingScript);

    render(<Testimonials />);

    const scripts = document.querySelectorAll(
      'script[src="https://elfsightcdn.com/platform.js"]'
    );

    expect(scripts.length).toBe(1);
  });

  test("renders booking footer content", () => {
    render(<Testimonials />);

    expect(screen.getByText(/let's get you booked!/i)).toBeInTheDocument();
    expect(screen.getByText(/your roots photography/i)).toBeInTheDocument();
  });

  test("renders BookNowButton with the correct label", () => {
    render(<Testimonials />);

    expect(
      screen.getByRole("button", { name: /book with me!/i })
    ).toBeInTheDocument();
  });
});