import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import App from "./App.jsx";
import "./index.css";
import "leaflet/dist/leaflet.css";

/* ======================================================
GLOBAL POLYFILLS (Fix for simple-peer / randombytes)
====================================================== */

// Fix "global is not defined"
if (typeof global === "undefined") {
  window.global = window;
}

// Fix "process is not defined"
if (typeof process === "undefined") {
  window.process = {
    env: {}
  };
}

// Fix crypto for WebRTC libs
if (!window.crypto) {
  window.crypto = window.crypto || window.msCrypto;
}

/* ======================================================
STRIPE CONFIG
====================================================== */

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY
);

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn("⚠️ Stripe public key missing in .env");
}

/* ======================================================
RENDER APP
====================================================== */

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Elements stripe={stripePromise}>
          <App />
        </Elements>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);