import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";



function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [defaultContract, setDefaultContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    loadDefaultContract();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/sessions");
      const data = await response.json();
      setSessions(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setLoading(false);
    }
  };

  const loadDefaultContract = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/contract/template/default");
      const data = await response.json();
      setDefaultContract(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const generateContract = async (session_id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/contract/generate/${session_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ["template_id"]: defaultContract.id})});
      // DEBUGGING const data = await response.json();
    } catch (error) {
      console.error("Error generating contract:", error);
    }
  };

  const handleUpdate = async (sessionId, field, value) => {
    // FIX: Convert time strings to proper ISO format for Supabase
    let finalValue = value;
    if (field === 'start_at' || field === 'end_at') {
      finalValue = new Date(value).toISOString();
    }

    try {
      const response = await fetch(`http://localhost:5001/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: finalValue }),
      });

      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, [field]: finalValue } : s))
        );
      }
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  // Helper for Status Styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Inquiry': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tableSessionColumns = [
    {
      key: 'client_name',
      label: 'Client',
      sortable: true,
      render: (_, row) => `${row.User?.first_name || ''} ${row.User?.last_name || ''}`
    },
    {
      key: 'session_type',
      label: 'Type',
      render: (_, row) => row.SessionType?.name || 'N/A'
    },
    {
      key: 'location_text',
      label: 'Location',
      render: (val, row) => (
        <input
          className="border rounded px-2 py-1 w-full text-sm"
          defaultValue={val}
          onBlur={(e) => handleUpdate(row.id, 'location_text', e.target.value)}
        />
      )
    },
    {
      key: 'start_at',
      label: 'Start Time',
      render: (val, row) => (
        <input
          type="datetime-local"
          className="border rounded px-1 text-sm"
          defaultValue={val ? new Date(val).toISOString().slice(0, 16) : ""}
          onChange={(e) => handleUpdate(row.id, 'start_at', e.target.value)}
        />
      )
    },
    {
      key: 'end_at',
      label: 'End Time',
      render: (val, row) => (
        <input
          type="datetime-local"
          className="border rounded px-1 text-sm"
          defaultValue={val ? new Date(val).toISOString().slice(0, 16) : ""}
          onChange={(e) => handleUpdate(row.id, 'end_at', e.target.value)}
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => (
        <select
          value={value}
          onChange={(e) => handleUpdate(row.id, 'status', e.target.value)}
          className={`px-2 py-1 rounded-md text-sm font-semibold border ${getStatusStyle(value)}`}
        >
          <option value="Inquiry">Inquiry</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (_, row) => (
        (row.status === "Confirmed") ? 
        <button 
          type={"button"} 
          onClick={() => generateContract(row.id)} 
          className={`hover:cursor-pointer text-center px-2 py-1 rounded-md text-sm font-semibold border ${getStatusStyle(row.status)}`}
        >
          Generate Contract 
        </button> :
        <div></div>
      )
    }
  ];

  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg shadow-xl">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      <div className="flex w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="flex flex-col bg-white p-6 w-full h-full">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Admin Sessions</h1>
              <p className="text-gray-500">Live-sync management of client bookings.</p>
            </div>

            <div className="flex-grow">
              {loading ? (
                <div className="animate-pulse flex space-x-4">Loading...</div>
              ) : (
                <Table
                  columns={tableSessionColumns}
                  data={sessions}
                  searchable={true}
                  rowsPerPage={6}
                />
              )}
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Sessions;