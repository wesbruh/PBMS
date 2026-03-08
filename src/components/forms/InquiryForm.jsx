import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabaseClient";

const isTodayOrFuture = (value) => {
  if (!value) return false;
  const d = new Date(value);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return d >= t;
};


const SESSION_TYPES = [
  {
    value: "maternity",
    label: "Maternity",
    img: "/images/Maternity5.jpg",
  },
  {
    value: "newborn",
    label: "Newborn",
    img: "/images/Maternity6.jpg",
  },
  {
    value: "family",
    label: "Family",
    img: "/images/temp_tc.jpg",
  },
  {
    value: "weddings",
    label: "Weddings",
    img: "/images/Weddings1.jpeg",
  },
];

const Schema = z.object({

  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),


  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone seems too long")
    .regex(/^[0-9+\-\s()]*$/, "Digits and + - ( ) only"),

  sessionType: z.enum(["maternity", "newborn", "family", "weddings"], {
    required_error: "Select a session type",
  }),

  desiredDate: z.string().refine(isTodayOrFuture, { message: "Pick today or a future date" }),


  location: z.string().optional(),

  message: z.string().max(1000, "Max 1000 characters").optional(),
});

export default function InquiryForm() {
  const navigate = useNavigate();
  const [emailLocked, setEmailLocked] = useState(false);

  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(Schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      sessionType: "",
      desiredDate: "",
      location: "",
      message: "",
    },
  });

  const selectedSession = watch("sessionType");

  // Prefill email + first/last name when logged in
  useEffect(() => {
    const prefillFromAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (user.email) {
        setValue("email", user.email, { shouldValidate: true, shouldDirty: false });
        setEmailLocked(true);
      }

      const first = user.user_metadata?.first_name?.trim() || "";
      const last = user.user_metadata?.last_name?.trim() || "";

      if (first && !getValues("firstName")?.trim()) {
        setValue("firstName", first, { shouldValidate: true, shouldDirty: false });
      }
      if (last && !getValues("lastName")?.trim()) {
        setValue("lastName", last, { shouldValidate: true, shouldDirty: false });
      }

      await trigger(["email", "firstName", "lastName"]);
    };

    prefillFromAuth();
  }, [setValue, getValues, trigger]);

  const onSubmit = async (formData) => {
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      // 1) Upsert client by email (creates if new)
      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .upsert(
          { email: formData.email, full_name: fullName, phone: formData.phone },
          { onConflict: "email" }
        )
        .select("id, full_name, email")
        .single();

      if (clientErr) throw clientErr;

      // 2) Insert inquiry
      const { error: inqErr } = await supabase.from("inquiries").insert([
        {
          client_id: client.id,
          session_type: formData.sessionType,
          desired_date: formData.desiredDate,
          location: formData.location || null,
          message: formData.message || null,
          status: "pending",
        },
      ]);

      if (inqErr) throw inqErr;

      navigate("/inquiry/success", {
        replace: true,
        state: {
          fullName,
          email: formData.email,
          sessionType: formData.sessionType,
          desiredDate: formData.desiredDate,
          location: formData.location || "",
        },
      });
    } catch (e) {
      console.error("Submit error:", e);
      alert(`Sorry, something went wrong: ${e?.message || e}`);
    }
  };

  const inputBase =
    "w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none " +
    "focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";

  const labelCaps = "text-[11px] tracking-[0.2em] text-[#7E4C3C]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* TOP: First/Last Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>FIRST NAME *</p>
          <input
            {...register("firstName")}
            placeholder="Jane"
            className={`${inputBase} ${errors.firstName ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
        </div>

        <div>
          <p className={labelCaps}>LAST NAME *</p>
          <input
            {...register("lastName")}
            placeholder="Doe"
            className={`${inputBase} ${errors.lastName ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.lastName}
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* EMAIL + PHONE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>EMAIL *</p>
          <input
            type="email"
            {...register("email")}
            placeholder="jane@example.com"
            readOnly={emailLocked}
            aria-readonly={emailLocked}
            className={`${inputBase} ${
              errors.email ? "border-red-500" : "border-black/10"
            } ${emailLocked ? "bg-neutral-100 text-neutral-600 cursor-not-allowed" : ""}`}
            aria-invalid={!!errors.email}
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            We’ll use this email to confirm availability and send session details.
          </p>
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <p className={labelCaps}>PHONE NUMBER *</p>
          <input
            {...register("phone")}
            placeholder="123-456-7890"
            className={`${inputBase} ${errors.phone ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      {/* TYPE OF SESSION (image cards) */}
      <div>
        <p className={labelCaps}>TYPE OF SESSION</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SESSION_TYPES.map((s) => {
            const active = selectedSession === s.value;
            return (
              <label
                key={s.value}
                className={`group cursor-pointer rounded-lg border overflow-hidden bg-white/60 shadow-sm transition
                  ${active ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20" : "border-black/10 hover:border-black/20"}`}
              >
                <input
                  type="radio"
                  value={s.value}
                  {...register("sessionType")}
                  className="sr-only"
                />

                <div className="h-28 w-full bg-neutral-100 overflow-hidden">
                  {}
                  <img
                    src={s.img}
                    alt={s.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    onError={(e) => {
                      // fallback if image path is missing
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      active ? "border-[#7E4C3C]" : "border-black/30"
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-[#7E4C3C]" />}
                  </span>
                  <span className="font-serif text-sm text-[#7E4C3C]">{s.label}</span>
                </div>
              </label>
            );
          })}
        </div>

        {errors.sessionType && (
          <p className="mt-2 text-sm text-red-600">{errors.sessionType.message}</p>
        )}
      </div>

      {/* DATE + LOCATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>PREFERRED DATE</p>
          <input
            type="date"
            min={minDate}
            {...register("desiredDate")}
            className={`${inputBase} ${errors.desiredDate ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.desiredDate}
          />
          {errors.desiredDate && (
            <p className="mt-1 text-sm text-red-600">{errors.desiredDate.message}</p>
          )}
        </div>

        <div>
          <p className={labelCaps}>
            LOCATION <span className="text-neutral-500 tracking-normal">(optional)</span>
          </p>
          <input
            {...register("location")}
            placeholder="Sacramento, CA"
            className={`${inputBase} ${errors.location ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.location}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
          )}
        </div>
      </div>

      {/* MESSAGE + CTA SIDE-BY-SIDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <textarea
            rows={5}
            {...register("message")}
            className={`${inputBase} ${errors.message ? "border-red-500" : "border-black/10"}`}
            placeholder="Tell me about your vision..."
            aria-invalid={!!errors.message}
          />
          <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed">
            Please share any details about the memories you’d like to create. Feel free to mention style preferences,
            important moments, or unique ideas for your session.
          </p>
          {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
        </div>

        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Request My Session"}
          </button>

          <div className="mt-4 flex items-center gap-3 text-sm text-neutral-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 bg-white">
              ✉️
            </span>
            <p className="text-[12px]">
              I will follow up within 24 hours to confirm details.
            </p>
          </div>

          <div className="mt-4 border-t border-black/10 pt-4 space-y-2 text-[12px] text-neutral-700">
            <div className="flex items-center gap-2">
              <span className="text-[#AB8C4B]">★</span>
              <span>Trusted by 100+ families</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#AB8C4B]">★</span>
              <span>Serving Vacaville & surrounding areas</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}