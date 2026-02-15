const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
      console.log("❌ Webhook signature verification failed.");
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    /* ================= HANDLE EVENTS ================= */

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        console.log("✅ Payment verified:", session.id);

        // TODO → update ride payment status in DB
        // example:
        // await Ride.findByIdAndUpdate(session.metadata.rideId, { paid: true })

        break;

      case "payment_intent.payment_failed":
        console.log("❌ Payment failed");

        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

module.exports = router;
