const rideBookedTemplate = ({
  name,
  pickup,
  drop,
  fare,
  driver,
}) => {
  return `
  <div style="font-family: Arial; padding: 20px; background:#f4f4f4">

    <div style="max-width:600px;margin:auto;background:white;
    border-radius:12px;padding:30px">

      <h1 style="color:#4f46e5;text-align:center">
        🚖 TransportX
      </h1>

      <h2 style="text-align:center;color:#111827">
        Ride Booked Successfully
      </h2>

      <p>Hello <b>${name}</b>,</p>

      <p>Your ride has been confirmed successfully.</p>

      <div style="
        background:#f9fafb;
        padding:20px;
        border-radius:10px;
        margin-top:20px;
      ">
        <h3>📍 Ride Details</h3>

        <p><b>Pickup:</b> ${pickup}</p>
        <p><b>Drop:</b> ${drop}</p>
        <p><b>Fare:</b> ₹${fare}</p>
        <p><b>Driver:</b> ${driver}</p>
      </div>

      <div style="margin-top:25px;text-align:center">
        <p style="color:#6b7280">
          Thank you for choosing TransportX 🚗
        </p>
      </div>

    </div>
  </div>
  `;
};

module.exports = rideBookedTemplate;