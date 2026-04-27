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

describe("sessionsRoutes", () => {
  test("return /api/sessions get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: null,
            error: "Error",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/sessions");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return null api/sessions get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: null,
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/sessions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(null);
  });

  test("return single api/sessions get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: [{ id: "123sessionid" }],
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/sessions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123sessionid" }]);
  });

  test("return multi api/sessions get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: [{ id: "123sessionid" }, { id: "123sessionid" }],
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/sessions");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123sessionid" }, { id: "123sessionid" }]);
  });

  test("return /api/sessions/types post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: null,
            error: "Error",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).post("/api/sessions/types");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return null api/sessions/types post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: null,
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).post("/api/sessions/types");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(null);
  });

  test("return single api/sessions/types post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: [{ id: "123sessiontypeid" }],
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).post("/api/sessions/types");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123sessiontypeid" }]);
  });

  test("return multi api/sessions/types post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: [{ id: "123sessiontypeid" }, { id: "123sessiontypeid" }],
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).post("/api/sessions/types");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: "123sessiontypeid" }, { id: "123sessiontypeid" }]);
  });

  test("return /api/sessions/type none specified type post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: null,
            error: "Error",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/sessions/type")
      .send({});
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/sessions/type session_type_id null post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: null,
            error: "No rows found",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/sessions/type")
      .send({ session_type_id: "123sessiontypeid" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/sessions/type session_type_name null post error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: null,
            error: "No rows found",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/sessions/type")
      .send({ session_type_name: "123sessiontypename" });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/sessions/type session_type_id post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: { session_type_id: "123sessiontypeid" },
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/sessions/type")
      .send({ session_type_id: "123sessiontypeid" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ session_type_id: "123sessiontypeid" });
  });

  test("return /api/sessions/type session_type_name post success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          SessionType: {
            data: { session_type_name: "123sessiontypename" },
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .post("/api/sessions/type")
      .send({ session_type_name: "123sessiontypename" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ session_type_name: "123sessiontypename" });
  });

  test("return /api/sessions/:id get error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: null,
            error: "Error",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/sessions/123sessionid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/sessions/:id get success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: { id: "123sessionid" },
            error: null,
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app).get("/api/sessions/123sessionid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123sessionid" });
  });

  test("return /api/sessions/:id patch error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: null,
            error: "Error",
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .patch("/api/sessions/:123sessionid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/sessions/:id patch success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            data: { id: "123sessionid" },
            error: null
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .patch("/api/sessions/:123sessionid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "123sessionid" });
  });

  test("return /api/sessions/:id delete error", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            status: 403
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .delete("/api/sessions/:123sessionid");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ "error": "Internal Server Error" });
  });

  test("return /api/sessions/:id delete success", async () => {
    const app = createApp(
      {
        supabaseClient: createSupabaseMock({
          Session: {
            status: 204
          }
        }),
        stripeClient: createStripeMock(),
        checkToken: false
      });

    const response = await request(app)
      .delete("/api/sessions/:123sessionid");

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });

  test("return /api/sessions/book post error", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: null,
          error: { message: "Error" }
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    const response = await request(app)
      .post("/api/sessions/book")
      .send({
        client_id: "123userid",
        session_type_id: "123sessiontypeid",
        date: "2026-01-01",
        start_time: "10:00",
        end_time: "11:00",
        location_text: "Test Location",
        notes: "Test notes"
      });
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error" });
  });

  test("return /api/sessions/book post success", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: { id: "123sessionid" },
          error: null
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    const response = await request(app)
      .post("/api/sessions/book ")
      .send({
        client_id: "123userid",
        session_type_id: "123sessiontypeid",
        date: "2026-01-01",
        start_time: "10:00",
        end_time: "11:00",
        location_text: "Test Location",
        notes: null
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: "123sessionid" });
  });

  test("return /api/sessions/:id/details get error", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: null,
          error: "Error"
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    jest.spyOn(console, "error").mockImplementation(() => { });
    const response = await request(app)
      .get("/api/sessions/123sessionid/details");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/sessions/:id/details get QuestionnaireResponse table error", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: {
            id: "123sessionid",
            notes: "Session notes"
          },
          error: null
        },
        QuestionnaireResponse: {
          data: null,
          error: "Error"
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    jest.spyOn(console, "error").mockImplementation(() => { });
    const response = await request(app)
      .get("/api/sessions/123sessionid/details");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/sessions/:id/details get QuestionnaireAnswer table error", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: {
            id: "123sessionid",
            notes: "Session notes"
          },
          error: null
        },
        QuestionnaireResponse: {
          data: {
            id: "123questionnaireresponseid",
            status: "Submitted",
            submitted_at: "2026-01-01",
            QuestionnaireTemplate: {
              name: "Session Type Questionnaire"
            }
          },
          error: null
        },
        QuestionnaireAnswer: {
          data: null,
          error: "Error"
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    jest.spyOn(console, "error").mockImplementation(() => { });
    const response = await request(app)
      .get("/api/sessions/123sessionid/details");
    expect(console.error).toHaveBeenCalled();

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });

  test("return /api/sessions/:id/details get success with an empty questionnaire", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: {
            id: "123sessionid",
            notes: "Session notes"
          },
          error: null
        },
        QuestionnaireResponse: {
          data: null,
          error: null
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    const response = await request(app)
      .get("/api/sessions/123sessionid/details");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      notes: "Session notes",
      questionnaire: null
    });
  });


  test("return /api/sessions/:id/details get success with an empty questionnaire", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: {
            id: "123sessionid",
            notes: "Session notes"
          },
          error: null
        },
        QuestionnaireResponse: {
          data: {
            id: "123questionnaireresponseid",
            status: "Submitted",
            submitted_at: "2026-01-01",
            QuestionnaireTemplate: {
              name: "Session Type Questionnaire"
            }
          },
          error: null,
        },
        QuestionnaireAnswer: {
          data: null,
          error: null,
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    const response = await request(app)
      .get("/api/sessions/123sessionid/details");

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe("Session notes");
    expect(response.body.questionnaire.template_name).toBe("Session Type Questionnaire");
    expect(response.body.questionnaire.status).toBe("Submitted");
    expect(response.body.questionnaire.items.length).toBe(0);
  });

  test("return /api/sessions/:id/details get success with questionnaire", async () => {
    const app = createApp({
      supabaseClient: createSupabaseMock({
        Session: {
          data: {
            id: "123sessionid",
            notes: null
          },
          error: null,
        },
        QuestionnaireResponse: {
          data: {
            id: "123questionnaireresponseid",
            status: "Submitted",
            submitted_at: "2026-01-01",
            QuestionnaireTemplate: {
              name: "Session Type Questionnaire"
            }
          },
          error: null,
        },
        QuestionnaireAnswer: {
          data: [
            {
              question_id: "123questionid1",
              question: { order_idx: 1 },
              answer: "Yes"
            },
            {
              question_id: "123questionid2",
              question: { order_idx: 2 },
              answer: "No"
            }
          ],
          error: null,
        }
      }),
      stripeClient: createStripeMock(),
      checkToken: false
    });

    const response = await request(app)
      .get("/api/sessions/123sessionid/details");

    expect(response.status).toBe(200);
    expect(response.body.notes).toBe(null);
    expect(response.body.questionnaire.template_name).toBe("Session Type Questionnaire");
    expect(response.body.questionnaire.status).toBe("Submitted");
    expect(response.body.questionnaire.items.length).toBe(2);
  });
});