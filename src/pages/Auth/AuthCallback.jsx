// src/pages/Auth/AuthCallback.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in...");
  const [allowResend, setAllowResend] = useState(false);
  const navigate = useNavigate();
  const handledRef = useRef(false);

  // Resend Confirmation modal state 
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");

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
      // navigate("/dashboard/inquiry", { replace: true });
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
        setAllowResend(true);
        return;
      }

      setAllowResend(false);

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

  const openResend = () => {
    setResendEmail("");
    setResendMsg("");
    setShowResend(true);
  };

  const resendConfirmation = async (e) => {
    e.preventDefault();

    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    setResendMsg("");

    const redirectUrl = `${window.location.origin}/auth/callback`; // reuse callback

    await supabase.auth.resend({
      type: 'signup',
      email: resendEmail,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    setResendMsg("If an account exists for that email, the confirmation link has been resent.");
  }

  return (
    <div className="flex flex-col py-16 text-center text-brown font-serif gap-4">
      <p>{message}</p>
      {
        allowResend ?
          <button
            type="button"
            onClick={openResend}
            className="hover:underline hover:cursor-pointer"
          >
            Resend Confirmation Link
          </button> :
          <></>
      }

      {/* Modal popup for Resend Confirmation */}
      {showResend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setShowResend(false); }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border-2 border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-serif font-extralight mb-4">Resend Confirmation Link</h2>
            <form className="flex flex-col font-mono text-xs" noValidate onSubmit={resendConfirmation}>
              <label>
                <p className="text-center text-brown py-3">EMAIL *</p>
                <input
                  className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                  type="email" required
                  value={resendEmail}
                  onChange={(e) => { setResendEmail(e.target.value); if (resendMsg) setResendMsg(""); }}
                  placeholder="you@example.com"
                />
              </label>
              {resendMsg && (
                <p className="text-center text-xs mt-3 mb-1">{resendMsg}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResend(false)}
                  className="px-4 py-2 bg-white text-black text-sm font-sans border-2 border-black rounded-md hover:opacity-80 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans border-2 border-black rounded-md transition"
                >
                  Resend Confirmation Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
}