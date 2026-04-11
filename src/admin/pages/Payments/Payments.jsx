import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import SubtractBalanceModal from "./SubtractBalanceModal.jsx";
import { useState, useEffect } from "react";

function AdminPayments() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [doPageRefresh, setDoPageRefresh] = useState(false);


  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/invoice/getInvoiceTableData');
        console.log("Response status:", res.status);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Fetched invoice data:", data);
        setInvoices(data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoices();
  }, []); 

  
  useEffect(() => {
    if (doPageRefresh) {
      const refreshData = async () => {
        setLoading(true);
        try {
          const res = await fetch('http://localhost:5001/api/invoice/getInvoiceTableData');
          const data = await res.json();
          setInvoices(data);
        } catch (err) {
          console.error("Refresh error:", err);
        } finally {
          setLoading(false);
          setDoPageRefresh(false);
        }
      };
      refreshData();
    }
  }, [doPageRefresh]);

  const downloadInvoicePdf = async (invoice_id) => {
    try {
      const pdfResponse = await fetch(
        `http://localhost:5001/api/invoice/${invoice_id}/pdf`
      );

      if (!pdfResponse.ok) throw new Error("Failed to generate PDF");

      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `PBMSInvoice.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url); // Clean up
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const managePayment = async (invoice_id) => {
    try {
      const res = await fetch(`http://localhost:5001/api/invoice/getInvoiceByID?term=${invoice_id}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch invoice details");

      setSelectedInvoice(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Updating balance failed:", error);
    }
  };

  const handleBalanceReduction = async (reductionAmount, paymentMethod = null) => {
    if (!selectedInvoice) {
      console.error("No invoice selected");
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:5001/api/invoice/${selectedInvoice.id}/reduceRemainingInvoiceBalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: reductionAmount, payment_method: paymentMethod }),
      });

      if (response.ok) {
        console.log("Balance updated successfully");
        // Trigger refresh to show updated data
        setDoPageRefresh(true);
      } else {
        const errorData = await response.json();
        console.error("Update failed:", errorData);
      }
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const today = new Date();

  const filteredInvoices = invoices.filter((invoice) => {
    if (activeTab === "All") return true;

    if (activeTab === "Paid") {
      return invoice.status === "Paid";
    }

    if (activeTab === "Pending") {
      return invoice.status === "Pending";
    }

    if (activeTab === "Overdue") {
      return (
        invoice.status !== "Paid" &&
        invoice.due_date &&
        new Date(invoice.due_date) < today
      );
    }

    return true;
  });

  const tablePaymentColumns = [
    { key: 'invoice_number', label: 'Invoice #', sortable: true },
    { key: 'issue_date', label: 'Issue Date', sortable: true, render: (value, row) => row.issue_date },
    { key: 'remaining', label: 'Remaining', sortable: true, render: (value, row) => row.remaining },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value, row) => {
        const isOverdue =
          value !== "Paid" &&
          row.due_date &&
          new Date(row.due_date) < new Date();

        if (isOverdue) {
          return (
            <span className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800">
              Overdue
            </span>
          );
        }

        if (value === "Paid") {
          return (
            <span className="px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
              Paid
            </span>
          );
        }

        if (value === "Pending") {
          return (
            <span className="px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800">
              Pending
            </span>
          );
        }

        return (
          <span className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
            {value || "—"}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      render: (_, row) => {
        return (
          <button
            onClick={() => { 
              console.log("Here is the id being passed for invoice_id:", row.id);
              downloadInvoicePdf(row.id);
            }}
            className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
          >
            Download Invoice
          </button>
        );
      }
    },
    {
      key: "manual_payment",
      label: "Manual Payment",
      render: (_, row) => {
        return (
          <button
            onClick={() => { 
              console.log("Here is the id being passed for invoice_id:", row.id);
              managePayment(row.id);
            }}
            className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
          >
            Manage
          </button>
        );
      }
    },
  ];

  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      {/* SideBar */}
      <div className="flex w-1/5 min-w-50 overflow-y-auto">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className='relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner overflow-y-scroll'>
            {/* Header */}
            <div className='mb-6'>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                Payments
              </h1>
              <p className='text-gray-600'>
                View and manage all client payments.
              </p>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-10 text-center text-gray-500">
                Loading invoices...
              </div>
            ) : (
              <Table
                columns={tablePaymentColumns}
                data={filteredInvoices}
                searchable={false}
                searchPlaceholder='Search Payments by Client Name...'
                rowsPerPage={5}
              />
            )}
          </div>
        </Frame>
      </div>
      <SubtractBalanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentBalance={selectedInvoice?.remaining || 0}
        onConfirm={handleBalanceReduction}
        onRefresh={() => setDoPageRefresh(true)}
      />
    </div>
  );
}

export default AdminPayments;