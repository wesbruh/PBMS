import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SignContractModal from "../../components/contracts/SignContractModal";

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  // 1) auth user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setAuthUser(data?.user ?? null);
    })();
  }, []);

  // 2) map auth user -> clients.id
  useEffect(() => {
    if (!authUser?.email) return;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("email", authUser.email)
        .maybeSingle();
      setClientId(data?.id ?? null);
    })();
  }, [authUser?.email]);

  // 3) fetch this contract (and its template)
  const fetchContract = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract")
      .select(`
        id, title, status, created_at, updated_at,
        signed_pdf_url, hellosign_request_id,
        contract_template ( name, file_url )
      `)
      .eq("id", id)
      .maybeSingle();
    if (error) console.error(error);
    setContract(data ?? null);
    setLoading(false);
  };

  useEffect(() => { if (id) fetchContract(); }, [id]);

  if (!authUser) return <div className="p-6">Please log in.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (!contract) return <div className="p-6">Not found.</div>;

  const statusKey = (contract.status || "").toLowerCase();
  const templateUrl = contract.contract_template?.file_url || null;
  const signedUrl = contract.signed_pdf_url || null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="text-sm underline">
          ← Back
        </button>
        <div className="text-sm text-neutral-500">
          {new Date(contract.updated_at || contract.created_at).toLocaleString()}
        </div>
      </div>

      <h1 className="text-2xl font-semibold">{contract.title}</h1>

      {/* Actions */}
      <div className="flex gap-2">
        {statusKey === "signed" && signedUrl ? (
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
            className="px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
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
        ) : templateUrl ? (
          // show the template file (PDF or hosted HTML)
          <iframe
            title="Contract Template"
            src={templateUrl}
            className="w-full h-[70vh]"
          />
        ) : (
          <div className="p-6 text-neutral-800">
  {contract.contract_text ? (
    <article className="prose max-w-none whitespace-pre-line">
      {contract.contract_text}
    </article>
  ) : (
    <span className="italic text-neutral-500">
      When you sign this agreement, you agree to these essential terms: To book your date, you must pay a deposit (retainer) which is non-refundable. The rest of the payment is due 3 days before the photo session. If you cancel, you lose the deposit, and if you cancel within 1 day of the session, the full payment is still required. The Photographer owns the copyright to all photos, and you receive a license to use them for your own personal printing and sharing—you cannot sell the photos, change them (beyond cropping), or enter them in contests. You allow the Photographer to use the photos for their portfolio and promotion, unless you tell us in writing that you do not want us to. If the Photographer has an emergency and cannot perform the service, our responsibility is limited to giving you a full refund of all money you paid.
    </span>
  )}
</div>
        )}
      </div>

      <SignContractModal
        open={signing}
        contract={contract}
        onClose={() => setSigning(false)}
        onSigned={() => fetchContract()}  // refresh detail after signing
      />
    </div>
  );
}