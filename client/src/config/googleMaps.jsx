import React, { createContext, useContext, useMemo } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

/* ======================================================
🔥 LIBRARIES (EXPANDED FOR NAVIGATION)
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

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  /* 🔥 MEMOIZE LIBRARIES */
  const libraries = useMemo(() => GOOGLE_MAP_LIBRARIES, []);

  /* ❌ HARD SAFETY (NO KEY) */
  if (!apiKey) {
    console.error("❌ Google Maps API key missing (VITE_GOOGLE_MAPS_KEY)");
  }

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script", // 🔥 prevents duplicate load
    googleMapsApiKey: apiKey,
    libraries,
    version: "weekly",
    preventGoogleFontsLoading: true // 🔥 performance boost
  });

  /* ================= DEBUG (DEV ONLY) ================= */
  if (import.meta.env.DEV) {
    if (loadError) {
      console.error("❌ Google Maps Load Error:", loadError);
    }

    if (isLoaded) {
      console.log("✅ Google Maps Loaded");
    }
  }

  /* ================= CONTEXT VALUE ================= */
  const value = useMemo(() => ({
    isLoaded,
    loadError,
    isReady: isLoaded && !loadError
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