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

describe("contractRoutes", () => {
  test("return /api/contract/templates get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          ContractTemplate: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/templates");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/templates empty ContractTemplate table get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          ContractTemplate: {
            data: null,
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/templates");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(null);
  });

  test("return /api/contract/templates get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          ContractTemplate: {
            data: [{ id: "123contracttemplateid" }],
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/templates");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123contracttemplateid" }]);
  });

  test("return /api/contract/templates/:id get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          ContractTemplate: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/templates/123contracttemplateid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/templates/:id get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          ContractTemplate: {
            data: { id: "123contracttemplateid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/templates/123contracttemplateid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123contracttemplateid" });
  });

  test("return /api/contract post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract")
      .send({ user_id: "123userid" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract post error with specified session_id", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract")
      .send({ user_id: "123userid", session_id: "123sessionid" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: { id: "123contractid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract")
      .send({ user_id: "123userid" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123contractid" });
  });

  test("return /api/contract post success with specified session_id", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: { id: "123contractid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract")
      .send({ user_id: "123userid", session_id: "123sessionid" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123contractid" });
  });

  test("return /api/contract/user/:user_id get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/user/123userid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/user/:user_id none found get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/user/123userid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(null);
  });

  test("return /api/contract/user/:user_id one found get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: [{ id: "123contractid" }],
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/user/123userid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123contractid" }]);
  });

  test("return /api/contract/user/:user_id multiple found get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: [{ id: "123contractid" }, { id: "123contractid" }],
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/user/123userid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123contractid" }, { id: "123contractid" }]);
  });

  test("return /api/contract/:contract_id post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract/123contractid")
      .send({ user_id: "123userid" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/:contract_id post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: { id: "123contractid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract/123contractid")
      .send({ user_id: "123userid" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123contractid" });
  });

  test("return /api/contract/:id get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/123contractid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/:id get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: { id: "123contractid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/contract/123contractid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123contractid" });
  });

  test("return /api/contract/:id patch error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: null,
            error: "Error"
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .patch("/api/contract/123contractid")
      .send({});
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/:id patch success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Contract: {
            data: { id: "123contractid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .patch("/api/contract/123contractid")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123contractid" });
  });

  test("return /api/contract/:id/sign post error on upload", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          "Signed-contracts": {
            uploadError: { message: "Error" }
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract/123contractid/sign")
      .send({ file_path: "123filepath", data_url: "data:image/png;base64,123dataurl" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/:id/sign post error on public url", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          "Signed-contracts": {
            urlData: null,
            urlError: { message: "Error" }
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract/123contractid/sign")
      .send({ file_path: "123filepath", data_url: "data:image/png;base64,123dataurl" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/contract/:id/sign post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          "Signed-contracts": {
            urlData: { url: "123url" },
            urlError: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/contract/123contractid/sign")
      .send({ file_path: "123filepath", data_url: "data:image/png;base64,123dataurl" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ url: "123url" });
  });
});