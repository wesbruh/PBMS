import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

// mock lucide-react icons
jest.mock("lucide-react", () => ({
    ChevronUp: () => <span data-testid="chevron-up" />,
    ChevronDown: () => <span data-testid="chevron-down" />,
    ChevronLeft: () => <span data-testid="chevron-left" />,
    ChevronRight: () => <span data-testid="chevron-right" />,
    Search: () => <span data-testid="chevron-icon" />,
}));

// mock css import since this file uses its own css and not Tailwind
jest.mock("../../../../src/admin/components/shared/Table/Table.css", () => {});
import Table from "../../../../src/admin/components/shared/Table/Table.jsx";
import { ArrowBigLeft } from "lucide-react";

// table test data
const columns = [
    { key: "name", label: "Name", sortable: true},
    { key: "email", label: "Email", sortable: true},
    { key: "status", label: "Status", sortable: false},
];

const testData = [
    { id: "1", name: "name1", email: "name1@email.com", status: "Active" },
    { id: "2", name: "name2", email: "name2@email.com", status: "Pending" },
    { id: "3", name: "name3", email: "name3@email.com", status: "Active" },
    { id: "4", name: "name4", email: "name4@email.com", status: "Inactive" },
    { id: "5", name: "name5", email: "name5@email.com", status: "Active" },
];

// 27 TESTS //

describe("Table Admin Component Tests", () => {

    test("1. empty state", () => {

        render(<Table columns={columns} data={[]} />);
        expect(screen.getByText("No data available.")).toBeInTheDocument();
    });

    test("2. renders table with column headers and row data", () => {
        render(<Table columns={columns} data={testData} />);

        // column headers
        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();

        // data
        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.getByText("name1@email.com")).toBeInTheDocument();
        expect(screen.getAllByText("Active")).toHaveLength(3);  // 3 "Active" test data
    });

    test("3. sorts data ascending when clicking on a sortable column", () => {
        render(<Table columns={columns} data={testData} />);
        
        fireEvent.click(screen.getByText("Name"));

        const rows = screen.getAllByRole("row");

        // row 0 is the header and 1-5 are the data
        expect(within(rows[1]).getByText("name1")).toBeInTheDocument();
        expect(within(rows[2]).getByText("name2")).toBeInTheDocument();
        expect(within(rows[3]).getByText("name3")).toBeInTheDocument();
        expect(within(rows[4]).getByText("name4")).toBeInTheDocument();
        expect(within(rows[5]).getByText("name5")).toBeInTheDocument();
    });

    test("4. sorts data descending when clicking on the same column twice", () => {
        render(<Table columns={columns} data={testData} />);
        
        //click twice for descending
        fireEvent.click(screen.getByText("Name"));
        fireEvent.click(screen.getByText("Name"));


        const rows = screen.getAllByRole("row");

        // row 0 is the header and 1-5 are the data
        expect(within(rows[1]).getByText("name5")).toBeInTheDocument();
        expect(within(rows[2]).getByText("name4")).toBeInTheDocument();
        expect(within(rows[3]).getByText("name3")).toBeInTheDocument();
        expect(within(rows[4]).getByText("name2")).toBeInTheDocument();
        expect(within(rows[5]).getByText("name1")).toBeInTheDocument();
    });

    test("5. shows sort icon on the active sorted column", () => {
        render(<Table columns={columns} data={testData} />);
        
        // click once for chevron up
        fireEvent.click(screen.getByText("Name"));

        expect(screen.getByTestId("chevron-up")).toBeInTheDocument();

        // click again for chevron down
        fireEvent.click(screen.getByText("Name"));

        expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
    });

    test("6. does not sort or show icon when clicking on a non-sortable column", () => {
        render(<Table columns={columns} data={testData} />);
        
        // click once to try to get an icon to show
        // should NOT be in document
        fireEvent.click(screen.getByText("Status"));
        expect(screen.queryByTestId("chevron-up")).not.toBeInTheDocument();
        expect(screen.queryByTestId("chevron-down")).not.toBeInTheDocument();
    });

    test("7. filters rows based on a search term", () => {
        render(<Table columns={columns} data={testData} searchable={true} />);
        
        const input = screen.getByPlaceholderText("Search clients...");
        fireEvent.change(input, { target: { value: "name1" } });

        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.queryByText("name2")).not.toBeInTheDocument();
        expect(screen.queryByText("name3")).not.toBeInTheDocument();
    });

    test("8. shows no results message when search term matches nothing", () => {
        render(<Table columns={columns} data={testData} searchable={true} />);
        
        const input = screen.getByPlaceholderText("Search clients...");
        fireEvent.change(input, { target: { value: "abc" } });

        expect(screen.getByText('No results found for "abc".')).toBeInTheDocument();
    });

    test("9. uses custom search placeholder", () => {
        render(<Table columns={columns} data={testData} searchable={true} placeholder="Search clients..."/>);

        expect(screen.getByPlaceholderText("Search clients...")).toBeInTheDocument();
    });

    test("10. does not show search bar when searchable is false", () => {
        render(<Table columns={columns} data={testData} searchable={false} />);

        expect(screen.queryByPlaceholderText("Search clients...")).not.toBeInTheDocument();
    });

    test("11. shows pagination when data exceeds rowsPerPage", () => {
        // 10 rows when rows per page is 8
        const hellaRows = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            name: `User ${i}`,
            email: `user${i}@test.com`,
            status: "Active",
        }));

        render(<Table columns={columns} data={hellaRows} rowsPerPage = {8} />);
        
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
        expect(screen.getByText(/Showing 1 to 8 of 10 results/)).toBeInTheDocument();
    });

    test("12. hides pagination when all data fits on one page", () => {
        render(<Table columns={columns} data={testData} rowsPerPage = {8} />);
        
        expect(screen.queryByText(/Page\d+ of \d+/)).not.toBeInTheDocument();
    });

    test("13. navigates to next page when clicking next button", () => {
        const hellaRows = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            name: `User ${i}`,
            email: `user${i}@test.com`,
            status: "Active",
        }));

        render(<Table columns={columns} data={hellaRows} rowsPerPage = {8} />);

        // find all buttons, then the next page button, fires click event to got ot next page
        const allNextButtons = screen.getAllByRole("button");
        const nextButton = allNextButtons.find((btn) => within(btn).queryByTestId("chevron-right"));
        fireEvent.click(nextButton);

        expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
        expect(screen.getByText(/Showing 9 to 10 of 10 results/)).toBeInTheDocument();

    });

    test("14. navigates to previous page when clicking previous button", () => {
        const hellaRows = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            name: `User ${i}`,
            email: `user${i}@test.com`,
            status: "Active",
        }));

        render(<Table columns={columns} data={hellaRows} rowsPerPage = {8} />);

        // find all buttons, then the next page button, fires click event to got ot next page
        const allNextButtons = screen.getAllByRole("button");
        const nextButton = allNextButtons.find((btn) => within(btn).queryByTestId("chevron-right"));
        fireEvent.click(nextButton);
        expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

        // find previous button, then fire event click to go to previous page
        const prevButton = allNextButtons.find((btn) => within(btn).queryByTestId("chevron-left"));
        fireEvent.click(prevButton);
        expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    test("15. calls onRowClick with row data when a row is clicked", () => {
        const onRowClick = jest.fn();

        render(<Table columns={columns} data={testData} onRowClick={onRowClick}/>);

        fireEvent.click(screen.getByText("name1"));
        expect(onRowClick).toHaveBeenCalledWith(testData[0]);
    });

    test("16. uses custom render function for columns", () => {
        const customColumns = [
            { key: "name", label: "Name", sortable: false },
            { key: "status",
            label: "Status",
            sortable: false,
            render: (value) => <span data-testid="custom-badge">{value.toUpperCase()}</span>,
            },
        ];

        render(<Table columns={customColumns} data={testData} />);

        const badges = screen.getAllByTestId("custom-badge");
        expect(badges[0]).toHaveTextContent("ACTIVE");
    });

    test("17. resets to page 1 when SEARCHING", () => {
        const hellaRows = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            name: `User ${i}`,
            email: `user${i}@test.com`,
            status: "Active",
        }));

        render(<Table columns={columns} data={hellaRows} rowsPerPage={8} searchable={true}/>);

        // find all buttons, then the next page button, fires click event to got ot next page
        const allNextButtons = screen.getAllByRole("button");
        const nextButton = allNextButtons.find((btn) => within(btn).queryByTestId("chevron-right"));
        fireEvent.click(nextButton);
        expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

        // SEARCH resets to page 1
        const input = screen.getByPlaceholderText("Search clients...");
        fireEvent.change(input, { target: { value: "User" } });
        expect(screen.queryByText("Page 2")).not.toBeInTheDocument();
    });

    test("18. resets to page 1 when SORTING", () => {
        const hellaRows = Array.from({ length: 10 }, (_, i) => ({
            id: String(i),
            name: `User ${i}`,
            email: `user${i}@test.com`,
            status: "Active",
        }));

        render(<Table columns={columns} data={hellaRows} rowsPerPage={8} />);

        // find all buttons, then the next page button, fires click event to got ot next page
        const allNextButtons = screen.getAllByRole("button");
        const nextButton = allNextButtons.find((btn) => within(btn).queryByTestId("chevron-right"));
        fireEvent.click(nextButton);
        expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

        // SORT resets to page 1
        fireEvent.click(screen.getByText("Name"));
        expect(screen.queryByText("Page 1 of 2")).toBeInTheDocument();
    });

    test("19. filters data by tab selection", () => {
        const tabFilter = {
            dataType: "clients",
            tabs: ["Active", "Pending"],
            tabFilterFn: (row, tab) => tab === "All" || row.status === tab,
            type: "radio",
        };


        render(<Table columns={columns} data={testData} tabFilter={tabFilter} />);

        // click "Active" tab
        fireEvent.click(screen.getByRole("button", { name: "Active" }));
        
        // should only show actve rows
        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.getByText("name3")).toBeInTheDocument();
        expect(screen.getByText("name5")).toBeInTheDocument();
        expect(screen.queryByText("name2")).not.toBeInTheDocument();
        expect(screen.queryByText("name4")).not.toBeInTheDocument();
    });

    test("20. shows filtered empty state with dataType label", () => {
        const tabFilter = {
            dataType: "clients",
            tabs: ["Inactive"],
            tabFilterFn: (row, tab) => tab === "All" || row.status === tab,
            type: "radio",
        };

        // no "Cancelled" status in data
        const noMatchData = [
            {id: "1", name: "name1", email: "name1@email.com", status: "Active" },
        ];

        render(<Table columns={columns} data={noMatchData} tabFilter={tabFilter} />);

        // click "Active" tab
        fireEvent.click(screen.getByRole("button", { name: "Inactive" }));

        expect(screen.getByText("No inactive clients found.")).toBeInTheDocument();

    });

    test("21. renders filler rows to maintain height of table", () => {
        const fillerRows = testData.slice(0, 2);

        render(<Table columns={columns} data={fillerRows} rowsPerPage={8} />);

        const allRows = screen.getAllByRole("row");

        // 1 header + 2 data + 6 filler = 9 total rows
        expect(allRows.length).toBe(9);
    });

    test("22. filters data with checkbox tab type", () => {
         const tabFilter = {
            dataType: "clients",
            tabs: ["Active", "Pending"],
            tabFilterFn: (row, tabs) => tabs.includes("All") || tabs.includes(row.status),
            type: "checkbox",
        };

        render(<Table columns={columns} data={testData} tabFilter={tabFilter} />);

        // click "Active" checkbox tab
        fireEvent.click(screen.getByRole("button", { name: "Active" }));

        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.queryByText("name2")).not.toBeInTheDocument();
    });

    test("23. search handles null cell values gracefully", () => {
         const dataWithNull = [
            { id: "1", name: "name1", email: null, status: "Active" },
            { id: "2", name: "name2", email: "name2@test.com", status: "Pending" },
         ]

        render(<Table columns={columns} data={dataWithNull} searchable={true} />);

        const input = screen.getByPlaceholderText("Search clients...");
        fireEvent.change(input, { target: { value: "name2"} });

        expect(screen.getByText("name2")).toBeInTheDocument();
        expect(screen.queryByText("name1")).not.toBeInTheDocument();
    });

    test("24. checkbox tabs: clicking all resets selection", () => {
         const tabFilter = {
            dataType: "clients",
            tabs: ["Active", "Pending"],
            tabFilterFn: (row, tabs) => tabs.includes("All") || tabs.includes(row.status),
            type: "checkbox",
        };

        render(<Table columns={columns} data={testData} tabFilter={tabFilter} />);
        // select Active
        fireEvent.click(screen.getByRole("button", { name: "Active" }));
        // click again to reset
        fireEvent.click(screen.getByRole("button", { name: "All" }));

        // all rows should be visible
        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.getByText("name2")).toBeInTheDocument();
    });

    test("25. checkbox tabs: selecting all individual tabs resets to All", () => {
         const tabFilter = {
            dataType: "clients",
            tabs: ["Active", "Pending"],
            tabFilterFn: (row, tabs) => tabs.includes("All") || tabs.includes(row.status),
            type: "checkbox",
        };

        render(<Table columns={columns} data={testData} tabFilter={tabFilter} />);
        // select both tabs indiviudally
        fireEvent.click(screen.getByRole("button", { name: "Active" }));
        fireEvent.click(screen.getByRole("button", { name: "Pending" }));

        // should rest to ALL since all tabs aare selected
        expect(screen.getByText("name1")).toBeInTheDocument();
        expect(screen.getByText("name2")).toBeInTheDocument();
    });

    test("26. checkbox tabs: deselecting a tab removes it from filter", () => {
         const tabFilter = {
            dataType: "clients",
            tabs: ["Active", "Pending", "Inactive"],
            tabFilterFn: (row, tabs) => tabs.includes("All") || tabs.includes(row.status),
            type: "checkbox",
        };

        render(<Table columns={columns} data={testData} tabFilter={tabFilter} />);
        // select both tabs indiviudally
        fireEvent.click(screen.getByRole("button", { name: "Active" }));
        fireEvent.click(screen.getByRole("button", { name: "Pending" }));

        // deselect active
        fireEvent.click(screen.getByRole("button", { name: "Active" }));

        // only pending should remain
        expect(screen.getByText("name2")).toBeInTheDocument();
        expect(screen.queryByText("name1")).not.toBeInTheDocument();
    });

    test("27. sorting handles equal values without crashing", () => {
         const dupeData = [
            { id: "1", name: "name1", email: "name1@test.com", status: "Active" },
            { id: "2", name: "name1", email: "name2@test.com", status: "Pending" },
         ]

        render(<Table columns={columns} data={dupeData} />);
        // select both tabs indiviudally
        fireEvent.click(screen.getByText("Name"));

        // both name1 's should render 
        expect(screen.getAllByText("name1")).toHaveLength(2);
    });

});