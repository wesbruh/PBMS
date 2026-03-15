import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import "react-day-picker/dist/style.css";


/// convert hour:min:sec timestamptz to "H:MM AM/PM"
function formatTime(timestampStr) {
  if (!timestampStr) {
    return "";
  }
  const [hourStr, minStr] = timestampStr.split(":");
  let hour = parseInt(hourStr, 10);
  const min = minStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
}

//main component
function SessionCalendar() {
  const today = new Date();
  const [month, setMonth] = useState(today); //react-day-picker tracks displayed month
  const [selected, setSelected] = useState(new Date()); //currently clicked date obj
  const [sessionMap, setSessionMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const defaultClassNames = getDefaultClassNames();

  useEffect(() => {
    fetchConfirmedSessions();
  }, []);

  const fetchConfirmedSessions = async () => {
    try {
      // fetch all confirmed sessions joined with client for their name
      const { data, error: fetchError } = await supabase
        .from("Session")
        .select(
          `id, start_at, status, User( first_name, last_name ), SessionType( name )`,
        )
        .eq("status", "Confirmed");
      if (fetchError) {
        throw fetchError;
      }
      // map each row into the full calendar event object
      const map = {};
      (data ?? []).forEach((row) => {
        if (!row.start_at) {
          return;
        }
        const dateKey = row.start_at.substring(0, 10);
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push({
          id: row.id,
          clientName: row.User
            ? `${row.User.first_name} ${row.User.last_name}`
            : "Unknown Client",
          type: row.SessionType?.name ?? "Session",
          time: formatTime(row.start_at),
        });
      });

      setSessionMap(map);
    } catch (err) {
      console.error("SessionCalendar fetch error:", err);
      setError("failed to load sessions for calendar.");
    } finally {
      setLoading(false);
    }
  };

  const toDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  // selected day key for popover lookup
  const selectedKey = selected ? toDateKey(selected) : null;
  const selectedSessions = selectedKey ? (sessionMap[selectedKey] ?? []) : [];
  const totalConfirmed = Object.values(sessionMap).flat().length;

  // build set of date object that have sessions, used by react-day-picker modifiers
  // recreated only when sessionmap changes
  const sessionDates = Object.keys(sessionMap).map((key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d); // local date no UTC
  });

  const handleDayClick = (day) => {
    if (selected && toDateKey(selected) === toDateKey(day)) {
      setSelected(null);
    } else {
      setSelected(day);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col  min-w-0 h-full">
      {/* card header */}
      <div className="flex items-start justify-between mb-3 gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 truncate">
            Upcoming Sessions
          </h2>
          <p className="text-xs text-gray-400 truncate">
            Showing Confirmed Sessions only. Click on a date to view details.
          </p>
        </div>
        {/* session count badge, only shows when loaded in */}
        {!loading && !error && (
          <span className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse inline-block" />
            <span className="text-xs text-gray-400">
              {totalConfirmed} confirmed sessions
            </span>
          </span>
        )}
      </div>

      {/* error state */}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {/* loading pulse similar to other components */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-gray-400 animate-pulse">
            Loading Calendar...
          </span>
        </div>
      ) : (
        // react-day-picker
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-0 border border-blue-500">
          <div className="border border-green-500 rounded-xl">
          <DayPicker
            mode="single"
            selected={selected}
            onDayClick={handleDayClick}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ session: sessionDates }}
            modifiersClassNames={{ session: "font-bold text-amber-600" }}
            showOutsideDays={false}
            navLayout="around"
            captionLayout="label"
             classNames={{
              root: `${defaultClassNames.root} w-full shrink-0`,
              today: "font-bold",
              selected: "!bg-amber-200  rounded-md transition-all", 
              // months: "flex flex-col",
              // month: "w-full",
              // month_caption: "flex items-center justify-between mb-2 px-1",
              // caption_label: "text-sm font-semibold text-gray-700",
              // nav: "flex items-center gap-1",
              chevron: "fill-amber-500 hover:fill-amber-700",
              // month_grid: "w-full border-collapse",
              // weekdays: "grid grid-cols-7 mb-1",
              // weekday: "text-center text-xs font-medium text-gray-400 py-1",
              // weeks: "w-full ",
              // week: "grid grid-cols-7 gap-x-0.5 gap-y-0.5 mb-1",
               day: "text-sm lg:text-md",
              // day_button:"w-full h-full flex flex-col items-center py-1 rounded-lg text-xs text-gray-700 cursor-pointer hover:bg-gray-50 transition-all ",
              // 
              // outside: "opacity-30",
              // disabled: "opacity-20 cursor-default",
            }}
          />
          </div>

          {/* popover */}
          {selected && (
            <div className="relative bg-white border border-red-500 rounded-xl p-3 shrink-0">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide truncate">
                {selected.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {selectedSessions.length === 0 ? (
                // no sessions on this date selected
                <p className="text-xs text-gray-400 italic">
                  {" "}
                  No confirmed sessions on this date.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                  {selectedSessions.map((s) => (
                    <div key={s.id} className="mb-2 items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{s.clientName}</p>
                        <p className="text-xs text-gray-500 truncate">{s.type} - {s.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* legend  */}
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
            <span className="text-xs text-gray-400 truncate">
              Confirmed session
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-100 border border-amber-300 inline-block ml-2 shrink-0" />
            <span className="text-xs text-gray-400 truncate">Today</span>
          </div>
        </div>
      )}
      {/* style for dots on the days that have a session 
            react-day-picker applies "rdp-day_session" to the button element*/}
      {/* <style>{`
            .rdp-day-session {
            text: #f59e0b
            }
            `}</style> */}
    </div>
  );
}
export default SessionCalendar;
