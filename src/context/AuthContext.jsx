// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { fetchProfileForSession } from "./authContext.utils";

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

      /* istanbul ignore next */
      if (!ignore) {
        setSession(session ?? null);
      }

      // if logged in, try to load the row from "User" and user's role name
      /* istanbul ignore else */
      if (session && !ignore) {
        const nextProfile = await fetchProfileForSession(session);
        /* istanbul ignore next */
        if (!ignore && nextProfile !== undefined) setProfile(nextProfile);
      } else if (!ignore) {
        setProfile(null);
      }

      /* istanbul ignore next */
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
          const nextProfile = await fetchProfileForSession(newSession);
          if (nextProfile !== undefined) setProfile(nextProfile);
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
