import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext"
import ContractDetail from "./ContractDetail";

export default function ContractView() {
  const { user } = useAuth();
  const { id: contractId } = useParams();

  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1) fetch contract if it exists and belongs to user
  useEffect(() => {
    setLoading(true);

    if (!user || !contractId) {
      return;
    }

    async function fetchContract() {
      const { data, error } = await supabase
        .from("Contract")
        .select("id, template_id, status, created_at, updated_at, signed_pdf_url, template_id")
        .eq("id", contractId)
        .eq("assigned_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Contract does not exist or belong to this user.");
        return;
      }

      setContract(data)
    };

    fetchContract();
  }, [user]);

  useEffect(() => {
    if (!contract) {
      return;
    }

    async function fetchContractTemplate() {
      const { data, error } = await supabase
        .from("ContractTemplate")
        .select("id, body, name")
        .eq("id", contract.template_id)
        .maybeSingle();

      if (error) {
        console.error("Contract Template does not exist.");
        return;
      }

      setContractTemplate(data)
    };

    fetchContractTemplate();

  }, [contract]);

  useEffect(() => {
    if (!contract || !contractTemplate) {
      return;
    }

    setLoading(false);

  }, [contract, contractTemplate]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading contract...
      </div>
    );
  }
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
      <ContractDetail
        contract={contract}
        contractTemplate={contractTemplate}
        onSigned={(contract)=>{
          setContract(contract);
        }}
      />
    </div>
  );
}
