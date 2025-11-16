import { useState } from "react";

export default function DownloadInvoiceButton({ invoiceId }) {
    const [loading, setLoading] = useState(false);

    const downloadInvoice = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost:5001/api/invoice/${invoiceId}/download`,
                {
                    method: "GET",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to download invoice.");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice-${invoiceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

        } catch (error) {
            alert("Error downloading invoice: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={downloadInvoice}
            disabled={loading}
            style={{
                padding: "8px 16px",
                backgroundColor: loading ? "#999" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
            }}
        >
            {loading ? "Downloading..." : "Download PDF"}
        </button>
    );
}
