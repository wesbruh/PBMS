import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto"; // Added for UUID generation
import invoiceRoutes from "./pdf/invoice.js";
import { supabase } from "./supabaseClient.js"; // <--- Added for Admin Sessions
import galleryRoutes from "./routes/galleryRoutes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());

// --- Admin Session Routes ---

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

// Admin contract

// Get Default Contract Id
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
})

// Generate Contract for User based on session Id
app.post("/api/contract/generate/:session_id", async (req, res) => {
  const { session_id } = req.params;
  const { template_id } = req.body;

  const now = new Date().toISOString();
  try {
    // Fetch user_id for session
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
      .insert({ template_id: template_id, assigned_user_id: user_id, session_id: session_id, status: "Draft", created_at: now, updated_at: now })
      .select();

    if (contractError) throw contractError;
    res.json(contractData);
  } catch (error) {
    console.error("Error creating contract:", error);
    res.status(500).json({ error: error });
  }
});

// --- Booking Route ---

// 1. GET: Fetch settings and existing red blocks
app.get("/api/availability", async (req, res) => {
  try {
    // Fetch Settings
    let { data: settings, error: settingsError } = await supabase
      .from("AvailabilitySettings")
      .select("*")
      .maybeSingle(); // Use maybeSingle to avoid error if empty

    // Fetch Red Blocks
    const { data: blocks, error: blocksError } = await supabase
      .from("AvailabilityBlocks")
      .select("*");

    if (settingsError) console.error("Settings Error:", settingsError);
    if (blocksError) console.error("Blocks Error:", blocksError);

    res.json({
      settings: settings || null,
      blocks: blocks || []
    });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. POST: Save/Update Global Settings (Start/End Time)
app.post("/api/availability/settings", async (req, res) => {
  const { start, end } = req.body;

  // Check if a settings row exists first to get the ID, or just insert new
  // For simplicity, we assume one admin user or just update the first row found
  // Ideally, I will have to pass the admin_user_id

  const { data, error } = await supabase
    .from("AvailabilitySettings")
    .upsert({
      // If you have a specific ID you want to enforce, put it here, 
      // otherwise we need to find the existing one or create one.
      // For now, let's just create/update a generic one.
      work_start_time: start,
      work_end_time: end
    }, { onConflict: 'id' }) // Handling conficts can be adjusted
    .select();

  if (error) return res.status(400).json(error);
  res.json(data);
});


//3.  Bulk update blocks (The Sync Logic)
app.post("/api/availability/blocks", async (req, res) => {
  const { blocks, rangeStart, rangeEnd } = req.body;

  try {
    // 1. DELETE existing blocks within the visible range 
    // (This effectively "deletes" the green ones by removing the old red records)
    const { error: deleteError } = await supabase
      .from("AvailabilityBlocks")
      .delete()
      .gte("start_time", rangeStart)   // Greater than or equal to start of view
      .lte("start_time", rangeEnd);    // Less than or equal to end of view

    if (deleteError) throw deleteError;

    // 2. INSERT the new Red blocks (if any exist)
    // We filter the blocks to ensure we only insert ones that fall in the range 
    // (just a safety check, though frontend should handle this)
    if (blocks && blocks.length > 0) {
      const { error: insertError } = await supabase
        .from("AvailabilityBlocks")
        .insert(blocks);

      if (insertError) throw insertError;
    }

    res.json({ message: "Schedule synced successfully" });

  } catch (error) {
    console.error("Error syncing schedule:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.use("/api/invoice", invoiceRoutes);

app.get("/test-server", (_req, res) => {
  res.json({ message: "HTTPS server running and Supabase-compatible!" });
});

// for gallery upload and publish
app.use("/api/gallery", galleryRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});