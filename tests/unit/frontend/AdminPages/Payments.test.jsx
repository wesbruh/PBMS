import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockUseAuth = jest.fn();
const mockTriggerAdminToast = jest.fn();

jest.mock("../../../../src/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../src/components/AdminNotificationToast.jsx", () => ({
  triggerAdminToast: () => mockTriggerAdminToast(),
}));

jest.mock("../../../../src/admin/components/shared/Sidebar/Sidebar.jsx", () => () => (
  <aside data-testid="sidebar" />
));

jest.mock("../../../../src/admin/components/shared/Frame/Frame.jsx", () => ({ children }) => (
  <div data-testid="frame">{children}</div>
));

jest.mock("../../../../src/admin/components/shared/PaymentDetailsModal.jsx", () => ({
  __esModule: true,
  default: ({ invoiceId, onClose }) => (
    <div data-testid="payment-details">
      <span>{invoiceId}</span>
      <button onClick={onClose}>Close Details</button>
    </div>
  ),
}));

jest.mock("../../../../src/admin/pages/Payments/SubtractBalanceModal.jsx", () => ({
  __esModule: true,
  default: ({ isOpen, currentBalance, onConfirm, onRefresh, onClose }) => (
    <div data-testid="subtract-modal">
      <span>Open:{String(isOpen)}</span>
      <span>Balance:{currentBalance}</span>
      <button onClick={() => onConfirm(8, "Cash")}>Confirm Reduction</button>
      <button onClick={onRefresh}>Refresh Now</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

jest.mock("../../../../src/admin/components/shared/Table/Table.jsx", () => ({
  __esModule: true,
  default: ({ columns, data, tabFilter }) => (
    <div data-testid="payments-table">
      <div data-testid="overdue-filter">
        {String(data[0] ? tabFilter.tabFilterFn(data[0], "Overdue") : false)}
      </div>
      <div data-testid="all-filter">
        {String(data[0] ? tabFilter.tabFilterFn(data[0], "All") : false)}
      </div>
      <div data-testid="pending-filter">
        {String(data[3] ? tabFilter.tabFilterFn(data[3], "Pending") : false)}
      </div>
      <div data-testid="overdue-filter-false">
        {String(data[1] ? tabFilter.tabFilterFn(data[1], "Overdue") : false)}
      </div>
      {data.map((row) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {columns.map((column) => (
            <div key={column.key}>
              {column.render ? column.render(row[column.key], row) : String(row[column.key])}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import AdminPayments from "../../../../src/admin/pages/Payments/Payments.jsx";

describe("AdminPayments", () => {
  const originalAlert = window.alert;
  const originalCreateElement = document.createElement.bind(document);
  let fetchSpy;
  let originalFetch;

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      session: { access_token: "token-123" },
    });
    window.alert = jest.fn();
    originalFetch = global.fetch;
    fetchSpy = jest.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    window.alert = originalAlert;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("loads invoices, renders action/status cells, downloads PDFs, manages balances, refreshes data, and opens details", async () => {
    const clickSpy = jest.fn();
    jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        const anchor = originalCreateElement(tagName);
        anchor.click = clickSpy;
        anchor.remove = jest.fn();
        return anchor;
      }

      return originalCreateElement(tagName);
    });

    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "invoice-1",
            invoice_number: "INV-1",
            issue_date: "2026-04-01",
            due_date: "2026-04-01",
            remaining: 25,
            status: "Pending",
          },
          {
            id: "invoice-2",
            invoice_number: "INV-2",
            issue_date: "2026-04-02",
            due_date: "2026-04-25",
            remaining: 0,
            status: "Paid",
          },
          {
            id: "invoice-3",
            invoice_number: "INV-3",
            issue_date: "2026-04-03",
            due_date: "2026-04-25",
            remaining: 10,
            status: "Cancelled",
          },
          {
            id: "invoice-4",
            invoice_number: "INV-4",
            issue_date: "2026-04-04",
            due_date: "2026-05-01",
            remaining: 5,
            status: "Pending",
          },
          {
            id: "invoice-5",
            invoice_number: "INV-5",
            issue_date: "2026-04-05",
            due_date: null,
            remaining: 5,
            status: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "invoice-1", remaining: 25 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "invoice-1",
            invoice_number: "INV-1",
            issue_date: "2026-04-01",
            due_date: "2026-04-01",
            remaining: 17,
            status: "Pending",
          },
        ],
      });

    render(<AdminPayments />);

    await screen.findByTestId("payments-table");
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(screen.getAllByText("View").length).toBeGreaterThan(0);
    expect(screen.getByText("25.00")).toBeInTheDocument();
    expect(screen.getByTestId("overdue-filter")).toHaveTextContent("true");
    expect(screen.getByTestId("overdue-filter-false")).toHaveTextContent("false");
    expect(screen.getByTestId("all-filter")).toHaveTextContent("true");
    expect(screen.getByTestId("pending-filter")).toHaveTextContent("true");

    fireEvent.click(screen.getAllByRole("button", { name: /download invoice/i })[0]);
    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByText("View")[0]);
    expect(screen.getByTestId("payment-details")).toHaveTextContent("invoice-1");
    fireEvent.click(screen.getByText("Close Details"));

    fireEvent.click(screen.getAllByText("Manage")[0]);
    await waitFor(() => {
      expect(screen.getByTestId("subtract-modal")).toHaveTextContent("Open:true");
      expect(screen.getByTestId("subtract-modal")).toHaveTextContent("Balance:25");
    });
    fireEvent.click(screen.getByText("Close Modal"));

    fireEvent.click(screen.getByText("Confirm Reduction"));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Balance updated successfully");
    });
    await waitFor(() => {
      expect(screen.getByText("17.00")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/invoice/getInvoiceTableData"),
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/invoice/invoice-1/pdf"),
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/invoice/getInvoiceByID?term=invoice-1"),
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/invoice/invoice-1/reduceRemainingInvoiceBalance"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("logs fetch failures for loading, downloads, manual payments, and missing selections", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    fetchSpy.mockRejectedValueOnce(new Error("load failed"));

    render(<AdminPayments />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Fetch error:", expect.any(Error));
    });
    expect(screen.getByText("Confirm Reduction")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Confirm Reduction"));
    expect(errorSpy).toHaveBeenCalledWith("No invoice selected");

    cleanup();
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "invoice-5",
          invoice_number: "INV-5",
          issue_date: "2026-04-05",
          due_date: "2026-04-30",
          remaining: 15,
          status: "Pending",
        },
      ],
    });

    render(<AdminPayments />);
    await screen.findByTestId("payments-table");

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      blob: async () => new Blob(["pdf"]),
    });
    fireEvent.click(screen.getAllByRole("button", { name: /download invoice/i })[0]);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Download failed:", expect.any(Error));
    });

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "broken" }),
    });
    fireEvent.click(screen.getAllByText("Manage")[0]);
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Updating balance failed:", expect.any(Error));
    });

    fetchSpy.mockRejectedValueOnce(new Error("refresh failed"));
    fireEvent.click(screen.getByText("Refresh Now"));
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Refresh error:", expect.any(Error));
    });
  });

  test("logs an initial non-ok invoice response", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ([]),
    });

    render(<AdminPayments />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Fetch error:", expect.any(Error));
    });
  });

  test("does not fetch invoices without a session", async () => {
    mockUseAuth.mockReturnValue({ session: null });

    render(<AdminPayments />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/loading payments/i)).toBeInTheDocument();
  });

  test("logs balance update failures after a successful invoice lookup", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "invoice-10",
            invoice_number: "INV-10",
            issue_date: "2026-04-10",
            due_date: "2026-04-15",
            remaining: 20,
            status: "Pending",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "invoice-10", remaining: 20 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "cannot reduce" }),
      })
      .mockRejectedValueOnce(new Error("post exploded"));

    render(<AdminPayments />);
    await screen.findByTestId("payments-table");

    fireEvent.click(screen.getByText("Manage"));
    await waitFor(() => {
      expect(screen.getByTestId("subtract-modal")).toHaveTextContent("Open:true");
    });

    fireEvent.click(screen.getByText("Confirm Reduction"));
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Update failed:", { error: "cannot reduce" });
    });

    fireEvent.click(screen.getByText("Confirm Reduction"));
    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Update failed", expect.any(Error));
    });
  });
});
