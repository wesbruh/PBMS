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
  const m = min % 60;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${h12}:${m === 0 ? "00" : m} ${ampm}`;
}

/** Parse a DB `time` column value ("HH:MM:SS") → "HH:MM" */
function dbTimeToHHMM(dbTime) {
  if (!dbTime) return null;
  return dbTime.substring(0, 5);
}

/**
 * Parse timestamp-like values into "HH:MM" without timezone shifting.
 * Works for:
 *   - "2026-02-23T09:00:00.000Z"
 *   - "2026-02-23T09:00:00"
 *   - "09:00:00"
 *   - "09:00"
 */
function extractHHMM(value) {
  if (!value || typeof value !== "string") return null;

  const timeMatch = value.match(/T(\d{2}:\d{2})/);
  if (timeMatch) return timeMatch[1];

  const plainTimeMatch = value.match(/^(\d{2}:\d{2})/);
  if (plainTimeMatch) return plainTimeMatch[1];

  return null;
}

// ── Slot generator ────────────────────────────────────────────────────────────

function generateSlots(startMin, endMin) {
  const slots = [];
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
  readOnly = false,
}) {
  // Work hours fetched from AvailabilitySettings
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");

  // Blocked intervals for selectedDate: [{ startMin, endMin }]
  const [blockedIntervals, setBlockedIntervals] = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // ── Fetch work hours (once, from AvailabilitySettings) ───────────────────
  useEffect(() => {
    async function fetchWorkHours() {
      try {
        const { data, error } = await supabase
          .from("AvailabilitySettings")
          .select("work_start_time, work_end_time")
          .limit(1)
          .single();

        if (error || !data) return;

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
        const startDateTime = new Date(`${selectedDate}T00:00:00.000`);
        const dayStart = startDateTime.toISOString();

        const endDateTime = new Date(`${selectedDate}T23:59:59.999`);
        const dayEnd = endDateTime.toISOString();

        const { data: adminBlocks, error: abErr } = await supabase
          .from("AvailabilityBlocks")
          .select("start_time, end_time")
          .gte("start_time", dayStart)
          .lte("end_time", dayEnd);

        if (abErr) {
          console.error("TimeSlotGrid: Availability fetch error", abErr);
        }

        const intervals = [];

        (adminBlocks ?? []).forEach((block) => {
          const blockStart = extractHHMM(block.start_time);
          const blockEnd = extractHHMM(block.end_time);

          if (!blockStart || !blockEnd) return;

          intervals.push({
            startMin: blockStart,
            endMin: blockEnd,
          });
        });

        const { data: bookedSessions, error: bsErr } = await supabase
          .from("Session")
          .select("start_at, end_at")
          .eq("is_active", true)
          .gte("start_at", dayStart)
          .lte("start_at", dayEnd);

        if (bsErr) {
          console.error("TimeSlotGrid: Session fetch error", bsErr);
        }

        (bookedSessions ?? []).forEach((session) => {
          if (!session.start_at || !session.end_at) return;

          const sessionStart = extractHHMM(session.start_at);
          const sessionEnd = extractHHMM(session.end_at);

          if (!sessionStart || !sessionEnd) return;

          intervals.push({
            startMin: sessionStart,
            endMin: sessionEnd,
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
  const allSlots = useMemo(() => {
    return generateSlots(toMin(workStart), toMin(workEnd));
  }, [workStart, workEnd]);

  // ── Compute which slots are disabled ─────────────────────────────────────
  const blockedSet = useMemo(() => {
    const blocked = new Set();

    blockedIntervals.forEach((block) => {
      blocked.add(block.startMin);
    });

    return blocked;
  }, [blockedIntervals]);

  const overlapSet = useMemo(() => {
    const over = new Set();
    const workEndMin = toMin(workEnd);

    allSlots.forEach((slot) => {
      const sessionEnd = slot.totalMin + durationMinutes;

      if (sessionEnd > workEndMin) {
        over.add(slot.value);
        return;
      }

      for (const block of blockedIntervals) {
        const blockStartMin = toMin(block.startMin);
        const blockEndMin = toMin(block.endMin);

        if (
          overlaps(slot.totalMin, slot.totalMin + 15, blockStartMin, blockEndMin) ||
          overlaps(slot.totalMin, sessionEnd, blockStartMin, blockEndMin)
        ) {
          over.add(slot.value);
          break;
        }
      }
    });

    return over;
  }, [allSlots, blockedIntervals, durationMinutes, workEnd]);

  // ── Auto-computed end time from startTime + duration ─────────────────────
  const computedEndTime = useMemo(() => {
    if (!startTime) return null;
    return fromMin(toMin(startTime) + durationMinutes);
  }, [startTime, durationMinutes]);

  // ── Handle slot click ─────────────────────────────────────────────────────
  function handleSlotClick(slot) {
    if (blockedSet.has(slot.value) || overlapSet.has(slot.value) || readOnly) {
      return;
    }

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
              : `Pick a ${durationMinutes}-min slot`}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-brown" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-[#F4EFE6] border border-[#E7DFCF]" /> In
          session
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-neutral-100 border border-neutral-200" />{" "}
          Unavailable
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {allSlots.map((slot) => {
          const isBlocked = blockedSet.has(slot.value);
          const isOverlap = overlapSet.has(slot.value);
          const isStart = slot.value === startTime;
          const isInRange =
            !isBlocked &&
            startTime &&
            computedEndTime &&
            slot.value > startTime &&
            slot.value < computedEndTime;

          return (
            <button
              key={slot.value}
              type="button"
              disabled={isBlocked || isOverlap || readOnly}
              onClick={() => handleSlotClick(slot)}
              title={isBlocked || isOverlap ? "Not available" : slot.label}
              className={`
                py-3 text-[11px] font-bold rounded-md border transition-all
                ${isStart
                  ? "bg-brown text-white border-brown shadow-md scale-105 z-10"
                  : isInRange
                    ? "bg-[#F4EFE6] text-brown border-[#E7DFCF]"
                    : isBlocked
                      ? "bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed line-through"
                      : isOverlap
                        ? "bg-neutral-100 text-neutral-300 border-neutral-200 cursor-not-allowed"
                        : `bg-white text-neutral-600 border-neutral-200 ${readOnly ? "" : "hover:border-brown hover:bg-neutral-50"}`
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