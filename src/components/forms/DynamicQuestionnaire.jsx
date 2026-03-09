import React from "react";

const labelCaps = "text-[11px] tracking-[0.2em] text-[#7E4C3C] mb-2 block";
const inputBase = "w-full rounded-md border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#AB8C4B]/40 focus:border-[#AB8C4B]";

export default function DynamicQuestionnaire({ questions, answers, onChange }) {
  const handleInputChange = (tempId, value) => {
    onChange({ ...answers, [tempId]: value });
  };

  const handleCheckboxChange = (tempId, option, isChecked) => {
    const current = answers[tempId] || [];
    const next = isChecked 
      ? [...current, option] 
      : current.filter(o => o !== option);
    handleInputChange(tempId, next);
  };

  return (
    <div className="space-y-6 py-6 border-t border-[#E7DFCF] animate-in fade-in slide-in-from-top-4 duration-500">
      <h3 className="font-serif text-xl text-brown">Session Details</h3>
      <p className="text-xs text-neutral-500 -mt-4">Please answer a few questions to help me prepare.</p>
      
      {questions.map((q) => (
        <div key={q.tempId}>
          <label className={labelCaps}>
            {q.label.toUpperCase()} {q.required && "*"}
          </label>

          {q.type === "short_text" && (
            <input
              type="text"
              className={inputBase}
              required={q.required}
              value={answers[q.tempId] || ""}
              onChange={(e) => handleInputChange(q.tempId, e.target.value)}
            />
          )}

          {q.type === "long_text" && (
            <textarea
              rows={3}
              className={inputBase}
              required={q.required}
              value={answers[q.tempId] || ""}
              onChange={(e) => handleInputChange(q.tempId, e.target.value)}
            />
          )}

          {q.type === "select" && (
            <select
              className={inputBase}
              required={q.required}
              value={answers[q.tempId] || ""}
              onChange={(e) => handleInputChange(q.tempId, e.target.value)}
            >
              <option value="">Select an option</option>
              {q.options?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {q.type === "radio" && (
            <div className="space-y-2">
              {q.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={q.tempId}
                    className="h-4 w-4 accent-brown"
                    checked={answers[q.tempId] === opt}
                    onChange={() => handleInputChange(q.tempId, opt)}
                  />
                  <span className="text-sm text-neutral-700">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "checkbox" && (
            <div className="space-y-2">
              {q.options?.map((opt, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brown"
                    checked={(answers[q.tempId] || []).includes(opt)}
                    onChange={(e) => handleCheckboxChange(q.tempId, opt, e.target.checked)}
                  />
                  <span className="text-sm text-neutral-700">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "date" && (
            <input
              type="date"
              className={inputBase}
              required={q.required}
              value={answers[q.tempId] || ""}
              onChange={(e) => handleInputChange(q.tempId, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}