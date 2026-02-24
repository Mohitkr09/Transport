const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");
const { protect } = require("../middleware/authMiddleware");

/* ======================================================
STRIPE INIT
====================================================== */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ======================================================
CONFIG
====================================================== */
const SESSION_EXPIRY_MINUTES = 45; // production safe value


/* ======================================================
CREATE CHECKOUT SESSION
====================================================== */
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId)
      return res.status(400).json({
        success: false,
        message: "Ride ID required"
      });

    const ride = await Ride.findById(rideId);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    /* ================= OWNER CHECK ================= */
    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({
        success: false,
        message: "Unauthorized ride access"
      });

    /* ================= ALREADY PAID ================= */
    if (ride.paymentStatus === "paid")
      return res.status(400).json({
        success: false,
        message: "Ride already paid"
      });

    /* ================= VALIDATE FARE ================= */
    const fare = Number(ride.fare);

    if (!fare || fare <= 0 || isNaN(fare))
      return res.status(400).json({
        success: false,
        message: "Invalid ride fare"
      });

    /* ================= REUSE SESSION ================= */
    if (ride.paymentStatus === "pending" && ride.paymentSessionId) {
      return res.json({
        success: true,
        url: `https://checkout.stripe.com/c/pay/${ride.paymentSessionId}`
      });
    }

    /* ================= CREATE SESSION ================= */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "TransportX Ride",
              description: `Ride from ${ride.pickupLocation.address} → ${ride.dropLocation.address}`
            },
            unit_amount: Math.round(fare * 100)
          },
          quantity: 1
        }
      ],

      metadata: {
        rideId: ride._id.toString(),
        userId: ride.user.toString()
      },

      success_url: `${process.env.CLIENT_URL}/payment-success/${ride._id}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-failed/${ride._id}`,

      expires_at:
        Math.floor(Date.now() / 1000) +
        SESSION_EXPIRY_MINUTES * 60
    });

    /* ================= SAVE SESSION ================= */
    ride.paymentSessionId = session.id;
    ride.paymentStatus = "pending";
    ride.paymentStartedAt = new Date();

    await ride.save();

    console.log("💳 Stripe session created:", session.id);

    res.json({
      success: true,
      url: session.url
    });

  } catch (err) {
    console.error("❌ STRIPE SESSION ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Payment session failed"
    });
  }
});


/* ======================================================
STRIPE WEBHOOK
====================================================== */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    const sig = req.headers["stripe-signature"];
    let event;

    /* ================= VERIFY SIGNATURE ================= */
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Invalid webhook signature:", err.message);
      return res.status(400).send("Webhook Error");
    }

    console.log("📩 Stripe Event:", event.type);

    try {
      const obj = event.data.object;
      const rideId = obj?.metadata?.rideId;

      if (!rideId) return res.json({ received: true });

      const ride = await Ride.findById(rideId);
      if (!ride) return res.json({ received: true });

      /* ======================================================
      HANDLE EVENTS
      ====================================================== */
      switch (event.type) {

        /* ================= SUCCESS ================= */
        case "checkout.session.completed":

          if (ride.paymentStatus !== "paid") {
            ride.paymentStatus = "paid";
            ride.status = "confirmed";
            ride.paidAt = new Date();
            ride.paymentMethod =
              obj.payment_method_types?.[0] || "card";

            await ride.save();
          }

          console.log("✅ Payment success:", rideId);
          break;


        /* ================= FAILED ================= */
        case "payment_intent.payment_failed":

          ride.paymentStatus = "failed";
          ride.paymentFailedAt = new Date();
          ride.failureReason =
            obj.last_payment_error?.message || "Unknown";

          await ride.save();

          // release driver if assigned
          if (ride.driver) {
            await Driver.findByIdAndUpdate(
              ride.driver,
              { isAvailable: true }
            );
          }

          console.log("❌ Payment failed:", rideId);
          break;


        /* ================= SESSION EXPIRED ================= */
        case "checkout.session.expired":

          ride.paymentStatus = "expired";
          await ride.save();

          console.log("⌛ Session expired:", rideId);
          break;
      }

    } catch (err) {
      console.error("🔥 Webhook processing error:", err);
    }

    /* ALWAYS RETURN 200 */
    res.json({ received: true });
  }
);

module.exports = router;