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

const duplicateErrors = [
  {
    signup_payload: {},
    profile_payload: {},
    error: { message: "already registered" }
  },
  {
    signup_payload: {},
    profile_payload: {},
    error: { message: "already exists" }
  },
  {
    signup_payload: {},
    profile_payload: {},
    signup: { User: { identities: [] } }
  },
]

const roleFetchErrors = [
  {
    body: {
      signup_payload: {},
      profile_payload: {}
    },
    data: null,
    error: "No rows found"
  },
  {
    body: {
      signup_payload: {},
      profile_payload: {}
    },
    data: [{ id: "123defaultroleid" }, { id: "123defaultroleid" }],
    error: "Multiple rows found"
  }
]

describe("anonRoutes", () => {
  test.each(duplicateErrors)("return duplicate signup errors", async (body) => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          }
        },
          {
            signup: body.signup,
            error: body.error
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: body.signup_payload, profile_payload: body.profile_payload }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "That email is already in use. Please log in instead." } });
  });

  test("return other signup error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          }
        },
          {
            signup: { User: { id: "123newuserid", identities: ["123newuserid"] } },
            error: { message: "Else error" }
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: {}, profile_payload: {} }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "Else error" } });
  });

  test("return account creation error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          }
        },
          {
            signup: { User: { id: "123newuserid", identities: ["123newuserid"] } },
            error: { }
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: {}, profile_payload: {} }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "Could not create account." } });
  });

  test.each(roleFetchErrors)("return default role fetching errors", async ({ body, data, error }) => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data,
            error
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: body.signup_payload, profile_payload: body.profile_payload }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "Internal Server Error: Role Fetching Error" } });
  });

  test.each(roleFetchErrors)("return User table upsert error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          },
          User: {
            data: null,
            error: "Error"
          },
          UserRole: {
            data: null,
            error: null
          }
        },
          {
            signup: { User: { id: "123newuserid", identities: ["123newuserid"] } },
            error: null
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: {}, profile_payload: {} }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "Internal Server Error: Data Upsert Error" } });
  });

  test.each(roleFetchErrors)("return UserRole table upsert error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          },
          User: {
            data: null,
            error: null
          },
          UserRole: {
            data: null,
            error: "Error"
          }
        },
          {
            signup: { User: { id: "123newuserid", identities: ["123newuserid"] } },
            error: null
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: {}, profile_payload: {} }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "Internal Server Error: Data Upsert Error" } });
  });

  test("return missing user id error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          },
          User: {
            data: null,
            error: null
          },
          UserRole: {
            data: null,
            error: null
          }
        },
          {
            signup: { User: { }},
            error: null
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: {}, profile_payload: {} }); // request body
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": { "message": "User ID not found." } });
  });

  test("return successful user signup with session", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Role: {
            data: { id: "123defaultroleid" },
            error: null
          },
          User: {
            data: null,
            error: null
          },
          UserRole: {
            data: null,
            error: null
          }
        },
          {
            signup: { User: { id: "123newuserid", identities: ["123newuserid"] }},
            error: null
          }
        ),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/signup")
      .send({ signup_payload: {}, profile_payload: {} }); // request body

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ "info": { "message": "We've sent you a confirmation link. Please check your email to finish creating your account." } });
  });
});