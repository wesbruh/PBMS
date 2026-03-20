import dotenv from "dotenv";
import { createApp } from "./app.js";
import invoiceRoutes from "./pdf/invoice.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import { supabase } from "./supabaseClient.js";
import process from "node:process"
dotenv.config();

import { supabase } from "./supabaseClient.js";
import { stripe } from "./stripeClient.js"

import contractRoutes from "./routes/contractRoutes.js"
import contactRoutes from "./routes/contactRoutes.js"
import invoiceRoutes from "./pdf/invoice.js";
import receiptRoutes from "./pdf/receipt.js";
import galleryRoutes from "./routes/galleryRoutes.js";

const app = createApp({ supabaseClient: supabase });

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());

// --- Routes ---

app.use("/api/contract", contractRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/gallery", galleryRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});
