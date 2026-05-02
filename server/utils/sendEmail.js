const nodemailer = require("nodemailer");
const dns = require("dns");

// ✅ IMPORTANT: Force IPv4 (fixes ENETUNREACH error)
dns.setDefaultResultOrder("ipv4first");

// ✅ Create transporter ONCE (better performance)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",     // ✅ explicit host (better than service)
  port: 587,
  secure: false,              // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // ⚠️ must be Gmail App Password
  },
  tls: {
    rejectUnauthorized: false, // optional safety for some hosts
  }
});

// ✅ Verify connection at startup (optional but recommended)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email server connection failed:", error.message);
  } else {
    console.log("✅ Email server is ready");
  }
});

// ✅ MAIN FUNCTION
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to || !subject || !html) {
      throw new Error("Missing email fields");
    }

    const info = await transporter.sendMail({
      from: `"TransportX 🚗" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.messageId);

  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
};

module.exports = sendEmail;