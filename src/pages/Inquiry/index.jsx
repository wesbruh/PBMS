import React, { useState } from "react";
import AddressAutoComplete from "../../components/AddressAutoComplete/AddressAutoComplete";
import TimeSlotGrid from "../../components/TimeSlotGrid/TimeSlotGrid.jsx";

export default function SessionPage() {
  const [session, setSession] = useState({
    date: "",
    startTime: "",
    endTime: "",
    address: { street1: "", street2: "", city: "", state: "", zip: "" },
    isLocked: true 
  });

  const handleAddressChange = (addr) => setSession({ ...session, address: addr });

  // This function allows the user to manually "confirm" if the API isn't working/key is removed
  const confirmLocation = () => {
    const { street1, city, state, zip } = session.address;
    if (street1 && city && state && zip) {
      setSession({ ...session, isLocked: false });
    } else {
      alert("Please ensure the address, city, state, and zip are filled out.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 font-sans">
      <div className="bg-white rounded-md shadow-sm border border-[#E7DFCF] overflow-hidden">
        {/* Header - Back to Brown Palette */}
        <div className="bg-[#FAF9F6] border-b border-[#E7DFCF] p-8 text-center">
          <h1 className="text-3xl font-serif text-brown">Book Your Session</h1>
          <p className="text-neutral-500 mt-2 italic">Fill in your details below to request a time.</p>
        </div>

        <div className="p-8 space-y-12">
          {/* STEP 1: Address Entry */}
          <section className="space-y-6">
            <h2 className="text-lg font-serif text-brown border-b border-[#E7DFCF] pb-2">1. Venue Location</h2>
            
            <AddressAutoComplete 
              addressData={session.address} 
              onChange={handleAddressChange} 
              onResolved={() => setSession(s => ({...s, isLocked: false}))}
            />

            {session.isLocked && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={confirmLocation}
                  className="bg-brown text-white px-8 py-2 rounded-md font-medium hover:bg-[#AB8C4B] transition-colors shadow-sm"
                >
                  Confirm Location to See Times
                </button>
              </div>
            )}
          </section>

          {/* STEP 2: Date & Time (Unblurs after address is confirmed) */}
          <section className={`space-y-8 transition-all duration-700 ${session.isLocked ? "opacity-20 blur-sm pointer-events-none" : "opacity-100 blur-0"}`}>
            <h2 className="text-lg font-serif text-brown border-b border-[#E7DFCF] pb-2">2. Select Date & Time</h2>
            
            <div className="max-w-xs">
              <label className="text-xs font-bold text-neutral-400 mb-1 block uppercase tracking-widest">Pick a Date</label>
              <input 
                type="date" 
                className="w-full rounded border border-neutral-300 px-3 py-2 outline-none focus:border-brown"
                value={session.date}
                onChange={(e) => setSession({...session, date: e.target.value})}
              />
            </div>

            {session.date && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <TimeSlotGrid 
                  startTime={session.startTime} 
                  endTime={session.endTime} 
                  onSelectRange={(start, end) => setSession({...session, startTime: start, endTime: end})} 
                />
              </div>
            )}
          </section>

          {/* Final Action */}
          {!session.isLocked && session.startTime && session.endTime && (
            <div className="pt-8 flex justify-center border-t border-[#E7DFCF]">
              <button className="bg-brown text-white px-12 py-3 rounded-md font-bold text-lg hover:bg-[#AB8C4B] transition-transform active:scale-95 shadow-md">
                Send Booking Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}