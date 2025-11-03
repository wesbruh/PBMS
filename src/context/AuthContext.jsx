// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// small shape to keep the current user info consistent
// we'll store the supabase auth user plus an optional row from "User"
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // row from "User" table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!ignore) {
        setSession(session ?? null);
      }

      // if logged in, try to load the row from "User" (your custom table)
      if (session?.user?.id && !ignore) {
        const { data, error } = await supabase
          .from("User")
          .select("id, email, first_name, last_name, phone")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!ignore) {
          if (!error) {
            setProfile(data);
          } else {
            // it's ok if there is no custom row yet
            setProfile(null);
          }
        }
      } else if (!ignore) {
        setProfile(null);
      }

      if (!ignore) setLoading(false);
    }

    load();

    // listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
      } else {
        // reload profile when session changes
        (async () => {
          const { data } = await supabase
            .from("User")
            .select("id, email, first_name, last_name, phone")
            .eq("id", newSession.user.id)
            .maybeSingle();
          setProfile(data ?? null);
        })();
      }
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
