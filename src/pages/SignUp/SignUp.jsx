// src/pages/SignUp/SignUp.jsx
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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

    const signupPayload = {
      email: values.email,
      password: values.password,
      options: {
        data: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
        emailRedirectTo: redirectUrl,
      },
    };

    const profilePayload = {
      email: values.email,
      first_name: values.firstName,
      last_name: values.lastName,
    };

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signup_payload: signupPayload,
        profile_payload: profilePayload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setSubmitError(errorData.error.message);
      setInfoMsg("");
    } else {
      const data = await response.json();
      setSubmitError("");
      setInfoMsg(data.info.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#FFFDF4]">
      <div className="mx-4 md:mx-6 lg:mx-10 py-10 md:py-14 flex justify-center">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-3xl md:text-5xl font-serif font-extralight tracking-wide uppercase">
              Book With Me
            </h1>
            <p className="mt-3 text-sm md:text-base text-neutral-600 max-w-xl mx-auto">
              Create your account to manage your galleries, make a payment, or
              submit a booking request.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/60 backdrop-blur-sm border border-black/10 rounded-2xl shadow-sm px-5 md:px-8 py-8">
            <form
              className="flex flex-col gap-5 font-sans text-xs"
              noValidate
              onSubmit={handleSubmit(onSubmit)}
            >
              {/* Name row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* FIRST NAME */}
                <label>
                  <p className="text-brown py-1 text-[14px]">First Name *</p>
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
                    <p className="mt-2 text-red-600 text-xs">
                      {errors.firstName.message}
                    </p>
                  )}
                </label>

                {/* LAST NAME */}
                <label>
                  <p className="text-brown py-1 text-[14px]">Last Name *</p>
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
                    <p className="mt-2 text-red-600 text-xs">
                      {errors.lastName.message}
                    </p>
                  )}
                </label>
              </div>

              {/* EMAIL */}
              <label>
                <p className="text-brown py-1 text-[14px]">Email *</p>
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
                  <p className="mt-2 text-red-600 text-xs">
                    {errors.email.message}
                  </p>
                )}
              </label>

              {/* PASSWORDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label>
                  <p className="text-brown py-1 text-[14px]">Password *</p>
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
                    <p className="mt-2 text-red-600 text-xs">
                      {errors.password.message}
                    </p>
                  ) : (
                    <p className="mt-2 text-neutral-500 text-[12px]">
                      8+ characters, 1 upper, 1 lower, 1 number
                    </p>
                  )}
                </label>

                <label>
                  <p className="text-brown py-1 text-[14px]">
                    Confirm Password *
                  </p>
                  <input
                    className={`w-full rounded-md border px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/50 ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : "border-neutral-200"
                    }`}
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-2 text-red-600 text-xs">
                      {errors.confirmPassword.message}
                    </p>
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

              {/* What happens next */}
              <div className="mt-4 text-center">
                <h2 className="font-serif text-lg text-[#7E4C3C]">
                  What happens next?
                </h2>
                <p className="mt-2 text-sm text-neutral-600 max-w-2xl mx-auto">
                  Once you confirm your email, you'll be able to manage your account and submit a
                  booking request and I'll follow up with cofirmation or any
                  extra details.
                </p>
                <p className="mt-3 text-[12px] text-neutral-600">
                  By creating an account, you agree to be contacted about
                  session availability.
                </p>
              </div>

              {/* CTA */}
              <button
                className="mt-1 flex justify-center items-center w-full md:w-1/2 mx-auto
                           bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font-serif border border-black rounded-md transition disabled:opacity-60 cursor-pointer"
                type="submit"
                disabled={isSubmitting}
                aria-label="Create account"
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>

              {/* Footer links */}
              <div className="text-center">
                <p className="text-[14px] text-neutral-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-[#7E4C3C] underline underline-offset-4 hover:text-[#AB8C4B]"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
