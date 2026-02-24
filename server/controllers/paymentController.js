const stripe = require("../config/stripe");
const Ride = require("../models/Ride");


// ======================================================
// CREATE PAYMENT INTENT
// ======================================================
exports.createPaymentIntent = async (req, res) => {
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

    // ================= OWNER CHECK =================
    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment attempt"
      });

    // ================= PREVENT DOUBLE PAYMENT =================
    if (ride.paymentStatus === "paid")
      return res.status(400).json({
        success: false,
        message: "Ride already paid"
      });

    // ================= VALIDATE FARE =================
    const amount = Number(ride.fare);

    if (!amount || amount <= 0 || isNaN(amount))
      return res.status(400).json({
        success: false,
        message: "Invalid ride amount"
      });

    // ==================================================
    // CREATE INTENT
    // ==================================================
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "inr",
      description: `Ride Payment #${ride._id}`,
      metadata: {
        rideId: ride._id.toString(),
        userId: req.user._id.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    // ==================================================
    // SAVE INTENT INFO
    // ==================================================
    ride.paymentIntentId = paymentIntent.id;
    ride.paymentStatus = "pending";
    ride.paymentStartedAt = new Date();
    await ride.save();

    console.log("💳 PaymentIntent created:", paymentIntent.id);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (err) {
    console.error("❌ PAYMENT INTENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Payment initialization failed"
    });
  }
};



// ======================================================
// VERIFY PAYMENT (CLIENT FALLBACK CHECK)
// ======================================================
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId)
      return res.status(400).json({
        success:false,
        message:"PaymentIntent ID required"
      });

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!intent)
      return res.status(404).json({
        success:false,
        message:"Intent not found"
      });

    // ================= NOT SUCCESS =================
    if (intent.status !== "succeeded") {
      return res.json({
        success:false,
        status:intent.status
      });
    }

    const rideId = intent.metadata?.rideId;
    if (!rideId)
      return res.json({ success:false });

    const ride = await Ride.findById(rideId);
    if (!ride)
      return res.status(404).json({ success:false });

    // already updated via webhook
    if (ride.paymentStatus === "paid")
      return res.json({ success:true, alreadyUpdated:true });

    // ================= UPDATE =================
    ride.paymentStatus = "paid";
    ride.status = "confirmed";
    ride.paidAt = new Date();

    await ride.save();

    console.log("✅ Payment verified:", rideId);

    res.json({ success:true });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ success:false });
  }
};



// ======================================================
// STRIPE WEBHOOK (SOURCE OF TRUTH)
// ======================================================
exports.stripeWebhook = async (req, res) => {

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // IMPORTANT → must be raw body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.status(400).send("Webhook Error");
  }

  try {

    const intent = event.data.object;
    const rideId = intent.metadata?.rideId;

    if (!rideId)
      return res.json({ received:true });

    const ride = await Ride.findById(rideId);
    if (!ride)
      return res.json({ received:true });


    // ==================================================
    // PAYMENT SUCCESS
    // ==================================================
    if (event.type === "payment_intent.succeeded") {

      if (ride.paymentStatus !== "paid") {
        ride.paymentStatus = "paid";
        ride.status = "confirmed";
        ride.paidAt = new Date();
        ride.paymentMethod = intent.payment_method_types?.[0] || "card";

        await ride.save();
      }

      console.log("✅ Payment success:", rideId);
    }


    // ==================================================
    // PAYMENT FAILED
    // ==================================================
    if (event.type === "payment_intent.payment_failed") {

      ride.paymentStatus = "failed";
      ride.paymentFailedAt = new Date();
      ride.failureReason =
        intent.last_payment_error?.message || "Unknown";

      await ride.save();

      console.log("❌ Payment failed:", rideId);
    }


    // ==================================================
    // PAYMENT CANCELED
    // ==================================================
    if (event.type === "payment_intent.canceled") {

      ride.paymentStatus = "cancelled";
      await ride.save();

      console.log("⚠️ Payment cancelled:", rideId);
    }

  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  res.json({ received:true });
};