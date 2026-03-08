// src/pages/Auth/AuthCallback.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in...");
  const navigate = useNavigate();
  const handledRef = useRef(false);

  const markUserActive = useCallback(async (userId) => {
    if (!userId) return;
    const updates = {
      is_active: true,
      last_login_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("User").update(updates).eq("id", userId);
    if (error) {
      console.error("Failed updating user activity:", error);
    }
  }, []);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const goToNext = (type) => {
      // If this is a password recovery link, keep sending them to dashboard
      if (type === "recovery") {
        navigate("/dashboard", { replace: true });
        return;
      }

      // For normal signup / confirmation / magic link, send them to booking flow
      navigate("/signup/success", { replace: true });
      // If you prefer skipping the success page, use:
      // navigate("/inquiry", { replace: true });
    };

    // ensure we activate/profile redirect even if the URL tokens were already consumed
    const finishWithExistingSession = async (type) => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession?.user?.id) {
        await markUserActive(existingSession.user.id);
        goToNext(type);
        return true;
      }
      return false;
    };

    async function run() {
      // read hash or query params from url
      const hash = window.location.hash?.replace(/^#/, "") ?? "";
      const search = window.location.search?.replace(/^\?/, "") ?? "";
      const rawParams = hash || search;
      const params = new URLSearchParams(rawParams);

      const error = params.get("error");
      const errorDesc = params.get("error_description");
      const type = params.get("type");
      const pkceCode = params.get("code"); // OAuth / PKCE style auth

      // if we already have a session (for example the link was handled once), just go
      if (await finishWithExistingSession(type)) {
        return;
      }

      if (!rawParams) {
        setMessage("This link is no longer valid. Please log in again.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
        return;
      }

      if (error) {
        console.error("supabase auth error:", error, errorDesc);
        setMessage(errorDesc || "Link not valid anymore. Please log in again.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
        return;
      }

      let data;
      try {
        // try to turn hash/query into a session
        if (pkceCode) {
          const { data: pkceData, error: pkceErr } =
            await supabase.auth.exchangeCodeForSession(pkceCode);
          if (pkceErr) throw pkceErr;
          data = pkceData;
        } else {
          const resp = await supabase.auth.getSessionFromUrl({
            storeSession: true,
          });
          data = resp.data;
          if (resp.error) throw resp.error;
        }
      } catch (authErr) {
        console.error("getSessionFromUrl error:", authErr);
        // if the exchange failed but a session was actually stored, recover
        if (await finishWithExistingSession(type)) return;

        setMessage("Could not finish authentication. Please log in again.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
        return;
      }

      // clear the hash/query tokens so router stops re-triggering
      window.history.replaceState({}, document.title, window.location.pathname);

      // update custom profile metadata
      const activeUserId = data?.session?.user?.id;
      if (activeUserId) {
        await markUserActive(activeUserId);
      }

      // redirect based on link type
      if (data?.session) {
        goToNext(type);
        return;
      }

      navigate("/login", { replace: true });
    }

    run();
  }, [markUserActive, navigate]);

  return (
    <div className="w-full py-16 text-center text-brown font-serif">
      {message}
    </div>
  );
}