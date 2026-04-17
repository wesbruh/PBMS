import { useState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";

import { triggerAdminToast } from "../../../components/AdminNotificationToast.jsx";
import { useAuth } from "../../../context/AuthContext";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import SubtractBalanceModal from "./SubtractBalanceModal.jsx";
import PaymentDetailsModal from "../../components/shared/PaymentDetailsModal.jsx";

function AdminPayments() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [doPageRefresh, setDoPageRefresh] = useState(false);
  const [error, setError] = useState("");

  const { session } = useAuth();

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!session) return;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/invoice/getInvoiceTableData`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setInvoices(data);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [session]);

  useEffect(() => {
    if (doPageRefresh && session) {
      const refreshData = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/invoice/getInvoiceTableData`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
                "Content-Type": "application/json",
              },
            },
          );
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
  }, [doPageRefresh, session]);

  const downloadInvoicePdf = async (invoice_id) => {
    try {
      const pdfResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/invoice/${invoice_id}/pdf`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        },
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/invoice/getInvoiceByID?term=${invoice_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.message || "Failed to fetch invoice details");

      setSelectedInvoice(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Updating balance failed:", error);
    }
  };

  const handleBalanceReduction = async (
    reductionAmount,
    paymentMethod = null,
  ) => {
    if (!selectedInvoice) {
      console.error("No invoice selected");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/invoice/${selectedInvoice.id}/reduceRemainingInvoiceBalance`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: reductionAmount,
            payment_method: paymentMethod,
          }),
        },
      );
      
      if (response.ok) {
        alert("Balance updated successfully");
        setDoPageRefresh(true);
      } else {
        const errorData = await response.json();
        console.error("Update failed:", errorData);
      }
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  const tabs = new Set(["Unpaid", "Paid", "Overdue", "Cancelled"]);
  const tabFilter = {
    dataType: "invoices",
    tabs,
    tabFilterFn: (row, selectedTab) => {
      const status = (row.status || "");
      if (selectedTab === "All") return true;
      if (selectedTab === "Overdue") {
        const due_date = row?.due_date;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue =
          status !== "Paid" && status !== "Cancelled" &&
          row?.due_date &&
          new Date(due_date) <= today;

        return isOverdue ?? false;
      }

      return selectedTab === status;
    }
  }

  const tablePaymentColumns = [
    {
      key: 'details',
      label: 'Details',
      render: (_, row) => {
        return (
          <button
            type="button"
            onClick={() => {
              setShowDetailsModal(true);
              setSelectedInvoice(row)
            }}
            className="hover:cursor-pointer hover:bg-gray-200 transition-all text-center px-2 py-1 rounded-md text-sm font-semibold border"
          >
            View
          </button>
        )
      }
    },
    { key: "invoice_number", label: "Invoice #", sortable: true },
    {
      key: "issue_date",
      label: "Issue Date",
      sortable: true,
      render: (value, row) => row.issue_date,
    },
    {
      key: "remaining",
      label: "Remaining",
      sortable: true,
      render: (value, row) => `${row.remaining.toFixed(2)}`,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value, row) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue =
          value !== "Paid" && value !== "Cancelled" &&
          row?.due_date &&
          new Date(row.due_date) <= today;

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
              downloadInvoicePdf(row.id);
            }}
            className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
          >
            Download Invoice
          </button>
        );
      },
    },
    {
      key: "manual_payment",
      label: "Manual Payment",
      render: (_, row) => {
        return row.remaining > 0 && row.status !== "Cancelled" ? (
          <button
            onClick={() => {
              managePayment(row.id);
            }}
            className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
          >
            Manage
          </button>
        ) : (
          <></>
        );
      },
    },
  ];

  return (
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      {/* SideBar */}
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="flex w-full rounded-lg overflow-y-auto">
            <div className="relative flex flex-col bg-[#fcfcfc] p-6 w-full rounded-lg shadow-inner">
              {/*Header*/}

              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  Payments &amp; Invoices
                </h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  View and manage all client payments.
                </p>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex flex-col items-center justify-center grow text-gray-500">
                  <LoaderCircle
                    className="text-brown animate-spin mb-2"
                    size={32}
                  />
                  <p className="text-sm">Loading payments...</p>
                </div>
              ) : error ? (
                <div className="grow flex flex-col text-center items-center justify-center">
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                </div>
              ) : (
                <Table
                  columns={tablePaymentColumns}
                  data={invoices}
                  searchable={false}
                  searchPlaceholder="Search Payments by Client Name..."
                  rowsPerPage={7}
                  tabFilter={tabFilter}
                />
              )}
            </div>
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
      {showDetailsModal && selectedInvoice?.id && (
        <PaymentDetailsModal
          invoiceId={selectedInvoice?.id}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

export default AdminPayments;
