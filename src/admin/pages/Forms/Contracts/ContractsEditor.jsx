import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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

import Sidebar from "../../../components/shared/Sidebar/Sidebar";
import Frame from "../../../components/shared/Frame/Frame";

export default function ContractsEditor({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  // call useAuth for Supabase session
  const { session } = useAuth();

  const [name, setName] = useState("");
  const [sessionTypeOptions, setSessionTypeOptions] = useState([]);
  const [sessionType, setSessionType] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [body, setBody] = useState([]);
  const [initialState, setInitialState] = useState(null);

  // handlers for unsaved/saved changes state
  useEffect(() => {
    if (loading) return; // skip dirty check while loading initial data
    if (initialState !== null) return; // only captures once after initial load

    setInitialState({
      name,
      sessionType,
      body
    });
  }, [loading, name, sessionType, body, initialState]);

  const isDirty =
    initialState !== null &&
    (name !== initialState.name ||
      sessionType !== initialState.sessionType ||
      body !== initialState.body);

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

  useEffect(() => {
    if (!session) return;

    const loadSessionTypeOptions = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/types`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) throw new Error("Could not fetch session types");

        const data = await response.json();

        const sessionTypeOptions = new Set();
        data.forEach((sessionType) => {
          sessionTypeOptions.add({ label: `${sessionType.name}`, value: `${sessionType.name}` });
        });

        setSessionTypeOptions([...sessionTypeOptions]);
      } catch (error) {
        console.error(error);
      }
    }

    loadSessionTypeOptions();

  }, [session]);

  // ── Load existing template in edit mode ───────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !session || !sessionTypeOptions) return;

    async function load() {
      setError("");
      try {
        const { data: cTemplate, error: cTemplateError } = await supabase
          .from("ContractTemplate")
          .select()
          .eq("id", id)
          .single();

        if (cTemplateError) throw cTemplateError;

        setName(cTemplate.name ?? "");

        // Resolve session_type_id → string value for the dropdown
        if (cTemplate.session_type_id) {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/type`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${session?.access_token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ session_type_id: cTemplate.session_type_id })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw errorData.error;
          }

          const data = await response.json();
          setSessionType((data?.name ?? ""));
        }

        setBody(cTemplate.body);
      } catch (e) {
        setError(e?.message ?? "Failed to load template.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [loading, isEdit, id, session, sessionTypeOptions]);

  // ------ Validation ------
  function validate() {
    if (!name.trim()) return "Template name is required.";
    if (!sessionType) return "Session type is required.";
    if (!body) return "Body is required."
    return "";
  }

  // ------ Resolve SessionType UUID ------
  async function resolveSessionTypeId(value) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/type`, {
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


  // ------ Save as draft (active: false) ------
  async function handleSaveDraft() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      const sessionTypeId = await resolveSessionTypeId(sessionType);

      const payload = {
        name: name.trim(),
        session_type_id: sessionTypeId,
        body: body.trim(),
        active: false,
      };

      if (isEdit) {
        // ensure contracts cannot be edited in-place if it is already being referenced

        // check if id has been referenced by any contracts
        const { data: contractData, error: contractError } = await supabase
          .from("Contract")
          .select()
          .eq("template_id", id);

        if (contractError) throw contractError;

        // mark active contract template for a session type as inactive and deleted if referenced by any contracts
        // this will allow previous contracts to still be viewed at their current state, even if the contract template itself is edited
        if (contractData) {
          const { error: updateErr } = await supabase
            .from("ContractTemplate")
            .update({ active: false, is_deleted: true })
            .eq("id", id);

          if (updateErr) throw updateErr;

          // ensure contracts cannot be edited if already being referenced
          const { error: insertError } = await supabase
            .from("ContractTemplate")
            .insert(payload);

          if (insertError) throw insertError;
        } else {
          // allow editing as normal, if no references
          const { error: updateError } = await supabase
            .from("ContractTemplate")
            .update(payload)
            .eq("id", id);

          if (updateError) throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("ContractTemplate")
          .insert(payload);

        if (insertError) throw insertError;
      }
      navigate("/admin/forms");
    } catch (e) {
      setError(e?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }

    setInitialState({
      name,
      sessionType,
      body,
    });
  }

  // ------ Publish (active: true, deactivates others for same session type) ------
  async function handlePublish() {
    setError("");
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setSaving(true);
      const sessionTypeId = await resolveSessionTypeId(sessionType);
      const payload = {
        name: name.trim(),
        session_type_id: sessionTypeId,
        body: body.trim(),
        active: true,
      };

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("ContractTemplate")
          .update(payload)
          .eq("id", id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("ContractTemplate")
          .insert(payload);

        if (insertError) throw insertError;
      }

      // set only one contract template active for this session type
      const { error: setActiveError } = await supabase
        .from("ContractTemplate")
        .update({ active: false })
        .eq("session_type_id", sessionTypeId)
        .neq("id", id);

      if (setActiveError) throw setActiveError;

      navigate("/admin/forms");
    } catch (e) {
      setError(e?.message || "Failed to publish template.");
    } finally {
      setSaving(false);
    }

    setInitialState({
      name,
      sessionType,
      body
    });
  }

  // main UI
  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex min-w-50 overflow-y-auto">
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
                  ? "Edit Contract Template"
                  : "Create Contract Template"}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || loading}
                  className="px-4 py-2 rounded border text-sm bg-black text-white disabled:opacity-50 hover:bg-gray-700 transition-all cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving || loading}
                  className="px-4 py-2 rounded bg-green-700 text-white text-sm disabled:opacity-50 hover:bg-green-800 transition-all cursor-pointer"
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
                  <div className="flex items-center justify-center px-3 mx-auto">
                    <p className="text-sm text-red-600 text-center">{error}</p>
                  </div>)
                }
                <div className="max-w-3xl grid grid-cols-1 md:grid-cols-2 mx-auto gap-4">
                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-medium">Template Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full border rounded px-3 py-2 text-sm"
                      placeholder="e.g. Maternity Session Contract"
                    />
                  </div>

                  {/* Session Type */}
                  <div>
                    <label className="block text-sm font-medium">Session Type</label>
                    <select
                      defaultValue={sessionType ?? ""}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="mt-1 w-full border rounded px-3 py-2 text-sm cursor-pointer"
                    >
                      <option value="" disabled>Select a session type</option>
                      {sessionTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Body Type */}
                <div className="max-w-3xl mx-auto">
                  <label className="block text-sm font-medium">Contract Body</label>
                  <textarea
                    rows={4}
                    placeholder="Contract Body"
                    value={body}
                    className="mt-1 w-full border rounded px-3 py-2 text-sm"
                    onChange={(e) => { setBody(e.target.value) }}
                  />
                </div>

                <p className="md:col-span-2 mt-4 text-sm font-bold text-gray-600 text-center">
                  Publishing this contract will overwrite any other active
                  template for this specific session type.
                  <br />
                  Consider saving as a draft if you want to keep the existing active
                  template in place while you work on this new one.
                </p>
              </div>
            )}
          </div>
        </Frame>
      </div>
    </div>
  );
}