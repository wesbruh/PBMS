const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

export async function listSessionTypes(){
  return fetch(`${API_BASE}/api/sessions/types`).then(r=>r.json());
}

export async function listClientSessions(clientId){
  const u = new URL(`${API_BASE}/api/sessions/client`);
  u.searchParams.set("clientId", clientId);
  return fetch(u).then(r=>r.json());
}

export async function batchBookSessions(payload){
  const r = await fetch(`${API_BASE}/api/sessions/batch`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload)
  });
  if(!r.ok){
    let msg = "Failed to book";
    try { const j = await r.json(); msg = j.error || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function getEarliestOnDate({ clientId, dateISO, address }){
  const r = await fetch(`${API_BASE}/api/sessions/earliest`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ clientId, dateISO, address })
  });
  return r.json();
}

// Admin availability helpers
export async function getAvailability(adminUserId){
  const u = new URL(`${API_BASE}/api/availability`);
  u.searchParams.set("adminUserId", adminUserId);
  return fetch(u).then(r=>r.json());
}
export async function setAvailability(payload){
  const r = await fetch(`${API_BASE}/api/availability`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload)
  });
  return r.json();
}
