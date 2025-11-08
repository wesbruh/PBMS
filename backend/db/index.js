const { Pool } = require("pg");
require("dotenv").config();

// Added SSL handling for connecting directly from Node to Supabase's Postgres.  
const sslConfig = 
  process.env.PG_SSL === "true"
    ? {rejectUnauthorized: false }
    : false;
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: sslConfig, // Protects backend <-> Supabase database
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch((err) => console.error("❌ Database connection error:", err));

module.exports = pool;
