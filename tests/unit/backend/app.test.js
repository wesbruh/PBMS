import { buildBookingPayload } from "../../../backend/app.js";

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
});
