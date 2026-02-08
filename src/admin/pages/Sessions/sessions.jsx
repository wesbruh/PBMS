import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch data from backend on mount
  useEffect(() => {
    fetchSessions();
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

  // 2. Handle inline updates to the database
  const handleUpdate = async (sessionId, field, value) => {
    try {
      const response = await fetch(`http://localhost:5001/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        // Optimistically update local state
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, [field]: value } : s))
        );
      }
    } catch (error) {
      console.error("Failed to update session:", error);
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
          className="border rounded px-2 py-1 w-full"
          defaultValue={val}
          onBlur={(e) => handleUpdate(row.id, 'location_text', e.target.value)}
        />
      )
    },
    { 
      key: 'start_at', 
      label: 'Start Time', 
      sortable: true,
      render: (val, row) => (
        <input 
          type="datetime-local"
          className="border rounded px-1"
          defaultValue={val ? new Date(val).toISOString().slice(0, 16) : ""}
          onChange={(e) => handleUpdate(row.id, 'start_at', e.target.value)}
        />
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      sortable: true,
      render: (value, row) => (
        <select 
          value={value}
          onChange={(e) => handleUpdate(row.id, 'status', e.target.value)}
          className={`px-2 py-1 rounded-md text-sm font-medium border ${
            value === 'Confirmed' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
          }`}
        >
          <option value="Inquiry">Inquiry</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
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
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Session Manager</h1>
              <p className="text-gray-600">Update session times, locations, and statuses in real-time.</p>
            </div>
            
            {loading ? (
              <p>Loading sessions...</p>
            ) : (
              <Table 
                columns={tableSessionColumns} 
                data={sessions}
                searchable={true}
                searchPlaceholder={"Search by Client Name..."}
                rowsPerPage={8}
              />
            )}
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Sessions;