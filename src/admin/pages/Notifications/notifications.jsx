import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import Table from "../../components/shared/Table/Table.jsx";
import { supabase } from "../../../lib/supabaseClient";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("Notification")
        .select(
          `
          id,
          user_id,
          session_id,
          template_id,
          channel,
          subject,
          body,
          status,
          sent_at,
          created_at,
          User:user_id (
            first_name,
            last_name,
            email
          )
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const mapped = (data || []).map((n) => {
        const userFirst = n?.User?.first_name ?? "";
        const userLast = n?.User?.last_name ?? "";
        const recipientName = `${userFirst} ${userLast}`.trim() || "Unknown User";
        const recipientEmail = n?.User?.email || "—";

        const subject = n.subject || "—";
        const messagePreview = n.body
          ? n.body.substring(0, 60) + (n.body.length > 60 ? "..." : "")
          : "No message content";

        const dateSource = n.created_at || n.sent_at;
        const createdDate = dateSource ? new Date(dateSource) : null;
        const dateStr = createdDate ? createdDate.toLocaleDateString() : "—";
        const timeStr = createdDate
          ? createdDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : "—";

        const channel = n.channel || "—";
        const rawStatus = n.status || "Unknown";
        const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

        return {
          id: n.id,
          recipientName,
          recipientEmail,
          subject,
          message: messagePreview,
          channel: channel.charAt(0).toUpperCase() + channel.slice(1),
          date: dateStr,
          time: timeStr,
          status,
          created_at: n.created_at,
        };
      });

      setNotifications(mapped);
    } catch (err) {
      console.error("fetchNotifications error:", err);
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const tableNotificationColumns = [
    { key: "recipientName", label: "Recipient", sortable: true },
    { key: "subject", label: "Subject", sortable: true },
    { key: "message", label: "Message", sortable: false },
    { key: "channel", label: "Channel", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "time", label: "Time", sortable: false },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            value === "Complete"
              ? "bg-green-100 text-green-800"
              : value === "Pending"
              ? "bg-yellow-100 text-yellow-800"
              : value === "Active"
              ? "bg-blue-100 text-blue-800"
              : value === "Failed"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value}
        </span>
      ),
    },
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                View and manage all system notifications sent to clients.
              </p>
            </div>

            {/* Loading state */}
            {loading && <p className="text-sm text-gray-500 mb-2">Loading notifications…</p>}

            {/* Error state */}
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

            {/* Empty state */}
            {!loading && !error && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-gray-300 text-6xl mb-4">🔔</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No Notifications Yet</h3>
                <p className="text-sm text-gray-500">
                  There are no notifications in the system at the moment. They will appear here once sent.
                </p>
              </div>
            )}

            {/* Table */}
            {!loading && !error && notifications.length > 0 && (
              <div>
                <Table
                  columns={tableNotificationColumns}
                  data={notifications}
                  searchable={true}
                  searchPlaceholder={"Search notifications by recipient or message..."}
                  rowsPerPage={5}
                />
              </div>
            )}
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default Notifications;
