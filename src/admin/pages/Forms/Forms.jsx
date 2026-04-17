import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Plus, LoaderCircle, PencilLine, Trash2, CopyPlus } from "lucide-react";
import Table from "../../components/shared/Table/Table.jsx";

import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";

export default function Forms() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const tabs = new Set(["Questionnaire", "Contract"]);
  const tabFilter = {
    dataType: "templates",
    tabs,
    tabFilterFn: (row, selectedTab) => {
      return selectedTab === "All" || selectedTab === row.type;
    }
  };

  async function loadTemplates() {
    setError("");
    setLoading(true);
    try {
      const { data: qTemplates, error: qFetchErr } = await supabase
        .from("QuestionnaireTemplate")
        .select(
          "id, name, active, session_type_id, SessionType:session_type_id(name), schema_json",
        )
        .order("session_type_id", { ascending: true });

      const { data: cTemplates, error: cFetchErr } = await supabase
        .from("ContractTemplate")
        .select("*, SessionType:session_type_id(name)")
        .order("session_type_id", { ascending: true });

      if (qFetchErr || cFetchErr) throw qFetchErr ?? cFetchErr;

      qTemplates.forEach((t) => {
        t.type = "Questionnaire"
      });

      cTemplates.forEach((t) => {
        t.type = "Contract"
      });

      const data = [...qTemplates, ...cTemplates];
      setItems(data);
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
      if (template.type === "Questionnaire") {
        // delete the template safely, give success alert
        const { error: delErr } = await supabase
          .from("QuestionnaireTemplate")
          .delete()
          .eq("id", templateId);

        if (delErr) throw delErr;
      } else if (template.type === "Contract") {
        // delete the template safely, give success alert
        const { error: delErr } = await supabase
          .from("ContractTemplate")
          .delete()
          .eq("id", templateId);

        if (delErr) throw delErr;
      }
      
      alert(`${templateName} was successfully deleted.`);

      loadTemplates();
    } catch (e) {
      alert(`Failed to delete ${templateName}: ${e.message}`);
    }
  }

  // map data to table
  const templateTableData = items.map((t) => ({
    id: t.id,
    type: t.type,
    name: t.name,
    sessionType: t.SessionType?.name ?? "—",
    active: t.active,
  }));

  const tableFormColumns = [
    {
      key: "name",
      label: "Template Name",
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    { key: "type", label: "Template Type", sortable: true },
    { key: "sessionType", label: "Session Type", sortable: true },
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
        <div className="flex items-center gap-5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (row.type === "Questionnaire")
                navigate(`/admin/forms/questionnaires/${row.id}/edit`);
              else if (row.type === "Contract")
                navigate(`/admin/forms/contracts/${row.id}/edit`);
            }}
            className=" text-blue-600 cursor-pointer hover:text-blue-900"
            title="Edit Template"
          >
            <PencilLine size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="text-red-500 cursor-pointer hover:text-red-900"
            title="Delete Template"
          >
            <Trash2 size={18} />
          </button>
          <button
            className="text-green-500 cursor-pointer hover:text-green-900"
            title="Duplicate Template"
          >
            <CopyPlus size={18} />
          </button>
        </div>
      ),
    }
  ];

  return (
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner bg-[#fcfcfc] rounded-lg overflow-y-auto">
        <Frame>
          <div className="w-full h-full flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Questionnaire Templates and Contracts</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  One active template per session type. Publishing a new one
                  deactivates the previous.
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  Click on a column header to sort ascending or descending order.
                </p>
              </div>
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm cursor-pointer"
                >
                  <Plus size={15} />
                  Create Template
                </button>
                <ul
                  className="absolute top-full bg-white shadow-xl rounded-md z-10 max-h-0 opacity-0 
  group-hover:max-h-40 group-hover:opacity-100 transition-all duration-800 ease-out w-full text-white "
                >
                  <li className="w-full">
                    <button
                      onClick={() => navigate("/admin/forms/questionnaires/new")}
                      className="w-full flex justify-center gap-2 px-4 py-2 text-sm bg-black hover:bg-gray-700 cursor-pointer"
                    >
                      Questionnaire
                    </button>
                  </li>
                  <li className="w-full">
                    <button
                      onClick={() => navigate("/admin/forms/contracts/new")}
                      className="w-full flex justify-center gap-2 px-4 py-2 text-sm bg-black hover:bg-gray-700 cursor-pointer"
                    >
                      Contract
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* body */}
            <div className="mt-6 grow flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center grow text-gray-500">
                  <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
                  <p className="text-sm">Loading templates...</p>
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
                  columns={tableFormColumns}
                  data={templateTableData}
                  searchable={false}
                  rowsPerPage={4}
                  tabFilter={tabFilter}
                />
              )}
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}