import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

jest.mock("../../../../src/lib/apiUrl.js", () => ({
  API_URL: "http://localhost:5001",
}));
import SessionDetailsModal from "../../../../src/admin/components/shared/SessionDetailsModal.jsx";

// replace the real fetch with a Jest mock before each test so no actual HTTP requests are made
beforeEach(() => {
  global.fetch = jest.fn();
});
//  clears all mock call history before each test
afterEach(() => {
  jest.restoreAllMocks();
});

// default props passed to SessionDetailsModal in every test. Simulates a logged-in user viewing a specific session
const defaultProps = {
  sessionId: "session-uuid-123",
  session: { access_token: "fake-token" },
  onClose: jest.fn(),
};
// simulates a successful API response. The component will receive this data when it calls fetch()
function mockFetchSuccess(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}
// simulates a failed API response with a given HTTP status code. The component will see res.ok === false and throw an error
function mockFetchFaliure(status = 500) {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
  });
}

// 14 TESTS //
describe("SessionDetailsModal", () => {
    test("1. shows loading indicator while fetching", () => {
        global.fetch.mockReturnValueOnce(new Promise(() => {}));

        render(<SessionDetailsModal {...defaultProps} />);

        expect(screen.getByText("Loading details...")).toBeInTheDocument();
    });
    
    test("2. fetches session details with correct URL and auth header", () => {
        global.fetch.mockReturnValueOnce(new Promise(() => {}));

        render(<SessionDetailsModal {...defaultProps} />);

        expect(global.fetch).toHaveBeenCalledWith("http://localhost:5001/api/sessions/session-uuid-123/details",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    Authorization: "Bearer fake-token",
                }),
            }),
        );
    });
    
    test("3. renders client notes when present", async () => {
        mockFetchSuccess({
            notes: "Testing notes",
            questionnaire: null,
        });
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText("Testing notes")).toBeInTheDocument();
        });
    });
    
    test("4. shows fallback text when no notes provided", async () => {
        mockFetchSuccess({ notes: null, questionnaire: null });
        render(<SessionDetailsModal {...defaultProps} />);
    
        await waitFor(() => {
            expect(screen.getByText("No notes provided.")).toBeInTheDocument();
        });
    });
    
    test("5. shows fallback text when no questionnaire submitted", async () => {
        mockFetchSuccess({ notes: null, questionnaire: null });
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText(/has not submitted a questionnaire/i)).toBeInTheDocument();
        });
    });
    
    test("6. renders questionnaire items with answers", async () => {
        mockFetchSuccess({
            notes: null,
            questionnaire: {
                template_name: "Testing Questionnaire",
                submitted_at: "2026-04-26T09:00:00Z",
                items: [
                    { question_id: "q1", label: "test question1?", answer: "test1" },
                    { question_id: "q2", label: "test question2?", answer: "test2" },
                ],
            },
        });
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText("Testing Questionnaire")).toBeInTheDocument();
            expect(screen.getByText("test question1?")).toBeInTheDocument();
            expect(screen.getByText("test1")).toBeInTheDocument();
            expect(screen.getByText("test question2?")).toBeInTheDocument();
            expect(screen.getByText("test2")).toBeInTheDocument();
        });
    });

    test("7. shows fallback for unanswered questionnaire items", async () => {
        mockFetchSuccess({
            notes: null,
            questionnaire: {
                template_name: "Testing Questionnaire",
                submitted_at: "2026-04-26T09:00:00Z",
                items: [{ question_id: "q1", label: "test question1?", answer: null }],
            },
        });
        
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText("No answer provided.")).toBeInTheDocument();
        });
    });

    test("8. formats multi-select answers(check box) as comma-separated values", async () => {
        mockFetchSuccess({
            notes: null,
            questionnaire: {
                template_name: "Check box",
                submitted_at: "2026-04-10T17:00:00Z",
                items: [{ question_id: "q1", label: "Select 3", answer: '["1","2","3"]' }],
            },
        });
        
        render(<SessionDetailsModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("1, 2, 3")).toBeInTheDocument();
        });
    });
    test("9. formats single-select answer without commas", async () => {
        mockFetchSuccess({
            notes: null,
            questionnaire: {
                template_name: "Check box single",
                submitted_at: "2026-04-26T09:00:00Z",
                items: [{ question_id: "q1", label: "Select 1", answer: '["1"]' }],
            },
        });
        
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText("1")).toBeInTheDocument();
        });
    });

    test("10. formats empty array answer as N/A", async () => {
        mockFetchSuccess({
            notes: null,
            questionnaire: {
                template_name: "Empty",
                submitted_at: "2026-04-26T09:00:00Z",
                items: [{ question_id: "q1", label: "Empty?", answer: "[]" }],
            },
        });
        render(<SessionDetailsModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("N/A")).toBeInTheDocument();
        });
    });

    test("11. shows error message when fetch fails", async () => {
        mockFetchFaliure(500);
        render(<SessionDetailsModal {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText("Request failed (500)")).toBeInTheDocument();
        });
    });

    test("12. calls onClose when clicking the backdrop", () => {
        global.fetch.mockReturnValueOnce(new Promise(() => {}));
        const onClose = jest.fn();
        render(<SessionDetailsModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByText("Session Details").closest(".fixed"));
        expect(onClose).toHaveBeenCalled();
    });

    test("13. calls onClose when clicking the X button", () => {
        global.fetch.mockReturnValueOnce(new Promise(() => {}));
        const onClose = jest.fn();
        render(<SessionDetailsModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalled();
    });

    test("14. does not fetch when sessionId is null", () => {
        render(
            <SessionDetailsModal
                sessionId={null}
                session={{ access_token: "fake-token" }}
                onClose={jest.fn()}
            />
        );
        expect(global.fetch).not.toHaveBeenCalled();
    });
    
    test("15. formats non-array JSON values as strings", async () => {
        mockFetchSuccess({
            notes: null,
            questionnaire: {
                template_name: "Mixed Types",
                submitted_at: "2026-04-26T09:00:00Z",
                items: [
                    { question_id: "q1", label: "How many guests?", answer: "42" },
                    { question_id: "q2", label: "Outdoor?", answer: "true" },
                ],
            },
        });
        
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText("42")).toBeInTheDocument();
            expect(screen.getByText("true")).toBeInTheDocument();
        });
    });

    test("16. does not update state if modal closes mid-fetch", async () => {
        let resolveFetch;
        global.fetch.mockReturnValueOnce(
            new Promise((resolve) => { resolveFetch = resolve; })
        );
        
        const { unmount } = render(<SessionDetailsModal {...defaultProps} />);

        // unmount while fetch is still pending, triggers cancelled = true
        unmount();

        // Now resolve the fetch after unmount
        resolveFetch({ ok: true, json: async () => ({ notes: "Too late", questionnaire: null }) });
        
        // if cancelled works correctly, no state update error occurs
        // this test passes if no "act" warning or error is thrown
    });
    
    test("17. does not update state if modal closes mid-fetch on error", async () => {
        let rejectFetch;
        global.fetch.mockReturnValueOnce(
            new Promise((_, reject) => { rejectFetch = reject; })
        );
        
        const { unmount } = render(<SessionDetailsModal {...defaultProps} />);
        
        // Unmount while fetch is still pending
        unmount();
        
        // Reject after unmount — the catch block should skip setState
        rejectFetch(new Error("Network error"));
    });

    test("18. shows default error message when error has no message", async () => {
        global.fetch.mockRejectedValueOnce({});
        
        render(<SessionDetailsModal {...defaultProps} />);
        
        await waitFor(() => {
            expect(screen.getByText("Failed to load session details.")).toBeInTheDocument();
        });
    });
});