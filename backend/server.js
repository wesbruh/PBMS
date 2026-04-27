import dotenv from "dotenv";
import process from "node:process"
dotenv.config();

import { createApp } from "./app.js";
import { supabase } from "./supabaseClient.js";
import { stripe } from "./stripeClient.js";

export function buildServerApp({
  supabaseClient = supabase,
  stripeClient = stripe,
} = {}) {
  return createApp({ supabaseClient, stripeClient });
}

export function getServerPort(env) {
  const resolvedEnv = env || process.env;
  /* istanbul ignore next */
  if (!resolvedEnv) return 5001;
  return resolvedEnv.PORT || 5001;
}

export function startServer({ app, port }) {
  return app.listen(port, () => {
    console.log(`HTTP Server running on ${port}.`);
  });
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  startServer({ app: buildServerApp(), port: getServerPort() });
}
