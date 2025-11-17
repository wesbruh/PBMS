const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

pool.connect()
    .then(() => console.log(" PostgreSQL connected"))
    .catch(err => console.error("Database connection error:", err));

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// New Scheduling Routes
const sessionsRoutes = require("./routes/sessionsRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
app.use("/api/sessions", sessionsRoutes);
app.use("/api/availability", availabilityRoutes);


app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 5;");
    res.json({
      success: true,
      rows: result.rows,
    });
  } catch (err) {
    console.error("❌ Error querying database:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
