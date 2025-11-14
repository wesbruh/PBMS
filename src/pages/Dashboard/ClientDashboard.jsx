// src/pages/Dashboard/ClientDashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Will be used to dissplay settings modal 
  const [showSettings, setShowSettings] = useState(false);

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

      setLoading(false);
    }

    loadData();
  }, [user]);

  const fullName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
      : user?.email;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center font-serif text-brown">
        Loading your dashboard...
      </div>
    );
  }

console.log("AUTH USER ID:", user?.id);
console.log("PROFILE ROW:", profile);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      {/* header */}
      <header className="flex flex-col gap-1">
        <p className="text-sm tracking-[0.25em] text-brown uppercase">
          Client Area
        </p>
        <h1 className="text-3xl md:text-4xl font-serif text-brown">
          Welcome back{fullName ? `, ${fullName}` : ""}.
        </h1>
        <p className="text-sm md:text-base text-neutral-600 max-w-2xl">
          Here are your sessions, invoices, galleries, and forms/contracts. Only
          your information is shown.
        </p>

        {/* Settings button*/}
        <button
          type = "button"
          onClick={() => setShowSettings(true)}
          className="self-end mt-3 px-4 py-2 bg-off-white text-brown text-sm font-mono border-2 border-black rounded-md hover:opacity-80 transition">
          Account Settings
        </button>
      </header>

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
                  <div>
                    <p className="text-sm text-brown font-semibold">
                      Invoice #{inv.invoice_number || inv.id.slice(0, 6)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Due{" "}
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm text-neutral-700">
                      ${inv.total ?? 0}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded border ${
                        inv.status === "paid"
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-neutral-100 border-neutral-200 text-neutral-700"
                      }`}
                    >
                      {inv.status ?? "pending"}
                    </span>
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
              {galleries.map((g) => (
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
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Forms / Contracts */}
        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-lg font-serif text-brown mb-3">
            Forms & Contracts
          </h2>
          {contracts.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No contracts have been issued to you yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {contracts.map((c) => (
                <li
                  key={c.id}
                  className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm text-brown font-semibold">
                      Contract
                    </p>
                    <p className="text-xs text-neutral-500">
                      {c.signed_at
                        ? `Signed ${new Date(
                            c.signed_at
                          ).toLocaleDateString()}`
                        : "Not signed yet"}
                    </p>
                  </div>
                  <a
                    href={c.pdf_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-3 py-1 rounded bg-brown text-white hover:bg-[#AB8C4B] transition border-2 border-black"
                  >
                    {c.signed_at ? "View" : "Open"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/*Settings Modal*/ }
      {showSettings &&(
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e)=>{if(e.target === e.currentTarget) setShowSettings(false);}}>
          
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50">
          </div>

          {/* Dialog */}
          <div className = "relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border-2 border-black rounded-md shadow-lg">
            <h2 className="text-center text-2xl font-serif font-extralight mb-4">
              Account Settings
            </h2>

          {/* Modal Content */}
            <div className="flex flex-col font-mono text-xs">
              <label className ="mb-4">
                <p className="text-center text-brown py-3">FIRST NAME *</p>
                <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                  {profile?.first_name || "Not set"}
                </div>
              </label>

              <label className ="mb-4">
                <p className="text-center text-brown py-3">LAST NAME *</p>
                <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                  {profile?.last_name || "Not set"}
                </div>
              </label>

              <label className="mb-4">
                <p className="text-center text-brown py-3">EMAIL *</p>
                <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                  {user?.email || "N/A"}
                </div>
              </label>

              <label className="mb-4">
                <p className="text-center text-brown py-3">PHONE NUMBER *</p>
                <div className="w-full text-center border-neutral-200 border-b py-3 text-sm">
                  {profile?.phone || "N/A"}
                </div>
              </label>


            <label className="mb-4">
             <p className="text-center text-brown py-3">PASSWORD *</p>
             <input
              type="password"
              value="placeholderpassword"
              readOnly
              disabled
              className="w-full text-center border-neutral-200 border-b py-3 text-sm bg-transparent cursor-default"/>
            </label>
          </div>

          {/* Close Button */ }
          <div className ="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-white text-black text-sm font-sans border-2 border-black rounded-md hover:opacity-80 transition">
              Close
            </button>
            <button 
              type="button"
              onClick ={() => { /* Will implement update functionality later */ }}
              className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans border-2 border-black rounded-md transition">

                Delete Account
            </button>
          </div>

          {/* Close Modal */}
          <button
            type="button"
            aria-label = "Close"
            onClick={() => setShowSettings(false)}
            className="absolute top-2 right-2 px-2 py-1 font-sans text-sm border-2 border-black rounded-md bg-white hover:opacity-80">
            x
          </button>
         </div>
        </div>
      )}
    </div>
  );
}
