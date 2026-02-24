const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

// ======================================================
// STRIPE INSTANCE (SAFE VERSION)
// ======================================================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// ======================================================
// STRIPE WEBHOOK ENDPOINT
// MUST BE REGISTERED BEFORE express.json()
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

      const obj = event.data.object;
      const rideId = obj?.metadata?.rideId;

      switch (event.type) {

        // ==================================================
        // PAYMENT SUCCESS
        // ==================================================
        case "checkout.session.completed": {

          if (!rideId) break;

          const ride = await Ride.findById(rideId);
          if (!ride) break;

          // idempotency protection
          if (ride.paymentStatus === "paid") {
            console.log("⚠️ Duplicate webhook:", rideId);
            break;
          }

          ride.paymentStatus = "paid";
          ride.status = "confirmed";
          ride.paidAt = new Date();
          ride.stripeSessionId = obj.id;
          ride.paymentMethod = obj.payment_method_types?.[0] || "card";

          await ride.save();

          console.log("✅ Payment confirmed:", rideId);
          break;
        }


        // ==================================================
        // PAYMENT FAILED
        // ==================================================
        case "payment_intent.payment_failed": {

          if (!rideId) break;

          const ride = await Ride.findById(rideId);
          if (!ride) break;

          ride.paymentStatus = "failed";
          ride.paymentFailedAt = new Date();
          ride.failureReason =
            obj.last_payment_error?.message || "Unknown";

          await ride.save();

          // release driver safely
          if (ride.driver) {
            await Driver.findByIdAndUpdate(
              ride.driver,
              { isAvailable: true },
              { new: false }
            );
          }

          console.log("❌ Payment failed:", rideId);
          break;
        }


        // ==================================================
        // SESSION EXPIRED
        // ==================================================
        case "checkout.session.expired": {

          if (!rideId) break;

          await Ride.findByIdAndUpdate(rideId, {
            paymentStatus: "expired"
          });

          console.log("⌛ Session expired:", rideId);
          break;
        }


        // ==================================================
        // REFUND
        // ==================================================
        case "charge.refunded": {

          console.log("💰 Refund issued:", obj.id);

          // optional future logic:
          // update ride refund status

          break;
        }


        // ==================================================
        // DISPUTE
        // ==================================================
        case "charge.dispute.created": {

          console.warn("⚠️ Dispute opened:", obj.id);
          break;
        }


        // ==================================================
        // DEFAULT (IGNORE UNUSED EVENTS)
        // ==================================================
        default:
          console.log("Unhandled event:", event.type);
      }

    } catch (err) {
      console.error("🔥 Webhook processing error:", err);
    }

    // IMPORTANT: Always return 200
    res.json({ received: true });
  }
);

module.exports = router;