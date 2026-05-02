const nodemailer = require("nodemailer");
const dns = require("dns");

// ✅ Load env (VERY IMPORTANT – must be here or in server.js)
require("dotenv").config();

// ✅ Force IPv4 (fixes ENETUNREACH error)
dns.setDefaultResultOrder("ipv4first");

/* ======================================================
CHECK ENV VARIABLES (PREVENTS "PLAIN" ERROR)
====================================================== */

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Missing EMAIL credentials in .env file");
  console.error("👉 Add EMAIL_USER and EMAIL_PASS");
}

/* ======================================================
CREATE TRANSPORTER
====================================================== */

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // must be Gmail App Password
  },
});

/* ======================================================
VERIFY CONNECTION
====================================================== */

const verifyEmailServer = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email server is ready");
  } catch (error) {
    console.error("❌ Email server connection failed:", error.message);
  }
};

// Run once
verifyEmailServer();

/* ======================================================
SEND EMAIL FUNCTION
====================================================== */

const sendEmail = async ({ to, subject, html }) => {
  try {
    // ✅ Validate input
    if (!to || !subject || !html) {
      throw new Error("Missing email fields");
    }

    // ❌ Stop if credentials missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Email credentials not configured");
    }

    const info = await transporter.sendMail({
      from: `"TransportX 🚗" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.messageId);

    return true;

  } catch (err) {
    console.error("❌ Email error:", err.message);
    return false;
  }
};

module.exports = sendEmail;