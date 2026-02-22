// src/pages/Dashboard/ClientDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import JSZip from "jszip";  // imported JSZip and file-saver for gallery downloads
import { saveAs } from "file-saver";
import { Link } from "react-router-dom";
import DownloadInvoiceButton from "../../components/InvoiceButton/DownloadInvoiceButton";

export default function ClientDashboard() {
  const { user, profile, setProfile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Will be used to display settings modal 
  const [showSettings, setShowSettings] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // To allow a user to edit their profile information and to check if they are editting
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });


  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // used to track download gallery progress
  const [downloadingGalleries, setDownloadingGalleries] = useState({});


  // load all data that belongs to THIS user only
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      // 1) sessions for this user
      const { data: sessionRows, error: sesErr } = await supabase
        .from("Session")
        .select(
          "id, session_type_id, start_at, end_at, location_text, status, created_at, inquiry_id"
        )
        .eq("client_id", user.id)
        .order("start_at", { ascending: false });

      if (sesErr) {
        console.error(sesErr);
        setSessions([]);
      } else {
        setSessions(sessionRows ?? []);
      }

      const sessionIds =
        sessionRows?.map((s) => s.id).filter(Boolean) ?? [];

      // 2) invoices for those sessions
      let invoiceRows = [];
      if (sessionIds.length > 0) {
        const { data, error } = await supabase
          .from("Invoice")
          .select(
            "id, session_id, invoice_number, issue_date, due_date, total, status"
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
          .select("id, ContractTemplate ( name, body )")
          .in("session_id", sessionIds)
          .neq("status", "Signed");
        if (!error) {
          contractRows = data ?? [];
        } else {
          console.error(error);
        }

        setContracts(contractRows);

        // 5) notifications / reminders for this user (most recent first)
        const { data: notificationRows, error: notifErr } = await supabase
          .from("Notification")
          .select("id, subject, body, status, sent_at, created_at, session_id")
          .eq("user_id", user.id)
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
    }

    loadData();
  }, [user]);

  // When opening edit profile, load the current profile values into the edit form
  useEffect(() => {
    if (showSettings && profile) {
      setEditForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        email: user?.email ?? "",
      });

      // Clear previous messages
      setSaveError("");
      setSaveSuccess("");
      setIsEditing(false); // still in view mode
    }
  }, [showSettings]);

  // Used in the welcome message if no first or last name is set fallback to email
  const fullName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
      : user?.email;

  // Handle typing into fields, updates the edit form page when something else is typed
  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  // Save updated profile info to supabase
  async function handleSaveProfile() {
    // Clear previous messages to start with a clean state
    setSaveError("");
    setSaveSuccess("");

    const newFirstName = editForm.first_name.trim();
    const newLastName = editForm.last_name.trim();
    const newPhone = editForm.phone.trim();
    const newEmail = editForm.email.trim();

    // Users current email for comparison
    const currentEmail = (user?.email ?? "").trim();

    // Check if the user changed their email
    const emailChanged = newEmail.toLowerCase() !== currentEmail.toLowerCase();

    // Basic validarion if email was changed
    if (emailChanged) {
      // Simple email format check
      if (!newEmail.includes("@") || !newEmail.includes(".")) {
        setSaveError("Please enter a valid email address.");
        return;
      }

      // Ensure that the new email is not already in use by another user
      const { data: existingUsers, error: userErr } = await supabase
        .from("User")
        .select("id")
        .eq("email", newEmail)
        .maybeSingle();

      if (userErr) {
        console.error("Error checking existing email:", userErr);
        setSaveError("Could not check email right now. Please try again later.");
        return;
      }
      if (existingUsers && existingUsers.id !== user.id) {
        setSaveError("That email is already in use. Please choose another.");
        return;
      }
    }

    // Update fields in the "User" table
    const updates = {
      first_name: newFirstName,
      last_name: newLastName,
      phone: newPhone,
      email: newEmail,
    };

    // Send the update to Supabase for the currently logged-in user
    const { data, error } = await supabase
      .from("User")
      .update(updates)
      .eq("id", user.id)
      .select()
      .maybeSingle();

    // If there was a problem show error message and stop
    if (error) {
      setSaveError("Could not save changes.");
      return;
    }

    // Update global profile in AuthContext so the whole website has the latest info
    setProfile(data);

    // If email was changed ask Supabase to send a verification link to that email
    if (emailChanged) {
      const { error: emailErr } = await supabase.auth.updateUser({
        email: newEmail
      },
        { emailRedirectTo: `${window.location.origin}/auth/callback`, }
      );

      if (emailErr) {
        setSaveError("Could not update email address.");
        return;
      }

      setSaveSuccess("Profile will be updated once you verify your new email address. Please check your inbox.");
    } else {

      setSaveSuccess("Profile updated successfully.");
    }
    setIsEditing(false); // back to view mode
  }

  // Change password logic that is current password to new password
  async function handleChangePassword() {
    setSaveError("");
    setSaveSuccess("");

    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

    // Basic validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setSaveError("All password fields are required.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSaveError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setSaveError("Password must be at least 8 characters.");
      return;
    }

    // Re- authenticate using current password
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (loginErr) {
      console.error("signInWithPassword error:", loginErr);
      setSaveError("Current password is incorrect.");
      return;
    }

    // Updating password
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      console.error("updateUser password error:", updateErr);
      setSaveError("Could not update password. Please try again.");
      return;
    }

    setSaveSuccess("Password updated successfully.");
    setChangingPassword(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  }

  // Function to delete user account permanently
  async function handleDeleteAccount() {
    setSaveError("");
    setSaveSuccess("");

    if (!user?.id) {
      setSaveError("No user is currently logged in.");
      return;
    }

    // Delete user from the User table in the database
    const { error: deleteErr } = await supabase
      .from("User")
      .delete()
      .eq("id", user.id);

    if (deleteErr) {
      console.error("Error deleting user account:", deleteErr);
      setSaveError("Could not delete account. Please try again later.");
      return;
    }

    //Clear profile, log user out, and redirect to homepage
    setProfile(null);
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
        Loading your dashboard...
      </div>
    );
  }

  // GALLERY DOWNLOAD FUNCTION //
  // download entire gallery as a ZIP file, ensured its with the authenticate client's own gallery
  const handleDownloadGallery = async (galleryId, galleryTitle) => {
    try {
      // CONSOLE DEBUG 
      // console.log('Starting download for gallery ID:', galleryId);

      // mark as downloading
      setDownloadingGalleries(prev => ({ ...prev, [galleryId]: true }));

      // 1) Fetch photos for this gallery
      const { data: photos, error: photosError } = await supabase
        .from("Photo")
        .select("id, storage_path, filename")
        .eq("gallery_id", galleryId)
        .order("uploaded_at", { ascending: true });

      // CONSOLE DEBUG 
      // console.log('fetched photos:', photos);
      // console.log('Photos Error:', photosError);

      // error in fetching photos
      if (photosError) {
        console.error("Error fetching photos:", photosError);
        alert("Failed to fetch gallery photos. Please try again later.");
        return;
      }

      // no photos found in gallery message
      if (!photos || photos.length === 0) {
        alert("This gallery has no photos.");
        return;
      }

      // 2) Create a new ZIP file
      const zip = new JSZip();
      const folder = zip.folder(galleryTitle || "Gallery");

      // 3) Download each photo and add to ZIP
      let successCount = 0;
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        // CONSOLE DEBUG 
        // console.log(`Processing photo ${i + 1}:`, photo.filename);
        // console.log('Path:', photo.storage_path);

        try {

          // get signed URL for secure access from Supabase Storage
          const { data: urlData, error: urlError } = await supabase.storage
            .from("photos") // assuming 'photos' is the bucket name
            .createSignedUrl(photo.storage_path, 3600); // URL valid for 1 hour

          // CONSOLE DEBUG 
          // console.log( 'URL result:', {urlData, urlError});

          if (urlError) {
            console.error(`Error getting URL for ${photo.filename}:`, urlError);
            continue;
          }

          // CONSOLE DEBUG 
          // console.log('Signed URL obtained.');

          // fetch the photo as a blob
          const response = await fetch(urlData.signedUrl);

          // CONSOLE DEBUG 
          // console.log('Fetch response:', response.status, response.ok);

          if (!response.ok) {
            console.error(`Error downloading ${photo.filename}`);
            continue;
          }

          const blob = await response.blob();

          // CONSOLE DEBUG
          // console.log('Blob size:', blob.size, 'bytes');

          // add to zip folder
          folder.file(photo.filename, blob);
          successCount++;

          // CONSOLE DEBUG
          // console.log('Added to ZIP');

        } catch (error) {
          console.error(`Error processing ${photo.filename}:`, error);
        }
      }

      // CONSOLE DEBUG
      // console.log('\n Total successful:', successCount, 'out of', photos.length);

      if (successCount === 0) {
        alert("Failed to download any photos from this gallery.");
        return;
      }

      // 4) generate the ZIP file and trigger download

      // CONSOLE DEBUG (keep)
      console.log('Generating ZIP...');

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFilename = `${galleryTitle || "gallery"}_${new Date().getTime()}.zip`;

      // CONSOLE DEBUG (keep)
      console.log('Saving as:', zipFilename);

      saveAs(zipBlob, zipFilename);

      if (successCount < photos.length) {
        alert(`Downloaded ${successCount} out of ${photos.length} photos. Some files failed.`);
      }

    } catch (error) {
      console.error("Error downloading gallery:", error);
      alert("An error occurred while downloading the gallery. Please try again later.");
    } finally {
      // remove downloading state
      setDownloadingGalleries(prev => {
        const next = { ...prev };
        delete next[galleryId];
        return next;
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      {/* header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl md:text-4xl font-serif text-brown">
          Welcome back{fullName ? `, ${fullName}` : ""}.
        </h1>
        <p className="text-sm md:text-base text-neutral-600 max-w-2xl">
          Here are your sessions, invoices, galleries, and forms/contracts. Only
          your information is shown.
        </p>

        {/* Settings button*/}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="cursor-pointer self-end mt-3 px-4 py-2 bg-white text-black text-sm font-mono border border-black rounded-md transition hover:bg-gray-200">
          Account Settings
        </button>
      </header>

      {/* Reminders / notifications */}
      <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-serif text-brown">Reminders</h2>
          <span className="text-xs text-neutral-500">
            Showing latest {notifications.length || 0}
          </span>
        </div>
        {notifications.length === 0 ? (
          <p className="text-sm text-neutral-500">
            You’re all caught up. New reminders will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="bg-white border rounded-md px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-brown font-semibold">
                      {n.subject || "Reminder"}
                    </p>
                    <p className="text-xs text-neutral-600 whitespace-pre-wrap">
                      {n.body || "You have an update to review."}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-1 rounded border ${n.status === "sent"
                      ? "bg-neutral-100 border-neutral-200 text-neutral-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}
                  >
                    {n.status || "pending"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-2">
                  {n.sent_at
                    ? `Sent ${new Date(n.sent_at).toLocaleString()}`
                    : n.created_at
                      ? `Created ${new Date(n.created_at).toLocaleString()}`
                      : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sessions */}
        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-lg font-serif text-brown mb-3">Your Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-500">
              You don’t have any sessions scheduled yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm text-brown font-semibold">
                      {s.location_text || "Session"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {s.start_at
                        ? new Date(s.start_at).toLocaleString()
                        : "TBD"}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-neutral-100 border text-neutral-700">
                    {s.status ?? "pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Invoices */}
        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-lg font-serif text-brown mb-3">Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No invoices yet. You’ll see them here when they’re issued.
            </p>
          ) : (
            <ul className="space-y-3">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                >
                  <div className="flex-col w-full">
                    <div className="flex w-full">
                      <div className='flex flex-row gap-3'>
                        <p className="text-sm text-brown font-semibold">
                          Invoice No. {inv.invoice_number || inv.id.slice(0, 6)}
                        </p>
                        <a
                          className='text-[#7E4C3C] hover:text-[#AB8C4B] transition cursor-pointer -translate-y-0.5'
                          aria-label="Preview"
                        >
                          <i className="fa-solid fa-eye"></i>
                        </a>
                        <DownloadInvoiceButton invoiceId={inv.id} />
                      </div>
                      <div className="flex relative mx-auto lg:mr-0">
                        <div className="flex lg:absolute lg:right-5">
                          {
                            inv.status === "Paid" ?
                              <></> :
                              <button
                                type="button"
                                className="px-2 py-1 md:px-4 flex bg-brown rounded text-xs md:text-sm text-white font-bold hover:bg-[#AB8C4B] cursor-pointer">Pay
                              </button>
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:flex-row mx-2 mt-2">
                      <div className='flex flex-row gap-2 items-center w-full lg:w-1/5 mr-4'>
                        <span
                          className={`flex w-3 h-3 rounded-full border ${inv.status === "Paid"
                            ? "bg-green-100 border-green-300"
                            : "bg-red-100 border-red-300"
                            }`}
                        >
                          {" "}
                        </span>
                        <div className={`flex text-sm font-semibold ${inv.status === "Paid"
                          ? "text-green-700"
                          : "text-red-700"
                          }`}>
                          {inv.status ?? "Unpaid"}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 lg:flex-row lg:gap-0 mx-2 mt-2 w-4/5 justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm text-neutral-700">
                            Issue Date
                          </p>
                          <p className="text-sm text-neutral-500">
                            {inv.issue_date
                              ? new Date(inv.issue_date).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm text-neutral-700">
                            Due Date
                          </p>
                          <p className="text-sm text-neutral-500">
                            {inv.due_date
                              ? new Date(inv.due_date).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm text-neutral-700">
                            Total Due
                          </p>
                          <p className="text-sm text-neutral-500">
                            {/* When invoice is paid or total is NULL, read total as 0, otherwise read total */}
                            ${((inv.status === "Paid") ? 0 : (inv.total ?? 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Galleries */}
        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-lg font-serif text-brown mb-3">Galleries</h2>
          {galleries.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No galleries have been published for you yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {galleries.map((g) => {
                // download button shows loading state if downloading
                const isDownloading = downloadingGalleries[g.id];
                return (
                  <li
                    key={g.id}
                    className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm text-brown font-semibold">
                        {g.title || "Gallery"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Published{" "}
                        {g.published_at
                          ? new Date(g.published_at).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    {g.is_password_protected ? (
                      <span className="text-xs px-2 py-1 rounded bg-neutral-100 border text-neutral-700">
                        Protected
                      </span>
                    ) : null}
                    {/* Download Gallery Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadGallery(g.id, g.title)}
                      disabled={isDownloading}
                      className={`text-xs px-3 py-1 rounded border border-black font-semibold transition ${isDownloading
                        ? "bg-neutral-200 text-neutral-500 cursor-wait"
                        : "bg-[#446780] hover:bg-[#98c0dc] cursor-pointer text-white"
                        }`}
                    >
                      {isDownloading ? "Downloading..." : "Download"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Forms / Contracts */}
        <section className="flex flex-col bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className=" text-lg font-serif text-brown mb-3">Forms & Contracts</h2>
          <div className="flex-col w-full space-y-2">
            <div className="relative">
            {contracts.length === 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  No new contracts have been issued to you yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {contracts.map((c) => (
                  <li
                    key={c.id}
                    className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm text-brown font-semibold">
                        {c.ContractTemplate.name || "Contract"}
                      </p>
                    </div>
                    {
                      <Link
                        to={`/dashboard/contracts/${c.id}`}
                        className="text-xs px-3 py-1 rounded bg-brown text-white hover:bg-[#AB8C4B] transition border-2 border-black"
                      >
                        Review &amp; Sign
                      </Link>
                    }
                  </li>
                ))}
              </ul>
            )}
            </div>
            <div className="flex flex-row-reverse relative">
              <div className="flex relative">
                  <Link
                    to="/dashboard/contracts"
                    className="text-xs px-2 py-1 rounded bg-[#446780] hover:bg-[#98c0dc] text-white font-semibold transition border border-black text-center"
                  >
                    Go to Contracts
                  </Link>
              </div>
            </div>
          </div>
        </section>
      </div >

      {/*Settings Modal*/}
      {
        showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>

            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50">
            </div>

            {/* Dialog */}
            <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border border-black rounded-md shadow-lg">
              <h2 className="text-center text-2xl font-serif font-extralight mb-4">
                Account Settings
              </h2>
              {saveError && (
                <p className="text-center text-xs text-red-600 mb-2">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="text-center text-xs text-green-700 mb-2">{saveSuccess}</p>
              )}

              {/* Modal Content */}
              <div className="flex flex-col font-mono text-xs">
                <label className="mb-4">
                  <p className="text-center text-brown py-3">FIRST NAME *</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="first_name"
                      value={editForm.first_name}
                      onChange={handleEditChange}
                      className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none" />
                  ) : (
                    <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                      {profile?.first_name || "Not set"}
                    </div>
                  )}
                </label>

                <label className="mb-4">
                  <p className="text-center text-brown py-3">LAST NAME *</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="last_name"
                      value={editForm.last_name}
                      onChange={handleEditChange}
                      className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none" />
                  ) : (
                    <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                      {profile?.last_name || "Not set"}
                    </div>
                  )}
                </label>

                <label className="mb-4">
                  <p className="text-center text-brown py-3">EMAIL *</p>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none" />
                  ) : (
                    <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                      {user?.email || "N/A"}
                    </div>
                  )}
                </label>

                <label className="mb-4">
                  <p className="text-center text-brown py-3">PHONE NUMBER *</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                      className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none" />
                  ) : (
                    <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                      {profile?.phone || "N/A"}
                    </div>
                  )}
                </label>

                <label className="mb-4">
                  <p className="text-center text-brown py-3">PASSWORD *</p>

                  {/* View mode for password */}
                  {!isEditing && (
                    <input
                      type="password"
                      value="********"
                      readOnly
                      disabled
                      className="w-full text-center border-neutral-200 border-b py-3 text-sm bg-transparent cursor-default"
                    />
                  )}

                  {/* Edit mode for password */}
                  {isEditing && (
                    <input
                      type="password"
                      value="********"
                      readOnly
                      disabled
                      className="w-full text-center border-neutral-200 border-b py-3 text-sm bg-off-white cursor-default"
                    />
                  )}
                </label>

              </div>

              {/* Footer actions – change depending on whether the user is editing */}
              <div className="flex items-center justify-center gap-3 mt-6">
                {/* View mode, not editing yet*/}
                {!isEditing ? (
                  <>
                    {/* Just close the modal */}
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 bg-white text-black text-sm font-sans border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                    >
                      Close
                    </button>

                    {/* Switch into edit mode – turns labels into inputs */}
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-white text-black text-sm font-sans border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                    >
                      Edit Profile
                    </button>

                    {/* Placeholder for delete account, will be implemented later*/}
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-[#a00101] hover:bg-[#870000] text-white text-sm border border-black rounded-md transition cursor-pointer"
                    >
                      Delete Account
                    </button>
                  </>
                ) : (
                  /* Edit mode, user is changing their info */
                  <>
                    {/* Cancel editing: exit edit mode and reset fields back to profile data */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          first_name: profile?.first_name ?? "",
                          last_name: profile?.last_name ?? "",
                          phone: profile?.phone ?? "",
                          email: user?.email ?? "",
                        });
                        setSaveError("");
                        setSaveSuccess("");
                      }}
                      className="px-4 py-2 bg-white text-black text-sm font-sans border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    {/* Change password button, opens password change modal */}
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 bg-white text-black text-sm font-sans border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                    >
                      Change Password
                    </button>

                    {/* Save changes: calls handleSaveProfile that updates Supabase */}
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-[#5e8738] hover:bg-[#425e28] text-white text-sm font-sans border border-black rounded-md transition cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>

              {/* “X” button in the top-right corner of the modal to exit*/}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowSettings(false)}
                className="absolute top-2 right-2 px-2 py-1 font-sans text-lg rounded-md bg-white cursor-pointer"
              >
                ×
              </button>
            </div>
          </div>
        )
      }
      {/* Password change modal */}
      {
        showPasswordModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPasswordModal(false);
            }}
          >
            <div className="absolute inset-0 bg-black/50"></div>

            <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border border-black rounded-md shadow-lg">

              <h2 className="text-center text-2xl font-serif font-extralight mb-4">
                Change Password
              </h2>

              {saveError && (
                <p className="text-center text-xs text-red-600 mb-2">{saveError}</p>
              )}

              {saveSuccess && (
                <p className="text-center text-xs text-green-700 mb-2">{saveSuccess}</p>
              )}

              <div className="flex flex-col font-mono text-xs space-y-3">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                />

                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                />

                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmNewPassword: e.target.value,
                    }))
                  }
                  className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                />

                <div className="flex justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({
                        currentPassword: "",
                        newPassword: "",
                        confirmNewPassword: "",
                      });
                      setSaveError("");
                      setSaveSuccess("");
                    }}
                    className="px-4 py-2 bg-white text-black text-sm font-sans border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleChangePassword();
                      if (!saveError) {
                        setShowPasswordModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-[#5e8738] hover:bg-[#425e28] text-white text-sm font-sans border border-black rounded-md transition cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-2 right-2 px-2 py-1 text-lg border-0.5 border-black rounded-md bg-white cursor-pointer"
              >
                ×
              </button>
            </div>
          </div>
        )
      }
      {/* Delete account confirmation modal */}
      {
        showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeleteConfirm(false);
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50"></div>

            {/* Dialog */}
            <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border border-black rounded-md shadow-lg">
              <h2 className="text-center text-2xl font-serif  mb-4">
                Delete Account
              </h2>

              <p className="text-center text-sm text-neutral-700 mb-4 font-bold">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-white text-black text-sm border border-black rounded-md hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteAccount();
                    console.log("Delete account clicked");
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 bg-[#a00101] hover:bg-[#870000] text-white text-sm border border-black rounded-md transition cursor-pointer"
                >
                  Delete Account
                </button>
              </div>

              {/* X button on the top right to exit */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute top-2 right-2 px-2 py-1 text-lg rounded-md bg-white cursor-pointer"
              >
                ×
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}

