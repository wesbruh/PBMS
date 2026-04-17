import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import "react-day-picker/dist/style.css";

/// convert hour:min:sec timestamptz to "H:MM AM/PM", pulled some from sessions.jsx
const getLocalFormattedTime = (date) => {
  const dateObj = new Date(date);
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // convert 0 to 12 for midnight
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

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
          `id, start_at, status, location_text, User( first_name, last_name ), SessionType( name )`,
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
          location: row.location_text ?? "No location",
          time: getLocalFormattedTime(row.start_at),
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
    <div className="bg-white border border-gray-100 rounded-xl p-3 md:mt-3 shadow-sm flex flex-col h-full md:h-[75%] overflow-hidden ">
      {/* card header */}
      <div className="flex flex-wrap items-start justify-between"> 
        <div className="min-w-0">
          <h2 className="text-xs md:text-sm font-semibold text-gray-800">
            Upcoming Sessions
          </h2>
          <p className="text-xs text-gray-400">
            Showing Confirmed Sessions only. Click on a date to view details.
          </p>
        </div>
        {/* session count badge, only shows when loaded in */}
        {!loading && !error && (
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-amber-600 animate-pulse" />
            <span className="text-xs text-gray-400">
              {totalConfirmed} confirmed sessions
            </span>
          </span>
        )}
      </div>

      {/* legend  */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 ">
        {/* <span className="w-1 h-1 md:w-2 md:h-2 rounded-full bg-amber-500 inline-block " />
        <span className="text-xs text-gray-400 truncate">
          Confirmed session
        </span> */}
        <span className="text-xs text-gray-500 text-decoration underline font-bold truncate">Underlined date is Today.</span>
      </div>

      {/* error state */}
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      {/* loading pulse similar to other components */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-gray-400 animate-pulse">
            Loading Calendar...
          </span>
        </div>
      ) : (
        // react-day-picker
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
          <DayPicker
            mode="single"
            selected={selected}
            onDayClick={handleDayClick}
            month={month}
            onMonthChange={setMonth}
            modifiers={{ session: sessionDates }}
            modifiersClassNames={{ session: "text-amber-600 font-bold" }}
            showOutsideDays={false}
            navLayout="around"
            captionLayout="label"
            classNames={{
              root: `${defaultClassNames.root} text-center w-full border border-gray-100 rounded-xl shadow-md overflow-x-auto`,
              today: "",
              selected: "!bg-amber-200 rounded-xl transition-all",
              months: "text-xs md:text-base text-center",
              month: "text-xs md:text-base text-center",
              month_grid: "w-full text-xs md:text-base",
              chevron: "fill-amber-500 hover:fill-amber-700",
              day: "text-center text-xs md:text-base",
              weekday: "text-center",
              day_button: "p-2 w-full cursor-pointer"
            }}
          />
          {/* specifically target "today" since some changes made it become overloaded, tailwind wont work idk */}
          <style>{`
          [data-today="true"] button {
          text-decoration: underline;
          font-weight: bold;
          }
          `}</style>

          {/* popover */}
          {selected && (
            <div className="min-w-30 bg-white border border-gray-100 shadow-md rounded-xl p-3 overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide ">
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
                <div className="max-h-32 overflow-x-auto overflow-y-auto space-y-2 pr-1 text-wrap">
                  {selectedSessions.map((s) => (
                    <div
                      key={s.id}
                      className="mb-2 pb-1 items-start border-b border-gray-100 "
                    >
                      <div className="min-w-20">
                        <p className="text-xs font-semibold text-gray-800">
                          {s.clientName} - {s.type}
                        </p>
                        <p className="text-xs text-gray-500 ">
                          {s.location} - {s.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default SessionCalendar;