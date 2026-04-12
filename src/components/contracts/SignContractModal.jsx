import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignContractModal({ open, onClose, contract, contractTemplate, onSigned }) {
  const sigRef = useRef(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setSaving(false);
  }, [open]);

  if (!open || !contract || !contractTemplate) return null;

  const clear = () => sigRef.current?.clear();

  const save = async () => {
    try {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        alert("Please add your signature first.");
        return;
      }
      setSaving(true);

      // 1) Get PNG from canvas
      const dataUrl = sigRef.current.toDataURL("image/png");

      // 2) Upload to Supabase Storage
      const filePath = `signatures/${contract.id}.png`;
      const signResponse = await fetch(`http://localhost:5001/api/contract/${contract.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath, data_url: dataUrl })
      });

      if (!signResponse.ok) {
        const errorData = await signResponse.json();
        throw errorData.error;
      }

      // 3) Get a public URL
      const data = await signResponse.json();

      const signedUrl = data.publicUrl;

      // 4) Mark contract as signed
      const contractResponse = await fetch(`http://localhost:5001/api/contract/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signed_at: new Date().toISOString(), status: "Signed", signed_pdf_url: signedUrl })
      });

      if (!contractResponse.ok) {
        const errorData = await contractResponse.json();
        throw errorData.error;
      }

      // 5) return contract as signed
      const contractData = await contractResponse.json()
    
      onSigned(contractData);
      onClose();
      alert("Contract signed!");
    } catch (e) {
      console.error(e);
      alert(`Could not save signature: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sign “{contractTemplate.name ?? "Contract"}”</h3>
          <button type="button" onClick={onClose} className="text-sm px-2 py-1 rounded border hover:bg-neutral-50">Close</button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-neutral-600">
            Please sign in the box below. By saving, you agree to the terms of this agreement.
          </p>
          <div className="border rounded-md">
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{ className: "w-full h-48 rounded-md" }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={clear} className="px-3 py-2 rounded border hover:bg-neutral-50">
              Clear
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-2 rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Signature"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
