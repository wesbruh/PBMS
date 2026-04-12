import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, Bell } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function AdminNotificationToast() {
  const { roleId } = useAuth();
  const location = useLocation();
  const [adminRoleId, setAdminRoleId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const timerRef = useRef(null);

  // Use refs so real-time callbacks always read the latest values without
  // stale closures — refs are readable inside Supabase callbacks.
  const onNotificationsPageRef = useRef(false);
  const isOnAdminPageRef = useRef(false);
  const isAdminRef = useRef(false);

  // Prevent the login-check toast from firing more than once per session
  const hasShownLoginToastRef = useRef(false);

  // Keep refs in sync with current route
  useEffect(() => {
    const onNotifs = location.pathname === "/admin/notifications";
    const onAdmin = location.pathname.startsWith("/admin");

    onNotificationsPageRef.current = onNotifs;
    isOnAdminPageRef.current = onAdmin;

    // Dismiss toast if admin navigates to non-admin page
    if (!onAdmin) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToastMessage(null);
    }
  }, [location.pathname]);

  // Fetch the admin role ID once on mount
  useEffect(() => {
    supabase
      .from("Role")
      .select("id")
      .eq("name", "Admin")
      .then(({ data }) => setAdminRoleId(data?.[0]?.id ?? null));
  }, []);

  const isAdmin = adminRoleId != null && roleId === adminRoleId;

  // Keep isAdminRef in sync so the real-time callback can read it without
  // being re-subscribed every time isAdmin changes.
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  const showToast = (message) => {
    if (onNotificationsPageRef.current) return; // suppress on notifications page
    if (!isOnAdminPageRef.current) return; // suppress on client pages
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(message);
    timerRef.current = setTimeout(() => setToastMessage(null), 10000);
  };

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(null);
  };

  // On admin login: count sent notifications that arrived after the last
  // time the admin visited the Notifications page. If no timestamp exists
  // we have no baseline, so we skip the toast entirely.
  useEffect(() => {
    if (!isAdmin) {
      hasShownLoginToastRef.current = false;
      return;
    }
    if (hasShownLoginToastRef.current) return;
    hasShownLoginToastRef.current = true;

    const lastViewed = localStorage.getItem("admin_notifs_last_viewed");
    if (!lastViewed) return; // no baseline — don't risk showing stale notifications

    supabase
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gt("created_at", lastViewed)
      .then(({ count }) => {
        const n = count ?? 0;
        if (n > 0) {
          showToast(`You have ${n} new notification${n === 1 ? "" : "s"}`);
        }
      });
  }, [isAdmin]);

  // Real-time: set up the INSERT listener once on mount regardless of admin
  // status. Gating on isAdmin meant the channel was created late (after the
  // async role fetch) or not at all, causing missed events. Instead we
  // subscribe immediately and check isAdminRef inside the callback.
  useEffect(() => {
    console.log("[AdminNotificationToast] Registering real-time INSERT listener on Notification table...");

    const channel = supabase
      .channel("admin-toast-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification" },
        (payload) => {
          console.log("[AdminNotificationToast] INSERT event received:", payload);
          if (isAdminRef.current) {
            showToast("You have a new notification");
          } else {
            console.log("[AdminNotificationToast] INSERT received but user is not admin — toast suppressed");
          }
        }
      )
      .subscribe((status) => {
        console.log("[AdminNotificationToast] Subscription status:", status);
      });

    return () => {
      console.log("[AdminNotificationToast] Removing real-time channel");
      supabase.removeChannel(channel);
    };
  }, []); // mount once — isAdmin is read via ref inside the callback

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!location.pathname.startsWith("/admin") || !toastMessage) return null;

  return (
    <div
      className="fixed top-5 right-5 z-50 flex items-center gap-4 text-white px-5 py-4 rounded-xl shadow-2xl w-80"
      style={{ backgroundColor: "#7E4C3C" }}
    >
      <div className="flex-shrink-0">
        <Bell size={18} className="opacity-80" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-0.5">
          New Notification
        </p>
        <p className="text-sm font-medium leading-snug">{toastMessage}</p>
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-white/20 transition-all"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default AdminNotificationToast;
