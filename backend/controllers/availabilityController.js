// Availability CRUD for admin calendar (stores weekly hours JSON)
// Here we reuse the pool already created in server.js by requiring it from db/index.js.
const pool = require("../db/index");

async function getWeeklyAvailability(req, res) {
  const { adminUserId } = req.query;
  if (!adminUserId) return res.status(400).json({ error: "Missing adminUserId" });
  const { rows } = await pool.query(
    `select availability_rule from "Availability"
     where "admin_user_id"=$1 order by "created_at" desc limit 1`,
    [adminUserId]
  );
  res.json(rows[0]?.availability_rule || null);
}

async function upsertAvailability(req, res) {
  const { adminUserId, availability_rule, valid_from, valid_to } = req.body;
  if (!adminUserId || !availability_rule) return res.status(400).json({ error: "Invalid body" });
  const { rows } = await pool.query(
    `insert into "Availability" (id,"admin_user_id",availability_rule,valid_from,valid_to,created_at)
     values (gen_random_uuid(), $1, $2, $3::date, $4::date, now())
     returning availability_rule`,
    [adminUserId, JSON.stringify(availability_rule), valid_from || null, valid_to || null]
  );
  res.json(rows[0].availability_rule);
}

module.exports = { getWeeklyAvailability, upsertAvailability };
