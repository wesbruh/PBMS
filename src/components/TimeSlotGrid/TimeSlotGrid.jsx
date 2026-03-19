// src/components/TimeSlotGrid/TimeSlotGrid.jsx
//
// Props:
//   selectedDate    — "YYYY-MM-DD" string, required for fetching blocks
//   durationMinutes — number, how long the selected session/package is (default 60)
//   startTime       — "HH:MM" 24h string (controlled)
//   onSelectStart   — (startValue: string, endValue: string) => void
//                     called with both start AND auto-computed end whenever user picks a slot
//
// Blocking rules:
//   1. Slots outside admin's work_start_time / work_end_time are hidden (not generated).
//   2. A slot is DISABLED if:
//      a. It overlaps with an admin Availability block (unavailable period).
//      b. It overlaps with an active booked Session.
//      c. Choosing it as start would cause the session to END inside or after a block
//         (e.g. 2hr session starting at 14:30 when a block starts at 15:00 → 14:30 is disabled).
//   3. On click: start is set, end = start + durationMinutes (auto-filled, no second click needed).

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";

// ── Time helpers ──────────────────────────────────────────────────────────────

/** "HH:MM" → total minutes from midnight */
function toMin(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** total minutes from midnight → "HH:MM" */
function fromMin(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** "HH:MM" → display label like "2:15 PM" */
function toLabel(timeStr) {
  const min = toMin(timeStr);
  const h24 = Math.floor(min / 60);
  const m   = min % 60;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${h12}:${m === 0 ? "00" : m} ${ampm}`;
}

/** Parse a timestamptz or time string from DB into "HH:MM" for a given date */
function tsToLocalTime(tsStr) {
  // For timestamptz values like "2026-02-23T16:15:00+00:00"
  // We compare in UTC minutes to keep things consistent
  const d = new Date(tsStr);
  return fromMin(d.getUTCHours() * 60 + d.getUTCMinutes());
}

/** Parse a DB `time` column value ("HH:MM:SS") → "HH:MM" */
function dbTimeToHHMM(dbTime) {
  if (!dbTime) return null;
  return dbTime.substring(0, 5); // "09:00:00" → "09:00"
}

// ── Slot generator ────────────────────────────────────────────────────────────

function generateSlots(startMin, endMin) {
  const slots = [];
  // Round startMin up to nearest 15
  const firstSlot = Math.ceil(startMin / 15) * 15;
  for (let t = firstSlot; t < endMin; t += 15) {
    slots.push({
      value: fromMin(t),
      label: toLabel(fromMin(t)),
      totalMin: t,
    });
  }
  return slots;
}

// ── Blocked interval helpers ──────────────────────────────────────────────────

/**
 * Returns true if the range [aStart, aEnd) overlaps with [bStart, bEnd).
 * All values are minutes from midnight.
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TimeSlotGrid({
  selectedDate,
  durationMinutes = 60,
  startTime,
  onSelectStart,
}) {
  // Work hours fetched from AvailabilitySettings
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd,   setWorkEnd]   = useState("17:00");

  // Blocked intervals for selectedDate: [{ startMin, endMin }]
  const [blockedIntervals, setBlockedIntervals] = useState([]);
  const [loadingBlocks,    setLoadingBlocks]    = useState(false);

  // ── Fetch work hours (once, from AvailabilitySettings) ───────────────────
  useEffect(() => {
    async function fetchWorkHours() {
      try {
        const { data, error } = await supabase
          .from("AvailabilitySettings")
          .select("work_start_time, work_end_time")
          .limit(1)
          .single();

        if (error || !data) return; // fall back to 09:00–17:00 defaults

        const s = dbTimeToHHMM(data.work_start_time);
        const e = dbTimeToHHMM(data.work_end_time);
        if (s) setWorkStart(s);
        if (e) setWorkEnd(e);
      } catch (err) {
        console.error("TimeSlotGrid: failed to fetch AvailabilitySettings", err);
      }
    }
    fetchWorkHours();
  }, []);

  // ── Fetch blocked intervals whenever date changes ─────────────────────────
  useEffect(() => {
    if (!selectedDate) {
      setBlockedIntervals([]);
      return;
    }

    async function fetchBlocks() {
      setLoadingBlocks(true);
      try {
        // ── 1) Admin unavailability blocks ──────────────────────────────────
        // Availability table: valid_from date, valid_to date
        // A row means the admin is NOT available from valid_from to valid_to
        // We treat the entire day range as blocked minutes.
        // The table stores per-day blocks; for time-of-day granularity we use
        // the stored timestamps directly if they fall on selectedDate.
        //
        // Schema: id, admin_user_id, valid_from (date), valid_to (date), created_at
        // Note: availability_rule column is being removed per spec.
        //
        // Because valid_from/valid_to are DATEs (not timestamps), a row covering
        // selectedDate means the admin is unavailable ALL DAY on that date.
        // For time-granular blocks (like "16:15–18:15 on 2026-02-23"), your team
        // should add valid_from_time / valid_to_time columns. Until then we block
        // all slots on a day that has an Availability row.
        //
        // ✅ If your team stores times as timestamptz in valid_from/valid_to,
        //    this code already handles that via tsToLocalTime() below.

        const { data: adminBlocks, error: abErr } = await supabase
          .from("Availability")
          .select("valid_from, valid_to")
          .lte("valid_from", selectedDate)
          .gte("valid_to",   selectedDate);

        if (abErr) console.error("TimeSlotGrid: Availability fetch error", abErr);

        const workStartMin = toMin(workStart);
        const workEndMin   = toMin(workEnd);

        const intervals = [];

        (adminBlocks ?? []).forEach((block) => {
          // If valid_from/valid_to include a time component (timestamptz), use it.
          // Otherwise treat as full-day block.
          const fromHasTime = block.valid_from?.includes("T") || block.valid_from?.includes(" ");
          const toHasTime   = block.valid_to?.includes("T")   || block.valid_to?.includes(" ");

          const blockStart = fromHasTime
            ? toMin(tsToLocalTime(block.valid_from))
            : workStartMin;
          const blockEnd   = toHasTime
            ? toMin(tsToLocalTime(block.valid_to))
            : workEndMin;

          intervals.push({ startMin: blockStart, endMin: blockEnd });
        });

        // ── 2) Active booked sessions on selectedDate ───────────────────────
        // Session.start_at and end_at are timestamptz.
        // We fetch sessions where the date portion of start_at matches selectedDate.
        const dayStart = `${selectedDate}T00:00:00.000Z`;
        const dayEnd   = `${selectedDate}T23:59:59.999Z`;

        const { data: bookedSessions, error: bsErr } = await supabase
          .from("Session")
          .select("start_at, end_at")
          .eq("is_active", true)
          .gte("start_at", dayStart)
          .lte("start_at", dayEnd);

        if (bsErr) console.error("TimeSlotGrid: Session fetch error", bsErr);

        (bookedSessions ?? []).forEach((s) => {
          if (!s.start_at || !s.end_at) return;
          intervals.push({
            startMin: toMin(tsToLocalTime(s.start_at)),
            endMin:   toMin(tsToLocalTime(s.end_at)),
          });
        });

        setBlockedIntervals(intervals);
      } catch (err) {
        console.error("TimeSlotGrid: unexpected error fetching blocks", err);
      } finally {
        setLoadingBlocks(false);
      }
    }

    fetchBlocks();
  }, [selectedDate, workStart, workEnd]);

  // ── Generate all slots within work hours ─────────────────────────────────
  const allSlots = useMemo(
    () => generateSlots(toMin(workStart), toMin(workEnd)),
    [workStart, workEnd]
  );

  // ── Compute which slots are disabled ─────────────────────────────────────
  //
  // A slot at time T is disabled if:
  //   A) The slot itself (T → T+15) overlaps any blocked interval.
  //   B) The *session* starting at T (T → T+durationMinutes) overlaps any blocked interval.
  //   C) T + durationMinutes > workEndMin (session would run past end of day).
  //
  const disabledSet = useMemo(() => {
    const disabled = new Set();
    const workEndMin = toMin(workEnd);

    allSlots.forEach((slot) => {
      const sessionEnd = slot.totalMin + durationMinutes;

      // C) Runs past end of work day
      if (sessionEnd > workEndMin) {
        disabled.add(slot.value);
        return;
      }

      // A & B) Overlaps any blocked interval
      for (const block of blockedIntervals) {
        if (
          overlaps(slot.totalMin, slot.totalMin + 15, block.startMin, block.endMin) || // A
          overlaps(slot.totalMin, sessionEnd, block.startMin, block.endMin)             // B
        ) {
          disabled.add(slot.value);
          break;
        }
      }
    });

    return disabled;
  }, [allSlots, blockedIntervals, durationMinutes, workEnd]);

  // ── Auto-computed end time from startTime + duration ─────────────────────
  const computedEndTime = useMemo(() => {
    if (!startTime) return null;
    return fromMin(toMin(startTime) + durationMinutes);
  }, [startTime, durationMinutes]);

  // ── Handle slot click ─────────────────────────────────────────────────────
  function handleSlotClick(slot) {
    if (disabledSet.has(slot.value)) return;
    const end = fromMin(slot.totalMin + durationMinutes);
    onSelectStart(slot.value, end);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!selectedDate) {
    return (
      <p className="text-[12px] text-neutral-400 italic">
        Select a date above to see available time slots.
      </p>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-brown uppercase tracking-wider">
          Select Start Time
        </h4>
        <div className="text-xs text-neutral-500 italic">
          {loadingBlocks
            ? "Loading availability…"
            : startTime
              ? `${toLabel(startTime)} → ${toLabel(computedEndTime)} (${durationMinutes} min)`
              : `Pick a ${durationMinutes}-min slot`
          }
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-brown" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#F4EFE6] border border-[#E7DFCF]" /> In session
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-neutral-100 border border-neutral-200" /> Unavailable
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {allSlots.map((slot) => {
          const isDisabled = disabledSet.has(slot.value);
          const isStart    = slot.value === startTime;
          const isInRange  = !isDisabled &&
            startTime &&
            computedEndTime &&
            slot.value > startTime &&
            slot.value < computedEndTime;

          return (
            <button
              key={slot.value}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSlotClick(slot)}
              title={isDisabled ? "Not available" : slot.label}
              className={`
                py-3 text-[11px] font-bold rounded-md border transition-all
                ${isStart
                  ? "bg-brown text-white border-brown shadow-md scale-105 z-10"
                  : isInRange
                    ? "bg-[#F4EFE6] text-brown border-[#E7DFCF]"
                    : isDisabled
                      ? "bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed line-through"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-brown hover:bg-neutral-50"
                }
              `}
            >
              {slot.label}
            </button>
          );
        })}
      </div>

      {allSlots.length === 0 && !loadingBlocks && (
        <p className="text-xs text-neutral-400 italic text-center py-4">
          No available slots on this date.
        </p>
      )}
    </div>
  );
}