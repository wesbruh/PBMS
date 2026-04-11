
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ContractDetail from "../../../pages/Dashboard/ContractDetail.jsx";

export default function AdminContractView() {
  const {contractId } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [contractTemplate, setContractTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    if (!contractId) return;

    async function fetchContract() {
      try {
        const response = await fetch(`http://localhost:5001/api/contract/${contractId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
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
  }, [contractId]);

  useEffect(() => {
    if (!contract?.template_id) return;

    async function fetchContractTemplate() {
      try {
        const response = await fetch(
          `http://localhost:5001/api/contract/templates/${contract.template_id}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

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