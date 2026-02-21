const stripe = require("../config/stripe");
const Ride = require("../models/Ride");

// ======================================================
// CREATE PAYMENT INTENT (SECURE VERSION)
// ======================================================
exports.createPaymentIntent = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId)
      return res.status(400).json({
        success: false,
        message: "Ride ID required"
      });

    // ==================================================
    // GET RIDE
    // ==================================================
    const ride = await Ride.findById(rideId);

    if (!ride)
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });

    // only ride owner can pay
    if (ride.user.toString() !== req.user._id.toString())
      return res.status(403).json({
        success: false,
        message: "Unauthorized payment attempt"
      });

    // prevent double payment
    if (ride.paymentStatus === "paid")
      return res.status(400).json({
        success: false,
        message: "Ride already paid"
      });

    // ==================================================
    // CREATE PAYMENT INTENT
    // ==================================================
    const paymentIntent = await stripe.paymentIntents.create({
      amount: ride.fare * 100, // rupees → paisa
      currency: "inr",
      metadata: {
        rideId: ride._id.toString(),
        userId: req.user._id.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    // save intent id
    ride.paymentIntentId = paymentIntent.id;
    ride.paymentStatus = "pending";
    await ride.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });

  } catch (err) {
    console.error("PAYMENT INTENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Payment initialization failed"
    });
  }
};


// ======================================================
// VERIFY PAYMENT (FRONTEND CONFIRMATION CHECK)
// ======================================================
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!intent)
      return res.status(404).json({ success: false });

    if (intent.status !== "succeeded")
      return res.json({ success: false, status: intent.status });

    const ride = await Ride.findById(intent.metadata.rideId);

    if (!ride)
      return res.status(404).json({ success: false });

    // update ride
    ride.paymentStatus = "paid";
    ride.status = "confirmed";
    ride.paidAt = new Date();

    await ride.save();

    res.json({ success: true });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ success: false });
  }
};


// ======================================================
// STRIPE WEBHOOK (MOST IMPORTANT)
// ======================================================
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error`);
  }

  // ======================================================
  // PAYMENT SUCCESS EVENT
  // ======================================================
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;

    const rideId = intent.metadata.rideId;

    const ride = await Ride.findById(rideId);

    if (ride && ride.paymentStatus !== "paid") {
      ride.paymentStatus = "paid";
      ride.status = "confirmed";
      ride.paidAt = new Date();

      await ride.save();
    }
  }

  // ======================================================
  // PAYMENT FAILED
  // ======================================================
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;

    const ride = await Ride.findById(intent.metadata.rideId);

    if (ride) {
      ride.paymentStatus = "failed";
      await ride.save();
    }
  }

  res.json({ received: true });
};