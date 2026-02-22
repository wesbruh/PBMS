import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "../../lib/supabaseClient";

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function SignContractModal({ open, onClose, contract, onSigned }) {
  const sigRef = useRef(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setSaving(false);
  }, [open]);

  if (!open || !contract) return null;

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
      const blob = dataUrlToBlob(dataUrl);

      // 2) Upload to Supabase Storage
      const filePath = `signatures/${contract.id}-${crypto.randomUUID()}.png`;
      const { error: uploadErr } = await supabase
        .storage
        .from("Signed-contracts")
        .upload(filePath, blob, { upsert: true });
      if (uploadErr) throw uploadErr;

      // 3) Get a public URL
      const { data: pub } = supabase.storage.from("Signed-contracts").getPublicUrl(filePath);
      const signedUrl = pub?.publicUrl;

      // 4) Mark contract as signed
      const { error: updErr } = await supabase
        .from("Contract")
        .update({ status: "Signed", signed_pdf_url: signedUrl })
        .eq("id", contract.id);
        if (updErr) throw updErr;

      onSigned?.({
        id: contract.id,
        signedUrl,                           // the public URL we just saved
        status: "Signed",                    // normalize to title-case if your DB uses that
        updatedAt: new Date().toISOString(),
      });
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
          <h3 className="text-lg font-semibold">Sign “{contract.title ?? "Contract"}”</h3>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded border hover:bg-neutral-50">Close</button>
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
            <button onClick={clear} className="px-3 py-2 rounded border hover:bg-neutral-50">
              Clear
            </button>
            <button
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