const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const { protect } = require("../middleware/authMiddleware");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


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

    const ride = await Ride.findById(rideId);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    // ===============================
    // OWNER VALIDATION
    // ===============================
    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({
        success: false,
        message: "Unauthorized ride access"
      });

    // ===============================
    // PREVENT DOUBLE PAYMENT
    // ===============================
    if (ride.paymentStatus === "paid")
      return res.status(400).json({
        success: false,
        message: "Ride already paid"
      });

    // ===============================
    // CREATE STRIPE SESSION
    // ===============================
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
      cancel_url: `${process.env.CLIENT_URL}/payment-failed/${ride._id}`
    });

    // save session reference
    ride.paymentSessionId = session.id;
    ride.paymentStatus = "pending";
    await ride.save();

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
// STRIPE WEBHOOK (REQUIRED FOR REAL PAYMENTS)
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
      console.error("Webhook signature error:", err.message);
      return res.status(400).send("Webhook Error");
    }

    // ==================================================
    // PAYMENT SUCCESS
    // ==================================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const rideId = session.metadata.rideId;

      const ride = await Ride.findById(rideId);

      if (ride && ride.paymentStatus !== "paid") {
        ride.paymentStatus = "paid";
        ride.status = "confirmed";
        ride.paidAt = new Date();
        await ride.save();
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
          paymentStatus: "failed"
        });
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;