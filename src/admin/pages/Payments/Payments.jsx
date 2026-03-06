import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import { supabase } from "../../../lib/supabaseClient";
import { useState, useEffect } from "react";


function AdminPayments() {

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  

  useEffect(() => { fetchInvoices();}, []);

  const fetchInvoices = async () => {
  try {
    setLoading(true);

    const { data, error } = await supabase
  .from("Invoice")
  .select(`
    id,
    invoice_number,
    issue_date,
    due_date,
    subtotal,
    tax,
    total,
    status,
    created_at,
    Session (
      id,
      client_id,
      User (
        first_name,
        last_name
      )
    )
  `)
  .order("created_at", { ascending: false });

    if (error) throw error;

    setInvoices(data || []);
  } catch (error) {
    console.error("Error fetching invoices:", error);
  } finally {
    setLoading(false);
  }
};

    const handleGenerateInvoice = async (sessionId) => {
      console.log("Generate invoice for session:", sessionId);
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
    { key: 'client', label: 'Client', sortable: true, render: (_, row) =>
        `${row.Session?.User?.first_name || ""} ${row.Session?.User?.last_name || ""}`
    },
    { key: 'invoice_number', label: 'Invoice #', sortable: true },
    { key: 'issue_date', label: 'Issue Date', sortable: true, render: (value) => new Date(value).toLocaleDateString() },
    { key: 'total', label: 'Total', sortable: true, render: (value) => `$${value}`},
    
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

    
     {/*Generate Invoice Button*/
      key: "actions",
      label: "Action",
      render: (_, row) => {
        if(row.status != "Paid") return null;

        return(
          <button
            onClick={() => handleGenerateInvoice(row.id)}
          className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
          >
          Generate Invoice
          </button>
        );
      }
    }

  ];

  return (

    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">

      {/*SideBar*/}
      <div className="w-1/5 min-w-50 overflow-y-scroll">
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
            rowsPerPage={8}
         />
          )}
        </div>
      </Frame>
      </div>
    </div>
  );
}

export default AdminPayments;