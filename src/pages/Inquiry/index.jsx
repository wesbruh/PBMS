import React, { useState, useEffect, useRef } from "react";

// Helper to generate 15-min intervals (9 AM - 5 PM)
const generateTimeSlots = (startHour = 9, endHour = 17) => {
  const slots = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endHour && m > 0) break; // Stop exactly at 5:00 PM
      const isPM = h >= 12;
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const displayMins = m === 0 ? "00" : m;
      const ampm = isPM ? "PM" : "AM";
      slots.push({
        value: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        label: `${displayHour}:${displayMins}`,
        period: ampm,
        sort: h * 60 + m
      });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

function TimeGrid({ label, selectedValue, onSelect, disabledBefore = -1 }) {
  const morning = TIME_SLOTS.filter(s => s.period === "AM");
  const afternoon = TIME_SLOTS.filter(s => s.period === "PM");

  const renderButton = (slot) => {
    const isPast = slot.sort <= disabledBefore;
    return (
      <button
        key={slot.value}
        type="button"
        disabled={isPast}
        onClick={() => onSelect(slot)}
        className={`py-2 text-xs font-medium rounded border transition-all
          ${isPast ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed" : 
            selectedValue === slot.value 
            ? "bg-brown text-white border-brown shadow-md scale-105" 
            : "bg-white text-neutral-700 border-neutral-300 hover:border-brown hover:text-brown"}`}
      >
        {slot.label}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-brown">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold block mb-2">Morning</span>
          <div className="grid grid-cols-3 gap-1.5">{morning.map(renderButton)}</div>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold block mb-2">Afternoon</span>
          <div className="grid grid-cols-3 gap-1.5">{afternoon.map(renderButton)}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ i, value, onChange, onRemove }) {
  const street1Ref = useRef(null);

  // Google Maps Autocomplete Setup
  useEffect(() => {
    if (!window.google || !street1Ref.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(street1Ref.current, {
      fields: ["address_components", "geometry"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      let street = "", city = "", state = "", zip = "";

      place.address_components?.forEach(comp => {
        const type = comp.types[0];
        if (type === "street_number") street = comp.long_name + " " + street;
        if (type === "route") street += comp.long_name;
        if (type === "locality") city = comp.long_name;
        if (type === "administrative_area_level_1") state = comp.short_name;
        if (type === "postal_code") zip = comp.long_name;
      });

      onChange(i, { ...value, street1: street, city, state, zip });
    });
  }, []);

  const startSortValue = TIME_SLOTS.find(s => s.value === value.startTime)?.sort || -1;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm space-y-8 relative">
      <button onClick={() => onRemove(i)} className="absolute top-4 right-4 text-neutral-400 hover:text-red-500">
        ✕
      </button>

      {/* Date & Time Section */}
      <div className="space-y-6">
        <div className="w-48">
          <label className="block text-sm font-medium text-brown mb-1">Session Date</label>
          <input 
            type="date" 
            className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
            value={value.date} 
            onChange={e => onChange(i, { ...value, date: e.target.value })}
          />
        </div>

        {value.date && (
          <div className="grid lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-top-2">
            <TimeGrid 
              label="Choose Start Time" 
              selectedValue={value.startTime} 
              onSelect={(s) => onChange(i, { ...value, startTime: s.value, endTime: "" })} 
            />
            {value.startTime && (
              <TimeGrid 
                label="Choose End Time" 
                selectedValue={value.endTime} 
                onSelect={(s) => onChange(i, { ...value, endTime: s.value })}
                disabledBefore={startSortValue}
              />
            )}
          </div>
        )}
      </div>

      {/* Address Section */}
      <div className="pt-6 border-t border-neutral-100">
        <h4 className="text-sm font-semibold text-brown mb-4 uppercase tracking-wider">Venue Location</h4>
        <div className="grid md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <label className="text-xs text-neutral-500 font-bold mb-1 block">Street Address</label>
            <input 
              ref={street1Ref}
              type="text"
              placeholder="Start typing address..."
              className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-500"
              value={value.street1}
              onChange={e => onChange(i, { ...value, street1: e.target.value })}
            />
          </div>
          <div className="md:col-span-4">
            <label className="text-xs text-neutral-500 font-bold mb-1 block">Apt/Suite</label>
            <input 
              type="text"
              className="w-full rounded border border-neutral-300 px-3 py-2 outline-none"
              value={value.street2}
              onChange={e => onChange(i, { ...value, street2: e.target.value })}
            />
          </div>
          <div className="md:col-span-5">
            <label className="text-xs text-neutral-500 font-bold mb-1 block">City</label>
            <input type="text" className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50" value={value.city} readOnly />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-neutral-500 font-bold mb-1 block">State</label>
            <input type="text" className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50" value={value.state} readOnly />
          </div>
          <div className="md:col-span-4">
            <label className="text-xs text-neutral-500 font-bold mb-1 block">Zip Code</label>
            <input type="text" className="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-50" value={value.zip} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage() {
  const [rows, setRows] = useState([{ date: "", startTime: "", endTime: "", street1: "", street2: "", city: "", state: "", zip: "" }]);
  
  const addRow = () => setRows([...rows, { date: "", startTime: "", endTime: "", street1: "", street2: "", city: "", state: "", zip: "" }]);
  const updateRow = (i, val) => setRows(rows.map((r, idx) => idx === i ? val : r));
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-serif text-brown mb-2">Book Your Session</h1>
        <p className="text-neutral-500">Select dates and locations for your photography session with Bailey White.</p>
      </header>

      <div className="space-y-8">
        {rows.map((row, i) => (
          <Row key={i} i={i} value={row} onChange={updateRow} onRemove={removeRow} />
        ))}

        <div className="flex flex-col items-center gap-4 pt-6">
          <button onClick={addRow} className="text-brown font-bold border-b-2 border-brown pb-1 hover:text-[#AB8C4B] hover:border-[#AB8C4B] transition-all">
            + Add Another Session
          </button>
          
          <button className="bg-brown text-white px-10 py-3 rounded-full font-bold text-lg hover:bg-[#AB8C4B] shadow-lg transition-all active:scale-95 mt-4">
            Request Booking
          </button>
        </div>
      </div>
    </div>
  );
}