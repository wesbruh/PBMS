const UserModel = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require("dotenv").config();

exports.register = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await UserModel.findByEmail(email);
    if (existing) return res.status(400).json({ message: "User already exists" });

    const user = await UserModel.createUser(email, password);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Error registering user", error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findByEmail(email);
    if (!user) return res.status(404).json({ message: "Email not found" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    const expiry = Date.now() + 3600000;
    await UserModel.updateResetToken(email, resetToken, expiry);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const resetUrl = `https://localhost:3000/reset-password/${resetToken}`; //secure HTTPS
    await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_USER,
      subject: "PBMS Password Reset",
      html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here</a> to reset your password.</p>`,
    });

    res.json({ message: "Reset link sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error sending email", error: err.message });
  }
};
