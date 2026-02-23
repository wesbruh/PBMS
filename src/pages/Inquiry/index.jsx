import React, { useState, useEffect, useRef } from "react";

// --- Helper Functions for Time Slots ---
// Generates 15-min intervals between startHour (e.g., 9) and endHour (e.g., 17)
function generateTimeSlots(startHour = 9, endHour = 17) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const isPM = h >= 12;
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const displayMins = m === 0 ? "00" : m;
      const ampm = isPM ? "PM" : "AM";
      const timeValue = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`; // e.g. "09:15"
      
      slots.push({
        value: timeValue,
        label: `${displayHour}:${displayMins}`,
        period: ampm,
        hour24: h,
        minutes: m
      });
    }
  }
  return slots;
}

// Reusable Input Component
function Input({ id, label, error, className = "", ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-brown mb-1">{label}</label>}
      <input
        id={id}
        {...props}
        className={`w-full rounded-md border px-3 py-2 outline-none
          ${error ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"} 
          ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Row({ i, value, onChange, onRemove }) {
  const street1Ref = useRef(null);
  
  // Generate our dummy 9-5 schedule
  const allSlots = generateTimeSlots(9, 17);
  const morningSlots = allSlots.filter(s => s.period === "AM");
  const afternoonSlots = allSlots.filter(s => s.period === "PM");

  // --- Google Places Autocomplete Logic ---
  useEffect(() => {
    // Ensure the Google script is loaded in your index.html before this runs
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(street1Ref.current, {
      types: ["address"],
      fields: ["address_components", "geometry", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      let newStreet1 = "";
      let newCity = "";
      let newState = "";
      let newZip = "";

      // Parse Google's address components into our separate fields
      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes("street_number")) {
          newStreet1 = component.long_name + " ";
        }
        if (types.includes("route")) {
          newStreet1 += component.long_name;
        }
        if (types.includes("locality")) {
          newCity = component.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          newState = component.short_name;
        }
        if (types.includes("postal_code")) {
          newZip = component.long_name;
        }
      }

      // Update parent state with the autofilled data
      onChange(i, {
        ...value,
        street1: newStreet1 || place.formatted_address, // fallback to formatted if parsing fails
        city: newCity,
        state: newState,
        zip: newZip,
      });
    });
  }, [i, onChange, value]);

  // Handle setting time values
  const handleStartTimeSelect = (timeValue) => {
    onChange(i, { ...value, startTime: timeValue, endTime: "" }); // Reset end time if start changes
  };

  return (
    <div className="border border-neutral-200 rounded-md p-6 bg-white space-y-6">
      
      {/* --- DATE & TIME SELECTION --- */}
      <div className="space-y-4">
        <h4 className="font-medium text-brown border-b pb-2">1. Select Date & Time</h4>
        
        <div className="w-1/3">
          <Input
            id={`date-${i}`}
            label="Session Date"
            type="date"
            value={value.date}
            onChange={(e) => onChange(i, { ...value, date: e.target.value })}
          />
        </div>

        {value.date && (
          <div className="bg-neutral-50 p-4 rounded-md border border-neutral-100 space-y-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">Available Start Times (9:00 AM - 5:00 PM)</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Morning Slots */}
              <div>
                <h5 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Morning</h5>
                <div className="grid grid-cols-4 gap-2">
                  {morningSlots.map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => handleStartTimeSelect(slot.value)}
                      className={`py-1.5 text-sm rounded-md border transition-colors
                        ${value.startTime === slot.value 
                          ? "bg-brown text-white border-brown" 
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100"}`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Afternoon Slots */}
              <div>
                <h5 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Afternoon</h5>
                <div className="grid grid-cols-4 gap-2">
                  {afternoonSlots.map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => handleStartTimeSelect(slot.value)}
                      className={`py-1.5 text-sm rounded-md border transition-colors
                        ${value.startTime === slot.value 
                          ? "bg-brown text-white border-brown" 
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100"}`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* End Time Selection (Only shows after Start Time is picked) */}
            {value.startTime && (
              <div className="pt-4 mt-4 border-t border-neutral-200 w-1/2">
                <label className="block text-sm font-medium text-brown mb-1">Select End Time</label>
                <select
                  value={value.endTime}
                  onChange={(e) => onChange(i, { ...value, endTime: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 bg-white border-neutral-300 focus:border-neutral-500"
                >
                  <option value="" disabled>Choose duration/end time...</option>
                  {allSlots
                    .filter(slot => slot.value > value.startTime) // Only show times AFTER start time
                    .map(slot => (
                      <option key={`end-${slot.value}`} value={slot.value}>
                        {slot.label} {slot.period}
                      </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- LOCATION SELECTION --- */}
      <div className="space-y-4">
        <h4 className="font-medium text-brown border-b pb-2">2. Venue Location</h4>
        
        <div className="grid md:grid-cols-12 gap-3">
          <div className="md:col-span-8">
            <label className="block text-sm font-medium text-brown mb-1">Street Address 1 (Autofills)</label>
            <input
              ref={street1Ref}
              id={`street1-${i}`}
              placeholder="Start typing to search..."
              value={value.street1}
              onChange={(e) => onChange(i, { ...value, street1: e.target.value })}
              className="w-full rounded-md border px-3 py-2 outline-none border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </div>
          <div className="md:col-span-4">
            <Input id={`street2-${i}`} label="Apt/Suite" placeholder="Suite 100" value={value.street2} onChange={(e) => onChange(i, { ...value, street2: e.target.value })} />
          </div>
          <div className="md:col-span-5">
            <Input id={`city-${i}`} label="City" placeholder="Sacramento" value={value.city} onChange={(e) => onChange(i, { ...value, city: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Input id={`state-${i}`} label="State" placeholder="CA" value={value.state} onChange={(e) => onChange(i, { ...value, state: e.target.value })} />
          </div>
          <div className="md:col-span-4">
            <Input id={`zip-${i}`} label="Zip Code" placeholder="95814" value={value.zip} onChange={(e) => onChange(i, { ...value, zip: e.target.value })} />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-3">
            <Input id={`notes-${i}`} label="Venue / Notes (optional)" placeholder="Specific meeting spot, gate code, etc." value={value.notes} onChange={(e) => onChange(i, { ...value, notes: e.target.value })} />
          </div>
          <div className="md:col-span-1">
            <button type="button" onClick={() => onRemove(i)} className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-off-white hover:opacity-80 text-sm font-medium text-red-700">
              Remove Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage({ user, client }) {
  const dummyTypes = [
    { id: "1", name: "Portrait Session" },
    { id: "2", name: "Event Coverage" },
    { id: "3", name: "Wedding Photography" },
  ];

  const [sessionTypeId, setSessionTypeId] = useState(dummyTypes[0].id);
  const [message, setMessage] = useState("");
  
  // Updated default row to handle date, startTime, and endTime separately before combining them for the database later
  const defaultRow = { date: "", startTime: "", endTime: "", street1: "", street2: "", city: "", state: "", zip: "", notes: "" };
  const [rows, setRows] = useState([{ ...defaultRow }]);

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((r) => [...r, { ...defaultRow }]);
  const setRow = (i, v) => setRows((r) => r.map((x, ix) => (ix === i ? v : x)));
  const removeRow = (i) => setRows((r) => r.filter((_, ix) => ix !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setBusy(true);
    
    // Check if the user filled out the required time fields
    const invalidRows = rows.filter(r => !r.date || !r.startTime || !r.endTime);
    if (invalidRows.length > 0) {
      alert("Please ensure all sessions have a selected date, start time, and end time.");
      setBusy(false);
      return;
    }

    setTimeout(() => {
      setBusy(false);
      setSuccess(true);
      setRows([{ ...defaultRow }]);
      setMessage("");
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-serif text-brown">Book sessions</h1>

      <div className="rounded-md border border-[#E7DFCF] bg-off-white p-4 space-y-4 shadow-sm">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Type of Session</label>
            <select
              value={sessionTypeId}
              onChange={(e) => setSessionTypeId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 bg-white border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            >
              {dummyTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input id="message" label="Message / Special Requests" placeholder="Anything we should know?" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-[#E7DFCF]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-brown">Add Details</h3>
            <button type="button" onClick={addRow} className="rounded-md border border-neutral-300 bg-white px-3 py-2 hover:opacity-80 text-sm font-medium shadow-sm">
              + Add another session
            </button>
          </div>
          
          <div className="space-y-6 bg-neutral-50 p-4 rounded-md">
            {rows.map((row, i) => (
              <Row key={i} i={i} value={row} onChange={setRow} onRemove={removeRow} />
            ))}
          </div>

          {success && (
            <div className="text-sm rounded-md bg-green-50 border border-green-200 p-3 text-green-800">
              Test Booking Successful!
            </div>
          )}
          
          <div className="pt-2">
            <button disabled={busy || rows.length === 0} className="rounded-md bg-brown text-white px-6 py-2 border-2 border-black hover:bg-[#AB8C4B] disabled:opacity-50 transition-colors">
              {busy ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}