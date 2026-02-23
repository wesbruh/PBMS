import React, { useState } from "react";
import AddressAutoComplete from "../../components/AddressAutoComplete/AddressAutoComplete";
import TimeSlotGrid from "../../components/TimeSlotGrid/TimeSlotGrid.jsx";

export default function SessionPage() {
  const [session, setSession] = useState({
    date: "",
    startTime: "",
    endTime: "",
    location_text: "", 
    address: { street1: "", street2: "", city: "", state: "", zip: "" },
    isLocked: true 
  });

  const handleAddressChange = (newAddr) => {
    setSession(prev => ({ 
      ...prev, 
      address: newAddr,
      location_text: `${newAddr.street1}, ${newAddr.city}, ${newAddr.state} ${newAddr.zip}`
    }));
  };

  const handleUnlock = (dataToCheck) => {
    const addr = dataToCheck || session.address;
    if (addr.street1 && addr.city && addr.state) {
      setSession(prev => ({ ...prev, isLocked: false }));
    } else if (!dataToCheck) {
      alert("Please enter at least Street, City, and State.");
    }
  };

  const handleBookingRequest = async () => {
    if (!session.date || !session.startTime || !session.endTime) {
      alert("Please select a valid date and time range.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/sessions/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          location_text: session.location_text,
        }),
      });

      if (response.ok) {
        alert("Success! Your booking request has been submitted.");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "There was an error booking your session.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Failed to connect to the server.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-xl border border-[#E7DFCF] overflow-hidden">
        
        <div className="bg-brown p-10 text-center border-b border-[#6A4C2C]">
          <h1 className="text-3xl font-serif text-white tracking-widest uppercase">Book Your Session</h1>
          <p className="text-[#FDFCF9] opacity-90 mt-2 font-medium italic">Professional Photography Venue & Timing</p>
        </div>

        <div className="p-8 space-y-12 bg-[#FDFCF9]">
          
          <section className="space-y-6">
            <h2 className="text-xl font-serif text-brown border-b border-[#E7DFCF] pb-2">1. Venue Location</h2>
            <AddressAutoComplete 
              addressData={session.address} 
              onChange={handleAddressChange} 
              onResolved={handleUnlock}
            />
            {session.isLocked && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => handleUnlock()}
                  className="bg-brown text-white px-10 py-3 rounded shadow hover:opacity-90 transition-all font-bold uppercase text-sm tracking-widest"
                >
                  Confirm Location
                </button>
              </div>
            )}
          </section>

          <section className={`space-y-8 transition-all duration-700 ${session.isLocked ? "opacity-20 blur-md pointer-events-none" : "opacity-100 blur-0"}`}>
            <h2 className="text-xl font-serif text-brown border-b border-[#E7DFCF] pb-2">2. Pick a Date & Time</h2>
            <div className="max-w-xs">
              <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-widest">Session Date</label>
              <input 
                type="date" 
                className="w-full rounded border border-neutral-300 px-4 py-3 bg-white outline-none focus:border-brown shadow-sm"
                value={session.date}
                onChange={(e) => setSession({...session, date: e.target.value})}
              />
            </div>

            {session.date && (
              <div className="animate-in fade-in duration-500">
                <TimeSlotGrid 
                  startTime={session.startTime} 
                  endTime={session.endTime} 
                  onSelectRange={(start, end) => setSession({...session, startTime: start, endTime: end})} 
                />
              </div>
            )}
          </section>

          {!session.isLocked && session.startTime && session.endTime && (
            <div className="pt-10 border-t border-[#E7DFCF] text-center">
              <button 
                onClick={handleBookingRequest}
                className="bg-brown text-white px-16 py-4 rounded font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-brown/30"
              >
                Send Booking Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}