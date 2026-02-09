import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import https from "https";
//import fs from "fs";
import invoiceRoutes from "./pdf/invoice.js";
import { supabase } from "./supabaseClient.js"; // <--- Added for Admin Sessions

dotenv.config();

const app = express();

// Supabase CORS
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

/* SSL certificate
const options = {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert"),
};*/

// Admin session routes

// 1. Fetch all sessions with related User and Type data for the Admin Table
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

// 2. Update session details (Status, Location, Time) from Admin Table
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

// Admin availability routes

// --- Availability Routes ---

// Get everything needed for the grid
app.get("/api/availability", async (req, res) => {
    try {
        const { data: settings } = await supabase.from("AvailabilitySettings").select("*").single();
        const { data: blocks } = await supabase.from("AvailabilityBlocks").select("*");
        res.json({ settings, blocks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings (start/end work day)
app.post("/api/availability/settings", async (req, res) => {
    const { start, end } = req.body;
    const { data, error } = await supabase
        .from("AvailabilitySettings")
        .upsert({ work_start_time: start, work_end_time: end, id: req.body.id }) // Simplified for demo
        .select();
    if (error) return res.status(400).json(error);
    res.json(data);
});

// Bulk update blocks (The Save Button logic)
app.post("/api/availability/blocks", async (req, res) => {
    const { blocks } = req.body; // Array of blocks to upsert
    const { error } = await supabase.from("AvailabilityBlocks").upsert(blocks);
    if (error) return res.status(400).json(error);
    res.json({ message: "Schedule saved successfully" });
});



app.use("/api/invoice", invoiceRoutes);

app.get("/test-server", (_req, res) => {
    res.json({ message: "HTTPS server running and Supabase-compatible!" });
});

const PORT = process.env.PORT || 5001;

// Start HTTPS server
//https.createServer(options, app).listen(PORT, () => {
app.listen(PORT, () => {
    console.log(`HTTP Server running on http://localhost:${PORT}`);
});