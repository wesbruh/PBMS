import { buildBookingPayload, createApp } from "../../../backend/app.js";
import { createStripeMock } from "../../utils/backend/createStripeMock.js";
import { createSupabaseMock } from "../../utils/backend/createSupabaseMock.js";

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

describe("buildBookingPayload", () => {
  test("creates a normalized booking record for Supabase inserts", () => {
    const timestamp = new Date("2026-03-18T18:45:00.000Z");
    const payload = buildBookingPayload(
      {
        client_id: "",
        session_type_id: "portrait",
        date: "2026-04-01",
        start_time: "09:30",
        end_time: "10:30",
        location_text: "Sacramento",
        notes: "",
      },
      timestamp
    );

    expect(payload.client_id).toBeNull();
    expect(payload.session_type_id).toBe("portrait");
    expect(payload.start_at).toBe(new Date("2026-04-01T09:30:00").toISOString());
    expect(payload.end_at).toBe(new Date("2026-04-01T10:30:00").toISOString());
    expect(payload.status).toBe("Pending");
    expect(payload.notes).toBeNull();
    expect(payload.created_at).toBe(timestamp.toISOString());
    expect(payload.updated_at).toBe(timestamp.toISOString());
    expect(payload.id).toEqual(expect.any(String));
  });

  test("preserves provided identifiers and notes when present", () => {
    const timestamp = new Date("2026-03-18T18:45:00.000Z");
    const payload = buildBookingPayload(
      {
        client_id: "client-1",
        session_type_id: "wedding",
        date: "2026-05-02",
        start_time: "12:00",
        end_time: "14:00",
        location_text: "Napa",
        notes: "Bring props",
      },
      timestamp
    );

    expect(payload.client_id).toBe("client-1");
    expect(payload.session_type_id).toBe("wedding");
    expect(payload.notes).toBe("Bring props");
  });

  test("fills in default timestamps and null session types when omitted", () => {
    const payload = buildBookingPayload({
      client_id: "client-2",
      session_type_id: "",
      date: "2026-06-10",
      start_time: "08:00",
      end_time: "09:00",
      location_text: "Studio",
      notes: "Morning shoot",
    });

    expect(payload.session_type_id).toBeNull();
    expect(payload.created_at).toEqual(expect.any(String));
    expect(payload.updated_at).toEqual(expect.any(String));
  });
});

describe("createApp", () => {
  test("requires injected clients", () => {
    expect(() => createApp()).toThrow(
      "A Supabase client must be provided when creating the PBMS app."
    );
    expect(() =>
      createApp({ supabaseClient: createSupabaseMock() })
    ).toThrow("A Stripe client must be provided when creating the PBMS app.");
  });

  test("allows approved CORS origins on the health route", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock(),
      stripeClient: createStripeMock(),
      checkToken: false,
    });
    const corsMiddleware = app.router.stack[0].handle;
    const res = createResponse();
    let nextError = "not-called";

    await corsMiddleware(
      {
        headers: { origin: "http://localhost:5173" },
        method: "GET",
      },
      res,
      (error) => {
        nextError = error ?? null;
      }
    );

    expect(nextError).toBeNull();
  });

  test("allows requests with no origin header and enables auth by default", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock(),
      stripeClient: createStripeMock(),
    });
    const corsMiddleware = app.router.stack[0].handle;
    const res = createResponse();
    let nextError = "not-called";

    await corsMiddleware(
      {
        headers: {},
        method: "GET",
      },
      res,
      (error) => {
        nextError = error ?? null;
      }
    );

    expect(nextError).toBeNull();
    expect(app.router.stack[4].name).toBe("<anonymous>");
  });

  test("rejects disallowed CORS origins", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock(),
      stripeClient: createStripeMock(),
      checkToken: false,
    });
    const corsMiddleware = app.router.stack[0].handle;
    const res = createResponse();
    let nextError = null;

    await corsMiddleware(
      {
        headers: { origin: "https://nope.example.com" },
        method: "GET",
      },
      res,
      (error) => {
        nextError = error;
      }
    );

    expect(nextError).toEqual(expect.any(Error));
    expect(nextError.message).toBe("Not allowed by CORS");
  });

  test("adds the auth verifier and health route handlers", async () => {
    const app = createApp({
      supabaseClient: {
        auth: { getClaims: jest.fn() },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(),
            })),
          })),
        })),
      },
      stripeClient: createStripeMock(),
      checkToken: true,
    });
    const healthHandler = app.router.stack.find(
      (layer) => layer.route?.path === "/test-server"
    ).route.stack[0].handle;
    const res = createResponse();

    healthHandler({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      message: "HTTP server running and is both Supabase- and Stripe-compatible!",
    });
    expect(app.router.stack[4].name).toBe("<anonymous>");
  });
});
