import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import SessionPage from "./Session.jsx";

/**
 * Resolves and passes:
 * - user: the signed-in user from AuthContext
 * - client: the admin calendar owner (whose id goes into "Session"."client_id")
 *
 * Priority for admin id:
 *  1) VITE_ADMIN_CLIENT_ID in .env (frontend)
 *  2) First user found with Role.name='admin' via Role/UserRole
 */
export default function SessionRoute() {
  const { user, profile } = useAuth();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // #1 use env if provided
        const envAdminId = import.meta.env.VITE_ADMIN_CLIENT_ID;
        if (envAdminId) {
          setClient({ id: envAdminId });
          setLoading(false);
          return;
        }

        // #2 resolve by role tables
        // 2a) get admin role id
        const { data: roleRow, error: roleErr } = await supabase
          .from("Role")
          .select("id")
          .eq("name", "admin")
          .maybeSingle();
        if (roleErr) throw roleErr;

        if (roleRow?.id) {
          // 2b) first user assigned to role
          const { data: urRows, error: urErr } = await supabase
            .from("UserRole")
            .select("user_id")
            .eq("role_id", roleRow.id)
            .order("assigned_at", { ascending: true })
            .limit(1);
          if (urErr) throw urErr;

          if (urRows && urRows.length > 0) {
            setClient({ id: urRows[0].user_id });
          } else {
            // Fallback: pick the earliest created user as the admin if no role assignment exists
            const { data: anyUser, error: anyErr } = await supabase
              .from("User")
              .select("id")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (anyErr) throw anyErr;
            if (anyUser?.id) setClient({ id: anyUser.id });
            else setErr("No admin user found to own the calendar.");
          }
        } else {
          // No 'admin' role row; fallback strategy
          const { data: anyUser, error: anyErr } = await supabase
            .from("User")
            .select("id")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (anyErr) throw anyErr;
          if (anyUser?.id) setClient({ id: anyUser.id });
          else setErr("No users exist to own the calendar.");
        }
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to resolve admin calendar owner.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!user) {
    // ProtectedRoute should already guard this
    return <div className="max-w-3xl mx-auto p-8">Please sign in to book a session.</div>;
  }
  if (loading) {
    return <div className="max-w-3xl mx-auto p-8">Loading…</div>;
  }
  if (err || !client?.id) {
    return <div className="max-w-3xl mx-auto p-8 text-red-600 text-sm">{err || "Missing admin calendar owner."}</div>;
  }

  // Pass the signed-in user and the admin client to the booking page
  return <SessionPage user={user} client={client} />;
}
