export default function DownloadReceiptButton({ invoiceId }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/receipt/invoice/${invoiceId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

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

  return (
    <button
      onClick={handleDownload}
      className="text-[#7A4A3A] hover:opacity-70 flex items-center"
      aria-label="Download Receipt"
    >
      <i className="fa-solid fa-file-invoice text-sm"></i>
    </button>
  );
}