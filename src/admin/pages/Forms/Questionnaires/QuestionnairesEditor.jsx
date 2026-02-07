import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function QuestionnaireEditor({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  // ---------- Questions state ----------
  const [questions, setQuestions] = useState([]);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
        label: "",
        type: "short_text",
        required: false,
        options: [], 
      },
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

  function addOption(tempId) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const next = Array.isArray(q.options) ? q.options : [];
        return { ...q, options: [...next, ""] };
      })
    );
  }

  function updateOption(tempId, index, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const next = Array.isArray(q.options) ? [...q.options] : [];
        next[index] = value;
        return { ...q, options: next };
      })
    );
  }

  function removeOption(tempId, index) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.tempId !== tempId) return q;
        const next = Array.isArray(q.options) ? [...q.options] : [];
        next.splice(index, 1);
        return { ...q, options: next };
      })
    );
  }

  // ---------- Load questionnaire + questions in edit mode ----------
  useEffect(() => {
    if (!isEdit) return;

    async function load() {
      setError("");
      setLoading(true);

      try {
        // load questionnaire metadata
        const { data: qData, error: qError } = await supabase
          .from("questionnaires")
          .select("id, title, session_type, is_active")
          .eq("id", id)
          .single();

        if (qError) throw qError;

        setTitle(qData.title ?? "");
        setSessionType(qData.session_type ?? "");

        // load questions
        const { data: questionRows, error: questionsError } = await supabase
          .from("questions")
          .select("id, label, type, required, order_index, options")
          .eq("questionnaire_id", id)
          .order("order_index", { ascending: true });

        if (questionsError) throw questionsError;

        const mapped = (questionRows ?? []).map((row) => ({
          tempId: row.id, // DB id
          label: row.label ?? "",
          type: row.type ?? "short_text",
          required: row.required ?? false,
          options: Array.isArray(row.options) ? row.options : (row.options ?? []),
        }));

        setQuestions(mapped);
      } catch (e) {
        setError(e.message || "Failed to load questionnaire.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isEdit, id]);

  // ---------- Helper: upsert questionnaire and return its id ----------
  async function upsertQuestionnaireAsDraft() {
    if (isEdit) {
      const { data, error } = await supabase
        .from("questionnaires")
        .update({
          title: title.trim(),
          session_type: sessionType,
          is_active: false,
        })
        .eq("id", id)
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const { data, error } = await supabase
        .from("questionnaires")
        .insert([
          {
            title: title.trim(),
            session_type: sessionType,
            is_active: false,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    }
  }

  // ---------- Helper: save questions for a given questionnaire ----------
  async function saveQuestions(questionnaireId) {
    // delete existing questions for this questionnaire
    const { error: deleteError } = await supabase
      .from("questions")
      .delete()
      .eq("questionnaire_id", questionnaireId);

    if (deleteError) throw deleteError;

    // filter out completely empty questions (no label)
    const cleaned = questions
      .map((q, index) => ({
        questionnaire_id: questionnaireId,
        label: q.label.trim(),
        type: q.type,
        required: q.required,
        order_index: index,
        // NEW: trim options + remove blanks
        options: ["select", "radio", "checkbox"].includes(q.type)
          ? (q.options ?? []).map((o) => (o ?? "").trim()).filter(Boolean)
          : null,
      }))
      .filter((q) => q.label.length > 0);

    if (cleaned.length === 0) return;

    const { error: insertError } = await supabase.from("questions").insert(cleaned);
    if (insertError) throw insertError;
  }

  // ---------- Save Draft ----------
  async function handleSaveDraft() {
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (!sessionType) return setError("Session type is required.");

    try {
      setSaving(true);

      const questionnaireId = await upsertQuestionnaireAsDraft();
      await saveQuestions(questionnaireId);

      navigate("/admin/forms/questionnaires");
    } catch (e) {
      setError(e.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }
function validateForPublish() {
  if (!title.trim()) return "Title is required.";
  if (!sessionType) return "Session type is required.";

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const num = i + 1;

    if (!q.label?.trim()) {
      return `Question ${num}: label is required.`;
    }

    if (["select", "radio", "checkbox"].includes(q.type)) {
      const opts = (q.options ?? [])
        .map((o) => (o ?? "").trim())
        .filter(Boolean);

      if (opts.length === 0) {
        return `Question ${num}: this question type requires at least 1 option.`;
      }
    }
  }

  return "";
}
  // ---------- Publish ----------
 async function handlePublish() {
  setError("");

  const msg = validateForPublish();
  if (msg) return setError(msg);

  try {
    setSaving(true);

    const questionnaireId = await upsertQuestionnaireAsDraft();
    await saveQuestions(questionnaireId);

    const { error: deactivateError } = await supabase
      .from("questionnaires")
      .update({ is_active: false })
      .eq("session_type", sessionType)
      .neq("id", questionnaireId);

    if (deactivateError) throw deactivateError;

    const { error: activateError } = await supabase
      .from("questionnaires")
      .update({ is_active: true })
      .eq("id", questionnaireId);

    if (activateError) throw activateError;

    navigate("/admin/forms/questionnaires");
  } catch (e) {
    setError(e.message || "Failed to publish questionnaire.");
  } finally {
    setSaving(false);
  }
}

  // ---------- UI ----------
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isEdit ? "Edit Questionnaire" : "Create Questionnaire"}
        </h1>

        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={saving || loading}
            className="px-4 py-2 rounded border disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={handlePublish}
            disabled={saving || loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm">Loading...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!loading && (
        <div className="mt-6 space-y-6 max-w-2xl">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Wedding Questionnaire"
            />
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium">Session Type</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="">Select a session type</option>
              <option value="wedding">Wedding</option>
              <option value="maternity">Maternity</option>
              <option value="branding">Branding</option>
            </select>
          </div>

          {/* Questions Builder */}
          <div className="pt-6 border-t">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Questions</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 py-2 rounded border"
              >
                + Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">
                No questions yet. Click “Add Question” to start building.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.tempId} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Question {idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.tempId)}
                        className="text-sm underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {/* Label */}
                      <div>
                        <label className="block text-sm font-medium">Label</label>
                        <input
                          type="text"
                          value={q.label}
                          onChange={(e) =>
                            updateQuestion(q.tempId, { label: e.target.value })
                          }
                          className="mt-1 w-full border rounded px-3 py-2"
                          placeholder="e.g., Where would you like to shoot?"
                        />
                      </div>

                      {/* Type + Required */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium">Type</label>
                          <select
                            value={q.type}
                            onChange={(e) =>
                              updateQuestion(q.tempId, { type: e.target.value })
                            }
                            className="mt-1 w-full border rounded px-3 py-2"
                          >
                            <option value="short_text">Short text</option>
                            <option value="long_text">Long text</option>
                            <option value="select">Dropdown</option>
                            <option value="radio">Radio</option>
                            <option value="checkbox">Checkboxes</option>
                            <option value="date">Date</option>
                          </select>
                        </div>

                        <div className="flex items-end gap-2">
                          <input
                            id={`required-${q.tempId}`}
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) =>
                              updateQuestion(q.tempId, {
                                required: e.target.checked,
                              })
                            }
                            className="h-4 w-4"
                          />
                          <label
                            htmlFor={`required-${q.tempId}`}
                            className="text-sm font-medium"
                          >
                            Required
                          </label>
                        </div>
                      </div>

                      {/* Options UI (NEW) */}
                      {["select", "radio", "checkbox"].includes(q.type) && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium">
                              Options
                            </label>
                            <button
                              type="button"
                              onClick={() => addOption(q.tempId)}
                              className="text-sm underline"
                            >
                              + Add option
                            </button>
                          </div>

                          {(q.options?.length ?? 0) === 0 ? (
                            <p className="mt-2 text-sm text-gray-600">
                              Add at least 1 option.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {q.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex gap-2 items-center"
                                >
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      updateOption(q.tempId, i, e.target.value)
                                    }
                                    className="w-full border rounded px-3 py-2"
                                    placeholder={`Option ${i + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeOption(q.tempId, i)}
                                    className="text-sm underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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