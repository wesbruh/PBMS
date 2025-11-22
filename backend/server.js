import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import https from "https";
//import fs from "fs";
import invoiceRoutes from "./pdf/invoice.js";


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

// Routes
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