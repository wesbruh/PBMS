import { useState, useEffect } from "react";
import {
  format,
  addDays,
  addMinutes,
  startOfDay,
  isBefore,
  isSameDay,
} from "date-fns";
import { LoaderCircle, ArrowRight, ArrowLeft } from "lucide-react";

import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../lib/apiUrl.js";

import Sidebar from "../../components/shared/Sidebar/Sidebar.jsx";
import Frame from "../../components/shared/Frame/Frame.jsx";

const SETTINGS_ROW_ID = 1;

const Availability = () => {
  const [viewDate, setViewDate] = useState(startOfDay(new Date()));
  const [workDay, setWorkDay] = useState({ start: "09:00", end: "17:00" });
  const [selection, setSelection] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    fetchAvailability();
  }, [session]);

  const fetchAvailability = async () => {
    try {
      setError("");

      const res = await fetch(`${API_URL}/api/availability`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Error loading availability");
      }

      const data = await res.json();

      if (data.settings) {
        setWorkDay({
          start: data.settings.work_start_time.slice(0, 5),
          end: data.settings.work_end_time.slice(0, 5),
        });
      }

      if (data.blocks && data.blocks.length > 0) {
        const loadedSelection = new Set();

        data.blocks.forEach((block) => {
          const dateObj = new Date(block.start_time);
          const dateKey = format(dateObj, "yyyy-MM-dd");
          const timeKey = format(dateObj, "HH:mm");
          loadedSelection.add(`${dateKey}_${timeKey}`);
        });

        setSelection(loadedSelection);
      } else {
        setSelection(new Set());
      }
    } catch (fetchError) {
      console.error("Error loading availability:", fetchError);
      setError("Failed to load availability.");
    } finally {
      setLoading(false);
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    let current = new Date(`2000-01-01T${workDay.start}:00`);
    const end = new Date(`2000-01-01T${workDay.end}:00`);

    if (current >= end) return [];

    while (current < end) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, 15);
    }

    return slots;
  };

  const timeSlots = getTimeSlots();
  const daysToShow = 14;
  const days = [...Array(daysToShow)].map((_, i) => addDays(viewDate, i));

  const handlePrev = () => {
    const today = startOfDay(new Date());
    const newDate = addDays(viewDate, -daysToShow);

    if (isBefore(newDate, today)) {
      setViewDate(today);
    } else {
      setViewDate(newDate);
    }
  };

  const handleNext = () => {
    setViewDate(addDays(viewDate, daysToShow));
  };

  const isAtStart = isSameDay(viewDate, startOfDay(new Date()));

  const handleMouseDown = (day, slot) => {
    if (isPastDate(day)) return;
    setIsDragging(true);
    toggleSlot(day, slot);
  };

  const handleMouseEnter = (day, slot) => {
    if (isDragging && !isPastDate(day)) toggleSlot(day, slot);
  };

  const toggleSlot = (day, slot) => {
    const key = `${format(day, "yyyy-MM-dd")}_${slot}`;
    setSelection((prev) => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };

  const isPastDate = (day) => isBefore(day, startOfDay(new Date()));

  const saveChanges = async () => {
    const blocksToSave = Array.from(selection).map((key) => {
      const [date, time] = key.split("_");
      const startDateObj = new Date(`${date}T${time}:00`);
      const endDateObj = new Date(startDateObj.getTime() + 15 * 60 * 1000);

      return {
        start_time: startDateObj,
        end_time: endDateObj,
      };
    });

    const rangeStart = format(days[0], "yyyy-MM-dd");
    const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");

    try {
      const response = await fetch(`${API_URL}/api/availability/blocks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blocks: blocksToSave,
          rangeStart: `${rangeStart}T00:00:00`,
          rangeEnd: `${rangeEnd}T23:59:59`,
        }),
      });

      if (!response.ok) throw new Error("Error saving schedule");

      alert("Schedule saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving schedule");
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/availability/settings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: SETTINGS_ROW_ID,
          start: workDay.start,
          end: workDay.end,
        }),
      });

      if (!response.ok) throw new Error("Error saving settings");

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error saving settings");
    }
  };

  return (
    <div className="flex my-2 md:my-4 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-[#faf8f4] rounded-lg overflow-clip">
      <div className="flex md:min-w-50">
        <Sidebar />
      </div>
      <div className="flex h-full w-full shadow-inner rounded-lg overflow-hidden">
        <Frame>
          <div className="h-full w-full font-sans bg-[#fcfcfc] p-5 md:p-6 rounded-lg shadow-inner overflow-y-auto">
            <div className="mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Photographer Availability
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Update your availability to let clients know when you're available.
              </p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center grow text-gray-500">
                <LoaderCircle className="text-brown animate-spin mb-2" size={32} />
                <p className="text-sm">Loading availability...</p>
              </div>
            ) : error ? (
              <div className="grow flex flex-col text-center items-center justify-center">
                <p className="text-sm text-red-600 mb-2">{error}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border">
                      <span className="font-bold text-gray-600">Hours:</span>
                      <input
                        type="time"
                        value={workDay.start}
                        onChange={(e) =>
                          setWorkDay({ ...workDay, start: e.target.value })
                        }
                        className="border rounded p-1"
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={workDay.end}
                        onChange={(e) =>
                          setWorkDay({ ...workDay, end: e.target.value })
                        }
                        className="border rounded p-1"
                      />
                      <button
                        onClick={saveSettings}
                        className="text-blue-600 hover:underline ml-2"
                      >
                        Set Default
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePrev}
                      disabled={isAtStart}
                      className={`flex items-center gap-1 px-4 py-2 border rounded ${isAtStart ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200 transition-all cursor-pointer"}`}
                    >
                      <ArrowLeft size={18} /> Prev
                    </button>

                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 px-4 border rounded hover:bg-gray-200 transition-all cursor-pointer"
                    >
                      Next <ArrowRight size={18} />
                    </button>

                    <button
                      onClick={saveChanges}
                      className="px-2 rounded shadow bg-green-700 text-white text-sm disabled:opacity-50 hover:bg-green-800 transition-all cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <div
                  className="overflow-x-auto shadow-lg rounded-lg border border-gray-200"
                  onMouseUp={() => setIsDragging(false)}
                >
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr>
                        <th className="p-2 border bg-gray-100 sticky left-0 z-20 min-w-25">
                          Date
                        </th>
                        {timeSlots.map((slot) => (
                          <th
                            key={slot}
                            className="p-2 border text-xs font-medium text-gray-600 bg-gray-50 min-w-10"
                          >
                            {slot}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((day) => {
                        const isPast = isPastDate(day);

                        return (
                          <tr
                            key={day.toString()}
                            className={isPast ? "opacity-50 bg-gray-100" : ""}
                          >
                            <td className="p-2 border font-medium text-sm sticky left-0 bg-white z-10 whitespace-nowrap">
                              {format(day, "EEE, MMM d")}
                            </td>

                            {timeSlots.map((slot) => {
                              const key = `${format(day, "yyyy-MM-dd")}_${slot}`;
                              const isSelected = selection.has(key);

                              return (
                                <td
                                  key={slot}
                                  onMouseDown={() => handleMouseDown(day, slot)}
                                  onMouseEnter={() => handleMouseEnter(day, slot)}
                                  className={`
                                    border border-gray-200 p-0 transition-all duration-75 relative
                                    ${isPast ? "cursor-not-allowed bg-gray-200" : "cursor-pointer"}
                                    ${
                                      !isPast && isSelected
                                        ? "bg-red-500"
                                        : !isPast
                                          ? "bg-emerald-500 hover:bg-emerald-600"
                                          : ""
                                    }
                                  `}
                                  title={isSelected ? "Unavailable" : "Available"}
                                />
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-500 border"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 border"></div>
                    <span>Unavailable (Drag to select)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Frame>
      </div>
    </div>
  );
};

export default Availability;