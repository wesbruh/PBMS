import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import { useAuth } from "../../../context/AuthContext.jsx"

import JSZip from "jszip";  // imported JSZip and file-saver for gallery downloads
import { saveAs } from "file-saver";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import SharedClientDashboard from "../../../components/Dashboard/SharedClientDashboard";

async function handleUpdate(session, sessionId, field, value) {
  if (!session) return;

  const payload = { [field]: value };

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
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

  } catch (error) {
    console.error(error);
  }
};

async function cancelSession(session, sessionId) {
  if (!session || !sessionId) return;

  const getPaymentIntent = async (checkoutSessionId) => {
    if (!checkoutSessionId) return { status: null, paymentIntent: null }
    try {
      const csResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/checkout/${checkoutSessionId}`, {
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/intent/uncapture`, {
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

  // ensure session exists and map session id to invoice id
  const mapResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/invoice/${sessionId}`, {
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

function ContactView() {
  const { id: userId } = useParams();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");

  // call useAuth for Supabase session
  const { session } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [downloadingGalleries, setDownloadingGalleries] = useState({});

  // check if user exists
  useEffect(() => {
    if (!userId || !session) return;

    async function checkUser() {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/${userId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
      });

      if (!response.ok) {
        setUser(false);
        return;
      }

      const userData = await response.json();
      const name = `${userData.first_name} ${userData.last_name}`

      setUser(true);
      setFullName(name);
    }

    checkUser();
  }, [userId, session]);

  // load all data that belongs to THIS user only
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      // 1) sessions for this user
      const { data: sessionRows, error: sesErr } = await supabase
        .from("Session")
        .select(
          "id, session_type_id, start_at, end_at, location_text, status, created_at"
        )
        .eq("client_id", userId)
        .order("start_at", { ascending: false });

      if (sesErr) {
        console.error(sesErr);
        setSessions([]);
      } else {
        setSessions(sessionRows ?? []);
      }

      const now = new Date();

      // filter and update sessions that should be completed/cancelled based on current time
      sessionRows.forEach((session) => {
        if (session.status === "Confirmed" && new Date(session.end_at) < now) {
          handleUpdate(session, session.id, "status", "Completed");
          session.status = "Completed";
        } else if (session.status === "Pending" && new Date(session.start_at) < now) {
          cancelSession(session, session.id);
          session.status = "Cancelled";
        }
      });

      const sessionIds =
        sessionRows?.map((s) => s.id).filter(Boolean) ?? [];

      // 2) invoices for those sessions
      let invoiceRows = [];
      if (sessionIds.length > 0) {
        const { data, error } = await supabase
          .from("Invoice")
          .select(
            "id, session_id, invoice_number, issue_date, due_date, remaining, status, Payment(id)"
          )
          .in("session_id", sessionIds)
          .order("issue_date", { ascending: false });
        if (!error) {
          invoiceRows = data ?? [];
        } else {
          console.error(error);
        }
      }
      setInvoices(invoiceRows);

      // 3) galleries for those sessions
      let galleryRows = [];
      if (sessionIds.length > 0) {
        const { data, error } = await supabase
          .from("Gallery")
          .select(
            "id, session_id, title, is_password_protected, published_at, expires_at"
          )
          .in("session_id", sessionIds)
          .order("published_at", { ascending: false });
        if (!error) {
          galleryRows = data ?? [];
        } else {
          console.error(error);
        }
      }
      setGalleries(galleryRows);

      // 4) contracts for those sessions
      let contractRows = [];
      if (sessionIds.length > 0) {
        const { data, error } = await supabase
          .from("Contract")
          .select(
            "id, session_id, status, created_at, updated_at, signed_pdf_url, ContractTemplate(name, body)"
          )
          .in("session_id", sessionIds)
          .order("signed_at", { ascending: false });
        if (!error) {
          contractRows = data ?? [];
        } else {
          console.error(error);
        }
      }
      setContracts(contractRows);

      // 5) notifications / reminders for this user (most recent first)
      const { data: notificationRows, error: notifErr } = await supabase
        .from("Notification")
        .select("id, subject, body, status, sent_at, created_at, session_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifErr) {
        console.error("Notification fetch error:", notifErr);
        setNotifications([]);
      } else {
        setNotifications(notificationRows ?? []);
      }

      setLoading(false);
    }

    loadData();
  }, [userId, user]);

  if (loading) {
    return (
      <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>
        <div className="flex w-full shadow-inner rounded-lg overflow-hidden">
          <Frame>
            <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
              <SharedClientDashboard loading={true} />
            </div>
          </Frame>
        </div>
      </div>
    );
  }


  return (
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="flex w-full rounded-lg overflow-scroll">
            <div className="w-full flex flex-col gap-5 ">
              <SharedClientDashboard
              fullName={fullName}
              notifications={notifications}
              sessions={sessions}
              invoices={invoices}
              galleries={galleries}
              contracts={contracts}
              loading={loading}
              showPayButton={false}
              showDownloadButton={false}
              isAdminView={true}
            />
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default ContactView;