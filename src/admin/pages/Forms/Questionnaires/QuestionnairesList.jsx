import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function QuestionnairesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQuestionnaires() {
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("questionnaires")
        .select("id, title, session_type, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data ?? []);
    } catch (e) {
      setError(e.message || "Failed to load questionnaires.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Questionnaires</h1>
        <Link
          to="/admin/forms/questionnaires/new"
          className="px-4 py-2 rounded bg-black text-white"
        >
          Create Questionnaire
        </Link>
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-600">Manage questionnaires by session type.</p>

        {loading && <p className="mt-4 text-sm">Loading...</p>}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="mt-4 text-sm text-gray-600">No questionnaires yet.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b">Title</th>
                  <th className="text-left p-3 border-b">Session Type</th>
                  <th className="text-left p-3 border-b">Status</th>
                  <th className="text-left p-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id} className="border-b">
                    <td className="p-3">{q.title}</td>
                    <td className="p-3">{q.session_type}</td>
                    <td className="p-3">
                      {q.is_active ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {/* Next step: wire Edit */}
                      <Link
                        to={`/admin/forms/questionnaires/${q.id}/edit`}
                        className="underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}