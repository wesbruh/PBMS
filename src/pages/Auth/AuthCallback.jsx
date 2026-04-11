// src/pages/Auth/AuthCallback.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const ResendSchema = z
  .object({
    email: z.string(),
  });

// password rules
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

const ResetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in...");
  const [allowResend, setAllowResend] = useState(false);
  const [allowReset, setAllowReset] = useState(false);
  const navigate = useNavigate();
  const handledRef = useRef(false);

  // Resend Confirmation state
  const {
    register: registerEmail,
    handleSubmit: submitEmail,
    formState: { errors: emailErrors },
  } = useForm({
    resolver: zodResolver(ResendSchema),
    mode: "onBlur",
    defaultValues: {
      email: ""
    },
  });

  // Reset Password state 
  const {
    register: registerPassword,
    handleSubmit: submitPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(ResetSchema),
    mode: "onBlur",
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  const markUserActive = useCallback(async (session) => {
    if (!session || !session?.user?.id) return;
    const userId = session.user.id;

    const updates = {
      is_active: true,
      last_login_at: new Date().toISOString(),
    };

    const response = await fetch(`http://localhost:5001/api/profile/${userId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const { errorData } = await response.json();
      console.error("Failed updating user activity:", errorData.error);
    }
  }, []);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const next = (type) => {
      // If this is a password recovery link, set allow reset true
      if (type === "recovery") {
        setMessage("Reset your password...");
        setAllowReset(true);
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
        await markUserActive(existingSession);
        next(type);
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
        setMessage(errorDesc || "Link is no longer not valid.");
        setAllowResend(true);
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
      const activeSession = data?.session;
      if (activeSession) {
        await markUserActive(activeSession);
      }

      // redirect based on link type
      if (data?.session) {
        next(type);
        return;
      }

      navigate("/login", { replace: true });
    }

    run();
  }, [markUserActive, navigate]);

  const resendConfirmation = async (values) => {
    setMessage("");

    const redirectUrl = `${window.location.origin}/auth/callback`; // reuse callback

    await supabase.auth.resend({
      type: 'signup',
      email: values.email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    setAllowResend(false);
    setMessage("If an account exists for that email, the confirmation link has been resent.");
    setTimeout(() => navigate("/login", { replace: true }), 1500);
  }

  const resetPassword = async (values) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password
      })

      if (error) throw error;

      setAllowReset(false);
      setMessage("Password has been reset.");
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);

    } catch (error) {
      console.error(error);
      alert(`Password could not be reset. Please try again.`);
    }
  }

  return (
    <div className="flex flex-col py-16 text-2xl text-center text-brown font-serif gap-4">
      <p>{message}</p>
      {allowResend && (
        <div className="flex items-center justify-center">
          <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border-2 border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-serif font-extralight mb-4">Resend Confirmation Link</h2>
            <form className="flex flex-col font-mono text-xs gap-4" noValidate onSubmit={submitEmail(resendConfirmation)}>
              <label>
                <p className="text-center text-brown py-3">EMAIL *</p>
                <input
                  className="w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]"
                  type="email"
                  {...registerEmail("email")}
                />
                {emailErrors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {emailErrors.email.message}
                  </p>
                )}
              </label>
              <button
                type="submit"
                className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans border-2 border-black rounded-md transition"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Show Password Reset when allowed*/}
      {allowReset && (
        <div className="flex items-center justify-center">
          <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border-2 border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-serif font-extralight mb-4">Change Password</h2>
            <form className="flex flex-col font-mono text-xs gap-4" noValidate onSubmit={submitPassword(resetPassword)}>
              <label>
                <p className="text-center text-brown py-3">New Password *</p>
                <input
                  className="w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]"
                  type="password"
                  {...registerPassword("password")}
                />
                {passwordErrors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {passwordErrors.password.message}
                  </p>
                )}
                <p className="text-center text-brown py-3">Confirm Password *</p>
                <input
                  className="w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]"
                  type="password"
                  {...registerPassword("confirmPassword")}
                />
                {passwordErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </label>
              <button
                type="submit"
                className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans border-2 border-black rounded-md transition"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div >
  );
}