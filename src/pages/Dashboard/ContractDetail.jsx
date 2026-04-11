import { useState } from "react";
import SignContractModal from "../../components/contracts/SignContractModal";

export default function ContractDetail({ contract, contractTemplate, onSigned, readOnly = false }) {
  const [signing, setSigning] = useState(false);
    
  const [statusKey, setStatusKey] = useState(contract?.status || "Draft");
  const signedUrl = contract?.signed_pdf_url || null;
  
  if (!contractTemplate) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{contractTemplate.name}</h1>

      {/* Actions */}
      <div className="flex gap-2">
        {!readOnly && statusKey === "Draft" && !signedUrl ? (
          <button
            type="button"
            onClick={() => setSigning(true)}
            className="px-3 py-2 rounded-md bg-neutral-900 text-white hover:bg-neutral-800 hover:cursor-pointer"
          >
            Review &amp; Sign
          </button>
        ) : (<></>)}
      </div>

      {/* Viewer */}
      <div className="flex flex-col overflow-y-scroll overflow-x-hidden border rounded-lg bg-white">
        <div className="p-6 text-neutral-800">
          <article className="prose w-full whitespace-pre-line">
            {contractTemplate.body}
          </article>
        </div>
        {signedUrl ? (
          // show the signature
          <div className="flex mx-auto flex-row-reverse w-full">
            <div className="flex flex-row">
              <p className="px-3 py-2 text-xl my-auto font-extralight">Signature:</p>
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  title="Signature"
                  src={signedUrl}
                  className="flex w-40 sm:w-50 m-5"
                />
              </a>
            </div>
          </div>
        ) : (<></>)}
      </div>
      {!readOnly &&(
      <SignContractModal
        open={signing}
        contract={contract}
        contractTemplate={contractTemplate}
        onSigned={(contract) => {
          onSigned(contract);
          setStatusKey("Signed");
        }}
        onClose={() => setSigning(false)}
      />
      )}
    </div>
  );
}
