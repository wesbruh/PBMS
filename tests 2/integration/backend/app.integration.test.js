import request from "supertest";
import { createApp } from "../../../backend/app.js";
import { createSupabaseMock } from "../../utils/backend/createSupabaseMock.js";

describe("backend app integration", () => {
  test("responds to the health endpoint", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock(),
    });
    const response = await request(app).get("/test-server");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "HTTP server running and Supabase-compatible!",
    });
  });

  test("returns availability data from the injected Supabase client", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        AvailabilitySettings: {
          data: { work_start_time: "09:00", work_end_time: "17:00" },
          error: null,
        },
        AvailabilityBlocks: {
          data: [{ id: "block-1", start_time: "2026-03-19T09:00:00.000Z" }],
          error: null,
        },
      }),
    });

    const response = await request(app).get("/api/availability");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      settings: { work_start_time: "09:00", work_end_time: "17:00" },
      blocks: [{ id: "block-1", start_time: "2026-03-19T09:00:00.000Z" }],
    });
  });
});
