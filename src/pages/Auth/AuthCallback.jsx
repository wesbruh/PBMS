// src/pages/Auth/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in...");
  const navigate = useNavigate();

  useEffect(() => {
    async function run() {
      // read hash from url
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const error = params.get("error");
      const errorDesc = params.get("error_description");
      const type = params.get("type");

      if (error) {
        console.error("supabase auth error:", error, errorDesc);
        setMessage(errorDesc || "Link not valid anymore. Please log in again.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
        return;
      }

      // try to turn hash into session
      const { data, error: authErr } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (authErr) {
        console.error("getSessionFromUrl error:", authErr);
        setMessage("Could not finish authentication. Please log in again.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
        return;
      }

      // password reset flow
      if (type === "recovery") {
        navigate("/dashboard", { replace: true });
        return;
      }

      // normal signup / magic link
      if (data?.session) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }

    run();
  }, [navigate]);

  return (
    <div className="w-full py-16 text-center text-brown font-serif">
      {message}
    </div>
  );
}
