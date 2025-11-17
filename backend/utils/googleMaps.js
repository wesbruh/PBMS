// Google Geocoding + Distance Matrix utilities
// Requires GOOGLE_MAPS_API_KEY in backend/.env
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

const GMAPS_BASE = "https://maps.googleapis.com/maps/api";
const KEY = process.env.GOOGLE_MAPS_API_KEY;

async function geocodeAddress(address){
  const url = `${GMAPS_BASE}/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const g = j.results?.[0];
  if (!g) return null;
  const { lat, lng } = g.geometry.location;
  const formatted_address = g.formatted_address;
  return { lat, lng, formatted_address };
}

async function distanceMinutes(origin, destination){
  // origin/destination: { lat, lng } OR { address: string }
  const o = origin.lat!=null ? `${origin.lat},${origin.lng}` : origin.address;
  const d = destination.lat!=null ? `${destination.lat},${destination.lng}` : destination.address;
  const url = `${GMAPS_BASE}/distancematrix/json?origins=${encodeURIComponent(o)}&destinations=${encodeURIComponent(d)}&mode=driving&departure_time=now&key=${KEY}`;
  const r = await fetch(url);
  const j = await r.json();
  const cell = j.rows?.[0]?.elements?.[0];
  if (!cell || cell.status !== "OK") return null;
  const seconds = cell.duration_in_traffic?.value || cell.duration?.value || 0;
  return Math.ceil(seconds / 60);
}

module.exports = { geocodeAddress, distanceMinutes };
