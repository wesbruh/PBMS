import express from "express";
import request from "supertest";
import availabilityRoutes from "../../../backend/routes/availabilityRoutes";

describe("availabilityRoutes", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  function buildApp(
    supabaseClient,
    user = { id: "admin-123", role: { name: "Admin" } }
  ) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use("/availability", availabilityRoutes(supabaseClient));
    return app;
  }

  test("GET /availability returns newest settings row and blocks", async () => {
    const orderSettings = jest.fn().mockResolvedValue({
      data: [
        {
          id: "settings-new",
          work_start_time: "09:00:00",
          work_end_time: "18:00:00",
          timezone: "America/Los_Angeles",
          updated_at: "2026-04-26T10:00:00.000Z",
        },
        {
          id: "settings-old",
          work_start_time: "08:00:00",
          work_end_time: "16:00:00",
          timezone: "America/Los_Angeles",
          updated_at: "2026-04-25T10:00:00.000Z",
        },
      ],
      error: null,
    });

    const selectSettings = jest.fn(() => ({
      order: orderSettings,
    }));

    const selectBlocks = jest.fn().mockResolvedValue({
      data: [
        {
          id: "block-1",
          start_time: "2026-04-27T09:00:00.000Z",
          end_time: "2026-04-27T09:15:00.000Z",
        },
      ],
      error: null,
    });

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { select: selectSettings };
      }
      if (table === "AvailabilityBlocks") {
        return { select: selectBlocks };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app).get("/availability");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      settings: {
        id: "settings-new",
        work_start_time: "09:00:00",
        work_end_time: "18:00:00",
        timezone: "America/Los_Angeles",
        updated_at: "2026-04-26T10:00:00.000Z",
      },
      blocks: [
        {
          id: "block-1",
          start_time: "2026-04-27T09:00:00.000Z",
          end_time: "2026-04-27T09:15:00.000Z",
        },
      ],
    });

    expect(selectSettings).toHaveBeenCalledWith("*");
    expect(orderSettings).toHaveBeenCalledWith("updated_at", { ascending: false });
  });

  test("GET /availability falls back to null and empty array when queries return no rows", async () => {
    const orderSettings = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const selectSettings = jest.fn(() => ({
      order: orderSettings,
    }));

    const selectBlocks = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { select: selectSettings };
      }
      if (table === "AvailabilityBlocks") {
        return { select: selectBlocks };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app).get("/availability");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      settings: null,
      blocks: [],
    });
  });

  test("GET /availability logs query errors and still responds", async () => {
    const orderSettings = jest.fn().mockResolvedValue({
      data: [],
      error: { message: "settings warning" },
    });

    const selectSettings = jest.fn(() => ({
      order: orderSettings,
    }));

    const selectBlocks = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "blocks warning" },
    });

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { select: selectSettings };
      }
      if (table === "AvailabilityBlocks") {
        return { select: selectBlocks };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app).get("/availability");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      settings: null,
      blocks: [],
    });

    expect(console.error).toHaveBeenCalledWith("Settings Error:", {
      message: "settings warning",
    });
    expect(console.error).toHaveBeenCalledWith("Blocks Error:", {
      message: "blocks warning",
    });
  });

  test("GET /availability returns 500 when an unexpected error is thrown", async () => {
    const orderSettings = jest.fn().mockRejectedValue(new Error("db crashed"));

    const selectSettings = jest.fn(() => ({
      order: orderSettings,
    }));

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { select: selectSettings };
      }
      if (table === "AvailabilityBlocks") {
        return { select: jest.fn() };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app).get("/availability");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "db crashed" });
    expect(console.error).toHaveBeenCalledWith(
      "Server Error:",
      expect.any(Error)
    );
  });

  test("POST /availability/settings inserts a new singleton row when none exists", async () => {
    const maybeExistingOrder = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const selectExisting = jest.fn(() => ({
      order: maybeExistingOrder,
    }));

    const singleInsert = jest.fn().mockResolvedValue({
      data: {
        id: "uuid-1",
        admin_user_id: "admin-123",
        work_start_time: "09:00",
        work_end_time: "18:00",
        timezone: "America/Los_Angeles",
      },
      error: null,
    });

    const selectAfterInsert = jest.fn(() => ({
      single: singleInsert,
    }));

    const insert = jest.fn(() => ({
      select: selectAfterInsert,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) {
        return { select: selectExisting };
      }
      if (callNumber === 2) {
        return { insert };
      }

      throw new Error("Unexpected AvailabilitySettings call count");
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "18:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "uuid-1",
      admin_user_id: "admin-123",
      work_start_time: "09:00",
      work_end_time: "18:00",
      timezone: "America/Los_Angeles",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: "admin-123",
        work_start_time: "09:00",
        work_end_time: "18:00",
        timezone: "America/Los_Angeles",
        updated_at: expect.any(String),
      })
    );
  });

  test("POST /availability/settings updates the existing singleton row", async () => {
    const existingOrder = jest.fn().mockResolvedValue({
      data: [{ id: "uuid-existing" }],
      error: null,
    });

    const selectExisting = jest.fn(() => ({
      order: existingOrder,
    }));

    const singleUpdate = jest.fn().mockResolvedValue({
      data: {
        id: "uuid-existing",
        admin_user_id: "admin-123",
        work_start_time: "08:00",
        work_end_time: "16:00",
        timezone: "America/Los_Angeles",
      },
      error: null,
    });

    const selectAfterUpdate = jest.fn(() => ({
      single: singleUpdate,
    }));

    const eqUpdate = jest.fn(() => ({
      select: selectAfterUpdate,
    }));

    const update = jest.fn(() => ({
      eq: eqUpdate,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) {
        return { select: selectExisting };
      }
      if (callNumber === 2) {
        return { update };
      }

      throw new Error("Unexpected AvailabilitySettings call count");
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "08:00",
        end: "16:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "uuid-existing",
      admin_user_id: "admin-123",
      work_start_time: "08:00",
      work_end_time: "16:00",
      timezone: "America/Los_Angeles",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_user_id: "admin-123",
        work_start_time: "08:00",
        work_end_time: "16:00",
        timezone: "America/Los_Angeles",
        updated_at: expect.any(String),
      })
    );
    expect(eqUpdate).toHaveBeenCalledWith("id", "uuid-existing");
  });

  test("POST /availability/settings deletes duplicate rows after updating the primary row", async () => {
    const existingOrder = jest.fn().mockResolvedValue({
      data: [{ id: "uuid-1" }, { id: "uuid-2" }, { id: "uuid-3" }],
      error: null,
    });

    const selectExisting = jest.fn(() => ({
      order: existingOrder,
    }));

    const singleUpdate = jest.fn().mockResolvedValue({
      data: {
        id: "uuid-1",
        admin_user_id: "admin-123",
        work_start_time: "09:00",
        work_end_time: "17:00",
        timezone: "America/Los_Angeles",
      },
      error: null,
    });

    const selectAfterUpdate = jest.fn(() => ({
      single: singleUpdate,
    }));

    const eqUpdate = jest.fn(() => ({
      select: selectAfterUpdate,
    }));

    const update = jest.fn(() => ({
      eq: eqUpdate,
    }));

    const inDelete = jest.fn().mockResolvedValue({
      error: null,
    });

    const deleteDupes = jest.fn(() => ({
      in: inDelete,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) {
        return { select: selectExisting };
      }
      if (callNumber === 2) {
        return { update };
      }
      if (callNumber === 3) {
        return { delete: deleteDupes };
      }

      throw new Error("Unexpected AvailabilitySettings call count");
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "17:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(200);
    expect(inDelete).toHaveBeenCalledWith("id", ["uuid-2", "uuid-3"]);
  });

  test("POST /availability/settings falls back to default timezone when none is provided", async () => {
    const maybeExistingOrder = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const selectExisting = jest.fn(() => ({
      order: maybeExistingOrder,
    }));

    const singleInsert = jest.fn().mockResolvedValue({
      data: {
        id: "uuid-1",
        admin_user_id: "admin-123",
        work_start_time: "09:00",
        work_end_time: "17:00",
        timezone: "America/Los_Angeles",
      },
      error: null,
    });

    const selectAfterInsert = jest.fn(() => ({
      single: singleInsert,
    }));

    const insert = jest.fn(() => ({
      select: selectAfterInsert,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) {
        return { select: selectExisting };
      }
      if (callNumber === 2) {
        return { insert };
      }

      throw new Error("Unexpected AvailabilitySettings call count");
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "17:00",
      });

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: "America/Los_Angeles",
      })
    );
  });

  test("POST /availability/settings returns 400 when start or end is missing", async () => {
    const app = buildApp({ from: jest.fn() });

    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Start and end time are required.",
    });
  });

  test("POST /availability/settings returns 500 when lookup fails", async () => {
    const existingOrder = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "lookup failed" },
    });

    const selectExisting = jest.fn(() => ({
      order: existingOrder,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return { select: selectExisting };
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "17:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "lookup failed" });
  });

  test("POST /availability/settings returns 400 when insert fails", async () => {
    const maybeExistingOrder = jest.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const selectExisting = jest.fn(() => ({
      order: maybeExistingOrder,
    }));

    const singleInsert = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });

    const selectAfterInsert = jest.fn(() => ({
      single: singleInsert,
    }));

    const insert = jest.fn(() => ({
      select: selectAfterInsert,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) {
        return { select: selectExisting };
      }
      if (callNumber === 2) {
        return { insert };
      }

      throw new Error("Unexpected AvailabilitySettings call count");
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "17:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "insert failed" });
  });

  test("POST /availability/settings returns 400 when update fails", async () => {
    const existingOrder = jest.fn().mockResolvedValue({
      data: [{ id: "uuid-existing" }],
      error: null,
    });

    const selectExisting = jest.fn(() => ({
      order: existingOrder,
    }));

    const singleUpdate = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "update failed" },
    });

    const selectAfterUpdate = jest.fn(() => ({
      single: singleUpdate,
    }));

    const eqUpdate = jest.fn(() => ({
      select: selectAfterUpdate,
    }));

    const update = jest.fn(() => ({
      eq: eqUpdate,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilitySettings") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) {
        return { select: selectExisting };
      }
      if (callNumber === 2) {
        return { update };
      }

      throw new Error("Unexpected AvailabilitySettings call count");
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "17:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "update failed" });
  });

  test("POST /availability/settings returns 403 for non-admin users", async () => {
    const app = buildApp(
      { from: jest.fn() },
      { id: "student-1", role: { name: "Student" } }
    );

    const response = await request(app)
      .post("/availability/settings")
      .send({
        start: "09:00",
        end: "17:00",
        timezone: "America/Los_Angeles",
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Forbidden" });
  });

  test("POST /availability/blocks deletes old and range blocks, inserts new blocks, and returns success", async () => {
    const deletePastLte = jest.fn().mockResolvedValue({});
    const deletePast = jest.fn(() => ({
      lte: deletePastLte,
    }));

    const deleteRangeLte = jest.fn().mockResolvedValue({});
    const deleteRangeGte = jest.fn(() => ({
      lte: deleteRangeLte,
    }));
    const deleteRange = jest.fn(() => ({
      gte: deleteRangeGte,
    }));

    const insert = jest.fn().mockResolvedValue({ error: null });

    const from = jest.fn((table) => {
      if (table !== "AvailabilityBlocks") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) return { delete: deletePast };
      if (callNumber === 2) return { delete: deleteRange };
      if (callNumber === 3) return { insert };

      throw new Error("Unexpected AvailabilityBlocks call count");
    });

    const app = buildApp({ from });

    const response = await request(app)
      .post("/availability/blocks")
      .send({
        rangeStart: "2026-02-23T00:00:00.000Z",
        rangeEnd: "2026-02-23T23:59:59.999Z",
        blocks: [
          {
            start_time: "2026-02-23T09:00:00.000Z",
            end_time: "2026-02-23T10:00:00.000Z",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Schedule synced successfully",
    });

    expect(deletePastLte).toHaveBeenCalledWith(
      "start_time",
      expect.any(String)
    );
    expect(deleteRangeGte).toHaveBeenCalledWith(
      "start_time",
      "2026-02-23T00:00:00.000Z"
    );
    expect(deleteRangeLte).toHaveBeenCalledWith(
      "start_time",
      "2026-02-23T23:59:59.999Z"
    );
    expect(insert).toHaveBeenCalledWith([
      {
        start_time: "2026-02-23T09:00:00.000Z",
        end_time: "2026-02-23T10:00:00.000Z",
      },
    ]);
  });

  test("POST /availability/blocks skips insert when blocks array is empty", async () => {
    const deletePastLte = jest.fn().mockResolvedValue({});
    const deletePast = jest.fn(() => ({
      lte: deletePastLte,
    }));

    const deleteRangeLte = jest.fn().mockResolvedValue({});
    const deleteRangeGte = jest.fn(() => ({
      lte: deleteRangeLte,
    }));
    const deleteRange = jest.fn(() => ({
      gte: deleteRangeGte,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilityBlocks") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) return { delete: deletePast };
      if (callNumber === 2) return { delete: deleteRange };

      throw new Error("Insert should not be called when blocks is empty");
    });

    const app = buildApp({ from });

    const response = await request(app)
      .post("/availability/blocks")
      .send({
        rangeStart: "2026-02-23T00:00:00.000Z",
        rangeEnd: "2026-02-23T23:59:59.999Z",
        blocks: [],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Schedule synced successfully",
    });
  });

  test("POST /availability/blocks skips insert when blocks is missing", async () => {
    const deletePastLte = jest.fn().mockResolvedValue({});
    const deletePast = jest.fn(() => ({
      lte: deletePastLte,
    }));

    const deleteRangeLte = jest.fn().mockResolvedValue({});
    const deleteRangeGte = jest.fn(() => ({
      lte: deleteRangeLte,
    }));
    const deleteRange = jest.fn(() => ({
      gte: deleteRangeGte,
    }));

    const from = jest.fn((table) => {
      if (table !== "AvailabilityBlocks") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) return { delete: deletePast };
      if (callNumber === 2) return { delete: deleteRange };

      throw new Error("Insert should not be called when blocks is missing");
    });

    const app = buildApp({ from });

    const response = await request(app)
      .post("/availability/blocks")
      .send({
        rangeStart: "2026-02-23T00:00:00.000Z",
        rangeEnd: "2026-02-23T23:59:59.999Z",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Schedule synced successfully",
    });
  });

  test("POST /availability/blocks returns 500 and logs when insert fails", async () => {
    const deletePastLte = jest.fn().mockResolvedValue({});
    const deletePast = jest.fn(() => ({
      lte: deletePastLte,
    }));

    const deleteRangeLte = jest.fn().mockResolvedValue({});
    const deleteRangeGte = jest.fn(() => ({
      lte: deleteRangeLte,
    }));
    const deleteRange = jest.fn(() => ({
      gte: deleteRangeGte,
    }));

    const insert = jest.fn().mockResolvedValue({
      error: new Error("insert failed"),
    });

    const from = jest.fn((table) => {
      if (table !== "AvailabilityBlocks") {
        throw new Error(`Unexpected table: ${table}`);
      }

      const callNumber = from.mock.calls.length;

      if (callNumber === 1) return { delete: deletePast };
      if (callNumber === 2) return { delete: deleteRange };
      if (callNumber === 3) return { insert };

      throw new Error("Unexpected AvailabilityBlocks call count");
    });

    const app = buildApp({ from });

    const response = await request(app)
      .post("/availability/blocks")
      .send({
        rangeStart: "2026-02-23T00:00:00.000Z",
        rangeEnd: "2026-02-23T23:59:59.999Z",
        blocks: [
          {
            start_time: "2026-02-23T09:00:00.000Z",
            end_time: "2026-02-23T10:00:00.000Z",
          },
        ],
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "insert failed" });
    expect(console.error).toHaveBeenCalledWith(
      "Error syncing schedule:",
      "insert failed"
    );
  });

  test("POST /availability/blocks returns 403 for non-admin users", async () => {
    const app = buildApp(
      { from: jest.fn() },
      { id: "student-1", role: { name: "Student" } }
    );

    const response = await request(app)
      .post("/availability/blocks")
      .send({
        rangeStart: "2026-02-23T00:00:00.000Z",
        rangeEnd: "2026-02-23T23:59:59.999Z",
        blocks: [],
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Forbidden" });
  });
});