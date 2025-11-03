// src/components/AuthHashRouter.jsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * If Supabase dropped us on "/" (or any route) with a hash like
 * #access_token=... or #error=..., redirect to /auth/callback
 * and preserve the hash, so AuthCallback can finish.
 */
export default function AuthHashRouter({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // only care about hash-based auth
    const hash = window.location.hash;
    if (!hash || hash === "#") return;

    // these are the ones supabase uses
    const hasAuthStuff =
      hash.includes("access_token=") ||
      hash.includes("refresh_token=") ||
      hash.includes("error=") ||
      hash.includes("type=recovery") ||
      hash.includes("type=signup");

    // we are already on /auth/callback -> let that page handle it
    if (hasAuthStuff && location.pathname !== "/auth/callback") {
      // keep the hash when we navigate
      navigate(`/auth/callback${hash}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  return children;
}
