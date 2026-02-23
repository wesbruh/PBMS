import React, { useState } from "react";

function Input({ id, label, error, className = "", ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-brown mb-1">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`w-full rounded-md border px-3 py-2 outline-none
          ${
            error
              ? "border-red-500 focus:ring-2 focus:ring-red-200"
              : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Row({ i, value, onChange, onRemove }) {
  return (
    <div className="border border-neutral-200 rounded-md p-4 bg-white space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <Input
          id={`start-${i}`}
          label="Start Time"
          type="datetime-local"
          value={value.start}
          onChange={(e) => onChange(i, { ...value, start: e.target.value })}
        />
        <Input
          id={`end-${i}`}
          label="End Time"
          type="datetime-local"
          value={value.end}
          onChange={(e) => onChange(i, { ...value, end: e.target.value })}
        />
      </div>

      <div className="grid md:grid-cols-12 gap-3">
        <div className="md:col-span-8">
          <Input
            id={`street1-${i}`}
            label="Street Address 1"
            placeholder="123 Photography Ln"
            value={value.street1}
            onChange={(e) => onChange(i, { ...value, street1: e.target.value })}
          />
        </div>
        <div className="md:col-span-4">
          <Input
            id={`street2-${i}`}
            label="Apt/Suite"
            placeholder="Suite 100"
            value={value.street2}
            onChange={(e) => onChange(i, { ...value, street2: e.target.value })}
          />
        </div>
        <div className="md:col-span-5">
          <Input
            id={`city-${i}`}
            label="City"
            placeholder="Sacramento"
            value={value.city}
            onChange={(e) => onChange(i, { ...value, city: e.target.value })}
          />
        </div>
        <div className="md:col-span-3">
          <Input
            id={`state-${i}`}
            label="State"
            placeholder="CA"
            value={value.state}
            onChange={(e) => onChange(i, { ...value, state: e.target.value })}
          />
        </div>
        <div className="md:col-span-4">
          <Input
            id={`zip-${i}`}
            label="Zip Code"
            placeholder="95814"
            value={value.zip}
            onChange={(e) => onChange(i, { ...value, zip: e.target.value })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 items-end">
        <div className="md:col-span-3">
          <Input
            id={`notes-${i}`}
            label="Venue / Notes (optional)"
            placeholder="Specific meeting spot, gate code, etc."
            value={value.notes}
            onChange={(e) => onChange(i, { ...value, notes: e.target.value })}
          />
        </div>
        <div className="md:col-span-1">
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="w-full h-10 px-3 rounded-md border border-neutral-300 bg-off-white hover:opacity-80 text-sm font-medium"
          >
            Delete Row
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage({ user, client }) {
  // Dummy data to populate the UI without an API call
  const dummyTypes = [
    { id: "1", name: "Portrait Session" },
    { id: "2", name: "Event Coverage" },
    { id: "3", name: "Wedding Photography" },
  ];

  const [sessionTypeId, setSessionTypeId] = useState(dummyTypes[0].id);
  const [message, setMessage] = useState("");
  
  const defaultRow = { start: "", end: "", street1: "", street2: "", city: "", state: "", zip: "", notes: "" };
  const [rows, setRows] = useState([{ ...defaultRow }]);

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const addRow = () => setRows((r) => [...r, { ...defaultRow }]);
  const setRow = (i, v) => setRows((r) => r.map((x, ix) => (ix === i ? v : x)));
  const removeRow = (i) => setRows((r) => r.filter((_, ix) => ix !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    setBusy(true);
    
    // Fake a network request to test the loading UI
    setTimeout(() => {
      setBusy(false);
      setSuccess(true);
      setRows([{ ...defaultRow }]); // Reset form
      setMessage("");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-serif text-brown">Book sessions</h1>

      <div className="rounded-md border border-[#E7DFCF] bg-off-white p-4 space-y-4 shadow-sm">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-brown mb-1">
              Type of Session
            </label>
            <select
              value={sessionTypeId}
              onChange={(e) => setSessionTypeId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 bg-white border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            >
              {dummyTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input
              id="message"
              label="Message / Special Requests"
              placeholder="Anything we should know?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-[#E7DFCF]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-brown">Add date, time & location</h3>
            <button
              type="button"
              onClick={addRow}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 hover:opacity-80 text-sm font-medium shadow-sm"
            >
              + Add row
            </button>
          </div>
          
          <div className="space-y-4">
            {rows.map((row, i) => (
              <Row key={i} i={i} value={row} onChange={setRow} onRemove={removeRow} />
            ))}
          </div>

          {success && (
            <div className="text-sm rounded-md bg-green-50 border border-green-200 p-3 text-green-800">
              Test Booking Successful! (No actual data was sent)
            </div>
          )}
          
          <div className="pt-2">
            <button
              disabled={busy || rows.length === 0}
              className="rounded-md bg-brown text-white px-6 py-2 border-2 border-black hover:bg-[#AB8C4B] disabled:opacity-50 transition-colors"
            >
              {busy ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}