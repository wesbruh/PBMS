import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";
import { useEffect, useMemo, useRef, useState } from "react";

const PROFILE_STORAGE_KEY = "admin.personalSettings.profile";
const NOTIFY_STORAGE_KEY = "admin.personalSettings.notifications";
const MAX_NAME_LENGTH = 50;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

function AdminSettings() {
  const fileInputRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const [displayName, setDisplayName] = useState("Admin");
  const [savedDisplayName, setSavedDisplayName] = useState("Admin");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [savedPhotoUrl, setSavedPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [savedPhotoName, setSavedPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [nameError, setNameError] = useState("");
  const [showSavedBanner, setShowSavedBanner] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dashboardAlerts, setDashboardAlerts] = useState(true);
  const [emailSavedAt, setEmailSavedAt] = useState("");
  const [alertsSavedAt, setAlertsSavedAt] = useState("");

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}");
      const notificationPrefs = JSON.parse(localStorage.getItem(NOTIFY_STORAGE_KEY) || "{}");

      const initialName = profile.displayName || "Admin";
      setDisplayName(initialName);
      setSavedDisplayName(initialName);
      setSavedPhotoName(profile.photoName || "");

      if (notificationPrefs.emailNotifications !== undefined) {
        setEmailNotifications(Boolean(notificationPrefs.emailNotifications));
      }
      if (notificationPrefs.dashboardAlerts !== undefined) {
        setDashboardAlerts(Boolean(notificationPrefs.dashboardAlerts));
      }
    } catch (error) {
      console.error("Could not load settings from local storage:", error);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
      if (savedPhotoUrl && savedPhotoUrl !== profilePhotoUrl) {
        URL.revokeObjectURL(savedPhotoUrl);
      }
    };
  }, [profilePhotoUrl, savedPhotoUrl]);

  const remainingCharacters = useMemo(
    () => MAX_NAME_LENGTH - displayName.length,
    [displayName]
  );

  const openPhotoPicker = () => {
    fileInputRef.current?.click();
  };

  const handleDisplayNameChange = (value) => {
    if (value.length <= MAX_NAME_LENGTH) {
      setDisplayName(value);
      setNameError("");
      return;
    }
    setNameError(`Display name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError("");

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setPhotoError("Profile photo must be a JPG or PNG.");
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Profile photo must be 5MB or smaller.");
      return;
    }

    if (profilePhotoUrl) {
      URL.revokeObjectURL(profilePhotoUrl);
    }

    const nextPhotoUrl = URL.createObjectURL(file);
    setProfilePhotoUrl(nextPhotoUrl);
    setPhotoName(file.name);
  };

  const saveProfileChanges = () => {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setNameError("Display name is required.");
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setNameError(`Display name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }

    setNameError("");

    setSavedDisplayName(trimmedName);
    if (savedPhotoUrl && savedPhotoUrl !== profilePhotoUrl) {
      URL.revokeObjectURL(savedPhotoUrl);
    }
    setSavedPhotoUrl(profilePhotoUrl);
    setSavedPhotoName(photoName);

    try {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          displayName: trimmedName,
          photoName: photoName || savedPhotoName || "",
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("Could not persist profile settings:", error);
    }

    setShowSavedBanner(true);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = setTimeout(() => {
      setShowSavedBanner(false);
    }, 2500);
  };

  const saveNotificationPrefs = (nextPrefs) => {
    try {
      localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(nextPrefs));
    } catch (error) {
      console.error("Could not persist notification settings:", error);
    }
  };

  const handleEmailToggle = () => {
    const nextValue = !emailNotifications;
    setEmailNotifications(nextValue);
    saveNotificationPrefs({
      emailNotifications: nextValue,
      dashboardAlerts,
      updatedAt: new Date().toISOString(),
    });
    setEmailSavedAt(new Date().toLocaleTimeString());
  };

  const handleDashboardAlertsToggle = () => {
    const nextValue = !dashboardAlerts;
    setDashboardAlerts(nextValue);
    saveNotificationPrefs({
      emailNotifications,
      dashboardAlerts: nextValue,
      updatedAt: new Date().toISOString(),
    });
    setAlertsSavedAt(new Date().toLocaleTimeString());
  };

  const activePhoto = profilePhotoUrl || savedPhotoUrl;
  const activePhotoName = photoName || savedPhotoName;

  return (
    <div className="flex my-10 md:my-14 mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      <div className="flex w-full shadow-inner rounded-lg">
        <Frame>
          <div className="relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner overflow-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Settings</h1>
              <p className="text-gray-600">
                Update your profile details and notification preferences.
              </p>
            </div>

            {showSavedBanner && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Personal settings saved successfully.
              </div>
            )}

            <section className="rounded-lg border border-gray-200 p-4 mb-5">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>

              <div className="grid md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="w-[120px] h-[120px] rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-gray-500 text-sm">
                  {activePhoto ? (
                    <img
                      src={activePhoto}
                      alt="Admin profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "No Photo"
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#AB8C4B]"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className={nameError ? "text-red-600" : "text-gray-500"}>
                        {nameError || `Max ${MAX_NAME_LENGTH} characters`}
                      </span>
                      <span className={remainingCharacters < 10 ? "text-amber-700" : "text-gray-500"}>
                        {remainingCharacters} remaining
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={openPhotoPicker}
                        className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white rounded-md border border-black text-sm transition"
                      >
                        Choose Photo
                      </button>
                      <span className="text-sm text-gray-600 truncate">
                        {activePhotoName || "JPG/PNG, maximum 5MB"}
                      </span>
                    </div>
                    {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500">
                  Current saved name: <span className="font-medium">{savedDisplayName}</span>
                </p>
                <button
                  type="button"
                  onClick={saveProfileChanges}
                  className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white rounded-md border border-black text-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-600">
                      Receive updates and reminders by email.
                    </p>
                    {emailSavedAt && (
                      <p className="text-xs text-green-700 mt-1">Saved at {emailSavedAt}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleEmailToggle}
                    aria-pressed={emailNotifications}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      emailNotifications ? "bg-[#7E4C3C]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        emailNotifications ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="font-medium text-gray-900">Dashboard Alerts</p>
                    <p className="text-sm text-gray-600">
                      Show in-app alerts while using the dashboard.
                    </p>
                    {alertsSavedAt && (
                      <p className="text-xs text-green-700 mt-1">Saved at {alertsSavedAt}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDashboardAlertsToggle}
                    aria-pressed={dashboardAlerts}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                      dashboardAlerts ? "bg-[#7E4C3C]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        dashboardAlerts ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default AdminSettings;
