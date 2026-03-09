import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

const OPTION_TYPES = ["select", "radio", "checkbox"];

const TYPE_OPTIONS = [
  { value: "short_text", label: "Short text" },
  { value: "long_text",  label: "Long text / Paragraph" },
  { value: "select",     label: "Dropdown" },
  { value: "radio",      label: "Radio (pick one)" },
  { value: "checkbox",   label: "Checkboxes (pick many)" },
  { value: "date",       label: "Date" },
];

// Must match the `name` column in your SessionType table (case-insensitive match used)
// AND the `value` strings in InquiryForm's SESSION_TYPES array
const SESSION_TYPE_OPTIONS = [
  { value: "maternity", label: "Maternity" },
  { value: "newborn",   label: "Newborn" },
  { value: "family",    label: "Family" },
  { value: "weddings",  label: "Weddings" },
];

export default function QuestionnaireEditor({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const [name,        setName]        = useState("");
  const [sessionType, setSessionType] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(isEdit);
  const [error,       setError]       = useState("");
  const [questions,   setQuestions]   = useState([]);

  // ── Question helpers ──────────────────────────────────────────────────────────
  function newTempId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { tempId: newTempId(), label: "", type: "short_text", required: false, options: [] },
    ]);
  }

  function updateQuestion(tempId, patch) {
    setQuestions((prev) =>
      prev.map((q) => (q.tempId === tempId ? { ...q, ...patch } : q))
    );
  }

  function removeQuestion(tempId) {
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId));
  }

  function moveQuestion(tempId, direction) {
    setQuestions((prev) => {
      const idx     = prev.findIndex((q) => q.tempId === tempId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function addOption(tempId) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.tempId === tempId ? { ...q, options: [...(q.options ?? []), ""] } : q
      )
    );
  }

  function updateOption(tempId, index, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const opts = [...(q.options ?? [])];
        opts[index] = value;
        return { ...q, options: opts };
      })
    );
  }

  function removeOption(tempId, index) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const opts = [...(q.options ?? [])];
        opts.splice(index, 1);
        return { ...q, options: opts };
      })
    );
  }

  // ── Load existing template in edit mode ───────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;

    async function load() {
      setError("");
      setLoading(true);
      try {
        const { data, error: fetchErr } = await supabase
          .from("QuestionnaireTemplate")
          .select("id, name, session_type_id, schema_json, active")
          .eq("id", id)
          .single();

        if (fetchErr) throw fetchErr;

        setName(data.name ?? "");

        // Resolve session_type_id → string value for the dropdown
        if (data.session_type_id) {
          const { data: stRow } = await supabase
            .from("SessionType")
            .select("name")
            .eq("id", data.session_type_id)
            .single();
          setSessionType((stRow?.name ?? "").toLowerCase());
        }

        // schema_json holds the questions array
        const qs = (data.schema_json ?? []).map((q) => ({
          tempId:   q.id,                              // stable key stored in schema
          label:    q.label    ?? "",
          type:     q.type     ?? "short_text",
          required: q.required ?? false,
          options:  Array.isArray(q.options) ? q.options : [],
        }));
        setQuestions(qs);
      } catch (e) {
        setError(e.message || "Failed to load template.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isEdit, id]);

  // ── Validation ────────────────────────────────────────────────────────────────
  function validate() {
    if (!name.trim()) return "Template name is required.";
    if (!sessionType) return "Session type is required.";
    for (let i = 0; i < questions.length; i++) {
      const q   = questions[i];
      const num = i + 1;
      if (!q.label?.trim()) return `Question ${num}: label is required.`;
      if (OPTION_TYPES.includes(q.type)) {
        const clean = (q.options ?? []).map((o) => (o ?? "").trim()).filter(Boolean);
        if (clean.length === 0)
          return `Question ${num}: "${q.type}" requires at least 1 option.`;
      }
    }
    return "";
  }

  // ── Build schema_json ─────────────────────────────────────────────────────────
  // Each question's `tempId` becomes the stable `id` in schema_json.
  // InquiryForm keys answers_json by this id, so edits preserve historical answers.
  function buildSchemaJson() {
    return questions
      .filter((q) => q.label?.trim())
      .map((q, index) => ({
        id:       q.tempId,
        label:    q.label.trim(),
        type:     q.type,
        required: q.required,
        order:    index,
        options:  OPTION_TYPES.includes(q.type)
          ? (q.options ?? []).map((o) => (o ?? "").trim()).filter(Boolean)
          : null,
      }));
  }

  // ── Resolve SessionType UUID ──────────────────────────────────────────────────
  async function resolveSessionTypeId(value) {
    const { data, error } = await supabase
      .from("SessionType")
      .select("id")
      .ilike("name", `%${value}%`)
      .limit(1)
      .single();
    if (error || !data) throw new Error(`SessionType "${value}" not found. Check SessionType table.`);
    return data.id;
  }

  // ── Save as draft (active: false) ─────────────────────────────────────────────
  async function handleSaveDraft() {
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }

    try {
      setSaving(true);
      const sessionTypeId = await resolveSessionTypeId(sessionType);
      const schemaJson    = buildSchemaJson();
      const payload       = { name: name.trim(), session_type_id: sessionTypeId, schema_json: schemaJson, active: false };

      if (isEdit) {
        const { error: upErr } = await supabase
          .from("QuestionnaireTemplate").update(payload).eq("id", id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("QuestionnaireTemplate").insert(payload);
        if (insErr) throw insErr;
      }
      navigate("/admin/forms/questionnaires");
    } catch (e) {
      setError(e.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  // ── Publish (active: true, deactivates others for same session type) ──────────
  async function handlePublish() {
    setError("");
    const msg = validate();
    if (msg) { setError(msg); return; }

    try {
      setSaving(true);
      const sessionTypeId = await resolveSessionTypeId(sessionType);
      const schemaJson    = buildSchemaJson();
      const payload       = { name: name.trim(), session_type_id: sessionTypeId, schema_json: schemaJson, active: false };

      let templateId = id;

      if (isEdit) {
        const { error: upErr } = await supabase
          .from("QuestionnaireTemplate").update(payload).eq("id", id);
        if (upErr) throw upErr;
      } else {
        const { data: newRow, error: insErr } = await supabase
          .from("QuestionnaireTemplate").insert(payload).select("id").single();
        if (insErr) throw insErr;
        templateId = newRow.id;
      }

      // Deactivate all other templates for this session type
      const { error: deactErr } = await supabase
        .from("QuestionnaireTemplate")
        .update({ active: false })
        .eq("session_type_id", sessionTypeId)
        .neq("id", templateId);
      if (deactErr) throw deactErr;

      // Activate this one
      const { error: actErr } = await supabase
        .from("QuestionnaireTemplate")
        .update({ active: true })
        .eq("id", templateId);
      if (actErr) throw actErr;

      navigate("/admin/forms/questionnaires");
    } catch (e) {
      setError(e.message || "Failed to publish template.");
    } finally {
      setSaving(false);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Edit Questionnaire Template" : "Create Questionnaire Template"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving || loading}
            className="px-4 py-2 rounded border text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handlePublish}
            disabled={saving || loading}
            className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm">Loading...</p>}
      {error   && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="mt-6 space-y-6 max-w-2xl">

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. Maternity Session Questions"
            />
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium">Session Type</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a session type</option>
              {SESSION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Publishing will deactivate any other active template for this session type.
            </p>
          </div>

          {/* Questions Builder */}
          <div className="pt-6 border-t">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Questions
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({questions.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 py-2 rounded border text-sm"
              >
                + Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                No questions yet. Click "+ Add Question" to start building.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.tempId} className="border rounded-lg p-4 bg-white shadow-sm">

                    {/* Question header row */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-gray-700">
                        Question {idx + 1}
                        {q.required && (
                          <span className="ml-2 text-xs text-red-500 font-normal">required</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveQuestion(q.tempId, "up")}
                          disabled={idx === 0}
                          className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-30"
                          title="Move up"
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(q.tempId, "down")}
                          disabled={idx === questions.length - 1}
                          className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-30"
                          title="Move down"
                        >▼</button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.tempId)}
                          className="text-xs text-red-500 underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Label */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Question Label
                        </label>
                        <input
                          type="text"
                          value={q.label}
                          onChange={(e) => updateQuestion(q.tempId, { label: e.target.value })}
                          className="mt-1 w-full border rounded px-3 py-2 text-sm"
                          placeholder="e.g. How many weeks along will you be?"
                        />
                      </div>

                      {/* Type + Required */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                            Answer Type
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              // Reset options when type changes to avoid stale data
                              updateQuestion(q.tempId, { type: e.target.value, options: [] })
                            }
                            className="mt-1 w-full border rounded px-3 py-2 text-sm"
                          >
                            {TYPE_OPTIONS.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pb-1">
                          <input
                            id={`req-${q.tempId}`}
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestion(q.tempId, { required: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`req-${q.tempId}`} className="text-sm">
                            Required
                          </label>
                        </div>
                      </div>

                      {/* Options list (select / radio / checkbox only) */}
                      {OPTION_TYPES.includes(q.type) && (
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                              Options
                            </label>
                            <button
                              type="button"
                              onClick={() => addOption(q.tempId)}
                              className="text-xs underline text-blue-600"
                            >
                              + Add option
                            </button>
                          </div>
                          {(q.options?.length ?? 0) === 0 ? (
                            <p className="mt-1 text-xs text-gray-400 italic">
                              Add at least 1 option.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {q.options.map((opt, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateOption(q.tempId, i, e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    placeholder={`Option ${i + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeOption(q.tempId, i)}
                                    className="text-xs text-red-500 underline shrink-0"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Live preview */}
                      <div className="rounded bg-gray-50 border px-3 py-3">
                        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                          Client Preview
                        </p>
                        <QuestionPreview q={q} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live preview of what the client will see ──────────────────────────────────
function QuestionPreview({ q }) {
  const base  = "mt-1 w-full border rounded px-3 py-2 text-sm bg-white";
  const label = (
    <p className="text-sm font-medium text-gray-800">
      {q.label
        ? q.label
        : <span className="italic text-gray-400">Unlabelled question</span>
      }
      {q.required && <span className="text-red-500 ml-1">*</span>}
    </p>
  );

  switch (q.type) {
    case "short_text":
      return (
        <div>
          {label}
          <input disabled placeholder="Short answer…" className={base} />
        </div>
      );

    case "long_text":
      return (
        <div>
          {label}
          <textarea disabled rows={2} placeholder="Long answer…" className={base} />
        </div>
      );

    case "date":
      return (
        <div>
          {label}
          <input type="date" disabled className={base} />
        </div>
      );

    case "select": {
      const opts = (q.options ?? []).filter(Boolean);
      return (
        <div>
          {label}
          <select disabled className={base}>
            <option>Select an option…</option>
            {opts.map((o, i) => <option key={i}>{o}</option>)}
          </select>
        </div>
      );
    }

    case "radio": {
      const opts = (q.options ?? []).filter(Boolean);
      return (
        <div>
          {label}
          <div className="mt-1 space-y-1">
            {opts.length === 0
              ? <p className="text-xs text-gray-400 italic">No options added yet</p>
              : opts.map((o, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" disabled /> {o}
                  </label>
                ))
            }
          </div>
        </div>
      );
    }

    case "checkbox": {
      const opts = (q.options ?? []).filter(Boolean);
      return (
        <div>
          {label}
          <div className="mt-1 space-y-1">
            {opts.length === 0
              ? <p className="text-xs text-gray-400 italic">No options added yet</p>
              : opts.map((o, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" disabled /> {o}
                  </label>
                ))
            }
          </div>
        </div>
      );
    }

    default:
      return (
        <div>
          {label}
          <input disabled placeholder="Answer…" className={base} />
        </div>
      );
  }
}