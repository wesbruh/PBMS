// Booking logic: overlap guard, availability windows, and commute checks (Google Distance Matrix)
const pool = require("../db/index");
const { geocodeAddress, distanceMinutes } = require("../utils/googleMaps");

const OVERLAP_SQL = `
  select exists (
    select 1 from "Session"
    where "client_id" = $1
      and coalesce("status",'booked') <> 'canceled'
      and tstzrange("start_at","end_at",'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)')
  ) as has_overlap;
`;

const BASE_ADDRESS = process.env.ADMIN_BASE_ADDRESS || "Sacramento, CA";

// Availability JSON: [{ dow: 1..7 (0=Sun), start: "09:00", end:"17:00" }]
function isWithinAvailability(avJson, startISO, endISO) {
  if (!avJson) return true;
  try {
    const rules = Array.isArray(avJson) ? avJson : JSON.parse(avJson);
    const s = new Date(startISO), e = new Date(endISO);
    const dow = s.getDay(); // 0..6
    const toHM = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    const sHM = toHM(s), eHM = toHM(e);
    const todays = rules.filter(r => Number(r.dow) === dow);
    if (todays.length === 0) return false;
    return todays.some(r => sHM >= r.start && eHM <= r.end);
  } catch { return true; }
}

async function fetchAvailability(adminUserId) {
  const { rows } = await pool.query(
    `select availability_rule from "Availability"
     where "admin_user_id"=$1 order by "created_at" desc limit 1`,
    [adminUserId]
  );
  return rows[0]?.availability_rule || null;
}

async function neighborSessions(client, adminUserId, whenISO) {
  const prevQ = `
    select id, start_at, end_at, location_text, latitude, longitude
    from "Session"
    where "client_id"=$1 and coalesce("status",'booked') <> 'canceled'
      and "end_at" <= $2
    order by "end_at" desc limit 1`;
  const nextQ = `
    select id, start_at, end_at, location_text, latitude, longitude
    from "Session"
    where "client_id"=$1 and coalesce("status",'booked') <> 'canceled'
      and "start_at" >= $2
    order by "start_at" asc limit 1`;
  const prev = (await client.query(prevQ, [adminUserId, whenISO])).rows[0] || null;
  const next = (await client.query(nextQ, [adminUserId, whenISO])).rows[0] || null;
  return { prev, next };
}

async function ensureCoords(obj){
  if (!obj) return null;
  if (obj.latitude != null && obj.longitude != null) return { lat: Number(obj.latitude), lng: Number(obj.longitude) };
  if (obj.location_text) {
    const g = await geocodeAddress(obj.location_text);
    if (g) return { lat: g.lat, lng: g.lng };
  }
  return null;
}

// UI helper for earliest feasible start on given date+address (availability + travel from base/last session)
async function earliestOnDate(req, res) {
  try {
    const { clientId, dateISO, address } = req.body;
    if (!clientId || !dateISO || !address) return res.status(400).json({ error: "Missing clientId|dateISO|address" });

    const dayStart = new Date(dateISO); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dateISO);   dayEnd.setHours(23,59,59,999);

    const { rows } = await pool.query(
      `select id, start_at, end_at, location_text, latitude, longitude
       from "Session"
       where "client_id"=$1 and coalesce("status",'booked') <> 'canceled'
         and "start_at" >= $2 and "start_at" <= $3
       order by "start_at" asc`,
      [clientId, dayStart, dayEnd]
    );

    const targetG = await geocodeAddress(address);
    if (!targetG) return res.json({ earliestISO: null });

    const availability = await fetchAvailability(clientId);

    if (rows.length === 0) {
      const mins = await distanceMinutes({ address: BASE_ADDRESS }, { lat: targetG.lat, lng: targetG.lng }) || 0;
      const startCandidate = new Date(dayStart.getTime() + mins*60000);
      let ts = new Date(startCandidate);
      for (let i=0;i<96;i++){
        const end = new Date(ts.getTime()+60*60000);
        if (isWithinAvailability(availability, ts.toISOString(), end.toISOString())) {
          return res.json({ earliestISO: ts.toISOString() });
        }
        ts = new Date(ts.getTime()+15*60000);
      }
      return res.json({ earliestISO: null });
    }

    const lastBooked = rows[rows.length-1];
    const prevCoords = await ensureCoords(lastBooked);
    const mins = await distanceMinutes(
      prevCoords || { address: BASE_ADDRESS },
      { lat: targetG.lat, lng: targetG.lng }
    ) || 0;
    const candidate = new Date(new Date(lastBooked.end_at).getTime() + mins*60000);

    let ts = candidate;
    for (let i=0;i<96;i++){
      const end = new Date(ts.getTime()+60*60000);
      if (isWithinAvailability(availability, ts.toISOString(), end.toISOString())) {
        return res.json({ earliestISO: ts.toISOString() });
      }
      ts = new Date(ts.getTime()+15*60000);
    }
    return res.json({ earliestISO: null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function listSessionTypes(req, res) {
  const { rows } = await pool.query(
    `select id, name, default_duration_minutes
     from "SessionType"
     where coalesce(active,true)=true
     order by name`
  );
  res.json(rows);
}

async function listClientSessions(req, res) {
  const clientId = req.query.clientId;
  if (!clientId) return res.status(400).json({ error: "Missing clientId" });
  const { rows } = await pool.query(
    `select s.*, st.name as session_type_name
     from "Session" s
     left join "SessionType" st on st.id = s."session_type_id"
     where s."client_id"=$1
     order by s."start_at" desc`,
    [clientId]
  );
  res.json(rows);
}

async function listUserSessions(req, res) {
  const clientId = req.query.clientId;
  if (clientId) return listClientSessions(req, res);
  res.json([]);
}

async function batchBook(req, res) {
  const { clientId, userId, items, message, sessionTypeId } = req.body;
  if (!clientId || !userId || !Array.isArray(items) || items.length===0 || !sessionTypeId) {
    return res.status(400).json({ error: "Invalid body" });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const availability = await fetchAvailability(clientId);

    for (const it of items) {
      const { start, end } = it;

      if (!isWithinAvailability(availability, start, end)) {
        throw new Error(`Outside available hours for ${new Date(start).toLocaleDateString()}`);
      }

      const ov = await client.query(OVERLAP_SQL, [clientId, start, end]);
      if (ov.rows[0]?.has_overlap) throw new Error(`Time conflict for ${start} – ${end}`);

      const { prev, next } = await neighborSessions(client, clientId, start);
      const target = {
        location_text: it.location_text,
        latitude: it.latitude,
        longitude: it.longitude
      };

      let targetCoords = await ensureCoords(target);
      if (!targetCoords && target.location_text) {
        const g = await geocodeAddress(target.location_text);
        if (g) targetCoords = { lat: g.lat, lng: g.lng };
      }

      if (prev) {
        let fromPrev = await ensureCoords(prev);
        if (!fromPrev && prev.location_text) {
          const g = await geocodeAddress(prev.location_text);
          if (g) fromPrev = { lat: g.lat, lng: g.lng };
        }
        const mins = await distanceMinutes(
          fromPrev || { address: BASE_ADDRESS },
          targetCoords || { address: it.location_text }
        ) || 0;
        const gap = (new Date(start) - new Date(prev.end_at)) / 60000;
        if (gap < mins) throw new Error(`Need ${mins} min travel after previous session`);
      } else {
        const mins = await distanceMinutes(
          { address: BASE_ADDRESS },
          targetCoords || { address: it.location_text }
        ) || 0;
        const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
        const minStart = new Date(dayStart.getTime() + mins*60000);
        if (new Date(start) < minStart) throw new Error(`Earliest start is ${minStart.toLocaleTimeString()} considering travel from base`);
      }

      if (next) {
        let toNext = await ensureCoords(next);
        if (!toNext && next.location_text) {
          const g = await geocodeAddress(next.location_text);
          if (g) toNext = { lat: g.lat, lng: g.lng };
        }
        const mins = await distanceMinutes(
          targetCoords || { address: it.location_text },
          toNext || { address: next.location_text }
        ) || 0;
        const gap = (new Date(next.start_at) - new Date(end)) / 60000;
        if (gap < mins) throw new Error(`Need ${mins} min travel before next session`);
      }
    }

    const ids = [];
    for (const it of items) {
      const { rows } = await client.query(
        `insert into "Session" (
          id, "client_id", "session_type_id", "start_at","end_at",
          location_text, specific_address, latitude, longitude,
          "status","notes","created_at"
        ) values (
          gen_random_uuid(), $1, $2, $3::timestamptz, $4::timestamptz,
          $5, $6, $7, $8,
          'booked', $9, now()
        ) returning id`,
        [
          clientId, sessionTypeId, it.start, it.end,
          it.location_text || null, it.specific_address || null,
          it.latitude ?? null, it.longitude ?? null,
          message || null,
        ]
      );
      ids.push(rows[0].id);
    }

    await client.query("commit");
    res.json({ ok: true, ids });
  } catch (e) {
    await client.query("rollback");
    res.status(409).json({ error: e.message });
  } finally { client.release(); }
}

async function cancelSession(req, res) {
  const { id } = req.params;
  await pool.query(`update "Session" set "status"='canceled', "updated_at"=now() where id=$1`, [id]);
  res.json({ ok: true });
}

module.exports = {
  listSessionTypes,
  listClientSessions,
  listUserSessions,
  batchBook,
  cancelSession,
  earliestOnDate,
};
