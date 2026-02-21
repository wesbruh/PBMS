import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Logs the user out after a period of inactivity to protect their account.
 * Listens to common activity events and resets a timeout while the user is active.
 */
export default function IdleLogout({ timeoutMs = 10 * 60 * 1000 }) { // changed to default: 10 minute timeout
  const { user, loading } = useAuth();
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
      if (!user) return;

      timerRef.current = setTimeout(async () => {
        if (!user) return;

        try {
          // best-effort mark user inactive
          await supabase.from("User").update({ is_active: false }).eq("id", user.id);
        } catch (err) {
          console.error("Failed to mark user inactive before idle logout:", err);
        }

        await supabase.auth.signOut();
        window.location.href = "/login";
      }, timeoutMs);
    };

    const handleActivity = () => {
      if (!loading && user) {
        scheduleLogout();
      }
    };

    // attach event listeners
    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity));

    // start timer once we know auth state
    if (!loading && user) {
      scheduleLogout();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [loading, user, timeoutMs]);

  return null;
}
