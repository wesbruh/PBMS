import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

export default function QuestionnairesList() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  async function loadTemplates() {
    setError("");
    setLoading(true);
    try {
      // Join SessionType to display the human-readable session name
      const { data, error: fetchErr } = await supabase
        .from("QuestionnaireTemplate")
        .select("id, name, active, session_type_id, SessionType:session_type_id(name), schema_json")
        .order("session_type_id", { ascending: true });

      if (fetchErr) throw fetchErr;
      setItems(data ?? []);
    } catch (e) {
      setError(e.message || "Failed to load questionnaire templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function handleDelete(templateId) {
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    try {
      const { error: delErr } = await supabase
        .from("QuestionnaireTemplate")
        .delete()
        .eq("id", templateId);
      if (delErr) throw delErr;
      loadTemplates();
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  return (
    <div className="w-full overflow-y-scroll">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Questionnaire Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            One active template per session type. Publishing a new one deactivates the previous.
          </p>
        </div>
        <Link
          to="/admin/forms/questionnaires/new"
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          + Create Template
        </Link>
      </div>

      <div className="mt-6">
        {loading && <p className="text-sm">Loading...</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-600">
            No templates yet. Create one to get started.
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b">Template Name</th>
                  <th className="text-left p-3 border-b">Session Type</th>
                  <th className="text-left p-3 border-b">Questions</th>
                  <th className="text-left p-3 border-b">Status</th>
                  <th className="text-left p-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 capitalize">
                      {t.SessionType?.name ?? "—"}
                    </td>
                    <td className="p-3 text-gray-500">
                      {Array.isArray(t.schema_json) ? t.schema_json.length : 0} question{Array.isArray(t.schema_json) && t.schema_json.length === 1 ? "" : "s"}
                    </td>
                    <td className="p-3">
                      {t.active ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-medium">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/admin/forms/questionnaires/${t.id}/edit`}
                          className="underline text-blue-600"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="underline text-red-500"
                        >
                          Delete
                        </button>
                      </div>
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