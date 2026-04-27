import { createApp } from "../../../backend/app.js";
import availabilityRoutes from "../../../backend/routes/availabilityRoutes.js";
import { createSupabaseMock } from "../../utils/backend/createSupabaseMock.js";
import { createStripeMock } from "../../utils/backend/createStripeMock.js";

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("backend app integration", () => {
  test("responds to the health endpoint", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock(),
      stripeClient: createStripeMock(),
      checkToken: false,
    });
    const response = createResponse();
    const healthHandler = app.router.stack.find(
      (layer) => layer.route?.path === "/test-server"
    ).route.stack[0].handle;
    healthHandler({}, response);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: "HTTP server running and is both Supabase- and Stripe-compatible!",
    });
  });

  test("returns availability data from the injected Supabase client", async () => {
    const router = availabilityRoutes(
      createSupabaseMock({
        AvailabilitySettings: {
          data: [
            {
              id: "settings-1",
              work_start_time: "09:00",
              work_end_time: "17:00",
              timezone: "America/Los_Angeles",
              updated_at: "2026-03-19T08:00:00.000Z",
            },
          ],
          error: null,
        },
        AvailabilityBlocks: {
          data: [
            {
              id: "block-1",
              start_time: "2026-03-19T09:00:00.000Z",
            },
          ],
          error: null,
        },
      })
    );
    const response = createResponse();
    const handler = router.stack.find(
      (layer) => layer.route?.path === "" && layer.route.methods.get
    ).route.stack[0].handle;
    await handler({}, response);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      settings: {
        id: "settings-1",
        work_start_time: "09:00",
        work_end_time: "17:00",
        timezone: "America/Los_Angeles",
        updated_at: "2026-03-19T08:00:00.000Z",
      },
      blocks: [
        {
          id: "block-1",
          start_time: "2026-03-19T09:00:00.000Z",
        },
      ],
    });
  });
});