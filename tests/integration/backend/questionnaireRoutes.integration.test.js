import request from "supertest";
import { createApp } from "../../../backend/app.js";
import { createSupabaseMock } from "../../utils/backend/createSupabaseMock.js";
import { createStripeMock } from "../../utils/backend/createStripeMock.js";

const TEMPLATE_ROW = {
    id: "template-uuid-123",
    name: "Questionnaire Template",
    session_type_id: "sessionType-uuid-1",
    schema_json: [
        { id: "q1", label: "test label?", type: "text", order: 1 },
    ],
    active: true,
};

function buildApp(tableOverrides = {}) {
    return createApp({
        supabaseClient: createSupabaseMock({
            QuestionnaireTemplate: { data: TEMPLATE_ROW, error: null },
            ...tableOverrides,
        }),
        stripeClient: createStripeMock(),
        checkToken: false
    });
}

// 8 TESTS
describe("Questionnaire Routes Integration", () => {
    describe("GET templates: api/questionnaire/templates/:template_id", () => {
        test("1. returns 200 with template data", async () => {
            const app = buildApp();

            const res = await request(app)
                .get("/api/questionnaire/templates/template-uuid-123");

            expect(res.status).toBe(200);
            expect(res.body).toEqual(TEMPLATE_ROW);
        });

        test("2. returns 500 when supabse throws an error", async () => {
            jest.spyOn(console, "error").mockImplementation(() => { });
            const app = buildApp({
                QuestionnaireTemplate: { data: null, error: { message: "DB error" } },
            });

            const res = await request(app)
                .get("/api/questionnaire/templates/bad-id");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal Server Error" });
            expect(console.error).toHaveBeenCalled();
            console.error.mockRestore();
        });
    });

    describe("POST templates: /api/questionnaire/templates", () => {
        test("3. returns 200 with the inserted template", async () => {
            const app = buildApp();

            const payload = {
                name: "Questionnaire Template",
                session_type_id: "sessionType-uuid-2",
                schema_json: [],
                active: false,
            };


            const res = await request(app)
                .post("/api/questionnaire/templates")
                .send(payload);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(TEMPLATE_ROW);
        });

        test("4. returns 500 when insert fails", async () => {
            jest.spyOn(console, "error").mockImplementation(() => { });

            const app = buildApp({
                QuestionnaireTemplate: { data: null, error: { message: "Error inserting questionnaire template:" } },
            });

            const res = await request(app)
                .post("/api/questionnaire/templates")
                .send({ name: "Bad Template" });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal Server Error" });
            expect(console.error).toHaveBeenCalled();
            console.error.mockRestore();
        });
    });

    describe("PATCH templates: /api/questionnaire/templates/:template_id", () => {
        test("5. returns 200 with updated template", async () => {
            const app = buildApp();

            const res = await request(app)
                .patch("/api/questionnaire/templates/template-uuid-123")
                .send({ name: "Successful Updated Questionnaire Template" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(TEMPLATE_ROW);
        });

        test("6. returns 500 when update fails", async () => {
            jest.spyOn(console, "error").mockImplementation(() => { });
            const app = buildApp({
                QuestionnaireTemplate: { data: null, error: { message: "Error updating questionnaire template:" } },
            });

            const res = await request(app)
                .patch("/api/questionnaire/templates/template-uuid-123")
                .send({ name: "Failed Updated Questionnaire Template" });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal Server Error" });
            expect(console.error).toHaveBeenCalled();
            console.error.mockRestore();
        });
    });

    describe("PATCH templates: /api/questionnaire/templates/:template_id/set", () => {
        test("7. returns 200 after deactivating others and activating the target", async () => {
            const app = buildApp();

            const res = await request(app)
                .patch("/api/questionnaire/templates/template-uuid-123/set")
                .send({ session_type_id: "sessionType-uuid-1" });

            expect(res.status).toBe(200);
        });

        test("8. returns 500 when deactivation fails", async () => {
            jest.spyOn(console, "error").mockImplementation(() => { });
            const app = buildApp({
                QuestionnaireTemplate: { data: null, error: { message: "Error setting active questionnaire template:" } },
            });

            const res = await request(app)
                .patch("/api/questionnaire/templates/template-uuid-123/set")
                .send({ session_type_id: "sessionType-uuid-1" });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal Server Error" });
            expect(console.error).toHaveBeenCalled();
            console.error.mockRestore();
        });
        test("9. returns 500 when activation fails after successful deactivation", async () => {
            jest.spyOn(console, "error").mockImplementation(() => { });
            let callCount = 0;
            const mockClient = {
                from: jest.fn(() => {
                    callCount++;
                    const builder = {
                        select: jest.fn(() => builder),
                        insert: jest.fn(() => builder),
                        update: jest.fn(() => builder),
                        eq: jest.fn(() => builder),
                        neq: jest.fn(() => builder),
                        single: jest.fn(() => builder),
                        data: null,

                        // first from() call is deactivation has succeeded
                        // second from() call is activation has failed
                        error: callCount >= 2 ? { message: "Activation failed" } : null,
                    };
                    return builder;
                }),
            };
            const app = createApp({
                supabaseClient: mockClient,
                stripeClient: createStripeMock(),
                checkToken: false,
            });
            const res = await request(app)
                .patch("/api/questionnaire/templates/template-uuid-123/set")
                .send({ session_type_id: "sessionType-uuid-1" });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal Server Error" });
            expect(console.error).toHaveBeenCalled();
            console.error.mockRestore();
        });
    });
});