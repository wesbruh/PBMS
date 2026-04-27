import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import SectionPager from "../../../../src/components/SectionPager.jsx";

jest.mock("lucide-react", () => ({
    ChevronLeft: () => <span data-testid="chevron-left">Left</span>,
    ChevronRight: () => <span data-testid="chevron-right">Right</span>,
}));

describe("SectionPager", () => {
    // Test case 1: If total items fit on one page, the pager should not render.
    test("1.) Does not render when total items are less than or equal to items per page", () => {
        const { container } = render(
            <SectionPager page={0} setPage={jest.fn()} totalItems={4} itemsPerPage={4} />
        );

        expect(container).toBeEmptyDOMElement();
    });

    // Test case 2: It should render the correct page label.
    test("2.) Displays the current page and total number of pages", () => {
        render(
            <SectionPager page={1} setPage={jest.fn()} totalItems={10} itemsPerPage={4} />
        );

        expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    });

    // Test case 3: On the first page, the previous button should be disabled.
    test("3.) Disables previous button on the first page", () => {
        render(
            <SectionPager page={0} setPage={jest.fn()} totalItems={10} itemsPerPage={4} />
        );

        const buttons = screen.getAllByRole("button");

        expect(buttons[0]).toBeDisabled();
        expect(buttons[1]).not.toBeDisabled();
    });

    // Test case 4: On the last page, the next button should be disabled.
    test("4.) Disables next button on the last page", () => {
        render(
            <SectionPager page={2} setPage={jest.fn()} totalItems={10} itemsPerPage={4} />
        );

        const buttons = screen.getAllByRole("button");

        expect(buttons[0]).not.toBeDisabled();
        expect(buttons[1]).toBeDisabled();
    });

    // Test case 5: Clicking previous should call setPage with a function that decreases the page.
    test("5.) Previous button decreases the page but never below zero", () => {
        const setPage = jest.fn();

        render(
            <SectionPager page={1} setPage={setPage} totalItems={10} itemsPerPage={4} />
        );

        const previousButton = screen.getAllByRole("button")[0];

        fireEvent.click(previousButton);

        expect(setPage).toHaveBeenCalledTimes(1);

        const updater = setPage.mock.calls[0][0];

        expect(updater(1)).toBe(0);
        expect(updater(0)).toBe(0);
    });

    // Test case 6: Clicking next should call setPage with a function that increases the page.
    test("6.) Next button increases the page when another page exists", () => {
        const setPage = jest.fn();

        render(
            <SectionPager page={0} setPage={setPage} totalItems={10} itemsPerPage={4} />
        );

        const nextButton = screen.getAllByRole("button")[1];

        fireEvent.click(nextButton);

        expect(setPage).toHaveBeenCalledTimes(1);

        const updater = setPage.mock.calls[0][0];

        expect(updater(0)).toBe(1);
    });

    // Test case 7: If next is disabled, clicking it should not call setPage.
    test("7.) Next button does not call setPage when there is no next page", () => {
        const setPage = jest.fn();

        render(
            <SectionPager page={2} setPage={setPage} totalItems={10} itemsPerPage={4} />
        );

        const nextButton = screen.getAllByRole("button")[1];

        fireEvent.click(nextButton);

        expect(setPage).not.toHaveBeenCalled();
    });

    // Test case 8: Uses default itemsPerPage value when not provided.
    test("8.) Uses default items per page value of 4", () => {
        render(<SectionPager page={0} setPage={jest.fn()} totalItems={9} />);

        expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

});