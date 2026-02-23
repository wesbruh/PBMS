import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";

import JSZip from "jszip";  // imported JSZip and file-saver for gallery downloads
import { saveAs } from "file-saver";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";
import DownloadInvoiceButton from "../../../components/InvoiceButton/DownloadInvoiceButton";


function ContactView() {
  const { id: userId } = useParams();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");

  const [sessions, setSessions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [downloadingGalleries, setDownloadingGalleries] = useState({});

  // check if user exists
  useEffect(() => {
    if (!userId) return;

    async function checkUser() {
      const { data: userData, error } = await supabase.from("User").select().eq("id", userId).maybeSingle();

      if (error) {
        setUser(false);
        return;
      }

      const name = `${userData.first_name} ${userData.last_name}`

      setUser(true);
      setFullName(name);
    }

    checkUser();
  }, [userId, user, fullName]
  );

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
        .eq("client_id", userId)
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
          .select(
            "id, session_id, status, signed_at, pdf_url"
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
      <>
        <div className="flex my-10 md:my-14 min-h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg">
          <div className="flex w-1/5 min-w-[200px]">
            <Sidebar />
          </div>
          <div className="flex w-full shadow-inner rounded-lg">
            <Frame>
              <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
                Loading dashboard...
              </div>
            </Frame>
          </div>
        </div>
      </>
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
      // console.log('Generating ZIP...');

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFilename = `${galleryTitle || "gallery"}_${new Date().getTime()}.zip`;

      // CONSOLE DEBUG (keep)
      // console.log('Saving as:', zipFilename);

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
    <div className="flex my-10 md:my-14 h-[65vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex w-1/5 min-w-50">
        <Sidebar />
      </div>

      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="w-screen flex flex-col gap-5 my-10 mx-2 overflow-scroll">
            {/* header */}
            <header className="mx-auto md:mx-2">
              <h1 className="text-3xl md:text-4xl font-serif text-brown">
                {fullName}
              </h1>
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
                          <div className="flex">
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
                          </div>

                          <div className="flex flex-col gap-3 mx-2 mt-2">
                            <div className='flex flex-row gap-2 items-center w-full lg:w-1/5 mr-4'>
                              <span
                                className={`flex min-w-3 min-h-3 rounded-full border ${inv.status === "Paid"
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
              <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
                <h2 className="text-lg font-serif text-brown mb-3">Forms & Contracts</h2>

                {contracts.length === 0 ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">
                      No contracts have been issued to you yet.
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
                            {c.title || "Contract"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {c.status === "signed"
                              ? `Signed ${c.updated_at ? new Date(c.updated_at).toLocaleDateString() : ""}`
                              : `Status: ${c.status || "draft"}`}
                          </p>
                        </div>

                        {c.status === "signed" && c.signed_pdf_url ? (
                          <a
                            href={c.signed_pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-3 py-1 rounded bg-brown text-white hover:bg-[#AB8C4B] transition border-2 border-black"
                          >
                            View Signed PDF
                          </a>
                        ) : (
                          <Link
                            to={`/dashboard/contracts?focus=${c.id}`}
                            className="text-xs px-3 py-1 rounded bg-brown text-white hover:bg-[#AB8C4B] transition border-2 border-black"
                          >
                            Review &amp; Sign
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default ContactView;