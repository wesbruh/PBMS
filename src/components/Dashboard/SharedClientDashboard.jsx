import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import DownloadInvoiceButton from "../InvoiceButton/DownloadInvoiceButton";
import DownloadReceipt from "../InvoiceButton/DownloadReceipt";
import SectionPager from "../SectionPager";

function SharedClientDashboard({
  fullName,
  notifications = [],
  sessions = [],
  invoices = [],
  galleries = [],
  contracts = [],
  loading = false,
  onPayInvoice,
  onDownloadGallery,
  downloadingGalleries = {},
  showPayButton = false,
  showDownloadButton = false,
  showSettingsButton = false,
  onOpenSettings,
  isAdminView = false,
}) {
  const ITEMS_PER_PAGE = 3;

  const [pendingPage, setPendingPage] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);
  const [unpaidPage, setUnpaidPage] = useState(0);
  const [paidPage, setPaidPage] = useState(0);

  useEffect(() => {
    setPendingPage(0);
    setUpcomingPage(0);
    setCompletedPage(0);
  }, [sessions]);

  useEffect(() => {
    setUnpaidPage(0);
    setPaidPage(0);
  }, [invoices]);

  const pendingSessions = sessions.filter(
    (s) => s.status?.toLowerCase() === "pending"
  );

  const upcomingSessions = sessions.filter(
    (s) => s.status?.toLowerCase() === "confirmed"
  );

  const completedSessions = sessions.filter(
    (s) => s.status?.toLowerCase() === "completed"
  );

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status?.toLowerCase() !== "paid"
  );

  const paidInvoices = invoices.filter(
    (inv) => inv.status?.toLowerCase() === "paid"
  );

  const pendingVisible = pendingSessions.slice(
    pendingPage * ITEMS_PER_PAGE,
    pendingPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const upcomingVisible = upcomingSessions.slice(
    upcomingPage * ITEMS_PER_PAGE,
    upcomingPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const completedVisible = completedSessions.slice(
    completedPage * ITEMS_PER_PAGE,
    completedPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const unpaidVisible = unpaidInvoices.slice(
    unpaidPage * ITEMS_PER_PAGE,
    unpaidPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const paidVisible = paidInvoices.slice(
    paidPage * ITEMS_PER_PAGE,
    paidPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-sm text-neutral-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl md:text-4xl font-serif text-brown">
          Welcome back{fullName ? `, ${fullName}` : ""}.
        </h1>
        <p className="text-sm md:text-base text-neutral-600 max-w-2xl">
          Here are the sessions, invoices, galleries, and forms/contracts for
          this client.
        </p>

        {showSettingsButton && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="cursor-pointer self-end mt-3 px-4 py-2 bg-white text-black text-sm font-sans font-semibold border border-black rounded-md transition hover:bg-gray-200"
          >
            Account Settings
          </button>
        )}
      </header>

      <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-serif font-bold tracking-wider text-brown">
            Reminders
          </h2>
          <span className="font-sans text-xs text-neutral-500">
            Showing latest {notifications.length || 0}
          </span>
        </div>

        {notifications.length === 0 ? (
          <p className="font-sans text-sm text-neutral-500">
            You're all caught up. New reminders will appear here.
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
                    className={`text-[11px] px-2 py-1 rounded border ${
                      n.status === "sent"
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

      <div className="space-y-6">
        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-xl font-serif font-bold tracking-wider text-brown mb-2">
            Your Sessions
          </h2>
          <div className="border-b border-[#E7DFCF] mb-5"></div>

          {sessions.length === 0 ? (
            <p className="text-sm text-neutral-500">
              You don't have any sessions scheduled yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:border-r lg:pr-6 border-[#E7DFCF] w-full">
                <h3 className="text-md font-serif font-semibold tracking-wider text-brown mb-3">
                  Pending
                </h3>
                {pendingSessions.length === 0 ? (
                  <p className="text-sm font-sans text-neutral-500">
                    No pending sessions.
                  </p>
                ) : (
                  <div>
                    <ul className="space-y-3 w-full">
                      {pendingVisible.map((s) => (
                        <li
                          key={s.id}
                          className="w-full bg-white border rounded-md px-4 py-2 flex items-center justify-between"
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
                          <span className="shrink-0 text-xs px-3 py-1 rounded border font-medium bg-yellow-100 border-yellow-300 text-yellow-700">
                            {s.status ?? "pending"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <SectionPager
                      page={pendingPage}
                      setPage={setPendingPage}
                      totalItems={pendingSessions.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  </div>
                )}
              </div>

              <div className="lg:border-r lg:pr-6 border-[#E7DFCF]">
                <h3 className="text-md font-serif font-semibold tracking-wider text-brown mb-3">
                  Upcoming
                </h3>
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm font-sans text-neutral-500">
                    No upcoming sessions.
                  </p>
                ) : (
                  <div>
                    <ul className="space-y-3 w-full">
                      {upcomingVisible.map((s) => (
                        <li
                          key={s.id}
                          className="w-full bg-white border rounded-md px-4 py-2 flex items-center justify-between"
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
                          <span className="shrink-0 text-xs px-3 py-1 rounded border font-medium bg-green-100 border-green-300 text-green-700">
                            {s.status ?? "confirmed"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <SectionPager
                      page={upcomingPage}
                      setPage={setUpcomingPage}
                      totalItems={upcomingSessions.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  </div>
                )}
              </div>

              <div className="lg:pr-6">
                <h3 className="text-md font-serif font-semibold tracking-wider text-brown mb-3">
                    Completed
                </h3>
                {completedSessions.length === 0 ? (
                  <p className="text-sm font-sans text-neutral-500">
                    No completed sessions.
                  </p>
                ) : (
                  <div>
                    <ul className="space-y-3 w-full">
                      {completedVisible.map((s) => (
                        <li
                          key={s.id}
                          className="w-full bg-white border rounded-md px-4 py-2 flex items-center justify-between"
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
                          <span className="shrink-0 text-xs px-3 py-1 rounded border font-medium bg-purple-100 text-purple-800 border-purple-200">
                            {s.status ?? "completed"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <SectionPager
                      page={completedPage}
                      setPage={setCompletedPage}
                      totalItems={completedSessions.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-xl font-serif font-bold tracking-wider text-brown mb-2">
            Invoices
          </h2>
          <div className="border-b border-[#E7DFCF] mb-5"></div>

          {invoices.length === 0 ? (
            <p className="text-sm font-sans text-neutral-500">
              No invoices yet. You'll see them here when they're issued.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:border-r lg:pr-6 border-[#E7DFCF]">
                <h3 className="font-serif font-semibold text-md text-brown mb-3">
                  Unpaid
                </h3>
                {unpaidInvoices.length === 0 ? (
                  <p className="text-sm font-sans text-neutral-500">
                    No unpaid invoices.
                  </p>
                ) : (
                  <div>
                    <ul className="space-y-3">
                      {unpaidVisible.map((inv) => (
                        <li
                          key={inv.id}
                          className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                        >
                          <div className="flex-col w-full">
                            <div className="flex w-full">
                              <div className="flex flex-row gap-3">
                                <p className="text-sm text-brown font-semibold">
                                  Invoice No.{" "}
                                  {inv.invoice_number || inv.id.slice(0, 6)}
                                </p>
                                <DownloadInvoiceButton invoiceId={inv.id} />
                              </div>

                              {showPayButton && onPayInvoice && (
                                <div className="flex relative mx-auto lg:mr-0">
                                  <div className="flex lg:absolute lg:right-5">
                                    <button
                                      type="button"
                                      onClick={() => onPayInvoice(inv)}
                                      className="px-2 py-1 md:px-4 flex bg-brown rounded text-xs md:text-sm text-white font-bold hover:bg-[#AB8C4B] cursor-pointer"
                                    >
                                      Pay
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-3 lg:flex-row mx-2 mt-2">
                              <div className="flex flex-row gap-2 items-center w-full lg:w-1/5 mr-4">
                                <span className="flex w-3 h-3 rounded-full border bg-red-100 border-red-300"></span>
                                <div className="flex text-sm font-semibold text-red-700">
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
                                    Amount Due
                                  </p>
                                  <p className="text-sm text-neutral-500">
                                    ${Number(inv.remaining ?? 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <SectionPager
                      page={unpaidPage}
                      setPage={setUnpaidPage}
                      totalItems={unpaidInvoices.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  </div>
                )}
              </div>

              <div className="lg:pr-6">
                <h3 className="font-serif font-semibold text-md text-brown mb-3">
                  Paid
                </h3>
                {paidInvoices.length === 0 ? (
                  <p className="text-sm font-sans text-neutral-500">
                    No paid invoices.
                  </p>
                ) : (
                  <div>
                    <ul className="space-y-3">
                      {paidVisible.map((inv) => (
                        <li
                          key={inv.id}
                          className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                        >
                          <div className="flex-col w-full">
                            <div className="flex w-full">
                              <div className="flex flex-row gap-3">
                                <p className="text-sm text-brown font-semibold">
                                  Invoice No.{" "}
                                  {inv.invoice_number || inv.id.slice(0, 6)}
                                </p>
                                <DownloadInvoiceButton invoiceId={inv.id} />
                                <DownloadReceipt invoiceId={inv.id} />
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 lg:flex-row mx-2 mt-2">
                              <div className="flex flex-row gap-2 items-center w-full lg:w-1/5 mr-4">
                                <span className="flex w-3 h-3 rounded-full border bg-green-100 border-green-300"></span>
                                <div className="flex text-sm font-semibold text-green-700">
                                  {inv.status ?? "Paid"}
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
                                    Amount Due
                                  </p>
                                  <p className="text-sm text-neutral-500">
                                    $0.00
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <SectionPager
                      page={paidPage}
                      setPage={setPaidPage}
                      totalItems={paidInvoices.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-xl font-serif font-bold tracking-wider text-brown mb-3">
            Galleries
          </h2>
          {galleries.length === 0 ? (
            <p className="text-sm font-sans text-neutral-500">
              No galleries have been published yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {galleries.map((g) => {
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

                    <div className="flex items-center gap-2">
                      {g.is_password_protected ? (
                        <span className="text-xs px-2 py-1 rounded bg-neutral-100 border text-neutral-700">
                          Protected
                        </span>
                      ) : null}

                      {showDownloadButton && onDownloadGallery && (
                        <button
                          type="button"
                          onClick={() => onDownloadGallery(g.id, g.title)}
                          disabled={isDownloading}
                          className={`text-xs px-3 py-1 rounded border border-black font-semibold transition ${
                            isDownloading
                              ? "bg-neutral-200 text-neutral-500 cursor-wait"
                              : "bg-[#446780] hover:bg-[#98c0dc] cursor-pointer text-white"
                          }`}
                        >
                          {isDownloading ? "Downloading..." : "Download"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col bg-off-white border border-[#E7DFCF] rounded-md p-5 shadow-sm">
          <h2 className="text-xl font-serif font-bold tracking-wider text-brown mb-3">
            Forms & Contracts
          </h2>

          <div className="flex-col w-full space-y-2">
            <div className="relative">
              {contracts.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-sans text-neutral-500">
                    No new contracts have been issued yet.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {contracts.map((c) => (
                    <li
                      key={c.id}
                      className="bg-white border rounded-md px-3 py-2 flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-brown font-semibold">
                          {c.ContractTemplate?.name || c.title || "Contract"}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                        Created{" "}
                        {c.created_at
                            ? new Date(c.created_at).toLocaleDateString()
                            : "—"}
                        {" • "}Updated{" "}
                        {c.updated_at
                        ? new Date(c.updated_at).toLocaleDateString()
                        : "—"}
                        </p>

                        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded border font-medium
                              border
                            ${ (c.status || "Signed").toLowerCase() === "signed"
                            ? "bg-green-100 border-green-300 text-green-700"
                            : "bg-yellow-100 border-yellow-300 text-yellow-700"}`}>
                            {(c.status && c.status.trim()) ? c.status : "Signed"}
                        </span>
                      </div>
                      {isAdminView && (
                        <Link
                           to={`/admin/contracts/${c.id}`}
                            className="text-xs px-3 py-2 rounded border border-black bg-white hover:bg-neutral-100 transition"
                            >
                                View Signed Document
                        </Link>
                    )}

                    {!isAdminView && (
                        <Link
                            to={`/dashboard/contracts/${c.id}`}
                            className="text-xs px-3 py-1 rounded bg-brown text-white hover:bg-[#AB8C4B] transition border-2 border-black"
                        >
                            Review & Sign
                        </Link>
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-row-reverse relative">
              <div className="flex relative">
                {!isAdminView && (
                  <Link
                    to="/dashboard/contracts"
                    className="text-xs px-2 py-1 rounded bg-[#446780] hover:bg-[#98c0dc] text-white font-semibold transition border border-black text-center"
                  >
                    Go to Contracts
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SharedClientDashboard;