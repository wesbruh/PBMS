export async function signInUser(supabaseClient) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL,
    password: process.env.TEST_USER_PASSWORD
  });

  if (error) throw error;

  return;
}

export async function signInAdmin(supabaseClient) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD
  });

  if (error) throw error;

  return;
}

export async function getSession(supabaseClient) {
  const { data: { session } }= await supabaseClient.auth.getSession();
  
  return { "access_token": (session) ? session?.access_token : "" };
}