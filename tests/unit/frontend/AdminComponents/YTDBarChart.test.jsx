import React from "react";
import { useState } from "react";
import { render, screen, waitFor,act } from "@testing-library/react";


// mock supabaseClient to avoid import.meta parse error. 
// this is different from backend test since the actual file uses a supabase call and not a fetch() since we did not update it
// Jest intercepts the import and swaps in the fake object instead
jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// mock recharts
const mockBarChart = jest.fn(({ children }) => <div data-testid="bar-chart">{children}</div>);
const mockBar = jest.fn((props) => <div data-testid={`bar-${props.dataKey}`} />);
const mockToolTip = { Component: null };
const mockXAxistick = { renderer: null };

jest.mock("recharts", () => ({
    BarChart: (props) => mockBarChart(props),
    Bar: (props) => mockBar(props),
    XAxis: (props) => {
        if (props.tick && typeof props.tick === "function") {
            mockXAxistick.renderer = props.tick;
        }
        return null;
    },
    YAxis: (props) => {
        if (props.tickFormatter) {
            // call various values to cover all branches
            props.tickFormatter(0);
            props.tickFormatter(500);
            props.tickFormatter(1000);
            props.tickFormatter(2000);
            props.tickFormatter(100000);
            props.tickFormatter(1000000);
        }
        return null;
    },
    CartesianGrid: () => null,
    Tooltip: (props) => {
        if (props.content) {
            mockToolTip.Component = props.content.type || props.content;
        }
        return null;
    },
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

// mock lucide-react LoaderCircle
jest.mock("lucide-react", () => ({
    LoaderCircle: () => <span data-testid="loader" />,
}));

const { supabase } = require("../../../../src/lib/supabaseClient.js");
import YTDBarChart from "../../../../src/admin/components/shared/YTDBarChart/YTDBarChart.jsx";

// helper functions 
function mockQueryBuilder(result ={}) {
    const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        gte: jest.fn(() => builder),
        lt: jest.fn().mockResolvedValue({
            data: result.data ?? [],
            error: result.error ?? null,
        }),
    };
    return builder;
}

// clears all mock call history before each test
beforeEach(() => {
    jest.clearAllMocks();
    mockToolTip.Component = null;
    mockXAxistick.renderer = null;
});

// 21 TESTS //

describe("YTDBarChart Admin Component Tests", () => {
    // all supabase.from calls are payment first then session

    test("1. show loading state while fetching", () => {
        //return a promise that never resolves to keep loading state
        const builder = {
            select: jest.fn(() => builder),
            eq: jest.fn(() => builder),
            gte: jest.fn(() => builder),
            lt: jest.fn(() => new Promise(() => {})),
        };
        supabase.from.mockReturnValue(builder);
        render(<YTDBarChart />);

        expect(screen.getByText("Loading chart...")).toBeInTheDocument();
        expect(screen.getByText("YTD Avg/month")).toBeInTheDocument();
    });

    test("2. renders chart after successful fetch with payment data", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // first from() call: payment query
        // second from() call: Session query

        supabase.from.mockReturnValueOnce(mockQueryBuilder({
            data: [
                { amount: 1000, paid_at: "2026-04-26T09:00:00+00" },
                { amount: 500, paid_at: "2026-04-26T09:00:00+00" },
                { amount: 750, paid_at: "2026-05-26T09:00:00+00" },
            ],
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [],
            error: null,
        }));

        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
            expect(screen.getByText("Year-to-Date Average Sales")).toBeInTheDocument();
        });

        console.error.mockRestore();
    });

    test("3. shows error message wqhen PAYMENT query fails", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        supabase.from.mockReturnValueOnce(mockQueryBuilder({
            error: { message: "Database error" },
        }))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [],
            error: null,
        }));

        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByText("Failed to load chart data.")).toBeInTheDocument();
        });
        expect(console.error).toHaveBeenCalled();
        console.error.mockRestore();
    });

    test("4. shows error message wqhen SESSION query fails", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        supabase.from.mockReturnValueOnce(mockQueryBuilder({
            data: [],
            error: null,
            
        }))
        .mockReturnValueOnce(mockQueryBuilder({
            error: { message: "Session table error" },
        }));

        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByText("Failed to load chart data.")).toBeInTheDocument();
        });
        expect(console.error).toHaveBeenCalled();
        console.error.mockRestore();
    });

    test("5. queries Payment and Session tables with correct filters", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));


        await act(async() => {
            render (<YTDBarChart /> );
        });

        // verify correct tables are queried
        expect(supabase.from).toHaveBeenCalledWith("Payment");
        expect(supabase.from).toHaveBeenCalledWith("Session");

        // verify payment query filters
        const paymentBuilder = supabase.from.mock.results[0].value;
        expect(paymentBuilder.eq).toHaveBeenCalledWith("status", "Paid");
        expect(paymentBuilder.gte).toHaveBeenCalledWith("paid_at", expect.stringContaining("-01-01"));

        // verify session query filters
        const sessionBuilder = supabase.from.mock.results[1].value;
        expect(sessionBuilder.eq).toHaveBeenCalledWith("status", "Confirmed");
        expect(sessionBuilder.gte).toHaveBeenCalledWith("start_at", expect.stringContaining("-01-01"));

        console.error.mockRestore();
    });

    test("6. renders custom title when provided", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));


        await act(async() => {
            render (<YTDBarChart title="Custom Revenue Chart" subtitle="Custom subtitle"/> );
        });

        await waitFor(() => {
            expect(screen.getByText("Custom Revenue Chart")).toBeInTheDocument();
            expect(screen.getByText("Custom subtitle")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("7. default subtitle includes the current year like how it is in the component", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));


        await act(async() => {
            render (<YTDBarChart /> );
        });
        const year = new Date().getFullYear();

        await waitFor(() => {
            expect(screen.getByText(`Monthly session revenue - ${year}`)).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("8. displays $0.00 YTD Average whenno payments exist", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));


        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByText("$0.00")).toBeInTheDocument();
            expect(screen.getByText("0 / 12")).toBeInTheDocument();
        });

        console.error.mockRestore();
    });

    test("9. computes YTD average from months with data", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // payments in both months
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { amount: 600, paid_at: "2026-04-26T09:00:00+00" },
                { amount: 400, paid_at: "2026-05-26T09:00:00+00" },

            ], 
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));


        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            // april = $600, may= $400 avg= $500
            expect(screen.getByText("$500.00")).toBeInTheDocument();
            expect(screen.getByText("2 / 12")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("10. handles null payments gracefully", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        // no payment for april
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { amount: null, paid_at: "2026-04-26T09:00:00+00" },
                { amount: 400, paid_at: "2026-05-26T09:00:00+00" },

            ], 
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));


        await act(async() => {
            render (<YTDBarChart /> );
        });


        await waitFor(() => {
            // only $400 counted, null is treated as a 0
            expect(screen.getByText("$400.00")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("11. skips payments with no paid_at timestamp", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        // no timestamp for second data (May)
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { amount: 600, paid_at: "2026-04-26T09:00:00+00" },
                { amount: 400, paid_at: null },

            ], 
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));

        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            // only $600 counted, null paid_at row is skipped. should only count the one month
            expect(screen.getByText("$600.00")).toBeInTheDocument();
            expect(screen.getByText("1 / 12")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("12. displays footer legend labels", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));

        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByText("Current")).toBeInTheDocument();
            expect(screen.getByText("Past")).toBeInTheDocument();
            expect(screen.getByText("Projected")).toBeInTheDocument();
            expect(screen.getByText("No data")).toBeInTheDocument();
            expect(screen.getByText("Highest Month")).toBeInTheDocument();
            expect(screen.getByText("Months tracked")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("13. calculates projected revenue from confirmed sessions that are completed/paid in full yet", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { start_at: "2026-04-26T09:00:00+00", Invoice: { remaining: 600 } },
                { start_at: "2026-05-26T09:00:00+00", Invoice: { remaining: 400 } },

            ], 
            error: null,
        }));
        

        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
        });
        // the recharts mock receives data as a prop so grab it from the mock
        const chartCall = mockBarChart.mock.calls[mockBarChart.mock.calls.length - 1][0];
        const aprData = chartCall.data.find((d) => d.month === "Apr");
        const mayData = chartCall.data.find((d) => d.month === "May");
        expect(aprData.projected).toBe(600); 
        expect(mayData.projected).toBe(400); 

        console.error.mockRestore();
    });

    test("14. skips sessions with no start_at", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { start_at: null, Invoice: { remaining: 600 } },
                { start_at: "2026-05-26T09:00:00+00", Invoice: { remaining: 400 } },

            ], 
            error: null,
        }));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });

        await waitFor(() => {
            expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
        });
        // the recharts mock receives data as a prop so grab it from the mock
         const chartCall = mockBarChart.mock.calls[mockBarChart.mock.calls.length - 1][0];
         const mayData = chartCall.data.find((d) => d.month === "May");
         expect(mayData.projected).toBe(400); 

        console.error.mockRestore();
    });

    test("15. CustomToolTip renders paid, projected, and total values", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { amount: 1000, paid_at: "2026-04-26T09:00:00+00" }
            ], 
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { start_at: "2026-04-26T09:00:00+00", Invoice: { remaining: 500 } },
            ], 
            error: null,
        }));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        // get the customtool tip componet from mockToolTip content prop
        expect(mockToolTip.Component).toBeTruthy();
        const ToolTip = mockToolTip.Component;

        const { container: tipContainer } = render(
            <ToolTip active={true}
            label = "Apr"
            payload = {[
                { dataKey: "actual", value: 1000 },
                { dataKey: "projected", value: 500 },
            ]}
            />
        );

        expect(tipContainer.textContent).toContain("April");
        expect(tipContainer.textContent).toContain("$1,000.00");
        expect(tipContainer.textContent).toContain("$500.00");
        expect(tipContainer.textContent).toContain("$1,500.00");

        console.error.mockRestore();
    });

    test("16. CustomToolTip returns null when inactive", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        // get the customtool tip componet from mockToolTip content prop
        expect(mockToolTip.Component).toBeTruthy();
        const ToolTip = mockToolTip.Component;

        // inactive and empty payload
        const { container: cont1 } = render(
            <ToolTip active={false} label = "Jan" payload = {[]} />
        );
        expect(cont1.innerHTML).toBe("");
        
        // active but null payload
        const { container: cont2 } = render(
            <ToolTip active={true} label = "Jan" payload = {null} />
        );
        expect(cont2.innerHTML).toBe("");

        // zero values
        const { container: cont3 } = render(
            <ToolTip active={true} label = "Jan" 
            payload = {[
                { dataKey: "actual", value: 0 },
                { dataKey: "projected", value: 0 },
            ]} />
        );
        expect(cont3.innerHTML).toBe("");

        console.error.mockRestore();
    });

    test("17. CustomToolTip renders only paid when there is no projected", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        // get the customtool tip componet from mockToolTip content prop
        expect(mockToolTip.Component).toBeTruthy();
        const ToolTip = mockToolTip.Component;

       
        const { container } = render(
            <ToolTip active={true} 
            label = "Mar" 
            payload = {[
                { dataKey: "actual", value: 750 },
                { dataKey: "projected", value: 0 },
            ]} />
        );
        expect(container.textContent).toContain("$750.00");
        expect(container.textContent).not.toContain("Projected");

        console.error.mockRestore();
    });

    test("18. ActualBar and ProjectedBar shape functions render correctly", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({
            data: [{ amount: 500, paid_at: "2026-04-22T09:00:00+00" }], 
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [{ start_at: "2026-04-26T09:00:00+00", Invoice: { remaining: 300 } }], 
            error: null,
        }));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        // invoke mock shaoe functions 
        // get shape functions from the Bar mock calls
        // mockBar is called with props inclduing dataKey and shape

        const actualCall = mockBar.mock.calls.find((call) => call[0].dataKey === "actual");
        const projectedCall = mockBar.mock.calls.find((call) => call[0].dataKey === "projected");

        expect(actualCall).toBeTruthy();
        expect(projectedCall).toBeTruthy();
        
        const actualShapeFn = actualCall[0].shape;
        const projectedShapeFn = projectedCall[0].shape;

        // 1. ActualBar with height > 0 for PAST month
        const { container: cont1 } = render(actualShapeFn({
            x: 10, y: 20, width: 18, height: 50, index: 0 
        }));
        expect(cont1.querySelector("path")).toBeTruthy();

        // 2. ActualBar with height > 0 for CURRENT month
        const currentMonth = new Date().getMonth();
        const { container: cont2 } = render(actualShapeFn({
            x: 10, y: 20, width: 18, height: 50, index: currentMonth 
        }));
        expect(cont2.querySelector("path")).toBeTruthy();

        // 3. ActualBar with height > 0 for FUTURE month
        const { container: cont3 } = render(actualShapeFn({
            x: 10, y: 20, width: 18, height: 50, index: 11 
        }));
        expect(cont3.querySelector("path")).toBeTruthy();

        // 4. ActualBar with zero height returns null
        const { container: cont4 } = render(
        <div>
            {actualShapeFn({
            x: 10, y: 20, width: 18, height: 0, index: 0 
        })}
        </div>
        );
        expect(cont4.querySelector("path")).toBeNull();

        // 5. ProjectedBar with height > 0 
        const { container: cont5 } = render(projectedShapeFn({
            x: 10, y: 20, width: 18, height: 40, index: 5 
        }));
        expect(cont5.querySelector("path")).toBeTruthy();

         // 6. ProjectedBar with zero height for FUTURE month
        const { container: cont6 } = render(projectedShapeFn({
            x: 10, y: 20, width: 18, height: 0, index: currentMonth + 2 
        }));
        expect(cont6.querySelector("rect")).toBeTruthy();

        // 7. ProjectedBar with zero height for PAST month (returns null)
        const { container: cont7 } = render(
        <div>
            {projectedShapeFn({
            x: 10, y: 20, width: 18, height: 0, index: 0 
        })}
        </div>
        );
        expect(cont7.querySelector("path")).toBeNull();
        expect(cont7.querySelector("rect")).toBeNull();

        console.error.mockRestore();
    });

    test("19. CustomXTick hightlights current month", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        // get the tick componet from mockXAxistick content prop
        expect(mockXAxistick.renderer).toBeTruthy();
        const tickFn = mockXAxistick.renderer;

        // render current month tick
        const currentMonth = new Date().getMonth();
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
       
        const { container: cont1 } = render(
        <svg>{tickFn({ x: 50, y: 100, payload: { value: monthNames[currentMonth] } })}</svg>
        );
        
        const currentText = cont1.querySelector("text");
        expect(currentText.getAttribute("font-weight")).toBe("700");
        expect(currentText.getAttribute("fill")).toBe("#d97706");

        // render non-current month tick
        const otherMonth = (currentMonth + 3) % 12;
        const { container: cont2 } = render(
        <svg>{tickFn({ x: 50, y: 100, payload: { value: monthNames[otherMonth] } })}</svg>
        ); 

        const otherText = cont2.querySelector("text");
        expect(otherText.getAttribute("font-weight")).toBe("400");
        expect(otherText.getAttribute("fill")).toBe("#9ca3af");

        console.error.mockRestore();
    });

    test("20. skips sessions with zero or negative remaining balance", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}))
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { start_at: "2026-04-10T09:00:00+00", Invoice: { remaining: 0 } },
                { start_at: "2026-04-15T09:00:00+00", Invoice: { remaining: -50 } },
                { start_at: "2026-04-20T09:00:00+00", Invoice: null },
                { start_at: "2026-05-10T09:00:00+00", Invoice: { remaining: 300 } },
            ],
            error: null,
        }));
        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        // get the tick componet from mockXAxistick content prop
        expect(mockXAxistick.renderer).toBeTruthy();
        const chartCall = mockBarChart.mock.calls[mockBarChart.mock.calls.length -1][0];
        const aprData = chartCall.data.find((d) => d.month === "Apr");
        const mayData = chartCall.data.find((d) => d.month === "May");

        expect(aprData.projected).toBe(0);
        expect(mayData.projected).toBe(300);

        console.error.mockRestore();
    });

    test("21. highest month display correctly in footer", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        
        // start_at is null for the first session
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({
            data: [
                { amount: 300, paid_at: "2026-01-15T09:00:00+00" },
                { amount: 1000, paid_at: "2026-03-15T09:00:00+00" },
                { amount: 1000.50, paid_at: "2026-04-15T09:00:00+00" },
            ],
            error: null,
        }))
        .mockReturnValueOnce(mockQueryBuilder({data: [], error: null,}));

        
        await act(async() => {
            render (<YTDBarChart /> );
        });
        
        await waitFor(() => {
            expect(screen.getByText("Apr - $1,000.50")).toBeInTheDocument();
        })

        console.error.mockRestore();
    });
});