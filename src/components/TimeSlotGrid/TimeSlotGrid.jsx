import React from "react";

const generateSlots = () => {
  const slots = [];
  for (let h = 9; h <= 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 17 && m > 0) break;
      const totalMin = h * 60 + m;
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      slots.push({
        label: `${displayH}:${m === 0 ? "00" : m} ${h >= 12 ? "PM" : "AM"}`,
        totalMin,
        value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      });
    }
  }
  return slots;
};

const ALL_SLOTS = generateSlots();

export default function TimeSlotGrid({ startTime, endTime, onSelectRange }) {
  const handleSlotClick = (slot) => {
    if (!startTime || (startTime && endTime)) {
      // Start a new selection
      onSelectRange(slot.value, null);
    } else {
      // Setting the end time
      if (slot.value <= startTime) {
        onSelectRange(slot.value, null); // Reset if they click an earlier time
      } else {
        onSelectRange(startTime, slot.value);
      }
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-brown uppercase tracking-wider">Select Time Range</h4>
        <div className="text-xs text-neutral-500 italic">
          {!startTime ? "Select Start Time" : !endTime ? "Select End Time" : "Range Selected"}
        </div>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {ALL_SLOTS.map((slot) => {
          const isSelected = slot.value === startTime || slot.value === endTime;
          const isInRange = startTime && endTime && slot.value > startTime && slot.value < endTime;

          return (
            <button
              key={slot.value}
              type="button"
              onClick={() => handleSlotClick(slot)}
              className={`py-3 text-[11px] font-bold rounded-md border transition-all
                ${isSelected ? "bg-brown text-white border-brown shadow-md scale-105 z-10" : 
                  isInRange ? "bg-[#F4EFE6] text-brown border-[#E7DFCF]" : 
                  "bg-white text-neutral-600 border-neutral-200 hover:border-brown hover:bg-neutral-50"}`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}