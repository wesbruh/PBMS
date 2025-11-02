const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});


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


module.exports = router;
