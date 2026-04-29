import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

jest.mock("../../../../src/lib/apiUrl.js", () => ({
    API_URL: "http://localhost:5001",
    SUPABASE_URL: "https://zccwrooyhkpkslgqdkvq.supabase.co",
}));


const mockUseAuth = jest.fn();
const mockUseSearchParams = jest.fn();
const mockSetProfile = jest.fn();

const mockSupabaseFrom = jest.fn();
const mockStorageFrom = jest.fn();

const mockSaveAs = jest.fn();

const mockZipFile = jest.fn();
const mockGenerateAsync = jest.fn(() => Promise.resolve(new Blob(["zip"])));
const mockFolder = jest.fn(() => ({
    file: mockZipFile,
}));

jest.mock("react-router-dom", () => ({
    useSearchParams: () => mockUseSearchParams(),
}));

jest.mock("../../../../src/context/AuthContext", () => ({
    useAuth: () => mockUseAuth(),
}));

jest.mock("../../../../src/lib/supabaseClient", () => ({
    supabase: {
        from: (table) => mockSupabaseFrom(table),
        storage: {
            from: (bucket) => mockStorageFrom(bucket),
        },
        auth: {
            updateUser: jest.fn(),
            signInWithPassword: jest.fn(),
            getSession: jest.fn(),
            signOut: jest.fn(),
        },
    },
}));

jest.mock("jszip", () => {
    return jest.fn().mockImplementation(() => ({
        folder: mockFolder,
        generateAsync: mockGenerateAsync,
    }));
});

jest.mock("file-saver", () => ({
    saveAs: (...args) => mockSaveAs(...args),
}));

jest.mock("../../../../src/components/Dashboard/SharedClientDashboard", () => {
    return function MockSharedClientDashboard(props) {
        return (
            <div data-testid="shared-dashboard">
                <p data-testid="full-name">{props.fullName || ""}</p>
                <p data-testid="loading">{String(props.loading)}</p>
                <p data-testid="sessions-count">{props.sessions?.length ?? 0}</p>
                <p data-testid="invoices-count">{props.invoices?.length ?? 0}</p>
                <p data-testid="galleries-count">{props.galleries?.length ?? 0}</p>
                <p data-testid="contracts-count">{props.contracts?.length ?? 0}</p>
                <p data-testid="notifications-count">{props.notifications?.length ?? 0}</p>
                <p data-testid="show-pay">{String(props.showPayButton)}</p>
                <p data-testid="show-download">{String(props.showDownloadButton)}</p>
                <p data-testid="show-settings">{String(props.showSettingsButton)}</p>

                <button type="button" onClick={props.onOpenSettings}>
                    Open Settings
                </button>

                <button
                    type="button"
                    onClick={() =>
                        props.onPayInvoice({
                            id: "invoice-1",
                            session_id: "session-1",
                            remaining: 100,
                        })
                    }
                >
                    Pay Invoice
                </button>

                <button
                    type="button"
                    onClick={() => props.onDownloadGallery("gallery-1", "Test Gallery")}
                >
                    Download Gallery
                </button>

                <button
                    type="button"
                    onClick={() => props.onDownloadGallery("gallery-1", undefined)}
                >
                    Download Gallery No Title
                </button>
            </div>
        );
    };
});

import { supabase } from "../../../../src/lib/supabaseClient";
import ClientDashboard from "../../../../src/pages/Dashboard/ClientDashboard.jsx";

function createBuilder(result = { data: [], error: null }) {
    const builder = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        in: jest.fn(() => builder),
        neq: jest.fn(() => Promise.resolve(result)),
        order: jest.fn(() => Promise.resolve(result)),
        limit: jest.fn(() => Promise.resolve(result)),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        single: jest.fn(() => Promise.resolve(result)),
        insert: jest.fn(() => builder),
        update: jest.fn(() => builder),
    };

    return builder;
}

function mockDashboardTables({
    sessions = [],
    invoices = [],
    galleries = [],
    contracts = [],
    notifications = [],
    errors = {},
} = {}) {
    mockSupabaseFrom.mockImplementation((table) => {
        if (table === "Session") {
            const result = { data: sessions, error: errors.Session || null };
            const builder = createBuilder(result);
            builder.order = jest.fn(() => Promise.resolve(result));
            return builder;
        }

        if (table === "Invoice") {
            const result = { data: invoices, error: errors.Invoice || null };
            const builder = createBuilder(result);
            builder.order = jest.fn(() => Promise.resolve(result));
            builder.single = jest.fn(() => Promise.resolve(result));
            return builder;
        }

        if (table === "Gallery") {
            const result = { data: galleries, error: errors.Gallery || null };
            const builder = createBuilder(result);
            builder.order = jest.fn(() => Promise.resolve(result));
            return builder;
        }

        if (table === "Contract") {
            const result = { data: contracts, error: errors.Contract || null };
            const builder = createBuilder(result);
            builder.neq = jest.fn(() => Promise.resolve(result));
            return builder;
        }

        if (table === "Notification") {
            const result = { data: notifications, error: errors.Notification || null };
            const builder = createBuilder(result);
            builder.order = jest.fn(() => builder);
            builder.limit = jest.fn(() => Promise.resolve(result));
            return builder;
        }

        if (table === "Payment") {
            return createBuilder({ data: null, error: null });
        }

        if (table === "User") {
            return createBuilder({ data: null, error: null });
        }

        return createBuilder();
    });
}

describe("ClientDashboard", () => {
    const originalFetch = global.fetch;
    const originalAlert = global.alert;
    const originalLocation = window.location;
    const originalConsoleError = console.error;

    const mockSession = {
        access_token: "mock-token",
    };

    const mockUser = {
        id: "user-1",
        email: "luis@test.com",
    };

    const mockProfile = {
        first_name: "Luis",
        last_name: "De Santiago",
        phone: "7075551234",
    };

    beforeEach(() => {
        global.fetch = jest.fn();
        global.alert = jest.fn();
        console.error = jest.fn();

        delete window.location;
        window.location = {
            href: "http://localhost/",
            origin: "http://localhost",
        };

        mockUseSearchParams.mockReturnValue([new URLSearchParams(""), jest.fn()]);
        mockUseAuth.mockReturnValue({
            session: mockSession,
            user: mockUser,
            profile: mockProfile,
            setProfile: mockSetProfile,
        });

        mockSupabaseFrom.mockReset();
        mockStorageFrom.mockReset();
        mockSetProfile.mockReset();
        mockSaveAs.mockReset();
        mockZipFile.mockReset();
        mockFolder.mockClear();
        mockGenerateAsync.mockClear();

        supabase.auth.updateUser.mockReset();
        supabase.auth.signInWithPassword.mockReset();
        supabase.auth.getSession.mockReset();
        supabase.auth.signOut.mockReset();

        mockDashboardTables();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        global.fetch = originalFetch;
        global.alert = originalAlert;
        window.location = originalLocation;
        console.error = originalConsoleError;
    });

    // Test case 1: Renders the shared dashboard shell.
    test("1.) Renders shared dashboard", async () => {
        render(<ClientDashboard />);

        expect(screen.getByTestId("shared-dashboard")).toBeInTheDocument();
        expect(screen.getByTestId("show-pay")).toHaveTextContent("true");
        expect(screen.getByTestId("show-download")).toHaveTextContent("true");
        expect(screen.getByTestId("show-settings")).toHaveTextContent("true");
    });

    // Test case 2: Loads sessions, invoices, galleries, contracts, and notifications for a logged-in client.
    test("2.) Loads dashboard data for logged-in client", async () => {
        mockDashboardTables({
            sessions: [
                {
                    id: "session-1",
                    status: "Confirmed",
                    start_at: "2026-05-01T10:00:00.000Z",
                    end_at: "2026-05-01T11:00:00.000Z",
                },
            ],
            invoices: [{ id: "invoice-1", session_id: "session-1", status: "Unpaid" }],
            galleries: [{ id: "gallery-1", title: "Client Gallery" }],
            contracts: [{ id: "contract-1" }],
            notifications: [{ id: "notification-1", subject: "Reminder" }],
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(screen.getByTestId("full-name")).toHaveTextContent("Luis De Santiago");
        expect(screen.getByTestId("sessions-count")).toHaveTextContent("1");
        expect(screen.getByTestId("invoices-count")).toHaveTextContent("1");
        expect(screen.getByTestId("galleries-count")).toHaveTextContent("1");
        expect(screen.getByTestId("contracts-count")).toHaveTextContent("1");
        expect(screen.getByTestId("notifications-count")).toHaveTextContent("1");
    });

    // Test case 3: Does not load data if user or session is missing.
    test("3.) Does not load dashboard data without user/session", () => {
        mockUseAuth.mockReturnValue({
            session: null,
            user: null,
            profile: null,
            setProfile: mockSetProfile,
        });

        render(<ClientDashboard />);

        expect(mockSupabaseFrom).not.toHaveBeenCalled();
        expect(screen.getByTestId("loading")).toHaveTextContent("true");
    });

    // Test case 4: Logs dashboard query errors and falls back to empty arrays.
    test("4.) Handles dashboard fetch errors", async () => {
        const sessionError = new Error("session error");

        mockDashboardTables({
            sessions: [],
            errors: {
                Session: sessionError,
            },
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(console.error).toHaveBeenCalledWith(sessionError);
        expect(screen.getByTestId("sessions-count")).toHaveTextContent("0");
    });

    // Test case 5: Opens account settings modal.
    test("5.) Opens settings modal", async () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));

        expect(screen.getByText("Account Settings")).toBeInTheDocument();
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
        expect(screen.getByText("Delete Account")).toBeInTheDocument();
    });

    // Test case 6: Enters edit mode and cancels profile edits.
    test("6.) Enters edit profile mode and cancels", async () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        expect(screen.getByDisplayValue("Luis")).toBeInTheDocument();
        expect(screen.getByDisplayValue("De Santiago")).toBeInTheDocument();
        expect(screen.getByDisplayValue("7075551234")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Cancel"));

        expect(screen.queryByDisplayValue("Luis")).not.toBeInTheDocument();
    });

    // Test case 7: Shows invalid email error when saving a badly formatted email.
    test("7.) Shows validation error for invalid email update", async () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        fireEvent.change(screen.getByDisplayValue("luis@test.com"), {
            target: { name: "email", value: "bad-email" },
        });

        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
        });
    });

    // Test case 8: Saves profile successfully when email is unchanged.
    test("8.) Saves profile successfully when email is unchanged", async () => {
        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: {
                        id: "user-1",
                        first_name: "Luis",
                        last_name: "De Santiago",
                        phone: "7075551234",
                        email: "luis@test.com",
                    },
                    error: null,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        supabase.auth.updateUser.mockResolvedValue({ error: null });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("Profile updated successfully.")).toBeInTheDocument();
        });

        expect(mockSetProfile).toHaveBeenCalled();
        expect(supabase.auth.updateUser).toHaveBeenCalled();
    });

    // Test case 9: Shows duplicate email error when changed email belongs to another user.
    test("9.) Shows duplicate email error", async () => {
        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: { id: "someone-else" },
                    error: null,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        fireEvent.change(screen.getByDisplayValue("luis@test.com"), {
            target: { name: "email", value: "taken@test.com" },
        });

        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("That email is already in use. Please choose another.")).toBeInTheDocument();
        });
    });

    // Test case 10: Password modal validates required fields.
    test("10.) Shows required fields error for empty password form", async () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));
        fireEvent.click(screen.getByText("Save Password"));

        await waitFor(() => {
            expect(screen.getByText("All password fields are required.")).toBeInTheDocument();
        });
    });

    // Test case 11: Password modal validates matching passwords.
    test("11.) Shows password mismatch error", async () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "new-password-1" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "new-password-2" },
        });

        fireEvent.click(screen.getByText("Save Password"));

        await waitFor(() => {
            expect(screen.getByText("New passwords do not match.")).toBeInTheDocument();
        });
    });

    // Test case 12: Password modal validates minimum password length.
    test("12.) Shows password length error", async () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "short" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "short" },
        });

        fireEvent.click(screen.getByText("Save Password"));

        await waitFor(() => {
            expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
        });
    });

    // Test case 13: Password update succeeds after re-authentication.
    test("13.) Updates password successfully", async () => {
        supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
        supabase.auth.updateUser.mockResolvedValue({ error: null });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "new-password" },
        });

        fireEvent.click(screen.getByText("Save Password"));

        await waitFor(() => {
            expect(screen.getByText("Password updated successfully.")).toBeInTheDocument();
        });

        expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
        expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    });

    // Test case 14: Delete account requires a valid session token.
    test("14.) Shows error when deleting account without valid token", async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Delete Account"));

        const modal = screen.getByText("Are you sure you want to delete your account? This action cannot be undone.").closest(".relative");
        fireEvent.click(within(modal).getByRole("button", { name: "Delete Account" }));

        await waitFor(() => {
            expect(screen.getByText("No valid session token found. Please log in again.")).toBeInTheDocument();
        });
    });

    // Test case 15: Delete account calls edge function and signs out on success.
    test("15.) Deletes account successfully", async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
            error: null,
        });

        supabase.auth.signOut.mockResolvedValue({ error: null });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            text: async () => "deleted",
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Delete Account"));

        const modal = screen.getByText("Are you sure you want to delete your account? This action cannot be undone.").closest(".relative");
        fireEvent.click(within(modal).getByRole("button", { name: "Delete Account" }));


        await waitFor(() => {
            expect(mockSetProfile).toHaveBeenCalledWith(null);
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(window.location.href).toBe("http://localhost/");
    });

    // Test case 16: Payment flow redirects to Stripe checkout when checkout session is created.
    test("16.) Starts payment and redirects to Stripe checkout", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/sessions/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        SessionType: {
                            name: "Portrait",
                            description: "Portrait session",
                        },
                    }),
                });
            }

            if (String(url).includes("/api/checkout/rest")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        id: "checkout-session-1",
                        url: "https://stripe.test/checkout",
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

                    maybeSingle: jest.fn(() =>
                        Promise.resolve({
                            data: {
                                id: "payment-1",
                            },
                            error: null,
                        })
                    ),

                    update: jest.fn(() => builder),

                    single: jest.fn(() =>
                        Promise.resolve({
                            data: {
                                id: "payment-1",
                            },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Pay Invoice"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("api/sessions/session-1"),
                expect.any(Object)
            );
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/sessions/session-1"),
            expect.any(Object)
        );
    });

    // Test case 17: Payment flow logs error when session lookup fails.
    test("17.) Logs payment error when session lookup fails", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Pay Invoice"));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                "Error initiating payment: ",
                expect.any(Error)
            );
        });
    });

    // Test case 18: Gallery download succeeds and saves a zip file.
    test("18.) Downloads gallery as zip successfully", async () => {
        mockStorageFrom.mockImplementation((bucket) => {
            if (bucket === "photos") {
                return {
                    list: jest.fn(() =>
                        Promise.resolve({
                            data: [{ name: "photo-1.jpg" }],
                            error: null,
                        })
                    ),
                    createSignedUrl: jest.fn(() =>
                        Promise.resolve({
                            data: { signedUrl: "https://photo.test/photo-1.jpg" },
                            error: null,
                        })
                    ),
                };
            }

            if (String(bucket).includes("photos/galleries/gallery-1")) {
                return {
                    download: jest.fn(() =>
                        Promise.resolve({
                            data: new Blob(["photo"]),
                            error: null,
                        })
                    ),
                };
            }

            return {};
        });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            blob: async () => new Blob(["image"]),
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(mockSaveAs).toHaveBeenCalled();
        });

        expect(mockZipFile).toHaveBeenCalled();
    });

    // Test case 19: Gallery download shows alert when no photos exist.
    test("19.) Shows alert when gallery has no photos", async () => {
        mockStorageFrom.mockReturnValue({
            list: jest.fn(() =>
                Promise.resolve({
                    data: [],
                    error: null,
                })
            ),
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith("This gallery has no photos.");
        });
    });

    // Test case 20: Gallery download shows alert when photo listing fails.
    test("20.) Shows alert when gallery photo fetch fails", async () => {
        const photosError = new Error("storage failed");

        mockStorageFrom.mockReturnValue({
            list: jest.fn(() =>
                Promise.resolve({
                    data: null,
                    error: photosError,
                })
            ),
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                "Failed to fetch gallery photos. Please try again later."
            );
        });

        expect(console.error).toHaveBeenCalledWith("Error fetching photos:", photosError);
    });

    // Test case 21: Gallery download alerts when all photo downloads fail.
    test("21.) Shows alert when gallery photos fail to download", async () => {
        mockStorageFrom.mockImplementation((bucket) => {
            if (bucket === "photos") {
                return {
                    list: jest.fn(() =>
                        Promise.resolve({
                            data: [{ name: "photo-1.jpg" }],
                            error: null,
                        })
                    ),
                    createSignedUrl: jest.fn(() =>
                        Promise.resolve({
                            data: { signedUrl: "https://photo.test/photo-1.jpg" },
                            error: null,
                        })
                    ),
                };
            }

            return {
                download: jest.fn(() =>
                    Promise.resolve({
                        data: new Blob(["photo"]),
                        error: null,
                    })
                ),
            };
        });

        global.fetch.mockResolvedValueOnce({
            ok: false,
            blob: async () => new Blob(["bad"]),
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                "Failed to download any photos from this gallery."
            );
        });
    });

    // Test case 22: Gallery download alerts when only some photos download successfully.
    test("22.) Shows partial download alert when some gallery photos fail", async () => {
        mockStorageFrom.mockImplementation((bucket) => {
            if (bucket === "photos") {
                return {
                    list: jest.fn(() =>
                        Promise.resolve({
                            data: [{ name: "photo-1.jpg" }, { name: "photo-2.jpg" }],
                            error: null,
                        })
                    ),
                    createSignedUrl: jest.fn((filePath) =>
                        Promise.resolve({
                            data: { signedUrl: `https://photo.test/${filePath}` },
                            error: null,
                        })
                    ),
                };
            }

            return {
                download: jest.fn(() =>
                    Promise.resolve({
                        data: new Blob(["photo"]),
                        error: null,
                    })
                ),
            };
        });

        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                blob: async () => new Blob(["image-1"]),
            })
            .mockResolvedValueOnce({
                ok: false,
                blob: async () => new Blob(["bad"]),
            });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                "Downloaded 1 out of 2 photos. Some files failed."
            );
        });
    });

    // Test case 23: Gallery download catch block shows generic error.
    test("23.) Shows generic gallery download error when download throws", async () => {
        mockStorageFrom.mockImplementation(() => {
            throw new Error("Storage crash");
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(
                "An error occurred while downloading the gallery. Please try again later."
            );
        });

        expect(console.error).toHaveBeenCalledWith(
            "Error downloading gallery:",
            expect.any(Error)
        );
    });

    // Test case 24: Closes settings modal with Close button and X button.
    test("24.) Closes settings modal with close controls", () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        expect(screen.getByText("Account Settings")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Close"));
        expect(screen.queryByText("Account Settings")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("Open Settings"));
        expect(screen.getByText("Account Settings")).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Close"));
        expect(screen.queryByText("Account Settings")).not.toBeInTheDocument();
    });

    // Test case 25: Cancels password modal and clears password form.
    test("25.) Cancels password modal and clears password form", () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "new-password" },
        });

        const passwordModal = screen.getAllByText("Change Password")[1].closest(".relative");
        fireEvent.click(within(passwordModal).getByRole("button", { name: "Cancel" }));

        expect(screen.queryByPlaceholderText("Current Password")).not.toBeInTheDocument();
    });

    // Test case 26: Closes password modal with X button.
    test("26.) Closes password modal with X button", () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        const passwordModal = screen.getAllByText("Change Password")[1].closest(".relative");
        fireEvent.click(within(passwordModal).getByLabelText("Close"));

        expect(screen.queryByPlaceholderText("Current Password")).not.toBeInTheDocument();
    });

    // Test case 27: Closes delete confirmation modal with Cancel and X button.
    test("27.) Closes delete confirmation modal with cancel controls", () => {
        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Delete Account"));

        expect(
            screen.getByText("Are you sure you want to delete your account? This action cannot be undone.")
        ).toBeInTheDocument();

        let deleteModal = screen
            .getByText("Are you sure you want to delete your account? This action cannot be undone.")
            .closest(".relative");

        fireEvent.click(within(deleteModal).getByText("Cancel"));

        expect(
            screen.queryByText("Are you sure you want to delete your account? This action cannot be undone.")
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("Delete Account"));

        deleteModal = screen
            .getByText("Are you sure you want to delete your account? This action cannot be undone.")
            .closest(".relative");

        fireEvent.click(within(deleteModal).getByLabelText("Close"));

        expect(
            screen.queryByText("Are you sure you want to delete your account? This action cannot be undone.")
        ).not.toBeInTheDocument();
    });

    // Test case 28: Shows error when updating email fails during profile save.
    test("28.) Shows error when email update fails", async () => {
        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: null,
                    error: null,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        supabase.auth.updateUser
            .mockResolvedValueOnce({ error: null })
            .mockResolvedValueOnce({ error: new Error("Email update failed") });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        fireEvent.change(screen.getByDisplayValue("luis@test.com"), {
            target: { name: "email", value: "newemail@test.com" },
        });

        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("Could not update email address.")).toBeInTheDocument();
        });
    });

    // Test case 29: Shows success message when profile email change is submitted.
    test("29.) Shows success message when email change is submitted", async () => {
        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: {
                        id: "user-1",
                        first_name: "Luis",
                        last_name: "De Santiago",
                        phone: "7075551234",
                        email: "newemail@test.com",
                    },
                    error: null,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        supabase.auth.updateUser
            .mockResolvedValueOnce({ error: null })
            .mockResolvedValueOnce({ error: null });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        fireEvent.change(screen.getByDisplayValue("luis@test.com"), {
            target: { name: "email", value: "newemail@test.com" },
        });

        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(
                screen.getByText(
                    "Profile will be updated once you verify your new email address. Please check your inbox."
                )
            ).toBeInTheDocument();
        });
    });

    // Test case 30: Shows error when current password is incorrect.
    test("30.) Shows error when current password is incorrect", async () => {
        const loginErr = new Error("Bad password");

        supabase.auth.signInWithPassword.mockResolvedValue({
            error: loginErr,
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "wrong-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "new-password" },
        });

        fireEvent.click(screen.getByText("Save Password"));

        await waitFor(() => {
            expect(screen.getByText("Current password is incorrect.")).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("signInWithPassword error:", loginErr);
    });

    // Test case 31: Shows error when password update fails.
    test("31.) Shows error when password update fails", async () => {
        const updateErr = new Error("Password update failed");

        supabase.auth.signInWithPassword.mockResolvedValue({
            error: null,
        });

        supabase.auth.updateUser.mockResolvedValue({
            error: updateErr,
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "new-password" },
        });

        fireEvent.click(screen.getByText("Save Password"));

        await waitFor(() => {
            expect(
                screen.getByText("Could not update password. Please try again.")
            ).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("updateUser password error:", updateErr);
    });

    // Test case 32: Shows error when deleting account with no logged-in user.
    test("32.) Shows error when deleting account without logged-in user", async () => {
        mockUseAuth.mockReturnValue({
            session: mockSession,
            user: null,
            profile: mockProfile,
            setProfile: mockSetProfile,
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Delete Account"));

        const modal = screen
            .getByText("Are you sure you want to delete your account? This action cannot be undone.")
            .closest(".relative");

        fireEvent.click(within(modal).getByRole("button", { name: "Delete Account" }));

        await waitFor(() => {
            expect(screen.getByText("No user is currently logged in.")).toBeInTheDocument();
        });
    });

    // Test case 33: Shows delete account API error response text.
    test("33.) Shows delete account API error text", async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
            error: null,
        });

        global.fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => "Edge function delete failed",
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Delete Account"));

        const modal = screen
            .getByText("Are you sure you want to delete your account? This action cannot be undone.")
            .closest(".relative");

        fireEvent.click(within(modal).getByRole("button", { name: "Delete Account" }));

        await waitFor(() => {
            expect(screen.getByText("Edge function delete failed")).toBeInTheDocument();
        });
    });

    // Test case 34: Gallery download skips photo when signed URL creation fails.
    test("34.) Logs signed URL error during gallery download", async () => {
        const urlError = new Error("Signed URL failed");

        mockStorageFrom.mockImplementation((bucket) => {
            if (bucket === "photos") {
                return {
                    list: jest.fn(() =>
                        Promise.resolve({
                            data: [{ name: "photo-1.jpg" }],
                            error: null,
                        })
                    ),
                    createSignedUrl: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: urlError,
                        })
                    ),
                };
            }

            return {
                download: jest.fn(() =>
                    Promise.resolve({
                        data: new Blob(["photo"]),
                        error: null,
                    })
                ),
            };
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                "Error getting URL for photo-1.jpg:",
                urlError
            );
        });

        expect(global.alert).toHaveBeenCalledWith(
            "Failed to download any photos from this gallery."
        );
    });

    // Test case 35: Gallery download logs error when processing one photo throws.
    test("35.) Logs processing error during gallery download", async () => {
        const processingError = new Error("Fetch crashed");

        mockStorageFrom.mockImplementation((bucket) => {
            if (bucket === "photos") {
                return {
                    list: jest.fn(() =>
                        Promise.resolve({
                            data: [{ name: "photo-1.jpg" }],
                            error: null,
                        })
                    ),
                    createSignedUrl: jest.fn(() =>
                        Promise.resolve({
                            data: { signedUrl: "https://photo.test/photo-1.jpg" },
                            error: null,
                        })
                    ),
                };
            }

            return {
                download: jest.fn(() =>
                    Promise.resolve({
                        data: new Blob(["photo"]),
                        error: null,
                    })
                ),
            };
        });

        global.fetch.mockRejectedValueOnce(processingError);

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery"));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                "Error processing photo-1.jpg:",
                processingError
            );
        });

        expect(global.alert).toHaveBeenCalledWith(
            "Failed to download any photos from this gallery."
        );
    });

    // Test case 36: Handles successful checkout session payment update.
    test("36.) Updates invoice and payment after successful checkout session", async () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams("checkout_session_id=checkout-1"),
            jest.fn(),
        ]);

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                session: {
                    payment_status: "paid",
                },
            }),
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = createBuilder({
                    data: {
                        invoice_id: "invoice-1",
                        Invoice: {
                            Session: {
                                client_id: "user-1",
                            },
                        },
                    },
                    error: null,
                });

                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: {
                            invoice_id: "invoice-1",
                            Invoice: {
                                Session: {
                                    client_id: "user-1",
                                },
                            },
                        },
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Invoice") {
                return createBuilder({ data: {}, error: null });
            }

            if (table === "Session") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() => Promise.resolve({ data: [], error: null }));
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/checkout/checkout-1"),
            expect.any(Object)
        );
    });

    // Test case 37: Logs payment error when checkout session lookup fails.
    test("37.) Logs payment error when checkout session lookup fails", async () => {
        const paymentError = new Error("Payment lookup failed");

        mockUseSearchParams.mockReturnValue([
            new URLSearchParams("checkout_session_id=checkout-1"),
            jest.fn(),
        ]);

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = createBuilder({ data: null, error: paymentError });
                builder.single = jest.fn(() =>
                    Promise.resolve({ data: null, error: paymentError })
                );
                return builder;
            }

            if (table === "Session") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() => Promise.resolve({ data: [], error: null }));
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith("Payment Error:", paymentError);
        });
    });

    // Test case 38: Logs invoice, gallery, contract, and notification fetch errors.
    test("38.) Logs related dashboard data errors", async () => {
        const invoiceError = new Error("Invoice fetch failed");
        const galleryError = new Error("Gallery fetch failed");
        const contractError = new Error("Contract fetch failed");
        const notificationError = new Error("Notification fetch failed");

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Session") {
                const builder = createBuilder({
                    data: [
                        {
                            id: "session-1",
                            status: "Confirmed",
                            start_at: "2026-05-01T10:00:00.000Z",
                            end_at: "2026-05-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                });

                builder.order = jest.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "session-1",
                                status: "Confirmed",
                                start_at: "2026-05-01T10:00:00.000Z",
                                end_at: "2026-05-01T11:00:00.000Z",
                            },
                        ],
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Invoice") {
                const builder = createBuilder({ data: null, error: invoiceError });
                builder.order = jest.fn(() =>
                    Promise.resolve({ data: null, error: invoiceError })
                );
                return builder;
            }

            if (table === "Gallery") {
                const builder = createBuilder({ data: null, error: galleryError });
                builder.order = jest.fn(() =>
                    Promise.resolve({ data: null, error: galleryError })
                );
                return builder;
            }

            if (table === "Contract") {
                const builder = createBuilder({ data: null, error: contractError });
                builder.neq = jest.fn(() =>
                    Promise.resolve({ data: null, error: contractError })
                );
                return builder;
            }

            if (table === "Notification") {
                const builder = createBuilder({ data: null, error: notificationError });
                builder.order = jest.fn(() => builder);
                builder.limit = jest.fn(() =>
                    Promise.resolve({ data: null, error: notificationError })
                );
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(console.error).toHaveBeenCalledWith(invoiceError);
        expect(console.error).toHaveBeenCalledWith(galleryError);
        expect(console.error).toHaveBeenCalledWith(contractError);
        expect(console.error).toHaveBeenCalledWith(
            "Notification fetch error:",
            notificationError
        );
    });

    // Test case 39: Full name falls back to email when profile names are missing.
    test("39.) Uses email as full name fallback", () => {
        mockUseAuth.mockReturnValue({
            session: mockSession,
            user: mockUser,
            profile: {
                first_name: "",
                last_name: "",
                phone: "",
            },
            setProfile: mockSetProfile,
        });

        render(<ClientDashboard />);

        expect(screen.getByTestId("full-name")).toHaveTextContent("luis@test.com");
    });

    // Test case 40: Shows fallback values in settings modal when profile fields are missing.
    test("40.) Shows fallback profile values in settings modal", () => {
        mockUseAuth.mockReturnValue({
            session: mockSession,
            user: { id: "user-1", email: "" },
            profile: {
                first_name: "",
                last_name: "",
                phone: "",
            },
            setProfile: mockSetProfile,
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));

        expect(screen.getAllByText("Not set")).toHaveLength(2);
        expect(screen.getAllByText("N/A")).toHaveLength(2);
    });

    // Test case 41: Handles email duplicate check error.
    test("41.) Shows error when checking existing email fails", async () => {
        const userErr = new Error("Email check failed");

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: null,
                    error: userErr,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        fireEvent.change(screen.getByDisplayValue("luis@test.com"), {
            target: { name: "email", value: "newemail@test.com" },
        });

        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(
                screen.getByText("Could not check email right now. Please try again later.")
            ).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("Error checking existing email:", userErr);
    });

    // Test case 42: Handles User table update error.
    test("42.) Shows error when User table update fails", async () => {
        const updateError = new Error("Update failed");

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: null,
                    error: updateError,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("Update failed")).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("User table update error:", updateError);
    });

    // Test case 43: Handles Auth metadata sync error after User table update succeeds.
    test("43.) Shows error when auth metadata sync fails", async () => {
        const metaErr = new Error("Metadata sync failed");

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: {
                        id: "user-1",
                        first_name: "Luis",
                        last_name: "De Santiago",
                        phone: "7075551234",
                        email: "luis@test.com",
                    },
                    error: null,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        supabase.auth.updateUser.mockResolvedValueOnce({
            error: metaErr,
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(
                screen.getByText("Saved profile, but could not sync Auth profile data.")
            ).toBeInTheDocument();
        });

        expect(console.error).toHaveBeenCalledWith("updateUser metadata error:", metaErr);
    });

    // Test case 44: Handles Stripe checkout creation failure.
    test("44.) Logs Stripe connection error when checkout session fails", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/sessions/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        SessionType: {
                            name: "Portrait",
                            description: "Portrait session",
                        },
                    }),
                });
            }

            if (String(url).includes("/api/checkout/rest")) {
                return Promise.resolve({
                    ok: false,
                    json: async () => ({
                        error: "Stripe failed",
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
                const builder = createBuilder({
                    data: {
                        id: "payment-1",
                    },
                    error: null,
                });

                builder.maybeSingle = jest.fn(() =>
                    Promise.resolve({
                        data: { id: "payment-1" },
                        error: null,
                    })
                );

                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Pay Invoice"));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                "Stripe connection failed: ",
                "Stripe failed"
            );
        });
    });

    // Test case 45: Creates a new Payment row when no existing payment exists.
    test("45.) Creates payment row when no existing payment exists", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/sessions/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        SessionType: {
                            name: "Portrait",
                            description: "Portrait session",
                        },
                    }),
                });
            }

            if (String(url).includes("/api/checkout/rest")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        id: "checkout-session-1",
                        url: "https://stripe.test/checkout",
                    }),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        let insertCalled = false;

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = {
                    select: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    maybeSingle: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: null,
                        })
                    ),
                    insert: jest.fn(() => {
                        insertCalled = true;
                        return builder;
                    }),
                    update: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: { id: "payment-1" },
                            error: null,
                        })
                    ),
                };

                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Pay Invoice"));

        await waitFor(() => {
            expect(insertCalled).toBe(true);
        });
    });

    // Test case 46: Checkout session exists but is not paid.
    test("46.) Does not update invoice when checkout session is unpaid", async () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams("checkout_session_id=checkout-1"),
            jest.fn(),
        ]);

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                session: {
                    payment_status: "unpaid",
                },
            }),
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = createBuilder({
                    data: {
                        invoice_id: "invoice-1",
                        Invoice: {
                            Session: {
                                client_id: "user-1",
                            },
                        },
                    },
                    error: null,
                });

                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: {
                            invoice_id: "invoice-1",
                            Invoice: {
                                Session: {
                                    client_id: "user-1",
                                },
                            },
                        },
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Session") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() => Promise.resolve({ data: [], error: null }));
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/checkout/checkout-1"),
            expect.any(Object)
        );
    });

    // Test case 47: Checkout session belongs to another user.
    test("47.) Skips checkout update when checkout belongs to another user", async () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams("checkout_session_id=checkout-1"),
            jest.fn(),
        ]);

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Payment") {
                const builder = createBuilder({
                    data: {
                        invoice_id: "invoice-1",
                        Invoice: {
                            Session: {
                                client_id: "different-user",
                            },
                        },
                    },
                    error: null,
                });

                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: {
                            invoice_id: "invoice-1",
                            Invoice: {
                                Session: {
                                    client_id: "different-user",
                                },
                            },
                        },
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Session") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() => Promise.resolve({ data: [], error: null }));
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent("false");
        });

        expect(global.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/checkout/checkout-1"),
            expect.any(Object)
        );
    });

    // Test case 48: Past confirmed session should be auto-marked completed.
    test("48.) Auto-completes past confirmed sessions", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/sessions/session-past-confirmed")) {
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
                const builder = createBuilder({
                    data: [
                        {
                            id: "session-past-confirmed",
                            status: "Confirmed",
                            start_at: "2020-01-01T10:00:00.000Z",
                            end_at: "2020-01-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                });

                builder.order = jest.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "session-past-confirmed",
                                status: "Confirmed",
                                start_at: "2020-01-01T10:00:00.000Z",
                                end_at: "2020-01-01T11:00:00.000Z",
                            },
                        ],
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Invoice") {
                const builder = createBuilder({ data: [], error: null });

                builder.in = jest.fn(() => builder);
                builder.order = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );

                return builder;
            }

            if (table === "Gallery") {
                const builder = createBuilder({ data: [], error: null });

                builder.in = jest.fn(() => builder);
                builder.order = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );

                return builder;
            }

            if (table === "Contract") {
                const builder = createBuilder({ data: [], error: null });

                builder.in = jest.fn(() => builder);
                builder.neq = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );

                return builder;
            }

            if (table === "Notification") {
                const builder = createBuilder({ data: [], error: null });

                builder.order = jest.fn(() => builder);
                builder.limit = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );

                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/sessions/session-past-confirmed"),
                expect.objectContaining({
                    method: "PATCH",
                    body: JSON.stringify({ status: "Completed" }),
                })
            );
        });
    });

    // Test case 49: handleUpdate logs error when auto-complete PATCH fails.
    test("49.) Logs error when auto-complete session update fails", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/sessions/session-past-confirmed")) {
                return Promise.resolve({
                    ok: false,
                    json: async () => ({ error: "Patch failed" }),
                });
            }

            return Promise.resolve({
                ok: true,
                json: async () => ({}),
            });
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "Session") {
                const builder = createBuilder({
                    data: [
                        {
                            id: "session-past-confirmed",
                            status: "Confirmed",
                            start_at: "2020-01-01T10:00:00.000Z",
                            end_at: "2020-01-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                });

                builder.order = jest.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "session-past-confirmed",
                                status: "Confirmed",
                                start_at: "2020-01-01T10:00:00.000Z",
                                end_at: "2020-01-01T11:00:00.000Z",
                            },
                        ],
                        error: null,
                    })
                );

                return builder;
            }



            if (table === "Notification") {
                const builder = createBuilder({ data: [], error: null });

                builder.order = jest.fn(() => builder);
                builder.limit = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );

                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith("Patch failed");
        });
    });

    // Test case 50: Past pending session should trigger cancel session flow.
    test("50.) Auto-cancels past pending sessions", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-past-pending")) {
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
                const builder = createBuilder({
                    data: [
                        {
                            id: "session-past-pending",
                            status: "Pending",
                            start_at: "2020-01-01T10:00:00.000Z",
                            end_at: "2020-01-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                });

                builder.order = jest.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "session-past-pending",
                                status: "Pending",
                                start_at: "2020-01-01T10:00:00.000Z",
                                end_at: "2020-01-01T11:00:00.000Z",
                            },
                        ],
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Payment") {
                const builder = createBuilder({
                    data: { provider_payment_id: "checkout-session-1" },
                    error: null,
                });

                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: { provider_payment_id: "checkout-session-1" },
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Invoice") {
                return createBuilder({
                    data: { id: "invoice-1" },
                    error: null,
                });
            }

            if (table === "Notification") {
                const builder = createBuilder({ data: [], error: null });

                builder.order = jest.fn(() => builder);
                builder.limit = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );

                return builder;
            }


            return createBuilder({ data: [], error: null });


        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/api/intent/uncapture"),
                expect.any(Object)
            );
        });
    });

    // Test case 51: cancelSession logs error when checkout session lookup fails.
    test("51.) Logs error when checkout session lookup fails during cancel", async () => {
        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-past-pending")) {
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
            if (table === "Session") {
                const builder = createBuilder({
                    data: [
                        {
                            id: "session-past-pending",
                            status: "Pending",
                            start_at: "2020-01-01T10:00:00.000Z",
                            end_at: "2020-01-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                });

                builder.order = jest.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "session-past-pending",
                                status: "Pending",
                                start_at: "2020-01-01T10:00:00.000Z",
                                end_at: "2020-01-01T11:00:00.000Z",
                            },
                        ],
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Payment") {
                const builder = createBuilder({
                    data: { provider_payment_id: "checkout-session-1" },
                    error: null,
                });

                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: { provider_payment_id: "checkout-session-1" },
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Invoice") {
                return createBuilder({ data: { id: "invoice-1" }, error: null });
            }

            if (table === "Notification") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() => builder);
                builder.limit = jest.fn(() => Promise.resolve({ data: [], error: null }));
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    // Test case 52: cancelSession logs error when invoice cancellation update fails.
    test("52.) Logs error when invoice cancellation update fails", async () => {
        const invoiceCancelError = new Error("Invoice cancel failed");

        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/invoice/session-past-pending")) {
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
            if (table === "Session") {
                const builder = createBuilder({
                    data: [
                        {
                            id: "session-past-pending",
                            status: "Pending",
                            start_at: "2020-01-01T10:00:00.000Z",
                            end_at: "2020-01-01T11:00:00.000Z",
                        },
                    ],
                    error: null,
                });

                builder.order = jest.fn(() =>
                    Promise.resolve({
                        data: [
                            {
                                id: "session-past-pending",
                                status: "Pending",
                                start_at: "2020-01-01T10:00:00.000Z",
                                end_at: "2020-01-01T11:00:00.000Z",
                            },
                        ],
                        error: null,
                    })
                );

                return builder;
            }

            if (table === "Payment") {
                const builder = createBuilder({ data: null, error: null });

                builder.single = jest
                    .fn()
                    .mockResolvedValueOnce({
                        data: { provider_payment_id: "checkout-session-1" },
                        error: null,
                    })
                    .mockResolvedValueOnce({
                        data: {},
                        error: null,
                    });

                return builder;
            }

            if (table === "Invoice") {
                const builder = createBuilder({ data: null, error: null });

                builder.single = jest.fn(() =>
                    Promise.resolve({
                        data: null,
                        error: invoiceCancelError,
                    })
                );

                return builder;
            }

            if (table === "Notification") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() => builder);
                builder.limit = jest.fn(() => Promise.resolve({ data: [], error: null }));
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(invoiceCancelError);
        });
    });

    // Test case 53: Covers modal backdrop close branches and delete fallback error.
    test("53.) Closes modals by backdrop click and shows delete fallback error", async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: {
                session: {
                    access_token: "delete-token",
                },
            },
            error: null,
        });

        global.fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => "",
        });

        render(<ClientDashboard />);

        // Open settings modal, then close it by clicking the backdrop/wrapper.
        fireEvent.click(screen.getByText("Open Settings"));

        const settingsModal = screen.getByRole("dialog");
        fireEvent.click(settingsModal);

        expect(screen.queryByText("Account Settings")).not.toBeInTheDocument();

        // Open settings again, then open password modal.
        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        // Close password modal by clicking its outer wrapper.
        const passwordModalWrapper = screen
            .getByRole("heading", { name: "Change Password" })
            .closest(".fixed");

        fireEvent.click(passwordModalWrapper);

        expect(screen.queryByPlaceholderText("Current Password")).not.toBeInTheDocument();

        // Exit edit mode so Delete Account button appears again.
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        // Open delete modal, then close it by clicking the backdrop/wrapper.
        fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));

        const deleteMessage =
            "Are you sure you want to delete your account? This action cannot be undone.";

        const deleteModalWrapper = screen.getByText(deleteMessage).closest(".fixed");
        fireEvent.click(deleteModalWrapper);

        expect(screen.queryByText(deleteMessage)).not.toBeInTheDocument();

        // Open delete modal again and trigger the empty-text fallback error.
        fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));

        const deleteModal = screen.getByText(deleteMessage).closest(".relative");

        fireEvent.click(
            within(deleteModal).getByRole("button", { name: "Delete Account" })
        );

        await waitFor(() => {
            expect(screen.getByText("Could not delete account.")).toBeInTheDocument();
        });
    });

    // Test case 54: Covers profile null fallbacks, edit changes, and save error fallback.
    test("54.) Covers profile fallbacks and save error fallback", async () => {
        mockUseAuth.mockReturnValue({
            session: mockSession,
            user: { id: "user-1", email: undefined },
            profile: {
                first_name: null,
                last_name: null,
                phone: null,
            },
            setProfile: mockSetProfile,
        });

        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: null,
                    error: { message: "" },
                });
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        expect(screen.getByTestId("full-name")).toHaveTextContent("");

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));

        fireEvent.change(screen.getByRole("textbox", { name: /first name/i }), {
            target: { name: "first_name", value: "Luis" },
        });

        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("Could not save changes.")).toBeInTheDocument();
        });
    });

    // Test case 55: Shows success message inside password modal and resets password form.
    test("55.) Covers password modal success message, inputs, and cancel reset", async () => {
        mockSupabaseFrom.mockImplementation((table) => {
            if (table === "User") {
                return createBuilder({
                    data: {
                        id: "user-1",
                        first_name: "Luis",
                        last_name: "De Santiago",
                        phone: "7075551234",
                        email: "luis@test.com",
                    },
                    error: null,
                });
            }

            return createBuilder({ data: [], error: null });
        });

        supabase.auth.updateUser.mockResolvedValue({ error: null });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Open Settings"));
        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(screen.getByText("Profile updated successfully.")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Edit Profile"));
        fireEvent.click(screen.getByText("Change Password"));

        expect(screen.getAllByText("Profile updated successfully.").length).toBeGreaterThan(0);

        fireEvent.change(screen.getByPlaceholderText("Current Password"), {
            target: { value: "old-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("New Password"), {
            target: { value: "new-password" },
        });
        fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
            target: { value: "new-password" },
        });

        const passwordModal = screen
            .getByRole("heading", { name: "Change Password" })
            .closest(".relative");

        fireEvent.click(within(passwordModal).getByRole("button", { name: "Cancel" }));

        expect(screen.queryByPlaceholderText("Current Password")).not.toBeInTheDocument();
    });

    // Test case 56: Covers gallery fallback title and zip filename fallback.
    test("56.) Covers gallery fallback title and zip filename", async () => {
        mockStorageFrom.mockImplementation((bucket) => {
            if (bucket === "photos") {
                return {
                    list: jest.fn(() =>
                        Promise.resolve({
                            data: [{ name: "photo1.jpg" }],
                            error: null,
                        })
                    ),
                    createSignedUrl: jest.fn(() =>
                        Promise.resolve({
                            data: { signedUrl: "https://test.com/photo1.jpg" },
                            error: null,
                        })
                    ),
                };
            }

            return {
                download: jest.fn(() =>
                    Promise.resolve({
                        data: new Blob(["file"]),
                        error: null,
                    })
                ),
            };
        });

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                blob: async () => new Blob(["photo"]),
                json: async () => ({}),
            })
        );

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Download Gallery No Title"));

        await waitFor(() => {
            expect(mockSaveAs).toHaveBeenCalled();
        });

        expect(mockSaveAs.mock.calls[0][1]).toMatch(/^gallery_\d+\.zip$/);
    });

    // Test case 57: Checkout success logs invoice update error when payment finalization fails.
    test("57.) Logs payment error when checkout invoice update fails", async () => {
        const invoiceUpdateError = new Error("Invoice update failed");
        let paymentSingleCall = 0;

        mockUseSearchParams.mockReturnValue([
            new URLSearchParams("checkout_session_id=checkout-1"),
            jest.fn(),
        ]);

        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/checkout/checkout-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        payment_status: "paid"
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
                    single: jest.fn(() => {
                        paymentSingleCall += 1;

                        if (paymentSingleCall === 1) {
                            return Promise.resolve({
                                data: {
                                    invoice_id: "invoice-1",
                                    Invoice: {
                                        Session: {
                                            client_id: "user-1",
                                        },
                                    },
                                },
                                error: null,
                            });
                        }

                        return Promise.resolve({
                            data: null,
                            error: null,
                        });
                    }),
                };

                return builder;
            }

            if (table === "Invoice") {
                const builder = {
                    update: jest.fn(() => builder),
                    eq: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: invoiceUpdateError,
                        })
                    ),
                };

                return builder;
            }

            if (table === "Session") {
                const builder = createBuilder({ data: [], error: null });
                builder.order = jest.fn(() =>
                    Promise.resolve({ data: [], error: null })
                );
                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                "Payment Error:",
                invoiceUpdateError
            );
        });
    });

    // Test case 66: Payment flow logs error when creating Payment row fails.
    test("58.) Logs payment error when creating Payment row fails", async () => {
        const paymentInsertError = new Error("Payment insert failed");

        global.fetch = jest.fn((url) => {
            if (String(url).includes("/api/sessions/session-1")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        SessionType: {
                            name: "Portrait",
                            description: "Portrait session",
                        },
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
                    maybeSingle: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: null,
                        })
                    ),
                    insert: jest.fn(() => builder),
                    single: jest.fn(() =>
                        Promise.resolve({
                            data: null,
                            error: paymentInsertError,
                        })
                    ),
                };

                return builder;
            }

            return createBuilder({ data: [], error: null });
        });

        render(<ClientDashboard />);

        fireEvent.click(screen.getByText("Pay Invoice"));

        await waitFor(() => {
            expect(console.error).toHaveBeenCalledWith(
                "Error initiating payment: ",
                paymentInsertError
            );
        });
    });
});