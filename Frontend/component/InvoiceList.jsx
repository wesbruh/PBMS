import DownloadInvoiceButton from "../components/DownloadInvoiceButton";

export default function InvoiceItem({ invoice }) {
    return (
        <div>
            <h3>Invoice #{invoice.id}</h3>
            <p>Total: ${invoice.total}</p>

            <DownloadInvoiceButton invoiceId={invoice.id} />
        </div>
    );
}
