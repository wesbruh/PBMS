import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import { supabase } from "../../../lib/supabaseClient";
import { useState, useEffect } from "react";


function AdminPayments() {

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  

  useEffect(() => { fetchPayment();}, []);

  const fetchPayment = async () => {
  try {
    setLoading(true);

    const { data, error } = await supabase
  .from("Payment")
  .select(`
    id,
    amount,
    currency,
    status,
    paid_at,
    provider,
    invoice_id,
    Invoice(
      invoice_number,
      Session (
        User (
          first_name,
          last_name
        )
      )
    )
  `)
  .order("created_at", { ascending: false });

    if (error) throw error;

    setInvoices(data || []);
  } catch (error) {
    console.error("Error fetching payments:", error);
  } finally {
    setLoading(false);
  }
};

    const handleGenerateReceipt = (invoiceId) => {
      window.open(`http://localhost:5001/api/receipts/${invoiceId}`, "_blank");
    };

  const today = new Date();

  const filteredInvoices = invoices.filter((invoice) => {
    if(activeTab === "All") return true;

    if(activeTab == "Paid") {
      return invoice.status === "Paid";
    }
    
    if (activeTab === "Pending") {
    return invoice.status === "Pending";
  }

  return true;
});

  const tablePaymentColumns = [
    { key: 'client', label: 'Client', sortable: true, render: (_, row) =>
        `${row.Invoice?.Session?.User?.first_name || ""} ${row.Invoice?.Session?.User?.last_name || ""}`
    },
    { key: 'invoice_number', label: 'Invoice #', render: (_, row) => row.Invoice?.invoice_number || "-", },
    { key: 'paid_at', label: 'Paid Date', render: (value, row) => 
      row.status === "Paid" && value ? new Date(value).toLocaleDateString() : "-" },
    { key: 'amount', label: 'Amount', render: (value, row) => `${row.currency || "USD"} $${value}`,},
    { key: "provider", label: "Provider",},
    { key: "status", label: "Status", render: (value) => value == "Paid" ? (
      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
        Paid
      </span>
    ) : (
      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold bg-yellow-100 text-yellow-800">
        {value}
      </span>
    ),
  },
    
     {/*Generate Receipt Button*/
      key: "actions",
      label: "Action",
      render: (_, row) => {
        if(row.status !== "Paid") return null;

        return(
          <button
            onClick={() => handleGenerateReceipt(row.id)}
          className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
          >
          Generate Receipt
          </button>
        );
      }
    }

  ];

  return (

    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">

      {/*SideBar*/}

      <div className="flex w-1/5 min-w-50">
        <Sidebar />
      </div>

      {/* Main Content*/}

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className='relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner overflow-y-scroll'>

            {/*Header*/}

            <div className='mb-6'>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                Payments
              </h1>
              <p className='text-gray-600'>
                View and manage all client payments.
              </p>
            </div>

            {/*Table*/}

          {loading ? (
            <div className="py-10 text-center text-gray-500">
              Loading invoices...
            </div>
          ) : (

          <Table
            columns={tablePaymentColumns}
            data={filteredInvoices}
            searchable={true}
            searchPlaceholder='Search Payments by Client Name...'
            rowsPerPage={5}
         />
          )}
        </div>
      </Frame>
      </div>
    </div>
  );
}

export default AdminPayments;