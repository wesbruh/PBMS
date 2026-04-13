
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext"

import ContractDetail from "../../../pages/Dashboard/ContractDetail.jsx";

export default function AdminContractView() {
  const { contractId } = useParams();
  const navigate = useNavigate();

  const { session } = useAuth();

  const [contract, setContract] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    if (!contractId || !session) return;

    async function fetchContract() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contract/${contractId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          console.error("Admin contract does not exist.");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setContract(data);
      } catch (error) {
        console.error("Error fetching admin contract:", error);
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId, session]);

  useEffect(() => {
    if (!contract?.template_id) return;

    async function fetchContractTemplate() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contract/templates/${contract.template_id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          console.error("Contract template does not exist.");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setContractTemplate(data);
      } catch (error) {
        console.error("Error fetching contract template:", error);
        setLoading(false);
      }
    }

    fetchContractTemplate();
  }, [contract]);

  useEffect(() => {
    if (contract && contractTemplate) {
      setLoading(false);
    }
  }, [contract, contractTemplate]);

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Loading contract...
      </div>
    );
  }

  if (!contract || !contractTemplate) {
    return (
      <div className="w-full py-16 text-center text-brown font-serif">
        Failed to load contract.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="text-sm underline hover:cursor-pointer"
        >
          ← Back
        </button>

        <div className="text-sm text-neutral-500">
          {new Date(contract?.updated_at || contract?.created_at).toLocaleString()}
        </div>
      </div>

      <ContractDetail
        contract={contract}
        contractTemplate={contractTemplate}
        onSigned={(updatedContract) => {
          setContract(updatedContract);
        }}
        readOnly={true}
      />
    </div>
  );
}