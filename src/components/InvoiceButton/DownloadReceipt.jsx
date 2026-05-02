import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext";

export default function DownloadReceiptButton({ invoiceId }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(false);
  }, [session])

  const handleDownload = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/receipts/${invoiceId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!response.ok) {
        const errorRes = await response.json();
        console.log(errorRes);
        throw new Error("Failed to download receipt.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `YRP-Receipt.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      alert("Error downloading receipt: " + error.message);
    }
  };

  if (!session) return;

  return (
    <div>
      {
        loading ? <></> : <button
        onClick={handleDownload}
        className="text-[#7A4A3A] hover:opacity-70 flex items-center justify-center w-3 h-5"
        aria-label="Download Receipt"
      >
        <i className="fa-solid fa-file-invoice text-sm leading-none"></i>
      </button>
      }
    </div>
  );
}