const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  const info = await transporter.sendMail({
    from: `"TransportX Support" <${process.env.EMAIL}>`,
    to,
    subject,
    html
  });

  console.log("📧 Email result:", info);
};

module.exports = sendEmail;
