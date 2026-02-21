export default function DownloadInvoiceButton({ invoiceId }) {
    const handleDownload = async () => {
        try{
            const response = await fetch(
                `http://localhost:5001/api/invoice/${invoiceId}/pdf`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to download invoice.");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            
            a.href = url;
            //Name of the PDF
            a.download = `PBMSInvoice.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert("Error downloading invoice: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button onClick={handleDownload} aria-label="Download Invoice">
            <i className="fa-solid fa-download text-sm"></i>
        </button>
    );
}