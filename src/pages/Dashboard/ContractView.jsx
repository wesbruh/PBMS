import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"
import ContractDetail from "./ContractDetail";

export default function ContractView() {
  const { session, profile } = useAuth();
  const { id: contractId } = useParams();

  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1) fetch contract if it exists and belongs to user
  useEffect(() => {
    setLoading(true);

    if (!session || !profile || !contractId) return;

    async function fetchContract() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contract/${contractId}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ user_id: profile.id })
        });


        if (!response.ok) {
          console.error("Contract does not exist.");
          throw new Error("Contract does not exist.")
        }

        const data = await response.json();
        setContract(data)
      } catch (error) {
        console.error("Error fetching contract:", error);
        setLoading(false);
      }
    };

    fetchContract();
  }, [session, profile]);

  useEffect(() => {
    if (!contract || !session) return;

    async function fetchContractTemplate() {
      try {
        const response = await fetch(`http://localhost:5001/api/contract/templates/${contract.template_id}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) {
          console.error("Contract Template does not exist.");
          return;
        }

        const data = await response.json()
        setContractTemplate(data)
      } catch (error) {
        console.error("Error fetching contract template:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchContractTemplate();

  }, [contract, session]);

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
        onSigned={(contract) => {
          setContract(contract);
        }}
      />
    </div>
  );
}
