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

  function buildApp(supabaseClient, user = { role: { name: "Admin" } }) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    app.use("/availability", availabilityRoutes(supabaseClient));
    return app;
  }

  test("GET /availability returns settings and blocks", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 1, work_start_time: "09:00:00", work_end_time: "17:00:00" },
      error: null,
    });

    const selectSettings = jest.fn(() => ({
      maybeSingle,
    }));

    const selectBlocks = jest.fn().mockResolvedValue({
      data: [
        {
          id: 10,
          start_time: "2026-02-23T09:00:00.000Z",
          end_time: "2026-02-23T10:00:00.000Z",
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
      settings: { id: 1, work_start_time: "09:00:00", work_end_time: "17:00:00" },
      blocks: [
        {
          id: 10,
          start_time: "2026-02-23T09:00:00.000Z",
          end_time: "2026-02-23T10:00:00.000Z",
        },
      ],
    });
  });

  test("GET /availability logs query errors and falls back to null and empty array", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "settings warning" },
    });

    const selectSettings = jest.fn(() => ({
      maybeSingle,
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
    const maybeSingle = jest.fn().mockRejectedValue(new Error("db crashed"));

    const selectSettings = jest.fn(() => ({
      maybeSingle,
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

  test("POST /availability/settings upserts the single settings row for admin and returns data", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 1, work_start_time: "09:00:00", work_end_time: "17:00:00" },
      error: null,
    });

    const select = jest.fn(() => ({
      single,
    }));

    const upsert = jest.fn(() => ({
      select,
    }));

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { upsert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({ start: "09:00:00", end: "17:00:00" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      work_start_time: "09:00:00",
      work_end_time: "17:00:00",
    });

    expect(upsert).toHaveBeenCalledWith(
      [{ id: 1, work_start_time: "09:00:00", work_end_time: "17:00:00" }],
      { onConflict: "id" }
    );
    expect(select).toHaveBeenCalled();
    expect(single).toHaveBeenCalled();
  });

  test("POST /availability/settings uses explicit id when provided", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 7, work_start_time: "08:00:00", work_end_time: "16:00:00" },
      error: null,
    });

    const select = jest.fn(() => ({
      single,
    }));

    const upsert = jest.fn(() => ({
      select,
    }));

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { upsert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({ id: 7, start: "08:00:00", end: "16:00:00" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 7,
      work_start_time: "08:00:00",
      work_end_time: "16:00:00",
    });

    expect(upsert).toHaveBeenCalledWith(
      [{ id: 7, work_start_time: "08:00:00", work_end_time: "16:00:00" }],
      { onConflict: "id" }
    );
  });

  test("POST /availability/settings returns 400 when upsert fails", async () => {
    const single = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "bad payload" },
    });

    const select = jest.fn(() => ({
      single,
    }));

    const upsert = jest.fn(() => ({
      select,
    }));

    const from = jest.fn((table) => {
      if (table === "AvailabilitySettings") {
        return { upsert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const app = buildApp({ from });
    const response = await request(app)
      .post("/availability/settings")
      .send({ start: "bad", end: "data" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "bad payload" });
  });

  test("POST /availability/settings returns 403 for non-admin users", async () => {
    const app = buildApp(
      { from: jest.fn() },
      { role: { name: "Student" } }
    );

    const response = await request(app)
      .post("/availability/settings")
      .send({ start: "09:00:00", end: "17:00:00" });

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
      { role: { name: "Student" } }
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