import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js"
import { useAuth } from "../../context/AuthContext.jsx";

import AddressAutoComplete from "../../components/AddressAutoComplete/AddressAutoComplete";
import TimeSlotGrid from "../../components/TimeSlotGrid/TimeSlotGrid.jsx";
import ContractDetail from "../Dashboard/ContractDetail.jsx";

export default function SessionPage() {
  const { user } = useAuth();
  const [session, setSession] = useState({
    clientId: user?.id,
    date: "",
    startTime: "",
    endTime: "",
    location_text: "",
    address: { street1: "", street2: "", city: "", state: "", zip: "" },
    dateTimeLocked: true,
    contractLocked: true,
    paymentLocked: true
  });
  
  const [contractTemplates, setContractTemplates] = useState();
  const [contract, setContract] = useState();

  const [pageNum, setPageNum] = useState(1);

  // load all contract templates once
  useEffect(() => {
    const loadContracts = async () => {
      const response = await fetch("http://localhost:5001/api/contract/templates", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      await data.forEach((template) => {
        setContractTemplates(prev => ({ ...prev, [`${template.id}`]: { "body": template.body, "name": template.name } }));
      });
    };

    loadContracts();
  }, []);

  // update address/location_text in session as input changes
  const handleAddressChange = (newAddr) => {
    setSession(prev => ({
      ...prev,
      address: newAddr,
      location_text: `${newAddr.street1}${newAddr.street2 ? ' ' + newAddr.street2 : ''}, ${newAddr.city}, ${newAddr.state} ${newAddr.zip}`
    }));
  };

  // unlock date/time on complete address input
  const handleDateTimeLock = (verifiedAddr) => {
    if (verifiedAddr.street1 && verifiedAddr.city && verifiedAddr.state) {
      setSession(prev => ({ ...prev, dateTimeLocked: false }));
    } else {
      if (session.address.street1 && session.address.city && session.address.state) {
        setSession(prev => ({ ...prev, dateTimeLocked: false }));
      } else {
        alert("Please provide a full address (Street, City, and State) to continue.");
      }
    }
  };

  const getDefaultContract = async () => {
    const response = await fetch("http://localhost:5001/api/contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id
      })
    });

    const data = await response.json()
    setContract(data);
    
    if (data?.status === "Signed")
      handlePaymentLock();
  };

  // unlock contract on complete date/time input
  const handleContractLock = () => {
    if (session.date && session.startTime && session.endTime) {
      setSession(prev => ({ ...prev, contractLocked: false }));
      setPageNum(2);
      getDefaultContract();
    } else {
      alert("Please select date and start/end times.");
    }
  };

  // unlock session booking / payment on complete contract signing
  const handlePaymentLock = () => {
    setSession(prev => ({ ...prev, paymentLocked: false }));
  };

  const handleBookingRequest = async () => {
    try {
      // create session w/ basic details
      const response = await fetch("http://localhost:5001/api/sessions/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: session.clientId,
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          location_text: session.location_text,
        }),
      });

      const data = await response.json();
      const sessionId = data?.id;
      
      if (response.ok) {
        // instantiate request body
        const currLoc = window.location.href;

        // create and retrieve checkout session information based on body
        const response = await fetch("http://localhost:5001/api/payment/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from_url: currLoc,
              apply_tax: true,
              tax_rate: 15
            })
        });

        const checkoutSession = await response.json();

        if (response.ok) {
          // upsert deposit_cs_id into db and 
          await supabase
            .from("Session")
            .upsert({ id: sessionId, deposit_cs_id: checkoutSession.id });
          
          // update is_active and session_id in db 
          await fetch(`http://localhost:5001/api/contract/${contract?.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "session_id": sessionId, "is_active": true }),
          });
          
          // redirect to Stripe
          window.location.href = checkoutSession.url;
        } else {
          await supabase
            .from("Session")
            .delete()
            .eq("id", sessionId);
          alert("Stripe connection failed.");
        }
      } else {
        alert(data.error || "Booking failed.");
      }
    } catch (err) {
      console.error("Booking Error:", err);
      alert("Server connection failed.");
    }
  };

  const updateContractTemplate = async (templateId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/contract/${contract?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "template_id": templateId }),
      });

      if (response.ok)
        setContract({ ...contract, template_id: templateId })
    } catch (error) {
      console.error("Failed to update contract:", error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-xl border border-[#E7DFCF] overflow-hidden">

        <div className="bg-brown p-10 text-center border-b border-[#6A4C2C]">
          <h1 className="text-3xl font-serif text-white tracking-widest uppercase">Book Your Session</h1>
          <p className="text-[#FDFCF9] opacity-90 mt-2 font-medium italic">Professional Photography Venue & Timing</p>
        </div>
        {pageNum === 1 ? (
          <div className="p-8 space-y-12 bg-[#FDFCF9]">

            <section className="space-y-6">
              <h2 className="text-xl font-serif text-brown border-b border-[#E7DFCF] pb-2">1. Venue Location</h2>
              <AddressAutoComplete
                addressData={session.address}
                onChange={handleAddressChange}
                onResolved={handleDateTimeLock}
              />

              {session.paymentLocked && session.contractLocked && session.dateTimeLocked && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => handleDateTimeLock(session.address)}
                    className="bg-brown text-white px-10 py-3 rounded shadow hover:opacity-90 transition-all font-bold uppercase text-sm tracking-widest"
                  >
                    Confirm Location
                  </button>
                </div>
              )}
            </section>

            <section className={`space-y-8 transition-all duration-700 ${session.dateTimeLocked ? "opacity-20 blur-md pointer-events-none" : "opacity-100 blur-0"}`}>
              <h2 className="text-xl font-serif text-brown border-b border-[#E7DFCF] pb-2">2. Pick a Date & Time</h2>
              <div className="max-w-xs">
                <label className="text-xs font-bold text-neutral-500 mb-1 block uppercase tracking-widest">Session Date</label>
                <input
                  type="date"
                  className="w-full rounded border border-neutral-300 px-4 py-3 bg-white outline-none focus:border-brown shadow-sm"
                  value={session.date}
                  onChange={(e) => setSession({ ...session, date: e.target.value })}
                />
              </div>

              {session.date && (
                <div className="animate-in fade-in duration-500">
                  <TimeSlotGrid
                    startTime={session.startTime}
                    endTime={session.endTime}
                    onSelectRange={(start, end) => setSession({ ...session, startTime: start, endTime: end })}
                  />
                </div>
              )}
            </section>

            {session.paymentLocked && session.contractLocked && !session.dateTimeLocked && (
              <div className="pt-10 border-t border-[#E7DFCF] text-center">
                <button
                  onClick={handleContractLock}
                  className="bg-brown text-white px-16 py-4 rounded font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-brown/30"
                >
                  Confirm Date and Time
                </button>
              </div>
            )}
          </div>) : (
          <div className="p-8 space-y-12 bg-[#FDFCF9]">
            <section className="space-y-6">
              <div className="text-xl flex flex-row font-serif text-brown border-b border-[#E7DFCF] pb-2">
                <h2 className="flex w-full">Contract</h2>
                <select
                  defaultValue=""
                  value={contract?.template_id}
                  onChange={(e) => { updateContractTemplate(e.target.value) }}
                  className={`px-2 py-1 rounded-md text-sm font-semibold border}`}
                  disabled={contract?.status === "Signed"}
                >
                  <option
                    disabled
                    value="">Select
                  </option>
                  {
                    Object.keys(contractTemplates)
                      .map((key) => {
                        return (
                          <option
                            key={key}
                            value={key}>{contractTemplates[key].name}
                          </option>
                        )
                      })
                  }
                </select>
              </div>
              <ContractDetail
                contract={contract}
                contractTemplate={contractTemplates[contract?.template_id] || null}
                onSigned={(contract) => {
                  handlePaymentLock();
                  setContract(contract);
              }}
              />
            </section>
            {!session.paymentLocked && !session.contractLocked && !session.dateTimeLocked && (
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
        )}
      </div>
    </div>
  );
}