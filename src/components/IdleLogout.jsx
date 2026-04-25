import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Logs the user out after a period of inactivity to protect their account.
 * Listens to common activity events and resets a timeout while the user is active.
 */
export default function IdleLogout({ timeoutMs = 30 * 60 * 1000 }) { // changed to default: 30 minute timeout
  const { session, user, loading } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // clear any existing timer
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleLogout = () => {
      clearTimer();
      /* istanbul ignore next */
      if (!user || !session) return;

      timerRef.current = setTimeout(async () => {
        /* istanbul ignore next */
        if (!user || !session) return;

        // best-effort mark user inactive
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/${user.id}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ is_active: false })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to mark user inactive:", errorData?.message || errorData.error);
        }

        await supabase.auth.signOut();
        window.location.href = "/login";
      }, timeoutMs);
    };

    const handleActivity = () => {
      /* istanbul ignore next */
      if (!loading && user) {
        scheduleLogout();
      }
    };

    // attach event listeners
    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity));

    // start timer once we know auth state
    if (!loading && session && user) {
      scheduleLogout();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [loading, session, user, timeoutMs]);

  return null;
}
