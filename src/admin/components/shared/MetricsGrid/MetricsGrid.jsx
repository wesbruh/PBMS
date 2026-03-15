import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabaseClient";

// metric cards
function MetricCard({ label, value, sub, accent, loading }) {
  const accentMap = {
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-rose-50 border-rose-200 text-rose-700",
  };

  // pretty standard styling for desktop and mobile, truncates and uses hidden overflow if screen is reallyyy downsized
  return (
    <div
      className={`rounded-xl border p-3 md:p-4 flex flex-col gap-1 min-w-0 overflow-hidden ${accentMap[accent]}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide opacity-70 truncate">
        {label}
      </span>
      {/* shows a subtle pulse placeholder while data is loading */}
      {loading ? (
        <span className="h-8 w-24 bg-current opacity-10 rounded animate-pulse" />
      ) : (
        <span className="text-lg md:text-2xl font-bold truncate">{value}</span>
      )}
      {sub && <span className="text-xs opacity-60 truncate">{sub}</span>}
    </div>
  );
}

// metric cards grid
function MetricsGrid() {
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    totalRevenue: 0,
    pendingSessions: 0,
    pendingInvoices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // run all five Supabase queries in parallel for the metrics
      const [
        totalSessionsRes,
        pendingSessionsRes,
        pendingInvoicesRes,
        // paidInvoicesRes,
        paidPaymentsRes,
      ] = await Promise.all([
        // 1) all time total of COMPLETED sessions
        supabase
        .from("Session")
        .select("*", { count: "exact", head: true })
        .eq("status", "Completed"),
        // 2) pending sessions waiting for admin confirmation
        supabase
          .from("Session")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending"),
        // 3) pending invoices - unpaid  CHNAGEEEE TOOO CHECK FOR REMAINING BALANCE 
        supabase
          .from("Invoice")
          .select("*", { count: "exact", head: true })
          .eq("status", "Unpaid"),
        // 4) paid invoices - sum the "total" column from Invoice for revenue
        //supabase
        // .from("Invoice")
        // .select("total")
        // .eq("status", "Paid"),
        // 5) paid payments - sum the "amount" column from Payment for revenue"
        supabase.from("Payment").select("amount").eq("status", "Paid"),
      ]);

      // check for errors on any query
      if (totalSessionsRes.error) {
        throw totalSessionsRes.error;
      }
      if (pendingSessionsRes.error) {
        throw pendingSessionsRes.error;
      }
      if (pendingInvoicesRes.error) {
        throw pendingInvoicesRes.error;
      }
      // if (paidInvoicesRes.error) {
      //   throw paidInvoicesRes.error;
      // }
      if (paidPaymentsRes.error) {
        paidPaymentsRes.error;
      }

      // sum paid invoices + paid payments together for total revenue
      // const invoiceRev = paidInvoicesRes.data.reduce(
      //   (sum, row) => sum + (row.total ?? 0),
      //   0,
      // );
      const paymentRev = paidPaymentsRes.data.reduce(
        (sum, row) => sum + (row.amount ?? 0),
        0,
      );
      const totalRevenue = paymentRev; // invoiceRev + 

      setMetrics({
        totalSessions: totalSessionsRes.count ?? 0,
        pendingSessions: pendingSessionsRes.count ?? 0,
        pendingInvoices: pendingInvoicesRes.count ?? 0,
        totalRevenue,
      });
    } catch (err) {
      console.error("MetricsGrid fetch error:", err);
      setError("Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-3 md:px-6 pt-5 pb-4">
        <p className="col-span-4 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-3 md:px-6 pt-5 pb-4">
      <MetricCard
        label="Total Completed Sessions"
        value={metrics.totalSessions}
        sub="All Time"
        accent="blue"
        loading={loading}
      />
      <MetricCard
        label="Revenue Collected"
        value={`$${(metrics.totalRevenue ?? 0).toLocaleString()}`}
        sub="All Time"
        accent="green"
        loading={loading}
      />
      <MetricCard
        label="Pending Sessions"
        value={metrics.pendingSessions}
        sub="Waiting for Confirmation"
        accent="amber"
        loading={loading}
      />
      <MetricCard
        label="Pending Invoices"
        value={metrics.pendingPayment}
        sub="Awaiting Payment"
        accent="red"
        loading={loading}
      />
    </div>
  );
}
export default MetricsGrid;
