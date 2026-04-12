// src/pages/Dashboard/ClientDashboard.jsx 
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

import JSZip from "jszip";  // imported JSZip and file-saver for gallery downloads
import { saveAs } from "file-saver";

import DownloadInvoiceButton from "../../components/InvoiceButton/DownloadInvoiceButton";
import DownloadReceipt from "../../components/InvoiceButton/DownloadReceipt";

import SectionPager from "../../components/SectionPager";
import SharedClientDashboard from "../../components/Dashboard/SharedClientDashboard";

export default function ClientDashboard() {
  const [searchParams, _setSearchParams] = useSearchParams();
  const checkoutSessionId = searchParams.get('checkout_session_id') || null;

  const { user, profile, setProfile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_changingPassword, setChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });


  // Will be used to display settings modal 
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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


  const handlePayment = async (invoice) => {
    const { id: invoiceId, session_id: sessionId, remaining: amountDue } = invoice;

    try {
      // retrieve session type info for product data
      const sessionResponse = await fetch(`http://localhost:5001/api/sessions/${sessionId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!sessionResponse.ok) throw new Error("Session not found.");

      const sessionData = await sessionResponse.json()
      const sessionTypeData = sessionData.SessionType;

      // check if entry already exists in Payment table for this invoice to avoid duplicates
      const { data: existingPayment } = await supabase
        .from("Payment")
        .select()
        .eq("invoice_id", invoiceId)
        .eq("type", "Rest")
        .maybeSingle();

      if (!existingPayment) {
        // create entry in Payment Table
        const { error: paymentError } = await supabase
          .from("Payment")
          .insert({
            invoice_id: invoiceId,
            provider: "Stripe",
            amount: amountDue + (amountDue * 0.0725), // add tax to amount
            currency: "USD",
            status: "Pending",
            type: "Rest"
          })
          .select()
          .single();

        if (paymentError) throw paymentError;
      }

      // create checkout session in backend
      const checkoutSession = await fetch("http://localhost:5001/api/checkout/rest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_data: {
            name: `${sessionTypeData.name} Session - Rest`,
            description: sessionTypeData.description,
          },
          price: amountDue,
          apply_tax: true,
          tax_rate: 7.25
        })
      });

      if (checkoutSession.ok) {
        const { id, url } = await checkoutSession.json();

        // update entry in Payment Table to link checkout session
        const { error: paymentError } = await supabase
          .from("Payment")
          .update({
            provider_payment_id: id,
            status: "Pending",
            created_at: new Date().toISOString(),
          })
          .eq("id", existingPayment.id)
          .select()
          .single();

        if (paymentError) throw paymentError;

        // redirect to stripe
        window.location.href = url;
      } else {
        const { error: errorMessage } = await checkoutSession.json();
        console.error("Stripe connection failed: ", errorMessage);
      }
    } catch (error) {
      console.error("Error initiating payment: ", error);
    }
  };

  // load all data that belongs to THIS user only
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      // 0) update invoices on checkout_session_success
      if (checkoutSessionId) {
        try {
          // get Payment table entry based on checkoutSessionId
          const { data: paymentData, error: paymentError } = await supabase
            .from("Payment")
            .select("invoice_id, amount, Invoice( Session( client_id ) )")
            .eq("provider_payment_id", checkoutSessionId)
            .single();

          if (paymentError) throw paymentError;

          const { invoice_id } = paymentData;
          const { client_id } = paymentData.Invoice.Session;

          // ensure checkout session belongs to user
          if (user.id === client_id) {
            const response = await fetch(`http://localhost:5001/api/checkout/${checkoutSessionId}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" }
            });
            const status = await response.json()
              .then((data) => {
                // console.log("Checkout session: ", data.session); // DEBUGGING
                return data.session.payment_status
              });
            
            // if session has been fully paid and processed
            if (status === "paid") {
              const now = new Date().toISOString();

              // update invoice and payment tables
              const { error: paymentError } = await supabase
                .from("Payment")
                .update({ status: "Paid", paid_at: now })
                .eq("provider_payment_id", checkoutSessionId)
                .single();

              const { error: invoiceError } = await supabase
                .from("Invoice")
                .update({ remaining: 0, status: "Paid", updated_at: now })
                .eq("id", invoice_id)
                .single();

              if (paymentError || invoiceError) throw (paymentError, invoiceError)
            }
          }
        } catch (error) {
          console.error("Payment Error:", error)
        }
      }

      // 1) active sessions for this user
      const { data: sessionRows, error: sesErr } = await supabase
        .from("Session")
        .select(
          "id, session_type_id, start_at, end_at, location_text, status, created_at"
        )
        .eq("client_id", user.id)
        .eq("is_active", true)
        .order("start_at", { ascending: false });

      if (sesErr) {
        console.error(sesErr);
        setSessions([]);
      } else {
        setSessions(sessionRows ?? []);
      }

      const sessionIds = sessionRows?.map((s) => s.id).filter(Boolean) ?? [];

      // 2) invoices for those sessions
      let invoiceRows = [];
      if (sessionIds.length > 0) {
        const { data, error } = await supabase
          .from("Invoice")
          .select(
            "id, session_id, invoice_number, issue_date, due_date, remaining, status, Payment(id), Session!inner(status)"
          )
          .in("session_id", sessionIds)
          .in("Session.status", ["Confirmed", "Completed"]) // ensure pending invoices aren't shown
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
      }
      setContracts(contractRows);

      // 5) notifications / reminders for this user (most recent first)
      if (sessionIds.length > 0) {
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
      }
      setLoading(false);
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
      console.error("User table update error:", error);
      setSaveError(error.message || "Could not save changes.");
      return;
    }

    // Update global profile in AuthContext so the whole website has the latest info
    setProfile(data);

    // Also update auth metadata so auth stays in sync with profile fields
    // Auth doesn't have first_name/last_name columns like the public user table
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        first_name: newFirstName,
        last_name: newLastName,
        phone: newPhone, // optional if wanted it in auth metadata too
      },
    });

    if (metaErr) {
      console.error("updateUser metadata error:", metaErr);
      setSaveError("Saved profile, but could not sync Auth profile data.");
      return;
    }

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

    // Get the current session to retrieve the access token for authentication(JWT)
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    // If we cannot get a valid token, stop and show error
    if (sessionErr || !sessionData?.session?.access_token) {
      setSaveError("No valid session token found. Please log in again.");
      return;
    }
    // Extract the Bearer token from the session
    const token = sessionData.session.access_token;

    // Constructing the full URL to the supabase edge function for user deletion
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-delete`;

    // Call the edge function using fetch and include the bearer token
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Required for authentication
      },
      body: JSON.stringify({ userId: user.id }), // Send user id in request body
    });

    // For debugging
    const text = await res.text();
    // console.log("user-delete raw status:", res.status);
    // console.log("user-delete raw body:", text);

    if (!res.ok) {
      setSaveError(text || "Could not delete account.");
      return;
    }

    //Clear profile, log user out, and redirect to homepage
    setProfile(null);
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // GALLERY DOWNLOAD FUNCTION //
  // download entire gallery as a ZIP file, ensured its with the authenticate client's own gallery
  const handleDownloadGallery = async (galleryId, galleryTitle) => {
    try {
      // CONSOLE DEBUG 
      // console.log('Starting download for gallery ID:', galleryId);

      // mark as downloading
      setDownloadingGalleries(prev => ({ ...prev, [galleryId]: true }));

      //const filePath = `photos/galleries/${galleryId}`;

      // 1) Fetch photos for this gallery
      const { data: photoList, error: photosError } = await supabase.storage
        .from('photos')
        .list(`galleries/${galleryId}`);

      // console.log(photoList);

      // error in fetching photos
      if (photosError) {
        console.error("Error fetching photos:", photosError);
        alert("Failed to fetch gallery photos. Please try again later.");
        return;
      }

      // no photos found in gallery message
      if (!photoList || photoList.length === 0) {
        alert("This gallery has no photos.");
        return;
      }

      // load photos first before heading into next part  
      let photos = [];

      photoList.forEach(async (photo) => {
        const { data: photoData, error: photoError } = await supabase.storage.from(`photos/galleries/${galleryId}`).download(photo.name);

        if (!photoError) {
          photos.push(photoData);
        }
      });
      // console.log(photos);

      // 2) Create a new ZIP file
      const zip = new JSZip();
      const folder = zip.folder(galleryTitle || "Gallery");

      // 3) Download each photo and add to ZIP
      let successCount = 0; //let i = 0; i < photos.length; i++
      for (const photo of photoList) {
        //const photo = photos[i];

        // CONSOLE DEBUG 
        // console.log(`Processing photo ${i + 1}:`, photo.filename);
        // console.log('Path:', photo.storage_path);

        try {
          const filePath = `galleries/${galleryId}/${photo.name}`;
          // get signed URL for secure access from Supabase Storage
          const { data: urlData, error: urlError } = await supabase.storage
            .from("photos") // assuming 'photos' is the bucket name
            .createSignedUrl(filePath, 3600); // URL valid for 1 hour

          // CONSOLE DEBUG 
          // console.log( 'URL result:', {urlData, urlError});

          if (urlError) {
            console.error(`Error getting URL for ${photo.name}:`, urlError);
            continue;
          }

          // fetch the photo as a blob
          const response = await fetch(urlData.signedUrl);
          if (!response.ok) {
            console.error(`Error downloading ${photo.name}`);
            continue;
          }

          const blob = await response.blob();
          // add to zip folder
          folder.file(photo.name, blob);
          successCount++;

        } catch (error) {
          console.error(`Error processing ${photo.name}:`, error);
        }
      }

      if (successCount === 0) {
        alert("Failed to download any photos from this gallery.");
        return;
      }

      // 4) generate the ZIP file and trigger download
      // CONSOLE DEBUG (keep)
      // console.log('Generating ZIP...');
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFilename = `${galleryTitle || "gallery"}_${new Date().getTime()}.zip`;

      saveAs(zipBlob, zipFilename);

      if (successCount < photoList.length) {
        alert(`Downloaded ${successCount} out of ${photoList.length} photos. Some files failed.`);
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
      <SharedClientDashboard
      fullName={fullName}
      notifications={notifications}
      sessions={sessions}
      invoices={invoices}
      galleries={galleries}
      contracts={contracts}
      loading={loading}
      onPayInvoice={handlePayment}
      onDownloadGallery={handleDownloadGallery}
      downloadingGalleries={downloadingGalleries}
      showPayButton={true}
      showDownloadButton={true}
      showSettingsButton={true}
      onOpenSettings={() => setShowSettings(true)}
      />

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
              <h2 className="text-center text-2xl font-sans font-semibold mb-4">
                Account Settings
              </h2>
              {saveError && (
                <p className="text-center text-xs text-red-600 mb-2">{saveError}</p>
              )}
              {saveSuccess && (
                <p className="text-center text-xs text-green-700 mb-2">{saveSuccess}</p>
              )}

              {/* Modal Content */}
              <div className="flex flex-col font-sans text-md">
                <label className="mb-4">
                  <p className="text-center text-brown py-3">First Name *</p>
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
                  <p className="text-center text-brown py-3">Last Name *</p>
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
                  <p className="text-center text-brown py-3">Email *</p>
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
                  <p className="text-center text-brown py-3">Phone Number *</p>
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
                  <p className="text-center text-brown py-3">Password *</p>

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
                    // console.log("Delete account clicked");
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

