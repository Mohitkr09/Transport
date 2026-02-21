const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ======================================================
// STRIPE WEBHOOK
// ======================================================
router.post(
  "/stripe",
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
      console.error("❌ Webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error`);
    }

    try {

      // ==================================================
      // PAYMENT SUCCESS
      // ==================================================
      if (event.type === "checkout.session.completed") {

        const session = event.data.object;

        const rideId = session.metadata?.rideId;

        if (!rideId) {
          console.warn("No rideId in metadata");
          return res.json({ received: true });
        }

        const ride = await Ride.findById(rideId);

        if (!ride) {
          console.warn("Ride not found:", rideId);
          return res.json({ received: true });
        }

        // prevent duplicate updates (important)
        if (ride.paymentStatus === "paid") {
          return res.json({ received: true });
        }

        // mark paid
        ride.paymentStatus = "paid";
        ride.status = "confirmed";
        ride.paidAt = new Date();
        ride.stripeSessionId = session.id;

        await ride.save();

        console.log("✅ Payment recorded for ride:", rideId);
      }


      // ==================================================
      // PAYMENT FAILED
      // ==================================================
      if (event.type === "payment_intent.payment_failed") {

        const intent = event.data.object;

        const rideId = intent.metadata?.rideId;

        if (rideId) {

          const ride = await Ride.findById(rideId);

          if (ride) {

            ride.paymentStatus = "failed";
            await ride.save();

            // release driver if payment fails
            if (ride.driver) {
              await Driver.findByIdAndUpdate(
                ride.driver,
                { isAvailable: true }
              );
            }

            console.log("❌ Payment failed for ride:", rideId);
          }
        }
      }


      // ==================================================
      // OPTIONAL EVENTS (good for analytics/logging)
      // ==================================================
      if (event.type === "charge.refunded") {
        console.log("💰 Refund issued");
      }

      if (event.type === "checkout.session.expired") {
        console.log("⌛ Checkout expired");
      }

    } catch (err) {
      console.error("Webhook handler error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }

    res.json({ received: true });
  }
);

module.exports = router;