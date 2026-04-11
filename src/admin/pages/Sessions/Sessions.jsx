import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient.js"
import { useAuth } from "../../../context/AuthContext.jsx"

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import Table from "../../components/shared/Table/Table.jsx";
import SessionDetailsModal from "../../components/shared/SessionDetailsModal";
import { X, LoaderCircle } from "lucide-react";

// constants for invoice generation logic
const DEPOSIT_PERCENTAGE = 0.05;

function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // call useAuth for Supabase session
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    fetchSessions();
  }, [session]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/sessions", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      // added client_name and session_type fields to the session data for easier table rendering and searching
      const flattened = data.map((row) => ({
        ...row,
        client_name: `${row.User?.first_name || ''} ${row.User?.last_name || ''}`.trim(),
        session_type: row.SessionType?.name || 'N/A',
      }));
      setSessions(flattened);
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
    try {
      const csResponse = await fetch(`http://localhost:5001/api/checkout/${checkoutSessionId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        }
      });

      if (!csResponse.ok)
        throw new Error("Could not get payment intent");

      const csData = await csResponse.json();

      return { status: csResponse.ok, paymentIntent: csData.payment_intent };
    } catch (error) {
      console.error(error);
    }
  }

  const capturePayment = async (checkoutSessionId) => {
    try {
      const { status, paymentIntent } = await getPaymentIntent(checkoutSessionId);

      if (!status) throw new Error("Failed to retrieve payment intent");

      const response = await fetch(`http://localhost:5001/api/intent/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payment_intent_id: paymentIntent.id })
      });

      if (!response.ok) throw Error("Failed to capture payment intent");
    } catch (error) {
      console.error(error);
    }
  }

  const updateInvoice = async (session_id, invoiceId) => {
    try {
      // obtain time/pricing information
      const { data: sessionData, error } = await supabase
        .from("Session")
        .select("start_at, SessionType(base_price)")
        .eq("id", session_id)
        .single();

      if (error) throw error;

      // calculate remaining balance after deposit for invoice generation
      const remaining = (sessionData.SessionType.base_price) * (1 - DEPOSIT_PERCENTAGE);

      // due on day of session date, can be changed to any other logic as needed
      const date = new Date(sessionData.start_at);
      const dueDate = `${date.getFullYear()}` + "-" +
        `${(date.getMonth() + 1).toString().padStart(2, '0')}` + "-" +
        `${date.getDate().toString().padStart(2, '0')}`;

      const response = await fetch(`http://localhost:5001/api/invoice/confirm/${invoiceId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
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

      const pdfResponse = await fetch(`http://localhost:5001/api/invoice/${invoiceData.id}/pdf`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
      });

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

  const confirmSession = async (sessionId) => {
    // ensure session exists and map session id to invoice id
    const mapResponse = await fetch(`http://localhost:5001/api/invoice/${sessionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json"
      }
    });

    if (!mapResponse.ok) throw new Error("Could not map session id to an invoice id");

    const mapData = await mapResponse.json();
    const { id: invoiceId } = mapData;

    const { data, error } = await supabase.from("Payment")
      .select("provider_payment_id")
      .eq("invoice_id", invoiceId)
      .eq("type", "Deposit")
      .single()

    if (error) throw error;

    const { provider_payment_id: checkoutSessionId } = data;

    capturePayment(checkoutSessionId);
    updateInvoice(sessionId, invoiceId);
    handleUpdate(sessionId, "status", "Confirmed");
  };

  const uncapturePayment = async (checkoutSessionId) => {
    try {
      const { error } = await supabase
        .from("Payment")
        .update({ status: "Cancelled" })
        .eq("provider_payment_id", checkoutSessionId)
        .select()
        .single();

      if (error) throw error;

      const { status, paymentIntent } = await getPaymentIntent(checkoutSessionId);

      if (!status) throw new Error("Failed to retrieve payment intent");

      const response = await fetch(`http://localhost:5001/api/intent/uncapture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ payment_intent_id: paymentIntent.id })
      });

      if (!response.ok) throw Error("Failed to capture payment intent");
    } catch (error) {
      console.error(error);
    }
  };

  const cancelInvoice = async (invoiceId) => {
    try {
      const { error } = await supabase
        .from("Invoice")
        .update({ status: "Cancelled" })
        .eq("id", invoiceId)
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error(error);
    }
  };

  const cancelSession = async (sessionId) => {
    // ensure session exists and map session id to invoice id
    const mapResponse = await fetch(`http://localhost:5001/api/invoice/${sessionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${session?.access_token}`,
        "Content-Type": "application/json"
      }
    });

    if (!mapResponse.ok) throw new Error("Could not map session id to an invoice id");

    const mapData = await mapResponse.json();
    const { id: invoiceId } = mapData;

    const { data, error } = await supabase.from("Payment")
      .select("provider_payment_id")
      .eq("invoice_id", invoiceId)
      .eq("type", "Deposit")
      .single()

    if (error) throw error;

    const { provider_payment_id: checkoutSessionId } = data;

    uncapturePayment(checkoutSessionId);
    cancelInvoice(invoiceId);
    handleUpdate(sessionId, "status", "Cancelled");
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
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
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
      key: 'details',
      label: 'Details',
      render: (_, row) => {
        return (
          <button
            type="button"
            onClick={() => setSelectedSessionId(row.id)}
            className="hover:cursor-pointer hover:bg-gray-200 transition-all text-center px-2 py-1 rounded-md text-sm font-semibold border"
          >
            View
          </button>
        )
      }
    },
    {
      key: 'client_name',
      label: 'Client',
      sortable: true,
      render: (_, row) => `${row.User?.first_name || ''} ${row.User?.last_name || ''}`
    },
    {
      key: 'session_type',
      label: 'Type',
      sortable: true,
      render: (_, row) => row.SessionType?.name || 'N/A'
    },
    {
      key: 'location_text',
      label: 'Location',
      sortable: false,
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
      sortable: true,
      render: (val, row) => (
        <input
          type="datetime-local"
          className="border rounded px-2 py-1 w-full text-sm"
          value={val ? getLocalFormattedDate(val) : ""}
          onChange={(e) => handleUpdate(row.id, 'start_at', e.target.value)}
        />
      )
    },
    {
      key: 'end_at',
      label: 'End Time',
      sortable: false,
      render: (val) => (
        <input
          type="datetime-local"
          className="border rounded px-2 py-1 w-full text-sm"
          value={val ? getLocalFormattedDate(val) : ""}
          readOnly={true}
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <p className={`px-2 py-1 rounded text-sm font-semibold border text-center ${getStatusStyle(val)}`}>
          {val}
        </p>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (value, row) => (
        (row.status === "Pending" ? (
          <div className="min-w-60 grid grid-cols-2 gap-5">
            <button
              type={"button"}
              onClick={() => { confirmSession(row.id, row.deposit_cs_id) }}
              className={`w-full min-w-30 hover:cursor-pointer hover:bg-gray-200 transition-all text-center px-2 py-1 rounded text-sm font-semibold border`}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => cancelSession(row.id, row.deposit_cs_id)}
              className="w-full min-w-30 hover:cursor-pointer px-2 py-1 rounded-md text-sm font-semibold border border-red-400 text-red-600 hover:bg-red-500 hover:text-white transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        ) : row.status === "Confirmed" ? (
          <div className="min-w-60 grid grid-cols-2 gap-5">
            <button
              type="button"
              onClick={() => { downloadInvoicePdf(row.id) }}
              className="w-full min-w-30 hover:cursor-pointer hover:bg-gray-200 transition-all text-center px-2 py-1 rounded text-sm font-semibold border"
            >
              Download
            </button>
            <button
              type="button"
              onClick={() => cancelSession(row.id, row.deposit_cs_id)}
              className="w-full min-w-30 hover:cursor-pointer text-center px-2 py-1 rounded-md text-sm font-semibold border border-red-400 text-red-600 hover:bg-red-500 hover:text-white transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        ) :
          (<div></div>)
        )
      )
    }
  ];

  return (
    <>
      <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
        <div className="flex min-w-50 overflow-y-auto">
          <Sidebar />
        </div>

        <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
          <Frame>
            <div className="flex w-full rounded-lg overflow-y-scroll">
              <div className="flex flex-col bg-[#fcfcfc] p-6 w-full h-full shadow-inner">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Photography Sessions</h1>
                  <p className="text-gray-500">Manage client booking requests, view session details, and/or update session information.</p>
                </div>

                <div className="grow flex flex-col">
                  {loading ? (
                    <div className="grow flex flex-col justify-center items-center text-gray-500">
                      <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
                      <p className="text-md">Loading Sessions...</p>
                    </div>
                  ) : (
                    <Table
                      columns={tableSessionColumns}
                      data={sessions}
                      searchable={true}
                      searchPlaceholder={"Search Sessions by keyword..."}
                      rowsPerPage={6}
                    />
                  )}
                </div>
              </div>
            </div>
          </Frame>
        </div>
      </div>
      {selectedSessionId && (
        <SessionDetailsModal
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </>
  );
}

export default Sessions;
