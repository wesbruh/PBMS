import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import GoToTop from "../../../../src/GoToTop";

function TestNavigator() {
  const navigate = useNavigate();

  return (
    <>
      <GoToTop />
      <button onClick={() => navigate("/about")}>Go About</button>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/about" element={<div>About Page</div>} />
      </Routes>
    </>
  );
}

describe("GoToTop", () => {
  beforeEach(() => {
    window.scrollTo = jest.fn();
  });

  test("calls scrollTo on initial render", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <GoToTop />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test("calls scrollTo when route changes", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestNavigator />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /go about/i }));

    expect(screen.getByText("About Page")).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });
});