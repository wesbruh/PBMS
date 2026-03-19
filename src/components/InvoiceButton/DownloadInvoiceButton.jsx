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
            a.download = `YRPInvoice.pdf`;
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

    const handlePreview = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/invoice/${invoiceId}/pdf`,
        {
          method: "GET",
          credentials: "include",
        }
      );

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
      <button onClick={handlePreview} aria-label="Preview Invoice">
        <i className="fa-solid fa-eye text-base  text-[#7A4A3A] hover:opacity-70"></i>
      </button>
        <button onClick={handleDownload} aria-label="Download Invoice">
            <i className="fa-solid fa-download text-base -translate-y-0.5 text-[#7A4A3A] hover:opacity-70"></i>
        </button>
        </div>
    );
}