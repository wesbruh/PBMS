import { useNavigate, useSearchParams } from "react-router-dom";
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
  { value: "newborn", label: "Newborn", img: "/images/Maternity6.jpg" },
  { value: "family", label: "Family", img: "/images/temp_tc.jpg" },
  { value: "weddings", label: "Weddings", img: "/images/Weddings1.jpeg" },
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
    .regex(/^[0-9+\-\s()]*$/, "Digits and + - ( ) only")
    .optional()
    .or(z.literal("")),
  sessionType: z.enum(["maternity", "newborn", "family", "weddings"], {
    required_error: "Select a session type",
  }),
  date: z.string().refine(isTodayOrFuture, { message: "Pick today or a future date" }),
  startTime: z.string(),
  location: z.string().optional(),
  message: z.string().max(1000, "Max 1000 characters").optional(),
});

export default function InquiryForm() {
  const navigate = useNavigate();
  const { profile: user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState(null);
  const [loadingParams, setLoadingParams] = useState(true);

  const [emailLocked, setEmailLocked] = useState(false);
  const [phoneLocked, setPhoneLocked] = useState(false);

  const [contractTemplates, setContractTemplates] = useState({});
  const [contract, setContract] = useState(null);

  const [submitLock, setSubmitLock] = useState(true);
  const [loading, setLoading] = useState(true);

  const [activeTemplate, setActiveTemplate] = useState(null);
  const [qAnswers, setQAnswers] = useState({});
  const [qALoading, setQALoading] = useState(false);
  const [qLoading, setQLoading] = useState(false);

  // ── Load search params ───────────────────────────────────────────────────
  useEffect(() => {
    const loadSearchParams = async () => {
      setSessionId(searchParams.get("session_id") || null);
      setCheckoutSessionId(searchParams.get("checkout_session_id") || null);
      setLoadingParams(false);
    };

    loadSearchParams();
  }, []);

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
      if (!user || loadingParams) return;

      try {
        if (sessionId && checkoutSessionId) {
          const response = await fetch(`http://localhost:5001/api/contract`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, session_id: sessionId })
          });
          const data = await response.json();
          setContract(data);
        } else {
          const response = await fetch("http://localhost:5001/api/contract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });
          const data = await response.json();
          setContract(data);
        }
      } catch (err) {
        console.error("Failed to load contract:", err);
      } finally {
        setLoading(false);
      }
    };

    getDefaultContract();
  }, [user, loadingParams]);

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
  const selectedDate = watch("date");
  const selectedTime = watch("startTime");

  // ── FIX: location is optional — questionnaire unlocks with just date + time ──
  const canShowQuestionnaire = !!selectedSession

  // ── Prefill Form ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const prefillForm = async () => {
      if (!user || loadingParams) return;

      if (sessionId && checkoutSessionId) {
        // coming from Stripe, with session details in DB
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .from("Session")
            .select("SessionType(name), start_at, location_text, notes")
            .eq("id", sessionId)
            .eq("is_active", false)
            .single();

          if (sessionError) throw new Error("Session not found");

          const dateTime = new Date(sessionData.start_at);

          const firstName = user?.first_name?.trim() || "";
          const lastName = user?.last_name?.trim() || "";
          const sessionType = sessionData.SessionType.name.trim() || null;
          const date = sessionData.start_at ? `${dateTime.getFullYear()}` + "-" +
            `${(dateTime.getMonth() + 1).toString().padStart(2, "0")}` + "-" +
            `${dateTime.getDate().toString().padStart(2, "0")}` :
            null;
          const startTime = sessionData.start_at ? `${dateTime.getHours().toString().padStart(2, "0")}` + ":" +
            `${dateTime.getMinutes().toString().padStart(2, "0")}` :
            null;
          const location = sessionData.location_text || null;
          const message = sessionData.notes || null;

          // save questionnaire answers if applicable
          const { data: qInstance } = await supabase
            .from("questionnaire")
            .select("id")
            .eq("session_id", sessionId)
            .single();

          const { data: resData } = await supabase
            .from("QuestionnaireResponse")
            .select()
            .eq("questionnaire_id", qInstance.id)
            .single();

          setQAnswers(resData?.answers_json || {})
          setQALoading(true);

          if (firstName) setValue("firstName", firstName, { shouldValidate: true, shouldDirty: false });
          if (lastName) setValue("lastName", lastName, { shouldValidate: true, shouldDirty: false });
          if (user.email) setValue("email", user.email, { shouldValidate: true, shouldDirty: false });
          if (user.phone) setValue("phone", user.phone, { shouldValidate: true, shouldDirty: false });
          if (date) setValue("date", date, { shouldValidate: true, shouldDirty: false });
          if (startTime) setValue("startTime", startTime, { shouldValidate: true, shouldDirty: false });
          if (sessionType) setValue("sessionType", sessionType, { shouldValidate: true, shouldDirty: false });
          if (location) setValue("location", location, { shouldValidate: true, shouldDirty: false });
          if (message) setValue("message", message, { shouldValidate: true, shouldDirty: false });

          await trigger(["firstName", "lastName", "email", "phone", "date", "startTime", "sessionType", "location"]);
          setSubmitLock(false);
        } catch (error) {
          console.error("Error pre-filling from session:", error);
        }
      } else {
        const first = user?.first_name?.trim() || "";
        const last = user?.last_name?.trim() || "";

        if (first && !getValues("firstName")?.trim())
          setValue("firstName", first, { shouldValidate: true, shouldDirty: false });
        if (last && !getValues("lastName")?.trim())
          setValue("lastName", last, { shouldValidate: true, shouldDirty: false });

        if (user.email) {
          setValue("email", user.email, { shouldValidate: true, shouldDirty: false });
          setEmailLocked(true);
        }

        if (user.phone) {
          setValue("phone", user.phone, { shouldValidate: true, shouldDirty: false });
          setPhoneLocked(true);
        }

        await trigger(["firstName", "lastName", "email", "phone"]);
      }
    };

    prefillForm();
  }, [user, loadingParams, setValue, getValues, trigger]);

  // ── Fetch active QuestionnaireTemplate for selected session type ──────────────
  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const fetchTemplate = async () => {
      setQLoading(true);
      try {
        const { data: stRow, error: stErr } = await supabase
          .from("SessionType")
          .select("id")
          .eq("name", selectedSession)
          .single();

        if (stErr) throw new Error("Session type not found");

        const { data: template, error: tErr } = await supabase
          .from("QuestionnaireTemplate")
          .select("id, name, schema_json")
          .eq("session_type_id", stRow.id)
          .eq("active", true)
          .single();

        if (tErr) throw new Error("Questionnaire template not found for session type");

        const questions = (template.schema_json ?? [])
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((q) => ({
            tempId: q.id,
            label: q.label,
            type: q.type,
            required: q.required ?? false,
            options: q.options ?? null,
          }));

        setActiveTemplate({ id: template.id, name: template.name, questions });

        if (qALoading)
          setQALoading(false);
        else
          setQAnswers({})
      } catch (err) {
        console.error("Error fetching QuestionnaireTemplate:", err);
        setActiveTemplate(null);
      } finally {
        setQLoading(false);
      }
    };
    fetchTemplate();
  }, [selectedSession]);

  // ── Payment ──────────────────-────────────────────────────────────────────────
  const handlePayment = async () => {
    try {
      const now = new Date().toISOString();

      // delete all inactive sessions for user to prevent duplicates
      // on delete cascade should remove any related contracts and questionnaires as well
      const { error: delError } = await supabase
        .from("Session")
        .delete()
        .eq("client_id", user.id)
        .eq("is_active", false);

      if (delError) throw delError;

      // get session type id
      const { data: sessionTypeData, error: sessionTypeError } = await supabase
        .from("SessionType")
        .select("id, name, description, base_price")
        .eq("name", getValues("sessionType") || "")
        .single();

      // session type does not exist in db
      if (sessionTypeError) throw sessionTypeError;

      // save/insert current session information to DB
      const { data: sessionData, error: sessionError } = await supabase
        .from("Session")
        .insert({
          client_id: user.id,
          session_type_id: sessionTypeData?.id || null,
          start_at: new Date(`${getValues("date")}T${getValues("startTime")}`).toISOString() || null,
          end_at: new Date(`${getValues("date")}T${getValues("startTime")}`).toISOString() || null,
          location_text: getValues("location") || null,
          notes: getValues("message") || null,
          status: "Pending",
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // link contract to session
      const { error: contractError } = await supabase
        .from("Contract")
        .update({ session_id: sessionData.id })
        .eq("id", contract.id);

      if (contractError) throw contractError;

      // save questionnaire answers if applicable
      const { data: qInstance, error: qInstError } = await supabase
        .from("questionnaire")
        .insert({
          session_id: sessionData.id,
          template_id: activeTemplate.id,
          status: "In Progress"
        })
        .select("id")
        .single();

      if (qInstError) {
        await supabase.from("Session").delete().eq("id", sessionData.id);
        throw qInstError;
      }

      const { error: respError } = await supabase
        .from("QuestionnaireResponse")
        .insert({
          questionnaire_id: qInstance.id,
          answers_json: qAnswers
        });

      if (respError) {
        await supabase.from("Session").delete().eq("id", sessionId);
        throw respError;
      }

      // create Stripe checkout session
      const response = await fetch("http://localhost:5001/api/payment/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.id,
          from_url: window.location.href,
          product_data: {
            name: `${sessionTypeData.name} Session - Deposit`,
            description: sessionTypeData.description,
          },
          price: (sessionTypeData.base_price) * 0.05, // 5% deposit
          apply_tax: true,
          tax_rate: 5,
        }),
      });

      const checkoutSession = await response.json();

      if (!response.ok) throw new Error("Stripe connection failed. Please try again.");

      window.location.href = checkoutSession.url;
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async () => {
    if (activeTemplate) {
      for (const q of activeTemplate.questions) {
        if (q.required && (!qAnswers[q.tempId] || qAnswers[q.tempId].length === 0)) {
          alert(`Please answer the required question: ${q.label}`);
          return;
        }
      }
    }

    try {
      const now = new Date().toISOString();

      // mark contract active
      const { error: contractError } = await supabase
        .from("Contract")
        .update({
          is_active: true
        })
        .eq("session_id", sessionId);

      if (contractError) throw contractError;

      // mark session active
      const { error: sessionError } = await supabase
        .from("Session")
        .update({
          deposit_cs_id: checkoutSessionId,
          is_active: true
        })
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // update questionaire + answers if applicable
      if (activeTemplate) {
        const { data: qInstance, error: qInstError } = await supabase
          .from("questionnaire")
          .update({
            status: "Submitted",
            submitted_at: now,
            created_at: now,
          })
          .eq("session_id", sessionId)
          .select()
          .single();

        if (qInstError) {
          await supabase.from("Session").delete().eq("id", sessionId);
          throw qInstError;
        }

        const { error: respError } = await supabase
          .from("QuestionnaireResponse")
          .update({
            answers_json: qAnswers,
            created_at: now,
          })
          .eq("questionnaire_id", qInstance.id);

        if (respError) {
          await supabase.from("Session").delete().eq("id", sessionId);
          throw respError;
        }
      }

      navigate(`/dashboard/inquiry/success?session_id=${sessionId}`, { replace: true, state: { sessionId } });
    } catch (e) {
      console.error("Submit error:", e);
      alert(`Sorry, something went wrong: ${e?.message ?? e}`);
    }
  };

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
            readOnly={!submitLock}
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
            readOnly={!submitLock}
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
            readOnly={!submitLock || emailLocked}
            aria-readonly={emailLocked}
            className={`${inputBase} ${errors.email ? "border-red-500" : "border-black/10"} ${emailLocked ? "bg-neutral-100 text-neutral-600 cursor-not-allowed" : ""
              }`}
            aria-invalid={!!errors.email}
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            We'll use this email to confirm availability and send session details.
          </p>
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <p className={labelCaps}>
            PHONE NUMBER <span className="text-neutral-500 tracking-normal">(optional)</span>
          </p>
          <input
            {...register("phone")}
            placeholder="123-456-7890"
            readOnly={!submitLock || phoneLocked}
            aria-readonly={phoneLocked}
            className={`${inputBase} ${errors.phone ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      {/* ── Session Type ──────────────────────────────────────────────────────── */}
      <div>
        <p className={labelCaps}>TYPE OF SESSION *</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SESSION_TYPES.map((s) => {
            const active = selectedSession === s.value;
            return (
              <label
                key={s.value}
                className={`group cursor-pointer rounded-lg border overflow-hidden bg-white/60 shadow-sm transition ${active
                  ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20"
                  : "border-black/10 hover:border-black/20"
                  }`}
              >
                <input type="radio" value={s.value} {...register("sessionType")} disabled={!submitLock} className="sr-only" />
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
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${active ? "border-[#7E4C3C]" : "border-black/30"
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

      {/* ── Questionnaire — unlocks once session + date + time are set ───────── */}
      {selectedSession && (
        <div className="transition-all">
          {!canShowQuestionnaire ? (
            <p className="text-[12px] text-neutral-400 italic">
              Fill in your date and time above to unlock session questions.
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

      {/* ── Date / Time + Location ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <p className={labelCaps}>DATE *</p>
            <input
              type="date"
              min={minDate}
              {...register("date")}
              readOnly={!submitLock}
              className={`${inputBase} ${errors.date ? "border-red-500" : "border-black/10"}`}
              aria-invalid={!!errors.date}
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
          </div>
          {selectedDate ? (
            <div>
              <p className={labelCaps}>START TIME *</p>
              <input
                type="time"
                {...register("startTime")}
                readOnly={!submitLock}
                className={`${inputBase} ${errors.startTime ? "border-red-500" : "border-black/10"}`}
              />
            </div>) : (<></>)
          }
        </div>
        <div>
          <p className={labelCaps}>
            LOCATION <span className="text-neutral-500 tracking-normal">(optional)</span>
          </p>
          <input
            {...register("location")}
            placeholder="Sacramento, CA"
            readOnly={!submitLock}
            className={`${inputBase} ${errors.location ? "border-red-500" : "border-black/10"}`}
            aria-invalid={!!errors.location}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
          )}
        </div>
      </div>

      {/* ── Message ───────────────────────────────────────────────────────────── */}
      <div>
        <textarea
          rows={5}
          {...register("message")}
          placeholder="Tell me about your vision..."
          readOnly={!submitLock}
          className={`${inputBase} ${errors.message ? "border-red-500" : "border-black/10"}`}
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
        <div className="flex flex-row">
          <p className={`${labelCaps} w-full`}>CONTRACT *</p>
          <select
            value={contract?.template_id || ""}
            onChange={(e) => updateContractTemplate(e.target.value)}
            className="px-2 py-1 rounded-md text-sm font-semibold border"
            disabled={!submitLock || contract?.status === "Signed"}
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
          }}
        />
      </div>

      {/* ── Payment / Submit Button ──────────────────────────────────────────-── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm space-y-3">
          <h2 className={labelCaps}>PAYMENT *</h2>
          <button
            type="button"
            onClick={handlePayment}
            className="w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!submitLock || checkoutSessionId || !activeTemplate || !selectedDate || !selectedTime || contract?.status !== "Signed"}
          >
            Authorize Payment
          </button>
        </div>
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
      </div>
    </form>
  );
}


/*

      const stripeRes = await fetch("http://localhost:5001/api/payment/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          from_url: window.location.href,
          apply_tax: true,
          tax_rate: 5,
        }),
      });
      
      const checkoutSession = await stripeRes.json();

      if (stripeRes.ok) {
        await supabase
          .from("Session")
          .update({ deposit_cs_id: checkoutSession.id })
          .eq("id", sessionId);

        await fetch(`http://localhost:5001/api/contract/${contract?.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, is_active: true }),
        });

        window.location.href = checkoutSession.url;
      } else {
        await supabase.from("Session").delete().eq("id", sessionId);
        alert("Stripe connection failed. Please try again.");
      }
*/