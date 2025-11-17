import React, { useEffect, useState } from "react";
import AddressAutocomplete from "../components/AddressAutocomplete";
import { listSessionTypes, batchBookSessions, getEarliestOnDate } from "../lib/api";

function Input({ id, label, error, className="", ...props }){
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-brown mb-1">{label}</label>
      <input id={id} {...props}
        className={`w-full rounded-md border px-3 py-2 outline-none
          ${error ? "border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"} ${className}`} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Row({ i, value, onChange, onRemove, clientId }){
  const [hint, setHint] = useState(null);

  async function refreshHint(addr){
    try{
      if (!value.start?.slice?.(0,10) || !addr) { setHint(null); return; }
      const dateISO = value.start.slice(0,10);
      const { earliestISO } = await getEarliestOnDate({ clientId, dateISO, address: addr });
      setHint(earliestISO || null);
    }catch{ setHint(null); }
  }

  return (
    <div className="grid md:grid-cols-7 gap-3 items-end">
      <div className="md:col-span-2">
        <Input id={`start-${i}`} label="Start" type="datetime-local"
               value={value.start} onChange={e=>onChange(i,{...value,start:e.target.value})}/>
      </div>
      <div className="md:col-span-2">
        <Input id={`end-${i}`} label="End" type="datetime-local"
               value={value.end} onChange={e=>onChange(i,{...value,end:e.target.value})}/>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-brown mb-1">Event Address</label>
        <AddressAutocomplete
          value={value.location_text}
          onSelect={({address, latitude, longitude})=>{
            onChange(i,{...value,location_text:address, latitude, longitude});
            refreshHint(address);
          }}
          placeholder="Start typing address..."
        />
        {hint && (
          <p className="text-xs text-neutral-600 mt-1">
            Earliest suggested start on {value.start?.slice?.(0,10)} is <b>{new Date(hint).toLocaleTimeString()}</b> (travel considered).
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={()=>onRemove(i)}
          className="h-10 px-3 rounded-md border border-neutral-300 bg-off-white hover:opacity-80">
          Delete
        </button>
      </div>
      <div className="md:col-span-2">
        <Input id={`addr-${i}`} label="Venue / Notes (optional)" placeholder="Optional details"
               value={value.specific_address||""} onChange={e=>onChange(i,{...value,specific_address:e.target.value})}/>
      </div>
    </div>
  );
}

export default function SessionPage({ user, client }){
  // user.id = signed-in customer; client.id = admin id (owner of the calendar) stored in Session.client_id
  const userId = user?.id;
  const clientId = client?.id;

  const [types, setTypes] = useState([]);
  const [sessionTypeId, setSessionTypeId] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState([{ start:"", end:"", location_text:"", specific_address:"", latitude:null, longitude:null }]);

  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [successIds,setSuccessIds] = useState([]);

  useEffect(()=>{ (async()=>{
    const t = await listSessionTypes(); setTypes(t); setSessionTypeId(t?.[0]?.id || "");
  })(); },[]);

  const addRow    = ()=> setRows(r=>[...r,{ start:"", end:"", location_text:"", specific_address:"", latitude:null, longitude:null }]);
  const setRow    = (i,v)=> setRows(r=>r.map((x,ix)=> ix===i? v : x));
  const removeRow = (i)=> setRows(r=>r.filter((_,ix)=>ix!==i));

  const handleSubmit = async (e)=>{
    e.preventDefault(); if(!userId || !clientId) return;
    try{
      setBusy(true); setError("");
      const items = rows
        .filter(r=> r.start && r.end && r.location_text)
        .map(r=>({
          start:r.start, end:r.end, location_text:r.location_text,
          specific_address:r.specific_address || null,
          latitude: r.latitude, longitude: r.longitude
        }));
      const res = await batchBookSessions({ clientId, userId, items, message, sessionTypeId });
      setSuccessIds(res.ids||[]);
      setRows([{ start:"", end:"", location_text:"", specific_address:"", latitude:null, longitude:null }]);
      setMessage("");
    }catch(err){ setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-serif text-brown">Book sessions</h1>

      <div className="rounded-md border border-[#E7DFCF] bg-off-white p-4 space-y-4 shadow-sm">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-brown mb-1">Type of Session</label>
            <select value={sessionTypeId} onChange={e=>setSessionTypeId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 bg-white border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200">
              {types.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <Input id="message" label="Message / Special Requests" placeholder="Anything we should know?"
                   value={message} onChange={e=>setMessage(e.target.value)} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-brown">Add date, time & location</h3>
            <button type="button" onClick={addRow}
              className="rounded-md border border-neutral-300 bg-off-white px-3 py-2 hover:opacity-80">
              + Add row
            </button>
          </div>
          <div className="space-y-4">
            {rows.map((row,i)=>(
              <Row key={i} i={i} value={row} onChange={setRow} onRemove={removeRow} clientId={clientId}/>
            ))}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {successIds.length>0 && (
            <div className="text-sm rounded-md bg-green-50 border border-green-200 p-3">
              Booked! References: {successIds.map(id=>id.slice(0,8)).join(", ")}
            </div>
          )}
          <div className="pt-2">
            <button disabled={busy}
              className="rounded-md bg-brown text-white px-4 py-2 border-2 border-black hover:bg-[#AB8C4B] disabled:opacity-50">
              {busy? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
