import { supabase } from "backend/supabaseClient.js";

async function signInUser() {
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL,
    password: process.env.TEST_USER_PASSWORD
  });

  if (error)
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) 
}