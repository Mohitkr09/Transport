const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const { protect } = require("../middleware/authMiddleware");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ======================================================
// CREATE CHECKOUT SESSION (SECURE VERSION)
// ======================================================
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const { rideId } = req.body;

    // ===============================
    // Validate ride
    // ===============================
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    // ===============================
    // Ensure user owns ride
    // ===============================
    if (ride.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized ride access"
      });
    }

    // ===============================
    // Prevent duplicate payment
    // ===============================
    if (ride.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Ride already paid"
      });
    }

    // ===============================
    // Create Stripe Session
    // ===============================
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

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

      success_url: `http://localhost:5173/payment-success/${ride._id}`,
      cancel_url: `http://localhost:5173/payment-failed/${ride._id}`
    });

    // ===============================
    // Save payment intent reference
    // ===============================
    ride.paymentIntentId = session.payment_intent;
    await ride.save();

    // ===============================
    // RESPONSE
    // ===============================
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

module.exports = router;
