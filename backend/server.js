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

// --- Availability Routes ---

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

// 3. POST: Save Red Blocks
app.post("/api/availability/blocks", async (req, res) => {
    const { blocks } = req.body;
    
    if (!blocks || blocks.length === 0) return res.json({ message: "No blocks to save" });

    // Will have to delete blocks turned green
    
    const { error } = await supabase
        .from("AvailabilityBlocks")
        .upsert(blocks, { onConflict: 'start_time' }); // Ensure unique start_times prevent duplicates if you set unique constraints in SQL

    if (error) {
        console.error(error);
        return res.status(400).json(error);
    }
    
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