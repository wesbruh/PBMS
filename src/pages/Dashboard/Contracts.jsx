import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import SignContractModal from "../../components/contracts/SignContractModal";

function fmt(d) { try { return new Date(d).toLocaleDateString(); } catch { return ""; } }

export default function ContractsPage() {
  const [authUser, setAuthUser] = useState(null);  // supabase auth user
  const [clientId, setClientId] = useState(null);  // public.clients.id
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState({ open: false, contract: null });

  // 1) get auth user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setAuthUser(data?.user ?? null);
    })();
  }, []);

  // 2) map auth user -> clients.id (by email)
  useEffect(() => {
    if (!authUser?.email) return;
    (async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id")
        .eq("email", authUser.email)
        .maybeSingle();
      if (error) console.error("clients lookup error:", error);
      setClientId(data?.id ?? null);
    })();
  }, [authUser?.email]);

  // 3) fetch contracts for this client
  const fetchContracts = async (cid) => {
    if (!cid) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("contract")
      .select(`
        id, title, status, created_at, updated_at,
        signed_pdf_url, hellosign_request_id,
        contract_template ( name, file_url )
      `)
      .eq("user_id", cid)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (clientId) fetchContracts(clientId);
  }, [clientId]);

  if (!authUser) {
    return <div className="p-6">Please log in to view your contracts.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Contracts</h1>
          <p className="text-sm text-neutral-500">
            Review and sign any contracts assigned to you.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="rounded-lg border p-6 bg-white shadow-sm">Loading contracts…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border p-6 bg-white shadow-sm">
          You don’t have any contracts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <ContractRow
              key={c.id}
              contract={c}
              onReview={() => setSigning({ open: true, contract: c })}
            />
          ))}
        </div>
      )}

      {/* Signing modal: onSigned forces a fresh fetch so the card updates immediately */}
      <SignContractModal
        open={signing.open}
        contract={signing.contract}
        onClose={() => setSigning({ open: false, contract: null })}
        onSigned={() => clientId && fetchContracts(clientId)}
      />
    </div>
  );
}

function ContractRow({ contract, onReview }) {
  const navigate = useNavigate();
  const statusKey = (contract.status || "").toLowerCase();

  const badge =
    {
      draft: "bg-yellow-50 text-yellow-800 ring-yellow-200",
      sent: "bg-blue-50 text-blue-800 ring-blue-200",
      viewed: "bg-indigo-50 text-indigo-800 ring-indigo-200",
      signed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      declined: "bg-rose-50 text-rose-800 ring-rose-200",
      error: "bg-gray-50 text-gray-700 ring-gray-200",
    }[statusKey] || "bg-gray-50 text-gray-700 ring-gray-200";

  const openSigned = () => {
    if (contract.signed_pdf_url) {
      window.open(contract.signed_pdf_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm p-4 flex items-center justify-between">
      <div className="space-y-1">
        {/* Make the title open the detail page */}
        <button
          type="button"
          onClick={() => navigate(`/dashboard/contracts/${contract.id}`)}
          className="font-medium hover:underline text-left"
        >
          {contract.title}
        </button>

        <div className="text-sm text-neutral-500">
          Created {fmt(contract.created_at)}
          {contract.updated_at && <> • Updated {fmt(contract.updated_at)}</>}
          {contract.contract_template?.name && (
            <> • Template: {contract.contract_template.name}</>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ring-1 ${badge}`}
        >
          {statusKey || "unknown"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {statusKey === "signed" && contract.signed_pdf_url ? (
          <button
            type="button"
            onClick={openSigned}
            className="px-3 py-2 rounded-md border hover:bg-neutral-50"
          >
            View Signed Document
          </button>
        ) : (
          <button
            type="button"
            onClick={onReview}
            className="px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
          >
            Review &amp; Sign
          </button>
        )}
      </div>
    </div>
  );
}