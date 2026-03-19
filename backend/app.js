import crypto from "crypto";
import cors from "cors";
import express from "express";

export function buildBookingPayload(bookingRequest, now = new Date()) {
  const {
    client_id,
    session_type_id,
    date,
    start_time,
    end_time,
    location_text,
    notes,
  } = bookingRequest;
  const timestamp = now.toISOString();

  return {
    id: crypto.randomUUID(),
    client_id: client_id || null,
    session_type_id: session_type_id || null,
    start_at: new Date(`${date}T${start_time}:00`).toISOString(),
    end_at: new Date(`${date}T${end_time}:00`).toISOString(),
    location_text,
    status: "pending",
    notes: notes || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createApp({ supabaseClient } = {}) {
  if (!supabaseClient) {
    throw new Error("A Supabase client must be provided when creating the PBMS app.");
  }

  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:5173"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    })
  );

  app.use(express.json());

  app.get("/api/sessions", async (_req, res) => {
    try {
      const { data, error } = await supabaseClient.from("Session").select(`
                id,
                client_id,
                session_type_id,
                start_at,
                end_at,
                location_text,
                status,
                User:client_id (first_name, last_name),
                SessionType:session_type_id (name)
            `);

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error fetching sessions:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
      const { data, error } = await supabaseClient
        .from("Session")
        .update(updates)
        .eq("id", id)
        .select();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error updating session:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/contract/template/default", async (_req, res) => {
    try {
      const { data, error } = await supabaseClient
        .from("ContractTemplate")
        .select("id")
        .eq("name", "Default Template")
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Error fetching contract Id:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/contract/generate/:session_id", async (req, res) => {
    const { session_id } = req.params;
    const { template_id } = req.body;
    const now = new Date().toISOString();

    try {
      const { data: userSessionData, error: userSessionError } = await supabaseClient
        .from("Session")
        .select("client_id")
        .eq("id", session_id)
        .eq("status", "Confirmed")
        .single();

      if (userSessionError) throw userSessionError;

      const userId = userSessionData.client_id;
      const { data: contractData, error: contractError } = await supabaseClient
        .from("Contract")
        .insert({
          template_id,
          assigned_user_id: userId,
          session_id,
          status: "Draft",
          created_at: now,
          updated_at: now,
        })
        .select();

      if (contractError) throw contractError;
      res.json(contractData);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ error });
    }
  });

  app.post("/api/sessions/book", async (req, res) => {
    try {
      const payload = buildBookingPayload(req.body);
      const { data, error } = await supabaseClient
        .from("Session")
        .insert([payload])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error) {
      console.error("Booking Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/availability", async (_req, res) => {
    try {
      const { data: settings, error: settingsError } = await supabaseClient
        .from("AvailabilitySettings")
        .select("*")
        .maybeSingle();

      const { data: blocks, error: blocksError } = await supabaseClient
        .from("AvailabilityBlocks")
        .select("*");

      if (settingsError) console.error("Settings Error:", settingsError);
      if (blocksError) console.error("Blocks Error:", blocksError);

      res.json({ settings: settings || null, blocks: blocks || [] });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/availability/settings", async (req, res) => {
    const { start, end } = req.body;
    const { data, error } = await supabaseClient
      .from("AvailabilitySettings")
      .upsert({ work_start_time: start, work_end_time: end }, { onConflict: "id" })
      .select();

    if (error) {
      return res.status(400).json(error);
    }

    res.json(data);
  });

  app.post("/api/availability/blocks", async (req, res) => {
    const { blocks, rangeStart, rangeEnd } = req.body;

    try {
      await supabaseClient
        .from("AvailabilityBlocks")
        .delete()
        .gte("start_time", rangeStart)
        .lte("start_time", rangeEnd);

      if (blocks && blocks.length > 0) {
        const { error: insertError } = await supabaseClient.from("AvailabilityBlocks").insert(blocks);
        if (insertError) throw insertError;
      }

      res.json({ message: "Schedule synced successfully" });
    } catch (error) {
      console.error("Error syncing schedule:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/test-server", (_req, res) => {
    res.json({ message: "HTTP server running and Supabase-compatible!" });
  });

  return app;
}
