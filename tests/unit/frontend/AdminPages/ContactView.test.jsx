import { jest } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "../../../../src/context/AuthContext.jsx";
const mockUseParams = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("react-router-dom", () => ({
    useParams: () => mockUseParams(),
}));

jest.mock("../../../../src/context/AuthContext.jsx", () => ({
    useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../src/lib/apiUrl.js", () => ({
    API_URL: "http://localhost:5001",
}));

jest.mock("../../../../src/admin/components/shared/Sidebar/Sidebar.jsx", () => {
    return function MockSidebar() {
        return <div data-testid="sidebar">Sidebar</div>;
    };
});

jest.mock("../../../../src/admin/components/shared/Frame/Frame.jsx", () => {
    return function MockFrame({ children }) {
        return <div data-testid="frame">{children}</div>;
    };
});

jest.mock("../../../../src/components/Dashboard/SharedClientDashboard", () => {
    return function MockSharedClientDashboard(props) {
        return (
            <div data-testid="shared-client-dashboard">
                <p data-testid="loading">{String(props.loading)}</p>
                <p data-testid="full-name">{props.fullName || ""}</p>
                <p data-testid="sessions-count">{props.sessions?.length ?? 0}</p>
                <p data-testid="invoices-count">{props.invoices?.length ?? 0}</p>
                <p data-testid="galleries-count">{props.galleries?.length ?? 0}</p>
                <p data-testid="contracts-count">{props.contracts?.length ?? 0}</p>
                <p data-testid="notifications-count">{props.notifications?.length ?? 0}</p>
                <p data-testid="admin-view">{String(props.isAdminView)}</p>
                <p data-testid="pay-button">{String(props.showPayButton)}</p>
                <p data-testid="download-button">{String(props.showDownloadButton)}</p>
            </div>
        );
    };
});

const mockSupabaseFrom = jest.fn();

jest.mock("../../../../src/lib/supabaseClient.js", () => ({
    supabase: {
        from: (table) => mockSupabaseFrom(table),
    },
}));

import ContactView, { handleUpdate, cancelSession, } from "../../../../src/admin/pages/Contacts/ContactView.jsx";

function createTableMock(results) {
    return (table) => {
        const result = results[table] || { data: [], error: null };

        const builder = {
            select: jest.fn(() => builder),
            eq: jest.fn(() => builder),
            in: jest.fn(() => builder),
            order: jest.fn(() => {
                if (table === "Notification") {
                    return {
                        limit: jest.fn(() => Promise.resolve(result)),
                    };
                }

                return Promise.resolve(result);
            }),
            limit: jest.fn(() => Promise.resolve(result)),
        };

        return builder;
    };
}

describe("ContactView", () => {
    const originalFetch = global.fetch;
    const originalConsoleError = console.error;

    const mockSession = {
        access_token: "mock-token",
    };

    beforeEach(() => {
        global.fetch = jest.fn();
        console.error = jest.fn();

        mockUseParams.mockReturnValue({ id: "user-1" });
        mockUseAuth.mockReturnValue({ session: mockSession });
        mockSupabaseFrom.mockReset();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        global.fetch = originalFetch;
        console.error = originalConsoleError;
    });

    // Test case 1: The component should show the shared dashboard loading state first.
    test("1.) Shows loading dashboard before data finishes loading", () => {
        global.fetch.mockImplementation(() => new Promise(() => { }));

        render(<ContactView />);

        expect(screen.getByTestId("shared-client-dashboard")).toBeInTheDocument();
        expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    // Test case 2: The component should fetch the selected user and load all dashboard data.
    test("2.) Loads user profile and dashboard data for the selected contact", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                first_name: "Luis",
                last_name: "De Santiago",
            }),
        });

        mockSupabaseFrom.mockImplementation(
            createTableMock({
                Session: {
                    data: [
                        {
                            id: "session-1",
                            session_type_id: "portrait",
                            start_at: "2026-05-01T10:00:00.000Z",
                            end_at: "2026-05-01T11:00:00.000Z",
                            location_text: "Sacramento",
                            status: "Confirmed",
                            created_at: "2026-04-01T10:00:00.000Z",
                        },
                    ],
                    error: null,
                },
                Invoice: {
                    data: [{ id: "invoice-1", session_id: "session-1" }],
                    error: null,
                },
                Gallery: {
                    data: [{ id: "gallery-1", session_id: "session-1" }],
                    error: null,
                },
                Contract: {
                    data: [{ id: "contract-1", session_id: "session-1" }],
                    error: null,
                },
                Notification: {
                    data: [{ id: "notification-1", subject: "Reminder" }],
                    error: null,
                },
            })
        );

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(screen.getByTestId("full-name")).toHaveTextContent("Luis De Santiago");
        expect(screen.getByTestId("sessions-count")).toHaveTextContent("1");
        expect(screen.getByTestId("invoices-count")).toHaveTextContent("1");
        expect(screen.getByTestId("galleries-count")).toHaveTextContent("1");
        expect(screen.getByTestId("contracts-count")).toHaveTextContent("1");
        expect(screen.getByTestId("notifications-count")).toHaveTextContent("1");
        expect(screen.getByTestId("admin-view")).toHaveTextContent("true");
        expect(screen.getByTestId("pay-button")).toHaveTextContent("false");
        expect(screen.getByTestId("download-button")).toHaveTextContent("false");

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/profile/user-1"),
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    Authorization: "Bearer mock-token",
                    "Content-Type": "application/json",
                }),
            })
        );
    });

    // Test case 3: If the selected user does not exist, the component should not load dashboard data.
    test("3.) Handles missing user profile response", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
        });

        render(<ContactView />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/profile/user-1"),
                expect.any(Object)
            );
        });

        expect(mockSupabaseFrom).not.toHaveBeenCalled();
        expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    // Test case 4: If there are no sessions, invoices/galleries/contracts should stay empty.
    test("4.) Handles user with no sessions", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                first_name: "Bailey",
                last_name: "White",
            }),
        });

        mockSupabaseFrom.mockImplementation(
            createTableMock({
                Session: {
                    data: [],
                    error: null,
                },
                Notification: {
                    data: [],
                    error: null,
                },
            })
        );

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(screen.getByTestId("full-name")).toHaveTextContent("Bailey White");
        expect(screen.getByTestId("sessions-count")).toHaveTextContent("0");
        expect(screen.getByTestId("invoices-count")).toHaveTextContent("0");
        expect(screen.getByTestId("galleries-count")).toHaveTextContent("0");
        expect(screen.getByTestId("contracts-count")).toHaveTextContent("0");
        expect(screen.getByTestId("notifications-count")).toHaveTextContent("0");
    });

    // Test case 5: Invoice, gallery, contract, and notification errors should be logged and empty arrays should be used.
    test("5.) Handles dashboard fetch errors for related data", async () => {
        const invoiceError = new Error("Invoice error");
        const galleryError = new Error("Gallery error");
        const contractError = new Error("Contract error");
        const notificationError = new Error("Notification error");

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                first_name: "Luis",
                last_name: "De Santiago",
            }),
        });

        mockSupabaseFrom.mockImplementation(
            createTableMock({
                Session: {
                    data: [
                        {
                            id: "session-1",
                            status: "Confirmed",
                            start_at: "2026-05-01T10:00:00.000Z",
                            end_at: "2026-05-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                },
                Invoice: {
                    data: null,
                    error: invoiceError,
                },
                Gallery: {
                    data: null,
                    error: galleryError,
                },
                Contract: {
                    data: null,
                    error: contractError,
                },
                Notification: {
                    data: null,
                    error: notificationError,
                },
            })
        );

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(console.error).toHaveBeenCalledWith(invoiceError);
        expect(console.error).toHaveBeenCalledWith(galleryError);
        expect(console.error).toHaveBeenCalledWith(contractError);
        expect(console.error).toHaveBeenCalledWith("Notification fetch error:", notificationError);

        expect(screen.getByTestId("invoices-count")).toHaveTextContent("0");
        expect(screen.getByTestId("galleries-count")).toHaveTextContent("0");
        expect(screen.getByTestId("contracts-count")).toHaveTextContent("0");
        expect(screen.getByTestId("notifications-count")).toHaveTextContent("0");
    });

    // Test case 6: If there is no session, no profile request should be made.
    test("6.) Does not fetch profile when auth session is missing", () => {
        mockUseAuth.mockReturnValue({ session: null });

        render(<ContactView />);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockSupabaseFrom).not.toHaveBeenCalled();
        expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    // Test case 7: If there is no route user id, no profile request should be made.
    test("7.) Does not fetch profile when route user id is missing", () => {
        mockUseParams.mockReturnValue({ id: null });

        render(<ContactView />);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(mockSupabaseFrom).not.toHaveBeenCalled();
        expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });
    // Test case 8: handleUpdate should not call fetch if session is missing.
    test("8.) HandleUpdate does nothing when session is missing", async () => {
        await handleUpdate(null, "session-1", "status", "Completed");

        expect(global.fetch).not.toHaveBeenCalled();
    });

    // Test case 9: handleUpdate sends PATCH request correctly.
    test("9.) HandleUpdate sends PATCH request for session update", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        await handleUpdate(mockSession, "session-1", "status", "Completed");

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/sessions/session-1"),
            expect.objectContaining({
                method: "PATCH",
                headers: expect.objectContaining({
                    Authorization: "Bearer mock-token",
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ status: "Completed" }),
            })
        );
    });

    // Test case 10: handleUpdate logs error when PATCH fails.
    test("10.) HandleUpdate logs error when session update fails", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Update failed" }),
        });

        await handleUpdate(mockSession, "session-1", "status", "Completed");

        expect(console.error).toHaveBeenCalledWith("Update failed");
    });

    // Test case 11: cancelSession should not run if session or sessionId is missing.
    test("11.) CancelSession does nothing when session or session id is missing", async () => {
        await cancelSession(null, "session-1");
        await cancelSession(mockSession, null);

        expect(global.fetch).not.toHaveBeenCalled();
    });

    // Test case 12: cancelSession should map the session to an invoice, update payment/invoice status, and call uncapture.
    test("12.) CancelSession cancels invoice and uncaptures payment successfully", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            if (String(url).includes("/api/checkout/checkout-session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        payment_intent: { id: "payment-intent-1" },
                    }),
                });
            }

            if (String(url).includes("/api/intent/uncapture")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                });
            }

            if (String(url).includes("/api/sessions/")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                });
            }

            return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { provider_payment_id: "checkout-session-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    select: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { id: "invoice-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return {};
        });

        await cancelSession(mockSession, "session-1");

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/intent/uncapture"),
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: "Bearer mock-token",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({
                        payment_intent_id: "payment-intent-1",
                    }),
                })
            );
        });
    });

    // Test case 13: cancelSession should throw if the invoice mapping request fails.
    test("13.) CancelSession throws when session cannot be mapped to invoice", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
        });

        await expect(cancelSession(mockSession, "session-1")).rejects.toThrow(
            "Could not map session id to an invoice id"
        );
    });

    // Test case 14: cancelSession should throw if the payment lookup fails.
    test("14.) CancelSession throws when payment lookup fails", async () => {
        const paymentError = new Error("Payment lookup failed");

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: "invoice-1" }),
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: paymentError,
                        })
                    ),
                };

                return builder;
            }

            return {};
        });

        await expect(cancelSession(mockSession, "session-1")).rejects.toThrow(
            "Payment lookup failed"
        );
    });

    // Test case 15: cancelSession should log an error if retrieving the payment intent fails.
    test("15.) CancelSession logs error when checkout payment intent fetch fails", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            if (String(url).includes("/api/checkout/checkout-session-1")) {
                return Promise.resolve({
                    ok: false,
                    json: async () => ({}),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { provider_payment_id: "checkout-session-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    select: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { id: "invoice-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return {};
        });

        await cancelSession(mockSession, "session-1");

        await waitFor(() => {
            expect(console.error).toHaveBeenCalled();
        });
    });

    // Test case 16: A confirmed past session should be marked completed.
    test("16.) Marks confirmed past sessions as completed", async () => {
        global.fetch = jest.fn((url, options) => {
            if (String(url).includes("/api/profile/user-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        first_name: "Luis",
                        last_name: "De Santiago",
                    }),
                });
            }

            if (String(url).includes("/api/sessions/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation(
            createTableMock({
                Session: {
                    data: [
                        {
                            id: "session-1",
                            status: "Confirmed",
                            start_at: "2020-01-01T10:00:00.000Z",
                            end_at: "2020-01-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                },
                Invoice: { data: [], error: null },
                Gallery: { data: [], error: null },
                Contract: { data: [], error: null },
                Notification: { data: [], error: null },
            })
        );

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/sessions/session-1"),
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({ status: "Completed" }),
            })
        );
    });

    // Test case 17: A pending past session should trigger cancellation flow.
    test("17.) Cancels pending past sessions", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/profile/user-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        first_name: "Luis",
                        last_name: "De Santiago",
                    }),
                });
            }

            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            if (String(url).includes("/api/checkout/checkout-session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        payment_intent: { id: "payment-intent-1" },
                    }),
                });
            }

            if (String(url).includes("/api/intent/uncapture")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                });
            }

            if (String(url).includes("/api/sessions/")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Session") {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    order: jest.fn(() =>
                        Promise.resolve({
                            data: [
                                {
                                    id: "session-1",
                                    status: "Pending",
                                    start_at: "2020-01-01T10:00:00.000Z",
                                    end_at: "2020-01-01T11:00:00.000Z",
                                },
                            ],
                            error: null,
                        })
                    ),
                };
            }

            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { provider_payment_id: "checkout-session-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    select: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    in: jest.fn(() => builder),
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { id: "invoice-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return createTableMock({
                Gallery: { data: [], error: null },
                Contract: { data: [], error: null },
                Notification: { data: [], error: null },
            })(table);
        });

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/intent/uncapture"),
                expect.any(Object)
            );
        });
    });

    // Test case 18: ContactView handles Session fetch error by logging and clearing sessions.
    test("18.) Handles session fetch error and clears sessions", async () => {
        const sessionError = new Error("Session fetch failed");

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => ({
                    first_name: "Luis",
                    last_name: "Admin",
                }),
            })
        );

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Session") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    order: jest.fn(() =>
                        Promise.resolve({
                            data: [],
                            error: sessionError,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Notification") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    order: jest.fn(() => builder),
                    limit: jest.fn(() =>
                        Promise.resolve({
                            data: [],
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return {
                select: jest.fn(() => ({
                    in: jest.fn(() => ({
                        order: jest.fn(() =>
                            Promise.resolve({
                                data: [],
                                error: null,
                            })
                        ),
                    })),
                })),
            };
        });

        render(<ContactView />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(sessionError);
        });

        expect(screen.getByTestId("sessions-count")).toHaveTextContent("0");
    });

    // Test case 19: cancelSession logs error when invoice cancellation fails.
    test("19.) cancelSession logs error when invoice cancellation fails", async () => {
        const invoiceError = new Error("Invoice cancel failed");

        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            if (String(url).includes("/api/checkout/checkout-session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        payment_intent: { id: "payment-intent-1" },
                    }),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { provider_payment_id: "checkout-session-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    select: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: invoiceError,
                        })
                    ),
                };

                return builder;
            }

            return {};
        });

        await cancelSession({ access_token: "mock-token" }, "session-1");

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(invoiceError);
        });
    });

    // Test case 20: cancelSession handles missing checkout session id branch.
    test("20.) cancelSession logs failed payment intent when checkout id is missing", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { provider_payment_id: null },
                            error: null,
                        })
                    ),
                };
                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    select: jest.fn(() => builder),
                    single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
                };
                return builder;
            }

            return {};
        });

        await cancelSession({ access_token: "mock-token" }, "session-1");

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Failed to retrieve payment intent",
                })
            );
        });
    });

    // Test case 21: cancelSession logs error when uncapture request fails.
    test("21.) cancelSession logs error when uncapture request fails", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            if (String(url).includes("/api/checkout/checkout-session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        payment_intent: { id: "payment-intent-1" },
                    }),
                });
            }

            if (String(url).includes("/api/intent/uncapture")) {
                return Promise.resolve({
                    ok: false,
                    json: async () => ({}),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { provider_payment_id: "checkout-session-1" },
                            error: null,
                        })
                    ),
                };
                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    select: jest.fn(() => builder),
                    single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
                };
                return builder;
            }

            return {};
        });

        await cancelSession({ access_token: "mock-token" }, "session-1");

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Failed to capture payment intent",
                })
            );
        });
    });

    // Test case 22: ContactView uses empty fallback arrays when related table data is null.
    test("22.) Uses fallback empty arrays when related dashboard data is null", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => ({
                    first_name: "Luis",
                    last_name: "Admin",
                }),
            })
        );

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Session") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    order: jest.fn(() =>
                        Promise.resolve({
                            data: [{ id: "session-1", status: "Scheduled" }],
                            error: null,
                        })
                    ),
                };
                return builder;
            }

            if (table === "Invoice" || table === "Gallery" || table === "Contract") {
                const builder = {
                    select: jest.fn(() => builder),
                    in: jest.fn(() => builder),
                    order: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: null,
                        })
                    ),
                };
                return builder;
            }

            if (table === "Notification") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    order: jest.fn(() => builder),
                    limit: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: null,
                        })
                    ),
                };
                return builder;
            }

            return {};
        });

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(screen.getByTestId("sessions-count")).toHaveTextContent("1");
        expect(screen.getByTestId("invoices-count")).toHaveTextContent("0");
        expect(screen.getByTestId("galleries-count")).toHaveTextContent("0");
        expect(screen.getByTestId("contracts-count")).toHaveTextContent("0");
        expect(screen.getByTestId("notifications-count")).toHaveTextContent("0");
    });

    // Test case 23: ContactView handles null sessionRows fallback.
    test("23.) Uses empty sessions fallback when sessionRows is null", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => ({
                    first_name: "Luis",
                    last_name: "Admin",
                }),
            })
        );

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Session") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    order: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Notification") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    order: jest.fn(() => builder),
                    limit: jest.fn(() =>
                        Promise.resolve({
                            data: [],
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return {};
        });

        render(<ContactView />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(screen.getByTestId("sessions-count")).toHaveTextContent("0");
    });

    // Test case 26: uncapturePayment throws and is caught when Payment update fails.
    test("26.) Logs error when uncapturePayment update fails", async () => {
        const paymentError = new Error("Uncapture failed");
        let paymentSingleCall = 0;

        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ id: "invoice-1" }),
                });
            }

            if (String(url).includes("/api/checkout/checkout-session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        payment_intent: { id: "payment-intent-1" },
                    }),
                });
            }

            if (String(url).includes("/api/intent/uncapture")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({}),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    single: jest.fn(() => {
                        paymentSingleCall += 1;

                        if (paymentSingleCall === 1) {
                            return Promise.resolve({
                                data: { provider_payment_id: "checkout-session-1" },
                                error: null,
                            });
                        }

                        return Promise.resolve({
                            data: null,
                            error: paymentError,
                        });
                    }),
                };

                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    select: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: {},
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return {};
        });

        await cancelSession({ access_token: "mock-token" }, "session-1");

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(paymentError);
        });
    });
});