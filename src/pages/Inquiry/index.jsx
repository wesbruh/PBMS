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
      location_text: `${newAddr.street1}${newAddr.street2 ? ' ' + newAddr.street2 : ''}, ${newAddr.city}, ${newAddr.state} ${newAddr.zip}`
    }));
  };

  const handleUnlock = (verifiedAddr) => {
    // We check the incoming verified address immediately
    if (verifiedAddr.street1 && verifiedAddr.city && verifiedAddr.state) {
      setSession(prev => ({ ...prev, isLocked: false }));
    } else {
      // Manual backup check if button is clicked
      if (session.address.street1 && session.address.city && session.address.state) {
        setSession(prev => ({ ...prev, isLocked: false }));
      } else {
        alert("Please provide a full address (Street, City, and State) to continue.");
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-xl border border-[#E7DFCF] overflow-hidden">
        
        {/* HEADER: Original Brown */}
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
            
            {/* Show Confirm button only if still locked */}
            {session.isLocked && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => handleUnlock(session.address)}
                  className="bg-brown text-white px-10 py-3 rounded shadow hover:opacity-90 transition-all font-bold uppercase text-sm tracking-widest"
                >
                  Confirm Location
                </button>
              </div>
            )}
          </section>

          {/* STEP 2: Unlocked by address selection */}
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