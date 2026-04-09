import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "admin_unread_count";

// ─── Module-level show function ───────────────────────────────────────────────
// The component registers its internal showToast here on mount so that
// triggerAdminToast() (called from UploadGalleryModal / Payments) can fire it
// directly without any Supabase realtime channel.
let _showToast = null;

export function triggerAdminToast() {
  const current = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  localStorage.setItem(STORAGE_KEY, String(current + 1));
  if (_showToast) {
    _showToast("You have a new notification");
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function AdminNotificationToast() {
  const { profile } = useAuth();
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState(null);
  const timerRef = useRef(null);
  const hasShownLoginToastRef = useRef(false);

  const isAdmin = profile?.roleName === "Admin";
  const onNotificationsPage = location.pathname === "/admin/notifications";
  const onAdminPage = location.pathname.startsWith("/admin");

  const showToast = (message) => {
    if (onNotificationsPage) return;
    if (!onAdminPage) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(message);
    timerRef.current = setTimeout(() => setToastMessage(null), 10000);
  };

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(null);
  };

  // Register showToast so triggerAdminToast() can reach it
  useEffect(() => {
    _showToast = showToast;
    return () => { _showToast = null; };
  });

  // Dismiss toast when navigating away from admin pages
  useEffect(() => {
    if (!onAdminPage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToastMessage(null);
    }
  }, [location.pathname]);

  // On admin login: show toast if there are unread notifications
  useEffect(() => {
    if (!isAdmin) {
      hasShownLoginToastRef.current = false;
      return;
    }
    if (hasShownLoginToastRef.current) return;
    hasShownLoginToastRef.current = true;

    const count = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    if (count > 0) {
      showToast(`You have ${count} new notification${count === 1 ? "" : "s"}`);
    }
  }, [isAdmin]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!onAdminPage || !toastMessage) return null;

  return (
    <div
      className="fixed top-5 right-5 z-50 bg-white rounded-xl shadow-lg w-80 p-4"
      style={{ border: "1.5px solid #7E4C3C" }}
    >
      {/* Top row: icon + title + dismiss */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md"
          style={{ backgroundColor: "#7E4C3C" }}
        >
          <Sparkles size={14} color="white" />
        </div>
        <span className="flex-1 text-sm font-bold text-gray-900">New Notification</span>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-0.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
      {/* Message */}
      <p className="text-sm text-gray-600 leading-snug pl-9">{toastMessage}</p>
    </div>
  );
}

export default AdminNotificationToast;
