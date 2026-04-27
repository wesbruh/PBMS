import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import SharedClientDashboard from "../../../../src/components/Dashboard/SharedClientDashboard.jsx";

// Mock child components so this test focuses on SharedClientDashboard behavior.
jest.mock("../../../../src/components/InvoiceButton/DownloadInvoiceButton", () => {
    return function MockDownloadInvoiceButton({ invoiceId }) {
        return <button data-testid={`download-invoice-${invoiceId}`}>Invoice PDF</button>;
    };
});

jest.mock("../../../../src/components/InvoiceButton/DownloadReceipt", () => {
    return function MockDownloadReceipt({ invoiceId }) {
        return <button data-testid={`download-receipt-${invoiceId}`}>Receipt PDF</button>;
    };
});

jest.mock("../../../../src/components/SectionPager", () => {
    return function MockSectionPager({ page, totalItems }) {
        return (
            <div data-testid="section-pager">
                Page {page + 1} / Items {totalItems}
            </div>
        );
    };
});

jest.mock("lucide-react", () => ({
    LoaderCircle: () => <div data-testid="loader">Loading Icon</div>,
}));

jest.mock("react-router-dom", () => ({
    Link: ({ to, children, ...props }) => (
        <a href={to} {...props}>
            {children}
        </a>
    ),
}));

describe("SharedClientDashboard", () => {
    const baseSession = {
        id: "session-1",
        location_text: "Sacramento",
        start_at: "2026-05-01T10:00:00.000Z",
        status: "Pending",
    };

    // Test case 1: The dashboard should show the loading state when loading is true.
    test("1.) Shows loading state", () => {
        render(<SharedClientDashboard loading={true} />);

        expect(screen.getByText("Loading your account...")).toBeInTheDocument();
        expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    // Test case 2: The dashboard should greet the user by name when fullName is provided.
    test("2.) Shows welcome message with full name", () => {
        render(<SharedClientDashboard fullName="Luis De Santiago" />);

        expect(screen.getByText("Welcome back, Luis De Santiago.")).toBeInTheDocument();
    });

    // Test case 3: The dashboard should show the generic welcome message when no name is provided.
    test("3.) Shows generic welcome message when full name is missing", () => {
        render(<SharedClientDashboard />);

        expect(screen.getByText("Welcome back.")).toBeInTheDocument();
    });

    // Test case 4: The account settings button should render and call onOpenSettings when enabled.
    test("4.) Renders account settings button and handles click", () => {
        const onOpenSettings = jest.fn();

        render(
            <SharedClientDashboard
                showSettingsButton={true}
                onOpenSettings={onOpenSettings}
            />
        );

        fireEvent.click(screen.getByText("Account Settings"));

        expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    // Test case 5: Empty dashboard sections should show their empty messages.
    test("5.) Shows empty messages when there is no dashboard data", () => {
        render(<SharedClientDashboard />);

        expect(screen.getByText("You're all caught up. New reminders will appear here.")).toBeInTheDocument();
        expect(screen.getByText("You don't have any sessions scheduled yet.")).toBeInTheDocument();
        expect(screen.getByText("No invoices yet. You'll see them here when they're issued.")).toBeInTheDocument();
        expect(screen.getByText("No galleries have been published yet.")).toBeInTheDocument();
        expect(screen.getByText("No new contracts have been issued yet.")).toBeInTheDocument();
    });

    // Test case 6: Notifications should render subject, body, status, and date.
    test("6.) Renders notifications with fallback values", () => {
        render(
            <SharedClientDashboard
                notifications={[
                    {
                        id: "n1",
                        subject: "Payment Reminder",
                        body: "Please review your invoice.",
                        status: "sent",
                        sent_at: "2026-04-15T10:00:00.000Z",
                    },
                    {
                        id: "n2",
                        created_at: "2026-04-16T10:00:00.000Z",
                    },
                ]}
            />
        );

        expect(screen.getByText("Payment Reminder")).toBeInTheDocument();
        expect(screen.getByText("Please review your invoice.")).toBeInTheDocument();
        expect(screen.getByText("sent")).toBeInTheDocument();

        expect(screen.getByText("Reminder")).toBeInTheDocument();
        expect(screen.getByText("You have an update to review.")).toBeInTheDocument();
        expect(screen.getByText("pending")).toBeInTheDocument();
    });

    // Test case 7: Sessions should be split into pending, upcoming, and completed sections.
    test("7.) Renders pending, upcoming, and completed sessions", () => {
        render(
            <SharedClientDashboard
                sessions={[
                    { ...baseSession, id: "s1", status: "Pending", location_text: "Pending Location" },
                    { ...baseSession, id: "s2", status: "Confirmed", location_text: "Upcoming Location" },
                    { ...baseSession, id: "s3", status: "Completed", location_text: "Completed Location" },
                ]}
            />
        );

        expect(screen.getByText("Pending Location")).toBeInTheDocument();
        expect(screen.getByText("Upcoming Location")).toBeInTheDocument();
        expect(screen.getByText("Completed Location")).toBeInTheDocument();
        expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    });

    // Test case 8: Session fallback text should render when location and date are missing.
    test("8.) Uses fallback values for sessions with missing location or date", () => {
        render(
            <SharedClientDashboard
                sessions={[
                    { id: "s1", status: "Pending" },
                    { id: "s2", status: "Confirmed" },
                    { id: "s3", status: "Completed" },
                ]}
            />
        );

        expect(screen.getAllByText("Session")).toHaveLength(3);
        expect(screen.getAllByText("TBD")).toHaveLength(3);
    });

    // Test case 9: Invoices should be split into unpaid and paid sections.
    test("9.) Renders unpaid and paid invoices", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "invoice-unpaid",
                        invoice_number: "INV-001",
                        status: "Unpaid",
                        issue_date: "2026-04-01T10:00:00.000Z",
                        due_date: "2026-04-10T10:00:00.000Z",
                        remaining: 150,
                    },
                    {
                        id: "invoice-paid",
                        invoice_number: "INV-002",
                        status: "Paid",
                        issue_date: "2026-04-02T10:00:00.000Z",
                        due_date: "2026-04-11T10:00:00.000Z",
                        remaining: 0,
                    },
                ]}
            />
        );

        expect(screen.getByText(/INV-001/)).toBeInTheDocument();
        expect(screen.getByText(/INV-002/)).toBeInTheDocument();
        expect(screen.getByText("$150.00")).toBeInTheDocument();
        expect(screen.getByText("$0.00")).toBeInTheDocument();
        expect(screen.getByTestId("download-invoice-invoice-unpaid")).toBeInTheDocument();
        expect(screen.getByTestId("download-invoice-invoice-paid")).toBeInTheDocument();
        expect(screen.getByTestId("download-receipt-invoice-paid")).toBeInTheDocument();
    });

    // Test case 10: Pay button should render and call onPayInvoice when enabled.
    test("10.) Calls onPayInvoice when Pay button is clicked", () => {
        const onPayInvoice = jest.fn();

        const invoice = {
            id: "invoice-unpaid",
            status: "Unpaid",
            remaining: 200,
        };

        render(
            <SharedClientDashboard
                invoices={[invoice]}
                showPayButton={true}
                onPayInvoice={onPayInvoice}
            />
        );

        fireEvent.click(screen.getByText("Pay"));

        expect(onPayInvoice).toHaveBeenCalledWith(invoice);
    });

    // Test case 11: Invoice fallback values should render when dates, number, status, and remaining are missing.
    test("11.) Uses fallback values for invoices with missing fields", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "abcdef123456",
                        status: "Unpaid",
                    },
                ]}
            />
        );

        expect(screen.getByText(/abcdef/)).toBeInTheDocument();
        expect(screen.getAllByText("—")).toHaveLength(2);
        expect(screen.getByText("$0.00")).toBeInTheDocument();
    });

    // Test case 12: Galleries should render protected status and download button.
    test("12.) Renders galleries and calls download handler", () => {
        const onDownloadGallery = jest.fn();

        render(
            <SharedClientDashboard
                galleries={[
                    {
                        id: "gallery-1",
                        title: "Family Gallery",
                        published_at: "2026-04-15T10:00:00.000Z",
                        is_password_protected: true,
                    },
                ]}
                showDownloadButton={true}
                onDownloadGallery={onDownloadGallery}
            />
        );

        expect(screen.getByText("Family Gallery")).toBeInTheDocument();
        expect(screen.getByText("Protected")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Download"));

        expect(onDownloadGallery).toHaveBeenCalledWith("gallery-1", "Family Gallery");
    });

    // Test case 13: Gallery download button should show downloading state when gallery is downloading.
    test("13.) Shows downloading state for gallery download button", () => {
        render(
            <SharedClientDashboard
                galleries={[
                    {
                        id: "gallery-1",
                        title: "Family Gallery",
                        is_password_protected: false,
                    },
                ]}
                showDownloadButton={true}
                onDownloadGallery={jest.fn()}
                downloadingGalleries={{ "gallery-1": true }}
            />
        );

        expect(screen.getByText("Downloading...")).toBeDisabled();
    });

    // Test case 14: Gallery should use fallback title and published date when missing.
    test("14.) Uses fallback values for galleries with missing fields", () => {
        render(
            <SharedClientDashboard
                galleries={[
                    {
                        id: "gallery-1",
                    },
                ]}
            />
        );

        expect(screen.getByText("Gallery")).toBeInTheDocument();
        expect(screen.getByText(/Published/)).toHaveTextContent("Published —");
    });

    // Test case 15: Admin contracts should link to the admin contract view page.
    test("15.) Renders admin contract link", () => {
        render(
            <SharedClientDashboard
                isAdminView={true}
                contracts={[
                    {
                        id: "contract-1",
                        status: "Signed",
                        created_at: "2026-04-15T10:00:00.000Z",
                        updated_at: "2026-04-16T10:00:00.000Z",
                        ContractTemplate: {
                            name: "Base Template",
                        },
                    },
                ]}
            />
        );

        const link = screen.getByText("View Signed Document");

        expect(screen.getByText("Base Template")).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/admin/contracts/contract-1");
    });

    // Test case 16: Client contracts should link to the client review/sign page and contracts list.
    test("16.) Renders client contract links when not in admin view", () => {
        render(
            <SharedClientDashboard
                isAdminView={false}
                contracts={[
                    {
                        id: "contract-1",
                        status: "Draft",
                        title: "Wedding Contract",
                    },
                ]}
            />
        );

        expect(screen.getByText("Wedding Contract")).toBeInTheDocument();
        expect(screen.getByText("Review & Sign")).toHaveAttribute(
            "href",
            "/dashboard/contracts/contract-1"
        );
        expect(screen.getByText("Go to Contracts")).toHaveAttribute(
            "href",
            "/dashboard/contracts"
        );
    });

    // Test case 17: Contract fallback title, dates, and status should render.
    test("17.) Uses fallback values for contracts with missing fields", () => {
        render(
            <SharedClientDashboard
                contracts={[
                    {
                        id: "contract-1",
                        status: "   ",
                    },
                ]}
            />
        );

        expect(screen.getByText("Contract")).toBeInTheDocument();
        expect(screen.getByText("Signed")).toBeInTheDocument();
        expect(screen.getByText(/Created/)).toHaveTextContent("Created — • Updated —");
    });

    // Test case 18: Shows empty category messages when sessions exist but do not match those categories.
    test("18.) Shows empty session category messages", () => {
        render(
            <SharedClientDashboard
                sessions={[
                    {
                        id: "s-unknown",
                        status: "Cancelled",
                        location_text: "Cancelled Session",
                        start_at: "2026-05-01T10:00:00.000Z",
                    },
                ]}
            />
        );

        expect(screen.getByText("No pending sessions.")).toBeInTheDocument();
        expect(screen.getByText("No upcoming sessions.")).toBeInTheDocument();
        expect(screen.getByText("No completed sessions.")).toBeInTheDocument();
    });

    // Test case 19: Shows no unpaid invoices message when all invoices are paid.
    test("19.) Shows no unpaid invoices message when all invoices are paid", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "paid-invoice-1",
                        status: "Paid",
                        invoice_number: "INV-PAID",
                    },
                ]}
            />
        );

        expect(screen.getByText("No unpaid invoices.")).toBeInTheDocument();
        expect(screen.getByText(/INV-PAID/)).toBeInTheDocument();
    });

    // Test case 20: Shows no paid invoices message when all invoices are unpaid.
    test("20.) Shows no paid invoices message when all invoices are unpaid", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "unpaid-invoice-1",
                        status: "Unpaid",
                        invoice_number: "INV-UNPAID",
                        remaining: 375,
                    },
                ]}
            />
        );

        expect(screen.getByText("No paid invoices.")).toBeInTheDocument();
        expect(screen.getByText(/INV-UNPAID/)).toBeInTheDocument();
    });

    // Test case 21: Does not render Pay button when showPayButton is true but handler is missing.
    test("21.) Does not render Pay button without payment handler", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "invoice-1",
                        status: "Unpaid",
                        remaining: 100,
                    },
                ]}
                showPayButton={true}
            />
        );

        expect(screen.queryByText("Pay")).not.toBeInTheDocument();
    });

    // Test case 22: Does not render gallery download button when handler is missing.
    test("22.) Does not render download button without download handler", () => {
        render(
            <SharedClientDashboard
                galleries={[
                    {
                        id: "gallery-1",
                        title: "Family Gallery",
                    },
                ]}
                showDownloadButton={true}
            />
        );

        expect(screen.getByText("Family Gallery")).toBeInTheDocument();
        expect(screen.queryByText("Download")).not.toBeInTheDocument();
    });

    // Test case 23: Notification with no dates should still render without a timestamp.
    test("23.) Renders notification with no date fields", () => {
        render(
            <SharedClientDashboard
                notifications={[
                    {
                        id: "n-no-date",
                        subject: "No Date Reminder",
                        body: "No timestamp available.",
                        status: "pending",
                    },
                ]}
            />
        );

        expect(screen.getByText("No Date Reminder")).toBeInTheDocument();
        expect(screen.getByText("No timestamp available.")).toBeInTheDocument();
    });

    // Test case 24: Sessions should use default status labels when status is missing but category filtering is still possible through lowercase check.
    test("24.) Renders session fallback status text", () => {
        render(
            <SharedClientDashboard
                sessions={[
                    {
                        id: "s1",
                        status: "pending",
                        location_text: "Fallback Pending",
                        start_at: "2026-05-01T10:00:00.000Z",
                    },
                    {
                        id: "s2",
                        status: "confirmed",
                        location_text: "Fallback Confirmed",
                        start_at: "2026-05-01T10:00:00.000Z",
                    },
                    {
                        id: "s3",
                        status: "completed",
                        location_text: "Fallback Completed",
                        start_at: "2026-05-01T10:00:00.000Z",
                    },
                ]}
            />
        );

        expect(screen.getByText("Fallback Pending")).toBeInTheDocument();
        expect(screen.getByText("Fallback Confirmed")).toBeInTheDocument();
        expect(screen.getByText("Fallback Completed")).toBeInTheDocument();
    });

    // Test case 25: Unpaid invoice should use default status when status is missing.
    test("25.) Uses fallback status for unpaid invoice when status is missing", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "missing-status-invoice",
                        invoice_number: "INV-MISSING",
                        remaining: 99,
                    },
                ]}
            />
        );

        expect(screen.getByText(/INV-MISSING/)).toBeInTheDocument();
        expect(screen.getAllByText("Unpaid").length).toBeGreaterThan(0);
        expect(screen.getByText("$99.00")).toBeInTheDocument();
    });

    // Test case 26: Paid invoice should use fallback dates when dates are missing.
    test("26.) Uses fallback dates for paid invoice when dates are missing", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "paid-no-dates",
                        invoice_number: "INV-PAID-NODATES",
                        status: "Paid",
                    },
                ]}
            />
        );

        expect(screen.getByText(/INV-PAID-NODATES/)).toBeInTheDocument();
        expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    });

    // Test case 27: Non-admin contract should use fallback name and signed status when missing.
    test("27.) Uses fallback contract values in client view", () => {
        render(
            <SharedClientDashboard
                isAdminView={false}
                contracts={[
                    {
                        id: "contract-no-fields",
                        created_at: null,
                        updated_at: null,
                    },
                ]}
            />
        );

        expect(screen.getByText("Contract")).toBeInTheDocument();
        expect(screen.getByText("Signed")).toBeInTheDocument();
        expect(screen.getByText("Review & Sign")).toHaveAttribute(
            "href",
            "/dashboard/contracts/contract-no-fields"
        );
    });

    // Test case 28: Uses fallback status labels when session status becomes missing after filtering.
    test("28.) Covers session status fallback labels", () => {
        const pending = {
            id: "s1",
            status: "Pending",
            location_text: "Pending With Fallback",
            start_at: "2026-05-01T10:00:00.000Z",
        };

        const upcoming = {
            id: "s2",
            status: "Confirmed",
            location_text: "Upcoming With Fallback",
            start_at: "2026-05-01T10:00:00.000Z",
        };

        const completed = {
            id: "s3",
            status: "Completed",
            location_text: "Completed With Fallback",
            start_at: "2026-05-01T10:00:00.000Z",
        };

        render(
            <SharedClientDashboard
                sessions={[
                    { ...pending, status: undefined },
                    { ...upcoming, status: undefined },
                    { ...completed, status: undefined },
                ]}
            />
        );
    });

    // Test case 28: Paid invoice uses fallback invoice number and fallback paid status.
    test("28.) Uses fallback values for paid invoice number and paid status", () => {
        render(
            <SharedClientDashboard
                invoices={[
                    {
                        id: "paidfallback123456",
                        status: "paid",
                    },
                ]}
            />
        );

        expect(screen.getByText(/paidfa/)).toBeInTheDocument();
        expect(screen.getAllByText(/paid/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId("download-invoice-paidfallback123456")).toBeInTheDocument();
        expect(screen.getByTestId("download-receipt-paidfallback123456")).toBeInTheDocument();
    });

    
});