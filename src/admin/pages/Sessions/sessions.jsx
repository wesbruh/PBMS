import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import Stripe from "stripe";

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getPaymentIntent = async (checkoutSessionId) => {
    if (!checkoutSessionId) return { status: null, paymentIntent: null }
    const response = await fetch(`http://localhost:5001/api/checkout/${checkoutSessionId}`);
    const { payment_intent: paymentIntent } = await response.json();
    return { status: response.ok, paymentIntent };
  }

  const capturePaymentIntent = async (sessionId, checkoutSessionId) => {
    try {
      const { status, paymentIntent } = await getPaymentIntent(checkoutSessionId);
      if (status) {
        const response = await fetch(`http://localhost:5001/api/intent/capture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, payment_intent: paymentIntent })
        });

        if (response.ok)
          await handleUpdate(sessionId, 'status', 'Confirmed');
        // console.error("Status: ", status); // DEBUGGING
      }
    } catch (error) {
      console.error("Error capturing payment intent:", error);
    }
  }

  const generateInvoice = async(session_id) => {

    try{
      const response = await fetch(`http://localhost:5001/api/invoice/generate/${session_id}`,
      { method: "POST" }
    );
        if(!response.ok){
          throw new Error("Failed to generate invoice");
        }

        const invoice = await response.json();
        const pdfResponse = await fetch(
      `http://localhost:5001/api/invoice/${invoice.id}/pdf`
    );

        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `PBMSInvoice.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();

      } catch(error){
        console.error("Error generating invoice:", error);
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
      case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
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
      render: (val) => (
        <p className={`px-2 py-1 rounded-md text-sm font-semibold border text-center ${getStatusStyle(val)}`}>
          {val}
        </p>
      )
    },
    {
      key: 'deposit_cs_id',
      label: 'Action',
      render: (value, row) => (
        (row.status === "Pending" && value) ?
          <button
            type={"button"}
            onClick={() => { capturePaymentIntent(row.id, value) }}
            className={`hover:cursor-pointer text-center px-2 py-1 rounded-md text-sm font-semibold border`}
          >
            Confirm
          </button> :
         (row.status === "Confirmed") ? (
        <button
          type="button"
          onClick={() => generateInvoice(row.id)}
        //className="hover:cursor-pointer text-center px-2 py-1 rounded-md text-sm font-semibold border bg-gray-100 text-gray-800 border-gray-200"
        className="hover:cursor-pointer px-3 py-1 rounded-md text-sm font-semibold bg-gray-100 text-blue-800 hover:bg-gray-200 transition"
        >
          Generate Invoice
        </button>
        ) : <div></div>
    }
  ];

  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="w-1/5 min-w-50 overflow-y-scroll">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="flex w-full shadow-inner rounded-lg overflow-y-scroll">
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
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Sessions;