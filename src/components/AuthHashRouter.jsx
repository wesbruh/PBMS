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
    const search = window.location.search;
    if ((!hash || hash === "#") && !search) return;

    // these are the ones supabase uses
    const hasAuthHash =
      hash.includes("access_token=") ||
      hash.includes("refresh_token=") ||
      hash.includes("error=") ||
      hash.includes("type=recovery") ||
      hash.includes("type=signup");

    const hasAuthQuery =
      search.includes("access_token=") ||
      search.includes("refresh_token=") ||
      search.includes("error=") ||
      search.includes("code=") || // oauth PKCE
      search.includes("token_hash=") ||
      search.includes("type=recovery") ||
      search.includes("type=signup");

    // we are already on /auth/callback -> let that page handle it
    if (location.pathname === "/auth/callback") {
      return;
    }

    if (hasAuthHash) {
      // keep the hash when we navigate
      navigate(`/auth/callback${hash}`, { replace: true });
      return;
    }

    if (hasAuthQuery) {
      navigate(`/auth/callback${search}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  return children;
}
