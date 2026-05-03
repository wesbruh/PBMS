import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  LoaderCircle,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../lib/supabaseClient";
import { API_URL } from "../../../../lib/apiUrl.js";

import Sidebar from "../../../components/shared/Sidebar/Sidebar";
import Frame from "../../../components/shared/Frame/Frame";

const OPTION_TYPES = ["select", "radio", "checkbox"];

const TYPE_OPTIONS = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text / Paragraph" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio (pick one)" },
  { value: "checkbox", label: "Checkboxes (pick many)" },
  { value: "date", label: "Date" },
];

export default function QuestionnaireEditor({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  // call useAuth for Supabase session
  const { session } = useAuth();

  const [name, setName] = useState("");

  const [sessionTypeOptions, setSessionTypeOptions] = useState(null);
  const didFetchRef = useRef(false);
  const [sessionType, setSessionType] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveData, setSaveData] = useState({});

  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]);
  const [removedQuestionIds, setRemovedQuestionIds] = useState(null);

  const [initialState, setInitialState] = useState(null);

  // handlers for unsaved/saved changes state
  useEffect(() => {
    if (loading) return; // skip dirty check while loading initial data
    if (initialState !== null) return; // only captures once after initial load

    setInitialState({
      name,
      sessionType,
      questions: JSON.parse(JSON.stringify(questions)), // compare via JSON stringification
    });
  }, [loading, name, sessionType, questions, initialState]);

  useEffect(() => {
    if (!session || didFetchRef.current) return;
    didFetchRef.current = true;

    const loadSessionTypeOptions = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/types`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) throw new Error("Could not fetch session types");

        const data = await response.json();
        const sessionTypes = new Set();

        data.forEach((sessionType) => {
          sessionTypes.add({ label: `${sessionType.name}`, value: `${sessionType.name}` });
        });

        setSessionTypeOptions([...sessionTypes]);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    }

    loadSessionTypeOptions();

  }, [session]);

  // ── Load existing template in edit mode ───────────────────────────────────────
  useEffect(() => {
    if (!id || !isEdit || sessionTypeOptions) return;

    async function load() {
      setError("");
      try {
        const response = await fetch(`${API_URL}/api/questionnaire/templates/${id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          const errorData = await response.json();
          throw errorData.error;
        }

        const qTemplate = await response.json();
        setName(qTemplate.name);

        // Resolve session_type_id → string value for the dropdown
        const stResponse = await fetch(`${API_URL}/api/sessions/type`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ session_type_id: qTemplate.session_type_id })
        });

        if (!stResponse.ok) {
          const errorData = await stResponse.json();
          throw errorData.error;
        }

        const data = await stResponse.json();
        setSessionType(data.name);

        // schema_json holds the questions array
        const questions = (qTemplate.schema_json).map((question) => ({
          id: question.id, // stable key stored in schema
          label: question.label,
          type: question.type,
          required: question.required,
          options: Array.isArray(question.options) ? question.options : null,
        }));

        setQuestions(questions);
      } catch (e) {
        setError(e?.message ?? "Failed to load template.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, isEdit, sessionTypeOptions]);

  const isDirty =
    initialState !== null &&
    (name !== initialState.name ||
      sessionType !== initialState.sessionType ||
      JSON.stringify(questions) !== JSON.stringify(initialState.questions));

  // Warn user of unsaved changes if they try to navigate back to previous page
  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
      );

      if (!confirmed) return;
    }
    navigate("/admin/forms");
  };

  async function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        is_temp: true,
        id: crypto.randomUUID(),
        questionnaire_id: id,
        label: "",
        type: "short_text",
        required: false,
        options: null
      },
    ]);
  }

  async function updateQuestion(id, patch) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }

  async function removeQuestion(id) {
    setQuestions((prev) => {
      const next = [];
      let removed;

      for (const q of prev) {
        if (q.id === id) {
          removed = q;
        } else {
          next.push(q);
        }
      }

      if (removed && !removed?.is_temp) {
        if (!removedQuestionIds)
          setRemovedQuestionIds([id]);
        else
          setRemovedQuestionIds((prevIds) => [...prevIds, id]);
      }

      return next;
    });
  }

  function moveQuestion(id, direction) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function addOption(id) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, options: [...q.options, ""] } : q,
      ),
    );
  }

  function updateOption(id, index, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const opts = [...q.options];
        opts[index] = value;
        return { ...q, options: opts };
      }),
    );
  }

  function removeOption(id, index) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const opts = [...q.options];
        opts.splice(index, 1);
        return { ...q, options: opts };
      }),
    );
  }

  // ------ Validation ------
  function validate() {
    if (!name.trim()) return { error: new Error("Template name is required.") };
    if (!sessionType) return { error: new Error("Session type is required.") };
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const num = i + 1;
      if (!q.label?.trim()) return { error: new Error(`Question ${num}: label is required.`)};
      if (OPTION_TYPES.includes(q.type)) {
        const clean = q.options
          .map((o) => (o ?? "").trim())
          .filter(Boolean);
        if (clean.length === 0)
          return { error: new Error(`Question ${num}: "${q.type}" requires at least 1 option.`)};
      }
    }
    return { error: null };
  }

  // ------ Build question arrays ------
  // oldQuestionArray holds existing questions with stable IDs for update
  // newQuestionArray holds new questions for insertion.
  function buildQuestionArrays(templateId) {
    let oldQuestionArray = [];
    let newQuestionArray = [];

    questions
      .filter((q) => q.label?.trim())
      .forEach((q, index) => (q?.is_temp ?
        newQuestionArray.push({
          questionnaire_id: templateId,
          label: q.label.trim(),
          type: q.type,
          required: q.required,
          order_index: index,
          options: OPTION_TYPES.includes(q.type)
            ? q.options.map((o) => (o ?? "").trim()).filter(Boolean)
            : null
        }) :
        oldQuestionArray.push({
          id: q.id,
          questionnaire_id: templateId,
          label: q.label.trim(),
          type: q.type,
          required: q.required,
          order_index: index,
          options: OPTION_TYPES.includes(q.type)
            ? q.options.map((o) => (o ?? "").trim()).filter(Boolean)
            : null,
        })
      ));

    return [
            oldQuestionArray.length > 0 ? oldQuestionArray : null,
            newQuestionArray.length > 0 ? newQuestionArray : null,
          ];
  }

  // ------ Resolve SessionType UUID ------
  async function resolveSessionTypeId(value) {
    const response = await fetch(`${API_URL}/api/sessions/type`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ session_type_name: value })
    });

    if (!response.ok) throw new Error(`SessionType "${value}" not found`);

    const data = await response.json();
    return data.id;
  }

  async function handleBasicSave() {    
    setSaving(true);
    let templateId;
    const sessionTypeId = await resolveSessionTypeId(sessionType);
    setSaveData((prev) => ({ ...prev, sessionTypeId}));

    const payload = {
      name: name.trim(),
      session_type_id: sessionTypeId,
      active: false,
    };

    if (isEdit) {
      const response = await fetch(`${API_URL}/api/questionnaire/templates/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData.error;
      }

      const data = await response.json();
      templateId = data.id;
      setSaveData((prev) => ({ ...prev, templateId}));
    } else {
      const response = await fetch(`${API_URL}/api/questionnaire/templates`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData.error;
      }

      const data = await response.json();
      templateId = data.id;
      setSaveData((prev) => ({ ...prev, templateId}));
    }

    // delete removed questions that are still in db
    if (removedQuestionIds) {
      await supabase.from("Questions").delete().in("id", removedQuestionIds);
    }

    const [oldQuestionarray, newQuestionArray] = buildQuestionArrays(templateId);

    // insert new questions
    if (newQuestionArray) {
      const { error: newInsertError } = await supabase
        .from("Questions")
        .insert(newQuestionArray);

      if (newInsertError) {
        console.error("Error updating questions:", newInsertError);
        throw new Error("Failed to save questions to the database.");
      }
    }

    // update old questions
    if (oldQuestionarray) {
      const { error: oldUpdateError } = await supabase
        .from("Questions")
        .upsert(oldQuestionarray);

      if (oldUpdateError) {
        console.error("Error updating questions:", oldUpdateError);
        throw new Error("Failed to save questions to the database.");
      }
    }

    // build/fetch schema_json from updated questions in db
    const { data: schemaJson, error } = await supabase
      .from("Questions")
      .select()
      .eq("questionnaire_id", templateId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching updated questions:", error);
      throw new Error("Failed to fetch updated questions from the database.");
    }

    const response = await fetch(`${API_URL}/api/questionnaire/templates/${templateId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ schema_json: schemaJson })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw errorData.error;
    }
  }

  // ------ Save as draft (active: false) ------
  async function handleSaveDraft() {
    setError("");
    const { error: validateError } = validate();

    if (validateError) {
      setError(validateError.message);
      return;
    }

    try {
      // perform basic save operations
      await handleBasicSave();

      navigate("/admin/forms");
    } catch (e) {
      setError(e?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }

    setInitialState({
      name,
      sessionType,
      questions: JSON.parse(JSON.stringify(questions)),
    });
  }

  // ------ Publish (active: true, deactivates others for same session type) ------
  async function handlePublish() {
    setError("");
    const { error: validateError } = validate();

    if (validateError) {
      setError(validateError.message);
      return;
    }

    try {
      // perform basic save operations
      await handleBasicSave();
      
      // set only one questionnaire template active for this session type
      const setResponse = await fetch(`${API_URL}/api/questionnaire/templates/${saveData.templateId}/set`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ session_type_id: saveData.sessionTypeId })
      });

      if (!setResponse.ok) {
        const errorData = await setResponse.json();
        throw errorData.error;
      }

      navigate("/admin/forms");
    } catch (e) {
      setError(e?.message || "Failed to publish template.");
    } finally {
      setSaving(false);
    }

    setInitialState({
      name,
      sessionType,
      questions: JSON.parse(JSON.stringify(questions)),
    });
  }

  // main UI
  return (
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip"> 
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner bg-[#fcfcfc] rounded-lg overflow-y-auto">
        <Frame>
          <div className="w-full h-full flex flex-col p-6">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back to Templates
            </button>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 ">
                {isEdit
                  ? "Edit Questionnaire Template"
                  : "Create Questionnaire Template"}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || loading}
                  className="px-4 py-2 rounded border text-sm bg-black text-white disabled:opacity-50 hover:bg-gray-700 transition-all cursor-pointer"
                  title="Save Draft"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving || loading}
                  className="px-4 py-2 rounded bg-green-700 text-white text-sm disabled:opacity-50 hover:bg-green-800 transition-all cursor-pointer"
                  title="Publish"
                >
                  {saving ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center grow text-gray-500">
                <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
                <p className="text-sm">Loading Template Editor...</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3 max-w-7xl mx-auto w-full">
                {error && (
                  <div className="grow flex flex-col text-center items-center justify-center">
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                  </div>)
                }
                <div className="max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
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
                    <label htmlFor="session-type" className="block text-sm font-medium">Session Type</label>
                    <select
                      defaultValue={sessionType ?? ""}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="mt-1 w-full border rounded px-3 py-2 text-sm cursor-pointer"
                      title="session-type-select"
                    >
                      <option key="" value="" title="session-type-options" disabled>Select a session type</option>
                      {(sessionTypeOptions ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value} title="session-type-options">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="md:col-span-2 mt-4 text-sm font-bold text-gray-600 text-center">
                    Publishing this questionnaire will overwrite any other active
                    template for this specific session type.
                    <br />
                    Consider saving as a draft if you want to keep the existing active
                    template in place while you work on this new one.
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
                      onClick={() => addQuestion()}
                      className="flex items-center gap-2 px-3 py-2 rounded border text-sm hover:bg-gray-200 transition-all cursor-pointer"
                      title="Add Question"
                    >
                      <Plus size={16} />
                      Add Question
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-500">
                      No questions yet. Click "+ Add Question" to start building.
                    </p>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="border rounded-lg p-4 bg-white shadow-sm"
                        >
                          {/* Question header rows */}
                          <div className="mb-3 space-y-2">
                            {/* row 1: question number and required indicator */}
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Question {idx + 1}
                              {q.required && (
                                <span className="ml-2 text-xs text-red-500 font-normal">
                                  Required Question
                                </span>
                              )}
                            </p>
                            {/* row 2: question order controls and delete button */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm">Order</p>
                                <button
                                  type="button"
                                  onClick={() => moveQuestion(q.id, "up")}
                                  disabled={idx === 0}
                                  className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-20 hover:bg-gray-200 transition-all cursor-pointer"
                                  title="Move question up in the list"
                                >
                                  <ArrowUpToLine size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveQuestion(q.id, "down")}
                                  disabled={idx === questions.length - 1}
                                  className="text-xs px-1.5 py-0.5 border rounded disabled:opacity-20 hover:bg-gray-200 transition-all cursor-pointer"
                                  title="Move question down in the list"
                                >
                                  <ArrowDownToLine size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeQuestion(q.id)}
                                  className="text-xs text-red-500 underline cursor-pointer hover:text-red-900"
                                  title="Remove Question"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
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
                                onChange={(e) =>
                                  updateQuestion(q.id, { label: e.target.value })
                                }
                                className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]"
                                placeholder="e.g. How many weeks along will you be?"
                                title="Update Question Label"
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
                                    updateQuestion(q.id, {
                                      type: e.target.value,
                                      options: OPTION_TYPES.includes(e.target.value) ? [] : null
                                    })
                                  }
                                  className="mt-1 w-full border rounded px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]"
                                  title="Update Question Type"
                                >
                                  {TYPE_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex items-center gap-2 pb-1">
                                <input
                                  id={`req-${q.id}`}
                                  type="checkbox"
                                  checked={q.required}
                                  onChange={(e) =>
                                    updateQuestion(q.id, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 cursor-pointer"
                                  title="Update Question Required"
                                />
                                <label
                                  htmlFor={`req-${q.id}`}
                                  className="text-sm truncate"
                                >
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
                                    onClick={() => addOption(q.id)}
                                    className="text-xs underline text-blue-600 cursor-pointer"
                                    title="Add Option"
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
                                      <div
                                        key={i}
                                        className="flex gap-2 items-center"
                                      >
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) =>
                                            updateOption(q.id, i, e.target.value)
                                          }
                                          className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]"
                                          placeholder={`Option ${i + 1}`}
                                          title="Update Option"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeOption(q.id, i)}
                                          className="text-xs text-red-500 underline shrink-0 cursor-pointer"
                                          title="Remove Option"
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
                            <div className="border-t border-gray-500 pt-3">
                              <div className="rounded bg-gray-50 px-3 py-3 ring-2 ring-[#AB8C4B]/40 border-[#AB8C4B]">
                                <p className="text-xs text-gray-700 mb-2 uppercase tracking-wide">
                                  Client Preview
                                </p>
                                <QuestionPreview q={q} />
                              </div>
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
        </Frame>
      </div>
    </div>
  );
}

// ── Live preview of what the client will see ──────────────────────────────────
function QuestionPreview({ q }) {
  const base = "mt-1 w-full border rounded px-3 py-2 text-sm bg-white";
  const label = (
    <p className="text-sm font-medium text-gray-800">
      {q.label ? (
        q.label
      ) : (
        <span className="italic text-gray-400">Unlabelled question</span>
      )}
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
          <textarea
            disabled
            rows={2}
            placeholder="Long answer…"
            className={base}
          />
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
            {opts.map((o, i) => (
              <option key={i}>{o}</option>
            ))}
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
            {opts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No options added yet
              </p>
            ) : (
              opts.map((o, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input type="radio" disabled /> {o}
                </label>
              ))
            )}
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
            {opts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No options added yet
              </p>
            ) : (
              opts.map((o, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input type="checkbox" disabled /> {o}
                </label>
              ))
            )}
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