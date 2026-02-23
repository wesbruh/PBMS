import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto"; // Added for UUID generation
import invoiceRoutes from "./pdf/invoice.js";
import { supabase } from "./supabaseClient.js";

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

// --- Booking Route ---

app.post("/api/sessions/book", async (req, res) => {
    const { client_id, session_type_id, date, start_time, end_time, location_text, notes } = req.body;

    // Convert to ISO strings for Postgres timestamptz
    const requestStart = new Date(`${date}T${start_time}:00`).toISOString();
    const requestEnd = new Date(`${date}T${end_time}:00`).toISOString();

    try {
        // NOTE: Your Availability table uses `availability_rule`, `valid_from`, and `valid_to`. 
        // Logic to parse rules goes here before insertion.

        // Insert directly into the Session table
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

app.use("/api/invoice", invoiceRoutes);

app.get("/test-server", (_req, res) => {
    res.json({ message: "HTTP server running and Supabase-compatible!" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`HTTP Server running on http://localhost:${PORT}`);
});