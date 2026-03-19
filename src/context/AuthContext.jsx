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

      // if logged in, try to load the row from "User" and user's role name
      if (session?.user?.id && !ignore) {
        const response = await fetch(`http://localhost:5001/api/profile/${session.user.id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!ignore) {
          if (response.ok) {
            const data = await response.json();

            if (!data) setProfile(null);

            const { role_name, ...rest } = data;
            setProfile({ ...rest, roleName: role_name });
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
          const response = await fetch(`http://localhost:5001/api/profile/${newSession.user.id}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const data = await response.json();

            if (!data) setProfile(null);

            const { role_name, ...rest } = data;
            setProfile({ ...rest, roleName: role_name });
          }
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
    // Ensure profile information can be updated
    setProfile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
