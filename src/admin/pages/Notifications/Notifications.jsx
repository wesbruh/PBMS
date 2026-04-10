import { useState, useEffect } from "react";
import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";
import Table from "../../components/shared/Table/Table.jsx";
import { supabase } from "../../../lib/supabaseClient";
import { Trash2 } from "lucide-react";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterTab, setFilterTab] = useState("All");

  // Reset unread count when admin visits this page
  useEffect(() => {
    localStorage.setItem("admin_unread_count", "0");
  }, []);

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
    const markAllRead = async () => {
      const { data, error: updateError } = await supabase
        .from("Notification")
        .update({ status: "read" })
        .eq("status", "sent")
        .select("id");

      if (updateError) {
        console.error("markAllRead error:", updateError);
      } else {
        console.log(`markAllRead: updated ${data?.length ?? 0} notification(s) to "read"`);
      }

      // Record the visit timestamp so the toast knows what counts as "new"
      // on the next login. Done after the update so the cutoff is accurate.
      localStorage.setItem("admin_notifs_last_viewed", new Date().toISOString());
    };

    // 2-second delay so the admin can see the "sent" status before it flips
    // to "read". Cleanup cancels the timeout if the page unmounts early.
    const timeoutId = setTimeout(markAllRead, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "All") return true;
    const subject = (n.subject || "").toLowerCase();
    if (filterTab === "Sessions") return subject.includes("gallery");
    if (filterTab === "Payment & Invoice") return subject.includes("invoice") || subject.includes("payment");
    return true;
  });

  const handleDelete = async (id) => {
    const { error: deleteError } = await supabase
      .from("Notification")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Failed to delete notification:", deleteError);
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
    setConfirmDeleteId(null);
  };

  const emptyMessages = {
    "All": "No notifications yet.",
    "Sessions": "No session notifications found.",
    "Payment & Invoice": "No payment & invoice notifications found.",
  };

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
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(row.id); }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete notification"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <>
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Notification</h3>
            <p className="text-sm text-gray-600 mb-5">Are you sure you want to delete this notification?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50 transition"
              >
                No
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex min-w-50 overflow-y-auto">
          <Sidebar />
        </div>

        <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
          <Frame>
            <div className="relative flex flex-col bg-[#fcfcfc] p-4 w-full rounded-lg shadow-inner overflow-scroll">
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

              {/* Filter Tabs */}
              {!loading && !error && (
                <div className="flex justify-center gap-2 mb-4">
                  {["All", "Sessions", "Payment & Invoice"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                        filterTab === tab
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              {/* Table — always show when not loading/error */}
              {!loading && !error && (
                <div>
                  <Table
                    columns={tableNotificationColumns}
                    data={filteredNotifications}
                    searchable={true}
                    searchPlaceholder={"Search notifications by recipient or message..."}
                    rowsPerPage={5}
                    emptyMessage={emptyMessages[filterTab]}
                  />
                </div>
              )}
            </div>
          </Frame>
        </div>
      </div>
    </>
  );
}

export default Notifications;