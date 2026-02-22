import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import { mockPayments } from "../../../mockData/mockData.js";


function AdminPayments() {

  const tablePaymentColumns = [
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true },

    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-md text-sm font-medium ${value === 'Paid'
              ? 'bg-green-100 text-green-800'
              : value === 'Pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}
        >
          {value}
        </span>
      ),
    },
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

            <Table
              columns={tablePaymentColumns}
              data={mockPayments}
              searchable={true}
              searchPlaceholder='Search Payments by Client Name...'
              rowsPerPage={5}
            />
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default AdminPayments;