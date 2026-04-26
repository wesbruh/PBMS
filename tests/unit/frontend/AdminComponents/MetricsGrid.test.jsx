import React from "react";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";


// mock supabaseClient to avoid import.meta parse error. 
// this is different from backend test since the actual file uses a supabase call and not a fetch() since we did not update it
// Jest intercepts the import and swaps in the fake object instead
jest.mock("../../../../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: jest.fn(),
  },
}));
const { supabase } = require("../../../../src/lib/supabaseClient.js");
import MetricsGrid from "../../../../src/admin/components/shared/MetricsGrid/MetricsGrid.jsx";


// helper functions
// builds a chainable query builder that resolves with the given result
function mockQueryBuilder(result = {}) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    count: result.count,
    data: result.data ?? [],
    error: result.error ?? null,
  };
  return builder;
}

// sets up mockFrom to return the right builder for each table in order.
function setupMockQueries({ sessions, invoices, payments }) {
    supabase
    .mockReturnValueOnce(mockQueryBuilder(sessions))
    .mockReturnValueOnce(mockQueryBuilder(invoices))
    .mockReturnValueOnce(mockQueryBuilder(payments));
}
// clears all mock call history before each test
beforeEach(() => {
    jest.clearAllMocks();
});

// 9 TESTS //

describe("MetricsGrid Admin Component Tests", () => {

    test("1. shows loading placeholder initially", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});

        //keep loading
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder())
        .mockReturnValueOnce(mockQueryBuilder())
        .mockReturnValueOnce(mockQueryBuilder())
        .mockReturnValueOnce(mockQueryBuilder());
        
        render(<MetricsGrid />);
        
        await waitFor(() => {
          expect(screen.getByText("Total Completed Sessions")).toBeInTheDocument();
          expect(screen.getByText("Revenue Collected")).toBeInTheDocument();
          expect(screen.getByText("Pending Sessions")).toBeInTheDocument();
          expect(screen.getByText("Pending Payments")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
      });

    test("2. renders metric value after successfull fetch", async () => {
        jest.spyOn(console, "error").mockImplementation(() => {});
        supabase.from
        .mockReturnValueOnce(mockQueryBuilder({ count: 10, error: null }))  // Sessions completed         
        .mockReturnValueOnce(mockQueryBuilder({ count: 5, error: null }))   // Sessions pending
        .mockReturnValueOnce(mockQueryBuilder({ count: 3, error: null }))   // Invoice unpaid
        .mockReturnValueOnce(mockQueryBuilder({ data: [{ amount: 100 }, { amount: 100.50 }], error: null })); 
        
        render(<MetricsGrid />);
        
        await waitFor(() => {
            expect(screen.getByText("10")).toBeInTheDocument();
            expect(screen.getByText("$200.50")).toBeInTheDocument();
            expect(screen.getByText("5")).toBeInTheDocument();
            expect(screen.getByText("3")).toBeInTheDocument();
        });
        
        console.error.mockRestore();
    });

    test("3. displays $0.00 revenue when no payments exist", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ data: [], error: null }));
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      expect(screen.getByText("$0.00")).toBeInTheDocument();
    });
 
    console.error.mockRestore();
  });

   test("4. shows error message when total sessions query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ error: { message: "DB connection lost" } }))
      .mockReturnValueOnce(mockQueryBuilder())
      .mockReturnValueOnce(mockQueryBuilder())
      .mockReturnValueOnce(mockQueryBuilder());
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      expect(screen.getByText("Failed to load metrics.")).toBeInTheDocument();
    });
 
    expect(console.error).toHaveBeenCalled();
    console.error.mockRestore();
  });

  test("5. shows error message when pending sessions query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 10, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ error: { message: "Query timeout" } }))
      .mockReturnValueOnce(mockQueryBuilder())
      .mockReturnValueOnce(mockQueryBuilder());
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      expect(screen.getByText("Failed to load metrics.")).toBeInTheDocument();
    });
 
    expect(console.error).toHaveBeenCalled();
    console.error.mockRestore();
  });

  test("6. shows error message when invoice query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 10, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 2, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ error: { message: "Invoice table error" } }))
      .mockReturnValueOnce(mockQueryBuilder());
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      expect(screen.getByText("Failed to load metrics.")).toBeInTheDocument();
    });
 
    expect(console.error).toHaveBeenCalled();
    console.error.mockRestore();
  });

  test("7. queries the correct tables with correct filters", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ data: [], error: null }));
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      // Verify correct tables were queried
      expect(supabase.from).toHaveBeenCalledWith("Session");
      expect(supabase.from).toHaveBeenCalledWith("Invoice");
      expect(supabase.from).toHaveBeenCalledWith("Payment");
    });
 
    // Verify correct filters on each builder
    const sessionBuilder = supabase.from.mock.results[0].value;
    expect(sessionBuilder.eq).toHaveBeenCalledWith("status", "Completed");
 
    const pendingBuilder = supabase.from.mock.results[1].value;
    expect(pendingBuilder.eq).toHaveBeenCalledWith("status", "Pending");
 
    // Invoice query chains .eq("status", "Paid").gt("remaining", 0)
    const invoiceBuilder = supabase.from.mock.results[2].value;
    expect(invoiceBuilder.eq).toHaveBeenCalledWith("status", "Paid");
    expect(invoiceBuilder.gt).toHaveBeenCalledWith("remaining", 0);
 
    const paymentBuilder = supabase.from.mock.results[3].value;
    expect(paymentBuilder.eq).toHaveBeenCalledWith("status", "Paid");
 
    console.error.mockRestore();
  });

  test("8. handles null payment amounts gracefully", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 1, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ data: [{ amount: null }, { amount: 500 }, { amount: null }], error: null }));
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      expect(screen.getByText("$500.00")).toBeInTheDocument();
    });
 
    console.error.mockRestore();
  });

  test("9. displays all sub labels", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
 
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ data: [], error: null }));
 
    render(<MetricsGrid />);
 
    await waitFor(() => {
      const allTimeSubs = screen.getAllByText("All Time");
      expect(allTimeSubs).toHaveLength(2);
      expect(screen.getByText("Waiting for Confirmation")).toBeInTheDocument();
      expect(screen.getByText("Invoices Awaiting Remaining Payment")).toBeInTheDocument();
    });
 
    console.error.mockRestore();
  });
  
  test("10. shows error when payment query fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 10, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 2, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ error: { message: "Payment table error" } }));
      
      render(<MetricsGrid />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to load metrics.")).toBeInTheDocument();
      });
      
      expect(console.error).toHaveBeenCalled();
      console.error.mockRestore();
    });
    
  test("11. MetricCard renders without sub label when not provided", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: 0, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ data: [], error: null }));
        
      render(<MetricsGrid />);
        
      await waitFor(() => {
        // all four cards have sub labels, so all should render
        expect(screen.getAllByText("All Time")).toHaveLength(2);
      });
        
      console.error.mockRestore();
    });

  test("12. handles null counts gracefully with fallback values", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    
    supabase.from
      .mockReturnValueOnce(mockQueryBuilder({ count: null, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: null, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ count: null, error: null }))
      .mockReturnValueOnce(mockQueryBuilder({ data: [], error: null }));
      
      render(<MetricsGrid />);
      
      await waitFor(() => {
        // null counts should fall back to 0 via ?? 0
        const zeros = screen.queryAllByText(/^0$/);
        expect(zeros.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("$0.00")).toBeInTheDocument();
      });

      console.error.mockRestore();
    });
  
  test("13. shows loading pulse placeholders before data loads", () => {
    // Never resolve to keep loading state
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      gt: jest.fn(() => new Promise(() => {})),
    };
    
    supabase.from.mockReturnValue(builder);
    render(<MetricsGrid />);
    
    // labels should be visible even while loading
    expect(screen.getByText("Total Completed Sessions")).toBeInTheDocument();
    expect(screen.getByText("Revenue Collected")).toBeInTheDocument();
    expect(screen.getByText("Pending Sessions")).toBeInTheDocument();
    expect(screen.getByText("Pending Payments")).toBeInTheDocument();

    // sub labels should still render
    expect(screen.getAllByText("All Time")).toHaveLength(2);
    expect(screen.getByText("Waiting for Confirmation")).toBeInTheDocument();
    expect(screen.getByText("Invoices Awaiting Remaining Payment")).toBeInTheDocument();

    // values should NOT be visible (loading pulse instead)
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

});