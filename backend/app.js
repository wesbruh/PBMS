import crypto from "crypto";

// router
import cors from "cors";
import express from "express";

// routes
import anonRoutes from "./routes/anonRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js"
import checkoutRoutes from "./routes/checkoutRoutes.js"
import contractRoutes from "./routes/contractRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import intentRoutes from "./routes/intentRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import questionnaireRoutes from "./routes/questionnaireRoutes.js";
import receiptRoutes from "./routes/receiptRoutes.js";
import sessionsRoutes from "./routes/sessionsRoutes.js";
import { verifyToken } from "./authmiddle/authUsers.js";

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
    status: "Pending",
    notes: notes || null,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function createApp({ supabaseClient, stripeClient, checkToken=true } = {}) {
  if (!supabaseClient) {
    throw new Error("A Supabase client must be provided when creating the PBMS app.");
  }

  if (!stripeClient) {
    throw new Error("A Stripe client must be provided when creating the PBMS app.");
  }

  const app = express();

  const allowedOrigins = ["http://localhost:5173", "https://www.yourrootsphotography.space"];
  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    })
  );

  app.use(express.json());

  // --- Routes ---

  // add anon routes -- no verification needed
  app.use("/api", anonRoutes(supabaseClient));

  // server testing
  app.get("/test-server", (_req, res) => {
    res.json({ message: "HTTP server running and is both Supabase- and Stripe-compatible!" });
  });

  // ensure all following routes verify Supabase JWT token
  if (checkToken)
    app.use(verifyToken(supabaseClient));

  // add routes that need verification

  // --- User Profile Routes ---
  app.use("/api/profile", profileRoutes(supabaseClient));

  // --- Admin Session and Booking Routes ---
  // General Session Routes
  app.use("/api/sessions", sessionsRoutes(supabaseClient));

  // Contract Routes
  app.use("/api/contract", contractRoutes(supabaseClient));

  // Availability Routes
  app.use("/api/availability", availabilityRoutes(supabaseClient));

  // Questionnaire Routes
  app.use("/api/questionnaire", questionnaireRoutes(supabaseClient));

  // --- Payment Routes ---
  // General Payment Routes
  app.use("/api/invoice", invoiceRoutes(supabaseClient));
  app.use("/api/receipts", receiptRoutes(supabaseClient));

  // Stripe Routes
  app.use("/api/checkout", checkoutRoutes(stripeClient));
  app.use("/api/intent", intentRoutes(stripeClient));

  // --- Gallery Routes ---
  app.use("/api/gallery", galleryRoutes(supabaseClient));

  return app;
}