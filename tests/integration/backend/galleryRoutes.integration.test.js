import request from "supertest";
import { createApp } from "../../../backend/app.js";
import { createSupabaseMock } from "../../utils/backend/createSupabaseMock.js";
import { createStripeMock } from "../../utils/backend/createStripeMock.js";

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

function buildApp(tableOverrides = {}) {
    return createApp({
        supabaseClient: createSupabaseMock({
            Gallery: { data: GALLERY_ROW, error: null },
            ...tableOverrides,
        }),
        stripeClient: createStripeMock(),
        checkToken: false
    });
}

describe("Gallery Routes Integration", () => {
    const originalEnv = process.env.CLIENT_BASE_URL;
    
    beforeAll(() => {
        process.env.CLIENT_BASE_URL = "http://example.com";
    });
    
    afterAll(() => {
        process.env.CLIENT_BASE_URL = originalEnv;
    });

    // 2 TESTS
    //successful publish
    test("1. PATCH returns 200 on success: /api/gallery/:galleryId/upload", async () => {
        const app = buildApp();

        const res = await request(app)
        .patch("/api/gallery/gallery-uuid-123/upload")
        .send({ expires_at: "2026-04-26T00:00:00Z" });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            message: "Gallery Published and client notified via email",
            galleryId: "gallery-uuid-123",
            published_link: "http://example.com/dashboard",
        });
    });

    // no gallery
    test("2. PATCH returns 404 when gallery not found: /api/gallery/:galleryId/upload", async () => {
        const app = buildApp({
            Gallery: { data: null, error: { message: "No rows found" } },
        });

        const res = await request(app)
        .patch("/api/gallery/gallery-uuid-123/upload")
        .send({});

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
           error: "Gallery not found",
        });
    });
});