import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext"
import SignContractModal from "../../components/contracts/SignContractModal";

export default function ContractDetail() {
  const { user } = useAuth();
  const { id: contractId } = useParams();

  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  // 1) fetch contract if it exists and belongs to user
  useEffect(() => {
    setLoading(true);
    if (!user || !contractId) {
      return;
    }

    async function fetchContract() {
      const { data, error } = await supabase
        .from("Contract")
        .select("id, template_id, status, created_at, updated_at, signed_pdf_url, ContractTemplate ( name, body )")
        .eq("id", contractId)
        .eq("assigned_user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Contract does not exist or belong to this user.");
        return;
      }
      
      setContract(data)
      setLoading(false);
    };

    fetchContract();

  }, [user, contractId]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading contract...
      </div>
    );
  }
  
  const statusKey = contract.status;
  const signedUrl = contract?.signed_pdf_url || null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate("/dashboard/contracts")} className="text-sm underline hover:cursor-pointer">
          ← Back
        </button>
        <div className="text-sm text-neutral-500">
          {new Date(contract?.updated_at || contract.created_at).toLocaleString()}
        </div>
      </div>

      <h1 className="text-2xl font-semibold">{contract.ContractTemplate.name}</h1>

      {/* Actions */}
      <div className="flex gap-2">
        {statusKey === "Signed" && signedUrl ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-md border hover:bg-neutral-50"
          >
            View Signed Document
          </a>
        ) : (
          <button
            onClick={() => setSigning(true)}
            className="px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 hover:cursor-pointer"
          >
            Review &amp; Sign
          </button>
        )}
      </div>

      {/* Viewer */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {signedUrl ? (
          // show the signed image/pdf
          <iframe
            title="Signed Document"
            src={signedUrl}
            className="w-full h-[70vh]"
          />
        ) : (
          <div className="p-6 text-neutral-800">
            <article className="prose max-w-none whitespace-pre-line">
              {contract.ContractTemplate.body}
            </article>
          </div>
        )}
      </div>

      <SignContractModal
        open={signing}
        contract={contract}
        onClose={() => setSigning(false)}
        onSigned={() => navigate("/dashboard/contracts", {replace: true})}  // go back to contracts after signing
      />
    </div>
  );
}