import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { Plus, LoaderCircle } from "lucide-react";
import Table from "../../../components/shared/Table/Table.jsx";

export default function QuestionnairesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function loadTemplates() {
    setError("");
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from("QuestionnaireTemplate")
        .select(
          "id, name, active, session_type_id, SessionType:session_type_id(name), schema_json",
        )
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
    const template = items.find((t) => t.id === templateId);
    const templateName = template?.name ?? "Template";

    if (
      !window.confirm(
        "Delete this template? Existing submitted questionnaires will keep their data but lose the template link.",
      )
    )
      return;

    try {
      // delete the template safely, give success alert
      const { error: delErr } = await supabase
        .from("QuestionnaireTemplate")
        .delete()
        .eq("id", templateId);

      if (delErr) throw delErr;
      alert(`${templateName} was successfully deleted.`);

      loadTemplates();
    } catch (e) {
      alert(`Failed to delete ${templateName}: ${e.message}`);
    }
  }

  // map data to table
  const questionnaireTableData = items.map((t) => ({
    id: t.id,
    name: t.name,
    sessionType: t.SessionType?.name ?? "—",
    questionCount: Array.isArray(t.schema_json) ? t.schema_json.length : 0,
    active: t.active,
  }));

  const tableQuestionnaireColumns = [
    {
      key: "name",
      label: "Template Name",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    { key: "sessionType", label: "Session Type", sortable: false },
    {
      key: "questionCount",
      label: "Questions",
      sortable: true,
      render: (value) => (
        <span className="text-gray-500 capitalize">
          {value} question{value === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "active",
      label: "Status",
      sortable: true,
      render: (value) =>
        value ? (
          <span className="px-3 py-1 rounded-md bg-green-100 text-green-800 text-sm font-medium">
            Active
          </span>
        ) : (
          <span className="px-3 py-1 rounded-md bg-gray-100 text-gray-600 text-sm font-medium">
            Draft
          </span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/forms/questionnaires/${row.id}/edit`);
            }}
            className="underline text-blue-600 cursor-pointer"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="underline text-red-500 cursor-pointer"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Questionnaire Templates and Contracts</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            One active template per session type. Publishing a new one
            deactivates the previous.
            <br />
            Click on a column header to sort ascending or descending order.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/forms/questionnaires/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-700 cursor-pointer"
        >
          <Plus size={15} />
          Create Template
        </button>
      </div>

      {/* body */}
      <div className="mt-6 grow flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center grow text-gray-500">
            <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
            <p className="text-sm">Loading questionnaire templates...</p>
          </div>
        ) : error ? (
          <div className="grow flex flex-col text-center items-center justify-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="grow flex flex-col items-center justify-center">
            <p className="text-sm text-gray-600">
              No templates yet. Create one to get started.
            </p>
          </div>
        ) : (
          <Table
            columns={tableQuestionnaireColumns}
            data={questionnaireTableData}
            searchable={false}
            rowsPerPage={4}
          />
        )}
      </div>
    </div>
  );
}
