const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20"
});


// ======================================================
// STRIPE WEBHOOK ENDPOINT
// IMPORTANT → must be mounted BEFORE express.json()
// ======================================================
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    const sig = req.headers["stripe-signature"];
    let event;

    // ======================================================
    // VERIFY SIGNATURE
    // ======================================================
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

      // ======================================================
      // PAYMENT SUCCESS
      // ======================================================
      if (event.type === "checkout.session.completed") {

        const session = event.data.object;
        const rideId = session.metadata?.rideId;

        if (!rideId) {
          console.warn("⚠️ Missing rideId metadata");
          return res.json({ received: true });
        }

        const ride = await Ride.findById(rideId);

        if (!ride) {
          console.warn("⚠️ Ride not found:", rideId);
          return res.json({ received: true });
        }

        // =========================
        // IDEMPOTENCY CHECK
        // prevents duplicate webhook updates
        // =========================
        if (ride.paymentStatus === "paid") {
          console.log("⚠️ Duplicate webhook ignored:", rideId);
          return res.json({ received: true });
        }

        // =========================
        // UPDATE RIDE
        // =========================
        ride.paymentStatus = "paid";
        ride.status = "confirmed";
        ride.paidAt = new Date();
        ride.stripeSessionId = session.id;
        ride.paymentMethod = session.payment_method_types?.[0] || "card";

        await ride.save();

        console.log("✅ Payment confirmed for ride:", rideId);
      }


      // ======================================================
      // PAYMENT FAILED
      // ======================================================
      if (event.type === "payment_intent.payment_failed") {

        const intent = event.data.object;
        const rideId = intent.metadata?.rideId;

        if (!rideId) return res.json({ received: true });

        const ride = await Ride.findById(rideId);

        if (!ride) return res.json({ received: true });

        ride.paymentStatus = "failed";
        ride.paymentFailedAt = new Date();
        ride.failureReason =
          intent.last_payment_error?.message || "Unknown";

        await ride.save();

        // release driver
        if (ride.driver) {
          await Driver.findByIdAndUpdate(
            ride.driver,
            { isAvailable: true }
          );
        }

        console.log("❌ Payment failed → driver released:", rideId);
      }


      // ======================================================
      // CHECKOUT EXPIRED
      // ======================================================
      if (event.type === "checkout.session.expired") {

        const session = event.data.object;
        const rideId = session.metadata?.rideId;

        if (rideId) {
          await Ride.findByIdAndUpdate(rideId, {
            paymentStatus: "expired"
          });

          console.log("⌛ Payment expired:", rideId);
        }
      }


      // ======================================================
      // REFUND EVENT
      // ======================================================
      if (event.type === "charge.refunded") {

        const charge = event.data.object;

        console.log("💰 Refund issued:", charge.id);

        // future:
        // update ride refund status
      }


      // ======================================================
      // PAYMENT DISPUTE
      // ======================================================
      if (event.type === "charge.dispute.created") {
        console.warn("⚠️ Dispute opened:", event.data.object.id);
      }

    } catch (err) {
      console.error("🔥 Webhook processing error:", err);
      return res.status(500).json({ error: "Webhook processing failed" });
    }

    // ======================================================
    // ALWAYS RESPOND 200 TO STRIPE
    // ======================================================
    res.json({ received: true });
  }
);

module.exports = router;