import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LoaderCircle } from "lucide-react";

// for x-axis
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
// for full month names in tool tip
const fullMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

//all months start at 0 until data fills in
const emptyMonths = monthNames.map((month) => ({
  month,
  actual: 0, // paid revenue (past months and current month)
  projected: 0, // remaining balance on confirmed sessions only for current or future months. i.e not yet paid in full
}));

// format currency. always shows 2 decimal places
const formatCurrency = (v) =>
  (v ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

// time zone safe month index from a timestamptz string
function monthFromTs(ts) {
  return parseInt(ts.substring(5, 7), 10) - 1; // 0-based
}

// custom tool tip on hover of bar. added projected label now
function CustomToolTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const actual = payload.find((p) => p.dataKey == "actual")?.value ?? 0;
  const projected = payload.find((p) => p.dataKey == "projected")?.value ?? 0;
  const total = actual + projected;

  if (actual === 0 && projected === 0) return null;

  // const val = payload[0].value;
  // if (!val) {
  //   return null;
  // }

  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-30">
      <p className="font-semibold mb-1">
        {fullMonthNames[monthNames.indexOf(label)]}{" "}
      </p>{" "}
      {/* month */}
      {actual > 0 && (
        <p className="flex justify-between gap-1">
          <span className="text-amber-300">Paid:</span>
          <span className="text-amber-300">{formatCurrency(actual)}</span>
        </p>
      )}
      {projected > 0 && (
        <p className="flex justify-between gap-3">
          <span className="text-blue-300">Projected: Remaining Due</span>
          <span className="text-blue-300">{formatCurrency(projected)}</span>
        </p>
      )}
      <span className="flex mt-1 mb-1 border-t border-gray-500"></span>
      {total > 0 && (
        <p className="flex justify-between gap-3">
          <span className="text-green-300">Total:</span>
          <span className="text-green-300">{formatCurrency(total)}</span>
        </p>
      )}
    </div>
  );
}

// custom x-axis tick that highlights current month
function CustomXTick({ x, y, payload, currentMonth }) {
  const isCurrent = monthNames.indexOf(payload.value) === currentMonth;

  return (
    <text
      x={x}
      y={y + 10}
      textAnchor="middle"
      fontSize={11}
      fontWeight={isCurrent ? "700" : "400"}
      fill={isCurrent ? "#d97706" : "#9ca3af"}
    >
      {payload.value}
    </text>
  );
}

// adjust custom bar section for "actual" bar and "projected" bar side by side
// custom bar, for 'shape' field in <Bar/>.
function RoundedBar({ x, y, width, height, fill }) {
  if (!height || height <= 0) {
    return null;
  }
  const radius = 4;
  // actual bar shape, rounded corners and stuff
  return (
    <path
      d={`
        M ${x},${y + radius}
        Q ${x},${y} ${x + radius},${y}
        L ${x + width - radius},${y}
        Q ${x + width},${y} ${x + width},${y + radius}
        L ${x + width},${y + height}
        L ${x},${y + height}
        Z
        `}
      fill={fill}
    />
  );
}

function ActualBar(props) {
  const { x, y, width, height, index } = props;
  if (!height || height <= 0) {
    return null;
  }
  const curr_month = new Date().getMonth();
  const fill =
    index < curr_month
      ? "#fcd34d"
      : index === curr_month
        ? "#f59e0b"
        : "#f3f4f6";

  return <RoundedBar x={x} y={y} width={width} height={height} fill={fill} />;
}

function ProjectedBar(props) {
  const { x, y, width, height, index } = props;
  const curr_month = new Date().getMonth();
  if (!height || height <= 0) {
    if (index > curr_month) {
      // future months with no projected data. invisible bar keeps tooltip active
      return <rect x={x} y={y} width={width} height={1} fill="transparent" />;
    }
    return null;
  }
  return (
    <RoundedBar x={x} y={y} width={width} height={height} fill="#93c5fd" />
  );
}

// main component
function YTDBarChart({ title = "Year-to-Date Average Sales", subtitle }) {
  const [data, setData] = useState(emptyMonths);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchYTDData();
  }, []);
  const fetchYTDData = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();

      // fetch paid invoices and paid payments for current year in parallel
      // this is similar to the MetricsGrid logic
      // will adjust later for calculating paid deposit invoices
      // >= current year from jan 1st 2026 and <= jan 1st 2027
      const [paymentsRes, sessionsRes] = await Promise.all([
        // supabase
        //   .from("Invoice")
        //   .select("total, created_at")
        //   .eq("status", "Paid")
        //   .gte("created_at", `${currentYear}-01-01`)
        //   .lt("created_at", `${currentYear + 1}-01-01`),
        // 1) actual paid payments for current year
        supabase
          .from("Payment")
          .select("amount, paid_at")
          .eq("status", "Paid")
          .gte("paid_at", `${currentYear}-01-01`)
          .lt("paid_at", `${currentYear + 1}-01-01`),

        // 2) confirmed sessions from curretn date onwards for projected revenue using the Session_Type base prive as the estimate
        supabase
          .from("Session")
          .select("start_at, Invoice ( remaining )")
          .eq("status", "Confirmed")
          .gte("start_at", `${currentYear}-01-01`)
          .lt("start_at", `${currentYear + 1}-01-01`),
      ]);
      // if (invoiceRes.error) {
      //   throw invoiceRes.error;
      // }
      if (paymentsRes.error) {
        throw paymentsRes.error;
      }
      if (sessionsRes.error) {
        throw sessionsRes.error;
      }
      // accumulate revenue per month
      const actualTotals = Array(12).fill(0);
      const projectedTotals = Array(12).fill(0);

      // (invoiceRes.data ?? []).forEach((row) => {
      //   const m = new Date(row.created_at).getMonth();
      //   monthlyTotals[m] += row.total ?? 0;
      // });

      // actual paid revenue
      (paymentsRes.data ?? []).forEach((row) => {
        if (!row.paid_at) return;
        const m = monthFromTs(row.paid_at);
        actualTotals[m] += row.amount ?? 0;
      });

      // projected revenue
      (sessionsRes.data ?? []).forEach((row) => {
        if (!row.start_at) return;
        const remaining = row.Invoice?.remaining ?? 0;
        if (remaining <= 0) return;
        const m = monthFromTs(row.start_at);
        projectedTotals[m] += remaining;
      });

      setData(
        monthNames.map((month, i) => ({
          month,
          actual: actualTotals[i],
          projected: projectedTotals[i],
        })),
      );
    } catch (err) {
      console.error("YTDBarChart fetch error:", err);
      setError("Failed to load chart data.");
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const year = new Date().getFullYear();
  const resolvedSubtitle = subtitle ?? `Monthly session revenue - ${year}`;

  // automatically compute YTD average from months that actually have data use
  const activeMonths = data.filter((d) => d.actual > 0);
  const computedAvg =
    activeMonths.length > 0
      ? parseFloat(
          (
            activeMonths.reduce((sum, d) => sum + d.actual, 0) /
            activeMonths.length
          ).toFixed(2),
        )
      : 0;

  // summary stats
  const highestEntry = data.reduce(
    (best, d) => (d.actual > best.actual ? d : best),
    data[0],
  );

  // DYNAMIC Y-AXIS. compute the ceiling rounded up to the nearest 1000
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.actual, d.projected)),
    0,
  );
  const ceiling = Math.ceil(maxVal / 1000) * 1000;
  // build ticks dynamically: [0, 1000, 2000, ..., ceiling] to auto adjust for total revenue if ever goes above the ceiling
  const ticks = Array.from({ length: ceiling / 1000 + 1 }, (_, i) => i * 1000);
  // format tick labels, handles thousands, hundred-thousands, and millions cleanly just in case. tested this and no longer throws errors
  const formatTick = (v) => {
    if (v === 0) {
      return "$0";
    }
    if (v >= 1000000) {
      return `$${(v / 1000000).toFixed(1)}M`; // millions, 1000000, etc
    }
    if (v >= 100000) {
      return `$${(v / 1000).toFixed(0)}k`; // hundred thousands, 100k, etc
    }
    if (v >= 1000) {
      return `$${v / 1000}k`; // $1k, $2k
    }
    return `$${v}`; // fallback for sub-$1k
  };
  // adjust y-axis width, must be a fixed number and depends on y-tick size
  const yAxisWidth =
    maxVal >= 1000000
      ? 65
      : maxVal >= 100000
        ? 55
        : maxVal >= 10000
          ? 50
          : maxVal >= 1000
            ? 45
            : 38;

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl p-3 md:mt-3 shadow-sm flex flex-col overflow-hidden h-full md:h-[75%]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate">
            {title}
          </h2>
          <p className="text-xs text-gray-400 font-semibold truncate">
            {resolvedSubtitle}
          </p>
        </div>
        <div className="text-right shrink-0 ">
          {/* loading state similar to metricsgrid */}
          {loading ? (
            <span className="h-6 w-16 bg-gray-100 rounded animate-pulse inline-block" />
          ) : (
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(computedAvg)}
            </p>
          )}
          <p className="text-xs text-gray-400 ">YTD Avg/month</p>
        </div>
      </div>

      {/* loading state similar to metricsgrid */}
      {loading ? (
        <div className="grow flex flex-col justify-center items-center text-gray-500">
          <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
          <p className="text-md">Loading chart...</p>
        </div>
      ) : error ? (
        <div className="grow flex flex-col text-center items-center justify-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
        </div>
      ) : (
        <>
          {/* Chart. the responsive container needs a defined height according to docs  */}
          <div className="h-45 md:h-68 md:w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                barCategoryGap="15%" // space between month groups
                barGap={2} // gap between the two bars
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#f3f4f6"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={(props) => (
                    <CustomXTick {...props} currentMonth={currentMonth} />
                  )}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#d1d5db" }}
                  ticks={ticks}
                  tickFormatter={formatTick}
                  width={yAxisWidth} // fixed render of bar chart
                />
                <Tooltip
                  content={<CustomToolTip />}
                  cursor={{ fill: "#fef3c7" }}
                />

                {/* Left bar. Actual paid revenue */}
                <Bar
                  dataKey="actual"
                  maxBarSize={18}
                  shape={(props) => <ActualBar {...props} />}
                />

                {/* Right bar. Projected revenue from confirmed upcoming sessions*/}
                <Bar
                  dataKey="projected"
                  maxBarSize={18}
                  shape={(props) => <ProjectedBar {...props} />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* footer summary */}
          <div className="flex flex-wrap items-center gap-4 mt-1 pt-3 border-t border-gray-100 overflow-hidden">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Highest Month</p>
              <p className="text-sm font-semibold text-gray-700 truncate">
                {highestEntry.month} - {formatCurrency(highestEntry.actual)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Months tracked</p>
              <p className="text-sm font-semibold text-gray-700">
                {activeMonths.length} / 12
              </p>
            </div>
            {/* legend */}
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                <span className="text-xs text-gray-400">Current</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" />
                <span className="text-xs text-gray-400">Past</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-300 inline-block" />
                <span className="text-xs text-gray-400">Projected</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
                <span className="text-xs text-gray-400">No data</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default YTDBarChart;
