import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext";

export default function DownloadInvoiceButton({ invoiceId }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(false);
  }, [session])

  const handleDownload = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invoice/${invoiceId}/pdf`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to download invoice.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      //Name of the PDF
      a.download = `YRPInvoice.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Error downloading invoice: " + error.message);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invoice/${invoiceId}/pdf`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to preview invoice.");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      alert("Error previewing invoice: " + error.message);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {loading ? <></> :
        <button onClick={handlePreview} aria-label="Preview Invoice">
          <i className="fa-solid fa-eye text-base  text-[#7A4A3A] hover:opacity-70"></i>
        </button>}
      {loading ? <></> :
        <button onClick={handleDownload} aria-label="Download Invoice">
          <i className="fa-solid fa-download text-base -translate-y-0.5 text-[#7A4A3A] hover:opacity-70"></i>
        </button>
      }
    </div>
  );
}