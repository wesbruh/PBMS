import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient.js"

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";

// constants for invoice generation logic
const DEPOSIT_PERCENTAGE = 0.05;

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

  const getLocalFormattedDate = (date) => {
    const dateObj = new Date(date);
    return dateObj.getFullYear() + "-" +
      (dateObj.getMonth() + 1).toString().padStart(2, '0') + "-" +
      (dateObj.getDate().toString().padStart(2, '0')) + "T" +
      (dateObj.getHours().toString().padStart(2, '0')) + ":" +
      (dateObj.getMinutes().toString().padStart(2, '0'));
  }

  const getPaymentIntent = async (checkoutSessionId) => {
    if (!checkoutSessionId) return { status: null, paymentIntent: null }
    const response = await fetch(`http://localhost:5001/api/checkout/${checkoutSessionId}`);
    const { payment_intent: paymentIntent } = await response.json();
    return { status: response.ok, paymentIntent };
  }

  const capturePaymentIntent = async (checkoutSessionId) => {
    try {
      const { status, paymentIntent } = await getPaymentIntent(checkoutSessionId);

      if (!status) throw new Error("Failed to retrieve payment intent");

      const response = await fetch(`http://localhost:5001/api/intent/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent: paymentIntent })
      });

      if (!response.ok) throw Error("Failed to capture payment intent");
    } catch (error) {
      console.error(error);
    }
  }

  const generateInvoice = async (session_id) => {
    try {
      const { data: sessionData, error } = await supabase
        .from("Session")
        .select("start_at, SessionType(base_price)")
        .eq("id", session_id)
        .single();

      if (error) throw new Error("Session not found");

      // calculate remaining balance after deposit for invoice generation
      const remaining = (sessionData.SessionType.base_price) * (1 - DEPOSIT_PERCENTAGE);

      // due on day of session date, can be changed to any other logic as needed
      const date = new Date(sessionData.start_at);
      const dueDate = `${date.getFullYear()}` + "-" +
        `${(date.getMonth() + 1).toString().padStart(2, '0')}` + "-" +
        `${date.getDate().toString().padStart(2, '0')}`;

      const response = await fetch(`http://localhost:5001/api/invoice/generate/${session_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remaining: remaining, // send remaining balance with tax for invoice generation
          due_date: dueDate
        })
      });

      if (!response.ok)
        throw new Error("Failed to generate invoice");
    } catch (error) {
      console.error("Error generating invoice:", error);
    }
  };

  const downloadInvoicePdf = async (session_id) => {
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("Invoice")
        .select()
        .eq("session_id", session_id)
        .single();

      if (invoiceError) throw new Error("Invoice not found.")

      const pdfResponse = await fetch(
        `http://localhost:5001/api/invoice/${invoiceData.id}/pdf`
      );

      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `PBMSInvoice.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Failed", error);
    }
  };

  const confirmSession = (sessionId, checkoutSessionId) => {
    capturePaymentIntent(checkoutSessionId);
    generateInvoice(sessionId);
    handleUpdate(sessionId, "status", "Confirmed");
  };

  const handleUpdate = async (sessionId, field, value) => {
    let payload = {}

    // FIX: Convert time strings to proper ISO format for Supabase
    if (field === 'start_at') {
      const session = sessions.reduce((acc, s) => {
        if (s.id === sessionId)
          return s
        else
          return acc
      }, null);

      const newStart = new Date(value).toISOString();
      const timeOffset = new Date(newStart) - new Date(session.start_at);
      const newEnd = new Date(new Date(session.end_at).getTime() + timeOffset).toISOString();

      payload = { 'start_at': newStart, 'end_at': newEnd };
    } else {
      payload = { [field]: value };
    }

    try {
      const response = await fetch(`http://localhost:5001/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData.error;
      }

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, ...payload } : s))
      );
    } catch (error) {
      alert("Failed to update session");
      console.error("Failed to update session:", error);
    }
  };

  // Helper for Status Styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Pending': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const tableSessionColumns = [
    {
      key: 'client_name',
      label: 'Client',
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
          defaultValue={val ?? ""}
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
          value={val ? getLocalFormattedDate(val) : ""}
          onChange={(e) => handleUpdate(row.id, 'start_at', e.target.value)}
        />
      )
    },
    {
      key: 'end_at',
      label: 'End Time',
      render: (val) => (
        <input
          type="datetime-local"
          className="border rounded px-1 text-sm"
          value={val ? getLocalFormattedDate(val) : ""}
          readOnly={true}
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
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        (row.status === "Pending" && row.deposit_cs_id) ?
          <button
            type={"button"}
            onClick={() => { confirmSession(row.id, row.deposit_cs_id) }}
            className={`hover:cursor-pointer text-center px-2 py-1 rounded-md text-sm font-semibold border`}
          >
            Confirm
          </button> :
          (row.status === "Confirmed") ?
            <button
              type={"button"}
              onClick={() => { downloadInvoicePdf(row.id) }}
              className={`hover:cursor-pointer text-center px-2 py-1 rounded-md text-sm font-semibold border`}
            >
              Download
            </button> :
            <div></div>
      )
    }
  ];

  return (
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex w-1/5 min-w-50 overflow-y-auto">
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

              <div className="grow">
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
