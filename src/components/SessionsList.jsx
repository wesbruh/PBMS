import React, { useMemo } from "react";

function Badge({ children, tone="gray" }){
  const tones = {
    gray: "bg-neutral-100 text-neutral-800",
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export default function SessionsList({ sessions=[], onCancel }){
  const now = new Date();
  const { upcoming, past } = useMemo(()=>{
    const up=[], pa=[];
    for (const s of sessions){ (new Date(s.start_at) >= now ? up : pa).push(s); }
    up.sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
    pa.sort((a,b)=>new Date(b.start_at)-new Date(a.start_at));
    return { upcoming:up, past:pa };
  }, [sessions]);

  const Card = ({ s }) => (
    <div className="rounded-md border border-[#E7DFCF] bg-white p-4 flex items-center justify-between shadow-sm">
      <div>
        <div className="font-semibold text-brown">
          {s.session_type_name || "Session"} <span className="text-sm text-neutral-500">#{s.id?.slice?.(0,8)}</span>
        </div>
        <div className="text-sm text-neutral-700">
          {new Date(s.start_at).toLocaleString()} — {new Date(s.end_at).toLocaleString()}
        </div>
        {s.location_text && <div className="text-xs text-neutral-500">{s.location_text}</div>}
        <div className="mt-1"><Badge tone={s.status==='canceled'?'red':'blue'}>{s.status || 'booked'}</Badge></div>
      </div>
      {s.status!=='canceled' && new Date(s.start_at)>new Date() && (
        <button onClick={()=>onCancel?.(s)} className="rounded-md border border-neutral-300 bg-off-white px-3 py-2 hover:opacity-80">
          Cancel
        </button>
      )}
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-serif text-brown mb-2">Upcoming</h3>
        <div className="space-y-3">{upcoming.length ? upcoming.map(s => <Card key={s.id} s={s} />) : <div className="text-sm text-neutral-600">No upcoming sessions.</div>}</div>
      </div>
      <div>
        <h3 className="text-lg font-serif text-brown mb-2">Past</h3>
        <div className="space-y-3">{past.length ? past.map(s => <Card key={s.id} s={s} />) : <div className="text-sm text-neutral-600">No past sessions yet.</div>}</div>
      </div>
    </div>
  );
}
