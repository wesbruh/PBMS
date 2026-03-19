import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import process from "node:process"
import invoiceRoutes from "./pdf/invoice.js";
import { supabase } from "./supabaseClient.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import Stripe from "stripe";
import receiptRoutes from "./pdf/receipt.js";

dotenv.config();

const app = express();

// stripe secrets
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());

// --- Admin Session Routes ---

// Fetch all active sessions with related User and Type data
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
                deposit_cs_id,
                User:client_id (first_name, last_name),
                SessionType:session_type_id (name)
            `)
          .eq("is_active", true);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching sessions:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Fetch specific session for related session_id
app.get("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;

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
                deposit_cs_id,
                User:client_id (first_name, last_name),
                SessionType:session_type_id (name)
            `)
      .eq("id", id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching session:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update session details
app.patch("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  // console.log(updates); DEBUGGING
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

// --- Contract Routes ---

// get active contract templates
app.get("/api/contract/templates", async (_, res) => {
  try {
    const { data, error } = await supabase
      .from("ContractTemplate")
      .select("id, name, body")
      .eq("active", true);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching contract Id:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// get basic contract
app.post("/api/contract", async (req, res) => {
  const { user_id, session_id } = req.body;
  const now = new Date().toISOString();

  try {
    if (session_id) {
      // select Contract table entry
      const { data: contractData, error: contractError } = await supabase
        .from("Contract")
        .select()
        .eq("assigned_user_id", user_id)
        .eq("session_id", session_id)
        .eq("is_active", false)
        .single();

      if (contractError) throw contractError;
      res.status(200).json(contractData);
    } else {
      // delete all current, inactive user contract entries
      await supabase
        .from("Contract")
        .delete()
        .eq("assigned_user_id", user_id)
        .eq("is_active", false);

      // create new Contract table entry
      const { data: contractData, error: contractError } = await supabase
        .from("Contract")
        .insert({ assigned_user_id: user_id, status: "Draft", created_at: now, updated_at: now, is_active: false })
        .select()
        .single();

      if (contractError) throw contractError;
      res.status(200).json(contractData);
    }
  } catch (error) {
    console.error("Error getting contract:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// update contract details
app.patch("/api/contract/:id", async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  const updates = { ...req.body, updated_at: now };

  try {
    const { data, error } = await supabase
      .from("Contract")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating contract:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
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
        client_id: client_id || null,
        session_type_id: session_type_id || null,
        start_at: requestStart,
        end_at: requestEnd,
        location_text: location_text,
        status: "Pending",
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .maybeSingle();

    if (error) throw error;
    res.status(201).json(data);
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

/* Stripe */

// create and retrieve Stripe Checkout Session information
app.post("/api/payment/:type", async (req, res) => {
  const { type } = req.params;
  const { session_id, from_url, product_data, price, apply_tax, tax_rate } = req.body

  // compute final price based on values passed in
  // if no price is passed in, default to 150
  let final_price = ((price) ? price : 150);

  // calculate tax as needed, default to 5% if tax_rate not passed
  if (apply_tax)
    final_price *= (100 + ((tax_rate) ? tax_rate : 5))
  else
    final_price *= 100

  if (type === "deposit") {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: product_data || {
                name: 'Default Package - Deposit',
                description: 'Default Package Description'
              },
              unit_amount: final_price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        payment_intent_data: {
          capture_method: 'manual',
        },
        success_url: `http://localhost:5173/dashboard/inquiry?session_id=${session_id}&checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: from_url
      });

      res.status(200).json({
        id: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Error creating deposit checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (type === "rest") {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: product_data || {
                name: 'Default Package - Rest',
                description: 'Default Package Description'
              },
              unit_amount: final_price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'http://localhost:5173/dashboard?checkout_session_id={CHECKOUT_SESSION_ID}',
        cancel_url: from_url ||
          'http://localhost:5173/dashboard'
      });

      res.status(200).json({
        id: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Error creating rest checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    const errorMessage = "Unknown Checkout Type";
    console.error(`Error creating checkout session: ${errorMessage} - ${type}`,);
    res.status(500).json({ error: errorMessage });
  }
});

// Retrieve Checkout Session and associated Stripe Payment Intent information
app.get("/api/checkout/:checkout_session_id", async (req, res) => {
  try {
    const { checkout_session_id } = req.params;
    const session = await stripe.checkout.sessions.retrieve(checkout_session_id);
    res.status(200).json({
      session: session,
      payment_intent: session.payment_intent
    });
  } catch (error) {
    console.error('Error getting checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/intent/capture", async (req, res) => {
  try {
    const { payment_intent } = req.body;
    const { data, error} = await stripe.paymentIntents.capture(payment_intent);
    
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error capturing payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Miscellaneous Routes ---

app.use("/api/invoice", invoiceRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/receipts", receiptRoutes);

app.get("/test-server", (_req, res) => {
  res.json({ message: "HTTP server running and Supabase-compatible!" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`HTTP Server running on http://localhost:${PORT}`);
});
