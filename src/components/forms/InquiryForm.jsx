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
import SessionTypeCard from "../SessionTypeCard/SessionTypeCard";

// constant for invoice generation logic
const DEPOSIT_PERCENTAGE = 0.05;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "session-images";

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

// check minDate for actual value -- 7 days ahead
const isPastMinDate = (value) => {
  if (!value) return false;
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  minDate.setHours(0, 0, 0, 0);

  const inputDate = new Date(value);
  inputDate.setHours(0, 0, 0, 0);
  return inputDate >= minDate;
};

const Schema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().trim(),
  sessionTypeId: z.string().min(1, "Select a session type"),
  date: z.string().refine(isPastMinDate, {
    message: "Photoshoot must be booked at least seven days in advance",
  }),
  startTime: z.string(),
  location: z.string().optional(),
  message: z.string().max(1000, "Max 1000 characters").optional(),
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function InquiryForm() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState(null);
  const [loadingParams, setLoadingParams] = useState(true);
  const [paying, setPaying] = useState(false);     //added for Ui state to indicate redirect to payment and waiting for redirect.

  const [contractTemplates, setContractTemplates] = useState({});
  const [contract, setContract] = useState(null);
  const [submitLock, setSubmitLock] = useState(true);
  const [loading, setLoading] = useState(true);

  // ── All session type rows from DB (masters + children) ────────────────────
  // Masters = category cards; children = specific session types under a category
  const [allSessionTypes, setAllSessionTypes] = useState([]);
  const [sessionTypesLoading, setSessionTypesLoading] = useState(true);

  // selectedCategory: the master row the user clicked
  const [selectedCategory, setSelectedCategory] = useState(null);
  // selectedSessionType: the specific child (or master if standalone) the user picked
  const [selectedSessionType, setSelectedSessionType] = useState(null);

  // Duration for TimeSlotGrid
  const [durationMinutes, setDurationMinutes] = useState(null);

  // Questionnaire
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [qAnswers, setQAnswers] = useState({});
  const [qALoading, setQALoading] = useState(false);
  const [qLoading, setQLoading] = useState(false);

  function allRequiredQuestionsAnswered() {
    if (!activeTemplate) return true;
    return activeTemplate.questions.every((q) => {
      if (!q.required) return true;
      const ans = qAnswers[q.id];
      if (q.type === "checkbox") {
        return Array.isArray(ans) && ans.length > 0;
      }
      return ans !== undefined && ans !== null && ans !== "";
    })
  }

  // ── Load params ────────────────────────────────────────────────────
  useEffect(() => {
    const loadingParams = async () => {
      const csId = searchParams.get("checkout_session_id") || null;

      if (csId) {
        const { data: paymentData, error } = await supabase
          .from("Payment")
          .select("Invoice(Session(id))")
          .eq("provider_payment_id", csId)
          .single();

        if (error) throw error;

        const sessionData = paymentData.Invoice.Session;

        setCheckoutSessionId(csId);
        setSessionId(sessionData.id);
      }

      setLoadingParams(false);
    }

    loadingParams();
  }, []);

  // ── Load all active session types ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setSessionTypesLoading(true);
      try {
        const { data, error } = await supabase
          .from("SessionType")
          .select("*")
          .eq("active", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setAllSessionTypes(data ?? []);
      } catch (err) {
        console.error("Failed to load session types:", err);
      } finally {
        setSessionTypesLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived: group all rows by category ───────────────────────────────────
  // masters: one per category (is_master=true), used as picture cards
  // childrenByCategory: all non-master rows grouped by category name
  const { masters, childrenByCategory } = useMemo(() => {
    const mastersList = allSessionTypes.filter((st) => st.is_master);
    const childMap = {};
    allSessionTypes
      .filter((st) => !st.is_master)
      .forEach((st) => {
        const cat = st.category || "";
        if (!childMap[cat]) childMap[cat] = [];
        childMap[cat].push(st);
      });
    return { masters: mastersList, childrenByCategory: childMap };
  }, [allSessionTypes]);

  // ── Load contract templates ───────────────────────────────────────────────
  useEffect(() => {
    async function loadContracts() {
      if (!session) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contract/templates`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();
        const map = {};
        data.forEach((t) => { map[`${t.session_type_id}`] = { id: t.id, body: t.body, name: t.name }; });
        setContractTemplates(map);
      } catch (err) {
        console.error("Failed to load contract templates:", err);
      }
    }

    loadContracts();
  }, [session]);

  // ── Load / create default contract ───────────────────────────────────────
  useEffect(() => {
    async function getDefaultContract() {
      if (!session || !profile || loadingParams) return;

      try {
        const body = (sessionId && checkoutSessionId)
          ? { user_id: profile.id, session_id: sessionId }
          : { user_id: profile.id };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contract`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const data = await response.json();

        setContract(data);
      } catch (err) {
        console.error("Failed to load contract:", err);
      } finally {
        setLoading(false);
      }
    }
    getDefaultContract();
  }, [session, profile, loadingParams]);

  const updateContractTemplate = async (templateId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contract/${contract?.id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ template_id: templateId })
      });
      if (response.ok) setContract({ ...contract, template_id: templateId });
    } catch (error) {
      console.error("Failed to update contract:", error);
    }
  };

  // minDate for calendar = only allow 8 days from today
  // esssentially block inputting within 7 days
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 8);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  }, []);

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
      sessionTypeId: "", date: "", startTime: "", location: "", message: "",
    },
  });

  const watchedDate = watch("date");
  const watchedStartTime = watch("startTime");

  // ── Handle updates to date ────────────────────
  useEffect(() => {
    if (!watchedDate) return;

    setValue("startTime", "", { shouldValidate: false });
  }, [watchedDate])

  // ── Category card clicked ─────────────────────────────────────────────────
  // Sets the category, pre-selects the master as the active session type
  // (will be overridden if user picks a child)
  function handleSelectCategory(masterRow) {
    if (!submitLock) return;

    // if clicking already-selected category -- do nothing
    if (selectedCategory?.id === masterRow.id) return;

    setSelectedCategory(masterRow);
    updateContractTemplate(contractTemplates[masterRow.id]?.id);

    // Pre-select master as the active session type
    setSelectedSessionType(masterRow);
    setValue("sessionTypeId", masterRow.id, { shouldValidate: true });
    trigger(["sessionTypeId"]);

    const dur = masterRow.default_duration_minutes ?? 60;
    setDurationMinutes(dur);
    setValue("startTime", "", { shouldValidate: false });
  }

  // ── Session type (child) clicked inside expanded panel ────────────────────
  function handleSelectSessionType(st) {
    if (!submitLock) return;

    // clicking already-selected child, do nothing -- prevent changes
    if (selectedSessionType?.id === st.id) {
      return;
    }

    setSelectedSessionType(st);
    updateContractTemplate(contractTemplates[st.id]?.id);

    setValue("sessionTypeId", st.id, { shouldValidate: true });
    trigger(["sessionTypeId"]);
    const dur = st.default_duration_minutes ?? 60;
    setDurationMinutes(dur);
    setValue("startTime", "", { shouldValidate: false });
  } 

  // ── TimeSlotGrid callback ─────────────────────────────────────────────────
  function handleTimeSelect(start) {
    setValue("startTime", start, { shouldValidate: true });
  }

  // ── Fetch questionnaire when selected session type changes ────────────────
  useEffect(() => {
    if (!selectedSessionType) { setActiveTemplate(null); return; }

    async function fetchTemplate() {
      setQLoading(true);
      try {
        const { data: template } = await supabase
          .from("QuestionnaireTemplate")
          .select("id, name, schema_json")
          .eq("session_type_id", selectedSessionType.id)
          .eq("active", true)
          .maybeSingle();

        if (!template) { setActiveTemplate(null); return; }

        const questions = (template.schema_json ?? [])
          .map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            required: q.required ?? false,
            options: q.options ?? null,
            order_idx: q.order_idx ?? null
          }));

        setActiveTemplate({ id: template.id, name: template.name, questions });
        if (qALoading) setQALoading(false);
      } catch (err) {
        console.error("Error fetching QuestionnaireTemplate:", err);
        setActiveTemplate(null);
      } finally {
        setQLoading(false);
      }
    }
    fetchTemplate();
  }, [selectedSessionType]);

  // ── Prefill form (auth + Stripe return) ──────────────────────────────────
  useEffect(() => {
    async function prefillForm() {
      if (!session || !profile || loadingParams || sessionTypesLoading) return;

      if (sessionId && checkoutSessionId) {
        try {
          const { data: paymentData, error } = await supabase
            .from("Payment")
            .select("provider_payment_id, Invoice(Session(id, session_type_id, start_at, location_text, notes, client_id, is_active))")
            .eq("provider_payment_id", checkoutSessionId)
            .single();

          if (error) throw new Error("Payment entry not found");

          const sessionData = paymentData?.Invoice?.Session;

          if (!sessionData || sessionData?.is_active === true) throw new Error("No inactive session found");
          else if (sessionData.client_id !== profile.id) throw new Error("Session does not belong to this user");

          // work with checkout session and payment intent to check for payment authorization
          const csResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/checkout/${checkoutSessionId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${session?.access_token}`,
              "Content-Type": "application/json"
            }
          });
          const csData = await csResponse.json();
          const { status: csStatus, payment_intent: piData } = csData;
          const { status: piStatus } = piData;

          // if session has been authorized
          if (csStatus === "complete" && piStatus === "requires_capture") {
            // update payment table
            const { error: paymentError } = await supabase
              .from("Payment")
              .update({ status: "Authorized" })
              .eq("provider_payment_id", checkoutSessionId)
              .single();

            if (paymentError) throw paymentError;
          }

          // Match the session type from loaded list
          const matchedST = allSessionTypes.find(
            (st) => st.id === sessionData.session_type_id,
          );
          if (matchedST) {
            const masterForST = allSessionTypes.find(
              (m) => m.is_master && m.category === matchedST.category
            );
            if (masterForST) {
              setSelectedCategory(masterForST);
            }
            setSelectedSessionType(matchedST);
            setDurationMinutes(matchedST.default_duration_minutes ?? 60);
          }

          const dt = new Date(sessionData.start_at);
          const datePart = `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}-${dt.getDate().toString().padStart(2, "0")}`;
          const timePart = `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;

          // Load questionnaire answers
          try {
            const { data: qInstance } = await supabase
              .from("QuestionnaireResponse").select("id").eq("session_id", sessionId).single();
            const { data: answers } = await supabase
              .from("QuestionnaireAnswer").select().eq("questionnaire_id", qInstance.id);
            const answersMap = {};
            (answers ?? []).forEach((r) => { answersMap[r.question_id] = r.answer; });
            setQAnswers(answersMap);
            setQALoading(true);
          } catch (_) { /* no questionnaire yet */ }

          setValue("firstName", profile?.first_name?.trim() ?? "");
          setValue("lastName", profile?.last_name?.trim() ?? "");
          setValue("email", profile.email ?? "");
          setValue("phone", profile.phone ?? "");
          setValue("date", datePart, { shouldValidate: true });
          setValue("startTime", timePart, { shouldValidate: true });
          setValue("sessionTypeId", sessionData.session_type_id, { shouldValidate: true });
          if (sessionData.location_text) setValue("location", sessionData.location_text);
          if (sessionData.notes) setValue("message", sessionData.notes);

          await trigger(["firstName", "lastName", "email", "phone", "date", "startTime", "sessionTypeId"]);
          setSubmitLock(false);
        } catch (err) {
          console.error("Error pre-filling from session:", err);
        }
      } else {
        if (profile?.first_name) setValue("firstName", profile.first_name.trim());
        if (profile?.last_name) setValue("lastName", profile.last_name.trim());
        if (profile?.email) setValue("email", profile.email);
        if (profile?.phone) setValue("phone", profile.phone);
        await trigger(["firstName", "lastName", "email", "phone"]);
      }
    }
    prefillForm();
  }, [session, profile, loadingParams, sessionTypesLoading]);

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    setPaying(true);
    document.body.style.cursor = "wait"; //indicates something is happening, redirect to stripe
    try {
      const now = new Date().toISOString();

      // Delete all inactive (draft) sessions for this user to prevent duplicates
      await supabase
        .from("Session")
        .delete()
        .eq("client_id", profile.id)
        .eq("is_active", false);

      const startAt = new Date(`${getValues("date")}T${getValues("startTime")}`).toISOString();
      const endAt = new Date(
        new Date(`${getValues("date")}T${getValues("startTime")}`).getTime()
        + (durationMinutes ?? 60) * 60 * 1000
      ).toISOString();

      const { data: sessionData, error: sessionError } = await supabase
        .from("Session")
        .insert({
          client_id: profile.id,
          session_type_id: getValues("sessionTypeId"),
          start_at: startAt,
          end_at: endAt,
          location_text: getValues("location") || "",
          notes: getValues("message") || "",
          status: "Pending",
          created_at: now,
          updated_at: now,
        })
        .select().single();

      if (sessionError) throw sessionError;

      await supabase.from("Contract")
        .update({ session_id: sessionData.id }).eq("id", contract.id);

      if (activeTemplate) {
        const { data: qInstance, error: qInstError } = await supabase
          .from("QuestionnaireResponse")
          .insert({
            session_id: sessionData.id,
            template_id: activeTemplate.id,
            status: "In Progress",
            created_at: now
          })
          .select("id")
          .single();

        if (qInstError) {
          await supabase.from("Session").delete().eq("id", sessionData.id);
          throw qInstError;
        }

        // One row per answer (relational, not blob)
        const responseRows = await Promise.all(activeTemplate.questions.map((q) => {
          const raw = qAnswers[q.id];
          const isCheckbox = (q.type ?? "").toLowerCase() === "checkbox";
          const { id, ...question } = q;
          return {
            questionnaire_id: qInstance.id,
            question_id: id,
            answer: isCheckbox ? (Array.isArray(raw) ? raw : []) : (raw ?? null),
            question: question
          };
        }));

        const { error: respError } = await supabase
          .from("QuestionnaireAnswer").insert(responseRows);

        if (respError) {
          await supabase.from("Session").delete().eq("id", sessionData.id);
          throw respError;
        }
      }

      // create Invoice related to session
      const invoiceResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/invoice/generate/${sessionData.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          remaining: selectedSessionType.base_price, // send remaining balance with tax for invoice generation
        })
      });

      if (!invoiceResponse.ok) {
        supabase.from("Session").delete().eq("id", sessionData.id);
        throw new Error("Failed to generate invoice");
      }

      const invoiceData = await invoiceResponse.json();
      const amountDue = selectedSessionType.base_price * DEPOSIT_PERCENTAGE; // calculate amountDue based on base price and DEPOSIT_PERCENTAGE

      // create Stripe checkout session
      const stripeResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/checkout/deposit`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from_url: window.location.href,
          product_data: {
            name: `${selectedSessionType.name} Deposit`,
            description: selectedSessionType.description,
          },
          price: amountDue,
          apply_tax: true,
          tax_rate: 7.25,
        })
      });

      if (!stripeResponse.ok) {
        supabase.from("Session").delete().eq("id", sessionData.id);
        throw new Error("Stripe connection failed. Please try again.");
      }

      const checkoutSession = await stripeResponse.json();

      // create new Payment table entry linked to deposit
      const { error: paymentError } = await supabase
        .from("Payment")
        .insert({
          invoice_id: invoiceData.id,
          provider: "Stripe",
          provider_payment_id: checkoutSession.id,
          amount: amountDue + (amountDue * 0.0725), // add tax to amount
          currency: "USD",
          status: "Pending",
          type: "Deposit",
          created_at: new Date().toISOString(),
        });

      if (paymentError) {
        supabase.from("Session").delete().eq("id", sessionData.id);
        throw paymentError;
      }

      window.location.href = checkoutSession.url;
    } catch (error) {
      setPaying(false);
      document.body.style.cursor = ""; // reset wait cursor back to normal
      console.error("Payment error:", error);
      alert(`Payment failed: ${error?.message ?? error}`);
    }
  };

  // ── Submit (post-Stripe) ──────────────────────────────────────────────────
  const onSubmit = async () => {
    try {
      // mark contract active
      const { error: contractError } = await supabase.from("Contract")
        .update({ is_active: true })
        .eq("session_id", sessionId);

      // mark session active
      const { error: sessionError } = await supabase
        .from("Session")
        .update({ is_active: true })
        .eq("id", sessionId);

      // mark questionnaire submitted
      const { error: questionnaireError } = await supabase
        .from("QuestionnaireResponse")
        .update({ status: "Submitted", submitted_at: new Date().toISOString() })
        .eq("session_id", sessionId);

      if (contractError || sessionError || questionnaireError)
        throw (contractError ?? sessionError ?? questionnaireError ?? new Error("Unknown error during submission"));

      navigate(`/dashboard/inquiry/success?session_id=${sessionId}`, {
        replace: true, state: { sessionId },
      });
    } catch (e) {
      console.error("Submit error:", e);
      alert(`Sorry, something went wrong: ${e?.message ?? e}`);
    }
  };

  const canPay =
    submitLock && !checkoutSessionId && !!selectedSessionType &&
    !!watchedDate && !!watchedStartTime && contract?.status === "Signed" && allRequiredQuestionsAnswered();

  const inputBase = "w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";
  const labelCaps = "font-sans text-[12px] tracking-wider text-[#7E4C3C] uppercase";

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
        Loading details...
      </div>
    );
  }

  // Children of the selected category (excluding the master itself)
  const categoryChildren = selectedCategory
    ? (childrenByCategory[selectedCategory.category] ?? [])
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

      {/* ── Name ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>First Name *</p>
          <input {...register("firstName")} readOnly
            className={`${inputBase} bg-neutral-100 text-neutral-600 cursor-not-allowed`} />
        </div>
        <div>
          <p className={labelCaps}>Last Name *</p>
          <input {...register("lastName")} readOnly
            className={`${inputBase} bg-neutral-100 text-neutral-600 cursor-not-allowed`} />
        </div>
      </div>

      {/* ── Email + Phone ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className={labelCaps}>Email *</p>
          <input type="email" {...register("email")} readOnly
            className={`${inputBase} bg-neutral-100 text-neutral-600 cursor-not-allowed`} />
          <p className="mt-1 text-[11px] text-neutral-600">
            We'll use this email to confirm availability and send session details.
          </p>
        </div>
        <div>
          <p className={labelCaps}>Phone Number</p>
          <input {...register("phone")} placeholder="No phone number provided." readOnly
            className={`${inputBase} bg-neutral-100 text-neutral-600 cursor-not-allowed`} />
        </div>
      </div>

      {/* ── Session type selection ─────────────────────────────────────────── */}
      <div>
        <p className={labelCaps}>Select Your Session Type *</p>
        <p className="mt-1 text-[14px] text-neutral-600">
          When selecting your session, you will be asked to fill out a questionnaire.
          This helps me prepare for your needs and desires for your photoshoot!
        </p>

        {sessionTypesLoading ? (
          <p className="mt-3 text-xs text-neutral-400">Loading sessions…</p>
        ) : (
          <>
            {/* ── Step 1: Category picture cards ─────────────────────────── */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {masters.map((master) => {
                const isSelected = selectedCategory?.id === master.id;
                const imageUrl = getImageUrl(master.image_path);

                return (
                  <label
                    key={master.id}
                    className={`group cursor-pointer rounded-xl border overflow-hidden bg-white shadow-sm transition-all
                      ${isSelected
                        ? "border-[#7E4C3C] ring-2 ring-[#7E4C3C]/20 shadow-md"
                        : "border-black/10 hover:border-black/20 hover:shadow-md"
                      }
                      ${!submitLock ? "pointer-events-none opacity-60" : ""}
                    `}
                  >
                    <input
                      type="radio"
                      name="categoryRadio"
                      value={master.id}
                      checked={isSelected}
                      onChange={() => handleSelectCategory(master)}
                      disabled={!submitLock}
                      className="sr-only"
                    />

                    {/* Picture */}
                    <div className="h-28 w-full bg-neutral-100 overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={master.category}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-neutral-50">
                          <span className="text-neutral-300 text-xs">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Label — category name */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {/* Custom Radio Visual */}
                      <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition
                        ${isSelected ? "border-[#7E4C3C]" : "border-black/30"}`}>
                        {isSelected && <span className="h-2 w-2 rounded-full bg-[#7E4C3C]" />}
                      </span>
                      <span className="font-serif text-sm text-neutral-800">{master.category}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* ── Step 2: Expanded detail with grid cards ────────────────── */}
            {selectedCategory && (
              <div className="mt-6 rounded-xl border border-[#7E4C3C]/20 bg-[#FAF7F2] p-6 space-y-6">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                  Available packages in {selectedCategory.category}
                </p>

                {/* Grid of session type cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Master card (always shown first) */}
                  <SessionTypeCard
                    st={selectedCategory}
                    isSelected={selectedSessionType?.id === selectedCategory.id}
                    onSelect={() => handleSelectSessionType(selectedCategory)}
                    disabled={!submitLock}
                    isOnlyOption={categoryChildren.length === 0}
                    variant="grid"
                  />

                  {/* Child session types */}
                  {categoryChildren.map((child) => (
                    <SessionTypeCard
                      key={child.id}
                      st={child}
                      isSelected={selectedSessionType?.id === child.id}
                      onSelect={() => handleSelectSessionType(child)}
                      disabled={!submitLock}
                      variant="grid"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
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
              <DynamicQuestionnaire
                key={selectedSessionType.id}
                questions={activeTemplate.questions}
                answers={qAnswers}
                onChange={setQAnswers}
                readOnly={!submitLock}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Date + TimeSlotGrid + Location ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className={labelCaps}>Date *</p>
            <input type="date" min={minDate} {...register("date")} readOnly={!submitLock}
              className={`${inputBase} ${errors.date ? "border-red-500" : "border-black/10"}`}
              aria-invalid={!!errors.date} />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
          </div>
          <div>
            <p className={labelCaps}>
              Location <span className="text-neutral-500 tracking-normal">(optional)</span>
            </p>
            <input {...register("location")} placeholder="Sacramento, CA" readOnly={!submitLock}
              className={`${inputBase} ${errors.location ? "border-red-500" : "border-black/10"}`} />
          </div>
        </div>

        {watchedDate && selectedSessionType ? (
          <div className="rounded-xl border border-[#E7DFCF] bg-white/60 p-4 shadow-sm">
            <input type="hidden" {...register("startTime")} />
            <TimeSlotGrid
              key={`${selectedSessionType ?? ""}${watchedDate ?? ""}`}
              selectedDate={watchedDate}
              durationMinutes={durationMinutes ?? 60}
              startTime={watchedStartTime || ""}
              onSelectStart={handleTimeSelect}
              readOnly={!submitLock}
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
        <p className="font-sans mt-2 text-[14px] text-brown leading-relaxed">
          Any additional notes?
        </p>
        <textarea rows={5} {...register("message")} readOnly={!submitLock}
          placeholder="Please share any details about the memories you'd like to create. Feel free to mention style preferences, important moments, or unique ideas for your session."
          className={`${inputBase} ${errors.message ? "border-red-500" : "border-black/10"}`}
          aria-invalid={!!errors.message} />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
      </div>

      {/* ── Contract ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1">
        <p className={`${labelCaps} w-full`}>Contract *</p>
        {contract && contractTemplates[selectedSessionType?.id] ? (
          <ContractDetail
            contract={contract}
            contractTemplate={contractTemplates[selectedSessionType?.id] || null}
            onSigned={(signedContract) => setContract(signedContract)}
          />
        ) : (
          <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm space-y-3">
          </div>
        )
        }
      </div>

      {/* ── Payment + Submit ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm space-y-3">
          <h2 className={labelCaps}>Payment *</h2>
          <button type="button" onClick={handlePayment} disabled={!canPay || paying}
            className="w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif disabled:opacity-40 disabled:cursor-not-allowed">
            {paying ? "Processing..." : "Authorize Payment"}
          </button>
        </div>
        <div className="rounded-xl border border-black/10 bg-white/60 p-5 shadow-sm space-y-3">
          <button type="submit" disabled={isSubmitting || submitLock}
            className={`w-full h-12 rounded-md bg-brown hover:bg-[#AB8C4B] text-white border border-black transition font-serif disabled:opacity-40 ${isSubmitting ? "cursor-wait" : "disabled:cursor-not-allowed"}`}>
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