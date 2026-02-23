import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto"; 
import invoiceRoutes from "./pdf/invoice.js";
import { supabase } from "./supabaseClient.js"; 
import galleryRoutes from "./routes/galleryRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());

// --- Admin Session Routes ---

// Fetch all sessions with related User and Type data
app.get("/api/sessions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Session")
      .select(`
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

// Update session details
app.patch("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
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

// --- Admin Contract Routes ---

app.get("/api/contract/template/default", async (req, res) => {
  try {
    const { data, error } = await supabase
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
    const { data: userSessionData, error: userSessionError } = await supabase
      .from("Session")
      .select("client_id")
      .eq("id", session_id)
      .eq("status", "Confirmed")
      .single();

    if (userSessionError) throw userSessionError;
    
    const user_id = userSessionData.client_id;

    const { data: contractData, error: contractError } = await supabase
      .from("Contract")
      .insert({ template_id, assigned_user_id: user_id, session_id, status: "Draft", created_at: now, updated_at: now })
      .select();

    if (contractError) throw contractError;
    res.json(contractData);
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ error: error });
  }
});

// --- Booking & Availability Routes ---

// New Client Booking Route
app.post("/api/sessions/book", async (req, res) => {
    const { client_id, session_type_id, date, start_time, end_time, location_text, notes } = req.body;

    const requestStart = new Date(`${date}T${start_time}:00`).toISOString();
    const requestEnd = new Date(`${date}T${end_time}:00`).toISOString();

    try {
        const { data, error } = await supabase
            .from("Session")
            .insert([{
                id: crypto.randomUUID(), 
                client_id: client_id || null, 
                session_type_id: session_type_id || null, 
                start_at: requestStart,
                end_at: requestEnd,
                location_text: location_text,
                status: "pending", 
                notes: notes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Booking Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/availability", async (req, res) => {
  try {
    let { data: settings, error: settingsError } = await supabase
      .from("AvailabilitySettings")
      .select("*")
      .maybeSingle();

    const { data: blocks, error: blocksError } = await supabase
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
  const { data, error } = await supabase
    .from("AvailabilitySettings")
    .upsert({ work_start_time: start, work_end_time: end }, { onConflict: 'id' })
    .select();

  if (error) return res.status(400).json(error);
  res.json(data);
});

app.post("/api/availability/blocks", async (req, res) => {
  const { blocks, rangeStart, rangeEnd } = req.body;
  try {
    await supabase.from("AvailabilityBlocks").delete().gte("start_time", rangeStart).lte("start_time", rangeEnd);
    if (blocks && blocks.length > 0) {
      const { error: insertError } = await supabase.from("AvailabilityBlocks").insert(blocks);
      if (insertError) throw insertError;
    }
    res.json({ message: "Schedule synced successfully" });
  } catch (error) {
    console.error("Error syncing schedule:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Miscellaneous Routes ---

app.use("/api/invoice", invoiceRoutes);
app.use("/api/gallery", galleryRoutes);

app.get("/test-server", (_req, res) => {
  res.json({ message: "HTTP server running and Supabase-compatible!" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});