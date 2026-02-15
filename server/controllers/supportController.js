const SupportMessage = require("../models/SupportMessage");
const sendEmail = require("../utils/sendEmail");


// ======================================================
// CREATE SUPPORT MESSAGE (PUBLIC)
// ======================================================
exports.createMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // ================= VALIDATION =================
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // ================= SAVE MESSAGE =================
    const msg = await SupportMessage.create({
      name,
      email,
      message,
      status: "pending",
      createdAt: new Date()
    });

    // ================= EMAIL ADMIN =================
    try {
      await sendEmail(
        process.env.EMAIL,
        "📩 New Support Complaint - TransportX",
        `
        <h2>New Complaint Received</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <blockquote>${message}</blockquote>
        <br/>
        <small>Time: ${new Date().toLocaleString()}</small>
        `
      );

      console.log("📧 Admin notified successfully");

    } catch (mailErr) {
      console.error("❌ ADMIN EMAIL FAILED:", mailErr.message);
    }

    // ================= RESPONSE =================
    res.status(201).json({
      success: true,
      message: "Support message submitted successfully",
      data: msg
    });

  } catch (err) {
    console.error("❌ CREATE MESSAGE ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error while sending message"
    });
  }
};




// ======================================================
// GET ALL MESSAGES (ADMIN)
// ======================================================
exports.getMessages = async (req, res) => {
  try {
    const messages = await SupportMessage
      .find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });

  } catch (err) {
    console.error("❌ FETCH MESSAGES ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch support messages"
    });
  }
};




// ======================================================
// RESOLVE MESSAGE (ADMIN)
// ======================================================
exports.resolveMessage = async (req, res) => {
  try {
    const msg = await SupportMessage.findById(req.params.id);

    if (!msg) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // prevent double resolve
    if (msg.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Message already resolved"
      });
    }

    // update status
    msg.status = "resolved";
    msg.resolvedAt = new Date();
    await msg.save();

    // ================= EMAIL USER =================
    try {
      await sendEmail(
        msg.email,
        "✅ Your Complaint Has Been Resolved | TransportX",
        `
        <h2>Hello ${msg.name}</h2>
        <p>Your complaint has been resolved by our support team.</p>

        <p><b>Your Message:</b></p>
        <blockquote>${msg.message}</blockquote>

        <br/>

        <p>If you still face issues, reply to this email.</p>

        <br/>
        <small>Resolved at: ${new Date().toLocaleString()}</small>
        `
      );

      console.log("📧 Resolution email sent to user");

    } catch (mailErr) {
      console.error("❌ USER EMAIL FAILED:", mailErr.message);
    }

    // ================= RESPONSE =================
    res.json({
      success: true,
      message: "Support message resolved successfully"
    });

  } catch (err) {
    console.error("❌ RESOLVE ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error resolving message"
    });
  }
};
