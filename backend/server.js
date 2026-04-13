import dotenv from "dotenv";
import process from "node:process"
dotenv.config();

import { createApp } from "./app.js";
import { supabase } from "./supabaseClient.js";
import { stripe } from "./stripeClient.js";

const app = createApp({ supabaseClient: supabase, stripeClient: stripe });

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`HTTP Server running on ${import.meta.env.VITE_API_URL} . PORT:${PORT}.`);
});