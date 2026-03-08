import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import process from "node:process";
dotenv.config();

export const supabase = createClient(
  process.env.URL,
  process.env.SERVICE_ROLE_KEY
);
