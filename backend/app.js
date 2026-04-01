import crypto from "crypto";
import cors from "cors";
import express from "express";

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

export function createApp({ supabaseClient, stripeClient } = {}) {
  if (!supabaseClient) {
    throw new Error("A Supabase client must be provided when creating the PBMS app.");
  }

  if (!stripeClient) {
    throw new Error("A Stripe client must be provided when creating the PBMS app.");
  }

  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:5173",
        "https://pbms-evij.onrender.com",
        "https://pbmsbackend.onrender.com"
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    })
  );

  app.use(express.json());

  // --- Signup Route ---

  app.post("/api/signup", async (req, res) => {
    const { signup_payload, profile_payload } = req.body;

    try {
      // default role init
      const { data: defaultRole, error: defaultRoleError } = await supabaseClient
        .from("Role")
        .select("id")
        .eq("name", "User")
        .single();

      if (defaultRoleError) {
        console.error("Role not found or error fetching role: ", defaultRoleError);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp(signup_payload);

      if (signUpError) {
        const raw = signUpError.message?.toLowerCase() || "";
        if (raw.includes("already registered") || raw.includes("already exists")) {
          throw new Error({ error: { message: "That email is already in use. Please log in instead." } });
        } else {
          throw new Error({ error: { message: signUpError.message || "Could not create account." } });
        }
      }

      const authUser = signUpData.user;
      const duplicateSignup =
        authUser &&
        Array.isArray(authUser.identities) &&
        authUser.identities.length === 0;

      if (duplicateSignup) throw new Error({ error: { message: "That email is already in use. Please log in instead." } });

      // upsert into "User" and "UserRole" table
      if (authUser?.id) {
        profile_payload.id = authUser.id;
        profile_payload.is_active = !!authUser.email_confirmed_at;

        const rolePayload = {
          user_id: profile_payload.id,
          role_id: defaultRole.id,
        };

        if (signUpData?.session) {
          profile_payload.last_login_at = new Date().toISOString();
          profile_payload.is_active = true;
          // NOTE: rolePayload.assigned_at was being set before, but assigned_at isn't defined here.
          // If your table requires assigned_at, add it explicitly:
          // rolePayload.assigned_at = new Date().toISOString();
        }

        const { error: userTableErr } = await supabaseClient
          .from("User")
          .upsert(profile_payload);
        const { error: userRoleTableErr } = await supabaseClient
          .from("UserRole")
          .upsert(rolePayload);

        if (userTableErr) console.error("User upsert error:", userTableErr);
        if (userRoleTableErr) console.error("UserRole upsert error:", userRoleTableErr);
      }

      if (!signUpData.session) {
        res.status(200).json({
          "info": {
            "message": "We’ve sent you a confirmation link. Please check your email to finish creating your account."
          }
        });
      }
    } catch (error) {
      console.error("Failed to signup:", error);
      res.status(500).json(error)
    }
  });

  // --- User Profile Routes ---

  // get information related to all users
  app.get("/api/profiles", async (req, res) => {
    try {
      const { data, error } = await supabaseClient
        .from("User")
        .select("id, email, first_name, last_name, phone");

      if (error || !data) throw new Error("Could not fetch users.");

      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // get information related to a specified user
  app.get("/api/profile/:user_id", async (req, res) => {
    const { user_id } = req.params;

    try {
      const { data, error } = await supabaseClient
        .from("User")
        .select("id, email, first_name, last_name, phone, UserRole(Role(name))")
        .eq("id", user_id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        res.status(200).json(null);
      }

      const { UserRole, ...rest } = data || {};
      const roleName = (data) ? UserRole?.Role.name : null;

      res.status(200).json({ ...rest, role_name: roleName });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // update information related to a specified user
  app.patch("/api/profile/:user_id", async (req, res) => {
    const { user_id } = req.params;
    const updates = req.body;

    try {
      const { error } = await supabaseClient
        .from("User")
        .update(updates)
        .eq("id", user_id)

      if (error) throw error;

      res.status(200).json(null);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // --- Admin Session Routes ---

  // Fetch all active sessions with related data
  app.get("/api/sessions", async (req, res) => {
    try {
      const { data, error } = await supabaseClient
        .from("Session")
        .select("*, User(first_name, last_name), SessionType(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching sessions:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // retrieve session type details for specified session_type_id
  app.post("/api/sessions/type", async (req, res) => {
    const { session_type_id, session_type_name } = req.body;

    try {
      if (!session_type_id && !session_type_name) throw new Error("session_type_id and session_type_name not specified.")

      let query = supabaseClient
        .from("SessionType")
        .select();

      if (session_type_id)
        query = query.eq("id", session_type_id);
      else if (session_type_name)
        query = query.eq("name", session_type_name);

      const { data, error } = await query.single();
      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching Session Type:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Fetch specific session with related data for specified session_id (id)
  app.get("/api/sessions/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const { data, error } = await supabaseClient
        .from("Session")
        .select("*, User(id, first_name, last_name, email, phone), SessionType(name, description)")
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
      const { data, error } = await supabaseClient
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

  // --- Booking & Availability Routes ---

  // New Client Booking Route
  app.post("/api/sessions/book", async (req, res) => {
    const { client_id, session_type_id, date, start_time, end_time, location_text, notes } = req.body;

    const requestStart = new Date(`${date}T${start_time}:00`).toISOString();
    const requestEnd = new Date(`${date}T${end_time}:00`).toISOString();

    try {
      const { data, error } = await supabaseClient
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
      let { data: settings, error: settingsError } = await supabaseClient
        .from("AvailabilitySettings")
        .select("*")
        .maybeSingle();

      const { data: blocks, error: blocksError } = await supabaseClient
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
    const { data, error } = await supabaseClient
      .from("AvailabilitySettings")
      .upsert({ work_start_time: start, work_end_time: end }, { onConflict: 'id' })
      .select();

    if (error) return res.status(400).json(error);
    res.json(data);
  });

  app.post("/api/availability/blocks", async (req, res) => {
    const { blocks, rangeStart, rangeEnd } = req.body;
    try {
      await supabaseClient.from("AvailabilityBlocks").delete().gte("start_time", rangeStart).lte("start_time", rangeEnd);
      if (blocks && blocks.length > 0) {
        const { error: insertError } = await supabaseClient.from("AvailabilityBlocks").insert(blocks);
        if (insertError) throw insertError;
      }
      res.json({ message: "Schedule synced successfully" });
    } catch (error) {
      console.error("Error syncing schedule:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Stripe / Payment Routes ---

  // create and retrieve Stripe Checkout Session information
  app.post("/api/checkout/:type", async (req, res) => {
    const { type } = req.params;
    const { session_id, from_url, product_data, price, apply_tax, tax_rate } = req.body;

    // compute final price based on values passed in
    // if no price is passed in, default to 150
    let final_price = ((price) ? price : 150);

    // calculate tax as needed, default to 7.25% if tax_rate not passed
    if (apply_tax)
      final_price *= (100 + ((tax_rate) ? tax_rate : 7.25));
    else
      final_price *= 100;

    final_price = Math.round(final_price);

    if (type === "deposit") {
      try {
        const session = await stripeClient.checkout.sessions.create({
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
        const session = await stripeClient.checkout.sessions.create({
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
        res.status(500).json({ error: "Internal Server Error" });
      }
    } else {
      const errorMessage = "Unknown Checkout Type";
      console.error(`Error creating checkout session: ${errorMessage} - ${type}`,);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Retrieve Checkout Session and associated Stripe Payment Intent information
  app.get("/api/checkout/:checkout_session_id", async (req, res) => {
    const { checkout_session_id } = req.params;

    try {
      const session = await stripeClient.checkout.sessions.retrieve(checkout_session_id);
      res.status(200).json({
        session: session,
        payment_intent: session.payment_intent
      });
    } catch (error) {
      console.error('Error getting checkout session:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Capture Payment Intent
  app.post("/api/intent/capture", async (req, res) => {
    const { payment_intent } = req.body;

    try {
      const { data, error } = await stripeClient.paymentIntents.capture(payment_intent);

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error('Error capturing payment intent:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // get all payments

  // --- Questionnaire Routes ---

  app.get("/api/questionnaire/templates/:template_id", async (req, res) => {
    const { template_id } = req.params;

    try {
      const { data, error } = await supabaseClient
        .from("QuestionnaireTemplate")
        .select("id, name, session_type_id, schema_json, active")
        .eq("id", template_id)
        .single();

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // insert questionnaire template
  app.post("/api/questionnaire/templates", async (req, res) => {
    const paylod = req.body;

    try {
      const { data, error } = await supabaseClient
        .from("QuestionnaireTemplate")
        .insert(paylod)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      console.error("Error inserting questionnaire template:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // update questionnaire template details
  app.patch("/api/questionnaire/templates/:template_id", async (req, res) => {
    const { template_id: id } = req.params;
    const updates = req.body;

    try {
      const { error } = await supabaseClient
        .from("QuestionnaireTemplate")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      res.status(200).json(null);
    } catch (error) {
      console.error("Error updating questionnaire template:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // update questionnaire template details
  app.patch("/api/questionnaire/templates/:template_id/set", async (req, res) => {
    const { template_id } = req.params;
    const { session_type_id } = req.body;

    try {
      // Deactivate all other templates for this session type
      const { error: deactErr } = await supabaseClient
        .from("QuestionnaireTemplate")
        .update({ active: false })
        .eq("session_type_id", session_type_id)
        .neq("id", template_id);
      if (deactErr) throw deactErr;

      // Activate this one
      const { error: actErr } = await supabaseClient
        .from("QuestionnaireTemplate")
        .update({ active: true })
        .eq("id", template_id);

      if (actErr) throw actErr;
      res.status(200).json(null);
    } catch (error) {
      console.error("Error setting active questionnaire template:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  app.get("/test-server", (_req, res) => {
    res.json({ message: "HTTP server running and is both Supabase- and Stripe-compatible!" });
  });

  return app;
}
