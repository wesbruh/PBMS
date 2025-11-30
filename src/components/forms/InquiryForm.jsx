import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabaseClient";

const isTodayOrFuture = (value) => {
  if (!value) return false;
  const d = new Date(value); const t = new Date();
  d.setHours(0,0,0,0); t.setHours(0,0,0,0);
  return d >= t;
};

const Schema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string()
    .trim()
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone seems too long")
    .regex(/^[0-9+\-\s()]*$/, "Digits and + - ( ) only"),
  sessionType: z.enum(["wedding","engagement","family","corporate","lifestyle"], {
    required_error: "Select a session type",
  }),
  desiredDate: z.string().refine(isTodayOrFuture, { message: "Pick today or a future date" }),
  location: z.string().min(2, "Enter a location"),
  message: z.string().max(1000, "Max 1000 characters").optional(),
});

export default function InquiryForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
  resolver: zodResolver(Schema),
  mode: "onChange",            // <-- live validation
  reValidateMode: "onChange",
  defaultValues: {             // <-- ensures all fields are registered
    fullName: "",
    email: "",
    phone: "",
    sessionType: "",
    desiredDate: "",
    location: "",
    message: "",
  },
});

 const onSubmit = async (data) => {
  try {
    // 1) Upsert client by email (creates if new)
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .upsert(
        { email: data.email, full_name: data.fullName, phone: data.phone },
        { onConflict: "email" } // uses the unique index
      )
      .select("id, full_name, email")
      .single();
    if (clientErr) throw clientErr;

    // 2) Insert inquiry
    const { error: inqErr } = await supabase.from("inquiries").insert([
      {
        client_id: client.id,
        session_type: data.sessionType,
        desired_date: data.desiredDate, // YYYY-MM-DD from <input type="date" />
        location: data.location,
        message: data.message || null,
        status: "pending",
      },
    ]);
    if (inqErr) throw inqErr;

    alert("Inquiry submitted! We’ll follow up with availability.");
    // reset();  // RHF reset
 } catch (e) {
-  console.error(e);
-  // alert("Sorry, something went wrong. Please try again.");
+  console.error("Submit error:", e);
+  alert(`Sorry, something went wrong: ${e?.message || e}`);
}
};

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-1">
          Full Name
        </label>
        <input
          id="fullName"
          {...register("fullName")}
          placeholder="Jane Doe"
          className={`w-full rounded-md border px-3 py-2 outline-none
            ${errors.fullName ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.fullName}
          aria-describedby="fullName-error"
        />
        {errors.fullName && (
          <p id="fullName-error" className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="email" type="email" {...register("email")} placeholder="jane@example.com"
          className={`w-full rounded-md border px-3 py-2 outline-none
            ${errors.email ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.email} aria-describedby="email-error"
        />
        {errors.email && <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number</label>
        <input
          id="phone" {...register("phone")} placeholder="(555) 555-5555"
          className={`w-full rounded-md border px-3 py-2 outline-none
            ${errors.phone ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.phone} aria-describedby="phone-error"
        />
        {errors.phone && <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      {/* Session Type */}
      <div>
        <label htmlFor="sessionType" className="block text-sm font-medium mb-1">Type of Session</label>
        <select
          id="sessionType" defaultValue="" {...register("sessionType")}
          className={`w-full rounded-md border px-3 py-2 bg-white
            ${errors.sessionType ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.sessionType} aria-describedby="sessionType-error"
        >
          <option value="" disabled>Select...</option>
          <option value="wedding">Wedding</option>
          <option value="engagement">Engagement</option>
          <option value="family">Family</option>
          <option value="corporate">Corporate</option>
          <option value="lifestyle">Lifestyle</option>
        </select>
        {errors.sessionType && <p id="sessionType-error" className="mt-1 text-sm text-red-600">{errors.sessionType.message}</p>}
      </div>

      {/* Desired Date */}
      <div>
        <label htmlFor="desiredDate" className="block text-sm font-medium mb-1">Desired Date</label>
        <input
          id="desiredDate" type="date" min={minDate} {...register("desiredDate")}
          className={`w-full rounded-md border px-3 py-2
            ${errors.desiredDate ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.desiredDate} aria-describedby="desiredDate-error"
        />
        {errors.desiredDate && <p id="desiredDate-error" className="mt-1 text-sm text-red-600">{errors.desiredDate.message}</p>}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1">Location</label>
        <input
          id="location" {...register("location")} placeholder="Sacramento, CA"
          className={`w-full rounded-md border px-3 py-2 outline-none
            ${errors.location ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.location} aria-describedby="location-error"
        />
        {errors.location && <p id="location-error" className="mt-1 text-sm text-red-600">{errors.location.message}</p>}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">Message / Special Requests</label>
        <textarea
          id="message" rows={4} {...register("message")}
          className={`w-full rounded-md border px-3 py-2
            ${errors.message ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"}`}
          aria-invalid={!!errors.message} aria-describedby="message-error"
          placeholder="Anything we should know?"
        />
        {errors.message && <p id="message-error" className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-md bg-[#446780] hover:bg-[#98c0dc] text-white border border-black px-4 py-2
                   disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? "Checking..." : "Submit Inquiry"}
      </button>
    </form>
  );
}