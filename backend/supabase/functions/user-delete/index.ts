import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Read the Authorization header and extract the Bearer token
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    // If no token, user is not authenticated
    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing Bearer token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedTargetUserId = body?.targetUserId ?? null;

    
    const supabaseUserClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: userData, error: userError } =
      await supabaseUserClient.auth.getUser(token);

    if (userError) {
      return new Response(
        JSON.stringify({ ok: false, error: userError.message }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const user = userData.user;

    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not authenticated" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create an admin client (service role key) to delete from database and auth
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

     // Default: self-delete
    let targetUserId = user.id;

    // If deleting someone else, caller must be admin
    if (requestedTargetUserId && requestedTargetUserId !== user.id) {
      const adminRoleId = Deno.env.get("ADMIN_ROLE_ID") ?? "";

      if (!adminRoleId) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing ADMIN_ROLE_ID env var" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: adminRoleRow, error: adminRoleError } = await supabaseAdmin
        .from("UserRole")
        .select("user_id, role_id")
        .eq("user_id", user.id)
        .eq("role_id", adminRoleId)
        .maybeSingle();

      if (adminRoleError) {
        return new Response(
          JSON.stringify({ ok: false, error: adminRoleError.message }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!adminRoleRow) {
        return new Response(
          JSON.stringify({ ok: false, error: "Only admins can delete other users" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      targetUserId = requestedTargetUserId;
    }

    // Delete child rows first to avoid FK constraint errors
    // UserRole has a foreign key (user_id) referencing User.id
    
    const { error: userRoleError } = await supabaseAdmin
      .from("UserRole")
      .delete()
      .eq("user_id", targetUserId);

    if (userRoleError) {
      throw userRoleError;
    }

    // Delete the user row from your public "User" table
    const { error: userTableError } = await supabaseAdmin
      .from("User")
      .delete()
      .eq("id", targetUserId);

    if (userTableError) {
      throw userTableError;
    }

    // Delete the user from Supabase Auth
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
      throw authDeleteError;
    }

    // Success response
    return new Response(JSON.stringify({ ok: true, success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Return the error message for debugging purposes
    return new Response(
      JSON.stringify({
        ok: false,
        message: (err as any)?.message ?? String(err),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});