import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom";
import SignContractModal from "../../components/contracts/SignContractModal";

function fmt(d) { try { return new Date(d).toLocaleDateString(); } catch { return ""; } }

export default function ContractsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1) fetch contracts for this client
  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("Contract")
        .select("id, status, assigned_user_id, created_at, updated_at, signed_at, ContractTemplate ( name, body )")
        .eq("assigned_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) console.error(error);

      setRows(data || []);

      setLoading(false);
    };

    fetchContracts();

  }, [user]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading contracts...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <button onClick={() => navigate("/dashboard")} className="text-sm underline hover:cursor-pointer">
        ← Back
      </button>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Contracts</h1>
          <p className="text-sm text-neutral-500">
            Review and sign any contracts assigned to you.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border p-6 bg-white shadow-sm">
          You don’t have any contracts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <ContractRow
              key={c.id}
              contract={c}
              navigate={navigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractRow({ contract, template, navigate }) {
  const statusKey = contract.status;

  const badge =
    {
      draft: "bg-yellow-50 text-yellow-800 ring-yellow-200",
      sent: "bg-blue-50 text-blue-800 ring-blue-200",
      viewed: "bg-indigo-50 text-indigo-800 ring-indigo-200",
      signed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      declined: "bg-rose-50 text-rose-800 ring-rose-200",
      error: "bg-gray-50 text-gray-700 ring-gray-200",
    }[statusKey] || "bg-gray-50 text-gray-700 ring-gray-200";

  return (
    <div className="rounded-lg border bg-white shadow-sm p-4 flex items-center justify-between">
      <div className="space-y-1">
        {/* Make the title open the detail page */}
        <button
          type="button"
          onClick={() => navigate(`/dashboard/contracts/${contract.id}`, {replace: true})}
          className="font-medium hover:underline text-left hover:cursor-pointer"
        >
          {contract.ContractTemplate.name}
        </button>

        <div className="text-sm text-neutral-500">
          Created {fmt(contract.created_at)}
          {contract.updated_at && <> • Updated {fmt(contract.updated_at)}</>}
          {template?.name && (
            <> • Template: {template.name}</>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ring-1 ${badge}`}
        >
          {contract.status || "unknown"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/dashboard/contracts/${contract.id}`, {replace: true})}
          className="px-3 py-2 rounded-md border hover:bg-neutral-50 hover:cursor-pointer"
        >
          {contract.status === "Signed" ? "View Signed Document" : "Review & Sign"}
        </button>
      </div>
    </div>
  );
}