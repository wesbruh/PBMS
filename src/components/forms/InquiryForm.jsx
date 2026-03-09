import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ContractDetail from "../../pages/Dashboard/ContractDetail";
import DynamicQuestionnaire from "./DynamicQuestionnaire";

const isTodayOrFuture = (value) => {
  if (!value) return false;
  const d = new Date(value);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return d >= t;
};

const SESSION_TYPES = [
  { value: "maternity", label: "Maternity", img: "/images/Maternity5.jpg" },
  { value: "newborn",   label: "Newborn",   img: "/images/Maternity6.jpg" },
  { value: "family",    label: "Family",    img: "/images/temp_tc.jpg" },
  { value: "weddings",  label: "Weddings",  img: "/images/Weddings1.jpeg" },
];

const Schema = z.object({
  firstName:   z.string().min(1, "First name is required"),
  lastName:    z.string().min(1, "Last name is required"),
  email:       z.string().email("Enter a valid email"),
  phone:       z
    .string()
    .trim()
    .min(10, "Phone must be at least 10 digits")
    .max(20, "Phone seems too long")
    .regex(/^[0-9+\-\s()]*$/, "Digits and + - ( ) only"),
  sessionType: z.enum(["maternity", "newborn", "family", "weddings"], {
    required_error: "Select a session type",
  }),
  date:      z.string().refine(isTodayOrFuture, { message: "Pick today or a future date" }),
  startTime: z.string(),
  location:  z.string().optional(),
  message:   z.string().max(1000, "Max 1000 characters").optional(),
});

export default function InquiryForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [emailLocked,       setEmailLocked]       = useState(false);
  const [contractTemplates, setContractTemplates] = useState({});
  const [contract,          setContract]          = useState(null);
  const [submitLock,        setSubmitLock]        = useState(true);
  const [loading,           setLoading]           = useState(true);

  // activeTemplate: { id: UUID (QuestionnaireTemplate PK), name, questions: [...] }
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [qAnswers,        setQAnswers]       = useState({});
  const [qLoading,        setQLoading]       = useState(false);

  // ── Load contract templates ───────────────────────────────────────────────────
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/contract/templates", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        const map = {};
        data.forEach((t) => { map[`${t.id}`] = { body: t.body, name: t.name }; });
        setContractTemplates(map);
      } catch (err) {
        console.error("Failed to load contract templates:", err);
      }
    };
    loadContracts();
  }, []);

  // ── Load / create default contract ───────────────────────────────────────────
  useEffect(() => {
    const getDefaultContract = async () => {
      if (!user) return;
      try {
        const response = await fetch("http://localhost:5001/api/contract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        });
        const data = await response.json();
        setContract(data);
      } catch (err) {
        console.error("Failed to load contract:", err);
      } finally {
        setLoading(false);
      }
    };
    getDefaultContract();
  }, [user]);

  // ── Update contract template selection ───────────────────────────────────────
  const updateContractTemplate = async (templateId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/contract/${contract?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      if (response.ok) setContract({ ...contract, template_id: templateId });
    } catch (error) {
      console.error("Failed to update contract:", error);
    }
  };

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
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      sessionType: "", date: "", startTime: "", location: "", message: "",
    },
  });

  const selectedSession = watch("sessionType");
  const watchedDate     = watch("date");
  const watchedTime     = watch("startTime");
  const watchedLocation = watch("location");

  // Questionnaire unlocks only once date + time + location are all filled
  const canShowQuestionnaire =
    !!selectedSession &&
    !!watchedDate &&
    !!watchedTime &&
    !!watchedLocation?.trim();

  // ── Prefill from auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    const prefillFromAuth = async () => {
      if (!user) return;
      if (user.email) {
        setValue("email", user.email, { shouldValidate: true, shouldDirty: false });
        setEmailLocked(true);
      }
      const first = user.user_metadata?.first_name?.trim() || "";
      const last  = user.user_metadata?.last_name?.trim()  || "";
      if (first && !getValues("firstName")?.trim())
        setValue("firstName", first, { shouldValidate: true, shouldDirty: false });
      if (last && !getValues("lastName")?.trim())
        setValue("lastName", last, { shouldValidate: true, shouldDirty: false });
      await trigger(["email", "firstName", "lastName"]);
    };
    prefillFromAuth();
  }, [user, setValue, getValues, trigger]);

  // ── Fetch active QuestionnaireTemplate when session type changes ──────────────
  //
  // Flow:
  //   1. Look up SessionType row matching the selected session value string.
  //   2. Find the active QuestionnaireTemplate for that session_type_id.
  //   3. Parse schema_json → questions array for DynamicQuestionnaire.
  //
  useEffect(() => {
    if (!selectedSession) {
      setActiveTemplate(null);
      return;
    }

    const fetchTemplate = async () => {
      setQLoading(true);
      try {
        // Step 1 — resolve SessionType id
        const { data: stRow, error: stErr } = await supabase
          .from("SessionType")
          .select("id")
          .ilike("name", `%${selectedSession}%`)
          .limit(1)
          .single();

        if (stErr || !stRow) {
          console.warn("SessionType not found for:", selectedSession);
          setActiveTemplate(null);
          return;
        }

        // Step 2 — find active template for this session type
        const { data: template, error: tErr } = await supabase
          .from("QuestionnaireTemplate")
          .select("id, name, schema_json")
          .eq("session_type_id", stRow.id)
          .eq("active", true)
          .limit(1)
          .single();

        if (tErr || !template) {
          console.warn("No active QuestionnaireTemplate for:", selectedSession);
          setActiveTemplate(null);
          return;
        }

        // Step 3 — map schema_json to the shape DynamicQuestionnaire expects
        // schema_json entry: { id, label, type, required, options, order }
        // tempId = q.id so answers_json is keyed by the stable question id
        const questions = (template.schema_json ?? [])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((q) => ({
            tempId:   q.id,
            label:    q.label,
            type:     q.type,
            required: q.required ?? false,
            options:  q.options  ?? null,
          }));

        setActiveTemplate({ id: template.id, name: template.name, questions });
        setQAnswers({});
      } catch (err) {
        console.error("Error fetching QuestionnaireTemplate:", err);
        setActiveTemplate(null);
      } finally {
        setQLoading(false);
      }
    };

    fetchTemplate();
  }, [selectedSession]);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async (formData) => {
    if (submitLock) return;

    // Validate required questionnaire answers before anything hits the DB
    if (activeTemplate) {
      for (const q of activeTemplate.questions) {
        if (q.required && (!qAnswers[q.tempId] || qAnswers[q.tempId].length === 0)) {
          alert(`Please answer the required question: ${q.label}`);
          return;
        }
      }
    }

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const now      = new Date().toISOString();

      // ── 1) Insert Session ───────────────────────────────────────────────────
      const { data: sessionData, error: sessionError } = await supabase
        .from("Session")
        .insert({
          client_id:     user.id,
          start_at:      new Date(`${formData.date}T${formData.startTime}`).toISOString(),
          end_at:        new Date(`${formData.date}T${formData.startTime}`).toISOString(),
          location_text: formData.location || null,
          notes:         formData.message  || null,
          status:        "Pending",
          created_at:    now,
          updated_at:    now,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      const sessionId = sessionData.id;

      // ── 2) Insert questionnaire instance ───────────────────────────────────
      // Table name: lowercase "questionnaire" (as it appears in Supabase)
      // template_id → valid QuestionnaireTemplate UUID fetched above ✓
      if (activeTemplate) {
        const { data: qInstance, error: qInstError } = await supabase
          .from("questionnaire")                    // ← lowercase as in Supabase
          .insert({
            session_id:   sessionId,
            template_id:  activeTemplate.id,        // ← real QuestionnaireTemplate UUID
            status:       "Submitted",
            submitted_at: now,
            created_at:   now,
            // no `id` — Postgres generates via DEFAULT gen_random_uuid()
          })
          .select("id")
          .single();

        if (qInstError) {
          await supabase.from("Session").delete().eq("id", sessionId);
          throw qInstError;
        }

        // ── 3) Insert QuestionnaireResponse ──────────────────────────────────
        // answers_json keyed by question id from schema_json, e.g.:
        // { "q_due_date": "2026-04-15", "q_partner": "Yes", ... }
        const { error: respError } = await supabase
          .from("QuestionnaireResponse")
          .insert({
            questionnaire_id: qInstance.id,
            answers_json:     qAnswers,
            created_at:       now,
            // no `id` — Postgres generates via DEFAULT gen_random_uuid()
          });

        if (respError) {
          await supabase.from("Session").delete().eq("id", sessionId);
          throw respError;
        }
      }

      // ── 4) Stripe deposit checkout ──────────────────────────────────────────
      const stripeRes = await fetch("http://localhost:5001/api/payment/deposit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          from_url:   window.location.href,
          apply_tax:  true,
          tax_rate:   15,
        }),
      });
      const checkoutSession = await stripeRes.json();

      if (stripeRes.ok) {
        await supabase
          .from("Session")
          .update({ deposit_cs_id: checkoutSession.id })
          .eq("id", sessionId);

        await fetch(`http://localhost:5001/api/contract/${contract?.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, is_active: true }),
        });

        window.location.href = checkoutSession.url;
      } else {
        await supabase.from("Session").delete().eq("id", sessionId);
        alert("Stripe connection failed. Please try again.");
      }

      navigate("/dashboard/inquiry/success", {
        replace: true,
        state: {
          fullName,
          email:       formData.email,
          sessionType: formData.sessionType,
          dateTime:    `${formData.date} ${formData.startTime}`,
          startTime:   formData.startTime,
          location:    formData.location || "",
        },
      });
    } catch (e) {
      console.error("Submit error:", e);
      alert(`Sorry, something went wrong: ${e?.message ?? e}`);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────────
  const inputBase =
    "w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none " +
    "focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCaps = "text-[11px] tracking-[0.2em] text-[#7E4C3C]";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
        Loading details...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

      {/* ── Name ─────────────────────────────────────────────────────────────── */}
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

      {/* ── Email + Phone ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>EMAIL *</p>
          <input
            type="email"
            {...register("email")}
            placeholder="jane@example.com"
            readOnly={emailLocked}
            aria-readonly={emailLocked}
            className={`${inputBase} ${errors.email ? "border-red-500" : "border-black/10"} ${
              emailLocked ? "bg-neutral-100 text-neutral-600 cursor-not-allowed" : ""
            }`}
            aria-invalid={!!errors.email}
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            We'll use this email to confirm availability and send session details.
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

      {/* ── Session Type ──────────────────────────────────────────────────────── */}
      <div>
        <p className={labelCaps}>TYPE OF SESSION</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SESSION_TYPES.map((s) => {
            const active = selectedSession === s.value;
            return (
              <label
                key={s.value}
                className={`group cursor-pointer rounded-lg border overflow-hidden bg-white/60 shadow-sm transition ${
                  active
                    ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20"
                    : "border-black/10 hover:border-black/20"
                }`}
              >
                <input type="radio" value={s.value} {...register("sessionType")} className="sr-only" />
                <div className="h-28 w-full bg-neutral-100 overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.label}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
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

      {/* ── Date / Time + Location ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <p className={labelCaps}>DATE</p>
            <input
              type="date"
              min={minDate}
              {...register("date")}
              className={`${inputBase} ${errors.date ? "border-red-500" : "border-black/10"}`}
              aria-invalid={!!errors.date}
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
          </div>
          <div>
            <p className={labelCaps}>START TIME</p>
            <input
              type="time"
              {...register("startTime")}
              className={`${inputBase} ${errors.startTime ? "border-red-500" : "border-black/10"}`}
            />
          </div>
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

      {/* ── Questionnaire ─────────────────────────────────────────────────────── */}
      {selectedSession && (
        <div className="transition-all">
          {!canShowQuestionnaire ? (
            <p className="text-[12px] text-neutral-400 italic">
              Fill in your date, time, and location above to unlock session questions.
            </p>
          ) : qLoading ? (
            <p className="text-center text-xs text-neutral-400">Loading session questions...</p>
          ) : activeTemplate ? (
            <div>
              <p className="text-[11px] tracking-[0.2em] text-[#7E4C3C] mb-3 uppercase">
                {activeTemplate.name}
              </p>
              <DynamicQuestionnaire
                questions={activeTemplate.questions}
                answers={qAnswers}
                onChange={setQAnswers}
              />
            </div>
          ) : (
            <p className="text-[12px] text-neutral-400 italic">
              No questionnaire found for this session type.
            </p>
          )}
        </div>
      )}

      {/* ── Message ───────────────────────────────────────────────────────────── */}
      <div>
        <textarea
          rows={5}
          {...register("message")}
          className={`${inputBase} ${errors.message ? "border-red-500" : "border-black/10"}`}
          placeholder="Tell me about your vision..."
          aria-invalid={!!errors.message}
        />
        <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed">
          Please share any details about the memories you'd like to create. Feel free to mention
          style preferences, important moments, or unique ideas for your session.
        </p>
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
      </div>

      {/* ── Contract ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6">
        <div className="text-xl flex flex-row font-serif text-brown border-b border-[#E7DFCF] pb-2">
          <h2 className="flex w-full">Contract</h2>
          <select
            value={contract?.template_id || ""}
            onChange={(e) => updateContractTemplate(e.target.value)}
            className="px-2 py-1 rounded-md text-sm font-semibold border"
            disabled={contract?.status === "Signed"}
          >
            <option disabled value="">Select</option>
            {Object.keys(contractTemplates).map((key) => (
              <option key={key} value={key}>
                {contractTemplates[key].name}
              </option>
            ))}
          </select>
        </div>
        <ContractDetail
          contract={contract}
          contractTemplate={contractTemplates[contract?.template_id] || null}
          onSigned={(signedContract) => {
            setContract(signedContract);
            setSubmitLock(false);
          }}
        />
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm">
          <button
            type="submit"
            disabled={isSubmitting || submitLock}
            className="w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit My Inquiry"}
          </button>
          <div className="mt-4 flex items-center gap-3 text-sm text-neutral-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 bg-white">
              ✉️
            </span>
            <p className="text-[12px]">I will follow up within 24 hours to confirm details.</p>
          </div>
          <div className="mt-4 border-t border-black/10 pt-4 space-y-2 text-[12px] text-neutral-700">
            <div className="flex items-center gap-2">
              <span className="text-[#AB8C4B]">★</span>
              <span>Trusted by 100+ families</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#AB8C4B]">★</span>
              <span>Serving Vacaville &amp; surrounding areas</span>
            </div>
          </div>
        </div>
      </div>

    </form>
  );
}