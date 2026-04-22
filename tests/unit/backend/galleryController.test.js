import { createSupabaseMock } from "../../utils/backend/createSupabaseMock.js";

let mockActive = createSupabaseMock();

jest.mock("../../../backend/supabaseClient.js", () => ({
    get supabase() {
        return mockActive;
    },
}));

import { uploadGallery } from "../../../backend/controllers/galleryController.js";

// HELPERS 
const mockReq = (overrides = {}) => ({
    params: {galleryId: "gallery-uuid-123" },
    body: {},
    ...overrides,
});

const mockRes = () => {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};

const GALLERY_ROW = {
    id: "gallery-uuid-123",
    title: "Test Gallery",
    session_id: "session-uuid-123",
    Session: {
        start_at: "2026-04-21T09:00:00+00",
        client_id: "client-uuid-123",
        User: {
            first_name: "Test",
            last_name: "Man",
            email: "test@example.com",
        },
    },
};

//  8 TESTS
describe("uploadGallery", () => {
    const originalEnv = process.env.CLIENT_BASE_URL;

    beforeAll(() => {
        process.env.CLIENT_BASE_URL = "http://example.com";
    });

    afterAll(() => {
        process.env.CLIENT_BASE_URL = originalEnv;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. 404: gallery not found
    test("1. returns 404 if gallery is not found", async () => {
        mockActive = createSupabaseMock({
            Gallery: { data: null, error: { message: "No rows found" } },
        });

        const req = mockReq();
        const res = mockRes();

        await uploadGallery(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Gallery not found" });
    });

    // 2. 404: supabase select returns null data with no error
    test("2. returns 404 when supabase returns null data without an error", async () => {
        mockActive = createSupabaseMock({
            Gallery: { data: null, error: null },
        });

        const req = mockReq();
        const res = mockRes();

        await uploadGallery(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({error: "Gallery not found"});
    });

    // 3. 200: gallery publish successfully
    test("3. returns 200 when publishes gallery and with link", async () => {
        mockActive = createSupabaseMock({
            Gallery: { data: GALLERY_ROW, error: null },
        });

        const req = mockReq();
        const res = mockRes();

        await uploadGallery(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            message: "Gallery Published and client notified via email",
            galleryId: "gallery-uuid-123",
            published_link: "http://example.com/dashboard",
        });
    });

    // 4. 200: gallery published with expires_at
    test("4. passess expires_at through to the update call", async () => {
        mockActive = createSupabaseMock({
            Gallery: {data: GALLERY_ROW, error: null},
        });
        const expiresDate = "2026-05-01T00:00:00Z";
        const req = mockReq(mockReq({ body: { expires_at: expiresDate } }));
        const res = mockRes();
        

        await uploadGallery(req, res);

        const galleryBuilder = mockActive.from.mock.results[1].value;;
        expect(galleryBuilder.update).toHaveBeenCalledWith(
            expect.objectContaining({
                published_link: "http://example.com/dashboard",
                expires_at: expiresDate,
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    // 5. verify null expires_at when body omits it
    test("5. sets expires_at to null when not provided in body", async () => {
        mockActive = createSupabaseMock({
            Gallery: {data: GALLERY_ROW, error: null},
        });

        const req = mockReq(); // no expires_at in body
        const res = mockRes();

        await uploadGallery(req, res);

        const galleryBuilder = mockActive.from.mock.results[1].value;;
        expect(galleryBuilder.update).toHaveBeenCalledWith(
            expect.objectContaining({ expires_at: null })
        );
    });

    // 6. 500: database update failure
    test("6. returns 500 when gallery update fails", async () => {
        const selectBuilder = {
            data: GALLERY_ROW,
            error: null,
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn(function () {
                // after update is called flip error for the eq call to simulate update failure
                if (this._updating) {
                    this.data = null;
                    this.error = { message: "Update failed" };
                    this._updating = false; // reset for any future calls
                }
                return this;
            }),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockReturnThis(),
            _updating: false,
        };

        // intercept the update call to set the _updating flag so we can simulate an update failure in the eq call
        selectBuilder.update.mockImplementation(function () {
            selectBuilder._updating = true;
            return selectBuilder;
        });
        mockActive = {
            from: jest.fn(() => selectBuilder),
        };

        const req = mockReq();
        const res = mockRes();

        await uploadGallery(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Failed to update gallery" });
    });

    // 7. 500: unexpected exception
    test("7. returns 500 when an unexpected error is thrown", async () => {
        const throwBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(() => {
                throw new Error("An unexpected error occurred");
            }),
        };
        mockActive= {from: jest.fn(() => throwBuilder)};

        const req = mockReq();
        const res = mockRes();
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        await uploadGallery(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({error: "An unexpected error occurred"});
        consoleSpy.mockRestore();
    });

    // 8. verify correct supabase query structure
    test("8. queries the Gallery table with Session and User joins", async () => {
        mockActive = createSupabaseMock({
            Gallery: { data: null, error: { message: "Not found" } },
        });

        const req = mockReq({ params: { galleryId: "test-uuid-123" } });
        const res = mockRes();

        await uploadGallery(req, res);

        expect(mockActive.from).toHaveBeenCalledWith("Gallery");

        const builder = mockActive.from.mock.results[0].value;
        expect(builder.select).toHaveBeenCalledWith(expect.stringContaining("Session"));
        expect(builder.select).toHaveBeenCalledWith(expect.stringContaining("User"));
        expect(builder.eq).toHaveBeenCalledWith("id", "test-uuid-123");
        expect(builder.single).toHaveBeenCalled();
    });
});