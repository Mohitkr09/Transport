const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");

/* ======================================================
STRIPE INSTANCE
====================================================== */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


/* ======================================================
REALTIME NOTIFICATION HELPER
====================================================== */
const notify = (userId, payload) => {
  if (!global.io) return;
  global.io.to(userId.toString()).emit("notification", {
    id: Date.now(),
    ...payload,
    time: new Date()
  });
};


/* ======================================================
WEBHOOK ROUTE
IMPORTANT → must be mounted BEFORE express.json()
====================================================== */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {

    const signature = req.headers["stripe-signature"];
    let event;

    /* ======================================================
    VERIFY SIGNATURE
    ====================================================== */
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Stripe Signature Error:", err.message);
      return res.status(400).send("Invalid signature");
    }

    console.log("📩 Stripe Event:", event.type);

    try {

      const obj = event.data.object;
      const rideId = obj?.metadata?.rideId;

      /* ======================================================
      EVENT HANDLER SWITCH
      ====================================================== */
      switch (event.type) {

        /* ======================================================
        PAYMENT SUCCESS
        ====================================================== */
        case "checkout.session.completed": {

          if (!rideId) break;

          const ride = await Ride.findById(rideId);
          if (!ride) break;

          // prevent duplicate processing
          if (ride.paymentStatus === "paid") {
            console.log("⚠️ Duplicate webhook ignored:", rideId);
            break;
          }

          ride.paymentStatus = "paid";
          ride.status = "confirmed";
          ride.paidAt = new Date();
          ride.stripeSessionId = obj.id;
          ride.paymentMethod = obj.payment_method_types?.[0] || "card";

          await ride.save();

          /* ---------- NOTIFICATIONS ---------- */
          notify(ride.user,{
            title:"💳 Payment Successful",
            message:"Your ride has been confirmed"
          });

          if (ride.driver) {
            notify(ride.driver,{
              title:"📍 Ride Confirmed",
              message:"Passenger completed payment"
            });
          }

          console.log("✅ Payment confirmed:", rideId);
          break;
        }


        /* ======================================================
        PAYMENT FAILED
        ====================================================== */
        case "payment_intent.payment_failed": {

          if (!rideId) break;

          const ride = await Ride.findById(rideId);
          if (!ride) break;

          ride.paymentStatus = "failed";
          ride.paymentFailedAt = new Date();
          ride.failureReason =
            obj.last_payment_error?.message || "Unknown error";

          await ride.save();

          /* ---------- RELEASE DRIVER ---------- */
          if (ride.driver) {
            await Driver.findByIdAndUpdate(
              ride.driver,
              { isAvailable: true }
            );

            notify(ride.driver,{
              title:"Ride Cancelled",
              message:"Payment failed — driver released"
            });
          }

          notify(ride.user,{
            title:"Payment Failed",
            message:"Please try payment again"
          });

          console.log("❌ Payment failed:", rideId);
          break;
        }


        /* ======================================================
        SESSION EXPIRED
        ====================================================== */
        case "checkout.session.expired": {

          if (!rideId) break;

          const ride = await Ride.findByIdAndUpdate(
            rideId,
            { paymentStatus: "expired" },
            { new:true }
          );

          if (ride?.driver) {
            await Driver.findByIdAndUpdate(
              ride.driver,
              { isAvailable: true }
            );
          }

          notify(ride?.user,{
            title:"⌛ Payment Expired",
            message:"Session expired. Please book again."
          });

          console.log("⌛ Session expired:", rideId);
          break;
        }


        /* ======================================================
        REFUND EVENT
        ====================================================== */
        case "charge.refunded": {

          console.log("💰 Refund issued:", obj.id);

          const rideId = obj?.metadata?.rideId;
          if (!rideId) break;

          const ride = await Ride.findById(rideId);
          if (!ride) break;

          ride.paymentStatus = "refunded";
          ride.refundedAt = new Date();
          await ride.save();

          notify(ride.user,{
            title:"Refund Processed",
            message:"Your payment refund was successful"
          });

          break;
        }


        /* ======================================================
        DISPUTE CREATED
        ====================================================== */
        case "charge.dispute.created": {

          console.warn("⚠️ Payment dispute:", obj.id);

          const rideId = obj?.metadata?.rideId;
          if (!rideId) break;

          const ride = await Ride.findById(rideId);
          if (!ride) break;

          ride.paymentStatus = "disputed";
          await ride.save();

          notify(ride.user,{
            title:"Payment Dispute Opened",
            message:"Support team is reviewing your case"
          });

          break;
        }


        /* ======================================================
        DEFAULT EVENTS
        ====================================================== */
        default:
          console.log("Unhandled Stripe event:", event.type);
      }

    } catch (err) {
      console.error("🔥 Webhook Processing Error:", err);
    }

    /* ======================================================
    ALWAYS RETURN 200
    ====================================================== */
    res.json({ received:true });
  }
);

module.exports = router;