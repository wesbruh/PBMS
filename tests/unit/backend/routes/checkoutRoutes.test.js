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
const from_url = "testfrom";
const deposit_product_data = {
  name: 'Default Package - Deposit',
  description: 'Default Package Description'
};
const rest_product_data = {
  name: 'Default Package - Rest',
  description: 'Default Package Description'
};
const price = 100;
const tax_rate = 10;

describe("checkoutRoutes", () => {
  test("return /api/checkout/deposit post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { error }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, deposit_product_data, price, apply_tax: true, tax_rate });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/checkout/deposit post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, deposit_product_data, price, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/deposit post succes missing deposit_product_data", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, price, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/deposit post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, deposit_product_data, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/deposit post success missing tax_rate", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, deposit_product_data, price, apply_tax: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/deposit post success missing apply_tax", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, deposit_product_data, price });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/deposit post success apply no tax", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/deposit")
      .send({ from_url, deposit_product_data, price, apply_tax: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/rest post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { error }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, rest_product_data, price, apply_tax: true, tax_rate });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/checkout/rest post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, rest_product_data, price, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

    test("return /api/checkout/rest post missing from_url", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ rest_product_data, price, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/rest post succes missing rest_product_data", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, price, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/rest post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, rest_product_data, apply_tax: true, tax_rate });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/rest post success missing tax_rate", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, rest_product_data, price, apply_tax: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/rest post success missing apply_tax", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, rest_product_data, price });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/rest post success apply no tax", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id, url }
        }),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/checkout/rest")
      .send({ from_url, rest_product_data, price, apply_tax: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, url });
  });

  test("return /api/checkout/:checkout_session_id get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: null
        }),
        checkToken: false
      });

    const response = await request(app).get("/api/checkout/123checkoutsessionid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/checkout/:checkout_session_id get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock(),
        stripeClient: createStripeMock({
          checkoutSession: { id },
          paymentIntent: { id }
        }),
        checkToken: false
      });

    const response = await request(app).get("/api/checkout/123checkoutsessionid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, payment_intent: { id } });
  });
});