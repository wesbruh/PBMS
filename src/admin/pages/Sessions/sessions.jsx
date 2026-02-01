import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";
import { mockSessions } from "../../../mockData/mockData.js";


function Sessions() {

  // Table data to get from mockSessions[] in mockData.js file. Later implementation will pull real data from backend
  // This data fills the table to your own specifications for what needs to be shown to the admin for Sessions
  // const tableSessionColumns = [
  //   { key: 'clientName', label: 'Client', sortable: true },   // Client Names are sortable
  //   { key: 'type', label: 'Session Type', sortable: false },
  //   { key: 'date', label: 'Date', sortable: true },           // Session Dates are sortable
  //   { key: 'time', label: 'Time', sortable: false },
  //   { key: 'location', label: 'Location', sortable: false },
  //   // Session Status is sortable and has custom rendering for different statuses
  //   { 
  //     key: 'status', 
  //     label: 'Status',
  //     sortable: true,
  //     render: (value) => (
  //       <span 
  //         className={`px-3 py-1 rounded-md text-sm font-medium ${
  //           value === 'Upcoming' 
  //             ? 'bg-blue-100 text-blue-800' 
  //             : value === 'Completed'
  //             ? 'bg-green-100 text-green-800'
  //             : 'bg-gray-100 text-gray-800'
  //         }`}
  //       >
  //         {value}
  //       </span>
  //     )
  //   }
  // ];

  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex w-full shadow-inner rounded-lg">
        <Frame>
        {/* <div className="relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner">
          <div className="mb-6 "> */}
            {/* Page Header */}
            {/* <h1 className="text-3xl font-bold text-gray-900 mb-2">Sessions</h1>
            <p className="text-gray-600">
              View and manage all photography sessions.
            </p>
          </div> */}
          
          {/* Table Container
          <div>
            <Table columns={tableSessionColumns} 
            data={mockSessions}
            // onRowClick={handleRowClick}     This is commented out for now, can be used later to handle row clicks to display information about specific session or contact (LUIS)
            searchable={true}
            searchPlaceholder={"Search Sessions by Client Name..."}
            rowsPerPage={5}
            />
          </div> */}
        {/* </div> */}
        </Frame>
      </div>
    </div>
  );
}

export default Sessions;