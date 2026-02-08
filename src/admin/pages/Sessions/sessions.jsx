import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";
import { mockSessions } from "../../../mockData/mockData.js";

function Sessions() {
  const tableSessionColumns = [
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'type', label: 'Session Type', sortable: false },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'time', label: 'Time', sortable: false },
    { key: 'location', label: 'Location', sortable: false },
    { 
      key: 'status', 
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span 
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            value === 'Upcoming' 
              ? 'bg-blue-100 text-blue-800' 
              : value === 'Completed'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      <div className="flex w-full shadow-inner rounded-lg">
        <Frame>
          <div className="relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner">
            <div className="mb-6 ">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sessions</h1>
              <p className="text-gray-600">
                View and manage all photography sessions.
              </p>
            </div>
            
            <div>
              <Table 
                columns={tableSessionColumns} 
                data={mockSessions}
                searchable={true}
                searchPlaceholder={"Search Sessions by Client Name..."}
                rowsPerPage={5}
              />
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Sessions;