import dotenv from "dotenv";
import { createApp } from "./app.js";
import invoiceRoutes from "./pdf/invoice.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import { supabase } from "./supabaseClient.js";

dotenv.config();

const app = createApp({ supabaseClient: supabase });
app.use("/api/invoice", invoiceRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/receipts", receiptRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});
