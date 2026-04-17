import Sidebar from "../../components/shared/Sidebar/Sidebar";
import Frame from "../../components/shared/Frame/Frame";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import {
  ALLOWED_MIME_TYPES,
  getProfilePhotoPath,
  getSettingsPath,
  isIgnorableSettingsLoadError,
  MAX_NAME_LENGTH,
  MAX_PHOTO_BYTES,
  SETTINGS_BUCKET,
} from "./settings.utils";
import { LoaderCircle } from "lucide-react";

function AdminSettings() {
  const { user, profile } = useAuth();
  const fileInputRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const fallbackDisplayName = useMemo(() => {
    const first = (profile?.first_name || "").trim();
    const last = (profile?.last_name || "").trim();
    const fullName = `${first} ${last}`.trim();
    return fullName || "Admin";
  }, [profile?.first_name, profile?.last_name]);

  const [displayName, setDisplayName] = useState("Admin");
  const [savedDisplayName, setSavedDisplayName] = useState("Admin");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [savedPhotoUrl, setSavedPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [savedPhotoName, setSavedPhotoName] = useState("");
  const [savedPhotoPath, setSavedPhotoPath] = useState("");
  const [savedSettingsPath, setSavedSettingsPath] = useState("");
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dashboardAlerts, setDashboardAlerts] = useState(true);
  const [emailSavedAt, setEmailSavedAt] = useState("");
  const [alertsSavedAt, setAlertsSavedAt] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadSettings = async () => {
      if (!user?.id) {
        setDisplayName(fallbackDisplayName);
        setSavedDisplayName(fallbackDisplayName);
        setSelectedPhotoFile(null);
        setSavedSettingsPath("");
        setSavedPhotoPath("");
        setSavedPhotoName("");
        setPhotoName("");
        setProfilePhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setSavedPhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setEmailNotifications(true);
        setDashboardAlerts(true);
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);
      setFormError("");

      const adminFolderPath = `admins/${user.id}`;
      const { data: folderItems, error: folderError } = await supabase.storage
        .from(SETTINGS_BUCKET)
        .list(adminFolderPath);

      if (ignore) return;

      if (folderError) {
        if (!isIgnorableSettingsLoadError(folderError)) {
          setFormError("Could not load your saved settings.");
        }

        setDisplayName(fallbackDisplayName);
        setSavedDisplayName(fallbackDisplayName);
        setSavedSettingsPath("");
        setSavedPhotoPath("");
        setSavedPhotoName("");
        setPhotoName("");
        setSelectedPhotoFile(null);
        setProfilePhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setSavedPhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setEmailNotifications(true);
        setDashboardAlerts(true);
        setEmailSavedAt("");
        setAlertsSavedAt("");
        setIsLoadingSettings(false);
        return;
      }

      const latestSettingsFile = (folderItems || [])
        .filter((item) => /^settings-\d+\.json$/.test(item.name))
        .sort((a, b) => b.name.localeCompare(a.name))[0];

      if (!latestSettingsFile) {
        setDisplayName(fallbackDisplayName);
        setSavedDisplayName(fallbackDisplayName);
        setSavedSettingsPath("");
        setSavedPhotoPath("");
        setSavedPhotoName("");
        setPhotoName("");
        setSelectedPhotoFile(null);
        setProfilePhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setSavedPhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setEmailNotifications(true);
        setDashboardAlerts(true);
        setEmailSavedAt("");
        setAlertsSavedAt("");
        setIsLoadingSettings(false);
        return;
      }

      const settingsPath = `${adminFolderPath}/${latestSettingsFile.name}`;
      const { data: settingsBlob, error: settingsError } = await supabase.storage
        .from(SETTINGS_BUCKET)
        .download(settingsPath);

      if (ignore) return;

      if (settingsError) {
        if (!isIgnorableSettingsLoadError(settingsError)) {
          setFormError("Could not load your saved settings.");
        }

        setDisplayName(fallbackDisplayName);
        setSavedDisplayName(fallbackDisplayName);
        setSavedSettingsPath("");
        setSavedPhotoPath("");
        setSavedPhotoName("");
        setPhotoName("");
        setSelectedPhotoFile(null);
        setProfilePhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setSavedPhotoUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return "";
        });
        setEmailNotifications(true);
        setDashboardAlerts(true);
        setEmailSavedAt("");
        setAlertsSavedAt("");
        setIsLoadingSettings(false);
        return;
      }

      try {
        const raw = await settingsBlob.text();
        const settings = JSON.parse(raw || "{}");

        const nextDisplayName = settings.displayName?.trim() || fallbackDisplayName;
        const nextEmailNotifications =
          settings.emailNotifications === undefined ? true : Boolean(settings.emailNotifications);
        const nextDashboardAlerts =
          settings.dashboardAlerts === undefined ? true : Boolean(settings.dashboardAlerts);
        const nextPhotoPath = settings.photoPath || "";
        const nextPhotoName = settings.photoName || "";
        const savedAt = settings.updatedAt ? new Date(settings.updatedAt).toLocaleTimeString() : "";

        setDisplayName(nextDisplayName);
        setSavedDisplayName(nextDisplayName);
        setSavedSettingsPath(settingsPath);
        setEmailNotifications(nextEmailNotifications);
        setDashboardAlerts(nextDashboardAlerts);
        setSavedPhotoPath(nextPhotoPath);
        setSavedPhotoName(nextPhotoName);
        setPhotoName(nextPhotoName);
        setSelectedPhotoFile(null);
        setEmailSavedAt(savedAt);
        setAlertsSavedAt(savedAt);

        if (nextPhotoPath) {
          const { data: photoBlob, error: photoError } = await supabase.storage
            .from(SETTINGS_BUCKET)
            .download(nextPhotoPath);

          if (!photoError && photoBlob && !ignore) {
            const nextUrl = URL.createObjectURL(photoBlob);
            setProfilePhotoUrl((current) => {
              if (current) URL.revokeObjectURL(current);
              return nextUrl;
            });
            setSavedPhotoUrl((current) => {
              if (current && current !== nextUrl) URL.revokeObjectURL(current);
              return nextUrl;
            });
          }
        } else {
          setProfilePhotoUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return "";
          });
          setSavedPhotoUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return "";
          });
        }
      } catch (error) {
        console.error("Could not parse saved settings:", error);
        setFormError("Could not parse your saved settings.");
      } finally {
        if (!ignore) setIsLoadingSettings(false);
      }
    };

    loadSettings();

    return () => {
      ignore = true;
    };
  }, [fallbackDisplayName, user?.id]);

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

    if (profilePhotoUrl && profilePhotoUrl !== savedPhotoUrl) {
      URL.revokeObjectURL(profilePhotoUrl);
    }

    const nextPhotoUrl = URL.createObjectURL(file);
    setSelectedPhotoFile(file);
    setProfilePhotoUrl(nextPhotoUrl);
    setPhotoName(file.name);
  };

  const saveProfileChanges = async () => {
    const trimmedName = displayName.trim();

    if (!user?.id) {
      setFormError("You must be logged in to save settings.");
      return;
    }

    if (!trimmedName) {
      setNameError("Display name is required.");
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setNameError(`Display name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }

    setNameError("");
    setFormError("");
    setIsSaving(true);

    try {
      let nextPhotoPath = savedPhotoPath;
      let nextPhotoName = savedPhotoName;
      let nextSavedPhotoUrl = savedPhotoUrl;

      if (selectedPhotoFile) {
        const profilePhotoPath = getProfilePhotoPath(user.id, selectedPhotoFile.name);
        const { error: photoUploadError } = await supabase.storage
          .from(SETTINGS_BUCKET)
          .upload(profilePhotoPath, selectedPhotoFile, {
            upsert: false,
            contentType: selectedPhotoFile.type,
            cacheControl: "0",
          });

        if (photoUploadError) {
          throw new Error(photoUploadError.message || "Could not upload profile photo.");
        }

        const { data: persistedPhotoBlob, error: persistedPhotoError } = await supabase.storage
          .from(SETTINGS_BUCKET)
          .download(profilePhotoPath);

        if (persistedPhotoError) {
          throw new Error(persistedPhotoError.message || "Could not load uploaded profile photo.");
        }

        nextPhotoPath = profilePhotoPath;
        nextPhotoName = selectedPhotoFile.name;
        nextSavedPhotoUrl = URL.createObjectURL(persistedPhotoBlob);

        if (savedPhotoPath && savedPhotoPath !== nextPhotoPath) {
          const { error: removeError } = await supabase.storage
            .from(SETTINGS_BUCKET)
            .remove([savedPhotoPath]);
          if (removeError) {
            console.warn("Could not remove previous profile photo:", removeError.message);
          }
        }
      }

      const payload = {
        displayName: trimmedName,
        emailNotifications,
        dashboardAlerts,
        photoPath: nextPhotoPath,
        photoName: nextPhotoName,
        updatedAt: new Date().toISOString(),
      };

      const settingsPath = getSettingsPath(user.id);
      const settingsBlob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });

      const { error: settingsUploadError } = await supabase.storage
        .from(SETTINGS_BUCKET)
        .upload(settingsPath, settingsBlob, {
          upsert: false,
          contentType: "application/json",
          cacheControl: "0",
        });

      if (settingsUploadError) {
        throw new Error(settingsUploadError.message || "Could not save settings.");
      }

      if (savedSettingsPath && savedSettingsPath !== settingsPath) {
        const { error: removeSettingsError } = await supabase.storage
          .from(SETTINGS_BUCKET)
          .remove([savedSettingsPath]);
        if (removeSettingsError) {
          console.warn("Could not remove previous settings file:", removeSettingsError.message);
        }
      }

      const savedTime = new Date().toLocaleTimeString();
      setSavedDisplayName(trimmedName);
      setDisplayName(trimmedName);
      setSavedSettingsPath(settingsPath);
      setSavedPhotoPath(nextPhotoPath);
      setSavedPhotoName(nextPhotoName);
      setPhotoName(nextPhotoName);
      setEmailSavedAt(savedTime);
      setAlertsSavedAt(savedTime);

      if (selectedPhotoFile) {
        if (savedPhotoUrl && savedPhotoUrl !== nextSavedPhotoUrl) {
          URL.revokeObjectURL(savedPhotoUrl);
        }
        if (profilePhotoUrl && profilePhotoUrl !== savedPhotoUrl && profilePhotoUrl !== nextSavedPhotoUrl) {
          URL.revokeObjectURL(profilePhotoUrl);
        }
        setSavedPhotoUrl(nextSavedPhotoUrl);
        setProfilePhotoUrl(nextSavedPhotoUrl);
      }

      setSelectedPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setShowSavedBanner(true);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setShowSavedBanner(false);
      }, 2500);
    } catch (error) {
      console.error("Error saving admin settings:", error);
      setFormError(error.message || "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailToggle = () => {
    setEmailNotifications((current) => !current);
  };

  const handleDashboardAlertsToggle = () => {
    setDashboardAlerts((current) => !current);
  };

  const activePhoto = profilePhotoUrl || savedPhotoUrl;
  const activePhotoName = photoName || savedPhotoName;

  return (
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="flex w-full rounded-lg overflow-y-auto">
          <div className=" flex flex-col bg-[#fcfcfc] p-6 w-full h-full rounded-lg shadow-inner">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Personal Settings</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Update your profile details and notification preferences.
              </p>
            </div>
            {isLoadingSettings ? (
              <div className="flex flex-col items-center justify-center grow text-gray-500">
                <LoaderCircle className="text-brown animate-spin mb-2" size={32}
                />
                <p className="text-sm">Loading your settings...</p>
              </div>
            ) : formError && !savedSettingsPath ? (
              <div className="grow flex flex-col text-center items-center justify-center">
                <p className="text-sm text-red-600 mb-2">{formError}</p>
              </div>
            ) : (
              <>
            {showSavedBanner && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Personal settings saved successfully.
              </div>
            )}

            {formError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <section className="rounded-lg border border-gray-200 p-4 mb-5 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>

              <div className="grid md:grid-cols-[140px_1fr] gap-4 items-start">
                <div className="w-30 h-30 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-gray-500 text-sm">
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

                <div className="space-y-4 ">
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
                        className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white rounded-md border border-black text-sm transition-all cursor-pointer"
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
                  disabled={isSaving}
                  className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] disabled:opacity-70 text-white rounded-md border border-black text-sm transition-all cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 p-4 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3 shadow-sm">
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
                    title="Turn on/off Emails"
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 cursor-pointer ${
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

                <div className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 p-3 shadow-sm">
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
                    title="Turn on/off Dashboard Alerts"
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 cursor-pointer ${
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
            </>
            )}
          </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default AdminSettings;