// DynamicQuestionnaire.jsx
// Renders questions from a QuestionnaireTemplate's schema_json.
// Each question shape: { tempId, label, type, required, options }
//
// Supported types: short_text, long_text, text, textarea, date,
//                  select, radio, checkbox
// Any unknown type falls back to a short text input so nothing is invisible.

const inputBase =
  "w-full rounded-md border bg-white/70 px-4 py-3 text-sm outline-none " +
  "focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";

const labelCaps = "text-[11px] tracking-[0.2em] text-[#7E4C3C]";

export default function DynamicQuestionnaire({ questions = [], answers = {}, onChange }) {
  function handleChange(tempId, value) {
    onChange({ ...answers, [tempId]: value });
  }

  function handleCheckbox(tempId, option, checked) {
    const current = Array.isArray(answers[tempId]) ? answers[tempId] : [];
    const updated  = checked
      ? [...current, option]
      : current.filter((v) => v !== option);
    onChange({ ...answers, [tempId]: updated });
  }

  if (!questions.length) return null;

  return (
    <div className="rounded-xl border border-[#E7DFCF] bg-white/60 p-6 shadow-sm space-y-6">
      {/* Section header */}
      <div className="border-b border-[#E7DFCF] pb-4">
        <h3 className="font-serif text-xl text-[#7E4C3C]">Session Details</h3>
        <p className="mt-1 text-[12px] text-neutral-500">
          Please answer a few questions to help me prepare.
        </p>
      </div>

      {questions.map((q) => (
        <QuestionField
          key={q.tempId}
          q={q}
          value={answers[q.tempId]}
          onChangeValue={(val) => handleChange(q.tempId, val)}
          onChangeCheckbox={(opt, checked) => handleCheckbox(q.tempId, opt, checked)}
          inputBase={inputBase}
          labelCaps={labelCaps}
        />
      ))}
    </div>
  );
}

// ── Individual question renderer ──────────────────────────────────────────────
function QuestionField({ q, value, onChangeValue, onChangeCheckbox, inputBase, labelCaps }) {
  const label = (
    <p className={labelCaps}>
      {(q.label ?? "").toUpperCase()}
      {q.required && " *"}
    </p>
  );

  // Normalise type to lowercase and trim so stray values like "Answer" still work
  const type = (q.type ?? "short_text").toLowerCase().trim();

  // ── Long text / textarea ──────────────────────────────────────────────────
  if (type === "long_text" || type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={4}
          value={value ?? ""}
          onChange={(e) => onChangeValue(e.target.value)}
          className={`${inputBase} mt-1`}
          placeholder={q.label ?? "Your answer…"}
        />
      </div>
    );
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  if (type === "date") {
    return (
      <div>
        {label}
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChangeValue(e.target.value)}
          className={`${inputBase} mt-1`}
        />
      </div>
    );
  }

  // ── Dropdown / select ─────────────────────────────────────────────────────
  if (type === "select") {
    const opts = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
    return (
      <div>
        {label}
        <select
          value={value ?? ""}
          onChange={(e) => onChangeValue(e.target.value)}
          className={`${inputBase} mt-1`}
        >
          <option value="">Select an option…</option>
          {opts.map((o, i) => (
            <option key={i} value={o}>{o}</option>
          ))}
        </select>
      </div>
    );
  }

  // ── Radio ─────────────────────────────────────────────────────────────────
  if (type === "radio") {
    const opts = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
    return (
      <div>
        {label}
        <div className="mt-2 space-y-2">
          {opts.length === 0 ? (
            // Fallback if options missing — render a text input instead
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChangeValue(e.target.value)}
              className={`${inputBase}`}
              placeholder="Your answer…"
            />
          ) : (
            opts.map((o, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={q.tempId}
                  value={o}
                  checked={value === o}
                  onChange={() => onChangeValue(o)}
                  className="h-4 w-4 accent-[#7E4C3C]"
                />
                <span className="text-sm text-neutral-700">{o}</span>
              </label>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Checkbox ──────────────────────────────────────────────────────────────
  if (type === "checkbox") {
    const opts    = Array.isArray(q.options) ? q.options.filter(Boolean) : [];
    const checked = Array.isArray(value) ? value : [];
    return (
      <div>
        {label}
        <div className="mt-2 space-y-2">
          {opts.length === 0 ? (
            <input
              type="text"
              value={checked[0] ?? ""}
              onChange={(e) => onChangeValue([e.target.value])}
              className={`${inputBase}`}
              placeholder="Your answer…"
            />
          ) : (
            opts.map((o, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={o}
                  checked={checked.includes(o)}
                  onChange={(e) => onChangeCheckbox(o, e.target.checked)}
                  className="h-4 w-4 accent-[#7E4C3C]"
                />
                <span className="text-sm text-neutral-700">{o}</span>
              </label>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Default fallback — catches "short_text", "text", "answer", or anything
  //    unknown. Always renders a visible text input so no question disappears. ──
  return (
    <div>
      {label}
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChangeValue(e.target.value)}
        className={`${inputBase} mt-1`}
        placeholder={q.label ?? "Your answer…"}
      />
    </div>
  );
}