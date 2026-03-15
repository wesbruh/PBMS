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

//all months start at 0 until data fills in
const emptyMonths = monthNames.map((month) => ({ month, avg: 0 }));

// custom tool tip on hover of bar
function CustomToolTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0].value;
  if (!val) {
    return null;
  }
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p> {/* month */}
      <p className="text-green-300">${val.toLocaleString()}</p>
      {/* dollar amount*/}
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

// custom bar, for 'shape' field in <Bar/>.
function CustomBar(props) {
  const { x, y, width, height, index, avg } = props;
  if (!height || height <= 0) {
    return null;
  }
  const fill = (() => {
    // future month with no data == light gray
    if (avg === 0) {
      return "#f3f4f6";
    }
    // current month = amber color
    if (index === new Date().getMonth()) {
      return "#f59e0b";
    }
    // past months = lighter amber color
    return "#fcd34d";
  })();
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
      const currentYear = new Date().getFullYear();

      // fetch paid invoices and paid payments for current year in parallel
      // this is similar to the MetricsGrid logic
      // >= current year from jan 1st 2026 and <= jan 1st 2027
      const [paymentsRes] = await Promise.all([
        // supabase
        //   .from("Invoice")
        //   .select("total, created_at")
        //   .eq("status", "Paid")
        //   .gte("created_at", `${currentYear}-01-01`)
        //   .lt("created_at", `${currentYear + 1}-01-01`),

        supabase
          .from("Payment")
          .select("amount, paid_at")
          .eq("status", "Paid")
          .gte("paid_at", `${currentYear}-01-01`)
          .lt("paid_at", `${currentYear + 1}-01-01`),
      ]);
      // if (invoiceRes.error) {
      //   throw invoiceRes.error;
      // }
      if (paymentsRes.error) {
        throw paymentsRes.error;
      }
      // accumulate revenue per month
      const monthlyTotals = Array(12).fill(0);

      // (invoiceRes.data ?? []).forEach((row) => {
      //   const m = new Date(row.created_at).getMonth();
      //   monthlyTotals[m] += row.total ?? 0;
      // });
      (paymentsRes.data ?? []).forEach((row) => {
        const m = new Date(row.paid_at).getMonth();
        monthlyTotals[m] += row.amount ?? 0;
      });

      setData(
        monthNames.map((month, i) => ({
          month,
          avg: monthlyTotals[i],
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
  const resolvedSubtitle =
    subtitle ?? `Monthly average session revenue - ${year}`;

  // automatically compute YTD average from months that actually have data use
  const activeMonths = data.filter((d) => d.avg > 0);
  const computedAvg =
    activeMonths.length > 0
      ? Math.round(
          activeMonths.reduce((sum, d) => sum + d.avg, 0) / activeMonths.length,
        )
      : 0;

  //summary stats
  const highestEntry = data.reduce(
    (best, d) => (d.avg > best.avg ? d : best),
    data[0],
  );

  // DYNAMIC Y-AXIS. compute the ceiling rounded up to the nearest 1000
  const maxVal = Math.max(...data.map((d) => d.avg), 0);
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
    maxVal >= 1000000 ? 52 : maxVal >= maxVal >= 100000 ? 48 : 38;

  return (
    <div
      className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col overflow-hidden min-w-0"
      style={{ minHeight: "380px" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate">
            {title}
          </h2>
          <p className="text-xs text-gray-400 truncate">{resolvedSubtitle}</p>
        </div>
        <div className="text-right shrink-0 ">
          {/* loading state similar to metricsgrid */}
          {loading ? (
            <span className="h-6 w-16 bg-gray-100 rounded animate-pulse inline-block" />
          ) : (
            <p className="text-lg font-bold text-green-700">
              ${computedAvg.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-400 ">YTD Avg/month</p>
        </div>
      </div>
      {/* error state */}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {/* loading state similar to metricsgrid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-400 animate-pulse">
            Loading chart...
          </span>
        </div>
      ) : (
        <>
          {/* Chart. the responsive container needs a defined height according to docs  */}
          <div style={{ height: "220px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                barCategoryGap="30%"
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
                  cursor={{ fill: "#fef3c7", radius: 4 }}
                />
                <Bar
                  dataKey="avg"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  shape={(props) => <CustomBar {...props} />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* footer summary */}
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-100 overflow-hidden">
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Highest Month</p>
              <p className="text-sm font-semibold text-gray-700 truncate">
                {highestEntry.month} - ${highestEntry.avg.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Months tracked</p>
              <p className="text-sm font-semibold text-gray-700">
                {activeMonths.length} / 12
              </p>
            </div>
            {/* legend */}
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                <span className="text-xs text-gray-400">Current</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" />
                <span className="text-xs text-gray-400">Past</span>
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
