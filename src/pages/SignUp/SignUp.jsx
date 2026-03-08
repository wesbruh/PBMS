// src/pages/SignUp/SignUp.jsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabaseClient";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

// default role init
const { data: defaultRoleArr, error: roleError } = await supabase
  .from("Role")
  .select("id")
  .eq("name", "User");

// password rules
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

const SignUpSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function SignUp() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(SignUpSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values) => {
    setSubmitError("");
    setInfoMsg("");

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      const raw = error.message?.toLowerCase() || "";
      if (raw.includes("already registered") || raw.includes("already exists")) {
        setSubmitError("That email is already in use. Please log in instead.");
      } else {
        setSubmitError(error.message || "Could not create account.");
      }
      setInfoMsg("");
      return;
    }

    const authUser = data.user;
    const duplicateSignup =
      authUser &&
      Array.isArray(authUser.identities) &&
      authUser.identities.length === 0;

    if (duplicateSignup) {
      setSubmitError("That email is already in use. Please log in instead.");
      setInfoMsg("");
      return;
    }

    // upsert in your "User" and "UserRole" table
    if (authUser?.id) {
      const profilePayload = {
        id: authUser.id,
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        is_active: !!authUser.email_confirmed_at,
      };

      if (roleError || !defaultRoleArr) {
        console.error("Role not found or error fetching role: ", roleError);
      }

      const defaultRole = defaultRoleArr?.[0];
      const rolePayload = {
        user_id: profilePayload.id,
        role_id: defaultRole?.id,
      };

      if (data?.session) {
        profilePayload.last_login_at = new Date().toISOString();
        profilePayload.is_active = true;
        // NOTE: rolePayload.assigned_at was being set before, but assigned_at isn't defined here.
        // If your table requires assigned_at, add it explicitly:
        // rolePayload.assigned_at = new Date().toISOString();
      }

      const { error: userTableErr } = await supabase
        .from("User")
        .upsert(profilePayload);
      const { error: userRoleTableErr } = await supabase
        .from("UserRole")
        .upsert(rolePayload);

      if (userTableErr) console.error("User upsert error:", userTableErr);
      if (userRoleTableErr) console.error("UserRole upsert error:", userRoleTableErr);
    }

    if (!data.session) {
      setInfoMsg(
        "We’ve sent you a confirmation link. Please check your email to finish creating your account."
      );
      return;
    }

    navigate("/signup/success", { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FFFDF4]">
      <div className="mx-4 md:mx-6 lg:mx-10 py-10 md:py-14 flex justify-center">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-serif font-extralight tracking-wide">
              BOOK WITH ME
            </h1>
            <p className="mt-3 text-sm md:text-base text-neutral-600 max-w-xl mx-auto">
              Create your account to request a session. I’ll follow up with availability within 24 hours.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm px-5 md:px-8 py-8">
            <form
              className="flex flex-col gap-5 font-mono text-xs"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
            >
              {/* Name row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* FIRST NAME */}
                <label>
                  <p className="text-brown py-2 tracking-widest text-[11px]">FIRST NAME *</p>
                  <input
                    className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
                      errors.firstName ? "border-red-500" : "border-neutral-200"
                    }`}
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Jane"
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="mt-2 text-red-600 text-xs">{errors.firstName.message}</p>
                  )}
                </label>

                {/* LAST NAME */}
                <label>
                  <p className="text-brown py-2 tracking-widest text-[11px]">LAST NAME *</p>
                  <input
                    className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
                      errors.lastName ? "border-red-500" : "border-neutral-200"
                    }`}
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="mt-2 text-red-600 text-xs">{errors.lastName.message}</p>
                  )}
                </label>
              </div>

              {/* EMAIL */}
              <label>
                <p className="text-brown py-2 tracking-widest text-[11px]">EMAIL *</p>
                <input
                  className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
                    errors.email ? "border-red-500" : "border-neutral-200"
                  }`}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-2 text-red-600 text-xs">{errors.email.message}</p>
                )}
              </label>

              {/* PASSWORDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label>
                  <p className="text-brown py-2 tracking-widest text-[11px]">PASSWORD *</p>
                  <input
                    className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
                      errors.password ? "border-red-500" : "border-neutral-200"
                    }`}
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  {errors.password ? (
                    <p className="mt-2 text-red-600 text-xs">{errors.password.message}</p>
                  ) : (
                    <p className="mt-2 text-neutral-500 text-[11px]">
                      8+ characters, 1 upper, 1 lower, 1 number
                    </p>
                  )}
                </label>

                <label>
                  <p className="text-brown py-2 tracking-widest text-[11px]">CONFIRM PASSWORD *</p>
                  <input
                    className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
                      errors.confirmPassword ? "border-red-500" : "border-neutral-200"
                    }`}
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-2 text-red-600 text-xs">{errors.confirmPassword.message}</p>
                  )}
                </label>
              </div>

              {/* SUPABASE ERRORS */}
              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-red-700 text-xs">{submitError}</p>
                </div>
              )}

              {/* INFO (email sent) */}
              {infoMsg && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-green-800 text-xs">{infoMsg}</p>
                </div>
              )}

              {/* CTA */}
              <button
                className="mt-2 flex justify-center items-center w-full md:w-1/2 mx-auto
                           bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font-serif border border-black rounded-md transition disabled:opacity-60 cursor-pointer"
                type="submit"
                disabled={isSubmitting}
                aria-label="Create account"
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>

              {/* Footer links */}
              <div className="text-center mt-2">
                <p className="text-[11px] text-neutral-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-[#7E4C3C] underline underline-offset-4 hover:text-[#AB8C4B]">
                    Log in
                  </Link>
                </p>
                <p className="mt-2 text-[10px] text-neutral-500">
                  By creating an account, you agree to be contacted about session availability.
                </p>
              </div>
            </form>
          </div>

          {/* What happens next */}
          <div className="mt-8 text-center">
            <h2 className="font-serif text-lg text-[#7E4C3C]">What happens next?</h2>
            <p className="mt-2 text-sm text-neutral-600 max-w-2xl mx-auto">
              Once your email is confirmed, you’ll be able to submit your session request and I’ll follow up with dates, location, and details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}