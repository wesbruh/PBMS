// src/pages/SignUp/SignUp.jsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabaseClient";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
    // clear everything first
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

    // error path
    if (error) {
        const raw = error.message?.toLowerCase() || "";
        if (raw.includes("already registered") || raw.includes("already exists")) {
        setSubmitError("That email is already in use. Please log in instead.");
        } else {
        setSubmitError(error.message || "Could not create account.");
        }
        // make extra sure success msg is gone
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

    // upsert in your "User" table
    if (authUser?.id) {
      const profilePayload = {
        id: authUser.id,
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        // if email is NOT confirmed yet, mark inactive
        is_active: !!authUser.email_confirmed_at,
      };

      if (data?.session) {
        profilePayload.last_login_at = new Date().toISOString();
        profilePayload.is_active = true;
      }

      const { error: userTableErr } = await supabase.from("User").upsert(profilePayload);
      if (userTableErr) {
        console.error("User upsert error:", userTableErr);
      }
    }

    // if no session was returned, it's confirmation mode
    if (!data.session) {
        setInfoMsg(
        "We’ve sent you a confirmation link. Please check your email to finish creating your account."
        );
        return;
    }

    // otherwise go straight to dashboard
    navigate("/dashboard", { replace: true });
    };


  return (
    <div>
      <div className="mx-2 md:mx-4 lg:mx-5 my-10 flex flex-col items-center">
        <h1 className="text-center text-3xl md:text-4xl lg:text-5xl font-serif font-extralight mb-8">
          Create Your Account
        </h1>

        <form
          className="flex flex-col font-mono text-xs w-full max-w-xl"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* FIRST NAME */}
          <label className="mb-4">
            <p className="text-center text-brown py-3">FIRST NAME *</p>
            <input
              className={`w-full text-center border-b py-3 text-sm focus:outline-none ${
                errors.firstName ? "border-red-500" : "border-neutral-200"
              }`}
              id="firstName"
              type="text"
              autoComplete="given-name"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="mt-2 text-center text-red-600 text-xs">
                {errors.firstName.message}
              </p>
            )}
          </label>

          {/* LAST NAME */}
          <label className="mb-4">
            <p className="text-center text-brown py-3">LAST NAME *</p>
            <input
              className={`w-full text-center border-b py-3 text-sm focus:outline-none ${
                errors.lastName ? "border-red-500" : "border-neutral-200"
              }`}
              id="lastName"
              type="text"
              autoComplete="family-name"
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="mt-2 text-center text-red-600 text-xs">
                {errors.lastName.message}
              </p>
            )}
          </label>

          {/* EMAIL */}
          <label className="mb-4">
            <p className="text-center text-brown py-3">EMAIL *</p>
            <input
              className={`w-full text-center border-b py-3 text-sm focus:outline-none ${
                errors.email ? "border-red-500" : "border-neutral-200"
              }`}
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-2 text-center text-red-600 text-xs">
                {errors.email.message}
              </p>
            )}
          </label>

          {/* PASSWORD */}
          <label className="mb-4">
            <p className="text-center text-brown py-3">PASSWORD *</p>
            <input
              className={`w-full text-center border-b py-3 text-sm focus:outline-none ${
                errors.password ? "border-red-500" : "border-neutral-200"
              }`}
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="mt-2 text-center text-red-600 text-xs">
                {errors.password.message}
              </p>
            ) : (
              <p className="mt-1 text-center text-neutral-400 text-[10px]">
                8+ chars, 1 upper, 1 lower, 1 number
              </p>
            )}
          </label>

          {/* CONFIRM PASSWORD */}
          <label className="mb-2">
            <p className="text-center text-brown py-3">CONFIRM PASSWORD *</p>
            <input
              className={`w-full text-center border-b py-3 text-sm focus:outline-none ${
                errors.confirmPassword ? "border-red-500" : "border-neutral-200"
              }`}
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-center text-red-600 text-xs">
                {errors.confirmPassword.message}
              </p>
            )}
          </label>

          {/* SUPABASE ERRORS */}
          {submitError && (
            <p className="text-center text-red-600 text-xs mt-3 mb-1">
              {submitError}
            </p>
          )}

          {/* INFO (email sent) */}
          {infoMsg && (
            <p className="text-center text-green-700 text-xs mt-3 mb-1">
              {infoMsg}
            </p>
          )}

          <button
            className="flex justify-center items-center w-1/2 mx-auto mt-6 mb-6 md:mb-8 lg:mb-10
                        bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font-sans border-2 border-black rounded-md transition disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
            aria-label="Create account"
          >
            {isSubmitting ? "Creating..." : "CREATE ACCOUNT"}
          </button>
        </form>
      </div>
    </div>
  );
}
