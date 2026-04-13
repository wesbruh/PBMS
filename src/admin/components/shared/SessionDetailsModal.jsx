import { useEffect, useState } from "react";
import { X, LoaderCircle } from "lucide-react";

// function to format questionnaire answers for display on frontend 
// handles both plain string answers and JSON arrays (for checkbox/radio/select questions)
function formatAnswer(answer) {
  // try to parse as JSON in case it's a stored array (radio/checkbox/select answers)
  try {
    const parsed = JSON.parse(answer);
    if (Array.isArray(parsed)) {
      // empty array = show nothing meaningful
      if (parsed.length === 0) return "N/A";
      // single item = just show it
      if (parsed.length === 1) return parsed[0];
      // multiple items = comma-separated
      return parsed.join(", ");
    }
    // parsed but not an array. like a number, boolean, or quoted string)
    return String(parsed);
  } catch {
    // not JSON. is a plain string answer (short_text, long_text, date)
    return answer;
  }
}

export default function SessionDetailsModal({ sessionId, session, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch details when the modal opens
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/details`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json"
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load session details.");
          setLoading(false);
        }
      });

    // Prevent setting state if the modal closes mid-fetch
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-500 px-6 py-4">
          <h2 className="text-xl font-semibold">Session Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 hover:cursor-pointer"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col text-center items-center text-gray-500"> 
            <LoaderCircle className="text-brown animate-spin" size={32} />
            <p className="text-md">Loading details...</p>
            </div>
          )}
          {/* Error message */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && data && (
            <>
              {/* Notes section */}
              <section className="mb-4 border-b border-gray-300 pb-4">
                <h3 className="text-md font-semibold text-gray-70 mb-2">
                  Client Notes / Special Requests
                </h3>
                {data.notes ? (
                  <p className="text-sm whitespace-pre-wrap border border-gray-400 rounded-md p-3 bg-gray-50">
                    {data.notes}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No notes provided.
                  </p>
                )}
              </section>

              {/* Questionnaire section */}
              <section>
                <h3 className="text-md font-semibold text-gray-70 mb-2">
                  Questionnaire
                </h3>

                {!data.questionnaire ? (
                  <p className="text-sm text-gray-400 italic">
                    The client has not submitted a questionnaire for this
                    session yet.
                  </p>
                ) : (
                  <div>
                    <div className="text-sm text-gray-500 mb-3 border-b border-gray-300 pb-1">
                      <span className="font-semibold">
                        {data.questionnaire.template_name}
                      </span>
                      {data.questionnaire.submitted_at && (
                        <>
                          {" - Submitted "}
                          {new Date(
                            data.questionnaire.submitted_at,
                          ).toLocaleString()}
                        </>
                      )}
                    </div>

                    <div className="space-y-4">
                      {data.questionnaire.items.map((item) => (
                        <div key={item.question_id}>
                          <p className="text-sm font-medium text-gray-800">
                            {item.label}
                          </p>
                          {item.answer ? (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                              {formatAnswer(item.answer)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic mt-1">
                              No answer provided.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
