import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // save navigation path
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ email: "", password: "", });
  const [error, setError] = useState("");
  const [errors, setErrors ] = useState({});

  // Forgot-password modal state 
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  // navigate when everything is loaded
  useEffect(() => {
    // something hasn't been initialized or found
    if (loading || !session || !profile) {
      return;
    }

    // get real, target (navigation location)
    const navLoc = profile.roleName === "Admin" ? "/admin" :
      profile.roleName === "User" ? from || "/dashboard" :
        from;

    navigate(navLoc, { replace: true });
  }, [loading, session, profile, from, navigate]);


  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (error) setError("");
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!form.password.trim()) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError("");
      return;
    }

    setErrors({});

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("email not confirmed")) {
        setError("Please confirm your email first. Check your inbox for the link.");
      } else {
        setError(error.message || "Unable to log in.");
      }
      return;
    }

    // we are logged in – update the User table
    if (session && profile) {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/${profile?.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          is_active: true,
          last_login_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // if you see this in console, you have RLS blocking it
        const errorData = await response.json();
        console.error("User update failed:", errorData.error);
      }
    }
  }

  // Open/submit handlers for reset popup
  const openReset = () => {
    setResetEmail("");
    setResetMsg("");
    setShowReset(true);
  };

  const sendReset = async (e) => {
    e.preventDefault();

    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }

    setResetMsg("");

    const redirectUrl = `${window.location.origin}/auth/callback`; // reuse callback

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setResetMsg(error.message || "Could not send reset email.");
      return;
    }

    setResetMsg("If an account exists for that email, a reset link has been sent.");
  };


  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FFFDF4]">
      <div className="mx-4 md:mx-6 lg:mx-10 py-10 md:py-14 flex justify-center">
        <div className="w-full max-w-3xl">
        {/* Headline in serif font */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-center text-3xl md:text-5xl font-serif  tracking wide">
            Log in to Your Account
          </h1>
          <p className="mt-5 text-sm md:text-lg text-neutral-700 max-w-full mx-auto">
            Log in to manage your account, make payments, or submit a booking request.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-md px-5 md:px-8 py-6">
          <form
            className="flex flex-col gap-5 font-sans"
            noValidate
            onSubmit={onSubmit}
          >
            {/* Email */}
          <label>
            <p className="text-brown py-2 text-[14px] font-sans">Email *</p>
            <input
              className={`w-full rounded-md border border-neutral-200 px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50
              ${errors.email ? "border-red-500" : "border-neutral-200"}`}
              id="email" name="email" type="email" autoComplete="email" required
              value={form.email} onChange={onChange} placeholder = "jane@example.com" />
              {errors.email && (
              <p className="mt-2 text-red-600 text-xs">{errors.email}</p>
              )}
          </label>

            {/* Password */}
          <label>
            <p className="text-brown py-2 text-[14px] font-sans">Password *</p>
            <input
              className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
              errors.password ? "border-red-500" : "border-neutral-200"
              }`}
              id="password" name="password" type="password" autoComplete="current-password" required
              value={form.password} onChange={onChange} placeholder = "••••••••" />
              {errors.password && (
              <p className="mt-2 text-red-600 text-xs">{errors.password}</p>
            )}
          </label>

          {/* Forgot password link */}
          <div className="text-center mt-2 flex flex-col gap-3 items-center">
            <button
              type="button"
              onClick={openReset}
              className="font-sans text-sm hover:underline underline-offset-4 cursor-pointer"
            >
              Forgot password?
            </button>
            <Link to="/signup" className=" font-sans text-sm text-[#7E4C3C] underline underline-offset-4 hover:text-[#AB8C4B]">
            <button
              type="button"
              className="hover:underline underline-offset-4 cursor-pointer"
            >
              Create an account
            </button>
            </Link>
          </div>

          {error && <p className="text-center text-red-600 text-xs mt-2">{error}</p>}

          <button className="flex justify-center items-center w-full md:w-1/2 mx-auto mt-2 mb-2
                             bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font-sans rounded-md transition cursor-pointer"
            type="submit"
            aria-label="login-button">
            Log In
          </button>
        </form>
      </div>
    </div>
  </div>

      {/* Modal popup for Forgot Password */}
      {showReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReset(false); }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-semibold mb-4">Reset your password</h2>
            <form className="flex flex-col text-xs" noValidate onSubmit={sendReset}>
              <label>
                <p className="text-center text-brown py-3">Email *</p>
                <input
                  className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                  type="email" required
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); if (resetMsg) setResetMsg(""); }}
                  placeholder="you@example.com"
                />
              </label>
              {resetMsg && (
                <p className="text-center text-xs mt-3 mb-1">{resetMsg}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-6 ">
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="px-4 py-2 bg-white text-black text-sm font-sans border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans border border-black rounded-md transition cursor-pointer"
                >
                  Send reset link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}