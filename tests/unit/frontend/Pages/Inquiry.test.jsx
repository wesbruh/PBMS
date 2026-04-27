import React from "react";
import { render, screen } from "@testing-library/react";
import Inquiry from "../../../../src/pages/Inquiry/Inquiry.jsx";

 
// mock child components so we test the page in isolation
jest.mock("../../../../src/components/forms/InquiryForm.jsx", () => () => (
  <div data-testid="inquiry-form">InquiryForm</div>
));
 
jest.mock("../../../../src/GoToTop.js", () => () => (
  <div data-testid="go-to-top">GoToTop</div>
));
 
describe("Inquiry Page (Booking Request PAGE)", () => {
  beforeEach(() => {
    render(<Inquiry />);
  });
 
  test("1. renders the page heading", () => {
    expect(screen.getByRole("heading", { name: /inquiry/i })).toBeInTheDocument();
  });
 
  test("2. renders the subtitle text", () => {
    expect(
      screen.getByText(/share a few details below/i)
    ).toBeInTheDocument();
  });
 
  test("3. renders the InquiryForm component", () => {
    expect(screen.getByTestId("inquiry-form")).toBeInTheDocument();
  });
 
  test("4. renders the GoToTop component", () => {
    expect(screen.getByTestId("go-to-top")).toBeInTheDocument();
  });
});