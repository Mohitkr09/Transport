import React, { createContext, useContext, useMemo } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

/* ======================================================
🔥 LIBRARIES (EXPANDED)
====================================================== */
export const GOOGLE_MAP_LIBRARIES = [
  "places",
  "geometry"
];

/* ======================================================
CONTEXT
====================================================== */
const GoogleMapsContext = createContext(null);

/* ======================================================
PROVIDER
====================================================== */
export const GoogleMapsProvider = ({ children }) => {

  const libraries = useMemo(() => GOOGLE_MAP_LIBRARIES, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  /* ❌ SAFETY CHECK */
  if (!apiKey) {
    console.error("❌ Google Maps API key missing");
  }

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script", // prevent duplicate loading
    googleMapsApiKey: apiKey,
    libraries,
    version: "weekly"
  });

  /* 🔥 DEBUG LOGS */
  if (loadError) {
    console.error("❌ Google Maps Load Error:", loadError);
  }

  if (isLoaded) {
    console.log("✅ Google Maps Loaded");
  }

  const value = useMemo(() => ({
    isLoaded,
    loadError
  }), [isLoaded, loadError]);

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

/* ======================================================
HOOK
====================================================== */
export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);

  if (!context) {
    throw new Error(
      "❌ useGoogleMaps must be used inside <GoogleMapsProvider>"
    );
  }

  return context;
};