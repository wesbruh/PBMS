import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import CarouselSection from "../../../../src/components/HomePageComps/CarouselPhotos.jsx";

jest.mock("../../../../src/components/Buttons/BookNowButton.jsx", () => {
  return function MockBookNowButton({ label }) {
    return <button>{label}</button>;
  };
});

describe("CarouselSection", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("renders all carousel images", () => {
    render(<CarouselSection />);

    expect(screen.getByAltText("Carousel 1")).toBeInTheDocument();
    expect(screen.getByAltText("Carousel 2")).toBeInTheDocument();
    expect(screen.getByAltText("Carousel 3")).toBeInTheDocument();
    expect(screen.getByAltText("Carousel 4")).toBeInTheDocument();
    expect(screen.getByAltText("Carousel 5")).toBeInTheDocument();
  });

  test("renders heading text and book button", () => {
    render(<CarouselSection />);

    expect(screen.getByText("Never Forget Your Roots")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book With Me!" })).toBeInTheDocument();
  });

  test("shows first image as active initially", () => {
    render(<CarouselSection />);

    const firstImageWrapper = screen.getByAltText("Carousel 1").parentElement;
    const secondImageWrapper = screen.getByAltText("Carousel 2").parentElement;

    expect(firstImageWrapper).toHaveClass("opacity-100");
    expect(secondImageWrapper).toHaveClass("opacity-0");
  });

  test("auto advances to next slide after 5 seconds", () => {
    render(<CarouselSection />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const firstImageWrapper = screen.getByAltText("Carousel 1").parentElement;
    const secondImageWrapper = screen.getByAltText("Carousel 2").parentElement;

    expect(firstImageWrapper).toHaveClass("opacity-0");
    expect(secondImageWrapper).toHaveClass("opacity-100");
  });

  test("loops back to first slide after the last slide", () => {
    render(<CarouselSection />);

    act(() => {
      jest.advanceTimersByTime(5000 * 5);
    });

    const firstImageWrapper = screen.getByAltText("Carousel 1").parentElement;
    expect(firstImageWrapper).toHaveClass("opacity-100");
  });

  test("clicking an indicator changes the current slide", () => {
    render(<CarouselSection />);

    const indicator = screen.getByRole("button", { name: "Go to slide 4" });
    fireEvent.click(indicator);

    const fourthImageWrapper = screen.getByAltText("Carousel 4").parentElement;
    const firstImageWrapper = screen.getByAltText("Carousel 1").parentElement;

    expect(fourthImageWrapper).toHaveClass("opacity-100");
    expect(firstImageWrapper).toHaveClass("opacity-0");
  });

  test("active indicator gets expanded styling", () => {
    render(<CarouselSection />);

    const slide1 = screen.getByRole("button", { name: "Go to slide 1" });
    const slide3 = screen.getByRole("button", { name: "Go to slide 3" });

    expect(slide1).toHaveClass("w-8");
    expect(slide3).not.toHaveClass("w-8");

    fireEvent.click(slide3);

    expect(slide3).toHaveClass("w-8");
    expect(slide1).not.toHaveClass("w-8");
  });

  test("clears interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = render(<CarouselSection />);
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});