import request from "supertest";
import { createApp } from "../../../../backend/app.js";
import { createSupabaseMock } from "../../../utils/backend/createSupabaseMock.js";
import { createStripeMock } from "../../../utils/backend/createStripeMock.js";

// silence console.error during each test
let consoleSpy;
beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => {
  consoleSpy.mockRestore();
});

// mock data
const error = { message: "Error" };
const id = "123testid"
const url = "123testurl";

describe("intentRoutes", () => {
  test("return /api/intent/capture post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { error }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/capture")
      .send({ payment_intent_id: id });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/intent/capture post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { id }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/capture")
      .send({ payment_intent_id: id });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, status: "succeeded" });
  });

  test("return /api/intent/cancel post error on already refunded payment", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { status: "succeeded" },
          refund: { error: { message: "Error", code: "charge_already_refunded"} }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/cancel")
      .send({ payment_intent_id: id });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/intent/cancel post error on other error code", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { status: "succeeded" },
          refund: { error: { message: "Error", code: "other"} }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/cancel")
      .send({ payment_intent_id: id });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/intent/cancel post error on not succeeded", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { status: "not_succeeded" }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/cancel")
      .send({ payment_intent_id: id });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/intent/cancel post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { id, status: "succeeded" }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/cancel")
      .send({ payment_intent_id: id });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  test("return /api/intent/uncapture post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { status: "not_requires_capture" }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/uncapture")
      .send({ payment_intent_id: id });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/intent/uncapture post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          paymentIntent: { id, status: "requires_capture" }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/intent/uncapture")
      .send({ payment_intent_id: id });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});