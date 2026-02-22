const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const { protect } = require("../middleware/authMiddleware");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20"
});


// ======================================================
// CREATE CHECKOUT SESSION
// ======================================================
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId)
      return res.status(400).json({
        success: false,
        message: "Ride ID required"
      });

    // ==================================================
    // FIND RIDE
    // ==================================================
    const ride = await Ride.findById(rideId);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    // ==================================================
    // SECURITY — OWNER CHECK
    // ==================================================
    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({
        success: false,
        message: "Unauthorized ride access"
      });

    // ==================================================
    // PREVENT DOUBLE PAYMENT
    // ==================================================
    if (ride.paymentStatus === "paid")
      return res.status(400).json({
        success: false,
        message: "Ride already paid"
      });

    // ==================================================
    // PREVENT MULTIPLE ACTIVE SESSIONS
    // ==================================================
    if (ride.paymentStatus === "pending" && ride.paymentSessionId) {
      return res.json({
        success: true,
        url: `https://checkout.stripe.com/c/pay/${ride.paymentSessionId}`
      });
    }

    // ==================================================
    // CREATE SESSION
    // ==================================================
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
            unit_amount: Math.round(ride.fare * 100)
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

      expires_at: Math.floor(Date.now() / 1000) + (15 * 60) // 15 min expiry
    });

    // ==================================================
    // SAVE SESSION
    // ==================================================
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
    console.error("STRIPE SESSION ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Payment session failed"
    });
  }
});


// ======================================================
// STRIPE WEBHOOK
// IMPORTANT → must be before express.json middleware
// ======================================================
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).send("Webhook Error");
    }

    try {

      // ==================================================
      // PAYMENT SUCCESS
      // ==================================================
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const rideId = session.metadata?.rideId;

        if (!rideId) return res.json({ received: true });

        const ride = await Ride.findById(rideId);

        if (!ride) return res.json({ received: true });

        // prevent duplicate updates
        if (ride.paymentStatus !== "paid") {
          ride.paymentStatus = "paid";
          ride.status = "confirmed";
          ride.paidAt = new Date();
          ride.paymentMethod = session.payment_method_types?.[0] || "card";

          await ride.save();

          console.log("✅ Payment success → ride:", rideId);
        }
      }


      // ==================================================
      // PAYMENT FAILED
      // ==================================================
      if (event.type === "payment_intent.payment_failed") {
        const intent = event.data.object;
        const rideId = intent.metadata?.rideId;

        if (rideId) {
          await Ride.findByIdAndUpdate(rideId, {
            paymentStatus: "failed",
            paymentFailedAt: new Date(),
            failureReason:
              intent.last_payment_error?.message || "Unknown"
          });

          console.log("❌ Payment failed → ride:", rideId);
        }
      }


      // ==================================================
      // SESSION EXPIRED
      // ==================================================
      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const rideId = session.metadata?.rideId;

        if (rideId) {
          await Ride.findByIdAndUpdate(rideId, {
            paymentStatus: "expired"
          });

          console.log("⏱ Session expired:", rideId);
        }
      }

    } catch (err) {
      console.error("Webhook processing error:", err);
    }

    res.json({ received: true });
  }
);

module.exports = router;