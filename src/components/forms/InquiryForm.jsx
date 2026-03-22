// src/components/forms/InquiryForm.jsx

import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

import ContractDetail from "../../pages/Dashboard/ContractDetail";
import DynamicQuestionnaire from "./DynamicQuestionnaire";
import TimeSlotGrid from "../TimeSlotGrid/TimeSlotGrid";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET       = "session-images";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

const isTodayOrFuture = (value) => {
  if (!value) return false;
  const d = new Date(value);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return d >= t;
};

const Schema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z
    .string()
    .trim(),
  date: z.string().refine(isTodayOrFuture, { message: "Pick today or a future date" }),
  startTime: z.string(),
  location: z.string().optional(),
  message: z.string().max(1000, "Max 1000 characters").optional(),
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function InquiryForm() {
  const navigate = useNavigate();
  const { profile: user } = useAuth();

  const [searchParams]      = useSearchParams();
  const [sessionId,          setSessionId]          = useState(null);
  const [checkoutSessionId,  setCheckoutSessionId]  = useState(null);
  const [loadingParams,      setLoadingParams]      = useState(true);

  const [contractTemplates, setContractTemplates] = useState({});
  const [contract,          setContract]          = useState(null);
  const [submitLock,        setSubmitLock]        = useState(true);
  const [loading,           setLoading]           = useState(true);

  // ── Session types + packages from DB ─────────────────────────────────────
  // sessionTypes: SessionType row + packages array attached
  const [sessionTypes,       setSessionTypes]       = useState([]);
  const [sessionTypesLoading,setSessionTypesLoading]= useState(true);

  // Selected session type row (full object)
  const [selectedSessionType, setSelectedSessionType] = useState(null);
  // Selected package id within that session type (null = base session, no package)
  const [selectedPackageId,   setSelectedPackageId]   = useState(null);

  // Duration for TimeSlotGrid — comes from selected package or base session
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Questionnaire
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [qAnswers,        setQAnswers]       = useState({});
  const [qALoading,       setQALoading]      = useState(false);
  const [qLoading,        setQLoading]       = useState(false);

  // ── Load search params ────────────────────────────────────────────────────
  useEffect(() => {
    setSessionId(searchParams.get("session_id") || null);
    setCheckoutSessionId(searchParams.get("checkout_session_id") || null);
    setLoadingParams(false);
  }, []);

  // ── Load active session types + their packages ────────────────────────────
  useEffect(() => {
    async function loadSessionTypes() {
      setSessionTypesLoading(true);
      try {
        const { data: types, error: tErr } = await supabase
          .from("SessionType")
          .select("*")
          .eq("active", true)
          .order("display_order", { ascending: true })
          .order("name",          { ascending: true });

        if (tErr) throw tErr;

        const { data: packages, error: pErr } = await supabase
          .from("Package")
          .select("*")
          .order("display_order", { ascending: true });

        if (pErr) throw pErr;

        // Group packages onto their session type
        const pkgMap = {};
        (packages ?? []).forEach((pkg) => {
          if (!pkgMap[pkg.session_type_id]) pkgMap[pkg.session_type_id] = [];
          pkgMap[pkg.session_type_id].push(pkg);
        });

        const enriched = (types ?? []).map((st) => ({
          ...st,
          packages: pkgMap[st.id] ?? [],
        }));

        setSessionTypes(enriched);
      } catch (err) {
        console.error("Failed to load session types:", err);
      } finally {
        setSessionTypesLoading(false);
      }
    }
    loadSessionTypes();
  }, []);

  // ── Load contract templates ───────────────────────────────────────────────
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

  // ── Load / create default contract ───────────────────────────────────────
  useEffect(() => {
    const getDefaultContract = async () => {
      if (!user || loadingParams) return;
      try {
        if (sessionId && checkoutSessionId) {
          const response = await fetch("http://localhost:5001/api/contract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, session_id: sessionId }),
          });
          setContract(await response.json());
        } else {
          const response = await fetch("http://localhost:5001/api/contract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id }),
          });
          setContract(await response.json());
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
      date: "", startTime: "", location: "", message: ""
    },
  });

  const watchedDate      = watch("date");
  const watchedStartTime = watch("startTime");

  // ── When session type is selected, set default package + duration ─────────
  function handleSelectSessionType(st) {
    setSelectedSessionType(st);
    setValue("sessionTypeId", st.id, { shouldValidate: true });

    // Auto-select the default package if one exists
    const defaultPkg = (st.packages ?? []).find((p) => p.is_default) ?? null;
    setSelectedPackageId(defaultPkg?.id ?? null);

    // Duration: default_duration_minutes on the session type or package
    const dur = defaultPkg?.duration_minutes
      ?? st.default_duration_minutes
      ?? 60;
    setDurationMinutes(dur);

    // Reset time when session type changes
    setValue("startTime", "", { shouldValidate: false });
  }

  // ── When package is (re-)selected within a session type ───────────────────
  function handleSelectPackage(pkgId) {
    // If already selected → deselect back to base session
    if (pkgId === selectedPackageId) {
      setSelectedPackageId(null);
      setDurationMinutes(selectedSessionType?.default_duration_minutes ?? 60);
      setValue("startTime", "", { shouldValidate: false });
      return;
    }

    setSelectedPackageId(pkgId);
    const pkg = (selectedSessionType?.packages ?? []).find((p) => p.id === pkgId);
    const dur = pkg?.duration_minutes ?? selectedSessionType?.default_duration_minutes ?? 60;
    setDurationMinutes(dur);
    // Reset time when package changes (duration may differ)
    setValue("startTime", "", { shouldValidate: false });
  }

  // ── TimeSlotGrid callback ─────────────────────────────────────────────────
  function handleTimeSelect(start, end) {
    setValue("startTime", start, { shouldValidate: true });
    // end is stored separately for display; the form only needs startTime
    // (end_at is derived on submit from start + durationMinutes)
  }

  // ── Fetch questionnaire template when session type changes ────────────────
  useEffect(() => {
    if (!selectedSessionType) {
      return;
    }

    const fetchTemplate = async () => {
      try {
        const { data: template, error: tErr } = await supabase
          .from("QuestionnaireTemplate")
          .select("id, name, schema_json")
          .eq("session_type_id", selectedSessionType.id)
          .eq("active", true)
          .single();

        if (tErr || !template) { setActiveTemplate(null); return; }

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

        if (qALoading) setQALoading(false);
      } catch (err) {
        console.error("Error fetching QuestionnaireTemplate:", err);
        setActiveTemplate(null);
      }
    };

    fetchTemplate();
  }, [selectedSessionType, qALoading]);

  // ── Prefill form (from auth + Stripe return) ──────────────────────────────
  useEffect(() => {
    const prefillForm = async () => {
      if (!user || loadingParams || sessionTypesLoading) return;

      if (sessionId && checkoutSessionId) {
        // Returning from Stripe — load existing session from DB
        try {
          const { data: sessionData, error: sessionError } = await supabase
            .from("Session")
            .select("session_type_id, start_at, location_text, notes")
            .eq("id", sessionId)
            .eq("is_active", false)
            .single();

          if (sessionError) throw new Error("Session not found");

          // Match the session type from loaded list
          const matchedST = sessionTypes.find((st) => st.id === sessionData.session_type_id);
          if (matchedST) handleSelectSessionType(matchedST);

          const dateTime  = new Date(sessionData.start_at);
          const datePart  = dateTime.toISOString().split("T")[0];
          const timePart  = `${dateTime.getUTCHours().toString().padStart(2, "0")}:${dateTime.getUTCMinutes().toString().padStart(2, "0")}`;

          // Load questionnaire answers
          try {
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
            
            setQAnswers(resData?.answers_json || {});
            setQALoading(true);
          } catch (_) { /* no questionnaire saved yet */ }

          setValue("firstName",   user?.first_name?.trim());
          setValue("lastName",    user?.last_name?.trim());
          setValue("email",       user.email);
          setValue("phone",       user.phone);
          setValue("date",        datePart,                        { shouldValidate: true, shouldDirty: false });
          setValue("startTime",   timePart,                        { shouldValidate: true, shouldDirty: false });
          if (sessionData.location_text) setValue("location", sessionData.location_text, { shouldValidate: true, shouldDirty: false });
          if (sessionData.notes)         setValue("message",  sessionData.notes,         { shouldValidate: true, shouldDirty: false });

          await trigger(["firstName", "lastName", "email", "phone", "date", "startTime", "location"]);
          setSubmitLock(false);
        } catch (error) {
          console.error("Error pre-filling from session:", error);
        }
      } else {
        // Fresh form — prefill from profile
        const first = user?.first_name?.trim() || "";
        const last  = user?.last_name?.trim()  || "";

        if (first) setValue("firstName", first);
        if (last)  setValue("lastName",  last);

        if (user.email) setValue("email", user.email);
        if (user.phone) setValue("phone", user.phone);

        await trigger(["firstName", "lastName", "email", "phone"]);
      }
    };
    prefillForm();
  }, [user, loadingParams, sessionTypesLoading]);

  // ── Payment handler ───────────────────────────────────────────────────────
  const handlePayment = async () => {
    try {
      const now = new Date().toISOString();

      // Delete all inactive (draft) sessions for this user to prevent duplicates
      await supabase.from("Session").delete().eq("client_id", user.id).eq("is_active", false);

      const startAt = new Date(`${getValues("date")}T${getValues("startTime")}`).toISOString();
      const endAt   = new Date(
        new Date(`${getValues("date")}T${getValues("startTime")}`).getTime() + durationMinutes * 60 * 1000
      ).toISOString();

      // Insert session
      const { data: sessionData, error: sessionError } = await supabase
        .from("Session")
        .insert({
          client_id:       user.id,
          session_type_id: selectedSessionType?.id ?? null,
          start_at:        startAt,
          end_at:          endAt,
          location_text:   getValues("location") || null,
          notes:           getValues("message")  || null,
          status:          "Pending",
          created_at:      now,
          updated_at:      now,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Link contract to session
      await supabase
        .from("Contract")
        .update({ session_id: sessionData.id })
        .eq("id", contract.id);

      // Save questionnaire
      if (activeTemplate) {
        const { data: qInstance, error: qInstError } = await supabase
          .from("questionnaire")
          .insert({
            session_id:  sessionData.id,
            template_id: activeTemplate.id,
            status:      "In Progress",
          })
          .select("id")
          .single();

        if (qInstError) {
          await supabase.from("Session").delete().eq("id", sessionData.id);
          throw qInstError;
        }

        const { error: respError } = await supabase
          .from("QuestionnaireResponse")
          .insert({questionnaire_id: qInstance.id, answers_json: qAnswers})

        if (respError) {
          await supabase.from("Session").delete().eq("id", sessionData.id);
          throw respError;
        }
      }
      
      // create Stripe checkout session
      const response = await fetch("http://localhost:5001/api/checkout/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id:   sessionData.id,
          from_url:     window.location.href,
          product_data: {
            name:        `${selectedSessionType?.name ?? "Session"} Deposit`,
            description: selectedSessionType?.description || "",
          },
          price:     (selectedSessionType?.base_price ?? 0) * 0.05,
          apply_tax: true,
          tax_rate:  7.25,
        }),
      });

      if (!response.ok) throw new Error("Stripe connection failed. Please try again.");

      const checkoutSession = await response.json(); // ← was `stripeRes` bug, fixed
      window.location.href = checkoutSession.url;
    } catch (err) {
      console.error("Payment error:", err);
      alert(`Payment failed: ${err?.message ?? err}`);
    }
  };

  // ── Submit (called after Stripe return) ──────────────────────────────────
  const onSubmit = async () => {
    // Validate required questionnaire answers
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

      // Activate contract
      await supabase
        .from("Contract")
        .update({ is_active: true })
        .eq("session_id", sessionId);

      // Activate session
      const { error: sessionError } = await supabase
        .from("Session")
        .update({ deposit_cs_id: checkoutSessionId, is_active: true })
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      // Update questionnaire + answers
      if (activeTemplate) {
        const { data: qInstance, error: qInstError } = await supabase
          .from("questionnaire")
          .update({ status: "Submitted", submitted_at: now, created_at: now })
          .eq("session_id", sessionId)
          .select()
          .single();

        if (qInstError) throw qInstError;

        // Update existing response rows (one per question)
        for (const q of activeTemplate.questions) {
          const raw        = qAnswers[q.tempId];
          const type       = (q.type ?? "short_text").toLowerCase().trim();
          const isCheckbox = type === "checkbox";

          await supabase
            .from("QuestionnaireResponse")
            .update({
              answer:       isCheckbox ? null : (raw ?? null),
              answer_array: isCheckbox ? (Array.isArray(raw) ? raw : []) : null,
              created_at:   now,
            })
            .eq("questionnaire_id", qInstance.id)
            .eq("question_id", q.tempId);
        }
      }

      navigate(`/dashboard/inquiry/success?session_id=${sessionId}`, {
        replace: true,
        state: { sessionId },
      });
    } catch (e) {
      console.error("Submit error:", e);
      alert(`Sorry, something went wrong: ${e?.message ?? e}`);
    }
  };

  // ── Derived: is payment button enabled? ──────────────────────────────────
  const canPay = submitLock && !checkoutSessionId && !!selectedSessionType && !!watchedDate && !!watchedStartTime && contract?.status === "Signed";

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputBase  = "w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCaps  = "text-[11px] tracking-[0.2em] text-[#7E4C3C]";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
        Loading details...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

      {/* ── Name ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>FIRST NAME *</p>
          <input
            {...register("firstName")}
            readOnly={true}
            className={`${inputBase}bg-neutral-100 text-neutral-600 cursor-not-allowed`}
          />
        </div>
        <div>
          <p className={labelCaps}>LAST NAME *</p>
          <input
            {...register("lastName")}
            readOnly={true}
            className={`${inputBase}bg-neutral-100 text-neutral-600 cursor-not-allowed`}
            />
        </div>
      </div>

      {/* ── Email + Phone ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>EMAIL *</p>
          <input
            type="email"
            {...register("email")}
            readOnly={true}
            aria-readonly={true}
            className={`${inputBase}bg-neutral-100 text-neutral-600 cursor-not-allowed`}
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            We'll use this email to confirm availability and send session details.
          </p>
        </div>
        <div>
          <p className={labelCaps}>
            PHONE NUMBER
          </p>
          <input
            {...register("phone")}
            placeholder="No phone number provided."
            readOnly={true}
            aria-readonly={true}
            className={`${inputBase}bg-neutral-100 text-neutral-600 cursor-not-allowed`}
          />
        </div>
      </div>

      {/* ── Session Type (from DB) ─────────────────────────────────────────── */}
      <div>
        <p className={labelCaps}>TYPE OF SESSION *</p>

        {sessionTypesLoading ? (
          <p className="mt-3 text-xs text-neutral-400">Loading sessions…</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sessionTypes.map((st) => {
              const isSelected = selectedSessionType?.id === st.id;
              const imageUrl   = getImageUrl(st.image_path);

              return (
                <div key={st.id} className="flex flex-col gap-0">
                  {/* Session type card */}
                  <label
                    onClick={() => { if (submitLock) handleSelectSessionType(st); }}
                    className={`group cursor-pointer rounded-lg border overflow-hidden bg-white/60 shadow-sm transition
                      ${isSelected
                        ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20"
                        : "border-black/10 hover:border-black/20"
                      }
                      ${!submitLock ? "pointer-events-none" : ""}
                    `}
                  >
                    {/* Hidden input for form validation */}
                    <input
                      type="radio"
                      value={st.id}
                      {...register("sessionTypeId")}
                      checked={isSelected}
                      onChange={() => handleSelectSessionType(st)}
                      disabled={!submitLock}
                      className="sr-only"
                    />

                    {/* Image */}
                    <div className="h-28 w-full bg-neutral-100 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={st.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-neutral-50">
                          <span className="text-neutral-300 text-xs">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Label row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? "border-[#7E4C3C]" : "border-black/30"}`}>
                        {isSelected && <span className="h-2 w-2 rounded-full bg-[#7E4C3C]" />}
                      </span>
                      <div>
                        <p className="font-serif text-sm text-[#7E4C3C]">{st.name}</p>
                        {st.price_label || st.base_price ? (
                          <p className="text-[10px] text-neutral-500">
                            {st.price_label || `FROM: $${Number(st.base_price).toLocaleString()}`}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </label>

                  {/* Package options — shown only when this session type is selected */}
                  {isSelected && (st.packages ?? []).length > 0 && (
                    <div className="mt-1 rounded-b-lg border border-t-0 border-[#7E4C3C]/20 bg-neutral-50/80 px-3 py-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
                        Packages
                      </p>
                      {st.packages
                        .slice()
                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map((pkg) => {
                          const pkgSelected = selectedPackageId === pkg.id;
                          const pkgGreyed   = !!selectedPackageId && !pkgSelected;
                          const pkgImageUrl = getImageUrl(pkg.image_path);

                          return (
                            <div
                              key={pkg.id}
                              onClick={() => { if (submitLock) handleSelectPackage(pkg.id); }}
                              className={`flex gap-2 rounded-lg border p-2 cursor-pointer transition-all
                                ${pkgSelected
                                  ? "border-[#7E4C3C] ring-1 ring-[#7E4C3C]/20 bg-white"
                                  : pkgGreyed
                                    ? "opacity-40 border-neutral-200 bg-white"
                                    : "border-neutral-200 bg-white hover:border-[#7E4C3C]/40"
                                }
                                ${!submitLock ? "pointer-events-none" : ""}
                              `}
                            >
                              {pkgImageUrl && (
                                <div className="shrink-0 w-12 h-12 rounded overflow-hidden bg-neutral-100">
                                  <img src={pkgImageUrl} alt={pkg.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-neutral-800">
                                  {pkg.name}
                                  {pkg.is_default && (
                                    <span className="ml-1.5 text-[9px] text-[#AB8C4B] font-mono uppercase">standard</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-[#7E4C3C]">
                                  {pkg.price_label || (pkg.base_price ? `FROM: $${Number(pkg.base_price).toLocaleString()}` : "")}
                                </p>
                                {Array.isArray(pkg.bullet_points) && pkg.bullet_points.length > 0 && (
                                  <ul className="mt-0.5 space-y-0.5 text-[9px] text-neutral-400 list-disc list-inside">
                                    {pkg.bullet_points.slice(0, 3).map((pt, i) => (
                                      <li key={i}>{pt}</li>
                                    ))}
                                    {pkg.bullet_points.length > 3 && (
                                      <li className="text-neutral-300">+{pkg.bullet_points.length - 3} more</li>
                                    )}
                                  </ul>
                                )}
                              </div>
                              {pkgSelected && (
                                <span className="text-[#7E4C3C] self-start mt-0.5 shrink-0 text-xs">✓</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden input error */}
        <input type="hidden" {...register("sessionTypeId")} />
        {errors.sessionTypeId && (
          <p className="mt-2 text-sm text-red-600">{errors.sessionTypeId.message}</p>
        )}
      </div>

      {/* ── Questionnaire ─────────────────────────────────────────────────── */}
      {selectedSessionType && (
        <div className="transition-all">
          {qLoading ? (
            <p className="text-center text-xs text-neutral-400">Loading session questions...</p>
          ) : activeTemplate ? (
            <div>
              <p className="text-[11px] tracking-[0.2em] text-[#7E4C3C] mb-3 uppercase">
                {activeTemplate.name}
              </p>
              {console.log(qAnswers)}
              <DynamicQuestionnaire
                key={qAnswers}
                questions={activeTemplate.questions}
                answers={qAnswers}
                onChange={setQAnswers}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Date + Time Slot Grid + Location ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Date picker */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>}
          </div>
        </div>

        {/* Time slot grid — shows after date is picked */}
        {watchedDate && selectedSessionType ? (
          <div className="rounded-xl border border-[#E7DFCF] bg-white/60 p-4 shadow-sm">
            {/* Hidden input for form validation */}
            <input type="hidden" {...register("startTime")} />
            <TimeSlotGrid
              selectedDate={watchedDate}
              durationMinutes={durationMinutes}
              startTime={watchedStartTime || ""}
              onSelectStart={handleTimeSelect}
            />
            {errors.startTime && (
              <p className="mt-2 text-sm text-red-600">{errors.startTime.message}</p>
            )}
          </div>
        ) : watchedDate && !selectedSessionType ? (
          <p className="text-[12px] text-neutral-400 italic">
            Select a session type above to see available time slots.
          </p>
        ) : null}
      </div>

      {/* ── Message ───────────────────────────────────────────────────────── */}
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

      {/* ── Contract ──────────────────────────────────────────────────────── */}
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
              <option key={key} value={key}>{contractTemplates[key].name}</option>
            ))}
          </select>
        </div>
        <ContractDetail
          contract={contract}
          contractTemplate={contractTemplates[contract?.template_id] || null}
          onSigned={(signedContract) => setContract(signedContract)}
        />
      </div>

      {/* ── Payment + Submit ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm space-y-3">
          <h2 className={labelCaps}>PAYMENT *</h2>
          <button
            type="button"
            onClick={handlePayment}
            disabled={!canPay}
            className="w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Authorize Payment
          </button>
        </div>
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm space-y-3">
          <button
            type="submit"
            disabled={isSubmitting || submitLock}
            className="w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit My Inquiry"}
          </button>
          <div className="mt-4 flex items-center gap-3 text-sm text-neutral-700">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 bg-white">✉️</span>
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