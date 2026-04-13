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
      const response = await fetch(`http://localhost:5001/api/receipt/${invoiceId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!response.ok) {
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
        className="text-[#7A4A3A] hover:opacity-70 flex items-center"
        aria-label="Download Receipt"
      >
        <i className="fa-solid fa-file-invoice text-sm"></i>
      </button>
      }
    </div>
  );
}