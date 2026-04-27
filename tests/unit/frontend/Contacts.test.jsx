import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { supabase } from "../../../src/lib/supabaseClient.js";

jest.mock("../../../src/lib/apiUrl.js", () => ({
    API_URL: "http://localhost:5001",
    SUPABASE_URL: "https://zccwrooyhkpkslgqdkvq.supabase.co",
}));

import Contacts from "../../../src/admin/pages/Contacts/Contacts.jsx";


const mockNavigate = jest.fn();
const mockUseAuth = jest.fn();
const mockGetSession = jest.fn();

jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

jest.mock("../../../src/context/AuthContext", () => ({
    useAuth: () => mockUseAuth(),
}));

jest.mock("../../../src/lib/supabaseClient.js", () => ({
    supabase: {
        auth: {
            getSession: () => mockGetSession(),
        },
    },
}));

jest.mock("../../../src/admin/components/shared/Sidebar/Sidebar.jsx", () => {
    return function MockSidebar() {
        return <div data-testid="sidebar">Sidebar</div>;
    };
});

jest.mock("../../../src/admin/components/shared/Frame/Frame.jsx", () => {
    return function MockFrame({ children }) {
        return <div data-testid="frame">{children}</div>;
    };
});

// Mock table to directly test rows, buttons, and column render functions.
jest.mock("../../../src/admin/components/shared/Table/Table.jsx", () => {
    return function MockTable({ columns, data }) {
        return (
            <div data-testid="contacts-table">
                {data.map((row) => (
                    <div data-testid="contact-row" key={row.userid}>
                        {columns.map((column) => (
                            <div key={column.key}>
                                {column.render
                                    ? column.render(row[column.key], row)
                                    : row[column.key]}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };
});

jest.mock("lucide-react", () => ({
    LoaderCircle: () => <div data-testid="loader">Loading Icon</div>,
}));


describe("Contacts", () => {
    const originalFetch = global.fetch;
    const originalConsoleError = console.error;

    const mockSession = {
        access_token: "mock-admin-token",
    };

    const mockContacts = [
        {
            id: "user-1",
            first_name: "Luis",
            last_name: "De Santiago",
            email: "luis@test.com",
            phone: "7075551234",
        },
        {
            id: "user-2",
            first_name: "Bailey",
            last_name: "White",
            email: "bailey@test.com",
            phone: "",
        },
    ];

    beforeEach(() => {
        global.fetch = jest.fn();
        console.error = jest.fn();

        mockNavigate.mockClear();
        mockGetSession.mockReset();

        mockUseAuth.mockReturnValue({
            session: mockSession,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        global.fetch = originalFetch;
        console.error = originalConsoleError;
    });

    // Test case 1: The contacts page should show a loading message while contacts are being fetched.
    test("1.) Shows loading state while contacts are being fetched", () => {
        global.fetch.mockImplementation(() => new Promise(() => { }));

        render(<Contacts />);

        expect(screen.getByText("Loading Sessions...")).toBeInTheDocument();
        expect(screen.getByTestId("loader")).toBeInTheDocument();
    });

    // Test case 2: The page should fetch contacts and display them in the table.
    test("2.) Fetches and displays client contacts", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockContacts,
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByTestId("contacts-table")).toBeInTheDocument();
        });

        expect(screen.getByText("Luis")).toBeInTheDocument();
        expect(screen.getByText("De Santiago")).toBeInTheDocument();
        expect(screen.getByText("luis@test.com")).toBeInTheDocument();

        expect(screen.getByText("Bailey")).toBeInTheDocument();
        expect(screen.getByText("White")).toBeInTheDocument();
        expect(screen.getByText("bailey@test.com")).toBeInTheDocument();

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/profile"),
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    Authorization: "Bearer mock-admin-token",
                    "Content-Type": "application/json",
                }),
            })
        );
    });

    // Test case 3: The phone number should be normalized into a readable format.
    test("3.) Formats phone numbers in the contacts table", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockContacts,
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("(707) 555-1234")).toBeInTheDocument();
        });
    });

    // Test case 4: If the contacts fetch fails, the page should show an error message.
    test("4.) Shows error message when contacts fail to load", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Profile fetch failed" }),
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("Failed to load contacts.")).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("Profile fetch failed");
    });

    // Test case 5: Clicking View should navigate to the selected contact's admin detail page.
    test("5.) Navigates to contact detail page when View is clicked", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockContacts,
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getAllByText("View")[0]).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("View")[0]);

        expect(mockNavigate).toHaveBeenCalledWith("/admin/contacts/user-1");
    });

    // Test case 6: Clicking Delete should open the delete confirmation modal.
    test("6.) Opens delete confirmation modal when Delete is clicked", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockContacts,
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getAllByText("Delete")[0]).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("Delete")[0]);

        expect(screen.getByText("Delete Contact")).toBeInTheDocument();
        expect(
            screen.getByText("Are you sure you want to delete this contact?")
        ).toBeInTheDocument();
    });

    // Test case 7: Clicking Cancel should close the delete modal.
    test("7.) Closes delete modal when Cancel is clicked", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockContacts,
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getAllByText("Delete")[0]).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("Delete")[0]);
        fireEvent.click(screen.getByText("Cancel"));

        await waitFor(() => {
            expect(screen.queryByText("Delete Contact")).not.toBeInTheDocument();
        });
    });

    // Test case 8: A successful delete should remove the selected contact from the table.
    test("8.) Deletes selected contact successfully", async () => {
        global.fetch = jest.fn((url) => {
            // First fetch: load contacts
            if (String(url).includes("/api/profile")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockContacts,
                });
            }

            // Second fetch: delete selected user
            if (String(url).includes("/functions/v1/user-delete")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ message: "User deleted" }),
                });
            }

            return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
        });

        mockGetSession.mockResolvedValue({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("Luis")).toBeInTheDocument();
        });

        // Open modal from first row delete button
        fireEvent.click(screen.getAllByText("Delete")[0]);

        await waitFor(() => {
            expect(screen.getByText("Delete Contact")).toBeInTheDocument();
        });

        // Click modal confirm delete button, which is the last Delete button on screen
        const modal = screen.getByText("Delete Contact").closest(".relative");
        const confirmButton = within(modal).getByRole("button", { name: "Delete" });

        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/functions/v1/user-delete"),
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        Authorization: "Bearer delete-token",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({
                        targetUserId: "user-1",
                    }),
                })
            );
        });

        await waitFor(() => {
            expect(screen.queryByText("Luis")).not.toBeInTheDocument();
        });

        expect(screen.getByText("Bailey")).toBeInTheDocument();
    });

    // Test case 9: If there is no admin token, the page should show a missing token error.
    test("9.) Shows error when delete is attempted without admin token", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockContacts,
        });

        mockGetSession.mockResolvedValueOnce({
            data: {
                session: null,
            },
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("Luis")).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("Delete")[0]);
        fireEvent.click(screen.getByText("Delete", { selector: "button.bg-\\[\\#a00101\\]" }));

        await waitFor(() => {
            expect(screen.getByText("Missing admin session token.")).toBeInTheDocument();
        });
    });

    // Test case 10: If the delete API returns an error, the page should show that error message.
    test("10.) Shows error message when delete API fails", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/profile")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockContacts,
                });
            }

            if (String(url).includes("/functions/v1/user-delete")) {
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ error: "Delete failed from API" }),
                });
            }

            return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
        });

        mockGetSession.mockResolvedValueOnce({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("Luis")).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("Delete")[0]);

        const modal = screen.getByText("Delete Contact").closest(".relative");
        const confirmButton = within(modal).getByRole("button", { name: "Delete" });

        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(screen.getByText("Delete failed from API")).toBeInTheDocument();
        });
    });
    // Test case 11: If the delete request throws, the page should show the generic delete error.
    test("11.) Shows generic error message when delete request throws", async () => {
        const deleteError = new Error("Network delete error");

        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/profile")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockContacts,
                });
            }

            if (String(url).includes("/functions/v1/user-delete")) {
                return Promise.reject(deleteError);
            }

            return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
        });

        mockGetSession.mockResolvedValueOnce({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("Luis")).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("Delete")[0]);

        const modal = screen.getByText("Delete Contact").closest(".relative");
        const confirmButton = within(modal).getByRole("button", { name: "Delete" });

        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(screen.getByText("Failed to delete user.")).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("Delete user error:", deleteError);
    });
    // Test case 12: If the delete API returns a message instead of an error, show that message.
    test("12.) Shows delete API message when error field is missing", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/profile")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => mockContacts,
                });
            }

            if (String(url).includes("/functions/v1/user-delete")) {
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ message: "Unable to delete this user" }),
                });
            }

            return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
        });

        mockGetSession.mockResolvedValueOnce({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
        });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.getByText("Luis")).toBeInTheDocument();
        });

        fireEvent.click(screen.getAllByText("Delete")[0]);

        const modal = screen.getByText("Delete Contact").closest(".relative");
        const confirmButton = within(modal).getByRole("button", { name: "Delete" });

        fireEvent.click(confirmButton);

        await waitFor(() => {
            expect(screen.getByText("Unable to delete this user")).toBeInTheDocument();
        });
    });

    // Test case 13: Does not fetch contacts when auth session is missing.
    test("13.) Does not fetch contacts without auth session", () => {
        mockUseAuth.mockReturnValue({
            session: null,
        });

        global.fetch = jest.fn();

        render(<Contacts />);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(screen.getByText("Loading Sessions...")).toBeInTheDocument();
    });

    // Test case 14: Maps missing contact fields to empty strings.
    test("14.) Uses fallback empty strings for missing contact fields", async () => {
        mockUseAuth.mockReturnValue({
            session: { access_token: "mock-token" },
        });

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => [
                    {
                        id: null,
                        first_name: null,
                        last_name: null,
                        email: null,
                        phone: null,
                    },
                ],
            })
        );

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.queryByText("Loading Sessions...")).not.toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/profile"),
            expect.any(Object)
        );
    });

    // Test case 15: Closes delete modal when backdrop is clicked.
    test("15.) Closes delete modal when clicking backdrop", async () => {
        mockUseAuth.mockReturnValue({
            session: { access_token: "mock-token" },
        });

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => [
                    {
                        id: "user-1",
                        first_name: "Luis",
                        last_name: "Test",
                        email: "luis@test.com",
                        phone: "7075551234",
                    },
                ],
            })
        );

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.queryByText("Loading Sessions...")).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        expect(screen.getByText("Delete Contact")).toBeInTheDocument();

        const backdropWrapper = screen.getByText("Delete Contact").closest(".fixed");

        fireEvent.click(backdropWrapper);

        expect(screen.queryByText("Delete Contact")).not.toBeInTheDocument();
    });
    // Test case 16: Shows delete fallback error when API response has no message.
    test("16.) Shows fallback delete error when API response has no error message", async () => {
        mockUseAuth.mockReturnValue({
            session: { access_token: "mock-token" },
        });

        supabase.auth.getSession = jest.fn().mockResolvedValue({
            data: {
                session: {
                    access_token: "admin-token",
                },
            },
        });

        global.fetch = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        id: "user-1",
                        first_name: "Luis",
                        last_name: "Test",
                        email: "luis@test.com",
                        phone: "7075551234",
                    },
                ],
            })
            .mockResolvedValueOnce({
                ok: false,
                json: async () => ({}),
            });

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.queryByText("Loading Sessions...")).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        const modal = screen.getByText("Delete Contact").closest(".relative");

        fireEvent.click(within(modal).getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(screen.getByText("Failed to delete user.")).toBeInTheDocument();
        });
    });

    // Test case 17: Handles null contact data by using empty array fallback.
    test("17.) Handles null contact data safely", async () => {
        mockUseAuth.mockReturnValue({
            session: { access_token: "mock-token" },
        });

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: async () => null,
            })
        );

        render(<Contacts />);

        await waitFor(() => {
            expect(screen.queryByText("Loading Sessions...")).not.toBeInTheDocument();
        });


    });

});