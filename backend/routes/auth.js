const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const https = require("https");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function supabaseRequest(path, { method = "GET", headers = {} } = {}) {
  if (!SUPABASE_URL) {
    return Promise.reject(new Error("Missing SUPABASE_URL environment variable."));
  }

  const url = new URL(path, SUPABASE_URL);
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = data;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = data;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err = new Error(
              parsed?.error_description ||
                parsed?.error ||
                parsed?.message ||
                `Supabase request failed (${res.statusCode})`
            );
            err.status = res.statusCode;
            err.response = parsed;
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}


// Route for the Login 
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    //Required field check
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    //Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    //Lookup user in database
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    //Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    //Create JWT and respond
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, message: "Login successful" });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


//Forgot password routing
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    //Find the user by email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "Email not found" });

    //Generate reset token & expiry
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetExpire = new Date(Date.now() + 3600000); // 1 hour

    //Save to database
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_expires = $2 WHERE email = $3",
      [resetToken, resetExpire, email]
    );

    //Create transporter (Ethereal in dev, Gmail in prod)
    let transporter;
    if (process.env.NODE_ENV === "production") {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    //Construct email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
      <h3>Password Reset Request</h3>
      <p>Hello, ${user.email}</p>
      <p>You requested a password reset for your PBMS account.</p>
      <p><a href="${resetUrl}">Click here</a> to reset your password. This link expires in 1 hour.</p>
    `;

    //Send email
    const info = await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_USER || "no-reply@pbms.local",
      subject: "PBMS Password Reset",
      html: message,
    });

    console.log(`📧 Password reset email (dev) sent to ${user.email}`);

    //Log Ethereal preview URL
    if (process.env.NODE_ENV !== "production") {
      console.log("🔗 Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    res.json({ message: "Reset email sent successfully" });
  } catch (err) {
    console.error("❌ Forgot-password error:", err);
    res.status(500).json({ message: "Error sending email", error: err.message });
  }
});

//Route to reset password

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    //Find user by reset token and ensure it's still valid
    const result = await pool.query(
      "SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()",
      [token]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    //Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    //Update user's password and clear reset fields
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2",
      [hashedPassword, user.id]
    );

    console.log(`🔐 Password successfully reset for ${user.email}`);
    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset-password error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete the currently authenticated Supabase user and their profile row
router.delete("/account", async (req, res) => {
  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res
      .status(500)
      .json({ message: "Supabase credentials not configured on server." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Missing Authorization token." });
  }

  let authUser;
  try {
    authUser = await supabaseRequest("/auth/v1/user", {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error("Supabase session validation failed:", err);
    return res.status(401).json({ message: "Invalid session token." });
  }

  const userId = authUser?.id;
  if (!userId) {
    return res.status(400).json({ message: "Unable to determine user id." });
  }

  try {
    await supabaseRequest(`/rest/v1/User?id=eq.${userId}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal",
      },
    });
  } catch (err) {
    console.error("Failed deleting User row:", err);
    // continue attempting to delete the auth user to avoid leaving a dangling account
  }

  try {
    await supabaseRequest(`/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
  } catch (err) {
    console.error("Failed deleting Supabase auth user:", err);
    return res.status(500).json({ message: "Could not remove auth user." });
  }

  return res.json({ success: true });
});


module.exports = router;
